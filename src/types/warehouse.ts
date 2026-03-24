// ============================================================================
// ملف: types/warehouse.ts (محدث)
// ============================================================================

export interface Product {
  id: string;
  name: string;
  code: string;
  barcode: string;
  category_id: string | null;
  quantity: number;
  min_quantity?: number;      // ✅ الحد الأدنى للتنبيه (عند وصول المخزون لهذه القيمة أو أقل يظهر تحذير)
  warehouse_id: string | null;
  description: string;
  unit?: string;              // وحدة القياس (قطعة، كرتونة، كيس، إلخ)
  image?: string;
  created_by: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  created_by: string | null;
  created_at: string;
}

export interface Warehouse {
  id: string;
  name: string;
  type: string;
  location: string;
  manager: string;
  notes?: string;
  created_by: string | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes?: string;
  created_by: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes?: string;
  created_by: string | null;
  created_at: string;
}

export type MovementType = 'in' | 'out';

// تعريف عنصر داخل الحركة المتعددة (الكمية يمكن أن تكون null)
export interface MovementItem {
  product_id: string;
  quantity: number | null;   // تم التعديل: number | null
  unit: string;
  notes?: string;
}

export interface StockMovement {
  id: string;
  // حقول مشتركة
  warehouse_id: string;
  type: MovementType;
  entity_id: string;
  entity_type: 'supplier' | 'client';
  date: string;
  notes?: string;
  created_by: string | null;
  created_at: string;

  // حقول الحركة المفردة (اختيارية)
  product_id?: string;
  quantity?: number | null;   // تم التعديل: number | null
  unit?: string;

  // حقول الحركة المتعددة (اختيارية)
  items?: MovementItem[];
}

// الأنواع الخاصة بمخازن التسليح
export type WeaponType = 'بندقية' | 'مسدس' | 'رشاش' | 'قاذفة' | 'أخرى';
export type Caliber = '5.56' | '7.62' | '9mm' | '12.7' | '45' | 'أخرى';
export type EquipmentType = 'منظار' | 'جهاز' | 'حقيبة' | 'أخرى';
export type MovementTypeArmory = 'وارد' | 'صادر' | 'تحويل' | 'إرجاع';

export interface ArmoryWarehouse {
  id: string;
  name: string;
  type: string;
  location: string;
  manager: string;
  notes?: string;
  created_at: string;
}

export interface Weapon {
  id: string;
  name: string;
  type: WeaponType;
  caliber: Caliber;
  serial_number: string;
  warehouse_id: string;
  status: 'متاح' | 'مسلّم' | 'صيانة';
  notes?: string;
  created_at: string;
}

export interface Ammunition {
  id: string;
  name: string;
  type: string;
  caliber: Caliber;
  quantity: number;
  min_quantity: number;
  warehouse_id: string;
  notes?: string;
  created_at: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: EquipmentType;
  serial_number?: string;
  warehouse_id: string;
  status: 'متاح' | 'مسلّم' | 'صيانة';
  notes?: string;
  created_at: string;
}

export interface PersonalEquipment {
  id: string;
  recipient_id: string;
  weapon_id?: string;
  equipment_id?: string;
  description: string;
  date_assigned: string;
  notes?: string;
  created_at: string;
}

export interface ArmoryRecipient {
  id: string;
  name: string;
  military_number: string;
  unit: string;
  rank?: string;
  phone?: string;
  notes?: string;
  created_at: string;
}

export interface ArmoryMovement {
  id: string;
  type: MovementTypeArmory;
  item_type: 'weapon' | 'ammunition' | 'equipment';
  item_id: string;
  quantity: number;
  from_warehouse_id?: string;
  to_warehouse_id?: string;
  recipient_id?: string;
  notes?: string;
  created_by: string;
  created_at: string;
}
