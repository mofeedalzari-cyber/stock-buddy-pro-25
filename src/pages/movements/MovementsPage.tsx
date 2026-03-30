import { useState, useMemo } from 'react';
import { useWarehouse } from '@/contexts/WarehouseContext';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, RefreshCw, PackagePlus, Checkbox, Copy, Pencil, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { StockMovement, MovementItem } from '@/types/warehouse';
import { UNITS } from './utils/movementUtils';
import { MovementCard } from './components/MovementCard';
import { MovementDialogs } from './components/MovementDialogs';

const MovementsPage = () => {
  const {
    movements, products, warehouses, suppliers, clients,
    addMovement, updateMovement, deleteMovement,
    getProductName, getWarehouseName, getSupplierName, getClientName, getUserName,
    refreshAll
  } = useWarehouse();
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  // ========== حالات البحث والفلاتر ==========
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'in' | 'out'>('all');
  const [viewTab, setViewTab] = useState<'single' | 'multi'>('single');

  // ========== حالات التحديد والحذف الجماعي ==========
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);

  // ========== حالات الحوارات ==========
  const [addSingleOpen, setAddSingleOpen] = useState(false);
  const [addMultiOpen, setAddMultiOpen] = useState(false);
  const [editFullOpen, setEditFullOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  
  const [editingMovement, setEditingMovement] = useState<StockMovement | null>(null);
  const [duplicateMovement, setDuplicateMovement] = useState<StockMovement | null>(null);
  const [deletingMovement, setDeletingMovement] = useState<StockMovement | null>(null);

  // ========== خريطة وحدات المنتجات (تسريع التحقق) ==========
  const productUnitMap = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach(p => {
      if (p.id && p.unit) map.set(p.id, p.unit);
    });
    return map;
  }, [products]);

  // ========== دالة حساب الرصيد لجميع المنتجات في مخزن معين ==========
  const getStockMapForWarehouse = useMemo(() => {
    return (warehouseId: string) => {
      const stockMap = new Map<string, number>();
      const filteredMovements = movements.filter(m => m.warehouse_id === warehouseId);
      
      filteredMovements.forEach(m => {
        if (m.product_id && m.quantity !== undefined && m.quantity !== null) {
          const change = m.type === 'in' ? m.quantity : -m.quantity;
          stockMap.set(m.product_id, (stockMap.get(m.product_id) || 0) + change);
        } else if (m.items) {
          m.items.forEach(item => {
            if (item.quantity !== null) {
              const change = m.type === 'in' ? item.quantity : -item.quantity;
              stockMap.set(item.product_id, (stockMap.get(item.product_id) || 0) + change);
            }
          });
        }
      });
      
      return stockMap;
    };
  }, [movements]);

  // ========== دالة حساب الرصيد الحالي لمنتج واحد ==========
  const getCurrentStock = (productId: string, warehouseId: string) => {
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

  // ========== دالة الحصول على min_quantity للمنتج ==========
  const getProductMinQty = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.min_quantity ?? 2;
  };

  // ========== دالة التحقق من تطابق الوحدة ==========
  const validateProductUnit = (productId: string, selectedUnit: string) => {
    const productUnit = productUnitMap.get(productId);
    if (!productUnit) return true;
    if (productUnit !== selectedUnit) {
      const productName = getProductName(productId);
      toast({
        title: 'خطأ في الوحدة',
        description: `المنتج "${productName}" وحدته الأساسية هي "${productUnit}". لا يمكن تسجيل حركة بوحدة "${selectedUnit}".`,
        variant: 'destructive'
      });
      return false;
    }
    return true;
  };

  // ========== منع الكسور العشرية ==========
  const preventDecimal = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '.' || e.key === 'e' || e.key === '-' || e.key === '+') e.preventDefault();
  };

  // ========== تصفية وترتيب الحركات ==========
  const filtered = movements
    .filter(m => filter === 'all' || m.type === filter)
    .filter(m => {
      if (m.product_id) {
        return getProductName(m.product_id).includes(search);
      } else {
        const itemNames = (m.items || []).map(item => getProductName(item.product_id)).join(' ');
        return itemNames.includes(search);
      }
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const singleMovements = filtered.filter(m => !!m.product_id);
  const multiMovements = filtered.filter(m => !m.product_id);
  const activeMovements = viewTab === 'single' ? singleMovements : multiMovements;

  // ========== دوال التحديث والحذف ==========
  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
    toast({ title: 'تم التحديث', description: 'تم تحديث البيانات بنجاح' });
  };

  const allSelected = activeMovements.length > 0 && activeMovements.every(m => selectedItems.has(m.id));

  const toggleAll = () => {
    if (allSelected) setSelectedItems(new Set());
    else setSelectedItems(new Set(activeMovements.map(m => m.id)));
  };
  const toggleOne = (id: string) => {
    const next = new Set(selectedItems);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedItems(next);
  };

  const handleBulkDelete = async () => {
    for (const id of Array.from(selectedItems)) await deleteMovement(id);
    toast({ title: 'تم الحذف', description: `تم حذف ${selectedItems.size} حركة بنجاح` });
    setSelectedItems(new Set());
    setBulkDeleteDialog(false);
  };

  // ========== دوال فتح الحوارات ==========
  const openAddSingle = () => {
    setAddSingleOpen(true);
  };

  const openAddMulti = () => {
    setAddMultiOpen(true);
  };

  const openEditFull = (movement: StockMovement) => {
    setEditingMovement(movement);
    setEditFullOpen(true);
  };

  const openDuplicateDialog = (movement: StockMovement) => {
    setDuplicateMovement(movement);
    setDuplicateOpen(true);
  };

  const confirmDelete = (movement: StockMovement) => {
    setDeletingMovement(movement);
    setDeleteOpen(true);
  };

  // ========== دوال الطباعة ==========
  const handlePrint = async (movement: StockMovement) => {
    // سيتم تنفيذ الطباعة لاحقاً
    toast({ title: 'طباعة', description: 'جاري تجهيز التقرير...' });
  };

  // ========== JSX ==========
  return (
    <div className="space-y-3 sm:space-y-4">
      {/* شريط البحث والفلاتر */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[150px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 text-sm" />
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(['all', 'in', 'out'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-2.5 sm:px-3 py-2 text-xs font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-secondary'}`}>
                {f === 'all' ? 'الكل' : f === 'in' ? 'وارد' : 'صادر'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 justify-between">
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline" size="sm" className="gap-2 text-sm" disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>تحديث</span>
            </Button>
            {isAdmin && selectedItems.size > 0 && (
              <Button variant="destructive" size="sm" className="gap-2 text-sm" onClick={() => setBulkDeleteDialog(true)}>
                <Trash2 className="w-4 h-4" />
                <span>حذف المحدد ({selectedItems.size})</span>
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={openAddSingle} className="gradient-primary border-0 text-sm gap-2">
              <Plus className="w-4 h-4" />تسجيل حركة
            </Button>
            <Button onClick={openAddMulti} variant="secondary" className="text-sm gap-2">
              <PackagePlus className="w-4 h-4" />حركة تعيين
            </Button>
          </div>
        </div>
      </div>

      {/* تبويب حركات مفردة / متعددة */}
      <div className="flex rounded-lg border border-border overflow-hidden w-fit">
        <button onClick={() => { setViewTab('single'); setSelectedItems(new Set()); }}
          className={`px-4 py-2 text-xs sm:text-sm font-medium transition-colors ${viewTab === 'single' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-secondary'}`}>
          حركات مفردة ({singleMovements.length})
        </button>
        <button onClick={() => { setViewTab('multi'); setSelectedItems(new Set()); }}
          className={`px-4 py-2 text-xs sm:text-sm font-medium transition-colors ${viewTab === 'multi' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-secondary'}`}>
          حركات متعددة ({multiMovements.length})
        </button>
      </div>

      {/* عرض الجوال */}
      <div className="sm:hidden space-y-2">
        {isAdmin && activeMovements.length > 0 && (
          <div className="flex items-center gap-2 px-1 py-1 border-b">
            <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
            <span className="text-xs text-muted-foreground font-medium">تحديد الكل</span>
          </div>
        )}
        {activeMovements.map(m => (
          <MovementCard
            key={m.id}
            movement={m}
            isSelected={selectedItems.has(m.id)}
            onToggleSelect={() => toggleOne(m.id)}
            onEdit={() => openEditFull(m)}
            onDelete={() => confirmDelete(m)}
            onPrint={() => handlePrint(m)}
            onDuplicate={() => openDuplicateDialog(m)}
            showCheckbox={isAdmin}
          />
        ))}
        {activeMovements.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">لا توجد حركات</p>}
      </div>

      {/* جدول سطح المكتب */}
      <div className="hidden sm:block bg-card rounded-xl shadow-card border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                {isAdmin && <th className="p-3 w-10"><Checkbox checked={allSelected} onCheckedChange={toggleAll} /></th>}
                <th className="text-right p-3 font-semibold text-foreground">م</th>
                <th className="text-right p-3 font-semibold text-foreground">النوع</th>
                <th className="text-right p-3 font-semibold text-foreground">جهة الصرف/المورد</th>
                {viewTab === 'single' ? (
                  <>
                    <th className="text-right p-3 font-semibold text-foreground">المنتج</th>
                    <th className="text-right p-3 font-semibold text-foreground">الكمية</th>
                    <th className="text-right p-3 font-semibold text-foreground">الوحدة</th>
                  </>
                ) : (
                  <th className="text-right p-3 font-semibold text-foreground">الأصناف</th>
                )}
                <th className="text-right p-3 font-semibold text-foreground">المخزن</th>
                <th className="text-right p-3 font-semibold text-foreground hidden md:table-cell">بواسطة</th>
                <th className="text-right p-3 font-semibold text-foreground hidden lg:table-cell">التاريخ</th>
                <th className="text-center p-3 font-semibold text-foreground">إجراءات</th>
                 </tr>
            </thead>
            <tbody>
              {activeMovements.map((m, i) => (
                <tr key={m.id} className={`border-b border-border last:border-0 hover:bg-secondary/30 transition-colors ${selectedItems.has(m.id) ? 'bg-primary/5' : ''}`}>
                  {isAdmin && (
                    <td className="p-3">
                      <Checkbox checked={selectedItems.has(m.id)} onCheckedChange={() => toggleOne(m.id)} />
                     </td>
                  )}
                  <td className="p-3 text-foreground font-medium">{i + 1}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      m.type === 'in' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                    }`}>{m.type === 'in' ? 'وارد' : 'صادر'}</span>
                  </td>
                  <td className="p-3 text-foreground">{m.entity_type === 'supplier' ? getSupplierName(m.entity_id) : getClientName(m.entity_id)}</td>
                  {viewTab === 'single' ? (
                    <>
                      <td className="p-3 text-foreground">{getProductName(m.product_id)}</td>
                      <td className="p-3 text-foreground font-semibold">{m.quantity}</td>
                      <td className="p-3 text-foreground">{m.unit || 'قطعة'}</td>
                    </>
                  ) : (
                    <td className="p-3 text-foreground">
                      <div className="space-y-0.5">
                        {(m.items || []).map((item, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="font-medium">{getProductName(item.product_id)}</span>
                            <span className="text-muted-foreground"> — {item.quantity} {item.unit}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  )}
                  <td className="p-3 text-foreground">{getWarehouseName(m.warehouse_id)}</td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">{getUserName(m.created_by)}</td>
                  <td className="p-3 text-muted-foreground hidden lg:table-cell">{m.date}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEditFull(m)} className="p-1.5 rounded-md hover:bg-primary/10 text-primary"><Pencil className="w-4 h-4" /></button>
                      {isAdmin && <button onClick={() => confirmDelete(m)} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button>}
                      <button onClick={() => openDuplicateDialog(m)} className="p-1.5 rounded-md hover:bg-accent/20 text-accent"><Copy className="w-4 h-4" /></button>
                      <button onClick={() => handlePrint(m)} className="p-1.5 rounded-md hover:bg-accent/20 text-accent"><FileText className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {activeMovements.length === 0 && (
                <tr><td colSpan={isAdmin ? (viewTab === 'single' ? 11 : 9) : (viewTab === 'single' ? 10 : 8)} className="p-8 text-center text-muted-foreground">لا توجد حركات</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* الحوارات */}
      <MovementDialogs
        addMovement={addMovement}
        updateMovement={updateMovement}
        deleteMovement={deleteMovement}
        getProductName={getProductName}
        getWarehouseName={getWarehouseName}
        getSupplierName={getSupplierName}
        getClientName={getClientName}
        getUserName={getUserName}
        refreshAll={refreshAll}
        products={products}
        warehouses={warehouses}
        suppliers={suppliers}
        clients={clients}
        movements={movements}
        isAdmin={isAdmin}
        toast={toast}
        addSingleOpen={addSingleOpen}
        setAddSingleOpen={setAddSingleOpen}
        addMultiOpen={addMultiOpen}
        setAddMultiOpen={setAddMultiOpen}
        editFullOpen={editFullOpen}
        setEditFullOpen={setEditFullOpen}
        duplicateOpen={duplicateOpen}
        setDuplicateOpen={setDuplicateOpen}
        deleteOpen={deleteOpen}
        setDeleteOpen={setDeleteOpen}
        bulkDeleteOpen={bulkDeleteDialog}
        setBulkDeleteOpen={setBulkDeleteDialog}
        editingMovement={editingMovement}
        setEditingMovement={setEditingMovement}
        duplicateMovement={duplicateMovement}
        setDuplicateMovement={setDuplicateMovement}
        deletingMovement={deletingMovement}
        setDeletingMovement={setDeletingMovement}
        selectedItems={selectedItems}
        setSelectedItems={setSelectedItems}
        validateProductUnit={validateProductUnit}
        getCurrentStock={getCurrentStock}
        getProductMinQty={getProductMinQty}
        getStockMapForWarehouse={getStockMapForWarehouse}
        preventDecimal={preventDecimal}
      />
    </div>
  );
};

export default MovementsPage;
