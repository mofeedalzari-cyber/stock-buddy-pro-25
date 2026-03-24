import { useState } from 'react';
import { useWarehouse } from '@/contexts/WarehouseContext';
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Category } from '@/types/warehouse';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const CategoriesPage = () => {
  const { categories, addCategory, updateCategory, deleteCategory, refreshAll } = useWarehouse();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const allSelected = categories.length > 0 && categories.every(c => selected.has(c.id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(categories.map(c => c.id)));
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
      const ok = await deleteCategory(id);
      if (ok) deleted++; else linked++;
    }
    if (linked > 0) {
      toast({ title: 'تنبيه', description: `تم حذف ${deleted} صنف، و ${linked} صنف مرتبط بمنتجات لم يتم حذفه`, variant: 'destructive' });
    } else {
      toast({ title: 'تم الحذف', description: `تم حذف ${deleted} صنف بنجاح` });
    }
    setSelected(new Set());
    setBulkDeleteDialog(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
    toast({ title: 'تم التحديث', description: 'تم تحديث البيانات بنجاح' });
  };

  const openAdd = () => { setEditing(null); setForm({ name: '', description: '' }); setDialogOpen(true); };
  const openEdit = (c: Category) => { setEditing(c); setForm({ name: c.name, description: c.description || '' }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'تنبيه', description: 'يرجى إدخال اسم الصنف', variant: 'destructive' });
      return;
    }
    if (editing) {
      await updateCategory({ ...editing, ...form });
      toast({ title: 'تم التعديل', description: 'تم تعديل الصنف بنجاح' });
    } else {
      await addCategory(form);
      toast({ title: 'تم الإضافة', description: 'تم إضافة الصنف بنجاح' });
    }
    setDialogOpen(false);
  };

  const confirmDelete = (c: Category) => { setDeletingCategory(c); setDeleteDialog(true); };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    const ok = await deleteCategory(deletingCategory.id);
    if (!ok) {
      toast({ title: 'لا يمكن الحذف', description: 'هذا الصنف مرتبط بمنتجات موجودة', variant: 'destructive' });
    } else {
      toast({ title: 'تم الحذف', description: 'تم حذف الصنف بنجاح' });
    }
    setDeleteDialog(false);
    setDeletingCategory(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {isAdmin && categories.length > 0 && (
            <>
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              <span className="text-xs text-muted-foreground">تحديد الكل</span>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" className="text-sm" disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 ml-2 ${refreshing ? 'animate-spin' : ''}`} />تحديث
          </Button>
          {isAdmin && selected.size > 0 && (
            <Button variant="destructive" onClick={() => setBulkDeleteDialog(true)} className="text-sm">
              <Trash2 className="w-4 h-4 ml-2" />حذف المحدد ({selected.size})
            </Button>
          )}
          <Button onClick={openAdd} className="gradient-primary border-0">
            <Plus className="w-4 h-4 ml-2" />إضافة صنف
          </Button>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(c => (
          <div key={c.id} className={`bg-card rounded-xl p-5 shadow-card border border-border hover:shadow-elevated transition-shadow ${selected.has(c.id) ? 'ring-2 ring-primary/30' : ''}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-start gap-2">
                {isAdmin && <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleOne(c.id)} className="mt-1" />}
                <h3 className="font-semibold text-foreground">{c.name}</h3>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(c)} className="p-1.5 rounded-md hover:bg-primary/10 text-primary"><Pencil className="w-4 h-4" /></button>
                {isAdmin && <button onClick={() => confirmDelete(c)} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button>}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{c.description || 'بدون وصف'}</p>
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{editing ? 'تعديل الصنف' : 'إضافة صنف'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 mt-2">
            <Input placeholder="اسم الصنف" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="الوصف" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <Button onClick={handleSave} className="gradient-primary border-0">{editing ? 'تحديث' : 'إضافة'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle>تأكيد الحذف</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mt-2">
            هل أنت متأكد من حذف الصنف <strong>{deletingCategory?.name}</strong>؟ لا يمكن التراجع عن هذا الإجراء.
          </p>
          <div className="flex gap-2 mt-4">
            <Button variant="destructive" onClick={handleDelete} className="flex-1"><Trash2 className="w-4 h-4 ml-1" />حذف</Button>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>إلغاء</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDeleteDialog} onOpenChange={setBulkDeleteDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle>تأكيد حذف المحدد</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mt-2">
            هل أنت متأكد من حذف <strong>{selected.size}</strong> صنف؟ الأصناف المرتبطة بمنتجات لن يتم حذفها.
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

export default CategoriesPage;
