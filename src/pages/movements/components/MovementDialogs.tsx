// ============================================================================
// ملف: src/pages/movements/components/MovementDialogs.tsx
// الإصدار: يدعم الوحدات (base_unit_id، display_unit_id، pack_size) مع التحويل التلقائي
// ============================================================================

import { useState, useEffect, useMemo } from 'react';
import { Plus, X, Copy, Pencil, Trash2, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MovementType, StockMovement, MovementItem, Product } from '@/types/warehouse';

export interface MovementDialogsProps {
  // البيانات الأساسية
  products: Product[];
  warehouses: any[];
  suppliers: any[];
  clients: any[];
  units: any[];                       // قائمة الوحدات (id, name, ...)
  getUnitName: (unitId: string) => string; // دالة للحصول على اسم الوحدة
  
  // دوال CRUD
  addMovement: (movement: any) => Promise<void>;
  updateMovement: (movement: any) => Promise<void>;
  deleteMovement: (id: string) => Promise<void>;
  
  // دوال مساعدة
  getProductName: (id: string) => string;
  getWarehouseName: (id: string) => string;
  getSupplierName: (id: string) => string;
  getClientName: (id: string) => string;
  getCurrentStock: (productId: string, warehouseId: string) => number;
  getProductMinQty: (productId: string) => number;
  getStockMapForWarehouse: (warehouseId: string) => Map<string, number>;
  preventDecimal: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  refreshAll: () => Promise<void>;
  
  // حالات الحوارات
  addSingleOpen: boolean;
  setAddSingleOpen: (open: boolean) => void;
  addMultiOpen: boolean;
  setAddMultiOpen: (open: boolean) => void;
  editFullOpen: boolean;
  setEditFullOpen: (open: boolean) => void;
  duplicateOpen: boolean;
  setDuplicateOpen: (open: boolean) => void;
  deleteOpen: boolean;
  setDeleteOpen: (open: boolean) => void;
  bulkDeleteOpen: boolean;
  setBulkDeleteOpen: (open: boolean) => void;
  
  // الحركات الجاري التعامل معها
  editingMovement: StockMovement | null;
  setEditingMovement: (movement: StockMovement | null) => void;
  duplicateMovement: StockMovement | null;
  setDuplicateMovement: (movement: StockMovement | null) => void;
  deletingMovement: StockMovement | null;
  setDeletingMovement: (movement: StockMovement | null) => void;
  selectedItems: Set<string>;
  setSelectedItems: (items: Set<string>) => void;
  
  // صلاحيات
  isAdmin: boolean;
  
  // دالة Toast (من useToast)
  toast: any;
}

export const MovementDialogs: React.FC<MovementDialogsProps> = ({
  products,
  warehouses,
  suppliers,
  clients,
  units,
  getUnitName,
  addMovement,
  updateMovement,
  deleteMovement,
  getProductName,
  getWarehouseName,
  getSupplierName,
  getClientName,
  getCurrentStock,
  getProductMinQty,
  getStockMapForWarehouse,
  preventDecimal,
  refreshAll,
  addSingleOpen,
  setAddSingleOpen,
  addMultiOpen,
  setAddMultiOpen,
  editFullOpen,
  setEditFullOpen,
  duplicateOpen,
  setDuplicateOpen,
  deleteOpen,
  setDeleteOpen,
  bulkDeleteOpen,
  setBulkDeleteOpen,
  editingMovement,
  setEditingMovement,
  duplicateMovement,
  setDuplicateMovement,
  deletingMovement,
  setDeletingMovement,
  selectedItems,
  setSelectedItems,
  isAdmin,
  toast,
}) => {
  const [saving, setSaving] = useState(false);
  const [movementType, setMovementType] = useState<'single' | 'multi'>('single');

  // ========== خريطة معلومات المنتج (base_unit_id, display_unit_id, pack_size) ==========
  const productInfoMap = useMemo(() => {
    const map = new Map<string, { base_unit_id: string; display_unit_id: string; pack_size: number }>();
    products.forEach(p => {
      if (p.id) {
        map.set(p.id, {
          base_unit_id: p.base_unit_id,
          display_unit_id: p.display_unit_id,
          pack_size: p.pack_size || 1,
        });
      }
    });
    return map;
  }, [products]);

  // ========== دالة الحصول على الوحدات المتاحة للمنتج ==========
  const getAvailableUnitsForProduct = (productId: string) => {
    const info = productInfoMap.get(productId);
    if (!info) return [];

    const unitsList: { id: string; name: string }[] = [];
    // الوحدة الأساسية
    unitsList.push({ id: info.base_unit_id, name: getUnitName(info.base_unit_id) });
    // الوحدة المعروضة إذا كانت موجودة ومختلفة وكان pack_size > 1
    if (info.display_unit_id && info.display_unit_id !== info.base_unit_id && info.pack_size > 1) {
      unitsList.push({ id: info.display_unit_id, name: getUnitName(info.display_unit_id) });
    }
    return unitsList;
  };

  // ========== دالة التحقق من صحة الوحدة ==========
  const validateProductUnitById = (productId: string, selectedUnitId: string) => {
    const info = productInfoMap.get(productId);
    if (!info) {
      toast({ title: 'خطأ', description: 'المنتج غير موجود', variant: 'destructive' });
      return false;
    }

    // 1. الوحدة الأساسية مسموحة دائماً
    if (selectedUnitId === info.base_unit_id) return true;

    // 2. الوحدة المعروضة مسموحة إذا كان pack_size > 1
    if (selectedUnitId === info.display_unit_id && info.pack_size > 1) return true;

    // غير ذلك ممنوع
    toast({
      title: 'خطأ في الوحدة',
      description: `المنتج "${getProductName(productId)}" لا يدعم الوحدة "${getUnitName(selectedUnitId)}". الوحدات المتاحة: ${getUnitName(info.base_unit_id)}${info.display_unit_id && info.pack_size > 1 ? ` و ${getUnitName(info.display_unit_id)}` : ''}.`,
      variant: 'destructive'
    });
    return false;
  };

  // ========== دالة تحويل الكمية إلى الوحدة الأساسية ==========
  const convertToBaseUnit = (productId: string, quantity: number, selectedUnitId: string): number => {
    const info = productInfoMap.get(productId);
    if (!info) return quantity;

    // إذا كانت الوحدة المختارة هي الوحدة المعروضة وكان pack_size > 1
    if (selectedUnitId === info.display_unit_id && info.pack_size > 1) {
      return quantity * info.pack_size;
    }
    // الوحدة الأساسية أو أي حالة أخرى
    return quantity;
  };

  // ========== نموذج الحركة الواحدة ==========
  const [form, setForm] = useState({
    product_id: '',
    warehouse_id: '',
    type: 'in' as MovementType,
    quantity: null as number | null,
    entity_id: '',
    entity_type: 'supplier' as 'supplier' | 'client',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    unit_id: '',
  });

  // ========== نموذج الحركة المتعددة ==========
  const [multiForm, setMultiForm] = useState({
    warehouse_id: '',
    type: 'in' as MovementType,
    entity_id: '',
    entity_type: 'supplier' as 'supplier' | 'client',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [items, setItems] = useState<MovementItem[]>([
    { product_id: '', quantity: null, unit_id: '', notes: '' }
  ]);

  // ========== نموذج التعديل للحركة المفردة ==========
  const [editSingleForm, setEditSingleForm] = useState({
    product_id: '',
    warehouse_id: '',
    type: 'in' as MovementType,
    quantity: null as number | null,
    entity_id: '',
    entity_type: 'supplier' as 'supplier' | 'client',
    date: '',
    notes: '',
    unit_id: ''
  });

  // ========== نموذج التعديل للحركة المتعددة ==========
  const [editMultiForm, setEditMultiForm] = useState({
    warehouse_id: '',
    type: 'in' as MovementType,
    entity_id: '',
    entity_type: 'supplier' as 'supplier' | 'client',
    date: '',
    notes: ''
  });
  const [editItems, setEditItems] = useState<MovementItem[]>([]);
  const [editType, setEditType] = useState<'single' | 'multi'>('single');

  // ========== نموذج النسخ للحركة المفردة ==========
  const [duplicateSingleForm, setDuplicateSingleForm] = useState({
    product_id: '',
    warehouse_id: '',
    type: 'in' as MovementType,
    quantity: null as number | null,
    entity_id: '',
    entity_type: 'supplier' as 'supplier' | 'client',
    date: '',
    notes: '',
    unit_id: ''
  });

  // ========== نموذج النسخ للحركة المتعددة ==========
  const [duplicateMultiForm, setDuplicateMultiForm] = useState({
    warehouse_id: '',
    type: 'in' as MovementType,
    entity_id: '',
    entity_type: 'supplier' as 'supplier' | 'client',
    date: '',
    notes: ''
  });
  const [duplicateItems, setDuplicateItems] = useState<MovementItem[]>([]);
  const [duplicateType, setDuplicateType] = useState<'single' | 'multi'>('single');

  // ========== دوال مساعدة للإضافة ==========
  const handleTypeChange = (type: MovementType) => {
    const entity_type = type === 'in' ? 'supplier' : 'client';
    const entity_id = '';
    if (movementType === 'single') setForm({ ...form, type, entity_type, entity_id });
    else setMultiForm({ ...multiForm, type, entity_type, entity_id });
  };

  const addItem = () => setItems([...items, { product_id: '', quantity: null, unit_id: '', notes: '' }]);
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

  // ========== دوال مساعدة للتعديل ==========
  const addEditItem = () => setEditItems([...editItems, { product_id: '', quantity: null, unit_id: '', notes: '' }]);
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

  // ========== دوال مساعدة للنسخ ==========
  const addDuplicateItem = () => setDuplicateItems([...duplicateItems, { product_id: '', quantity: null, unit_id: '', notes: '' }]);
  const removeDuplicateItem = (index: number) => setDuplicateItems(duplicateItems.filter((_, i) => i !== index));
  const updateDuplicateItem = (index: number, field: keyof MovementItem, value: any) => {
    const newItems = [...duplicateItems];
    if (field === 'quantity') {
      const numericValue = value === '' ? null : Number(value);
      newItems[index] = { ...newItems[index], [field]: numericValue };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setDuplicateItems(newItems);
  };

  // ========== عرض معلومات التحويل ==========
  const getConversionInfo = (productId: string, unitId: string, quantity: number | null) => {
    if (!productId || !unitId || quantity === null || quantity <= 0) return null;
    const info = productInfoMap.get(productId);
    if (!info) return null;

    if (unitId === info.display_unit_id && info.pack_size > 1) {
      const convertedQty = quantity * info.pack_size;
      return (
        <div className="bg-primary/10 rounded-md p-2 text-xs border border-primary/20">
          <span className="font-semibold">🔄 تحويل تلقائي:</span>{' '}
          {quantity} {getUnitName(unitId)} = {convertedQty} {getUnitName(info.base_unit_id)}
          <span className="block text-[10px] text-muted-foreground mt-1">
            (حجم العبوة: 1 {getUnitName(info.display_unit_id)} = {info.pack_size} {getUnitName(info.base_unit_id)})
          </span>
        </div>
      );
    }
    return null;
  };

  // ========== دوال الحفظ ==========
  const handleAddSave = async () => {
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
        if (!form.unit_id) {
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

        // التحقق من الوحدة
        if (!validateProductUnitById(form.product_id, form.unit_id)) return;

        const productInfo = productInfoMap.get(form.product_id);
        if (!productInfo) return;

        // تحويل الكمية إلى الوحدة الأساسية
        const baseQuantity = convertToBaseUnit(form.product_id, form.quantity, form.unit_id);

        // التحقق من الرصيد للصادرات
        const currentStock = getCurrentStock(form.product_id, form.warehouse_id);
        if (form.type === 'out') {
          if (currentStock < baseQuantity) {
            toast({
              title: 'خطأ في الكمية',
              description: `الرصيد المتوفر في مخزن (${getWarehouseName(form.warehouse_id)}) هو (${currentStock}) فقط. لا يمكن صرف كمية أكبر.`,
              variant: 'destructive'
            });
            return;
          }
          const minQty = getProductMinQty(form.product_id);
          const newStock = currentStock - baseQuantity;
          if (newStock < minQty && minQty > 0) {
            toast({
              title: '⚠️ تحذير: مخزون أقل من الحد الأدنى',
              description: `بعد هذه العملية، سيصبح المخزون (${newStock}) وهو أقل من الحد الأدنى المحدد (${minQty}).`,
              variant: 'destructive'
            });
            // لا نمنع العملية، فقط نحذر
          }
        }

        // حفظ الحركة
        await addMovement({
          ...form,
          quantity: baseQuantity,
          unit_id: productInfo.base_unit_id,          // الوحدة الأساسية للمخزون
          display_quantity: form.quantity,            // الكمية المدخلة للعرض
          display_unit_id: form.unit_id,              // الوحدة المدخلة للعرض
        });
        const typeMsg = form.type === 'in' ? 'تم توريد للمخزن بنجاح' : 'تم تصدير حركة بنجاح';
        toast({ title: form.type === 'in' ? '✅ توريد' : '📤 تصدير', description: typeMsg });
      } else {
        // حركة متعددة
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

        // التحقق من جميع الأصناف
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (!item.product_id) {
            toast({ title: 'خطأ', description: `الصنف ${i+1}: الرجاء اختيار منتج`, variant: 'destructive' });
            return;
          }
          if (!item.unit_id) {
            toast({ title: 'خطأ', description: `الصنف ${i+1}: الرجاء اختيار الوحدة`, variant: 'destructive' });
            return;
          }
          if (item.quantity === null || item.quantity <= 0) {
            toast({ title: 'خطأ', description: `الصنف ${i+1}: الكمية يجب أن تكون أكبر من صفر`, variant: 'destructive' });
            return;
          }
          if (!validateProductUnitById(item.product_id, item.unit_id)) return;
        }

        // تحويل الأصناف
        const itemsToSave = items.map(item => {
          const baseQuantity = convertToBaseUnit(item.product_id, item.quantity, item.unit_id);
          const productInfo = productInfoMap.get(item.product_id);
          return {
            ...item,
            quantity: baseQuantity,
            unit_id: productInfo?.base_unit_id,
            display_quantity: item.quantity,
            display_unit_id: item.unit_id,
          };
        });

        // التحقق من الرصيد للصادرات
        if (multiForm.type === 'out') {
          const stockMap = getStockMapForWarehouse(multiForm.warehouse_id);
          for (const item of itemsToSave) {
            const currentStock = stockMap.get(item.product_id) || 0;
            if (currentStock < item.quantity) {
              toast({
                title: 'خطأ في الكمية',
                description: `المنتج ${getProductName(item.product_id)}: الرصيد المتوفر في المخزن هو ${currentStock} فقط.`,
                variant: 'destructive'
              });
              return;
            }
            const minQty = getProductMinQty(item.product_id);
            const newStock = currentStock - item.quantity;
            if (newStock < minQty && minQty > 0) {
              toast({
                title: '⚠️ تحذير: مخزون أقل من الحد الأدنى',
                description: `المنتج ${getProductName(item.product_id)}: بعد الصرف سيصبح المخزون (${newStock}) وهو أقل من الحد الأدنى المحدد (${minQty}).`,
                variant: 'destructive'
              });
            }
          }
        }

        await addMovement({
          type: multiForm.type,
          warehouse_id: multiForm.warehouse_id,
          entity_type: multiForm.entity_type,
          entity_id: multiForm.entity_id,
          date: multiForm.date,
          notes: multiForm.notes,
          items: itemsToSave
        });
        toast({ title: '✅ تمت الإضافة', description: `تم تسجيل حركة لـ ${items.length} منتج بنجاح` });
      }
      setAddSingleOpen(false);
      setAddMultiOpen(false);
      await refreshAll();
    } catch (error) {
      console.error('Error saving movement:', error);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء حفظ الحركة', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async () => {
    if (!editingMovement) return;
    
    setSaving(true);
    try {
      if (editType === 'single') {
        if (!editSingleForm.warehouse_id) {
          toast({ title: 'خطأ', description: 'الرجاء اختيار المخزن', variant: 'destructive' });
          return;
        }
        if (!editSingleForm.product_id) {
          toast({ title: 'خطأ', description: 'الرجاء اختيار المنتج', variant: 'destructive' });
          return;
        }
        if (!editSingleForm.unit_id) {
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
        
        if (!validateProductUnitById(editSingleForm.product_id, editSingleForm.unit_id)) return;
        
        const productInfo = productInfoMap.get(editSingleForm.product_id);
        if (!productInfo) return;
        
        const baseQuantity = convertToBaseUnit(editSingleForm.product_id, editSingleForm.quantity, editSingleForm.unit_id);
        
        await updateMovement({
          ...editingMovement,
          ...editSingleForm,
          quantity: baseQuantity,
          unit_id: productInfo.base_unit_id,
          display_quantity: editSingleForm.quantity,
          display_unit_id: editSingleForm.unit_id
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
        
        for (let i = 0; i < editItems.length; i++) {
          const item = editItems[i];
          if (!item.product_id) {
            toast({ title: 'خطأ', description: `الصنف ${i+1}: الرجاء اختيار منتج`, variant: 'destructive' });
            return;
          }
          if (!item.unit_id) {
            toast({ title: 'خطأ', description: `الصنف ${i+1}: الرجاء اختيار الوحدة`, variant: 'destructive' });
            return;
          }
          if (item.quantity === null || item.quantity <= 0) {
            toast({ title: 'خطأ', description: `الصنف ${i+1}: الكمية يجب أن تكون أكبر من صفر`, variant: 'destructive' });
            return;
          }
          if (!validateProductUnitById(item.product_id, item.unit_id)) return;
        }
        
        const itemsToSave = editItems.map(item => {
          const baseQuantity = convertToBaseUnit(item.product_id, item.quantity, item.unit_id);
          const productInfo = productInfoMap.get(item.product_id);
          return {
            ...item,
            quantity: baseQuantity,
            unit_id: productInfo?.base_unit_id,
            display_quantity: item.quantity,
            display_unit_id: item.unit_id,
          };
        });
        
        await updateMovement({
          ...editingMovement,
          ...editMultiForm,
          items: itemsToSave
        });
        toast({ title: 'تم التعديل', description: 'تم تعديل الحركة بنجاح' });
      }
      
      setEditFullOpen(false);
      setEditingMovement(null);
      await refreshAll();
    } catch (error) {
      console.error('Error updating movement:', error);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء تعديل الحركة', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicateSave = async () => {
    if (!duplicateMovement) return;
    
    setSaving(true);
    try {
      let newMovement: any;
      
      if (duplicateType === 'single') {
        if (!duplicateSingleForm.warehouse_id) {
          toast({ title: 'خطأ', description: 'الرجاء اختيار المخزن', variant: 'destructive' });
          return;
        }
        if (!duplicateSingleForm.product_id) {
          toast({ title: 'خطأ', description: 'الرجاء اختيار المنتج', variant: 'destructive' });
          return;
        }
        if (!duplicateSingleForm.unit_id) {
          toast({ title: 'خطأ', description: 'الرجاء اختيار الوحدة', variant: 'destructive' });
          return;
        }
        if (!duplicateSingleForm.entity_id) {
          const entityName = duplicateSingleForm.type === 'in' ? 'المورد' : 'جهة الصرف';
          toast({ title: 'خطأ', description: `الرجاء اختيار ${entityName}`, variant: 'destructive' });
          return;
        }
        if (duplicateSingleForm.quantity === null || duplicateSingleForm.quantity <= 0) {
          toast({ title: 'خطأ', description: 'الكمية يجب أن تكون أكبر من صفر', variant: 'destructive' });
          return;
        }
        
        if (!validateProductUnitById(duplicateSingleForm.product_id, duplicateSingleForm.unit_id)) return;
        
        const productInfo = productInfoMap.get(duplicateSingleForm.product_id);
        if (!productInfo) return;
        
        const baseQuantity = convertToBaseUnit(duplicateSingleForm.product_id, duplicateSingleForm.quantity, duplicateSingleForm.unit_id);
        
        newMovement = {
          warehouse_id: duplicateSingleForm.warehouse_id,
          type: duplicateSingleForm.type,
          entity_id: duplicateSingleForm.entity_id,
          entity_type: duplicateSingleForm.entity_type,
          date: duplicateSingleForm.date,
          notes: duplicateSingleForm.notes,
          product_id: duplicateSingleForm.product_id,
          quantity: baseQuantity,
          unit_id: productInfo.base_unit_id,
          display_quantity: duplicateSingleForm.quantity,
          display_unit_id: duplicateSingleForm.unit_id
        };
      } else {
        if (!duplicateMultiForm.warehouse_id) {
          toast({ title: 'خطأ', description: 'الرجاء اختيار المخزن', variant: 'destructive' });
          return;
        }
        if (!duplicateMultiForm.entity_id) {
          const entityName = duplicateMultiForm.type === 'in' ? 'المورد' : 'جهة الصرف';
          toast({ title: 'خطأ', description: `الرجاء اختيار ${entityName}`, variant: 'destructive' });
          return;
        }
        if (duplicateItems.length === 0) {
          toast({ title: 'خطأ', description: 'يجب إضافة صنف واحد على الأقل', variant: 'destructive' });
          return;
        }
        
        for (let i = 0; i < duplicateItems.length; i++) {
          const item = duplicateItems[i];
          if (!item.product_id) {
            toast({ title: 'خطأ', description: `الصنف ${i+1}: الرجاء اختيار منتج`, variant: 'destructive' });
            return;
          }
          if (!item.unit_id) {
            toast({ title: 'خطأ', description: `الصنف ${i+1}: الرجاء اختيار الوحدة`, variant: 'destructive' });
            return;
          }
          if (item.quantity === null || item.quantity <= 0) {
            toast({ title: 'خطأ', description: `الصنف ${i+1}: الكمية يجب أن تكون أكبر من صفر`, variant: 'destructive' });
            return;
          }
          if (!validateProductUnitById(item.product_id, item.unit_id)) return;
        }
        
        const itemsToSave = duplicateItems.map(item => {
          const baseQuantity = convertToBaseUnit(item.product_id, item.quantity, item.unit_id);
          const productInfo = productInfoMap.get(item.product_id);
          return {
            ...item,
            quantity: baseQuantity,
            unit_id: productInfo?.base_unit_id,
            display_quantity: item.quantity,
            display_unit_id: item.unit_id,
          };
        });
        
        newMovement = {
          warehouse_id: duplicateMultiForm.warehouse_id,
          type: duplicateMultiForm.type,
          entity_id: duplicateMultiForm.entity_id,
          entity_type: duplicateMultiForm.entity_type,
          date: duplicateMultiForm.date,
          notes: duplicateMultiForm.notes,
          items: itemsToSave
        };
      }
      
      await addMovement(newMovement);
      toast({ title: 'تم النسخ', description: 'تم نسخ الحركة بنجاح' });
      setDuplicateOpen(false);
      setDuplicateMovement(null);
      await refreshAll();
    } catch (error) {
      console.error('Error duplicating movement:', error);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء نسخ الحركة', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingMovement) return;
    await deleteMovement(deletingMovement.id);
    toast({ title: 'تم الحذف', description: 'تم حذف الحركة وتحديث الرصيد تلقائيًا' });
    setDeleteOpen(false);
    setDeletingMovement(null);
  };

  const handleBulkDelete = async () => {
    for (const id of Array.from(selectedItems)) await deleteMovement(id);
    toast({ title: 'تم الحذف', description: `تم حذف ${selectedItems.size} حركة بنجاح` });
    setSelectedItems(new Set());
    setBulkDeleteOpen(false);
  };

  // ========== useEffect لملء بيانات التعديل عند فتح الحوار ==========
  useEffect(() => {
    if (editingMovement && editFullOpen) {
      if (editingMovement.product_id) {
        setEditType('single');
        setEditSingleForm({
          product_id: editingMovement.product_id,
          warehouse_id: editingMovement.warehouse_id,
          type: editingMovement.type,
          quantity: editingMovement.display_quantity ?? editingMovement.quantity ?? null,
          entity_id: editingMovement.entity_id,
          entity_type: editingMovement.entity_type,
          date: editingMovement.date,
          notes: editingMovement.notes || '',
          unit_id: editingMovement.display_unit_id || editingMovement.unit_id || ''
        });
      } else if (editingMovement.items && editingMovement.items.length > 0) {
        setEditType('multi');
        setEditMultiForm({
          warehouse_id: editingMovement.warehouse_id,
          type: editingMovement.type,
          entity_id: editingMovement.entity_id,
          entity_type: editingMovement.entity_type,
          date: editingMovement.date,
          notes: editingMovement.notes || ''
        });
        setEditItems(editingMovement.items.map(item => ({
          ...item,
          quantity: item.display_quantity ?? item.quantity,
          unit_id: item.display_unit_id ?? item.unit_id,
        })));
      }
    }
  }, [editingMovement, editFullOpen]);

  // ========== useEffect لملء بيانات النسخ عند فتح الحوار ==========
  useEffect(() => {
    if (duplicateMovement && duplicateOpen) {
      if (duplicateMovement.product_id) {
        setDuplicateType('single');
        setDuplicateSingleForm({
          product_id: duplicateMovement.product_id,
          warehouse_id: duplicateMovement.warehouse_id,
          type: duplicateMovement.type,
          quantity: duplicateMovement.display_quantity ?? duplicateMovement.quantity ?? null,
          entity_id: duplicateMovement.entity_id,
          entity_type: duplicateMovement.entity_type,
          date: new Date().toISOString().split('T')[0],
          notes: duplicateMovement.notes || '',
          unit_id: duplicateMovement.display_unit_id || duplicateMovement.unit_id || ''
        });
      } else if (duplicateMovement.items && duplicateMovement.items.length > 0) {
        setDuplicateType('multi');
        setDuplicateMultiForm({
          warehouse_id: duplicateMovement.warehouse_id,
          type: duplicateMovement.type,
          entity_id: duplicateMovement.entity_id,
          entity_type: duplicateMovement.entity_type,
          date: new Date().toISOString().split('T')[0],
          notes: duplicateMovement.notes || ''
        });
        setDuplicateItems(duplicateMovement.items.map(item => ({
          ...item,
          quantity: item.display_quantity ?? item.quantity,
          unit_id: item.display_unit_id ?? item.unit_id,
        })));
      }
    }
  }, [duplicateMovement, duplicateOpen]);

  // ========== JSX ==========
  return (
    <>
      {/* حوار إضافة حركة مفردة */}
      <Dialog open={addSingleOpen} onOpenChange={setAddSingleOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>تسجيل حركة مخزون</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:gap-4 mt-2">
            {/* نوع الحركة */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">نوع الحركة</Label>
              <div className="flex gap-2">
                <button onClick={() => handleTypeChange('in')} className={`flex-1 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${form.type === 'in' ? 'bg-success text-success-foreground' : 'bg-secondary text-secondary-foreground'}`}>وارد</button>
                <button onClick={() => handleTypeChange('out')} className={`flex-1 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${form.type === 'out' ? 'bg-destructive text-destructive-foreground' : 'bg-secondary text-secondary-foreground'}`}>صادر</button>
              </div>
            </div>

            {/* المخزن */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">المخزن <span className="text-destructive">*</span></Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.warehouse_id}
                onChange={e => setForm({ ...form, warehouse_id: e.target.value })}
              >
                <option value="" disabled>اختر المخزن</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

            {/* جهة الصرف / المورد */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">
                {form.entity_type === 'supplier' ? 'المورد' : 'جهة الصرف'}
                <span className="text-destructive">*</span>
              </Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.entity_id}
                onChange={e => setForm({ ...form, entity_id: e.target.value })}
              >
                <option value="" disabled>اختر {form.entity_type === 'supplier' ? 'المورد' : 'جهة الصرف'}</option>
                {(form.entity_type === 'supplier' ? suppliers : clients).map(ent => (
                  <option key={ent.id} value={ent.id}>{ent.name}</option>
                ))}
              </select>
            </div>

            {/* التاريخ */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">التاريخ</Label>
              <Input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
              />
            </div>

            {/* المنتج */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">المنتج <span className="text-destructive">*</span></Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.product_id}
                onChange={e => setForm({ ...form, product_id: e.target.value, unit_id: '' })}
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
                  value={form.quantity === null ? '' : form.quantity}
                  onChange={e => setForm({ ...form, quantity: e.target.value === '' ? null : Number(e.target.value) })}
                  onKeyDown={preventDecimal}
                  step="1"
                  min="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">الوحدة <span className="text-destructive">*</span></Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.unit_id}
                  onChange={e => setForm({ ...form, unit_id: e.target.value })}
                  disabled={!form.product_id}
                >
                  <option value="" disabled>اختر الوحدة</option>
                  {getAvailableUnitsForProduct(form.product_id).map(unit => (
                    <option key={unit.id} value={unit.id}>{unit.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* عرض معلومات التحويل */}
            {getConversionInfo(form.product_id, form.unit_id, form.quantity)}

            {/* ملاحظات عامة */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">ملاحظات عامة</Label>
              <Input
                placeholder="أدخل ملاحظات (اختياري)"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <Button onClick={handleAddSave} disabled={saving} className="gradient-primary border-0">
              {saving ? 'جاري الحفظ...' : 'تسجيل الحركة'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* حوار إضافة حركة متعددة */}
      <Dialog open={addMultiOpen} onOpenChange={setAddMultiOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>تسجيل حركة متعددة</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:gap-4 mt-2">
            <div className="space-y-1.5">
              <Label>نوع الحركة</Label>
              <div className="flex gap-2">
                <button onClick={() => setMultiForm({ ...multiForm, type: 'in', entity_type: 'supplier', entity_id: '' })} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${multiForm.type === 'in' ? 'bg-success text-success-foreground' : 'bg-secondary'}`}>وارد</button>
                <button onClick={() => setMultiForm({ ...multiForm, type: 'out', entity_type: 'client', entity_id: '' })} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${multiForm.type === 'out' ? 'bg-destructive text-destructive-foreground' : 'bg-secondary'}`}>صادر</button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>المخزن</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={multiForm.warehouse_id} onChange={e => setMultiForm({ ...multiForm, warehouse_id: e.target.value })}>
                <option value="">اختر المخزن</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{multiForm.type === 'in' ? 'المورد' : 'جهة الصرف'}</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={multiForm.entity_id} onChange={e => setMultiForm({ ...multiForm, entity_id: e.target.value })}>
                <option value="">اختر</option>
                {(multiForm.type === 'in' ? suppliers : clients).map(ent => <option key={ent.id} value={ent.id}>{ent.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>التاريخ</Label>
              <Input type="date" value={multiForm.date} onChange={e => setMultiForm({ ...multiForm, date: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>الأصناف</Label>
              {items.map((item, idx) => {
                const availableUnits = getAvailableUnitsForProduct(item.product_id);
                return (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end border p-2 rounded-md">
                    <div className="col-span-4">
                      <select
                        className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm"
                        value={item.product_id}
                        onChange={e => updateItem(idx, 'product_id', e.target.value)}
                      >
                        <option value="">اختر منتج</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <Input type="number" placeholder="الكمية" value={item.quantity === null ? '' : item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} onKeyDown={preventDecimal} />
                    </div>
                    <div className="col-span-3">
                      <select className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm" value={item.unit_id} onChange={e => updateItem(idx, 'unit_id', e.target.value)} disabled={!item.product_id}>
                        <option value="">الوحدة</option>
                        {availableUnits.map(unit => (
                          <option key={unit.id} value={unit.id}>{unit.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <button type="button" onClick={() => removeItem(idx)} className="p-2 text-destructive"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                );
              })}
              <Button type="button" variant="outline" onClick={addItem} className="w-full"><Plus className="w-4 h-4 ml-2" />إضافة صنف</Button>
            </div>

            <div className="space-y-1.5">
              <Label>ملاحظات عامة</Label>
              <Input value={multiForm.notes} onChange={e => setMultiForm({ ...multiForm, notes: e.target.value })} />
            </div>

            <Button onClick={handleAddSave} disabled={saving} className="gradient-primary border-0">تسجيل الحركة</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* حوار تعديل الحركة */}
      <Dialog open={editFullOpen} onOpenChange={setEditFullOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل الحركة</DialogTitle>
          </DialogHeader>
          {editType === 'single' ? (
            <div className="grid gap-3 sm:gap-4 mt-2">
              {/* نوع الحركة */}
              <div className="space-y-1.5">
                <Label>نوع الحركة</Label>
                <div className="flex gap-2">
                  <button onClick={() => setEditSingleForm({ ...editSingleForm, type: 'in', entity_type: 'supplier', entity_id: '' })} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${editSingleForm.type === 'in' ? 'bg-success text-success-foreground' : 'bg-secondary'}`}>وارد</button>
                  <button onClick={() => setEditSingleForm({ ...editSingleForm, type: 'out', entity_type: 'client', entity_id: '' })} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${editSingleForm.type === 'out' ? 'bg-destructive text-destructive-foreground' : 'bg-secondary'}`}>صادر</button>
                </div>
              </div>
              {/* المخزن */}
              <div className="space-y-1.5">
                <Label>المخزن</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editSingleForm.warehouse_id} onChange={e => setEditSingleForm({ ...editSingleForm, warehouse_id: e.target.value })}>
                  <option value="">اختر المخزن</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              {/* جهة الصرف */}
              <div className="space-y-1.5">
                <Label>{editSingleForm.type === 'in' ? 'المورد' : 'جهة الصرف'}</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editSingleForm.entity_id} onChange={e => setEditSingleForm({ ...editSingleForm, entity_id: e.target.value })}>
                  <option value="">اختر</option>
                  {(editSingleForm.type === 'in' ? suppliers : clients).map(ent => <option key={ent.id} value={ent.id}>{ent.name}</option>)}
                </select>
              </div>
              {/* التاريخ */}
              <div className="space-y-1.5">
                <Label>التاريخ</Label>
                <Input type="date" value={editSingleForm.date} onChange={e => setEditSingleForm({ ...editSingleForm, date: e.target.value })} />
              </div>
              {/* المنتج */}
              <div className="space-y-1.5">
                <Label>المنتج</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editSingleForm.product_id} onChange={e => setEditSingleForm({ ...editSingleForm, product_id: e.target.value, unit_id: '' })}>
                  <option value="">اختر المنتج</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>الكمية</Label>
                  <Input type="number" value={editSingleForm.quantity === null ? '' : editSingleForm.quantity} onChange={e => setEditSingleForm({ ...editSingleForm, quantity: e.target.value === '' ? null : Number(e.target.value) })} onKeyDown={preventDecimal} />
                </div>
                <div className="space-y-1.5">
                  <Label>الوحدة</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editSingleForm.unit_id} onChange={e => setEditSingleForm({ ...editSingleForm, unit_id: e.target.value })} disabled={!editSingleForm.product_id}>
                    <option value="">اختر الوحدة</option>
                    {getAvailableUnitsForProduct(editSingleForm.product_id).map(unit => (
                      <option key={unit.id} value={unit.id}>{unit.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* ملاحظات */}
              <div className="space-y-1.5">
                <Label>ملاحظات</Label>
                <Input value={editSingleForm.notes} onChange={e => setEditSingleForm({ ...editSingleForm, notes: e.target.value })} />
              </div>
              <Button onClick={handleEditSave} disabled={saving}>حفظ التعديلات</Button>
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4 mt-2">
              {/* نوع الحركة */}
              <div className="space-y-1.5">
                <Label>نوع الحركة</Label>
                <div className="flex gap-2">
                  <button onClick={() => setEditMultiForm({ ...editMultiForm, type: 'in', entity_type: 'supplier', entity_id: '' })} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${editMultiForm.type === 'in' ? 'bg-success text-success-foreground' : 'bg-secondary'}`}>وارد</button>
                  <button onClick={() => setEditMultiForm({ ...editMultiForm, type: 'out', entity_type: 'client', entity_id: '' })} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${editMultiForm.type === 'out' ? 'bg-destructive text-destructive-foreground' : 'bg-secondary'}`}>صادر</button>
                </div>
              </div>
              {/* المخزن */}
              <div className="space-y-1.5">
                <Label>المخزن</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editMultiForm.warehouse_id} onChange={e => setEditMultiForm({ ...editMultiForm, warehouse_id: e.target.value })}>
                  <option value="">اختر المخزن</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              {/* جهة الصرف */}
              <div className="space-y-1.5">
                <Label>{editMultiForm.type === 'in' ? 'المورد' : 'جهة الصرف'}</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editMultiForm.entity_id} onChange={e => setEditMultiForm({ ...editMultiForm, entity_id: e.target.value })}>
                  <option value="">اختر</option>
                  {(editMultiForm.type === 'in' ? suppliers : clients).map(ent => <option key={ent.id} value={ent.id}>{ent.name}</option>)}
                </select>
              </div>
              {/* التاريخ */}
              <div className="space-y-1.5">
                <Label>التاريخ</Label>
                <Input type="date" value={editMultiForm.date} onChange={e => setEditMultiForm({ ...editMultiForm, date: e.target.value })} />
              </div>
              {/* الأصناف */}
              <div className="space-y-2">
                <Label>الأصناف</Label>
                {editItems.map((item, idx) => {
                  const availableUnits = getAvailableUnitsForProduct(item.product_id);
                  return (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end border p-2 rounded-md">
                      <div className="col-span-4">
                        <select className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm" value={item.product_id} onChange={e => updateEditItem(idx, 'product_id', e.target.value)}>
                          <option value="">اختر منتج</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <Input type="number" placeholder="الكمية" value={item.quantity === null ? '' : item.quantity} onChange={e => updateEditItem(idx, 'quantity', e.target.value)} onKeyDown={preventDecimal} />
                      </div>
                      <div classNa
