-- Fix rpc_corral_complete_kpis to use correct column name
DROP FUNCTION IF EXISTS public.rpc_corral_complete_kpis(uuid);

CREATE OR REPLACE FUNCTION public.rpc_corral_complete_kpis(_user_id uuid)
RETURNS TABLE(
    corral_id uuid,
    corral_name text,
    animal_count bigint,
    male_count bigint,
    female_count bigint,
    hectareas numeric,
    consanguinity_risk_count bigint,
    highest_severity text,
    vaccination_percentage numeric,
    vaccination_alerts bigint,
    avg_daily_gain numeric,
    recent_weighings_count bigint,
    last_weighing_date date,
    vaccination_status text,
    pregnancy_rate numeric,
    avg_weight numeric
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
            (vr.sex_restriction IS NULL OR a.sex = vr.sex_restriction)
            AND (vr.min_age_months IS NULL OR EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date)) * 12 + 
                 EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date)) >= vr.min_age_months)
            AND (vr.max_age_months IS NULL OR EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date)) * 12 + 
                 EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date)) <= vr.max_age_months)
        )
    ),
    last_vaccinations AS (
        SELECT DISTINCT ON (av.animal_id, av.requirement_id)
            av.animal_id,
            av.requirement_id,
            av.date as vaccination_date,
            av.dose_number,
            av.next_due
        FROM animal_vaccines av
        WHERE av.animal_id IN (SELECT id FROM animals WHERE cabaña_id = _cabana_id)
        ORDER BY av.animal_id, av.requirement_id, av.date DESC
    ),
    animal_vaccination_status AS (
        SELECT 
            ar.animal_id,
            bool_and(
                CASE 
                    WHEN lv.next_due IS NULL THEN false
                    WHEN lv.next_due >= CURRENT_DATE THEN true
                    ELSE false
                END
            ) as is_compliant
        FROM animal_requirements ar
        LEFT JOIN last_vaccinations lv ON ar.animal_id = lv.animal_id 
            AND ar.requirement_id = lv.requirement_id
        GROUP BY ar.animal_id
    ),
    latest_weights AS (
        SELECT DISTINCT ON (animal_id)
            animal_id,
            peso_kg as weight,
            fecha as date
        FROM animal_weight_history
        WHERE animal_id IN (SELECT id FROM animals WHERE cabaña_id = _cabana_id)
        ORDER BY animal_id, fecha DESC
    ),
    weight_gains AS (
        SELECT 
            w1.animal_id,
            w1.peso_kg as weight,
            w1.fecha as date,
            w2.peso_kg as prev_weight,
            w2.fecha as prev_date
        FROM animal_weight_history w1
        LEFT JOIN LATERAL (
            SELECT peso_kg, fecha
            FROM animal_weight_history w2
            WHERE w2.animal_id = w1.animal_id
            AND w2.fecha < w1.fecha
            ORDER BY w2.fecha DESC
            LIMIT 1
        ) w2 ON true
        WHERE w1.animal_id IN (SELECT id FROM animals WHERE cabaña_id = _cabana_id)
    )
    SELECT 
        c.id::uuid,
        c.name::text,
        COUNT(DISTINCT a.id)::bigint as animal_count,
        COUNT(DISTINCT CASE WHEN a.sex = 'Macho' THEN a.id END)::bigint as male_count,
        COUNT(DISTINCT CASE WHEN a.sex = 'Hembra' THEN a.id END)::bigint as female_count,
        c.hectareas::numeric,
        0::bigint as consanguinity_risk_count,
        NULL::text as highest_severity,
        CASE 
            WHEN COUNT(DISTINCT a.id) > 0 
            THEN (COUNT(DISTINCT CASE WHEN avs.is_compliant THEN a.id END)::numeric / COUNT(DISTINCT a.id)::numeric * 100)
            ELSE 0 
        END::numeric as vaccination_percentage,
        COUNT(DISTINCT CASE WHEN NOT COALESCE(avs.is_compliant, false) THEN a.id END)::bigint as vaccination_alerts,
        COALESCE(AVG(
            CASE 
                WHEN wg.weight > 0 AND wg.prev_weight > 0 AND wg.date > wg.prev_date 
                THEN (wg.weight - wg.prev_weight) / NULLIF((wg.date - wg.prev_date)::numeric, 0)
            END
        ), 0)::numeric as avg_daily_gain,
        COUNT(DISTINCT CASE WHEN lw.date >= CURRENT_DATE - INTERVAL '90 days' THEN lw.animal_id END)::bigint as recent_weighings_count,
        MAX(lw.date)::date as last_weighing_date,
        CASE 
            WHEN COUNT(DISTINCT a.id) = 0 THEN 'unknown'
            WHEN (COUNT(DISTINCT CASE WHEN avs.is_compliant THEN a.id END)::numeric / NULLIF(COUNT(DISTINCT a.id)::numeric, 0) * 100) >= 95 THEN 'excellent'
            WHEN (COUNT(DISTINCT CASE WHEN avs.is_compliant THEN a.id END)::numeric / NULLIF(COUNT(DISTINCT a.id)::numeric, 0) * 100) >= 80 THEN 'good'
            WHEN (COUNT(DISTINCT CASE WHEN avs.is_compliant THEN a.id END)::numeric / NULLIF(COUNT(DISTINCT a.id)::numeric, 0) * 100) >= 60 THEN 'warning'
            ELSE 'critical'
        END::text as vaccination_status,
        CASE 
            WHEN COUNT(DISTINCT CASE WHEN a.sex = 'Hembra' THEN a.id END) > 0 
            THEN (COUNT(DISTINCT CASE WHEN a.sex = 'Hembra' AND a.esta_preñada = true THEN a.id END)::numeric / 
                  COUNT(DISTINCT CASE WHEN a.sex = 'Hembra' THEN a.id END)::numeric * 100)
            ELSE 0 
        END::numeric as pregnancy_rate,
        AVG(lw.weight)::numeric as avg_weight
    FROM corrales c
    LEFT JOIN animals a ON a.corral_id = c.id AND a.cabaña_id = _cabana_id
    LEFT JOIN animal_vaccination_status avs ON avs.animal_id = a.id
    LEFT JOIN latest_weights lw ON lw.animal_id = a.id
    LEFT JOIN weight_gains wg ON wg.animal_id = a.id
    WHERE c.cabaña_id = _cabana_id
    GROUP BY c.id, c.name, c.hectareas
    ORDER BY c.name;
END;
$$;