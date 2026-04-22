CREATE OR REPLACE FUNCTION public.rpc_corral_complete_kpis(_user_id uuid)
 RETURNS TABLE(corral_id uuid, corral_name text, animal_count bigint, male_count bigint, female_count bigint, hectareas numeric, consanguinity_risk_count bigint, highest_severity text, vaccination_percentage numeric, vaccination_alerts bigint, total_vaccinations_given bigint, total_vaccinations_needed bigint, avg_daily_gain numeric, recent_weighings_count bigint, last_weighing_date date, vaccination_status text, pregnancy_rate numeric, avg_weight numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    _cabana_id uuid;
BEGIN
    SELECT p.cabaña_id INTO _cabana_id FROM profiles p WHERE p.user_id = _user_id;
    IF _cabana_id IS NULL THEN
        RAISE EXCEPTION 'User has no cabaña assigned';
    END IF;

    RETURN QUERY
    WITH corral_animals AS (
        SELECT 
            c.id as corral_id,
            c.name as corral_name,
            c.hectareas,
            COUNT(DISTINCT a.id) as animal_count,
            COUNT(DISTINCT CASE WHEN LOWER(a.sex) = 'macho' THEN a.id END) as male_count,
            COUNT(DISTINCT CASE WHEN LOWER(a.sex) = 'hembra' THEN a.id END) as female_count
        FROM corrales c
        LEFT JOIN animals a ON c.id = a.corral_id 
            AND a.cabaña_id = _cabana_id 
            AND LOWER(a.status) = 'activo'
        WHERE c.cabaña_id = _cabana_id
        GROUP BY c.id, c.name, c.hectareas
    ),
    vaccination_metrics AS (
        SELECT 
            ca.corral_id,
            COALESCE(vm.overall_compliance_percentage, 0) as vaccination_percentage,
            COALESCE(vm.animals_with_overdue, 0) + COALESCE(vm.animals_non_compliant, 0) as vaccination_alerts,
            COALESCE(vm.total_vaccinations_given, 0) as total_vaccinations_given,
            COALESCE(vm.total_vaccinations_needed, 0) as total_vaccinations_needed,
            CASE 
                WHEN ca.animal_count = 0 THEN 'unknown'
                WHEN COALESCE(vm.overall_compliance_percentage, 0) >= 95 THEN 'excellent'
                WHEN COALESCE(vm.overall_compliance_percentage, 0) >= 80 THEN 'good'
                WHEN COALESCE(vm.overall_compliance_percentage, 0) >= 60 THEN 'warning'
                ELSE 'critical'
            END as vaccination_status
        FROM corral_animals ca
        LEFT JOIN LATERAL (
            SELECT * FROM calculate_corral_vaccination_metrics(ca.corral_id)
        ) vm ON true
    ),
    latest_weights AS (
        SELECT DISTINCT ON (animal_id)
            animal_id,
            peso_kg as weight,
            fecha as date
        FROM animal_weight_history
        WHERE cabaña_id = _cabana_id
        ORDER BY animal_id, fecha DESC
    ),
    weight_gains AS (
        SELECT 
            w1.animal_id,
            w1.peso_kg as current_weight,
            w1.fecha as current_date,
            w2.peso_kg as prev_weight,
            w2.fecha as prev_date,
            CASE 
                WHEN w2.peso_kg > 0 AND w1.peso_kg > 0 AND w1.fecha > w2.fecha 
                THEN (w1.peso_kg - w2.peso_kg) / NULLIF((w1.fecha - w2.fecha), 0)
                ELSE 0
            END as daily_gain
        FROM animal_weight_history w1
        LEFT JOIN LATERAL (
            SELECT peso_kg, fecha
            FROM animal_weight_history w2
            WHERE w2.animal_id = w1.animal_id
            AND w2.fecha < w1.fecha
            AND w2.cabaña_id = _cabana_id
            ORDER BY w2.fecha DESC
            LIMIT 1
        ) w2 ON true
        WHERE w1.cabaña_id = _cabana_id
    ),
    corral_weights AS (
        SELECT 
            a.corral_id,
            AVG(wg.daily_gain) as avg_daily_gain,
            COUNT(DISTINCT CASE WHEN lw.date >= CURRENT_DATE - INTERVAL '90 days' THEN lw.animal_id END) as recent_weighings_count,
            MAX(lw.date) as last_weighing_date,
            AVG(lw.weight) as avg_weight
        FROM animals a
        LEFT JOIN weight_gains wg ON a.id = wg.animal_id
        LEFT JOIN latest_weights lw ON a.id = lw.animal_id
        WHERE a.cabaña_id = _cabana_id
        AND LOWER(a.status) = 'activo'
        GROUP BY a.corral_id
    ),
    pregnancy_data AS (
        SELECT 
            a.corral_id,
            (COUNT(CASE WHEN a.esta_preñada = true THEN 1 END)::numeric / 
             NULLIF(COUNT(CASE WHEN LOWER(a.sex) = 'hembra' THEN 1 END)::numeric, 0) * 100) as pregnancy_rate
        FROM animals a
        WHERE a.cabaña_id = _cabana_id
        AND LOWER(a.status) = 'activo'
        GROUP BY a.corral_id
    )
    SELECT 
        ca.corral_id::uuid,
        ca.corral_name::text,
        ca.animal_count::bigint,
        ca.male_count::bigint,
        ca.female_count::bigint,
        ca.hectareas::numeric,
        0::bigint as consanguinity_risk_count,
        NULL::text as highest_severity,
        vm.vaccination_percentage::numeric,
        vm.vaccination_alerts::bigint,
        vm.total_vaccinations_given::bigint,
        vm.total_vaccinations_needed::bigint,
        COALESCE(cw.avg_daily_gain, 0)::numeric as avg_daily_gain,
        COALESCE(cw.recent_weighings_count, 0)::bigint as recent_weighings_count,
        cw.last_weighing_date::date,
        vm.vaccination_status::text,
        COALESCE(pd.pregnancy_rate, 0)::numeric as pregnancy_rate,
        COALESCE(cw.avg_weight, 0)::numeric as avg_weight
    FROM corral_animals ca
    LEFT JOIN vaccination_metrics vm ON ca.corral_id = vm.corral_id
    LEFT JOIN corral_weights cw ON ca.corral_id = cw.corral_id
    LEFT JOIN pregnancy_data pd ON ca.corral_id = pd.corral_id
    ORDER BY ca.corral_name;
END;
$function$;