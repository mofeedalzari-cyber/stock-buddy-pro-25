import { useState } from 'react';
import { useWarehouse } from '@/contexts/WarehouseContext';
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Warehouse } from '@/types/warehouse';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const WarehousesPage = () => {
  const { warehouses, addWarehouse, updateWarehouse, deleteWarehouse, refreshAll } = useWarehouse();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const warehouseTypes = ['أسلحة', 'ذخيرة', 'معدات', 'عهدة شخصية', 'عام', 'احتياط'];
  const [form, setForm] = useState({ name: '', type: 'عام', location: '', manager: '', notes: '' });
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletingWarehouse, setDeletingWarehouse] = useState<Warehouse | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const openAdd = () => { setEditing(null); setForm({ name: '', type: 'عام', location: '', manager: '', notes: '' }); setDialogOpen(true); };
  const openEdit = (w: Warehouse) => { setEditing(w); setForm({ name: w.name, type: (w as any).type || 'عام', location: w.location, manager: w.manager, notes: w.notes || '' }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'تنبيه', description: 'يرجى إدخال اسم المخزن', variant: 'destructive' });
      return;
    }
    if (editing) {
      await updateWarehouse({ ...editing, ...form });
      toast({ title: 'تم التعديل', description: 'تم تعديل المخزن بنجاح' });
    } else {
      await addWarehouse(form);
      toast({ title: 'تم الإضافة', description: 'تم إضافة المخزن بنجاح' });
    }
    setDialogOpen(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
    toast({ title: 'تم التحديث', description: 'تم تحديث البيانات بنجاح' });
  };

  const confirmDelete = (w: Warehouse) => {
    setDeletingWarehouse(w);
    setDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!deletingWarehouse) return;
    const ok = await deleteWarehouse(deletingWarehouse.id);
    if (!ok) {
      toast({ title: 'لا يمكن الحذف', description: 'هذا المخزن مرتبط بمنتجات أو حركات', variant: 'destructive' });
    } else {
      toast({ title: 'تم الحذف', description: 'تم حذف المخزن بنجاح' });
    }
    setDeleteDialog(false);
    setDeletingWarehouse(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button onClick={openAdd} className="gradient-primary border-0">
          <Plus className="w-4 h-4 ml-2" />إضافة مخزن
        </Button>
        <Button onClick={handleRefresh} variant="outline" className="text-sm" disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 ml-2 ${refreshing ? 'animate-spin' : ''}`} />تحديث
        </Button>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {warehouses.map(w => (
          <div key={w.id} className="bg-card rounded-xl p-5 shadow-card border border-border hover:shadow-elevated transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-foreground text-lg">{w.name}</h3>
                <p className="text-sm text-muted-foreground">{w.location} • {w.type}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(w)} className="p-1.5 rounded-md hover:bg-primary/10 text-primary"><Pencil className="w-4 h-4" /></button>
                {isAdmin && <button onClick={() => confirmDelete(w)} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button>}
              </div>
            </div>
            <div className="text-sm text-muted-foreground">المسؤول: <span className="text-foreground">{w.manager}</span></div>
          </div>
        ))}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{editing ? 'تعديل المخزن' : 'إضافة مخزن'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 mt-2">
            <Input placeholder="اسم المخزن" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="اختر النوع" /></SelectTrigger>
              <SelectContent className="font-bold">{warehouseTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="الموقع" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            <Input placeholder="المسؤول" value={form.manager} onChange={e => setForm({ ...form, manager: e.target.value })} />
            <Input placeholder="ملاحظات" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            <Button onClick={handleSave} className="gradient-primary border-0">{editing ? 'تحديث' : 'إضافة'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle>تأكيد الحذف</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mt-2">
            هل أنت متأكد من حذف المخزن <strong>{deletingWarehouse?.name}</strong>؟ لا يمكن التراجع عن هذا الإجراء.
          </p>
          <div className="flex gap-2 mt-4">
            <Button variant="destructive" onClick={handleDelete} className="flex-1"><Trash2 className="w-4 h-4 ml-1" />حذف</Button>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>إلغاء</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WarehousesPage;
