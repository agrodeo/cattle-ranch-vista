export interface Animal {
  id: string;
  name: string;
  id_tag: string; // Required - never null in our system
  sex: string; // Required - never null in our system  
  breed: string; // Required - never null in our system
  birth_date: string | null;
  status: string;
  corral_id?: string | null;
}