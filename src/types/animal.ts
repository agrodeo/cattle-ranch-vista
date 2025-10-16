export interface Animal {
  id: string;
  name?: string;
  id_tag: string; // Required - never null in our system
  caravana_electronica?: string; // Optional - electronic tag/RFID identifier
  sex: string; // Required - never null in our system  
  breed: string; // Required - never null in our system
  birth_date: string | null;
  status: string;
  mother_id?: string;
  father_id?: string;
  mother_name?: string;
  father_name?: string;
  mother_breed?: string;
  father_breed?: string;
  mother_registration?: string;
  father_registration?: string;
  cabaña_id?: string;
  peso_nacimiento?: number;
  mocho?: string;
  color?: string;
  condicion_corporal?: string;
  observaciones?: string;
  registration_level?: string;
  registration_level_override?: string;
  registration_override_reason?: string;
  registration_father_level?: string;
  registration_mother_level?: string;
  dna_verified?: boolean;
  corral_id?: string | null;
  corral?: any; // For joined data
  esta_preñada?: boolean;
  fecha_probable_parto?: string;
  fecha_muerte?: string;
  peso_actual_kg?: number;
  fecha_ultimo_pesaje?: string;
  ganancia_diaria_kg?: number;
  is_castrated?: boolean;
}