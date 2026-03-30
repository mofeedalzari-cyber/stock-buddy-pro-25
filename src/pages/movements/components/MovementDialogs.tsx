import { useState, useEffect, useMemo } from 'react';
import { useWarehouse } from '@/contexts/WarehouseContext';
import { Plus, X, Copy, Pencil, Trash2, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { MovementType, StockMovement, MovementItem } from '@/types/warehouse';
import { UNITS } from '../utils/movementUtils';

export interface MovementDialogsProps {
  // الدوال الأساسية
  addMovement: any;
  updateMovement: any;
  deleteMovement: any;
  getProductName: any;
  getWarehouseName: any;
  getSupplierName: any;
  getClientName: any;
  getUserName: any;
  refreshAll: any;
  products: any[];
  warehouses: any[];
  suppliers: any[];
  clients: any[];
  movements: any[];
  isAdmin: boolean;
  toast: any;
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
  // بيانات الحوارات
  editingMovement: StockMovement | null;
  setEditingMovement: (movement: StockMovement | null) => void;
  duplicateMovement: StockMovement | null;
  setDuplicateMovement: (movement: StockMovement | null) => void;
  deletingMovement: StockMovement | null;
  setDeletingMovement: (movement: StockMovement | null) => void;
  selectedItems: Set<string>;
  setSelectedItems: (items: Set<string>) => void;
  // دوال مساعدة
  validateProductUnit: (productId: string, selectedUnit: string) => boolean;
  getCurrentStock: (productId: string, warehouseId: string) => number;
  getProductMinQty: (productId: string) => number;
  getStockMapForWarehouse: (warehouseId: string) => Map<string, number>;
  preventDecimal: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  refreshAll: () => Promise<void>;
}

export const MovementDialogs: React.FC<MovementDialogsProps> = ({
  addMovement,
  updateMovement,
  deleteMovement,
  getProductName,
  getWarehouseName,
  getSupplierName,
  getClientName,
  products,
  warehouses,
  suppliers,
  clients,
  isAdmin,
  toast,
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
  validateProductUnit,
  getCurrentStock,
  getProductMinQty,
  getStockMapForWarehouse,
  preventDecimal,
  refreshAll,
}) => {
  const [saving, setSaving] = useState(false);
  const [movementType, setMovementType] = useState<'single' | 'multi'>('single');

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
    unit: ''
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
    { product_id: '', quantity: null, unit: '', notes: '' }
  ]);

  // ========== نموذج التعديل الشامل للحركة المفردة ==========
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

  // ========== نموذج التعديل الشامل للحركة المتعددة ==========
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
    unit: ''
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

  // ========== useEffect لملء بيانات التعديل عند فتح الحوار ==========
  useEffect(() => {
    if (editingMovement && editFullOpen) {
      if (editingMovement.product_id) {
        setEditType('single');
        setEditSingleForm({
          product_id: editingMovement.product_id,
          warehouse_id: editingMovement.warehouse_id,
          type: editingMovement.type,
          quantity: editingMovement.quantity ?? null,
          entity_id: editingMovement.entity_id,
          entity_type: editingMovement.entity_type,
          date: editingMovement.date,
          notes: editingMovement.notes || '',
          unit: editingMovement.unit || ''
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
        setEditItems(editingMovement.items.map(item => ({ ...item })));
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
          quantity: duplicateMovement.quantity ?? null,
          entity_id: duplicateMovement.entity_id,
          entity_type: duplicateMovement.entity_type,
          date: new Date().toISOString().split('T')[0],
          notes: duplicateMovement.notes || '',
          unit: duplicateMovement.unit || ''
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
        setDuplicateItems(duplicateMovement.items.map(item => ({ ...item, quantity: item.quantity })));
      }
    }
  }, [duplicateMovement, duplicateOpen]);

  // ========== دوال مساعدة للإضافة ==========
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

  // ========== دوال مساعدة للتعديل ==========
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

  // ========== دوال مساعدة للنسخ ==========
  const addDuplicateItem = () => setDuplicateItems([...duplicateItems, { product_id: '', quantity: null, unit: '', notes: '' }]);
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

        await addMovement({ ...form, quantity: form.quantity });
        toast({ title: '✅ توريد', description: 'تم توريد للمخزن بنجاح' });
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

        if (multiForm.type === 'out') {
          const stockMap = getStockMapForWarehouse(multiForm.warehouse_id);
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

        const itemsToSave = items.map(item => ({ ...item, quantity: Number(item.quantity) }));
        await addMovement({
          type: multiForm.type,
          warehouse_id: multiForm.warehouse_id,
          entity_type: multiForm.entity_type,
          entity_id: multiForm.entity_id,
          date: multiForm.date,
          notes: multiForm.notes,
          items: itemsToSave
        });
        toast({ title: '✅ توريد', description: `تم توريد ${items.length} منتج للمخزن بنجاح` });
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
        
        if (!validateProductUnit(editSingleForm.product_id, editSingleForm.unit)) return;
        
        const currentStock = getCurrentStock(editSingleForm.product_id, editSingleForm.warehouse_id);
        if (editSingleForm.type === 'out') {
          const originalMovement = editingMovement;
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
          ...editingMovement,
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
        
        if (editMultiForm.type === 'out') {
          const stockMap = getStockMapForWarehouse(editMultiForm.warehouse_id);
          const originalMovement = editingMovement;
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
          ...editingMovement,
          ...editMultiForm,
          items: editItems.map(item => ({ ...item, quantity: Number(item.quantity) }))
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
        if (!duplicateSingleForm.unit) {
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
        
        if (!validateProductUnit(duplicateSingleForm.product_id, duplicateSingleForm.unit)) return;
        
        newMovement = {
          warehouse_id: duplicateSingleForm.warehouse_id,
          type: duplicateSingleForm.type,
          entity_id: duplicateSingleForm.entity_id,
          entity_type: duplicateSingleForm.entity_type,
          date: duplicateSingleForm.date,
          notes: duplicateSingleForm.notes,
          product_id: duplicateSingleForm.product_id,
          quantity: duplicateSingleForm.quantity,
          unit: duplicateSingleForm.unit
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
        
        newMovement = {
          warehouse_id: duplicateMultiForm.warehouse_id,
          type: duplicateMultiForm.type,
          entity_id: duplicateMultiForm.entity_id,
          entity_type: duplicateMultiForm.entity_type,
          date: duplicateMultiForm.date,
          notes: duplicateMultiForm.notes,
          items: duplicateItems.map(item => ({ ...item, quantity: Number(item.quantity) }))
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

  // ========== دوال فتح الحوارات (تستخدم من المكون الأب) ==========
  // هذه الدوال تم تمريرها من MovementsPage، لا نحتاج لتعريفها هنا
  // فقط نستخدمها في الحوارات

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
                onChange={e => setForm({ ...form, product_id: e.target.value })}
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
                  value={form.unit}
                  onChange={e => setForm({ ...form, unit: e.target.value })}
                >
                  <option value="" disabled>اختر الوحدة</option>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            {/* ✅ عرض معلومات حجم العبوة إذا كانت الوحدة كرتون */}
            {form.unit === 'كرتون' && form.product_id && (
              <div className="bg-muted/30 rounded-md p-2 text-xs">
                <span className="font-semibold">ℹ️ معلومات العبوة:</span>{' '}
                {(() => {
                  const product = products.find(p => p.id === form.product_id);
                  const packSize = product?.pack_size || 1;
                  return `1 كرتون = ${packSize} قطعة`;
                })()}
              </div>
            )}

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
            <DialogTitle>تسجيل حركة تعيين (متعددة المنتجات)</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:gap-4 mt-2">
            {/* نوع الحركة */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">نوع الحركة</Label>
              <div className="flex gap-2">
                <button onClick={() => handleTypeChange('in')} className={`flex-1 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${multiForm.type === 'in' ? 'bg-success text-success-foreground' : 'bg-secondary text-secondary-foreground'}`}>وارد</button>
                <button onClick={() => handleTypeChange('out')} className={`flex-1 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${multiForm.type === 'out' ? 'bg-destructive text-destructive-foreground' : 'bg-secondary text-secondary-foreground'}`}>صادر</button>
              </div>
            </div>

            {/* المخزن */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">المخزن <span className="text-destructive">*</span></Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={multiForm.warehouse_id}
                onChange={e => setMultiForm({ ...multiForm, warehouse_id: e.target.value })}
              >
                <option value="" disabled>اختر المخزن</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

            {/* جهة الصرف / المورد */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">
                {multiForm.entity_type === 'supplier' ? 'المورد' : 'جهة الصرف'}
                <span className="text-destructive">*</span>
              </Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={multiForm.entity_id}
                onChange={e => setMultiForm({ ...multiForm, entity_id: e.target.value })}
              >
                <option value="" disabled>اختر {multiForm.entity_type === 'supplier' ? 'المورد' : 'جهة الصرف'}</option>
                {(multiForm.entity_type === 'supplier' ? suppliers : clients).map(ent => (
                  <option key={ent.id} value={ent.id}>{ent.name}</option>
                ))}
              </select>
            </div>

            {/* التاريخ */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">التاريخ</Label>
              <Input
                type="date"
                value={multiForm.date}
                onChange={e => setMultiForm({ ...multiForm, date: e.target.value })}
              />
            </div>

            {/* الأصناف */}
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">الأصناف <span className="text-destructive">*</span></Label>
              <div className="border rounded-md p-2">
                {/* عرض الجوال */}
                <div className="sm:hidden space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="border rounded-md p-2 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">صنف {index + 1}</span>
                        <button onClick={() => removeItem(index)} className="text-destructive">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-2">
                        <select
                          value={item.product_id}
                          onChange={(e) => updateItem(index, 'product_id', e.target.value)}
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
                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                            onKeyDown={preventDecimal}
                            step="1"
                            min="0"
                          />
                          <select
                            value={item.unit}
                            onChange={(e) => updateItem(index, 'unit', e.target.value)}
                            className="p-2 border rounded text-sm"
                          >
                            <option value="" disabled>اختر الوحدة</option>
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                        <Input
                          placeholder="ملاحظات (اختياري)"
                          value={item.notes || ''}
                          onChange={(e) => updateItem(index, 'notes', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* عرض سطح المكتب */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="p-1 text-right">المنتج <span className="text-destructive">*</span></th>
                        <th className="p-1 text-right">الكمية <span className="text-destructive">*</span></th>
                        <th className="p-1 text-right">الوحدة <span className="text-destructive">*</span></th>
                        <th className="p-1 text-right">ملاحظات</th>
                        <th className="p-1"></th>
                        </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-1">
                            <select
                              value={item.product_id}
                              onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                              className="w-full p-1 border rounded text-sm"
                            >
                              <option value="" disabled>اختر المنتج</option>
                              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                           </td>
                          <td className="p-1">
                            <Input
                              type="number"
                              value={item.quantity === null ? '' : item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                              onKeyDown={preventDecimal}
                              step="1"
                              min="0"
                              className="w-20"
                            />
                           </td>
                          <td className="p-1">
                            <select
                              value={item.unit}
                              onChange={(e) => updateItem(index, 'unit', e.target.value)}
                              className="w-20 p-1 border rounded text-sm"
                            >
                              <option value="" disabled>اختر الوحدة</option>
                              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                           </td>
                          <td className="p-1">
                            <Input
                              value={item.notes || ''}
                              onChange={(e) => updateItem(index, 'notes', e.target.value)}
                              placeholder="ملاحظة"
                              className="w-32"
                            />
                           </td>
                          <td className="p-1">
                            <button onClick={() => removeItem(index)} className="text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </button>
                           </td>
                         </td>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Button onClick={addItem} variant="outline" size="sm" className="mt-2 w-full sm:w-auto">
                  <Plus className="w-4 h-4 ml-1" /> إضافة صنف
                </Button>
              </div>
            </div>

            {/* ملاحظات عامة */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">ملاحظات عامة</Label>
              <Input
                placeholder="أدخل ملاحظات (اختياري)"
                value={multiForm.notes}
                onChange={e => setMultiForm({ ...multiForm, notes: e.target.value })}
              />
            </div>

            <Button onClick={handleAddSave} disabled={saving} className="gradient-primary border-0">
              {saving ? 'جاري الحفظ...' : 'تسجيل الحركة'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* حوار تعديل شامل */}
      <Dialog open={editFullOpen} onOpenChange={setEditFullOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              تعديل الحركة {editingMovement?.type === 'in' ? '(وارد)' : '(صادر)'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-3 sm:gap-4 mt-2">
            {/* نوع الحركة */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">نوع الحركة</Label>
              <div className="flex gap-2">
                <button 
                  onClick={() => editType === 'single' 
                    ? setEditSingleForm({ ...editSingleForm, type: 'in', entity_type: 'supplier', entity_id: '' })
                    : setEditMultiForm({ ...editMultiForm, type: 'in', entity_type: 'supplier', entity_id: '' })
                  }
                  className={`flex-1 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                    (editType === 'single' ? editSingleForm.type : editMultiForm.type) === 'in' 
                      ? 'bg-success text-success-foreground' : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  وارد
                </button>
                <button 
                  onClick={() => editType === 'single' 
                    ? setEditSingleForm({ ...editSingleForm, type: 'out', entity_type: 'client', entity_id: '' })
                    : setEditMultiForm({ ...editMultiForm, type: 'out', entity_type: 'client', entity_id: '' })
                  }
                  className={`flex-1 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                    (editType === 'single' ? editSingleForm.type : editMultiForm.type) === 'out' 
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
                value={editType === 'single' ? editSingleForm.warehouse_id : editMultiForm.warehouse_id}
                onChange={e => editType === 'single' 
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
                {editType === 'single' 
                  ? (editSingleForm.entity_type === 'supplier' ? 'المورد' : 'جهة الصرف')
                  : (editMultiForm.entity_type === 'supplier' ? 'المورد' : 'جهة الصرف')
                }
                <span className="text-destructive">*</span>
              </Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editType === 'single' ? editSingleForm.entity_id : editMultiForm.entity_id}
                onChange={e => editType === 'single'
                  ? setEditSingleForm({ ...editSingleForm, entity_id: e.target.value })
                  : setEditMultiForm({ ...editMultiForm, entity_id: e.target.value })
                }
              >
                <option value="" disabled>اختر {editType === 'single' 
                  ? (editSingleForm.entity_type === 'supplier' ? 'المورد' : 'جهة الصرف')
                  : (editMultiForm.entity_type === 'supplier' ? 'المورد' : 'جهة الصرف')
                }</option>
                {(editType === 'single' 
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
                value={editType === 'single' ? editSingleForm.date : editMultiForm.date}
                onChange={e => editType === 'single'
                  ? setEditSingleForm({ ...editSingleForm, date: e.target.value })
                  : setEditMultiForm({ ...editMultiForm, date: e.target.value })
                }
              />
            </div>

            {/* حقول الحركة المفردة */}
            {editType === 'single' && (
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
            {editType === 'multi' && (
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
                value={editType === 'single' ? editSingleForm.notes : editMultiForm.notes}
                onChange={e => editType === 'single'
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

      {/* حوار نسخ الحركة */}
      <Dialog open={duplicateOpen} onOpenChange={setDuplicateOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              نسخ الحركة {duplicateMovement?.type === 'in' ? '(وارد)' : '(صادر)'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-3 sm:gap-4 mt-2">
            {/* نوع الحركة */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">نوع الحركة</Label>
              <div className="flex gap-2">
                <button 
                  onClick={() => duplicateType === 'single' 
                    ? setDuplicateSingleForm({ ...duplicateSingleForm, type: 'in', entity_type: 'supplier', entity_id: '' })
                    : setDuplicateMultiForm({ ...duplicateMultiForm, type: 'in', entity_type: 'supplier', entity_id: '' })
                  }
                  className={`flex-1 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                    (duplicateType === 'single' ? duplicateSingleForm.type : duplicateMultiForm.type) === 'in' 
                      ? 'bg-success text-success-foreground' : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  وارد
                </button>
                <button 
                  onClick={() => duplicateType === 'single' 
                    ? setDuplicateSingleForm({ ...duplicateSingleForm, type: 'out', entity_type: 'client', entity_id: '' })
                    : setDuplicateMultiForm({ ...duplicateMultiForm, type: 'out', entity_type: 'client', entity_id: '' })
                  }
                  className={`flex-1 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                    (duplicateType === 'single' ? duplicateSingleForm.type : duplicateMultiForm.type) === 'out' 
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
                value={duplicateType === 'single' ? duplicateSingleForm.warehouse_id : duplicateMultiForm.warehouse_id}
                onChange={e => duplicateType === 'single' 
                  ? setDuplicateSingleForm({ ...duplicateSingleForm, warehouse_id: e.target.value })
                  : setDuplicateMultiForm({ ...duplicateMultiForm, warehouse_id: e.target.value })
                }
              >
                <option value="" disabled>اختر المخزن</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

            {/* جهة الصرف / المورد */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">
                {duplicateType === 'single' 
                  ? (duplicateSingleForm.entity_type === 'supplier' ? 'المورد' : 'جهة الصرف')
                  : (duplicateMultiForm.entity_type === 'supplier' ? 'المورد' : 'جهة الصرف')
                }
                <span className="text-destructive">*</span>
              </Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={duplicateType === 'single' ? duplicateSingleForm.entity_id : duplicateMultiForm.entity_id}
                onChange={e => duplicateType === 'single'
                  ? setDuplicateSingleForm({ ...duplicateSingleForm, entity_id: e.target.value })
                  : setDuplicateMultiForm({ ...duplicateMultiForm, entity_id: e.target.value })
                }
              >
                <option value="" disabled>اختر {duplicateType === 'single' 
                  ? (duplicateSingleForm.entity_type === 'supplier' ? 'المورد' : 'جهة الصرف')
                  : (duplicateMultiForm.entity_type === 'supplier' ? 'المورد' : 'جهة الصرف')
                }</option>
                {(duplicateType === 'single' 
                  ? (duplicateSingleForm.entity_type === 'supplier' ? suppliers : clients)
                  : (duplicateMultiForm.entity_type === 'supplier' ? suppliers : clients)
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
                value={duplicateType === 'single' ? duplicateSingleForm.date : duplicateMultiForm.date}
                onChange={e => duplicateType === 'single'
                  ? setDuplicateSingleForm({ ...duplicateSingleForm, date: e.target.value })
                  : setDuplicateMultiForm({ ...duplicateMultiForm, date: e.target.value })
                }
              />
            </div>

            {/* حقول الحركة المفردة */}
            {duplicateType === 'single' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm">المنتج <span className="text-destructive">*</span></Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={duplicateSingleForm.product_id}
                    onChange={e => setDuplicateSingleForm({ ...duplicateSingleForm, product_id: e.target.value })}
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
                      value={duplicateSingleForm.quantity === null ? '' : duplicateSingleForm.quantity}
                      onChange={e => setDuplicateSingleForm({ ...duplicateSingleForm, quantity: e.target.value === '' ? null : Number(e.target.value) })}
                      onKeyDown={preventDecimal}
                      step="1"
                      min="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs sm:text-sm">الوحدة <span className="text-destructive">*</span></Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={duplicateSingleForm.unit}
                      onChange={e => setDuplicateSingleForm({ ...duplicateSingleForm, unit: e.target.value })}
                    >
                      <option value="" disabled>اختر الوحدة</option>
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* حقول الحركة المتعددة */}
            {duplicateType === 'multi' && (
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">الأصناف <span className="text-destructive">*</span></Label>
                <div className="border rounded-md p-2">
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {duplicateItems.map((item, index) => (
                      <div key={index} className="border rounded-md p-2 space-y-2 bg-background">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">صنف {index + 1}</span>
                          <button onClick={() => removeDuplicateItem(index)} className="text-destructive">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <select
                            value={item.product_id}
                            onChange={(e) => updateDuplicateItem(index, 'product_id', e.target.value)}
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
                              onChange={(e) => updateDuplicateItem(index, 'quantity', e.target.value)}
                              onKeyDown={preventDecimal}
                              step="1"
                              min="0"
                            />
                            <select
                              value={item.unit}
                              onChange={(e) => updateDuplicateItem(index, 'unit', e.target.value)}
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
                          onChange={(e) => updateDuplicateItem(index, 'notes', e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                  <Button onClick={addDuplicateItem} variant="outline" size="sm" className="mt-2 w-full">
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
                value={duplicateType === 'single' ? duplicateSingleForm.notes : duplicateMultiForm.notes}
                onChange={e => duplicateType === 'single'
                  ? setDuplicateSingleForm({ ...duplicateSingleForm, notes: e.target.value })
                  : setDuplicateMultiForm({ ...duplicateMultiForm, notes: e.target.value })
                }
              />
            </div>

            <Button onClick={handleDuplicateSave} disabled={saving} className="gradient-primary border-0">
              {saving ? 'جاري النسخ...' : 'تأكيد النسخ'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* حوار تأكيد الحذف الفردي */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle>تأكيد حذف الحركة</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mt-2">
            هل أنت متأكد من حذف هذه الحركة؟ سيتم تحديث رصيد المنتج تلقائيًا. لا يمكن التراجع عن هذا الإجراء.
          </p>
          <div className="flex gap-2 mt-4">
            <Button variant="destructive" onClick={handleDelete} className="flex-1"><Trash2 className="w-4 h-4 ml-1" />حذف</Button>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>إلغاء</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* حوار الحذف الجماعي */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle>تأكيد الحذف الجماعي</DialogTitle></DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              هل أنت متأكد من حذف <strong>{selectedItems.size}</strong> حركات مختارة؟ سيتم تحديث رصيد المنتجات تلقائياً.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="destructive" onClick={handleBulkDelete} className="flex-1">تأكيد الحذف</Button>
            <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>إلغاء</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
