export interface Equipment {
  id: number;
  name: string;
  type: string;
  location: string;
  last_inspection_date: string | null;
  status: 'Good' | 'Needs Repair' | 'Critical';
  image?: string;
}

export interface Inspection {
  id: number;
  equipment_id: number;
  equipment_name?: string;
  inspector_name: string;
  inspection_date: string;
  status: string;
  notes: string;
  image?: string;
  guard_post_location?: string;
  duty_officer_name?: string;
}
