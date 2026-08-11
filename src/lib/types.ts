export type PaymentMethod = 'mpesa' | 'emola' | 'cod';

export type PaymentStatus =
  | 'pending'
  | 'awaiting_confirmation'
  | 'paid'
  | 'failed'
  | 'cancelled';

export type OrderStatus =
  | 'new'
  | 'payment_pending'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type NotificationStatus = 'pending' | 'sent' | 'failed';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  position: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  short_description: string | null;
  description: string | null;
  category_id: string | null;
  price_cents: number;
  compare_at_price_cents: number | null;
  images: string[];
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  sales_count: number;
  created_at: string;
  categories?: Pick<Category, 'name' | 'slug'> | null;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  alternative_phone: string | null;
  province: string;
  city: string;
  neighborhood: string;
  address_reference: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  product_image_snapshot: string | null;
  quantity: number;
  unit_price_cents: number;
  subtotal_cents: number;
}

export interface Payment {
  id: string;
  order_id: string;
  method: PaymentMethod;
  payer_phone: string | null;
  transaction_reference: string | null;
  receipt_url: string | null;
  status: PaymentStatus;
  confirmed_at: string | null;
  created_at: string;
}

export interface NotificationRecord {
  id: string;
  order_id: string | null;
  channel: string;
  audience: string;
  recipient: string | null;
  status: NotificationStatus;
  attempts: number;
  provider_message_id: string | null;
  last_error: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  subtotal_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  notes: string | null;
  purchase_event_id: string;
  purchase_tracked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderWithRelations extends Order {
  customers: Customer | null;
  order_items: OrderItem[];
  payments: Payment[];
  notifications?: NotificationRecord[];
}

export interface SiteSettings {
  store_name: string;
  tagline: string;
  contact_whatsapp: string | null;
  contact_email: string | null;
  mpesa_number: string | null;
  emola_number: string | null;
  mpesa_enabled: boolean;
  emola_enabled: boolean;
  cod_enabled: boolean;
  delivery_fee_cents: number;
  free_delivery_threshold_cents: number | null;
  delivery_areas: string[];
  announcement: string | null;
}
