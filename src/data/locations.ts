export const COUNTRIES = [
  { code: 'AR', name: 'Argentina' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'CO', name: 'Colombia' },
  { code: 'MX', name: 'México' },
  { code: 'PE', name: 'Perú' },
  { code: 'CL', name: 'Chile' },
  { code: 'BR', name: 'Brasil' },
] as const;

export const AR_PROVINCES = [
  { code: 'AR-BA', name: 'Buenos Aires' },
  { code: 'AR-CA', name: 'Catamarca' },
  { code: 'AR-CH', name: 'Chaco' },
  { code: 'AR-CT', name: 'Chubut' },
  { code: 'AR-CB', name: 'Córdoba' },
  { code: 'AR-CR', name: 'Corrientes' },
  { code: 'AR-ER', name: 'Entre Ríos' },
  { code: 'AR-FO', name: 'Formosa' },
  { code: 'AR-JY', name: 'Jujuy' },
  { code: 'AR-LP', name: 'La Pampa' },
  { code: 'AR-LR', name: 'La Rioja' },
  { code: 'AR-MZ', name: 'Mendoza' },
  { code: 'AR-MN', name: 'Misiones' },
  { code: 'AR-NQ', name: 'Neuquén' },
  { code: 'AR-RN', name: 'Río Negro' },
  { code: 'AR-SA', name: 'Salta' },
  { code: 'AR-SJ', name: 'San Juan' },
  { code: 'AR-SL', name: 'San Luis' },
  { code: 'AR-SC', name: 'Santa Cruz' },
  { code: 'AR-SF', name: 'Santa Fe' },
  { code: 'AR-SE', name: 'Santiago del Estero' },
  { code: 'AR-TF', name: 'Tierra del Fuego' },
  { code: 'AR-TU', name: 'Tucumán' },
];

// Special vaccination zones for Argentina
export const AR_SPECIAL_ZONES = [
  { 
    code: 'AR-PATAGONIA', 
    name: 'Zona Patagonia (Libre FMD sin vacunación)',
    provinces: ['AR-CT', 'AR-SC', 'AR-TF'],
    fmdStatus: 'free_without_vaccination'
  },
  { 
    code: 'AR-PATAGONIA-NORTE', 
    name: 'Zona Patagonia Norte (Libre FMD sin vacunación)',
    provinces: ['AR-RN', 'AR-NQ'],
    fmdStatus: 'free_without_vaccination'
  },
  { 
    code: 'AR-VALLES-CALINGASTA', 
    name: 'Valles de Calingasta (Libre FMD sin vacunación)',
    provinces: ['AR-SJ'],
    fmdStatus: 'free_without_vaccination'
  }
];

// Helper function to check if a province is in a FMD-free zone
export function isProvinceInFMDFreeZone(provinceCode: string): boolean {
  return AR_SPECIAL_ZONES.some(zone => 
    zone.provinces.includes(provinceCode) && zone.fmdStatus === 'free_without_vaccination'
  );
}