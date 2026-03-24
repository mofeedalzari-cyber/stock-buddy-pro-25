import { useState } from 'react';
import { useWarehouse } from '@/contexts/WarehouseContext';
import { Plus, Pencil, Trash2, Search, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Supplier } from '@/types/warehouse';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const SuppliersPage = () => {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, refreshAll } = useWarehouse();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' });
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const filtered = suppliers.filter(s => s.name.includes(search) || s.phone.includes(search));

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
    toast({ title: 'تم التحديث', description: 'تم تحديث البيانات بنجاح' });
  };

  const allSelected = filtered.length > 0 && filtered.every(s => selected.has(s.id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map(s => s.id)));
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
      const ok = await deleteSupplier(id);
      if (ok) deleted++; else linked++;
    }
    if (linked > 0) {
      toast({ title: 'تنبيه', description: `تم حذف ${deleted} مورد، و ${linked} مورد مرتبط بحركات مخزون لم يتم حذفه`, variant: 'destructive' });
    } else {
      toast({ title: 'تم الحذف', description: `تم حذف ${deleted} مورد بنجاح` });
    }
    setSelected(new Set());
    setBulkDeleteDialog(false);
  };

  const openAdd = () => { setEditing(null); setForm({ name: '', phone: '', email: '', address: '', notes: '' }); setDialogOpen(true); };
  const openEdit = (s: Supplier) => { setEditing(s); setForm({ name: s.name, phone: s.phone, email: s.email, address: s.address, notes: s.notes || '' }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'تنبيه', description: 'يرجى إدخال جميع البيانات المطلوبة', variant: 'destructive' });
      return;
    }
    if (editing) {
      await updateSupplier({ ...editing, ...form });
      toast({ title: 'تم التعديل', description: 'تم تعديل بيانات المورد بنجاح' });
    } else {
      await addSupplier(form);
      toast({ title: 'تم الإضافة', description: 'تم إضافة المورد بنجاح' });
    }
    setDialogOpen(false);
  };

  const confirmDelete = (s: Supplier) => { setDeletingSupplier(s); setDeleteDialog(true); };

  const handleDelete = async () => {
    if (!deletingSupplier) return;
    const ok = await deleteSupplier(deletingSupplier.id);
    if (!ok) {
      toast({ title: 'لا يمكن الحذف', description: 'هذا المورد مرتبط بحركات مخزون', variant: 'destructive' });
    } else {
      toast({ title: 'تم الحذف', description: 'تم حذف المورد بنجاح' });
    }
    setDeleteDialog(false);
    setDeletingSupplier(null);
  };

  const MobileCard = ({ s }: { s: Supplier }) => (
    <div className="bg-card rounded-xl p-3 border border-border shadow-card space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          {isAdmin && <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggleOne(s.id)} className="mt-1" />}
          <div>
            <div className="font-medium text-sm text-foreground">{s.name}</div>
            <div className="text-xs text-muted-foreground" dir="ltr">{s.phone}</div>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => openEdit(s)} className="p-1.5 rounded-md hover:bg-primary/10 text-primary"><Pencil className="w-3.5 h-3.5" /></button>
          {isAdmin && <button onClick={() => confirmDelete(s)} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>}
        </div>
      </div>
      {(s.email || s.address) && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {s.email && <span dir="ltr">{s.email}</span>}
          {s.address && <span>{s.address}</span>}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 text-sm" />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" className="text-sm" disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 ml-2 ${refreshing ? 'animate-spin' : ''}`} />تحديث
          </Button>
          <Button onClick={openAdd} className="gradient-primary border-0 flex-1 sm:flex-none text-sm"><Plus className="w-4 h-4 ml-2" />إضافة مورد</Button>
          {isAdmin && selected.size > 0 && (
            <Button variant="destructive" onClick={() => setBulkDeleteDialog(true)} className="text-sm">
              <Trash2 className="w-4 h-4 ml-2" />حذف المحدد ({selected.size})
            </Button>
          )}
        </div>
      </div>

      <div className="sm:hidden space-y-2">
        {isAdmin && filtered.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
            <span className="text-xs text-muted-foreground">تحديد الكل</span>
          </div>
        )}
        {filtered.map(s => <MobileCard key={s.id} s={s} />)}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">لا توجد بيانات</p>}
      </div>

      <div className="hidden sm:block bg-card rounded-xl shadow-card border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                {isAdmin && <th className="p-3 w-10"><Checkbox checked={allSelected} onCheckedChange={toggleAll} /></th>}
                <th className="text-right p-3 font-semibold text-foreground">الاسم</th>
                <th className="text-right p-3 font-semibold text-foreground">الهاتف</th>
                <th className="text-right p-3 font-semibold text-foreground hidden md:table-cell">البريد</th>
                <th className="text-right p-3 font-semibold text-foreground hidden lg:table-cell">العنوان</th>
                <th className="text-center p-3 font-semibold text-foreground">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className={`border-b border-border last:border-0 hover:bg-secondary/30 transition-colors ${selected.has(s.id) ? 'bg-primary/5' : ''}`}>
                  {isAdmin && <td className="p-3"><Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggleOne(s.id)} /></td>}
                  <td className="p-3 text-foreground font-medium">{s.name}</td>
                  <td className="p-3 text-muted-foreground" dir="ltr">{s.phone}</td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell" dir="ltr">{s.email}</td>
                  <td className="p-3 text-muted-foreground hidden lg:table-cell">{s.address}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded-md hover:bg-primary/10 text-primary"><Pencil className="w-4 h-4" /></button>
                      {isAdmin && <button onClick={() => confirmDelete(s)} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={isAdmin ? 6 : 5} className="p-8 text-center text-muted-foreground">لا توجد بيانات</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle className="text-base sm:text-lg">{editing ? 'تعديل المورد' : 'إضافة مورد'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 mt-2">
            <div className="space-y-1.5"><Label className="text-xs sm:text-sm">اسم المورد</Label><Input placeholder="اسم المورد" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs sm:text-sm">رقم الهاتف</Label><Input placeholder="رقم الهاتف" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs sm:text-sm">البريد الإلكتروني</Label><Input placeholder="البريد الإلكتروني" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs sm:text-sm">العنوان</Label><Input placeholder="العنوان" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs sm:text-sm">ملاحظات</Label><Input placeholder="ملاحظات" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <Button onClick={handleSave} className="gradient-primary border-0 text-sm">{editing ? 'تحديث' : 'إضافة'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-sm" dir="rtl">
          <DialogHeader><DialogTitle>تأكيد الحذف</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mt-2">
            هل أنت متأكد من حذف المورد <strong>{deletingSupplier?.name}</strong>؟ لا يمكن التراجع عن هذا الإجراء.
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
            هل أنت متأكد من حذف <strong>{selected.size}</strong> مورد؟ الموردون المرتبطون بحركات مخزون لن يتم حذفهم.
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

export default SuppliersPage;
