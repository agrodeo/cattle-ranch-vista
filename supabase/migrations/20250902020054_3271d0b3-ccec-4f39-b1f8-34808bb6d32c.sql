-- Insert basic vaccines if they don't exist
INSERT INTO vaccines (code, name, description) VALUES 
  ('fmd', 'Fiebre Aftosa (FMD)', 'Vacuna contra la Fiebre Aftosa'),
  ('brucelosis', 'Brucelosis Bovina', 'Vacuna contra la Brucelosis Bovina'),
  ('rabia', 'Rabia de Origen Silvestre', 'Vacuna contra la Rabia de Origen Silvestre')
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Insert additional provinces and special zones for Argentina
INSERT INTO jurisdictions (code, country, name, parent_code) VALUES
  ('AR-CT', 'AR', 'Chubut', 'AR'),
  ('AR-RN', 'AR', 'Río Negro', 'AR'),
  ('AR-NQ', 'AR', 'Neuquén', 'AR'),
  ('AR-SC', 'AR', 'Santa Cruz', 'AR'),
  ('AR-TF', 'AR', 'Tierra del Fuego', 'AR'),
  ('AR-SJ', 'AR', 'San Juan', 'AR'),
  ('AR-SF', 'AR', 'Santa Fe', 'AR'),
  ('AR-ER', 'AR', 'Entre Ríos', 'AR'),
  ('AR-CR', 'AR', 'Corrientes', 'AR'),
  ('AR-MN', 'AR', 'Misiones', 'AR'),
  ('AR-CH', 'AR', 'Chaco', 'AR'),
  ('AR-FO', 'AR', 'Formosa', 'AR'),
  ('AR-SE', 'AR', 'Santiago del Estero', 'AR'),
  ('AR-CB', 'AR', 'Córdoba', 'AR'),
  ('AR-LP', 'AR', 'La Pampa', 'AR'),
  ('AR-MZ', 'AR', 'Mendoza', 'AR'),
  ('AR-SL', 'AR', 'San Luis', 'AR'),
  ('AR-TU', 'AR', 'Tucumán', 'AR'),
  ('AR-SA', 'AR', 'Salta', 'AR'),
  ('AR-JY', 'AR', 'Jujuy', 'AR'),
  ('AR-CA', 'AR', 'Catamarca', 'AR'),
  ('AR-LR', 'AR', 'La Rioja', 'AR'),
  
  -- Special zones for Argentina
  ('AR-PATAGONIA', 'AR', 'Zona Patagonia (Libre FMD sin vacunación)', 'AR'),
  ('AR-PATAGONIA-NORTE', 'AR', 'Zona Patagonia Norte (Libre FMD sin vacunación)', 'AR'),
  ('AR-VALLES-CALINGASTA', 'AR', 'Valles de Calingasta (Libre FMD sin vacunación)', 'AR')
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name;