-- Normalize all animal status values to lowercase
UPDATE animals SET status = LOWER(status) WHERE status IS NOT NULL AND status != LOWER(status);