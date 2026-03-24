import { useState } from 'react';
import { useWarehouse } from '@/contexts/WarehouseContext';
import { Plus, Pencil, Trash2, Search, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Client } from '@/types/warehouse';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const ClientsPage = () => {
  const { clients, addClient, updateClient, deleteClient, refreshAll } = useWarehouse();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '' });
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const filtered = clients.filter(c => c.name.includes(search) || c.phone.includes(search));

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
    toast({ title: 'تم التحديث', description: 'تم تحديث البيانات بنجاح' });
  };

  const allSelected = filtered.length > 0 && filtered.every(c => selected.has(c.id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map(c => c.id)));
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
      const ok = await deleteClient(id);
      if (ok) deleted++; else linked++;
    }
    if (linked > 0) {
      toast({ title: 'تنبيه', description: `تم حذف ${deleted} جهة صرف، و ${linked} جهة مرتبطة بحركات مخزون لم يتم حذفها`, variant: 'destructive' });
    } else {
      toast({ title: 'تم الحذف', description: `تم حذف ${deleted} جهة صرف بنجاح` });
    }
    setSelected(new Set());
    setBulkDeleteDialog(false);
  };

  const openAdd = () => { setEditing(null); setForm({ name: '', phone: '', address: '', notes: '' }); setDialogOpen(true); };
  const openEdit = (c: Client) => { setEditing(c); setForm({ name: c.name, phone: c.phone, address: c.address, notes: c.notes || '' }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'تنبيه', description: 'يرجى إدخال جميع البيانات المطلوبة', variant: 'destructive' });
      return;
    }
    if (editing) {
      await updateClient({ ...editing, ...form });
      toast({ title: 'تم التعديل', description: 'تم تعديل بيانات جهة الصرف بنجاح' });
    } else {
      await addClient(form);
      toast({ title: 'تم الإضافة', description: 'تم إضافة جهة الصرف بنجاح' });
    }
    setDialogOpen(false);
  };

  const confirmDelete = (c: Client) => { setDeletingClient(c); setDeleteDialog(true); };

  const handleDelete = async () => {
    if (!deletingClient) return;
    const ok = await deleteClient(deletingClient.id);
    if (!ok) {
      toast({ title: 'لا يمكن الحذف', description: 'جهة الصرف مرتبطة بحركات مخزون', variant: 'destructive' });
    } else {
      toast({ title: 'تم الحذف', description: 'تم حذف جهة الصرف بنجاح' });
    }
    setDeleteDialog(false);
    setDeletingClient(null);
  };

  const MobileCard = ({ c }: { c: Client }) => (
    <div className="bg-card rounded-xl p-3 border border-border shadow-card space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          {isAdmin && <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleOne(c.id)} className="mt-1" />}
          <div>
            <div className="font-medium text-sm text-foreground">{c.name}</div>
            <div className="text-xs text-muted-foreground" dir="ltr">{c.phone}</div>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => openEdit(c)} className="p-1.5 rounded-md hover:bg-primary/10 text-primary"><Pencil className="w-3.5 h-3.5" /></button>
          {isAdmin && <button onClick={() => confirmDelete(c)} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>}
        </div>
      </div>
      {c.address && <div className="text-xs text-muted-foreground">{c.address}</div>}
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
          <Button onClick={openAdd} className="gradient-primary border-0 flex-1 sm:flex-none text-sm"><Plus className="w-4 h-4 ml-2" />إضافة جهة صرف</Button>
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
        {filtered.map(c => <MobileCard key={c.id} c={c} />)}
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
                <th className="text-right p-3 font-semibold text-foreground hidden md:table-cell">العنوان</th>
                <th className="text-center p-3 font-semibold text-foreground">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className={`border-b border-border last:border-0 hover:bg-secondary/30 transition-colors ${selected.has(c.id) ? 'bg-primary/5' : ''}`}>
                  {isAdmin && <td className="p-3"><Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleOne(c.id)} /></td>}
                  <td className="p-3 text-foreground font-medium">{c.name}</td>
                  <td className="p-3 text-muted-foreground" dir="ltr">{c.phone}</td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">{c.address}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-md hover:bg-primary/10 text-primary"><Pencil className="w-4 h-4" /></button>
                      {isAdmin && <button onClick={() => confirmDelete(c)} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={isAdmin ? 5 : 4} className="p-8 text-center text-muted-foreground">لا توجد بيانات</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle className="text-base sm:text-lg">{editing ? 'تعديل جهة الصرف' : 'إضافة جهة صرف'}</DialogTitle></DialogHeader>
          <div className="grid gap-3 mt-2">
            <div className="space-y-1.5"><Label className="text-xs sm:text-sm">اسم الجهة</Label><Input placeholder="اسم الجهة" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs sm:text-sm">رقم الهاتف</Label><Input placeholder="رقم الهاتف" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
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
            هل أنت متأكد من حذف جهة الصرف <strong>{deletingClient?.name}</strong>؟ لا يمكن التراجع عن هذا الإجراء.
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
            هل أنت متأكد من حذف <strong>{selected.size}</strong> جهة صرف؟ الجهات المرتبطة بحركات مخزون لن يتم حذفها.
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

export default ClientsPage;
