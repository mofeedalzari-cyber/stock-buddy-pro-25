// ============================================================================
// ملف: context/WarehouseContext.tsx (محدث - دعم العمل بدون إنترنت مع المزامنة)
// ============================================================================

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import {
  getMovementNotification,
  getMultiMovementNotification,
  getLowStockNotification,
} from '@/utils/notificationTemplates';
import {
  addToQueue,
  getQueue,
  removeFromQueue,
  clearQueue,
  generateTempId,
  isTempId,
  getQueueCount,
  type OfflineOperation,
} from '@/services/offlineQueue';

// ========== تعريف الأنواع ==========
export type MovementType = 'in' | 'out';

export interface MovementItem {
  product_id: string;
  quantity: number | null;
  unit?: string;
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
  created_by?: string | null;
  product_id?: string | null;
  quantity?: number | null;
  unit?: string | null;
  items?: MovementItem[] | null;
  unit_id?: string | null;
  display_quantity?: number | null;
  display_unit_id?: string | null;
  _offline?: boolean; // علامة محلية
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
  created_by?: string | null;
  _offline?: boolean;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  created_by?: string | null;
  _offline?: boolean;
}

export interface Warehouse {
  id: string;
  name: string;
  type?: string;
  location?: string;
  manager?: string;
  notes?: string;
  created_at: string;
  created_by?: string | null;
  _offline?: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  created_at: string;
  created_by?: string | null;
  _offline?: boolean;
}

export interface Client {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  created_at: string;
  created_by?: string | null;
  _offline?: boolean;
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
  pendingCount: number;
  syncing: boolean;
  syncOfflineData: () => Promise<void>;
  addProduct: (p: Omit<Product, 'id' | 'created_at' | 'created_by'>) => Promise<Product | null>;
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
  const [pendingCount, setPendingCount] = useState(getQueueCount());
  const [syncing, setSyncing] = useState(false);
  const { user, displayName } = useAuth();
  const { toast } = useToast();
  const isOnline = useOnlineStatus();
  const syncingRef = useRef(false);

  // تحديث عدد العمليات المعلقة
  const updatePendingCount = useCallback(() => {
    setPendingCount(getQueueCount());
  }, []);

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
        (supabase as any).from('units').select('*').then((r: any) => { if (r.data) setUnits(r.data as unknown as Unit[]); });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unit_conversions' }, () => {
        (supabase as any).from('unit_conversions').select('*').then((r: any) => { if (r.data) setUnitConversions(r.data as unknown as UnitConversion[]); });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const showError = (msg: string) => toast({ title: 'خطأ', description: msg, variant: 'destructive' });

  // ========== مزامنة البيانات غير المتصلة ==========
  const syncOfflineData = useCallback(async () => {
    if (syncingRef.current || !user?.id) return;
    const queue = getQueue();
    if (queue.length === 0) return;

    syncingRef.current = true;
    setSyncing(true);

    let successCount = 0;
    const tempIdMap: Record<string, string> = {}; // خريطة IDs المؤقتة -> الحقيقية

    for (const op of queue) {
      try {
        let success = false;

        switch (op.type) {
          case 'addProduct': {
            const { _offline, ...productData } = op.data;
            const tempId = productData.id;
            delete productData.id;
            const { data, error } = await supabase
              .from('products')
              .insert({ ...productData, created_by: user.id })
              .select()
              .single();
            if (!error && data) {
              tempIdMap[tempId] = data.id;
              setProducts(prev => prev.map(p => p.id === tempId ? { ...data, _offline: undefined } as unknown as Product : p));
              success = true;
            }
            break;
          }
          case 'addCategory': {
            const { _offline, ...catData } = op.data;
            const tempId = catData.id;
            delete catData.id;
            const { data, error } = await supabase
              .from('categories')
              .insert({ ...catData, created_by: user.id })
              .select()
              .single();
            if (!error && data) {
              tempIdMap[tempId] = data.id;
              setCategories(prev => prev.map(c => c.id === tempId ? { ...data, _offline: undefined } as Category : c));
              success = true;
            }
            break;
          }
          case 'addWarehouse': {
            const { _offline, ...whData } = op.data;
            const tempId = whData.id;
            delete whData.id;
            const { data, error } = await supabase
              .from('warehouses')
              .insert({ ...whData, created_by: user.id })
              .select()
              .single();
            if (!error && data) {
              tempIdMap[tempId] = data.id;
              setWarehouses(prev => prev.map(w => w.id === tempId ? { ...data, _offline: undefined } as Warehouse : w));
              success = true;
            }
            break;
          }
          case 'addSupplier': {
            const { _offline, ...supData } = op.data;
            const tempId = supData.id;
            delete supData.id;
            const { data, error } = await supabase
              .from('suppliers')
              .insert({ ...supData, created_by: user.id })
              .select()
              .single();
            if (!error && data) {
              tempIdMap[tempId] = data.id;
              setSuppliers(prev => prev.map(s => s.id === tempId ? { ...data, _offline: undefined } as Supplier : s));
              success = true;
            }
            break;
          }
          case 'addClient': {
            const { _offline, ...clData } = op.data;
            const tempId = clData.id;
            delete clData.id;
            const { data, error } = await supabase
              .from('clients')
              .insert({ ...clData, created_by: user.id })
              .select()
              .single();
            if (!error && data) {
              tempIdMap[tempId] = data.id;
              setClients(prev => prev.map(c => c.id === tempId ? { ...data, _offline: undefined } as Client : c));
              success = true;
            }
            break;
          }
          case 'addMovement': {
            const movData = { ...op.data };
            delete movData._offline;
            const tempId = movData.id;
            delete movData.id;
            delete movData.created_at;
            
            // استبدال IDs المؤقتة بالحقيقية
            if (movData.warehouse_id && tempIdMap[movData.warehouse_id]) {
              movData.warehouse_id = tempIdMap[movData.warehouse_id];
            }
            if (movData.entity_id && tempIdMap[movData.entity_id]) {
              movData.entity_id = tempIdMap[movData.entity_id];
            }
            if (movData.product_id && tempIdMap[movData.product_id]) {
              movData.product_id = tempIdMap[movData.product_id];
            }

            const insertData: any = {
              warehouse_id: movData.warehouse_id,
              type: movData.type,
              entity_id: movData.entity_id,
              entity_type: movData.entity_type,
              date: movData.date,
              notes: movData.notes,
              created_by: user.id,
              display_quantity: movData.display_quantity ?? null,
              display_unit: movData.display_unit_id ?? null,
            };

            if (movData.product_id && movData.quantity !== undefined) {
              insertData.product_id = movData.product_id;
              insertData.quantity = movData.quantity;
              insertData.unit = movData.unit || 'قطعة';
              insertData.unit_id = movData.unit_id;
              insertData.items = null;
            } else if (movData.items && movData.items.length > 0) {
              const itemsToStore = movData.items.map((item: any) => {
                const pid = tempIdMap[item.product_id] || item.product_id;
                return {
                  product_id: pid,
                  quantity: item.quantity,
                  unit: item.unit || 'قطعة',
                  notes: item.notes,
                  unit_id: item.unit_id,
                  display_quantity: item.display_quantity,
                  display_unit_id: item.display_unit_id,
                };
              });
              insertData.items = JSON.stringify(itemsToStore);
              insertData.product_id = null;
              insertData.quantity = null;
              insertData.unit = null;
              insertData.unit_id = null;
            }

            const { data, error } = await supabase
              .from('stock_movements')
              .insert(insertData)
              .select()
              .single();

            if (!error && data) {
              tempIdMap[tempId] = data.id;
              setMovements(prev => prev.map(m => m.id === tempId ? { ...data as any, _offline: undefined } as StockMovement : m));
              success = true;
            }
            break;
          }
          default:
            success = true;
            break;
        }

        if (success) {
          removeFromQueue(op.id);
          successCount++;
        }
      } catch (e) {
        console.error('خطأ في مزامنة العملية:', op.type, e);
      }
    }

    syncingRef.current = false;
    setSyncing(false);
    updatePendingCount();

    if (successCount > 0) {
      toast({
        title: 'تمت المزامنة',
        description: `تم ترحيل ${successCount} عملية بنجاح`,
      });
      // إعادة تحميل البيانات من السيرفر
      await fetchAll();
    }
  }, [user, toast, fetchAll, updatePendingCount]);

  // حفظ مرجع دالة المزامنة لتجنب إعادة تشغيل التأثير
  const syncFnRef = useRef(syncOfflineData);
  syncFnRef.current = syncOfflineData;

  // مزامنة تلقائية عند عودة الاتصال (مرة واحدة فقط)
  const hasSyncedRef = useRef(false);
  useEffect(() => {
    if (isOnline && user && !hasSyncedRef.current) {
      hasSyncedRef.current = true;
      const timer = setTimeout(() => {
        syncFnRef.current().finally(() => {
          // السماح بإعادة المزامنة إذا انقطع الاتصال مرة أخرى
          setTimeout(() => { hasSyncedRef.current = false; }, 5000);
        });
      }, 2000);
      return () => { clearTimeout(timer); hasSyncedRef.current = false; };
    }
    if (!isOnline) {
      hasSyncedRef.current = false;
    }
  }, [isOnline, user]);

  // ========== دوال المنتجات ==========
  const addProduct = useCallback(async (p: Omit<Product, 'id' | 'created_at' | 'created_by'>): Promise<Product | null> => {
    if (!user?.id) {
      showError('يجب تسجيل الدخول أولاً');
      return null;
    }

    if (!navigator.onLine) {
      const tempId = generateTempId();
      const offlineProduct: Product = {
        ...p,
        id: tempId,
        created_at: new Date().toISOString(),
        created_by: user.id,
        unit: p.unit || 'قطعة',
        min_quantity: p.min_quantity ?? 2,
        pack_size: p.pack_size ?? 1,
        _offline: true,
      };
      setProducts(prev => [...prev, offlineProduct]);
      addToQueue({ type: 'addProduct', data: offlineProduct });
      updatePendingCount();
      toast({ title: 'تم الحفظ محلياً', description: 'سيتم ترحيل البيانات عند عودة الإنترنت' });
      return offlineProduct;
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
      return null;
    }
    if (data) {
      const product = data as unknown as Product;
      setProducts(prev => [...prev, product]);
      return product;
    }
    return null;
  }, [user, updatePendingCount]);

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

    if (!navigator.onLine) {
      const tempId = generateTempId();
      const offlineCat: Category = {
        ...c,
        id: tempId,
        created_at: new Date().toISOString(),
        created_by: user.id,
        _offline: true,
      };
      setCategories(prev => [...prev, offlineCat]);
      addToQueue({ type: 'addCategory', data: offlineCat });
      updatePendingCount();
      toast({ title: 'تم الحفظ محلياً', description: 'سيتم ترحيل البيانات عند عودة الإنترنت' });
      return;
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({ ...c, created_by: user.id })
      .select()
      .single();
    if (error) showError(error.message);
    else if (data) setCategories(prev => [...prev, data as Category]);
  }, [user, updatePendingCount]);

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

    if (!navigator.onLine) {
      const tempId = generateTempId();
      const offlineWh: Warehouse = {
        ...w,
        id: tempId,
        created_at: new Date().toISOString(),
        created_by: user.id,
        _offline: true,
      };
      setWarehouses(prev => [...prev, offlineWh]);
      addToQueue({ type: 'addWarehouse', data: offlineWh });
      updatePendingCount();
      toast({ title: 'تم الحفظ محلياً', description: 'سيتم ترحيل البيانات عند عودة الإنترنت' });
      return;
    }

    const { data, error } = await supabase
      .from('warehouses')
      .insert({ ...w, created_by: user.id })
      .select()
      .single();
    if (error) showError(error.message);
    else if (data) setWarehouses(prev => [...prev, data as Warehouse]);
  }, [user, updatePendingCount]);

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

    if (!navigator.onLine) {
      const tempId = generateTempId();
      const offlineSup: Supplier = {
        ...s,
        id: tempId,
        created_at: new Date().toISOString(),
        created_by: user.id,
        _offline: true,
      };
      setSuppliers(prev => [...prev, offlineSup]);
      addToQueue({ type: 'addSupplier', data: offlineSup });
      updatePendingCount();
      toast({ title: 'تم الحفظ محلياً', description: 'سيتم ترحيل البيانات عند عودة الإنترنت' });
      return;
    }

    const { data, error } = await supabase
      .from('suppliers')
      .insert({ ...s, created_by: user.id })
      .select()
      .single();
    if (error) showError(error.message);
    else if (data) setSuppliers(prev => [...prev, data as Supplier]);
  }, [user, updatePendingCount]);

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

    if (!navigator.onLine) {
      const tempId = generateTempId();
      const offlineClient: Client = {
        ...c,
        id: tempId,
        created_at: new Date().toISOString(),
        created_by: user.id,
        _offline: true,
      };
      setClients(prev => [...prev, offlineClient]);
      addToQueue({ type: 'addClient', data: offlineClient });
      updatePendingCount();
      toast({ title: 'تم الحفظ محلياً', description: 'سيتم ترحيل البيانات عند عودة الإنترنت' });
      return;
    }

    const { data, error } = await supabase
      .from('clients')
      .insert({ ...c, created_by: user.id })
      .select()
      .single();
    if (error) showError(error.message);
    else if (data) setClients(prev => [...prev, data as Client]);
  }, [user, updatePendingCount]);

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

        if (!navigator.onLine) {
          setProducts(prev => prev.map(p => p.id === movement.product_id ? { ...p, quantity: newQty } : p));
          return;
        }

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

          if (!navigator.onLine) {
            setProducts(prev => prev.map(p => p.id === item.product_id ? { ...p, quantity: newQty } : p));
            continue;
          }

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

    if (!navigator.onLine) {
      const tempId = generateTempId();
      const offlineMovement: StockMovement = {
        ...m,
        id: tempId,
        created_at: new Date().toISOString(),
        created_by: user.id,
        _offline: true,
      };
      setMovements(prev => [...prev, offlineMovement]);
      await updateProductQuantities(offlineMovement, false);
      addToQueue({ type: 'addMovement', data: offlineMovement });
      updatePendingCount();
      toast({ title: 'تم الحفظ محلياً', description: 'سيتم ترحيل الحركة عند عودة الإنترنت' });
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
          
          const displayQty = newMovement.display_quantity ?? newMovement.quantity;
          const displayUnitId = newMovement.display_unit_id ?? newMovement.unit_id;
          
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
      pendingCount, syncing, syncOfflineData,
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
