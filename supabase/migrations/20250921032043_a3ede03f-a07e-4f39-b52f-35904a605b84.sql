-- Remove national vaccination system tables and dependencies
-- Drop tables related to national vaccination system
DROP TABLE IF EXISTS herd_vaccine_overrides CASCADE;
DROP TABLE IF EXISTS custom_vaccines CASCADE;

-- Remove RPC functions that depend on national system
DROP FUNCTION IF EXISTS get_vaccination_alerts_for_animal(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS get_animal_vaccination_status(uuid, uuid) CASCADE;

-- Create new simplified vaccination status function that only uses user requirements
CREATE OR REPLACE FUNCTION get_animal_vaccination_status(
    _animal_id UUID,
    _cabaña_id UUID
)
RETURNS TABLE (
    requirement_id TEXT,
    vaccine_name TEXT,
    vaccine_type TEXT,
    is_mandatory BOOLEAN,
    status TEXT,
    last_vaccination_date DATE,
    next_due_date DATE,
    days_overdue INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH user_requirements AS (
        SELECT 
            vr.id::text as req_id,
            vr.vaccine_name,
            vr.vaccine_type,
            vr.is_mandatory,
            vr.frequency_months,
            vr.min_age_months,
            vr.max_age_months
        FROM cabaña_vaccination_requirements vr
        WHERE vr.cabaña_id = _cabaña_id 
        AND vr.is_active = true
    ),
    last_vaccinations AS (
        SELECT DISTINCT ON (av.vaccine_code)
            av.vaccine_code,
            av.date as last_date,
            av.next_due
        FROM animal_vaccines av
        WHERE av.animal_id = _animal_id
        AND av.cabaña_id = _cabaña_id
        ORDER BY av.vaccine_code, av.date DESC
    ),
    animal_info AS (
        SELECT 
            birth_date,
            EXTRACT(YEAR FROM AGE(CURRENT_DATE, birth_date)) * 12 + 
            EXTRACT(MONTH FROM AGE(CURRENT_DATE, birth_date)) as age_months
        FROM animals 
        WHERE id = _animal_id
    )
    SELECT 
        ur.req_id,
        ur.vaccine_name,
        ur.vaccine_type,
        ur.is_mandatory,
        CASE 
            WHEN lv.last_date IS NULL THEN 'missing'
            WHEN lv.next_due IS NOT NULL AND lv.next_due < CURRENT_DATE THEN 'overdue'
            WHEN lv.next_due IS NOT NULL AND lv.next_due <= CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon'
            ELSE 'up_to_date'
        END as status,
        lv.last_date,
        lv.next_due,
        CASE 
            WHEN lv.next_due IS NOT NULL AND lv.next_due < CURRENT_DATE 
            THEN (CURRENT_DATE - lv.next_due)::INTEGER
            ELSE NULL
        END as days_overdue
    FROM user_requirements ur
    CROSS JOIN animal_info ai
    LEFT JOIN last_vaccinations lv ON ur.vaccine_name = lv.vaccine_code
    WHERE (ur.min_age_months IS NULL OR ai.age_months >= ur.min_age_months)
    AND (ur.max_age_months IS NULL OR ai.age_months <= ur.max_age_months);
END;
$$;

-- Create simplified vaccination alerts function for user requirements only
CREATE OR REPLACE FUNCTION get_vaccination_alerts_for_animal(
    _animal_id UUID,
    _cabaña_id UUID
)
RETURNS TABLE (
    requirement_id TEXT,
    vaccine_name TEXT,
    vaccine_type TEXT,
    is_mandatory BOOLEAN,
    status TEXT,
    days_since_last INTEGER,
    days_until_due INTEGER,
    last_vaccination_date TEXT,
    next_due_date TEXT,
    description TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vs.requirement_id,
        vs.vaccine_name,
        vs.vaccine_type,
        vs.is_mandatory,
        vs.status,
        CASE 
            WHEN vs.last_vaccination_date IS NOT NULL 
            THEN (CURRENT_DATE - vs.last_vaccination_date)::INTEGER
            ELSE NULL
        END as days_since_last,
        CASE 
            WHEN vs.next_due_date IS NOT NULL 
            THEN (vs.next_due_date - CURRENT_DATE)::INTEGER
            ELSE NULL
        END as days_until_due,
        vs.last_vaccination_date::TEXT,
        vs.next_due_date::TEXT,
        CASE 
            WHEN vs.status = 'missing' THEN 'Vacuna requerida no aplicada'
            WHEN vs.status = 'overdue' THEN 'Vacuna vencida'
            WHEN vs.status = 'due_soon' THEN 'Vacuna próxima a vencer'
            ELSE 'Vacuna al día'
        END as description
    FROM get_animal_vaccination_status(_animal_id, _cabaña_id) vs
    WHERE vs.status IN ('missing', 'overdue', 'due_soon');
END;
$$;