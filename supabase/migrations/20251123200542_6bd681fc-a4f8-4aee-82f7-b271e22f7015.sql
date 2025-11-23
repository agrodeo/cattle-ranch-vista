-- Enable Realtime updates for animal_vaccines table
-- This allows UI components to automatically update when vaccinations are recorded

-- Enable REPLICA IDENTITY FULL to capture complete row data during changes
ALTER TABLE animal_vaccines REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE animal_vaccines;