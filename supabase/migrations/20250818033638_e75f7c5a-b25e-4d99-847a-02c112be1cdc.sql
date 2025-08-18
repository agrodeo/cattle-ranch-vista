-- Primero insertar todas las provincias argentinas (23) sin eliminar las antiguas aún
INSERT INTO public.jurisdictions (code, name, country, parent_code) VALUES
-- Provincias con vacunación FA (Centro-Norte)
('AR-BA', 'Buenos Aires', 'AR', 'AR'),
('AR-CA', 'Catamarca', 'AR', 'AR'),
('AR-CC', 'Chaco', 'AR', 'AR'),
('AR-CB', 'Córdoba', 'AR', 'AR'),
('AR-CR', 'Corrientes', 'AR', 'AR'),
('AR-ER', 'Entre Ríos', 'AR', 'AR'),
('AR-FM', 'Formosa', 'AR', 'AR'),
('AR-JY', 'Jujuy', 'AR', 'AR'),
('AR-LR', 'La Rioja', 'AR', 'AR'),
('AR-MZ', 'Mendoza', 'AR', 'AR'),
('AR-MN', 'Misiones', 'AR', 'AR'),
('AR-SA', 'Salta', 'AR', 'AR'),
('AR-SJ', 'San Juan', 'AR', 'AR'),
('AR-SL', 'San Luis', 'AR', 'AR'),
('AR-SF', 'Santa Fe', 'AR', 'AR'),
('AR-SE', 'Santiago del Estero', 'AR', 'AR'),
('AR-TM', 'Tucumán', 'AR', 'AR'),
('AR-LP', 'La Pampa', 'AR', 'AR'),
-- Provincias Patagónicas (sin vacunación FA)
('AR-CH', 'Chubut', 'AR', 'AR'),
('AR-NQ', 'Neuquén', 'AR', 'AR'),
('AR-RN', 'Río Negro', 'AR', 'AR'),
('AR-SC', 'Santa Cruz', 'AR', 'AR'),
('AR-TF', 'Tierra del Fuego', 'AR', 'AR')
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  country = EXCLUDED.country,
  parent_code = EXCLUDED.parent_code;

-- Departamentos de Uruguay (19)
INSERT INTO public.jurisdictions (code, name, country, parent_code) VALUES
('UY-AR', 'Artigas', 'UY', 'UY'),
('UY-CA', 'Canelones', 'UY', 'UY'),
('UY-CL', 'Cerro Largo', 'UY', 'UY'),
('UY-CO', 'Colonia', 'UY', 'UY'),
('UY-DU', 'Durazno', 'UY', 'UY'),
('UY-FS', 'Flores', 'UY', 'UY'),
('UY-FD', 'Florida', 'UY', 'UY'),
('UY-LA', 'Lavalleja', 'UY', 'UY'),
('UY-MA', 'Maldonado', 'UY', 'UY'),
('UY-MO', 'Montevideo', 'UY', 'UY'),
('UY-PA', 'Paysandú', 'UY', 'UY'),
('UY-RN', 'Río Negro', 'UY', 'UY'),
('UY-RV', 'Rivera', 'UY', 'UY'),
('UY-RO', 'Rocha', 'UY', 'UY'),
('UY-SA', 'Salto', 'UY', 'UY'),
('UY-SJ', 'San José', 'UY', 'UY'),
('UY-SO', 'Soriano', 'UY', 'UY'),
('UY-TA', 'Tacuarembó', 'UY', 'UY'),
('UY-TT', 'Treinta y Tres', 'UY', 'UY')
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  country = EXCLUDED.country,
  parent_code = EXCLUDED.parent_code;

-- Departamentos de Paraguay (17 + Asunción)
INSERT INTO public.jurisdictions (code, name, country, parent_code) VALUES
('PY-AS', 'Asunción', 'PY', 'PY'),
('PY-AP', 'Alto Paraná', 'PY', 'PY'),
('PY-APY', 'Alto Paraguay', 'PY', 'PY'),
('PY-AM', 'Amambay', 'PY', 'PY'),
('PY-BQ', 'Boquerón', 'PY', 'PY'),
('PY-CG', 'Caaguazú', 'PY', 'PY'),
('PY-CZ', 'Caazapá', 'PY', 'PY'),
('PY-CA', 'Canindeyú', 'PY', 'PY'),
('PY-CE', 'Central', 'PY', 'PY'),
('PY-CN', 'Concepción', 'PY', 'PY'),
('PY-CO', 'Cordillera', 'PY', 'PY'),
('PY-GU', 'Guairá', 'PY', 'PY'),
('PY-IT', 'Itapúa', 'PY', 'PY'),
('PY-MI', 'Misiones', 'PY', 'PY'),
('PY-NE', 'Ñeembucú', 'PY', 'PY'),
('PY-PA', 'Paraguarí', 'PY', 'PY'),
('PY-PH', 'Presidente Hayes', 'PY', 'PY'),
('PY-SP', 'San Pedro', 'PY', 'PY')
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  country = EXCLUDED.country,
  parent_code = EXCLUDED.parent_code;

-- Estados de México (31 + CDMX)
INSERT INTO public.jurisdictions (code, name, country, parent_code) VALUES
('MX-AG', 'Aguascalientes', 'MX', 'MX'),
('MX-BC', 'Baja California', 'MX', 'MX'),
('MX-BS', 'Baja California Sur', 'MX', 'MX'),
('MX-CM', 'Campeche', 'MX', 'MX'),
('MX-CO', 'Coahuila', 'MX', 'MX'),
('MX-CL', 'Colima', 'MX', 'MX'),
('MX-CS', 'Chiapas', 'MX', 'MX'),
('MX-CH', 'Chihuahua', 'MX', 'MX'),
('MX-DF', 'Ciudad de México', 'MX', 'MX'),
('MX-DG', 'Durango', 'MX', 'MX'),
('MX-GT', 'Guanajuato', 'MX', 'MX'),
('MX-GR', 'Guerrero', 'MX', 'MX'),
('MX-HG', 'Hidalgo', 'MX', 'MX'),
('MX-JA', 'Jalisco', 'MX', 'MX'),
('MX-EM', 'México', 'MX', 'MX'),
('MX-MI', 'Michoacán', 'MX', 'MX'),
('MX-MO', 'Morelos', 'MX', 'MX'),
('MX-NA', 'Nayarit', 'MX', 'MX'),
('MX-NL', 'Nuevo León', 'MX', 'MX'),
('MX-OA', 'Oaxaca', 'MX', 'MX'),
('MX-PU', 'Puebla', 'MX', 'MX'),
('MX-QT', 'Querétaro', 'MX', 'MX'),
('MX-QR', 'Quintana Roo', 'MX', 'MX'),
('MX-SL', 'San Luis Potosí', 'MX', 'MX'),
('MX-SI', 'Sinaloa', 'MX', 'MX'),
('MX-SO', 'Sonora', 'MX', 'MX'),
('MX-TB', 'Tabasco', 'MX', 'MX'),
('MX-TM', 'Tamaulipas', 'MX', 'MX'),
('MX-TL', 'Tlaxcala', 'MX', 'MX'),
('MX-VE', 'Veracruz', 'MX', 'MX'),
('MX-YU', 'Yucatán', 'MX', 'MX'),
('MX-ZA', 'Zacatecas', 'MX', 'MX')
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  country = EXCLUDED.country,
  parent_code = EXCLUDED.parent_code;

-- Regiones de Chile (16)
INSERT INTO public.jurisdictions (code, name, country, parent_code) VALUES
('CL-AP', 'Arica y Parinacota', 'CL', 'CL'),
('CL-TA', 'Tarapacá', 'CL', 'CL'),
('CL-AN', 'Antofagasta', 'CL', 'CL'),
('CL-AT', 'Atacama', 'CL', 'CL'),
('CL-CO', 'Coquimbo', 'CL', 'CL'),
('CL-VS', 'Valparaíso', 'CL', 'CL'),
('CL-RM', 'Metropolitana de Santiago', 'CL', 'CL'),
('CL-LI', 'O''Higgins', 'CL', 'CL'),
('CL-ML', 'Maule', 'CL', 'CL'),
('CL-NB', 'Ñuble', 'CL', 'CL'),
('CL-BI', 'Biobío', 'CL', 'CL'),
('CL-AR', 'La Araucanía', 'CL', 'CL'),
('CL-LR', 'Los Ríos', 'CL', 'CL'),
('CL-LL', 'Los Lagos', 'CL', 'CL'),
('CL-AI', 'Aysén', 'CL', 'CL'),
('CL-MA', 'Magallanes', 'CL', 'CL')
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  country = EXCLUDED.country,
  parent_code = EXCLUDED.parent_code;

-- Estados de Brasil (26 + DF)
INSERT INTO public.jurisdictions (code, name, country, parent_code) VALUES
('BR-AC', 'Acre', 'BR', 'BR'),
('BR-AL', 'Alagoas', 'BR', 'BR'),
('BR-AP', 'Amapá', 'BR', 'BR'),
('BR-AM', 'Amazonas', 'BR', 'BR'),
('BR-BA', 'Bahia', 'BR', 'BR'),
('BR-CE', 'Ceará', 'BR', 'BR'),
('BR-ES', 'Espírito Santo', 'BR', 'BR'),
('BR-GO', 'Goiás', 'BR', 'BR'),
('BR-MA', 'Maranhão', 'BR', 'BR'),
('BR-MT', 'Mato Grosso', 'BR', 'BR'),
('BR-MS', 'Mato Grosso do Sul', 'BR', 'BR'),
('BR-MG', 'Minas Gerais', 'BR', 'BR'),
('BR-PA', 'Pará', 'BR', 'BR'),
('BR-PB', 'Paraíba', 'BR', 'BR'),
('BR-PR', 'Paraná', 'BR', 'BR'),
('BR-PE', 'Pernambuco', 'BR', 'BR'),
('BR-PI', 'Piauí', 'BR', 'BR'),
('BR-RJ', 'Rio de Janeiro', 'BR', 'BR'),
('BR-RS', 'Rio Grande do Sul', 'BR', 'BR'),
('BR-RO', 'Rondônia', 'BR', 'BR'),
('BR-RR', 'Roraima', 'BR', 'BR'),
('BR-SC', 'Santa Catarina', 'BR', 'BR'),
('BR-SP', 'São Paulo', 'BR', 'BR'),
('BR-SE', 'Sergipe', 'BR', 'BR'),
('BR-TO', 'Tocantins', 'BR', 'BR'),
('BR-DF', 'Distrito Federal', 'BR', 'BR')
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  country = EXCLUDED.country,
  parent_code = EXCLUDED.parent_code;

-- Departamentos de Colombia (32 + DC)
INSERT INTO public.jurisdictions (code, name, country, parent_code) VALUES
('CO-AMA', 'Amazonas', 'CO', 'CO'),
('CO-ANT', 'Antioquia', 'CO', 'CO'),
('CO-ARA', 'Arauca', 'CO', 'CO'),
('CO-ATL', 'Atlántico', 'CO', 'CO'),
('CO-BOL', 'Bolívar', 'CO', 'CO'),
('CO-BOY', 'Boyacá', 'CO', 'CO'),
('CO-CAL', 'Caldas', 'CO', 'CO'),
('CO-CAQ', 'Caquetá', 'CO', 'CO'),
('CO-CAS', 'Casanare', 'CO', 'CO'),
('CO-CAU', 'Cauca', 'CO', 'CO'),
('CO-CES', 'Cesar', 'CO', 'CO'),
('CO-CHO', 'Chocó', 'CO', 'CO'),
('CO-COR', 'Córdoba', 'CO', 'CO'),
('CO-CUN', 'Cundinamarca', 'CO', 'CO'),
('CO-GUA', 'Guainía', 'CO', 'CO'),
('CO-GUV', 'Guaviare', 'CO', 'CO'),
('CO-HUI', 'Huila', 'CO', 'CO'),
('CO-LAG', 'La Guajira', 'CO', 'CO'),
('CO-MAG', 'Magdalena', 'CO', 'CO'),
('CO-MET', 'Meta', 'CO', 'CO'),
('CO-NAR', 'Nariño', 'CO', 'CO'),
('CO-NSA', 'Norte de Santander', 'CO', 'CO'),
('CO-PUT', 'Putumayo', 'CO', 'CO'),
('CO-QUI', 'Quindío', 'CO', 'CO'),
('CO-RIS', 'Risaralda', 'CO', 'CO'),
('CO-SAP', 'San Andrés y Providencia', 'CO', 'CO'),
('CO-SAN', 'Santander', 'CO', 'CO'),
('CO-SUC', 'Sucre', 'CO', 'CO'),
('CO-TOL', 'Tolima', 'CO', 'CO'),
('CO-VAL', 'Valle del Cauca', 'CO', 'CO'),
('CO-VAU', 'Vaupés', 'CO', 'CO'),
('CO-VID', 'Vichada', 'CO', 'CO'),
('CO-DC', 'Bogotá D.C.', 'CO', 'CO')
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  country = EXCLUDED.country,
  parent_code = EXCLUDED.parent_code;

-- Departamentos de Perú (24 + Callao)
INSERT INTO public.jurisdictions (code, name, country, parent_code) VALUES
('PE-AMA', 'Amazonas', 'PE', 'PE'),
('PE-ANC', 'Áncash', 'PE', 'PE'),
('PE-APU', 'Apurímac', 'PE', 'PE'),
('PE-ARE', 'Arequipa', 'PE', 'PE'),
('PE-AYA', 'Ayacucho', 'PE', 'PE'),
('PE-CAJ', 'Cajamarca', 'PE', 'PE'),
('PE-CUS', 'Cusco', 'PE', 'PE'),
('PE-HUV', 'Huancavelica', 'PE', 'PE'),
('PE-HUC', 'Huánuco', 'PE', 'PE'),
('PE-ICA', 'Ica', 'PE', 'PE'),
('PE-JUN', 'Junín', 'PE', 'PE'),
('PE-LAL', 'La Libertad', 'PE', 'PE'),
('PE-LAM', 'Lambayeque', 'PE', 'PE'),
('PE-LIM', 'Lima', 'PE', 'PE'),
('PE-CAL', 'Callao', 'PE', 'PE'),
('PE-LOR', 'Loreto', 'PE', 'PE'),
('PE-MDD', 'Madre de Dios', 'PE', 'PE'),
('PE-MOQ', 'Moquegua', 'PE', 'PE'),
('PE-PAS', 'Pasco', 'PE', 'PE'),
('PE-PIU', 'Piura', 'PE', 'PE'),
('PE-PUN', 'Puno', 'PE', 'PE'),
('PE-SAM', 'San Martín', 'PE', 'PE'),
('PE-TAC', 'Tacna', 'PE', 'PE'),
('PE-TUM', 'Tumbes', 'PE', 'PE'),
('PE-UCA', 'Ucayali', 'PE', 'PE')
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  country = EXCLUDED.country,
  parent_code = EXCLUDED.parent_code;