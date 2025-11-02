-- Fix rpc_corral_complete_kpis - ensure COALESCE uses bigint literals
DROP FUNCTION IF EXISTS rpc_corral_complete_kpis(uuid);

CREATE OR REPLACE FUNCTION rpc_corral_complete_kpis(_user_id uuid)
RETURNS TABLE (
    corral_id uuid,
    corral_name text,
    animal_count bigint,
    avg_weight numeric,
    avg_daily_gain numeric,
    health_percentage numeric,
    vaccination_percentage numeric,
    reproductive_percentage numeric,
    financial_balance numeric,
    health_alerts bigint,
    vaccination_alerts bigint,
    reproductive_alerts bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _cabana_id uuid;
BEGIN
    -- Get user's cabaña
    SELECT p.cabaña_id INTO _cabana_id
    FROM profiles p
    WHERE p.user_id = _user_id;

    IF _cabana_id IS NULL THEN
        RAISE EXCEPTION 'User has no cabaña assigned';
    END IF;

    RETURN QUERY
    WITH animal_requirements AS (
        SELECT 
            a.id as animal_id,
            vr.id as requirement_id
        FROM animals a
        CROSS JOIN cabaña_vaccination_requirements vr
        WHERE a.cabaña_id = _cabana_id
        AND vr.cabaña_id = _cabana_id
        AND vr.is_active = true
        AND (
            (vr.sex_filter IS NULL OR a.sex = vr.sex_filter)
            AND (vr.age_min_months IS NULL OR EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date)) * 12 + 
                 EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date)) >= vr.age_min_months)
            AND (vr.age_max_months IS NULL OR EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date)) * 12 + 
                 EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date)) <= vr.age_max_months)
        )
    ),
    last_vaccinations AS (
        SELECT DISTINCT ON (av.animal_id, av.vaccine_requirement_id)
            av.animal_id,
            av.vaccine_requirement_id,
            av.vaccination_date,
            av.dose_number,
            av.next_due_date
        FROM animal_vaccinations av
        WHERE av.animal_id IN (SELECT id FROM animals WHERE cabaña_id = _cabana_id)
        ORDER BY av.animal_id, av.vaccine_requirement_id, av.vaccination_date DESC
    ),
    animal_vaccination_status AS (
        SELECT 
            ar.animal_id,
            bool_and(
                CASE 
                    WHEN lv.next_due_date IS NULL THEN false
                    WHEN lv.next_due_date >= CURRENT_DATE THEN true
                    ELSE false
                END
            ) as is_compliant
        FROM animal_requirements ar
        LEFT JOIN last_vaccinations lv ON ar.animal_id = lv.animal_id 
            AND ar.requirement_id = lv.vaccine_requirement_id
        GROUP BY ar.animal_id
    ),
    latest_weights AS (
        SELECT DISTINCT ON (animal_id)
            animal_id,
            weight,
            date
        FROM weighings
        WHERE animal_id IN (SELECT id FROM animals WHERE cabaña_id = _cabana_id)
        ORDER BY animal_id, date DESC
    ),
    weight_gains AS (
        SELECT 
            w1.animal_id,
            w1.weight,
            w1.date,
            w2.weight as prev_weight,
            w2.date as prev_date
        FROM weighings w1
        LEFT JOIN LATERAL (
            SELECT weight, date
            FROM weighings w2
            WHERE w2.animal_id = w1.animal_id
            AND w2.date < w1.date
            ORDER BY w2.date DESC
            LIMIT 1
        ) w2 ON true
        WHERE w1.animal_id IN (SELECT id FROM animals WHERE cabaña_id = _cabana_id)
    )
    SELECT 
        c.id::uuid,
        c.name::text,
        COUNT(DISTINCT a.id)::bigint as animal_count,
        AVG(lw.weight)::numeric as avg_weight,
        COALESCE(AVG(
            CASE 
                WHEN wg.weight > 0 AND wg.prev_weight > 0 AND wg.date > wg.prev_date 
                THEN (wg.weight - wg.prev_weight) / NULLIF(wg.date - wg.prev_date, 0)
            END
        ), 0)::numeric as avg_daily_gain,
        CASE 
            WHEN COUNT(DISTINCT a.id) > 0 
            THEN (COUNT(DISTINCT CASE WHEN a.status NOT IN ('muerto', 'vendido') THEN a.id END)::numeric / COUNT(DISTINCT a.id)::numeric * 100)
            ELSE 0 
        END::numeric as health_percentage,
        CASE 
            WHEN COUNT(DISTINCT a.id) > 0 
            THEN (COUNT(DISTINCT CASE WHEN avs.is_compliant THEN a.id END)::numeric / COUNT(DISTINCT a.id)::numeric * 100)
            ELSE 0 
        END::numeric as vaccination_percentage,
        CASE 
            WHEN COUNT(DISTINCT CASE WHEN a.sex = 'Hembra' THEN a.id END) > 0 
            THEN (COUNT(DISTINCT CASE WHEN a.sex = 'Hembra' AND a.esta_preñada = true THEN a.id END)::numeric / 
                  COUNT(DISTINCT CASE WHEN a.sex = 'Hembra' THEN a.id END)::numeric * 100)
            ELSE 0 
        END::numeric as reproductive_percentage,
        COALESCE(SUM(fm.monto), 0)::numeric as financial_balance,
        COUNT(DISTINCT CASE 
            WHEN e.tipo IN ('tratamiento_medico', 'diagnostico') 
            AND e.fecha >= CURRENT_DATE - INTERVAL '30 days'
            THEN a.id 
        END)::bigint as health_alerts,
        COUNT(DISTINCT CASE WHEN NOT COALESCE(avs.is_compliant, false) THEN a.id END)::bigint as vaccination_alerts,
        COUNT(DISTINCT CASE 
            WHEN a.sex = 'Hembra' 
            AND a.esta_preñada = true 
            AND a.fecha_probable_parto < CURRENT_DATE
            THEN a.id 
        END)::bigint as reproductive_alerts
    FROM corrales c
    LEFT JOIN animals a ON a.corral_id = c.id AND a.cabaña_id = _cabana_id
    LEFT JOIN animal_vaccination_status avs ON avs.animal_id = a.id
    LEFT JOIN latest_weights lw ON lw.animal_id = a.id
    LEFT JOIN weight_gains wg ON wg.animal_id = a.id
    LEFT JOIN eventos e ON e.cabaña_id = _cabana_id
    LEFT JOIN finance_movements fm ON fm.animal_id = a.id AND fm.cabaña_id = _cabana_id
    WHERE c.cabaña_id = _cabana_id
    GROUP BY c.id, c.name
    ORDER BY c.name;
END;
$$;