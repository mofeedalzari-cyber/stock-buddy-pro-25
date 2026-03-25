// ============================================================================
// ملف: types/warehouse.ts (أنواع المخازن الأساسية)
// ============================================================================
// يحتوي على تعريفات الأنواع الأساسية لنظام إدارة المخازن:
// المنتجات، التصنيفات، المخازن، الموردين، العملاء، الحركات
// ============================================================================

export interface Product {
  id: string;
  name: string;
  code: string;
  barcode: string;
  category_id: string | null;
  quantity: number;
  min_quantity?: number;      // الحد الأدنى للتنبيه (عند وصول المخزون لهذه القيمة أو أقل يظهر تحذير)
  warehouse_id: string | null;
  description: string;
  unit?: string;              // الوحدة الأساسية للمنتج (قطعة، كرتون، علبة، ...)
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
  type: string;               // نوع المخزن (مستودع، مخزن تسليح، ...)
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

// عنصر داخل الحركة المتعددة (قد تحتوي الحركة على عدة منتجات)
export interface MovementItem {
  product_id: string;
  quantity: number | null;   // يمكن أن يكون null في النموذج (عند عدم إدخال)
  unit: string;               // الوحدة المستخدمة في هذه الحركة (يجب أن تتطابق مع وحدة المنتج)
  notes?: string;
}

export interface StockMovement {
  id: string;
  // حقول مشتركة
  warehouse_id: string;
  type: MovementType;
  entity_id: string;          // معرف المورد أو العميل
  entity_type: 'supplier' | 'client';
  date: string;
  notes?: string;
  created_by: string | null;
  created_at: string;

  // حقول الحركة المفردة (اختيارية)
  product_id?: string;
  quantity?: number | null;
  unit?: string;              // الوحدة المستخدمة (يجب أن تتطابق مع وحدة المنتج)

  // حقول الحركة المتعددة (اختيارية)
  items?: MovementItem[];
}
