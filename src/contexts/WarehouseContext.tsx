// ============================================================================
// ملف: context/WarehouseContext.tsx (محدث - دعم الإشعارات بالوحدة المدخلة)
// ============================================================================

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  getMovementNotification,
  getMultiMovementNotification,
  getLowStockNotification,
} from '@/utils/notificationTemplates';

// ========== تعريف الأنواع ==========
export type MovementType = 'in' | 'out';

export interface MovementItem {
  product_id: string;
  quantity: number | null;
  unit: string;
  notes?: string;
  unit_id?: string;
  display_quantity?: number | null;
  display_unit_id?: string | null;
}

export interface StockMovement {
  id: string;
  warehouse_id: string;
  type: MovementType;
  entity_id: string;
  entity_type: 'supplier' | 'client';
  date: string;
  notes?: string;
  created_at: string;
  created_by: string;
  product_id?: string | null;
  quantity?: number | null;
  unit?: string | null;
  items?: MovementItem[] | null;
  unit_id?: string | null;
  display_quantity?: number | null;
  display_unit_id?: string | null;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  barcode?: string;
  category_id?: string | null;
  quantity: number;
  warehouse_id?: string | null;
  description?: string;
  image?: string;
  unit?: string;
  min_quantity?: number;
  pack_size?: number;
  base_unit_id?: string | null;
  display_unit_id?: string | null;
  created_at: string;
  created_by: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  created_by: string;
}

export interface Warehouse {
  id: string;
  name: string;
  type?: string;
  location?: string;
  manager?: string;
  notes?: string;
  created_at: string;
  created_by: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  created_at: string;
  created_by: string;
}

export interface Client {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  created_at: string;
  created_by: string;
}

export interface Unit {
  id: string;
  name: string;
  abbreviation?: string;
  is_base_unit: boolean;
}

export interface UnitConversion {
  id: string;
  from_unit_id: string;
  to_unit_id: string;
  factor: number;
}

interface WarehouseContextType {
  products: Product[];
  categories: Category[];
  warehouses: Warehouse[];
  suppliers: Supplier[];
  clients: Client[];
  movements: StockMovement[];
  loading: boolean;
  units: Unit[];
  unitConversions: UnitConversion[];
  addProduct: (p: Omit<Product, 'id' | 'created_at' | 'created_by'>) => Promise<void>;
  updateProduct: (p: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<boolean>;
  addCategory: (c: Omit<Category, 'id' | 'created_at' | 'created_by'>) => Promise<void>;
  updateCategory: (c: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<boolean>;
  addWarehouse: (w: Omit<Warehouse, 'id' | 'created_at' | 'created_by'>) => Promise<void>;
  updateWarehouse: (w: Warehouse) => Promise<void>;
  deleteWarehouse: (id: string) => Promise<boolean>;
  addSupplier: (s: Omit<Supplier, 'id' | 'created_at' | 'created_by'>) => Promise<void>;
  updateSupplier: (s: Supplier) => Promise<void>;
  deleteSupplier: (id: string) => Promise<boolean>;
  addClient: (c: Omit<Client, 'id' | 'created_at' | 'created_by'>) => Promise<void>;
  updateClient: (c: Client) => Promise<void>;
  deleteClient: (id: string) => Promise<boolean>;
  addMovement: (m: Omit<StockMovement, 'id' | 'created_at' | 'created_by'>) => Promise<void>;
  updateMovement: (m: StockMovement) => Promise<void>;
  deleteMovement: (id: string) => Promise<void>;
  getCategoryName: (id: string) => string;
  getWarehouseName: (id: string) => string;
  getSupplierName: (id: string) => string;
  getClientName: (id: string) => string;
  getProductName: (id: string) => string;
  getUserName: (id: string | null) => string;
  getUnitName: (id: string) => string;
  convertQuantity: (quantity: number, fromUnitId: string, toUnitId: string) => number;
  isLinkedToMovement: (type: 'product' | 'category' | 'warehouse' | 'supplier' | 'client', id: string) => boolean;
  refreshAll: () => Promise<void>;
}

const WarehouseContext = createContext<WarehouseContextType | undefined>(undefined);

export const WarehouseProvider = ({ children }: { children: ReactNode }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitConversions, setUnitConversions] = useState<UnitConversion[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, displayName } = useAuth();
  const { toast } = useToast();

  // ========== جلب جميع البيانات ==========
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [catRes, whRes, supRes, clRes, prodRes, movRes, profRes, unitsRes, convRes] = await Promise.all([
      supabase.from('categories').select('*'),
      supabase.from('warehouses').select('*'),
      supabase.from('suppliers').select('*'),
      supabase.from('clients').select('*'),
      supabase.from('products').select('*'),
      supabase.from('stock_movements').select('*'),
      supabase.from('profiles').select('user_id, display_name'),
      (supabase as any).from('units').select('*'),
      (supabase as any).from('unit_conversions').select('*'),
    ]);
    if (catRes.data) setCategories(catRes.data as unknown as Category[]);
    if (whRes.data) setWarehouses(whRes.data as unknown as Warehouse[]);
    if (supRes.data) setSuppliers(supRes.data as unknown as Supplier[]);
    if (clRes.data) setClients(clRes.data as unknown as Client[]);
    if (prodRes.data) setProducts(prodRes.data as unknown as Product[]);
    if (movRes.data) {
      const movementsData = (movRes.data as any[]).map((mov: any) => ({
        ...mov,
        items: mov.items ? (typeof mov.items === 'string' ? JSON.parse(mov.items) : mov.items) : undefined,
        display_unit_id: mov.display_unit,
      })) as StockMovement[];
      setMovements(movementsData);
    }
    if (profRes.data) {
      const map: Record<string, string> = {};
      (profRes.data as any[]).forEach((p: any) => { map[p.user_id] = p.display_name; });
      setProfiles(map);
    }
    if (unitsRes.data) setUnits(unitsRes.data as unknown as Unit[]);
    if (convRes.data) setUnitConversions(convRes.data as unknown as UnitConversion[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) fetchAll();
  }, [user, fetchAll]);

  // ========== Realtime ==========
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('warehouse-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        supabase.from('categories').select('*').then(r => { if (r.data) setCategories(r.data as Category[]); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'warehouses' }, () => {
        supabase.from('warehouses').select('*').then(r => { if (r.data) setWarehouses(r.data as Warehouse[]); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, () => {
        supabase.from('suppliers').select('*').then(r => { if (r.data) setSuppliers(r.data as Supplier[]); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
        supabase.from('clients').select('*').then(r => { if (r.data) setClients(r.data as Client[]); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        supabase.from('products').select('*').then(r => { if (r.data) setProducts(r.data as unknown as Product[]); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_movements' }, () => {
        supabase.from('stock_movements').select('*').then(r => {
          if (r.data) {
            const movementsData = (r.data as any[]).map((mov: any) => ({
              ...mov,
              items: mov.items ? (typeof mov.items === 'string' ? JSON.parse(mov.items) : mov.items) : undefined,
              display_unit_id: mov.display_unit,
            })) as StockMovement[];
            setMovements(movementsData);
          }
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'units' }, () => {
        supabase.from('units').select('*').then(r => { if (r.data) setUnits(r.data as Unit[]); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unit_conversions' }, () => {
        supabase.from('unit_conversions').select('*').then(r => { if (r.data) setUnitConversions(r.data as UnitConversion[]); });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const showError = (msg: string) => toast({ title: 'خطأ', description: msg, variant: 'destructive' });

  // ========== دوال المنتجات ==========
  const addProduct = useCallback(async (p: Omit<Product, 'id' | 'created_at' | 'created_by'>) => {
    if (!user?.id) {
      showError('يجب تسجيل الدخول أولاً');
      return;
    }
    const { data, error } = await supabase
      .from('products')
      .insert({
        ...p,
        created_by: user.id,
        unit: p.unit || 'قطعة',
        min_quantity: p.min_quantity ?? 2,
        pack_size: p.pack_size ?? 1,
        base_unit_id: p.base_unit_id,
        display_unit_id: p.display_unit_id
      })
      .select()
      .single();

    if (error) {
      showError(error.message);
      return;
    }
    if (data) {
      setProducts(prev => [...prev, data as Product]);
    }
  }, [user]);

  const updateProduct = useCallback(async (p: Product) => {
    const { error } = await supabase
      .from('products')
      .update({
        name: p.name,
        code: p.code,
        barcode: p.barcode,
        category_id: p.category_id,
        quantity: p.quantity,
        warehouse_id: p.warehouse_id,
        description: p.description,
        image: p.image,
        unit: p.unit,
        min_quantity: p.min_quantity,
        pack_size: p.pack_size,
        base_unit_id: p.base_unit_id,
        display_unit_id: p.display_unit_id
      })
      .eq('id', p.id);
    if (error) showError(error.message);
    else {
      setProducts(prev => prev.map(prod => prod.id === p.id ? p : prod));
    }
  }, []);

  const deleteProduct = useCallback(async (id: string): Promise<boolean> => {
    if (movements.some(m => m.product_id === id || m.items?.some(i => i.product_id === id))) return false;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) { showError(error.message); return false; }
    setProducts(prev => prev.filter(p => p.id !== id));
    return true;
  }, [movements]);

  // ========== دوال التصنيفات ==========
  const addCategory = useCallback(async (c: Omit<Category, 'id' | 'created_at' | 'created_by'>) => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('categories')
      .insert({ ...c, created_by: user.id })
      .select()
      .single();
    if (error) showError(error.message);
    else if (data) setCategories(prev => [...prev, data as Category]);
  }, [user]);

  const updateCategory = useCallback(async (c: Category) => {
    const { error } = await supabase
      .from('categories')
      .update({ name: c.name, description: c.description })
      .eq('id', c.id);
    if (error) showError(error.message);
    else setCategories(prev => prev.map(cat => cat.id === c.id ? c : cat));
  }, []);

  const deleteCategory = useCallback(async (id: string): Promise<boolean> => {
    if (products.some(p => p.category_id === id)) return false;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) { showError(error.message); return false; }
    setCategories(prev => prev.filter(c => c.id !== id));
    return true;
  }, [products]);

  // ========== دوال المخازن ==========
  const addWarehouse = useCallback(async (w: Omit<Warehouse, 'id' | 'created_at' | 'created_by'>) => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('warehouses')
      .insert({ ...w, created_by: user.id })
      .select()
      .single();
    if (error) showError(error.message);
    else if (data) setWarehouses(prev => [...prev, data as Warehouse]);
  }, [user]);

  const updateWarehouse = useCallback(async (w: Warehouse) => {
    const { error } = await supabase
      .from('warehouses')
      .update({ name: w.name, type: w.type, location: w.location, manager: w.manager, notes: w.notes })
      .eq('id', w.id);
    if (error) showError(error.message);
    else setWarehouses(prev => prev.map(wh => wh.id === w.id ? w : wh));
  }, []);

  const deleteWarehouse = useCallback(async (id: string): Promise<boolean> => {
    if (movements.some(m => m.warehouse_id === id) || products.some(p => p.warehouse_id === id)) return false;
    const { error } = await supabase.from('warehouses').delete().eq('id', id);
    if (error) { showError(error.message); return false; }
    setWarehouses(prev => prev.filter(w => w.id !== id));
    return true;
  }, [movements, products]);

  // ========== دوال الموردين ==========
  const addSupplier = useCallback(async (s: Omit<Supplier, 'id' | 'created_at' | 'created_by'>) => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('suppliers')
      .insert({ ...s, created_by: user.id })
      .select()
      .single();
    if (error) showError(error.message);
    else if (data) setSuppliers(prev => [...prev, data as Supplier]);
  }, [user]);

  const updateSupplier = useCallback(async (s: Supplier) => {
    const { error } = await supabase
      .from('suppliers')
      .update({ name: s.name, phone: s.phone, email: s.email, address: s.address, notes: s.notes })
      .eq('id', s.id);
    if (error) showError(error.message);
    else setSuppliers(prev => prev.map(sup => sup.id === s.id ? s : sup));
  }, []);

  const deleteSupplier = useCallback(async (id: string): Promise<boolean> => {
    if (movements.some(m => m.entity_type === 'supplier' && m.entity_id === id)) return false;
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) { showError(error.message); return false; }
    setSuppliers(prev => prev.filter(s => s.id !== id));
    return true;
  }, [movements]);

  // ========== دوال العملاء ==========
  const addClient = useCallback(async (c: Omit<Client, 'id' | 'created_at' | 'created_by'>) => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('clients')
      .insert({ ...c, created_by: user.id })
      .select()
      .single();
    if (error) showError(error.message);
    else if (data) setClients(prev => [...prev, data as Client]);
  }, [user]);

  const updateClient = useCallback(async (c: Client) => {
    const { error } = await supabase
      .from('clients')
      .update({ name: c.name, phone: c.phone, address: c.address, notes: c.notes })
      .eq('id', c.id);
    if (error) showError(error.message);
    else setClients(prev => prev.map(cl => cl.id === c.id ? c : cl));
  }, []);

  const deleteClient = useCallback(async (id: string): Promise<boolean> => {
    if (movements.some(m => m.entity_type === 'client' && m.entity_id === id)) return false;
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) { showError(error.message); return false; }
    setClients(prev => prev.filter(c => c.id !== id));
    return true;
  }, [movements]);

  // ========== دوال تحديث الكميات ==========
  const updateProductQuantities = useCallback(async (movement: StockMovement, reverse: boolean = false) => {
    if (movement.product_id && movement.quantity !== undefined && movement.quantity !== null) {
      const product = products.find(p => p.id === movement.product_id);
      if (product) {
        const change = movement.type === 'in' ? movement.quantity : -movement.quantity;
        const newQty = reverse ? product.quantity - change : product.quantity + change;
        const { error } = await supabase
          .from('products')
          .update({ quantity: newQty })
          .eq('id', movement.product_id);
        if (error) showError(error.message);
        else {
          setProducts(prev => prev.map(p => p.id === movement.product_id ? { ...p, quantity: newQty } : p));
        }
      }
    } else if (movement.items && movement.items.length > 0) {
      for (const item of movement.items) {
        if (item.quantity === null) continue;
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          const change = movement.type === 'in' ? item.quantity : -item.quantity;
          const newQty = reverse ? product.quantity - change : product.quantity + change;
          const { error } = await supabase
            .from('products')
            .update({ quantity: newQty })
            .eq('id', item.product_id);
          if (error) showError(error.message);
          else {
            setProducts(prev => prev.map(p => p.id === item.product_id ? { ...p, quantity: newQty } : p));
          }
        }
      }
    }
  }, [products]);

  // ========== دوال الحركات ==========
  const addMovement = useCallback(async (m: Omit<StockMovement, 'id' | 'created_at' | 'created_by'>) => {
    if (!user?.id) {
      showError('يجب تسجيل الدخول أولاً');
      return;
    }

    const insertData: any = {
      warehouse_id: m.warehouse_id,
      type: m.type,
      entity_id: m.entity_id,
      entity_type: m.entity_type,
      date: m.date,
      notes: m.notes,
      created_by: user.id,
      display_quantity: m.display_quantity ?? null,
      display_unit: m.display_unit_id ?? null,
    };

    if (m.product_id && m.quantity !== undefined) {
      insertData.product_id = m.product_id;
      insertData.quantity = m.quantity;
      insertData.unit = m.unit || 'قطعة';
      insertData.unit_id = m.unit_id;
      insertData.items = null;
    } else if (m.items && m.items.length > 0) {
      const itemsToStore = m.items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit: item.unit || 'قطعة',
        notes: item.notes,
        unit_id: item.unit_id,
        display_quantity: item.display_quantity,
        display_unit_id: item.display_unit_id,
      }));
      insertData.items = JSON.stringify(itemsToStore);
      insertData.product_id = null;
      insertData.quantity = null;
      insertData.unit = null;
      insertData.unit_id = null;
    } else {
      showError('بيانات الحركة غير مكتملة');
      return;
    }

    const { data, error } = await supabase
      .from('stock_movements')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      showError(error.message);
      return;
    }

    if (data) {
      const d = data as any;
      const newMovement: StockMovement = {
        ...d,
        type: d.type as MovementType,
        entity_type: d.entity_type as 'supplier' | 'client',
        items: d.items ? (typeof d.items === 'string' ? JSON.parse(d.items) : d.items) : undefined,
        display_quantity: d.display_quantity,
        display_unit_id: d.display_unit,
      };
      setMovements(prev => [...prev, newMovement]);
      await updateProductQuantities(newMovement, false);

      // ========== إنشاء الإشعارات ==========
      try {
        const warehouseName = warehouses.find(w => w.id === newMovement.warehouse_id)?.name || 'مخزن';
        const entityName = newMovement.entity_type === 'supplier'
          ? suppliers.find(s => s.id === newMovement.entity_id)?.name || 'مورد'
          : clients.find(c => c.id === newMovement.entity_id)?.name || 'عميل';
        const userName = displayName || 'مستخدم';

        if (newMovement.product_id && newMovement.quantity !== undefined) {
          const productName = products.find(p => p.id === newMovement.product_id)?.name || 'منتج';
          
          // ✅ استخدم الكمية والوحدة المدخلة من المستخدم (display)
          const displayQty = newMovement.display_quantity ?? newMovement.quantity;
          const displayUnitId = newMovement.display_unit_id ?? newMovement.unit_id;
          
          // ✅ احصل على اسم الوحدة المعروضة
          let displayUnitName = 'قطعة';
          if (displayUnitId) {
            const foundUnit = units.find(u => u.id === displayUnitId);
            displayUnitName = foundUnit?.name || 'قطعة';
          } else if (newMovement.unit) {
            displayUnitName = newMovement.unit;
          }

          const notif = getMovementNotification(newMovement.type, {
            productName,
            quantity: displayQty,
            unit: displayUnitName,
            warehouseName,
            userName,
            entityName,
          });

          await supabase.from('notifications').insert({
            type: newMovement.type === 'in' ? 'movement_in' : 'movement_out',
            title: notif.title,
            message: notif.message,
            data: { movement_id: newMovement.id },
            created_by: user.id,
          });

          // إشعار المخزون المنخفض
          const updatedProduct = products.find(p => p.id === newMovement.product_id);
          if (updatedProduct) {
            const newQty = newMovement.type === 'out'
              ? updatedProduct.quantity - newMovement.quantity
              : updatedProduct.quantity + newMovement.quantity;
            const minQty = updatedProduct.min_quantity ?? 2;
            if (newQty <= minQty) {
              const lowNotif = getLowStockNotification({
                productName,
                quantity: newQty,
                warehouseName,
              });
              await supabase.from('notifications').insert({
                type: newQty <= 0 ? 'out_of_stock' : 'low_stock',
                title: lowNotif.title,
                message: lowNotif.message,
                data: { product_id: newMovement.product_id },
                created_by: user.id,
              });
            }
          }
        } else if (newMovement.items && newMovement.items.length > 0) {
          const notif = getMultiMovementNotification(
            newMovement.type,
            newMovement.items.length,
            warehouseName,
            entityName,
            userName
          );
          await supabase.from('notifications').insert({
            type: newMovement.type === 'in' ? 'movement_in' : 'movement_out',
            title: notif.title,
            message: notif.message,
            data: { movement_id: newMovement.id },
            created_by: user.id,
          });
        }
      } catch (e) {
        console.error('Error creating notification:', e);
        // لا نعرض خطأ للمستخدم
      }
    }
  }, [user, updateProductQuantities, warehouses, suppliers, clients, products, displayName, units]);

  const updateMovement = useCallback(async (m: StockMovement) => {
    const old = movements.find(x => x.id === m.id);
    if (!old) return;

    await updateProductQuantities(old, true);

    const updateData: any = {
      warehouse_id: m.warehouse_id,
      type: m.type,
      entity_id: m.entity_id,
      entity_type: m.entity_type,
      date: m.date,
      notes: m.notes,
      display_quantity: m.display_quantity ?? null,
      display_unit: m.display_unit_id ?? null,
    };
    if (m.product_id && m.quantity !== undefined) {
      updateData.product_id = m.product_id;
      updateData.quantity = m.quantity;
      updateData.unit = m.unit || 'قطعة';
      updateData.unit_id = m.unit_id;
      updateData.items = null;
    } else if (m.items) {
      const itemsToStore = m.items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit: item.unit || 'قطعة',
        notes: item.notes,
        unit_id: item.unit_id,
        display_quantity: item.display_quantity,
        display_unit_id: item.display_unit_id,
      }));
      updateData.items = JSON.stringify(itemsToStore);
      updateData.product_id = null;
      updateData.quantity = null;
      updateData.unit = null;
      updateData.unit_id = null;
    }

    const { data, error } = await supabase
      .from('stock_movements')
      .update(updateData)
      .eq('id', m.id)
      .select()
      .single();

    if (error) {
      showError(error.message);
      await updateProductQuantities(old, false);
      return;
    }

    if (data) {
      const d = data as any;
      const updatedMovement: StockMovement = {
        ...d,
        type: d.type as MovementType,
        entity_type: d.entity_type as 'supplier' | 'client',
        items: d.items ? (typeof d.items === 'string' ? JSON.parse(d.items) : d.items) : undefined,
        display_quantity: d.display_quantity,
        display_unit_id: d.display_unit,
      };
      setMovements(prev => prev.map(mov => mov.id === m.id ? updatedMovement : mov));
      await updateProductQuantities(updatedMovement, false);
    }
  }, [movements, updateProductQuantities]);

  const deleteMovement = useCallback(async (id: string) => {
    const old = movements.find(x => x.id === id);
    if (!old) return;

    await updateProductQuantities(old, true);

    const { error } = await supabase
      .from('stock_movements')
      .delete()
      .eq('id', id);

    if (error) {
      showError(error.message);
      await updateProductQuantities(old, false);
      return;
    }

    setMovements(prev => prev.filter(m => m.id !== id));
  }, [movements, updateProductQuantities]);

  // ========== الدوال المساعدة ==========
  const getCategoryName = useCallback((id: string) => categories.find(c => c.id === id)?.name || '-', [categories]);
  const getWarehouseName = useCallback((id: string) => warehouses.find(w => w.id === id)?.name || '-', [warehouses]);
  const getSupplierName = useCallback((id: string) => suppliers.find(s => s.id === id)?.name || '-', [suppliers]);
  const getClientName = useCallback((id: string) => clients.find(c => c.id === id)?.name || '-', [clients]);
  const getProductName = useCallback((id: string) => products.find(p => p.id === id)?.name || '-', [products]);
  const getUserName = useCallback((id: string | null) => {
    if (!id) return '-';
    return profiles[id] || '-';
  }, [profiles]);

  const getUnitName = useCallback((id: string) => {
    const unit = units.find(u => u.id === id);
    return unit?.name || '-';
  }, [units]);

  const convertQuantity = useCallback((quantity: number, fromUnitId: string, toUnitId: string): number => {
    if (fromUnitId === toUnitId) return quantity;
    const direct = unitConversions.find(uc => uc.from_unit_id === fromUnitId && uc.to_unit_id === toUnitId);
    if (direct) return quantity * direct.factor;
    const reverse = unitConversions.find(uc => uc.from_unit_id === toUnitId && uc.to_unit_id === fromUnitId);
    if (reverse) return quantity / reverse.factor;
    console.warn(`No conversion found from ${fromUnitId} to ${toUnitId}`);
    return quantity;
  }, [unitConversions]);

  const isLinkedToMovement = useCallback((type: 'product' | 'category' | 'warehouse' | 'supplier' | 'client', id: string): boolean => {
    switch (type) {
      case 'product':
        return movements.some(m => m.product_id === id || m.items?.some(i => i.product_id === id));
      case 'warehouse':
        return movements.some(m => m.warehouse_id === id);
      case 'supplier':
        return movements.some(m => m.entity_type === 'supplier' && m.entity_id === id);
      case 'client':
        return movements.some(m => m.entity_type === 'client' && m.entity_id === id);
      case 'category':
        return products.some(p => p.category_id === id && 
          (movements.some(m => m.product_id === p.id) || 
           movements.some(m => m.items?.some(i => i.product_id === p.id))));
      default:
        return false;
    }
  }, [movements, products]);

  const refreshAll = fetchAll;

  return (
    <WarehouseContext.Provider value={{
      products, categories, warehouses, suppliers, clients, movements, loading,
      units, unitConversions,
      addProduct, updateProduct, deleteProduct,
      addCategory, updateCategory, deleteCategory,
      addWarehouse, updateWarehouse, deleteWarehouse,
      addSupplier, updateSupplier, deleteSupplier,
      addClient, updateClient, deleteClient,
      addMovement, updateMovement, deleteMovement,
      getCategoryName, getWarehouseName, getSupplierName, getClientName, getProductName, getUserName,
      getUnitName, convertQuantity,
      isLinkedToMovement, refreshAll,
    }}>
      {children}
    </WarehouseContext.Provider>
  );
};

export const useWarehouse = () => {
  const ctx = useContext(WarehouseContext);
  if (!ctx) throw new Error('useWarehouse must be used within WarehouseProvider');
  return ctx;
};
