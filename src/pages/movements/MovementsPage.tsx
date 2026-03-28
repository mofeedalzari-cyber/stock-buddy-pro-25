import { useState, useMemo } from 'react';
import { useWarehouse } from '@/contexts/WarehouseContext';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Search, Pencil, Trash2, FileText, RefreshCw, PackagePlus, X, Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { MovementType, StockMovement, MovementItem } from '@/types/warehouse';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { UNITS, buildMovementHtml, buildMultiMovementHtml } from './utils/movementUtils';
import { MovementCard } from './components/MovementCard';

const MovementsPage = () => {
  const {
    movements, products, warehouses, suppliers, clients,
    addMovement, updateMovement, deleteMovement,
    getProductName, getWarehouseName, getSupplierName, getClientName, getUserName,
    refreshAll
  } = useWarehouse();
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'in' | 'out'>('all');
  const [viewTab, setViewTab] = useState<'single' | 'multi'>('single');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StockMovement | null>(null);
  const [movementType, setMovementType] = useState<'single' | 'multi'>('single');
  const [saving, setSaving] = useState(false);

  // ✅ حالات لصندوق نسخ الحركة
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateMovement, setDuplicateMovement] = useState<StockMovement | null>(null);
  const [duplicateDate, setDuplicateDate] = useState('');

  // ✅ حالات حوار التعديل الشامل
  const [editFullDialogOpen, setEditFullDialogOpen] = useState(false);
  const [editFullMovement, setEditFullMovement] = useState<StockMovement | null>(null);
  const [editFullType, setEditFullType] = useState<'single' | 'multi'>('single');

  // نموذج التعديل للحركة المفردة
  const [editSingleForm, setEditSingleForm] = useState({
    product_id: '',
    warehouse_id: '',
    type: 'in' as MovementType,
    quantity: null as number | null,
    entity_id: '',
    entity_type: 'supplier' as 'supplier' | 'client',
    date: '',
    notes: '',
    unit: ''
  });

  // نموذج التعديل للحركة المتعددة
  const [editMultiForm, setEditMultiForm] = useState({
    warehouse_id: '',
    type: 'in' as MovementType,
    entity_id: '',
    entity_type: 'supplier' as 'supplier' | 'client',
    date: '',
    notes: ''
  });
  const [editItems, setEditItems] = useState<MovementItem[]>([]);

  // نموذج الحركة الواحدة
  const [form, setForm] = useState({
    product_id: '',
    warehouse_id: '',
    type: 'in' as MovementType,
    quantity: null as number | null,
    entity_id: '',
    entity_type: 'supplier' as 'supplier' | 'client',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    unit: ''
  });

  // نموذج الحركة المتعددة
  const [multiForm, setMultiForm] = useState({
    warehouse_id: '',
    type: 'in' as MovementType,
    entity_id: '',
    entity_type: 'supplier' as 'supplier' | 'client',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // الأصناف
  const [items, setItems] = useState<MovementItem[]>([
    { product_id: '', quantity: null, unit: '', notes: '' }
  ]);

  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletingMovement, setDeletingMovement] = useState<StockMovement | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);

  // ✅ خريطة وحدات المنتجات (تسريع التحقق)
  const productUnitMap = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach(p => {
      if (p.id && p.unit) map.set(p.id, p.unit);
    });
    return map;
  }, [products]);

  // ✅ دالة حساب الرصيد لجميع المنتجات في مخزن معين (مرة واحدة)
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

  // دالة حساب الرصيد الحالي لمنتج واحد (للحركة المفردة)
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

  // دالة للحصول على min_quantity للمنتج
  const getProductMinQty = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.min_quantity ?? 2;
  };

  // ✅ دالة التحقق من تطابق الوحدة (باستخدام الخريطة)
  const validateProductUnit = (productId: string, selectedUnit: string) => {
    const productUnit = productUnitMap.get(productId);
    if (!productUnit) {
      return true;
    }
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

  // تصفية وترتيب الحركات
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

  // ✅ دالة فتح حوار نسخ الحركة
  const openDuplicateDialog = (movement: StockMovement) => {
    setDuplicateMovement(movement);
    setDuplicateDate(new Date().toISOString().split('T')[0]);
    setDuplicateDialogOpen(true);
  };

  // ✅ دالة نسخ الحركة
  const handleDuplicate = async () => {
    if (!duplicateMovement) return;
    
    setSaving(true);
    try {
      const newMovement: Omit<StockMovement, 'id' | 'created_at' | 'created_by'> = {
        warehouse_id: duplicateMovement.warehouse_id,
        type: duplicateMovement.type,
        entity_id: duplicateMovement.entity_id,
        entity_type: duplicateMovement.entity_type,
        date: duplicateDate,
        notes: duplicateMovement.notes ? `(نسخة من ${duplicateMovement.date}) ${duplicateMovement.notes}` : `نسخة من ${duplicateMovement.date}`,
      };
      
      if (duplicateMovement.product_id && duplicateMovement.quantity !== undefined) {
        // حركة مفردة
        newMovement.product_id = duplicateMovement.product_id;
        newMovement.quantity = duplicateMovement.quantity;
        newMovement.unit = duplicateMovement.unit;
      } else if (duplicateMovement.items && duplicateMovement.items.length > 0) {
        // حركة متعددة
        newMovement.items = duplicateMovement.items.map(item => ({
          ...item,
          quantity: item.quantity
        }));
      } else {
        toast({ title: 'خطأ', description: 'لا يمكن نسخ هذه الحركة', variant: 'destructive' });
        return;
      }
      
      await addMovement(newMovement);
      toast({ title: 'تم النسخ', description: 'تم نسخ الحركة بنجاح' });
      setDuplicateDialogOpen(false);
      setDuplicateMovement(null);
    } catch (error) {
      console.error('Error duplicating movement:', error);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء نسخ الحركة', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ✅ دالة فتح حوار التعديل الشامل
  const openEditFull = (movement: StockMovement) => {
    setEditFullMovement(movement);
    if (movement.product_id) {
      // حركة مفردة
      setEditFullType('single');
      setEditSingleForm({
        product_id: movement.product_id,
        warehouse_id: movement.warehouse_id,
        type: movement.type,
        quantity: movement.quantity ?? null,
        entity_id: movement.entity_id,
        entity_type: movement.entity_type,
        date: movement.date,
        notes: movement.notes || '',
        unit: movement.unit || ''
      });
    } else if (movement.items && movement.items.length > 0) {
      // حركة متعددة
      setEditFullType('multi');
      setEditMultiForm({
        warehouse_id: movement.warehouse_id,
        type: movement.type,
        entity_id: movement.entity_id,
        entity_type: movement.entity_type,
        date: movement.date,
        notes: movement.notes || ''
      });
      setEditItems(movement.items.map(item => ({ ...item })));
    }
    setEditFullDialogOpen(true);
  };

  // ✅ دوال مساعدة لتعديل الأصناف في الحركة المتعددة
  const addEditItem = () => setEditItems([...editItems, { product_id: '', quantity: null, unit: '', notes: '' }]);
  const removeEditItem = (index: number) => setEditItems(editItems.filter((_, i) => i !== index));
  const updateEditItem = (index: number, field: keyof MovementItem, value: any) => {
    const newItems = [...editItems];
    if (field === 'quantity') {
      const numericValue = value === '' ? null : Number(value);
      newItems[index] = { ...newItems[index], [field]: numericValue };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setEditItems(newItems);
  };

  // ✅ دالة حفظ التعديلات الشاملة
  const handleEditSave = async () => {
    if (!editFullMovement) return;
    
    setSaving(true);
    try {
      if (editFullType === 'single') {
        // التحقق من صحة البيانات
        if (!editSingleForm.warehouse_id) {
          toast({ title: 'خطأ', description: 'الرجاء اختيار المخزن', variant: 'destructive' });
          return;
        }
        if (!editSingleForm.product_id) {
          toast({ title: 'خطأ', description: 'الرجاء اختيار المنتج', variant: 'destructive' });
          return;
        }
        if (!editSingleForm.unit) {
          toast({ title: 'خطأ', description: 'الرجاء اختيار الوحدة', variant: 'destructive' });
          return;
        }
        if (!editSingleForm.entity_id) {
          const entityName = editSingleForm.type === 'in' ? 'المورد' : 'جهة الصرف';
          toast({ title: 'خطأ', description: `الرجاء اختيار ${entityName}`, variant: 'destructive' });
          return;
        }
        if (editSingleForm.quantity === null || editSingleForm.quantity <= 0) {
          toast({ title: 'خطأ', description: 'الكمية يجب أن تكون أكبر من صفر', variant: 'destructive' });
          return;
        }
        
        // التحقق من الوحدة
        if (!validateProductUnit(editSingleForm.product_id, editSingleForm.unit)) return;
        
        // التحقق من الرصيد للصادر
        const currentStock = getCurrentStock(editSingleForm.product_id, editSingleForm.warehouse_id);
        if (editSingleForm.type === 'out') {
          // إضافة الرصيد الحالي للحركة الأصلية (لأننا سنقوم بعكسها)
          const originalMovement = editFullMovement;
          const originalStock = getCurrentStock(originalMovement.product_id!, originalMovement.warehouse_id);
          const effectiveStock = currentStock + (originalMovement.type === 'out' ? originalMovement.quantity! : -originalMovement.quantity!);
          
          if (effectiveStock < editSingleForm.quantity) {
            toast({
              title: 'خطأ في الكمية',
              description: `الرصيد المتوفر في المخزن (${getWarehouseName(editSingleForm.warehouse_id)}) هو ${effectiveStock} فقط.`,
              variant: 'destructive'
            });
            return;
          }
          
          const minQty = getProductMinQty(editSingleForm.product_id);
          const newStock = effectiveStock - editSingleForm.quantity;
          if (newStock < minQty && minQty > 0) {
            toast({
              title: '⚠️ تحذير: مخزون أقل من الحد الأدنى',
              description: `بعد التعديل سيصبح المخزون (${newStock}) وهو أقل من الحد الأدنى (${minQty}).`,
              variant: 'destructive'
            });
            return;
          }
        }
        
        await updateMovement({
          ...editFullMovement,
          ...editSingleForm,
          quantity: editSingleForm.quantity
        });
        toast({ title: 'تم التعديل', description: 'تم تعديل الحركة بنجاح' });
      } else {
        // حركة متعددة
        if (!editMultiForm.warehouse_id) {
          toast({ title: 'خطأ', description: 'الرجاء اختيار المخزن', variant: 'destructive' });
          return;
        }
        if (!editMultiForm.entity_id) {
          const entityName = editMultiForm.type === 'in' ? 'المورد' : 'جهة الصرف';
          toast({ title: 'خطأ', description: `الرجاء اختيار ${entityName}`, variant: 'destructive' });
          return;
        }
        if (editItems.length === 0) {
          toast({ title: 'خطأ', description: 'يجب إضافة صنف واحد على الأقل', variant: 'destructive' });
          return;
        }
        
        // التحقق من صحة الأصناف
        for (let i = 0; i < editItems.length; i++) {
          const item = editItems[i];
          if (!item.product_id) {
            toast({ title: 'خطأ', description: `الصنف ${i+1}: الرجاء اختيار منتج`, variant: 'destructive' });
            return;
          }
          if (!item.unit) {
            toast({ title: 'خطأ', description: `الصنف ${i+1}: الرجاء اختيار الوحدة`, variant: 'destructive' });
            return;
          }
          if (item.quantity === null || item.quantity <= 0) {
            toast({ title: 'خطأ', description: `الصنف ${i+1}: الكمية يجب أن تكون أكبر من صفر`, variant: 'destructive' });
            return;
          }
          if (!validateProductUnit(item.product_id, item.unit)) return;
        }
        
        // التحقق من الرصيد للصادر
        if (editMultiForm.type === 'out') {
          const stockMap = getStockMapForWarehouse(editMultiForm.warehouse_id);
          // إضافة الرصيد الحالي للحركة الأصلية
          const originalMovement = editFullMovement;
          for (const item of editItems) {
            let originalQty = 0;
            const originalItem = originalMovement.items?.find(i => i.product_id === item.product_id);
            if (originalItem) originalQty = originalItem.quantity || 0;
            
            const currentStock = (stockMap.get(item.product_id) || 0) + (originalMovement.type === 'out' ? originalQty : -originalQty);
            if (currentStock < (item.quantity as number)) {
              toast({
                title: 'خطأ في الكمية',
                description: `المنتج ${getProductName(item.product_id)}: الرصيد المتوفر هو ${currentStock} فقط.`,
                variant: 'destructive'
              });
              return;
            }
            const minQty = getProductMinQty(item.product_id);
            const newStock = currentStock - (item.quantity as number);
            if (newStock < minQty && minQty > 0) {
              toast({
                title: '⚠️ تحذير: مخزون أقل من الحد الأدنى',
                description: `المنتج ${getProductName(item.product_id)}: بعد التعديل سيصبح المخزون (${newStock}) وهو أقل من الحد الأدنى (${minQty}).`,
                variant: 'destructive'
              });
              return;
            }
          }
        }
        
        await updateMovement({
          ...editFullMovement,
          ...editMultiForm,
          items: editItems.map(item => ({ ...item, quantity: Number(item.quantity) }))
        });
        toast({ title: 'تم التعديل', description: 'تم تعديل الحركة بنجاح' });
      }
      
      setEditFullDialogOpen(false);
      setEditFullMovement(null);
      await refreshAll();
    } catch (error) {
      console.error('Error updating movement:', error);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء تعديل الحركة', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openAddSingle = () => {
    setMovementType('single');
    setEditing(null);
    setForm({
      product_id: '',
      warehouse_id: '',
      type: 'in',
      quantity: null,
      entity_id: '',
      entity_type: 'supplier',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      unit: ''
    });
    setDialogOpen(true);
  };

  const openAddMulti = () => {
    setMovementType('multi');
    setEditing(null);
    setMultiForm({
      warehouse_id: '',
      type: 'in',
      entity_id: '',
      entity_type: 'supplier',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setItems([{ product_id: '', quantity: null, unit: '', notes: '' }]);
    setDialogOpen(true);
  };

  const openEdit = (m: StockMovement) => {
    setEditing(m);
    if (m.product_id) {
      setMovementType('single');
      setForm({
        product_id: m.product_id,
        warehouse_id: m.warehouse_id,
        type: m.type,
        quantity: m.quantity ?? null,
        entity_id: m.entity_id,
        entity_type: m.entity_type,
        date: m.date,
        notes: m.notes || '',
        unit: m.unit || ''
      });
    } else {
      setMovementType('multi');
      setMultiForm({
        warehouse_id: m.warehouse_id,
        type: m.type,
        entity_id: m.entity_id,
        entity_type: m.entity_type,
        date: m.date,
        notes: m.notes || ''
      });
      setItems(m.items || []);
    }
    setDialogOpen(true);
  };

  const handleTypeChange = (type: MovementType) => {
    const entity_type = type === 'in' ? 'supplier' : 'client';
    const entity_id = '';
    if (movementType === 'single') setForm({ ...form, type, entity_type, entity_id });
    else setMultiForm({ ...multiForm, type, entity_type, entity_id });
  };

  const addItem = () => setItems([...items, { product_id: '', quantity: null, unit: '', notes: '' }]);
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const updateItem = (index: number, field: keyof MovementItem, value: any) => {
    const newItems = [...items];
    if (field === 'quantity') {
      const numericValue = value === '' ? null : Number(value);
      newItems[index] = { ...newItems[index], [field]: numericValue };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setItems(newItems);
  };

  const preventDecimal = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '.' || e.key === 'e' || e.key === '-' || e.key === '+') e.preventDefault();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (movementType === 'single') {
        // التحقق من الحقول الأساسية
        if (!form.warehouse_id) {
          toast({ title: 'خطأ', description: 'الرجاء اختيار المخزن', variant: 'destructive' });
          return;
        }
        if (!form.product_id) {
          toast({ title: 'خطأ', description: 'الرجاء اختيار المنتج', variant: 'destructive' });
          return;
        }
        if (!form.unit) {
          toast({ title: 'خطأ', description: 'الرجاء اختيار الوحدة', variant: 'destructive' });
          return;
        }
        if (!form.entity_id) {
          const entityName = form.type === 'in' ? 'المورد' : 'جهة الصرف';
          toast({ title: 'خطأ', description: `الرجاء اختيار ${entityName}`, variant: 'destructive' });
          return;
        }
        if (form.quantity === null || form.quantity <= 0) {
          toast({ title: 'خطأ', description: 'الكمية يجب أن تكون أكبر من صفر', variant: 'destructive' });
          return;
        }

        if (!validateProductUnit(form.product_id, form.unit)) return;

        const currentStock = getCurrentStock(form.product_id, form.warehouse_id);
        if (form.type === 'out') {
          if (currentStock < form.quantity) {
            toast({
              title: 'خطأ في الكمية',
              description: `الرصيد المتوفر في مخزن (${getWarehouseName(form.warehouse_id)}) هو (${currentStock}) فقط. لا يمكن صرف كمية أكبر.`,
              variant: 'destructive'
            });
            return;
          }
          const minQty = getProductMinQty(form.product_id);
          const newStock = currentStock - form.quantity;
          if (newStock < minQty && minQty > 0) {
            toast({
              title: '⚠️ تحذير: مخزون أقل من الحد الأدنى',
              description: `بعد هذه العملية، سيصبح المخزون (${newStock}) وهو أقل من الحد الأدنى المحدد (${minQty}). لا يمكن إتمام الصرف.`,
              variant: 'destructive'
            });
            return;
          }
        }

        if (editing) await updateMovement({ ...editing, ...form, quantity: form.quantity });
        else await addMovement({ ...form, quantity: form.quantity });
        const typeMsg = form.type === 'in' ? 'تم توريد للمخزن بنجاح' : 'تم تصدير حركة بنجاح';
        toast({ title: editing ? 'تم التعديل' : (form.type === 'in' ? '✅ توريد' : '📤 تصدير'), description: typeMsg });
      } else {
        // ========== الحركة المتعددة ==========
        
        // 1. التحقق من الحقول الأساسية
        if (!multiForm.warehouse_id) {
          toast({ title: 'خطأ', description: 'الرجاء اختيار المخزن', variant: 'destructive' });
          return;
        }
        if (!multiForm.entity_id) {
          const entityName = multiForm.type === 'in' ? 'المورد' : 'جهة الصرف';
          toast({ title: 'خطأ', description: `الرجاء اختيار ${entityName}`, variant: 'destructive' });
          return;
        }
        if (items.length === 0) {
          toast({ title: 'خطأ', description: 'يجب إضافة صنف واحد على الأقل', variant: 'destructive' });
          return;
        }

        // 2. التحقق من صحة الأصناف
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (!item.product_id) {
            toast({ title: 'خطأ', description: `الصنف ${i+1}: الرجاء اختيار منتج`, variant: 'destructive' });
            return;
          }
          if (!item.unit) {
            toast({ title: 'خطأ', description: `الصنف ${i+1}: الرجاء اختيار الوحدة`, variant: 'destructive' });
            return;
          }
          if (item.quantity === null || item.quantity <= 0) {
            toast({ title: 'خطأ', description: `الصنف ${i+1}: الكمية يجب أن تكون أكبر من صفر`, variant: 'destructive' });
            return;
          }
          if (!validateProductUnit(item.product_id, item.unit)) return;
        }

        // 3. حساب الرصيد لجميع المنتجات دفعة واحدة
        const stockMap = getStockMapForWarehouse(multiForm.warehouse_id);

        // 4. التحقق من الرصيد والحد الأدنى
        if (multiForm.type === 'out') {
          for (const item of items) {
            const currentStock = stockMap.get(item.product_id) || 0;
            if (currentStock < (item.quantity as number)) {
              toast({
                title: 'خطأ في الكمية',
                description: `المنتج ${getProductName(item.product_id)}: الرصيد المتوفر في المخزن هو ${currentStock} فقط.`,
                variant: 'destructive'
              });
              return;
            }
            const minQty = getProductMinQty(item.product_id);
            const newStock = currentStock - (item.quantity as number);
            if (newStock < minQty && minQty > 0) {
              toast({
                title: '⚠️ تحذير: مخزون أقل من الحد الأدنى',
                description: `المنتج ${getProductName(item.product_id)}: بعد الصرف سيصبح المخزون (${newStock}) وهو أقل من الحد الأدنى المحدد (${minQty}).`,
                variant: 'destructive'
              });
              return;
            }
          }
        }

        // 5. حفظ الحركة
        const itemsToSave = items.map(item => ({ ...item, quantity: Number(item.quantity) }));
        const movementData: Omit<StockMovement, 'id' | 'created_at' | 'created_by'> = {
          type: multiForm.type,
          warehouse_id: multiForm.warehouse_id,
          entity_type: multiForm.entity_type,
          entity_id: multiForm.entity_id,
          date: multiForm.date,
          notes: multiForm.notes,
          items: itemsToSave
        };
        
        if (editing) await updateMovement({ ...editing, ...movementData });
        else await addMovement(movementData);
        
        const typeMsg = multiForm.type === 'in' ? 'تم توريد للمخزن بنجاح' : 'تم تصدير حركة بنجاح';
        toast({ 
          title: editing ? 'تم التعديل' : (multiForm.type === 'in' ? '✅ توريد' : '📤 تصدير'), 
          description: `${typeMsg} - ${items.length} منتج` 
        });
      }
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving movement:', error);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء حفظ الحركة', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (m: StockMovement) => {
    setDeletingMovement(m);
    setDeleteDialog(true);
  };
  const handleDelete = async () => {
    if (!deletingMovement) return;
    await deleteMovement(deletingMovement.id);
    toast({ title: 'تم الحذف', description: 'تم حذف الحركة وتحديث الرصيد تلقائيًا' });
    setDeleteDialog(false);
    setDeletingMovement(null);
  };

  // دالة الطباعة
  const printMovementNative = async (html: string, title: string) => {
    const platform = Capacitor.getPlatform();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    tempDiv.style.position = 'fixed';
    tempDiv.style.top = '-10000px';
    tempDiv.style.width = '800px';
    tempDiv.style.direction = 'rtl';
    document.body.appendChild(tempDiv);

    try {
      const canvas = await html2canvas(tempDiv, { scale: 2, useCORS: true });
      document.body.removeChild(tempDiv);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      if (platform === 'android') {
        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        const fileName = `${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
        const savedFile = await Filesystem.writeFile({ path: fileName, data: pdfBase64, directory: Directory.Cache });
        await Share.share({ title, url: savedFile.uri, dialogTitle: title });
      } else {
        const pdfDataUrl = pdf.output('datauristring');
        const link = document.createElement('a');
        link.href = pdfDataUrl;
        link.download = `${title}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: 'تم التحميل', description: 'تم إنشاء ملف PDF وبدء التحميل' });
      }
    } catch (error) {
      console.error('PDF error:', error);
      if (document.body.contains(tempDiv)) document.body.removeChild(tempDiv);
      toast({ title: 'خطأ في الطباعة', description: 'حدث خطأ أثناء إنشاء ملف PDF. حاول مرة أخرى.', variant: 'destructive' });
    }
  };

  const handlePrint = async (m: StockMovement) => {
    const warehouseName = getWarehouseName(m.warehouse_id);
    const entityName = m.entity_type === 'supplier' ? getSupplierName(m.entity_id) : getClientName(m.entity_id);
    const userName = getUserName(m.created_by);
    const warehouseManager = warehouses.find(w => w.id === m.warehouse_id)?.manager || 'غير محدد';
    const baseUrl = window.location.origin;

    if (m.product_id) {
      const productName = getProductName(m.product_id);
      const html = buildMovementHtml(m, productName, warehouseName, entityName, userName, warehouseManager, baseUrl);
      await printMovementNative(html, m.type === 'in' ? 'سند_وارد' : 'سند_صادر');
    } else {
      const productsMap = new Map(products.map(p => [p.id, p.name]));
      const html = buildMultiMovementHtml(m, warehouseName, entityName, userName, warehouseManager, productsMap, baseUrl);
      await printMovementNative(html, m.type === 'in' ? 'سند_وارد_متعدد' : 'سند_صادر_متعدد');
    }
  };

  // ---------- JSX ----------
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
                <td colSpan={isAdmin ? (viewTab === 'single' ? 11 : 9) : (viewTab === 'single' ? 10 : 8)} className="p-8 text-center text-muted-foreground">لا توجد حركات</td>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* حوار الحذف الجماعي */}
      <Dialog open={bulkDeleteDialog} onOpenChange={setBulkDeleteDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle>تأكيد الحذف الجماعي</DialogTitle></DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              هل أنت متأكد من حذف <strong>{selectedItems.size}</strong> حركات مختارة؟ سيتم تحديث رصيد المنتجات تلقائياً.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="destructive" onClick={handleBulkDelete} className="flex-1">تأكيد الحذف</Button>
            <Button variant="outline" onClick={() => setBulkDeleteDialog(false)} className="flex-1">إلغاء</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ✅ حوار نسخ الحركة */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">نسخ الحركة</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 mt-2">
            <div className="space-y-2">
              <Label>التاريخ</Label>
              <Input
                type="date"
                value={duplicateDate}
                onChange={e => setDuplicateDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                سيتم إنشاء نسخة جديدة من هذه الحركة بتاريخ {duplicateDate || 'اليوم'}
              </p>
            </div>
            <Button onClick={handleDuplicate} disabled={saving} className="gradient-primary border-0">
              {saving ? 'جاري النسخ...' : 'تأكيد النسخ'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ✅ حوار التعديل الشامل */}
      <Dialog open={editFullDialogOpen} onOpenChange={setEditFullDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              تعديل الحركة {editFullMovement?.type === 'in' ? '(وارد)' : '(صادر)'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-3 sm:gap-4 mt-2">
            {/* نوع الحركة */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">نوع الحركة</Label>
              <div className="flex gap-2">
                <button 
                  onClick={() => editFullType === 'single' 
                    ? setEditSingleForm({ ...editSingleForm, type: 'in', entity_type: 'supplier', entity_id: '' })
                    : setEditMultiForm({ ...editMultiForm, type: 'in', entity_type: 'supplier', entity_id: '' })
                  }
                  className={`flex-1 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                    (editFullType === 'single' ? editSingleForm.type : editMultiForm.type) === 'in' 
                      ? 'bg-success text-success-foreground' : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  وارد
                </button>
                <button 
                  onClick={() => editFullType === 'single' 
                    ? setEditSingleForm({ ...editSingleForm, type: 'out', entity_type: 'client', entity_id: '' })
                    : setEditMultiForm({ ...editMultiForm, type: 'out', entity_type: 'client', entity_id: '' })
                  }
                  className={`flex-1 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                    (editFullType === 'single' ? editSingleForm.type : editMultiForm.type) === 'out' 
                      ? 'bg-destructive text-destructive-foreground' : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  صادر
                </button>
              </div>
            </div>

            {/* المخزن */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">المخزن <span className="text-destructive">*</span></Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editFullType === 'single' ? editSingleForm.warehouse_id : editMultiForm.warehouse_id}
                onChange={e => editFullType === 'single' 
                  ? setEditSingleForm({ ...editSingleForm, warehouse_id: e.target.value })
                  : setEditMultiForm({ ...editMultiForm, warehouse_id: e.target.value })
                }
              >
                <option value="" disabled>اختر المخزن</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

            {/* جهة الصرف / المورد */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">
                {editFullType === 'single' 
                  ? (editSingleForm.entity_type === 'supplier' ? 'المورد' : 'جهة الصرف')
                  : (editMultiForm.entity_type === 'supplier' ? 'المورد' : 'جهة الصرف')
                }
                <span className="text-destructive">*</span>
              </Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editFullType === 'single' ? editSingleForm.entity_id : editMultiForm.entity_id}
                onChange={e => editFullType === 'single'
                  ? setEditSingleForm({ ...editSingleForm, entity_id: e.target.value })
                  : setEditMultiForm({ ...editMultiForm, entity_id: e.target.value })
                }
              >
                <option value="" disabled>اختر {editFullType === 'single' 
                  ? (editSingleForm.entity_type === 'supplier' ? 'المورد' : 'جهة الصرف')
                  : (editMultiForm.entity_type === 'supplier' ? 'المورد' : 'جهة الصرف')
                }</option>
                {(editFullType === 'single' 
                  ? (editSingleForm.entity_type === 'supplier' ? suppliers : clients)
                  : (editMultiForm.entity_type === 'supplier' ? suppliers : clients)
                ).map(ent => (
                  <option key={ent.id} value={ent.id}>{ent.name}</option>
                ))}
              </select>
            </div>

            {/* التاريخ */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">التاريخ</Label>
              <Input
                type="date"
                value={editFullType === 'single' ? editSingleForm.date : editMultiForm.date}
                onChange={e => editFullType === 'single'
                  ? setEditSingleForm({ ...editSingleForm, date: e.target.value })
                  : setEditMultiForm({ ...editMultiForm, date: e.target.value })
                }
              />
            </div>

            {/* حقول الحركة المفردة */}
            {editFullType === 'single' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm">المنتج <span className="text-destructive">*</span></Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editSingleForm.product_id}
                    onChange={e => setEditSingleForm({ ...editSingleForm, product_id: e.target.value })}
                  >
                    <option value="" disabled>اختر المنتج</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm">الكمية <span className="text-destructive">*</span></Label>
                    <Input
                      type="number"
                      placeholder="أدخل الكمية"
                      value={editSingleForm.quantity === null ? '' : editSingleForm.quantity}
                      onChange={e => setEditSingleForm({ ...editSingleForm, quantity: e.target.value === '' ? null : Number(e.target.value) })}
                      onKeyDown={preventDecimal}
                      step="1"
                      min="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm">الوحدة <span className="text-destructive">*</span></Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={editSingleForm.unit}
                      onChange={e => setEditSingleForm({ ...editSingleForm, unit: e.target.value })}
                    >
                      <option value="" disabled>اختر الوحدة</option>
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* حقول الحركة المتعددة */}
            {editFullType === 'multi' && (
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">الأصناف <span className="text-destructive">*</span></Label>
                <div className="border rounded-md p-2">
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {editItems.map((item, index) => (
                      <div key={index} className="border rounded-md p-2 space-y-2 bg-background">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">صنف {index + 1}</span>
                          <button onClick={() => removeEditItem(index)} className="text-destructive">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <select
                            value={item.product_id}
                            onChange={(e) => updateEditItem(index, 'product_id', e.target.value)}
                            className="w-full p-2 border rounded text-sm"
                          >
                            <option value="" disabled>اختر المنتج</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              placeholder="الكمية"
                              value={item.quantity === null ? '' : item.quantity}
                              onChange={(e) => updateEditItem(index, 'quantity', e.target.value)}
                              onKeyDown={preventDecimal}
                              step="1"
                              min="0"
                            />
                            <select
                              value={item.unit}
                              onChange={(e) => updateEditItem(index, 'unit', e.target.value)}
                              className="p-2 border rounded text-sm"
                            >
                              <option value="" disabled>اختر الوحدة</option>
                              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </div>
                        </div>
                        <Input
                          placeholder="ملاحظات (اختياري)"
                          value={item.notes || ''}
                          onChange={(e) => updateEditItem(index, 'notes', e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                  <Button onClick={addEditItem} variant="outline" size="sm" className="mt-2 w-full">
                    <Plus className="w-4 h-4 ml-1" /> إضافة صنف
                  </Button>
                </div>
              </div>
            )}

            {/* ملاحظات عامة */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">ملاحظات عامة</Label>
              <Input
                placeholder="أدخل ملاحظات (اختياري)"
                value={editFullType === 'single' ? editSingleForm.notes : editMultiForm.notes}
                onChange={e => editFullType === 'single'
                  ? setEditSingleForm({ ...editSingleForm, notes: e.target.value })
                  : setEditMultiForm({ ...editMultiForm, notes: e.target.value })
                }
              />
            </div>

            <Button onClick={handleEditSave} disabled={saving} className="gradient-primary border-0">
              {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* حوار الإضافة / التعديل */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {/* ... نفس الكود السابق ... */}
      </Dialog>

      {/* حوار تأكيد الحذف الفردي */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        {/* ... نفس الكود السابق ... */}
      </Dialog>
    </div>
  );
};

export default MovementsPage;
