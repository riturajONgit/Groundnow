export interface Tenant {
  id: string;
  slug: string;
  name: string;
  logo_url?: string | null;
  brand_color?: string | null;
  created_at?: string;
  description?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  address?: string | null;
  city?: string | null;
  upi_id?: string | null;
}

export type TenantRole = 'tenant_owner' | 'tenant_staff' | 'customer';

export interface TenantMember {
  id?: string;
  tenant_id: string;
  user_id: string;
  role: 'tenant_owner' | 'tenant_staff';
  created_at?: string;
  tenants?: Tenant;
}

export interface Turf {
  id: string;
  tenant_id: string;
  name: string;
  address?: string | null;
  is_active?: boolean | null;
  parent_turf_id?: string | null;
  description?: string | null;
  sport_type?: string | null;
  surface_type?: string | null;
  hourly_rate?: number | null;
  price_per_hour?: number | null;
  rate?: number | null;
  image_url?: string | null;
  images?: string[] | null;
  dimension?: string | null;
  indoor?: boolean | null;
  lighting?: boolean | null;
  created_at?: string;
  parent_turf?: Turf | null;
}

export interface Sport {
  id: string | number;
  name: string;
  slug?: string | null;
  description?: string | null;
  icon?: string | null;
  created_at?: string;
}

export interface TurfSport {
  id?: string;
  turf_id: string;
  sport_id: string | number;
  tenant_id: string;
  price_per_hour: number | null;
  peak_price: number | null;
  min_duration_minutes: number | null;
  capacity: number | null;
  created_at?: string;
  sports?: Sport;
  turfs?: Turf;
}

export interface AvailabilityRule {
  id?: string;
  tenant_id?: string;
  turf_id: string;
  day_of_week: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  open_time: string;
  close_time: string;
  slot_minutes: number;
  created_at?: string;
}

export interface Booking {
  id: string;
  tenant_id?: string;
  turf_id: string;
  sport_id?: string | number | null;
  customer_id?: string | null;
  during?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  start_time?: string;
  end_time?: string;
  booking_date?: string;
  status?: string;
  payment_status?: string | null;
  amount?: number | null;
  total_price?: number | null;
  notes?: string | null;
  created_at?: string;
  turfs?: Turf | null;
  sports?: Sport | null;
}
