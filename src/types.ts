export interface User {
  username: string;
  email: string;
  role: string;
}

export interface Equipment {
  id: number;
  name: string;
  type: string;
  location: string;
  last_inspection_date: string | null;
  status: 'Good' | 'Broken' | 'Critical';
}

export interface Inspection {
  id: number;
  equipment_id: number;
  equipment_name: string;
  inspector_name: string;
  inspection_date: string;
  guard_post: string;
  officer_name: string;
  image: string | null;
  status: 'Good' | 'Broken' | 'Critical';
  notes: string;
}
