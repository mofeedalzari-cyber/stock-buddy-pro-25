import { useState } from 'react';
import { useWarehouse } from '@/contexts/WarehouseContext';
import { Plus, Pencil, Trash2, Search, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Product } from '@/types/warehouse';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const ProductsPage = () => {
  const { 
    products, categories, warehouses, movements, 
    addProduct, updateProduct, deleteProduct, 
    getCategoryName, getWarehouseName, refreshAll,
    units, getUnitName, addMovement, suppliers
  } = useWarehouse();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ 
    name: '', 
    code: '', 
    barcode: '', 
    category_id: '', 
    description: '',
    min_quantity: 2,
    unit: 'قطعة',
    base_unit_id: '',
    display_unit_id: '',
    pack_size: 1
  });
  // حقول الكمية الابتدائية والمخزن
  const [initialQuantity, setInitialQuantity] = useState(0);
  const [initialWarehouseId, setInitialWarehouseId] = useState('');
  
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ========== دوال حساب الكميات ==========
  const getWarehouseQty = (productId: string, warehouseId: string) => {
    let total = 0;
    movements.forEach(m => {
      if (m.warehouse_id !== warehouseId) return;
      if (m.product_id === productId) {
        total += m.type === 'in' ? m.quantity! : -m.quantity!;
      } else if (m.items) {
        const item = m.items.find(i => i.product_id === productId);
        if (item) {
          total += m.type === 'in' ? item.quantity! : -item.quantity!;
        }
      }
    });
    return total;
  };

  const getProductTotalQty = (productId: string) => {
    let total = 0;
    movements.forEach(m => {
      if (m.product_id === productId) {
        total += m.type === 'in' ? m.quantity! : -m.quantity!;
      } else if (m.items) {
        const item = m.items.find(i => i.product_id === productId);
        if (item) {
          total += m.type === 'in' ? item.quantity! : -item.quantity!;
        }
      }
    });
    return total;
  };

  const getProductWarehouses = (productId: string) => {
    const whIds = new Set<string>();
    movements.forEach(m => {
      if (m.product_id === productId) {
        whIds.add(m.warehouse_id);
      } else if (m.items && m.items.some(i => i.product_id === productId)) {
        whIds.add(m.warehouse_id);
      }
    });
    const whNames = Array.from(whIds).map(id => getWarehouseName(id));
    return whNames.join('، ') || '-';
  };

  const getDisplayQty = (product: Product) => {
    const totalBaseQty = selectedWarehouse 
      ? getWarehouseQty(product.id, selectedWarehouse) 
      : getProductTotalQty(product.id);
    
    if (product.display_unit_id && product.pack_size && product.pack_size > 1) {
      return totalBaseQty / product.pack_size;
    }
    return totalBaseQty;
  };

  const getFormattedQuantity = (product: Product): string => {
    const totalBaseQty = selectedWarehouse 
      ? getWarehouseQty(product.id, selectedWarehouse) 
      : getProductTotalQty(product.id);
    
    if (!product.display_unit_id || !product.pack_size || product.pack_size <= 1) {
      return `${totalBaseQty}`;
    }
    
    const wholeUnits = Math.floor(totalBaseQty / product.pack_size);
    const remainder = totalBaseQty % product.pack_size;
    
    const displayUnitName = getUnitName(product.display_unit_id);
    const baseUnitName = getUnitName(product.base_unit_id || '');
    
    if (wholeUnits === 0) {
      return `${remainder} ${baseUnitName}`;
    }
    if (remainder === 0) {
      return `${wholeUnits} ${displayUnitName}`;
    }
    return `${wholeUnits} ${displayUnitName} و ${remainder} ${baseUnitName}`;
  };

  const getQuantityStyle = (product: Product, qty: number) => {
    const threshold = product.min_quantity ?? 2;
    const displayThreshold = product.display_unit_id && product.pack_size && product.pack_size > 1
      ? threshold / product.pack_size
      : threshold;
    if (qty === 0) return 'bg-destructive/10 text-destructive';
    if (qty <= displayThreshold) return 'bg-warning/10 text-warning';
    return 'bg-success/10 text-success';
  };

  // ========== دوال التحقق ==========
  const checkDuplicateProductName = (name: string, excludeId?: string) => {
    const existingProduct = products.find(p => 
      p.name.trim().toLowerCase() === name.trim().toLowerCase() && 
      p.id !== excludeId
    );
    if (existingProduct) {
      toast({ 
        title: 'تنبيه', 
        description: `المنتج "${name}" مضاف مسبقاً. لا يمكن إضافة منتج بنفس الاسم.`, 
        variant: 'destructive' 
      });
      return true;
    }
    return false;
  };

  // ========== التصفية ==========
  const filtered = products
    .filter(p => p.name.includes(search) || p.code.includes(search) || p.barcode.includes(search))
    .filter(p => !selectedWarehouse || movements.some(m => m.product_id === p.id && m.warehouse_id === selectedWarehouse) || (movements.some(m => m.items?.some(i => i.product_id === p.id && m.warehouse_id === selectedWarehouse))));

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
    toast({ title: 'تم التحديث', description: 'تم تحديث البيانات بنجاح' });
  };

  const allSelected = filtered.length > 0 && filtered.every(p => selected.has(p.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map(p => p.id)));
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
    let deleted = 0, linked = 0;
    for (const id of ids) {
      const ok = await deleteProduct(id);
      if (ok) deleted++; else linked++;
    }
    if (linked > 0) {
      toast({ title: 'تنبيه', description: `تم حذف ${deleted} منتج، و ${linked} منتج مرتبط بحركات مخزون لم يتم حذفه`, variant: 'destructive' });
    } else {
      toast({ title: 'تم الحذف', description: `تم حذف ${deleted} منتج بنجاح` });
    }
    setSelected(new Set());
    setBulkDeleteDialog(false);
  };

  const generateCode = () => `P-${Date.now()}`;
  const generateBarcode = () => `${Math.floor(100000 + Math.random() * 900000)}`;

  const baseUnits = units.filter(u => u.is_base_unit === true);
  const displayUnits = units.filter(u => u.is_base_unit === false);

  const openAdd = () => {
    setEditing(null);
    const defaultBaseUnit = baseUnits.find(u => u.name === 'قطعة')?.id || '';
    const defaultDisplayUnit = displayUnits.find(u => u.name === 'قطعة')?.id || '';
    setForm({
      name: '',
      code: generateCode(),
      barcode: generateBarcode(),
      category_id: categories[0]?.id || '',
      description: '',
      min_quantity: 2,
      unit: 'قطعة',
      base_unit_id: defaultBaseUnit,
      display_unit_id: defaultDisplayUnit,
      pack_size: 1
    });
    setInitialQuantity(0);
    setInitialWarehouseId(warehouses[0]?.id || '');
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      code: p.code,
      barcode: p.barcode,
      category_id: p.category_id || '',
      description: p.description,
      min_quantity: p.min_quantity ?? 2,
      unit: p.unit || 'قطعة',
      base_unit_id: p.base_unit_id || '',
      display_unit_id: p.display_unit_id || '',
      pack_size: p.pack_size ?? 1
    });
    setInitialQuantity(0);
    setInitialWarehouseId('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'تنبيه', description: 'يرجى إدخال جميع البيانات المطلوبة', variant: 'destructive' });
      return;
    }
    
    if (editing) {
      if (checkDuplicateProductName(form.name, editing.id)) return;
    } else {
      if (checkDuplicateProductName(form.name)) return;
    }
    
    if (editing) {
      await updateProduct({
        ...editing,
        name: form.name,
        code: form.code,
        barcode: form.barcode,
        category_id: form.category_id || null,
        description: form.description,
        min_quantity: form.min_quantity,
        unit: form.unit,
        base_unit_id: form.base_unit_id,
        display_unit_id: form.display_unit_id,
        pack_size: form.pack_size
      });
      await refreshAll();
      toast({ title: 'تم التعديل', description: 'تم تعديل المنتج بنجاح' });
    } else {
      // إضافة المنتج أولاً
      await addProduct({
        name: form.name,
        code: form.code,
        barcode: form.barcode,
        category_id: form.category_id || null,
        quantity: 0,
        warehouse_id: null,
        description: form.description,
        min_quantity: form.min_quantity,
        unit: form.unit,
        base_unit_id: form.base_unit_id,
        display_unit_id: form.display_unit_id,
        pack_size: form.pack_size
      });
      
      // بعد إضافة المنتج، نبحث عن المنتج المضاف حديثاً (آخر منتج بنفس الاسم والكود)
      const addedProduct = products.find(p => p.name === form.name && p.code === form.code);
      
      if (initialQuantity > 0 && initialWarehouseId && addedProduct?.id) {
        // البحث عن مورد افتراضي للرصيد الافتتاحي
        const openingSupplier = suppliers.find(s => s.name === 'الرصيد الافتتاحي' || s.name === 'رصيد افتتاحي');
        if (!openingSupplier) {
          toast({ 
            title: 'تنبيه', 
            description: 'لم يتم إضافة الحركة: لا يوجد مورد باسم "الرصيد الافتتاحي". يرجى إنشاؤه أولاً.', 
            variant: 'destructive' 
          });
        } else {
          await addMovement({
            type: 'in',
            date: new Date().toISOString(),
            warehouse_id: initialWarehouseId,
            entity_id: openingSupplier.id,
            entity_type: 'supplier',
            product_id: addedProduct.id,
            quantity: initialQuantity,
            unit: form.unit,
            notes: 'رصيد افتتاحي',
            unit_id: form.base_unit_id || undefined,
            display_quantity: null,
            display_unit_id: null
          });
          toast({ title: 'تم', description: `تم إضافة ${initialQuantity} ${getUnitName(form.base_unit_id || form.unit)} إلى المخزن` });
        }
      }
      
      await refreshAll();
      toast({ title: 'تم الإضافة', description: 'تم إضافة المنتج بنجاح' });
    }
    setDialogOpen(false);
  };

  const confirmDelete = (p: Product) => {
    setDeletingProduct(p);
    setDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    const ok = await deleteProduct(deletingProduct.id);
    if (!ok) {
      toast({ title: 'لا يمكن الحذف', description: 'هذا المنتج مرتبط بحركات مخزون', variant: 'destructive' });
    } else {
      toast({ title: 'تم الحذف', description: 'تم حذف المنتج بنجاح' });
    }
    setDeleteDialog(false);
    setDeletingProduct(null);
  };

  const getPackInfo = () => {
    if (!form.display_unit_id || !form.base_unit_id) return '';
    const displayUnit = units.find(u => u.id === form.display_unit_id);
    const baseUnit = units.find(u => u.id === form.base_unit_id);
    if (displayUnit && baseUnit && form.pack_size && form.pack_size > 1) {
      return `1 ${displayUnit.name} = ${form.pack_size} ${baseUnit.name}`;
    }
    return '';
  };

  const MobileCard = ({ p }: { p: Product }) => {
    const qty = getDisplayQty(p);
    const qtyStyle = getQuantityStyle(p, qty);
    const displayUnitName = getUnitName(p.display_unit_id || '');
    const baseUnitName = getUnitName(p.base_unit_id || '');
    return (
      <div className="bg-card rounded-xl p-3 border border-border shadow-card space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2">
            {isAdmin && <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleOne(p.id)} className="mt-1" />}
            <div>
              <div className="font-medium text-sm text-foreground">{p.name}</div>
              <div className="text-[10px] text-muted-foreground font-mono">{p.code}</div>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => openEdit(p)} className="p-1.5 rounded-md hover:bg-primary/10 text-primary"><Pencil className="w-3.5 h-3.5" /></button>
            {isAdmin && <button onClick={() => confirmDelete(p)} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>الصنف: {getCategoryName(p.category_id || '')}</span>
          {!selectedWarehouse && <span>المخازن: {getProductWarehouses(p.id)}</span>}
          <span>الكمية: <span className={`font-bold ${qtyStyle}`}>{getFormattedQuantity(p)}</span></span>
          <span>الوحدة: {displayUnitName || p.unit || 'قطعة'}</span>
          <span>حد التنبيه: {p.min_quantity ?? 2}</span>
          {p.pack_size && p.pack_size > 1 && (
            <span className="text-[10px] text-muted-foreground">
              {p.pack_size} {baseUnitName} / {displayUnitName}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* شريط البحث والفلاتر */}
      <div className="flex flex-col gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث بالاسم أو الكود..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-foreground whitespace-nowrap">المخزن:</label>
          <select
            value={selectedWarehouse}
            onChange={e => setSelectedWarehouse(e.target.value)}
            className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">كل المخازن</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" className="text-sm" disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 ml-2 ${refreshing ? 'animate-spin' : ''}`} />تحديث
          </Button>
          <Button onClick={openAdd} className="gradient-primary border-0 flex-1 sm:flex-none text-sm">
            <Plus className="w-4 h-4 ml-2" />إضافة منتج
          </Button>
          {isAdmin && selected.size > 0 && (
            <Button variant="destructive" onClick={() => setBulkDeleteDialog(true)} className="text-sm">
              <Trash2 className="w-4 h-4 ml-2" />حذف المحدد ({selected.size})
            </Button>
          )}
        </div>
      </div>

      {/* عرض الجوال */}
      <div className="sm:hidden space-y-2">
        {isAdmin && filtered.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
            <span className="text-xs text-muted-foreground">تحديد الكل</span>
          </div>
        )}
        {filtered.map(p => <MobileCard key={p.id} p={p} />)}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">لا توجد منتجات</p>}
      </div>

      {/* جدول سطح المكتب */}
      <div className="hidden sm:block bg-card rounded-xl shadow-card border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                {isAdmin && <th className="p-3 w-10"><Checkbox checked={allSelected} onCheckedChange={toggleAll} /></th>}
                <th className="text-right p-3 font-semibold text-foreground">المنتج</th>
                <th className="text-right p-3 font-semibold text-foreground">الكود</th>
                <th className="text-right p-3 font-semibold text-foreground hidden md:table-cell">الصنف</th>
                <th className="text-right p-3 font-semibold text-foreground">الكمية</th>
                <th className="text-right p-3 font-semibold text-foreground">الوحدة</th>
                <th className="text-right p-3 font-semibold text-foreground">حجم العبوة</th>
                <th className="text-right p-3 font-semibold text-foreground">حد التنبيه</th>
                {!selectedWarehouse && <th className="text-right p-3 font-semibold text-foreground hidden lg:table-cell">المخازن</th>}
                <th className="text-center p-3 font-semibold text-foreground">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const qty = getDisplayQty(p);
                const qtyStyle = getQuantityStyle(p, qty);
                const displayUnitName = getUnitName(p.display_unit_id || '');
                const packInfo = p.pack_size && p.pack_size > 1 ? `${p.pack_size} ${getUnitName(p.base_unit_id || '')}` : '-';
                return (
                  <tr key={p.id} className={`border-b border-border last:border-0 hover:bg-secondary/30 transition-colors ${selected.has(p.id) ? 'bg-primary/5' : ''}`}>
                    {isAdmin && <td className="p-3"><Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleOne(p.id)} /></td>}
                    <td className="p-3 text-foreground font-medium">{p.name}</td>
                    <td className="p-3 text-muted-foreground font-mono text-xs">{p.code}</td>
                    <td className="p-3 text-muted-foreground hidden md:table-cell">{getCategoryName(p.category_id || '')}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${qtyStyle}`}>
                        {getFormattedQuantity(p)}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{displayUnitName || p.unit || 'قطعة'}</td>
                    <td className="p-3 text-muted-foreground text-xs">{packInfo}</td>
                    <td className="p-3 text-muted-foreground">{p.min_quantity ?? 2}</td>
                    {!selectedWarehouse && <td className="p-3 text-muted-foreground hidden lg:table-cell">{getProductWarehouses(p.id)}</td>}
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-md hover:bg-primary/10 text-primary transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        {isAdmin && <button onClick={() => confirmDelete(p)} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 10 : 9} className="p-8 text-center text-muted-foreground">
                    لا توجد منتجات
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">{editing ? 'تعديل المنتج' : 'إضافة منتج جديد'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:gap-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">اسم المنتج</Label>
              <Input placeholder="أدخل اسم المنتج" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">كود المنتج</Label>
                <Input value={form.code} disabled className="text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">الباركود</Label>
                <Input value={form.barcode} disabled className="text-xs" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">الصنف</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                <option value="">اختر الصنف</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* حقول الوحدات */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">الوحدة الأساسية</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.base_unit_id}
                  onChange={e => setForm({ ...form, base_unit_id: e.target.value })}
                >
                  <option value="">اختر الوحدة الأساسية</option>
                  {baseUnits.map(u => (
                    <option key={u.id} value={u.id}>{u.name} {u.abbreviation ? `(${u.abbreviation})` : ''}</option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground">الوحدة التي يحسب بها المخزون (قطعة، كيلو، لتر)</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">الوحدة المعروضة</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.display_unit_id}
                  onChange={e => setForm({ ...form, display_unit_id: e.target.value })}
                >
                  <option value="">اختر الوحدة المعروضة</option>
                  {displayUnits.map(u => (
                    <option key={u.id} value={u.id}>{u.name} {u.abbreviation ? `(${u.abbreviation})` : ''}</option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground">الوحدة التي يعرض بها المنتج (كرتون، كيس، درزن)</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">حجم العبوة</Label>
              <Input
                type="number"
                placeholder="مثال: 24"
                value={form.pack_size}
                onChange={e => setForm({ ...form, pack_size: parseInt(e.target.value, 10) || 1 })}
                min="1"
                className="text-sm"
              />
              <p className="text-[10px] text-muted-foreground">
                {getPackInfo() || 'عدد الوحدات الأساسية في العبوة الواحدة (مثال: 1 كرتون = 24 علبة)'}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">الحد الأدنى للتنبيه</Label>
              <Input
                type="number"
                placeholder="مثال: 5"
                value={form.min_quantity}
                onChange={e => setForm({ ...form, min_quantity: parseInt(e.target.value, 10) || 0 })}
                min="0"
                className="text-sm"
              />
              <p className="text-[10px] text-muted-foreground">عند وصول الكمية إلى هذا الرقم أو أقل، سيظهر تحذير في لوحة التحكم.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">الوصف</Label>
              <Input placeholder="أدخل وصف المنتج" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>

            {/* ✅ حقول الكمية الابتدائية - تظهر فقط عند الإضافة */}
            {!editing && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm">المخزن (للرصيد الافتتاحي)</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={initialWarehouseId}
                    onChange={e => setInitialWarehouseId(e.target.value)}
                  >
                    <option value="">اختر المخزن</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm">الكمية الابتدائية (بالوحدة الأساسية)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={initialQuantity}
                    onChange={e => setInitialQuantity(Number(e.target.value))}
                    placeholder="مثال: 100"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    الكمية الموجودة في المخزن عند إضافة المنتج (سيتم تسجيلها كحركة دخول تلقائية).
                  </p>
                </div>
              </>
            )}

            <Button onClick={handleSave} className="gradient-primary border-0 mt-1 text-sm">
              {editing ? 'تحديث' : 'إضافة'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle>تأكيد الحذف</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mt-2">
            هل أنت متأكد من حذف المنتج <strong>{deletingProduct?.name}</strong>؟ لا يمكن التراجع عن هذا الإجراء.
          </p>
          <div className="flex gap-2 mt-4">
            <Button variant="destructive" onClick={handleDelete} className="flex-1"><Trash2 className="w-4 h-4 ml-1" />حذف</Button>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>إلغاء</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteDialog} onOpenChange={setBulkDeleteDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle>تأكيد حذف المحدد</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mt-2">
            هل أنت متأكد من حذف <strong>{selected.size}</strong> منتج؟ المنتجات المرتبطة بحركات مخزون لن يتم حذفها.
          </p>
          <div className="flex gap-2 mt-4">
            <Button variant="destructive" onClick={handleBulkDelete} className="flex-1"><Trash2 className="w-4 h-4 ml-1" />حذف الكل</Button>
            <Button variant="outline" onClick={() => setBulkDeleteDialog(false)}>إلغاء</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductsPage;
