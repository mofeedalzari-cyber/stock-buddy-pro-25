// ============================================================================
// ملف: context/WarehouseContext.tsx (محدث - دعم المؤسسات)
// ============================================================================
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Product, Category, Warehouse, Supplier, Client, StockMovement, MovementItem, MovementType } from '@/types/warehouse';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  getMovementNotification,
  getMultiMovementNotification,
  getLowStockNotification,
} from '@/utils/notificationTemplates';

interface WarehouseContextType {
  products: Product[];
  categories: Category[];
  warehouses: Warehouse[];
  suppliers: Supplier[];
  clients: Client[];
  movements: StockMovement[];
  loading: boolean;
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
  const [loading, setLoading] = useState(true);
  const { user, displayName } = useAuth();
  const { toast } = useToast();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [catRes, whRes, supRes, clRes, prodRes, movRes, profRes] = await Promise.all([
      supabase.from('categories' as any).select('*'),
      supabase.from('warehouses' as any).select('*'),
      supabase.from('suppliers' as any).select('*'),
      supabase.from('clients' as any).select('*'),
      supabase.from('products' as any).select('*'),
      supabase.from('stock_movements' as any).select('*'),
      supabase.from('profiles' as any).select('user_id, display_name'),
    ]);
    if (catRes.data) setCategories(catRes.data as any);
    if (whRes.data) setWarehouses(whRes.data as any);
    if (supRes.data) setSuppliers(supRes.data as any);
    if (clRes.data) setClients(clRes.data as any);
    if (prodRes.data) setProducts(prodRes.data as any);
    if (movRes.data) {
      const movementsData = (movRes.data as any[]).map((mov: any) => ({
        ...mov,
        items: mov.items ? (typeof mov.items === 'string' ? JSON.parse(mov.items) : mov.items) : undefined
      }));
      setMovements(movementsData);
    }
    if (profRes.data) {
      const map: Record<string, string> = {};
      (profRes.data as any[]).forEach((p: any) => { map[p.user_id] = p.display_name; });
      setProfiles(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) fetchAll();
  }, [user, fetchAll]);

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('warehouse-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => { supabase.from('categories' as any).select('*').then(r => { if (r.data) setCategories(r.data as any); }); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'warehouses' }, () => { supabase.from('warehouses' as any).select('*').then(r => { if (r.data) setWarehouses(r.data as any); }); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, () => { supabase.from('suppliers' as any).select('*').then(r => { if (r.data) setSuppliers(r.data as any); }); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => { supabase.from('clients' as any).select('*').then(r => { if (r.data) setClients(r.data as any); }); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => { supabase.from('products' as any).select('*').then(r => { if (r.data) setProducts(r.data as any); }); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_movements' }, () => { 
        supabase.from('stock_movements' as any).select('*').then(r => { 
          if (r.data) {
            const movementsData = (r.data as any[]).map((mov: any) => ({
              ...mov,
              items: mov.items ? (typeof mov.items === 'string' ? JSON.parse(mov.items) : mov.items) : undefined
            }));
            setMovements(movementsData);
          }
        }); 
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const showError = (msg: string) => toast({ title: 'خطأ', description: msg, variant: 'destructive' });

  // ---- Products ----
  const addProduct = useCallback(async (p: Omit<Product, 'id' | 'created_at' | 'created_by'>) => {
    if (!user?.id) {
      showError('يجب تسجيل الدخول أولاً');
      return;
    }
    const { data, error } = await supabase
      .from('products' as any)
      .insert({ ...p, created_by: user.id } as any)
      .select()
      .single();

    if (error) {
      showError(error.message);
      return;
    }
    if (data) {
      setProducts(prev => [...prev, data as any]);
    }
  }, [user]);

  const updateProduct = useCallback(async (p: Product) => {
    const { error } = await supabase
      .from('products' as any)
      .update({
        name: p.name, code: p.code, barcode: p.barcode, category_id: p.category_id,
        quantity: p.quantity, warehouse_id: p.warehouse_id, description: p.description, image: p.image
      } as any)
      .eq('id', p.id);
    if (error) showError(error.message);
    else {
      setProducts(prev => prev.map(prod => prod.id === p.id ? p : prod));
    }
  }, []);

  const deleteProduct = useCallback(async (id: string): Promise<boolean> => {
    if (movements.some(m => m.product_id === id || m.items?.some(i => i.product_id === id))) return false;
    const { error } = await supabase.from('products' as any).delete().eq('id', id);
    if (error) { showError(error.message); return false; }
    setProducts(prev => prev.filter(p => p.id !== id));
    return true;
  }, [movements]);

  // ---- Categories ----
  const addCategory = useCallback(async (c: Omit<Category, 'id' | 'created_at' | 'created_by'>) => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('categories' as any)
      .insert({ ...c, created_by: user.id } as any)
      .select()
      .single();
    if (error) showError(error.message);
    else if (data) setCategories(prev => [...prev, data as any]);
  }, [user]);

  const updateCategory = useCallback(async (c: Category) => {
    const { error } = await supabase
      .from('categories' as any)
      .update({ name: c.name, description: c.description } as any)
      .eq('id', c.id);
    if (error) showError(error.message);
    else setCategories(prev => prev.map(cat => cat.id === c.id ? c : cat));
  }, []);

  const deleteCategory = useCallback(async (id: string): Promise<boolean> => {
    if (products.some(p => p.category_id === id)) return false;
    const { error } = await supabase.from('categories' as any).delete().eq('id', id);
    if (error) { showError(error.message); return false; }
    setCategories(prev => prev.filter(c => c.id !== id));
    return true;
  }, [products]);

  // ---- Warehouses ----
  const addWarehouse = useCallback(async (w: Omit<Warehouse, 'id' | 'created_at' | 'created_by'>) => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('warehouses' as any)
      .insert({ ...w, created_by: user.id } as any)
      .select()
      .single();
    if (error) showError(error.message);
    else if (data) setWarehouses(prev => [...prev, data as any]);
  }, [user]);

  const updateWarehouse = useCallback(async (w: Warehouse) => {
    const { error } = await supabase
      .from('warehouses' as any)
      .update({ name: w.name, type: w.type, location: w.location, manager: w.manager, notes: w.notes } as any)
      .eq('id', w.id);
    if (error) showError(error.message);
    else setWarehouses(prev => prev.map(wh => wh.id === w.id ? w : wh));
  }, []);

  const deleteWarehouse = useCallback(async (id: string): Promise<boolean> => {
    if (movements.some(m => m.warehouse_id === id) || products.some(p => p.warehouse_id === id)) return false;
    const { error } = await supabase.from('warehouses' as any).delete().eq('id', id);
    if (error) { showError(error.message); return false; }
    setWarehouses(prev => prev.filter(w => w.id !== id));
    return true;
  }, [movements, products]);

  // ---- Suppliers ----
  const addSupplier = useCallback(async (s: Omit<Supplier, 'id' | 'created_at' | 'created_by'>) => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('suppliers' as any)
      .insert({ ...s, created_by: user.id } as any)
      .select()
      .single();
    if (error) showError(error.message);
    else if (data) setSuppliers(prev => [...prev, data as any]);
  }, [user]);

  const updateSupplier = useCallback(async (s: Supplier) => {
    const { error } = await supabase
      .from('suppliers' as any)
      .update({ name: s.name, phone: s.phone, email: s.email, address: s.address, notes: s.notes } as any)
      .eq('id', s.id);
    if (error) showError(error.message);
    else setSuppliers(prev => prev.map(sup => sup.id === s.id ? s : sup));
  }, []);

  const deleteSupplier = useCallback(async (id: string): Promise<boolean> => {
    if (movements.some(m => m.entity_type === 'supplier' && m.entity_id === id)) return false;
    const { error } = await supabase.from('suppliers' as any).delete().eq('id', id);
    if (error) { showError(error.message); return false; }
    setSuppliers(prev => prev.filter(s => s.id !== id));
    return true;
  }, [movements]);

  // ---- Clients ----
  const addClient = useCallback(async (c: Omit<Client, 'id' | 'created_at' | 'created_by'>) => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('clients' as any)
      .insert({ ...c, created_by: user.id } as any)
      .select()
      .single();
    if (error) showError(error.message);
    else if (data) setClients(prev => [...prev, data as any]);
  }, [user]);

  const updateClient = useCallback(async (c: Client) => {
    const { error } = await supabase
      .from('clients' as any)
      .update({ name: c.name, phone: c.phone, address: c.address, notes: c.notes } as any)
      .eq('id', c.id);
    if (error) showError(error.message);
    else setClients(prev => prev.map(cl => cl.id === c.id ? c : cl));
  }, []);

  const deleteClient = useCallback(async (id: string): Promise<boolean> => {
    if (movements.some(m => m.entity_type === 'client' && m.entity_id === id)) return false;
    const { error } = await supabase.from('clients' as any).delete().eq('id', id);
    if (error) { showError(error.message); return false; }
    setClients(prev => prev.filter(c => c.id !== id));
    return true;
  }, [movements]);

  // ---- Movements ----

  const updateProductQuantities = useCallback(async (movement: StockMovement, reverse: boolean = false) => {
    if (movement.product_id && movement.quantity !== undefined) {
      const product = products.find(p => p.id === movement.product_id);
      if (product) {
        const change = movement.type === 'in' ? movement.quantity : -movement.quantity;
        const newQty = reverse ? product.quantity - change : product.quantity + change;
        const { error } = await supabase
          .from('products' as any)
          .update({ quantity: newQty } as any)
          .eq('id', movement.product_id);
        if (error) showError(error.message);
        else {
          setProducts(prev => prev.map(p => p.id === movement.product_id ? { ...p, quantity: newQty } : p));
        }
      }
    } else if (movement.items && movement.items.length > 0) {
      for (const item of movement.items) {
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          const change = movement.type === 'in' ? item.quantity : -item.quantity;
          const newQty = reverse ? product.quantity - change : product.quantity + change;
          const { error } = await supabase
            .from('products' as any)
            .update({ quantity: newQty } as any)
            .eq('id', item.product_id);
          if (error) showError(error.message);
          else {
            setProducts(prev => prev.map(p => p.id === item.product_id ? { ...p, quantity: newQty } : p));
          }
        }
      }
    }
  }, [products]);

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
    };

    if (m.product_id && m.quantity !== undefined) {
      insertData.product_id = m.product_id;
      insertData.quantity = m.quantity;
      insertData.unit = m.unit || 'قطعة';
      insertData.items = null;
    } else if (m.items && m.items.length > 0) {
      insertData.items = JSON.stringify(m.items);
      insertData.product_id = null;
      insertData.quantity = null;
      insertData.unit = null;
    } else {
      showError('بيانات الحركة غير مكتملة');
      return;
    }

    const { data, error } = await supabase
      .from('stock_movements' as any)
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
        items: d.items ? (typeof d.items === 'string' ? JSON.parse(d.items) : d.items) : undefined
      };
      setMovements(prev => [...prev, newMovement]);
      await updateProductQuantities(newMovement, false);

      // === إنشاء إشعار الحركة ===
      const warehouseName = warehouses.find(w => w.id === newMovement.warehouse_id)?.name || 'مخزن';
      const entityName = newMovement.entity_type === 'supplier'
        ? suppliers.find(s => s.id === newMovement.entity_id)?.name || 'مورد'
        : clients.find(c => c.id === newMovement.entity_id)?.name || 'عميل';
      const userName = displayName || 'مستخدم';

      try {
        if (newMovement.product_id && newMovement.quantity !== undefined) {
          const productName = products.find(p => p.id === newMovement.product_id)?.name || 'منتج';
          const notif = getMovementNotification(newMovement.type, {
            productName,
            quantity: newMovement.quantity,
            unit: newMovement.unit || 'قطعة',
            warehouseName,
            userName,
            entityName,
          });
          await supabase.from('notifications' as any).insert({
            type: newMovement.type === 'in' ? 'movement_in' : 'movement_out',
            title: notif.title,
            message: notif.message,
            data: { movement_id: newMovement.id },
            created_by: user.id,
          } as any);

          // تحقق من المخزون المنخفض
          const updatedProduct = products.find(p => p.id === newMovement.product_id);
          if (updatedProduct) {
            const newQty = newMovement.type === 'out'
              ? updatedProduct.quantity - newMovement.quantity
              : updatedProduct.quantity + newMovement.quantity;
            if (newQty <= 10) {
              const lowNotif = getLowStockNotification({
                productName,
                quantity: newQty,
                warehouseName,
              });
              await supabase.from('notifications' as any).insert({
                type: newQty <= 0 ? 'out_of_stock' : 'low_stock',
                title: lowNotif.title,
                message: lowNotif.message,
                data: { product_id: newMovement.product_id },
                created_by: user.id,
              } as any);
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
          await supabase.from('notifications' as any).insert({
            type: newMovement.type === 'in' ? 'movement_in' : 'movement_out',
            title: notif.title,
            message: notif.message,
            data: { movement_id: newMovement.id },
            created_by: user.id,
          } as any);
        }
      } catch (e) {
        console.error('Error creating notification:', e);
      }
    }
  }, [user, updateProductQuantities, warehouses, suppliers, clients, products, displayName]);

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
    };
    if (m.product_id && m.quantity !== undefined) {
      updateData.product_id = m.product_id;
      updateData.quantity = m.quantity;
      updateData.unit = m.unit || 'قطعة';
      updateData.items = null;
    } else if (m.items) {
      updateData.items = JSON.stringify(m.items);
      updateData.product_id = null;
      updateData.quantity = null;
      updateData.unit = null;
    }

    const { data, error } = await supabase
      .from('stock_movements' as any)
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
        items: d.items ? (typeof d.items === 'string' ? JSON.parse(d.items) : d.items) : undefined
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
      .from('stock_movements' as any)
      .delete()
      .eq('id', id);

    if (error) {
      showError(error.message);
      await updateProductQuantities(old, false);
      return;
    }

    setMovements(prev => prev.filter(m => m.id !== id));
  }, [movements, updateProductQuantities]);

  // ---- Helpers ----
  const getCategoryName = useCallback((id: string) => categories.find(c => c.id === id)?.name || '-', [categories]);
  const getWarehouseName = useCallback((id: string) => warehouses.find(w => w.id === id)?.name || '-', [warehouses]);
  const getSupplierName = useCallback((id: string) => suppliers.find(s => s.id === id)?.name || '-', [suppliers]);
  const getClientName = useCallback((id: string) => clients.find(c => c.id === id)?.name || '-', [clients]);
  const getProductName = useCallback((id: string) => products.find(p => p.id === id)?.name || '-', [products]);
  const getUserName = useCallback((id: string | null) => {
    if (!id) return '-';
    return profiles[id] || '-';
  }, [profiles]);

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
      addProduct, updateProduct, deleteProduct,
      addCategory, updateCategory, deleteCategory,
      addWarehouse, updateWarehouse, deleteWarehouse,
      addSupplier, updateSupplier, deleteSupplier,
      addClient, updateClient, deleteClient,
      addMovement, updateMovement, deleteMovement,
      getCategoryName, getWarehouseName, getSupplierName, getClientName, getProductName, getUserName,
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
