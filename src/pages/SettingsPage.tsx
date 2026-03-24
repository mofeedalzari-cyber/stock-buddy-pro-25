import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Globe, Moon, Sun, Info, LogOut, Shield, Users, Pencil, Trash2, Save, UserCog, Download, Upload, Mail, Lock, UserPlus } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { useAuth } from '@/contexts/AuthContext';
import { useWarehouse } from '@/contexts/WarehouseContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DeveloperFooter from '@/components/DeveloperFooter';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  user_id: string;
  display_name: string;
  role: 'admin' | 'employee';
}

const SettingsPage = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });
  const { signOut, user, role, displayName, isAdmin } = useAuth();
  const { products, categories, warehouses, suppliers, clients, movements, refreshAll } = useWarehouse();
  const { toast } = useToast();
  const { t, language, setLanguage: setAppLanguage, dir } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'employee'>('employee');
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  const [restoreDialog, setRestoreDialog] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  // Employee creation states
  const [addEmployeeDialog, setAddEmployeeDialog] = useState(false);
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpPassword, setNewEmpPassword] = useState('');
  const [newEmpName, setNewEmpName] = useState('');
  const [creatingEmployee, setCreatingEmployee] = useState(false);

  const [editSelf, setEditSelf] = useState(false);
  const [selfName, setSelfName] = useState(displayName);
  const [selfEmail, setSelfEmail] = useState(user?.email || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingSelf, setSavingSelf] = useState(false);

  useEffect(() => { 
    setSelfName(displayName); 
    setSelfEmail(user?.email || ''); 
  }, [displayName, user?.email]);

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const changeLanguage = (lang: 'ar' | 'en') => {
    setAppLanguage(lang);
  };

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from('profiles' as any).select('user_id, display_name'),
      supabase.from('user_roles' as any).select('user_id, role'),
    ]);
    if (profilesRes.error || rolesRes.error) {
      toast({ title: 'خطأ', description: 'تعذر مزامنة بيانات المستخدمين', variant: 'destructive' });
      setLoadingUsers(false);
      return;
    }
    const profiles = (profilesRes.data ?? []) as any[];
    const roles = (rolesRes.data ?? []) as any[];
    const merged: UserProfile[] = profiles.map((p) => ({
      user_id: p.user_id,
      display_name: p.display_name,
      role: (roles.find((r: any) => r.user_id === p.user_id)?.role as 'admin' | 'employee') || 'employee',
    }));
    setUsers(merged);
    setLoadingUsers(false);
  }, [isAdmin, toast]);

  useEffect(() => {
    if (!isAdmin) return;
    void fetchUsers();
    const channel = supabase
      .channel('settings-users-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => void fetchUsers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, () => void fetchUsers())
      .subscribe();
    const interval = window.setInterval(() => void fetchUsers(), 15000);
    return () => { supabase.removeChannel(channel); window.clearInterval(interval); };
  }, [isAdmin, fetchUsers]);

  const handleEditUser = (u: UserProfile) => {
    setEditingUser(u); setEditName(u.display_name); setEditRole(u.role); setEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    const { error: nameErr } = await supabase.from('profiles' as any).update({ display_name: editName } as any).eq('user_id', editingUser.user_id);
    if (nameErr) { toast({ title: 'خطأ', description: 'فشل تعديل الاسم', variant: 'destructive' }); return; }
    const { error: roleErr } = await supabase.rpc('admin_update_role', { _user_id: editingUser.user_id, _role: editRole });
    if (roleErr) { toast({ title: 'خطأ', description: 'فشل تعديل الصلاحية', variant: 'destructive' }); return; }
    toast({ title: 'تم التعديل بنجاح' });
    setEditDialog(false);
    fetchUsers();
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    const { error } = await supabase.rpc('admin_delete_user', { _user_id: deletingUser.user_id });
    if (error) { toast({ title: 'خطأ', description: error.message, variant: 'destructive' }); }
    else { toast({ title: 'تم حذف المستخدم بنجاح' }); fetchUsers(); }
    setDeleteDialog(false);
  };

  const handleSaveSelf = async () => {
    if (!user) return;
    setSavingSelf(true);

    const { error: nameErr } = await supabase.from('profiles' as any).update({ display_name: selfName } as any).eq('user_id', user.id);
    if (nameErr) { toast({ title: 'خطأ', description: 'فشل تعديل الاسم', variant: 'destructive' }); setSavingSelf(false); return; }

    if (selfEmail.trim() && selfEmail !== user.email) {
      const { error: emailErr } = await supabase.auth.updateUser({ email: selfEmail.trim() });
      if (emailErr) {
        toast({ title: 'خطأ في تحديث البريد', description: emailErr.message, variant: 'destructive' });
        setSavingSelf(false);
        return;
      }
      toast({ title: 'تم إرسال رابط التأكيد', description: 'تحقق من بريدك الإلكتروني الجديد لتأكيد التغيير' });
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        toast({ title: 'خطأ', description: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل', variant: 'destructive' });
        setSavingSelf(false);
        return;
      }
      if (newPassword !== confirmPassword) {
        toast({ title: 'خطأ', description: 'كلمة المرور الجديدة وتأكيدها غير متطابقتين', variant: 'destructive' });
        setSavingSelf(false);
        return;
      }
      if (!oldPassword) {
        toast({ title: 'خطأ', description: 'يجب إدخال كلمة المرور الحالية', variant: 'destructive' });
        setSavingSelf(false);
        return;
      }
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email!, password: oldPassword });
      if (signInErr) {
        toast({ title: 'خطأ', description: 'كلمة المرور الحالية غير صحيحة', variant: 'destructive' });
        setSavingSelf(false);
        return;
      }
      const { error: passErr } = await supabase.auth.updateUser({ password: newPassword });
      if (passErr) {
        toast({ title: 'خطأ', description: passErr.message, variant: 'destructive' });
        setSavingSelf(false);
        return;
      }
    }

    toast({ title: 'تم حفظ التغييرات بنجاح' });
    setEditSelf(false);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSavingSelf(false);
    window.location.reload();
  };

  const exportBackup = async () => {
    const backupData = {
      exportDate: new Date().toISOString(),
      version: '1.0.2',
      products, categories, warehouses, suppliers, clients, movements,
    };
    const jsonString = JSON.stringify(backupData, null, 2);
    const fileName = `backup_${new Date().toISOString().split('T')[0]}.json`;

    if (Capacitor.getPlatform() === 'android') {
      try {
        await Filesystem.writeFile({
          path: `Download/${fileName}`,
          data: btoa(unescape(encodeURIComponent(jsonString))),
          directory: Directory.ExternalStorage,
        });
        toast({ title: '✅ تم التصدير', description: `تم حفظ النسخة الاحتياطية في مجلد التنزيلات: ${fileName}` });
      } catch (err) {
        console.error('Backup export error:', err);
        // fallback to share
        try {
          const result = await Filesystem.writeFile({
            path: fileName,
            data: btoa(unescape(encodeURIComponent(jsonString))),
            directory: Directory.Cache,
          });
          const { Share } = await import('@capacitor/share');
          await Share.share({ title: 'نسخة احتياطية', url: result.uri, dialogTitle: 'حفظ النسخة الاحتياطية' });
        } catch {
          toast({ title: 'خطأ', description: 'فشل تصدير النسخة الاحتياطية', variant: 'destructive' });
        }
      }
    } else {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: '✅ تم التصدير', description: 'تم تحميل النسخة الاحتياطية بنجاح' });
    }
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRestoreFile(file);
      setRestoreDialog(true);
    }
    e.target.value = '';
  };

  const handleRestore = async () => {
    if (!restoreFile) return;
    try {
      const text = await restoreFile.text();
      const data = JSON.parse(text);

      if (data.categories?.length) {
        for (const c of data.categories) {
          await supabase.from('categories' as any).upsert({ id: c.id, name: c.name, description: c.description || '', created_by: c.created_by } as any);
        }
      }
      if (data.warehouses?.length) {
        for (const w of data.warehouses) {
          await supabase.from('warehouses' as any).upsert({ id: w.id, name: w.name, location: w.location || '', manager: w.manager || '', notes: w.notes || '', created_by: w.created_by } as any);
        }
      }
      if (data.suppliers?.length) {
        for (const s of data.suppliers) {
          await supabase.from('suppliers' as any).upsert({ id: s.id, name: s.name, phone: s.phone || '', email: s.email || '', address: s.address || '', notes: s.notes || '', created_by: s.created_by } as any);
        }
      }
      if (data.clients?.length) {
        for (const c of data.clients) {
          await supabase.from('clients' as any).upsert({ id: c.id, name: c.name, phone: c.phone || '', address: c.address || '', notes: c.notes || '', created_by: c.created_by } as any);
        }
      }
      if (data.products?.length) {
        for (const p of data.products) {
          await supabase.from('products' as any).upsert({ id: p.id, name: p.name, code: p.code, barcode: p.barcode || '', category_id: p.category_id, quantity: p.quantity || 0, warehouse_id: p.warehouse_id, description: p.description || '', created_by: p.created_by } as any);
        }
      }
      if (data.movements?.length) {
        for (const m of data.movements) {
          await supabase.from('stock_movements' as any).upsert({ id: m.id, product_id: m.product_id, warehouse_id: m.warehouse_id, type: m.type, quantity: m.quantity, entity_id: m.entity_id, entity_type: m.entity_type, date: m.date, notes: m.notes || '', created_by: m.created_by } as any);
        }
      }

      await refreshAll();
      toast({ title: 'تمت الاستعادة بنجاح', description: 'تم استعادة جميع البيانات من النسخة الاحتياطية' });
    } catch {
      toast({ title: 'خطأ', description: 'فشل قراءة ملف النسخة الاحتياطية', variant: 'destructive' });
    }
    setRestoreDialog(false);
    setRestoreFile(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 animate-fade-in text-right px-4 pb-10" dir={dir}>
      {/* Header */}
      <div className="flex items-center justify-between py-4">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t('set_title')}</h1>
        <Button onClick={signOut} variant="destructive" size="sm" className="flex items-center gap-1.5">
          <LogOut className="w-4 h-4" />{t('logout')}
        </Button>
      </div>

      <div className="grid gap-6">
        {/* معلومات الحساب - تم تعديل التوزيع هنا لإصلاح المشكلة */}
        <section className="bg-card p-4 sm:p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b pb-3">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              <h2 className="text-base sm:text-lg font-semibold">{t('set_account')}</h2>
            </div>
            <Button size="sm" variant="outline" className="h-8" onClick={() => setEditSelf(true)}>
              <Pencil className="w-4 h-4 ml-1" />{t('edit')}
            </Button>
          </div>
          
          <div className="space-y-4 bg-secondary/30 p-4 rounded-xl">
            <div className="grid grid-cols-12 gap-2 items-center">
              <span className="col-span-4 text-muted-foreground text-xs sm:text-sm">{t('name')}:</span>
              <span className="col-span-8 font-semibold text-foreground text-left truncate">{displayName}</span>
            </div>
            
            <div className="grid grid-cols-12 gap-2 items-center border-t border-border/40 pt-3">
              <span className="col-span-4 text-muted-foreground text-xs sm:text-sm">{t('email')}:</span>
              <span className="col-span-8 font-medium text-foreground text-left truncate" dir="ltr">{user?.email}</span>
            </div>
            
            <div className="grid grid-cols-12 gap-2 items-center border-t border-border/40 pt-3">
              <span className="col-span-4 text-muted-foreground text-xs sm:text-sm">{t('set_role')}:</span>
              <div className="col-span-8 text-left">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold ${isAdmin ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'}`}>
                  {role === 'admin' ? t('system_admin') : t('employee')}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* النسخ الاحتياطي */}
        <section className="bg-card p-4 sm:p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center gap-3 mb-4 border-b pb-3">
            <Download className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            <h2 className="text-base sm:text-lg font-semibold">{t('set_backup')}</h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">{t('set_backup_desc')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button onClick={exportBackup} variant="outline" className="gap-2 h-10">
              <Download className="w-4 h-4" />{t('set_export')}
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="gap-2 h-10">
              <Upload className="w-4 h-4" />{t('set_restore')}
            </Button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleRestoreFile} />
          </div>
        </section>

        {/* إدارة المستخدمين */}
        {isAdmin && (
          <section className="bg-card p-4 sm:p-6 rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-4 border-b pb-3">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                <h2 className="text-base sm:text-lg font-semibold">{t('set_users')}</h2>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAddEmployeeDialog(true)}>
                <UserPlus className="w-4 h-4" />
                إضافة موظف
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">المستخدمون المسجلون في النظام - يمكنك تعديل صلاحياتهم</p>
            {loadingUsers ? (
              <div className="text-center py-6 text-muted-foreground">{t('loading')}</div>
            ) : (
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-sm min-w-[450px]">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="py-2 text-right">{t('name')}</th>
                      <th className="py-2 text-right">{t('set_role')}</th>
                      <th className="py-2 text-center">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.user_id} className="border-b last:border-0 hover:bg-secondary/20">
                        <td className="py-3">
                          <span className="font-medium">{u.display_name}</span>
                          {u.user_id === user?.id && <span className="text-[10px] text-primary mr-2">(أنت)</span>}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            {u.role === 'admin' ? 'مدير' : 'موظف'}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <div className="flex justify-center gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEditUser(u)}><UserCog className="w-4 h-4" /></Button>
                            {u.user_id !== user?.id && (
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { setDeletingUser(u); setDeleteDialog(true); }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* اللغة والمظهر */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="bg-card p-5 rounded-2xl border border-border shadow-sm">
             <div className="flex items-center gap-3 mb-4 border-b pb-3">
              <Globe className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">{t('set_language')}</h2>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => changeLanguage('ar')} variant={language === 'ar' ? 'default' : 'secondary'} className="flex-1">العربية</Button>
              <Button onClick={() => changeLanguage('en')} variant={language === 'en' ? 'default' : 'secondary'} className="flex-1">English</Button>
            </div>
          </section>

          <section className="bg-card p-5 rounded-2xl border border-border shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isDarkMode ? <Moon className="text-primary" /> : <Sun className="text-warning" />}
              <span className="font-semibold">{t('set_dark_mode')}</span>
            </div>
            <button onClick={toggleDarkMode} className={`w-12 h-7 rounded-full p-1 transition-colors ${isDarkMode ? 'bg-primary' : 'bg-muted'}`}>
              <div className={`bg-white w-5 h-5 rounded-full transition-transform ${isDarkMode ? '-translate-x-5' : 'translate-x-0'}`} />
            </button>
          </section>
        </div>

        {/* حول التطبيق */}
        <section className="bg-card p-4 sm:p-6 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center gap-3 mb-4 border-b pb-3">
            <Info className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            <h2 className="text-base sm:text-lg font-semibold">{t('set_about')}</h2>
          </div>
          <div className="space-y-3 bg-secondary/30 p-4 rounded-xl text-xs sm:text-sm">
            <div className="flex justify-between"><span>{t('system_name')}:</span><span className="font-bold">إدارة مخازن متكامل</span></div>
            <div className="flex justify-between"><span>{t('set_version')}:</span><span className="font-mono">1.0.2</span></div>
            <div className="flex justify-between border-t border-border/40 pt-2"><span>{t('set_developer')}:</span><span className="text-primary font-medium">مفيد الزري@</span></div>
            <div className="pt-2"><DeveloperFooter /></div>
          </div>
        </section>
      </div>

      {/* Dialogs - بنفس المنطق البرمجي الكامل */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="text-right" dir={dir}>
          <DialogHeader><DialogTitle>{t('set_edit_user')}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div><label className="text-sm block mb-1">{t('name')}</label><Input value={editName} onChange={e => setEditName(e.target.value)} /></div>
            <div>
              <label className="text-sm block mb-1">{t('set_role')}</label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant={editRole === 'employee' ? 'default' : 'outline'} onClick={() => setEditRole('employee')}>{t('employee')}</Button>
                <Button variant={editRole === 'admin' ? 'default' : 'outline'} onClick={() => setEditRole('admin')}>{t('set_admin')}</Button>
              </div>
            </div>
            <Button onClick={handleSaveEdit} className="w-full mt-2">{t('set_save_changes')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editSelf} onOpenChange={setEditSelf}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto text-right" dir={dir}>
          <DialogHeader><DialogTitle>{t('set_edit_account')}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div><label className="text-sm block mb-1">{t('name')}</label><Input value={selfName} onChange={e => setSelfName(e.target.value)} /></div>
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-2"><Mail className="w-4 h-4 text-primary" /><span className="text-sm font-bold">{t('set_change_email')}</span></div>
              <Input type="email" dir="ltr" value={selfEmail} onChange={e => setSelfEmail(e.target.value)} />
            </div>
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-2 mb-1"><Lock className="w-4 h-4 text-primary" /><span className="text-sm font-bold">{t('set_change_password')}</span></div>
              <Input type="password" placeholder={t('set_current_password')} value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
              <Input type="password" placeholder={t('set_new_password')} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              <Input type="password" placeholder={t('set_confirm_password')} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </div>
            <Button onClick={handleSaveSelf} className="w-full" disabled={savingSelf}>{savingSelf ? t('loading') : t('set_save_changes')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="text-right" dir={dir}>
          <DialogHeader><DialogTitle className="text-destructive">{t('confirm_delete')}</DialogTitle></DialogHeader>
          <p className="py-4">{t('confirm_delete_msg')} <b>{deletingUser?.display_name}</b></p>
          <div className="flex gap-2">
            <Button variant="destructive" onClick={handleDeleteUser} className="flex-1">{t('delete')}</Button>
            <Button variant="outline" onClick={() => setDeleteDialog(false)} className="flex-1">{t('cancel')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={restoreDialog} onOpenChange={setRestoreDialog}>
        <DialogContent className="text-right" dir={dir}>
          <DialogHeader><DialogTitle>{t('set_restore_confirm')}</DialogTitle></DialogHeader>
          <p className="py-4 text-sm">{t('set_restore_confirm_msg')} <b>{restoreFile?.name}</b></p>
          <div className="flex gap-2">
            <Button onClick={handleRestore} className="flex-1">{t('set_restore')}</Button>
            <Button variant="outline" onClick={() => setRestoreDialog(false)} className="flex-1">{t('cancel')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* إضافة موظف */}
      <Dialog open={addEmployeeDialog} onOpenChange={setAddEmployeeDialog}>
        <DialogContent className="text-right" dir={dir}>
          <DialogHeader><DialogTitle>إضافة موظف جديد</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm block mb-1">اسم الموظف</label>
              <Input value={newEmpName} onChange={e => setNewEmpName(e.target.value)} placeholder="أدخل اسم الموظف" />
            </div>
            <div>
              <label className="text-sm block mb-1">البريد الإلكتروني</label>
              <Input type="email" dir="ltr" className="text-left" value={newEmpEmail} onChange={e => setNewEmpEmail(e.target.value)} placeholder="employee@email.com" />
            </div>
            <div>
              <label className="text-sm block mb-1">كلمة المرور</label>
              <Input type="password" dir="ltr" className="text-left" value={newEmpPassword} onChange={e => setNewEmpPassword(e.target.value)} placeholder="كلمة مرور (6 أحرف على الأقل)" minLength={6} />
            </div>
            <Button
              className="w-full"
              disabled={creatingEmployee || !newEmpName.trim() || !newEmpEmail.trim() || newEmpPassword.length < 6}
              onClick={async () => {
                setCreatingEmployee(true);
                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  const res = await supabase.functions.invoke('create-employee', {
                    body: { email: newEmpEmail, password: newEmpPassword, displayName: newEmpName },
                  });
                  if (res.error || res.data?.error) {
                    toast({ title: 'خطأ', description: res.data?.error || res.error?.message || 'فشل إنشاء الموظف', variant: 'destructive' });
                  } else {
                    toast({ title: 'تم إنشاء حساب الموظف بنجاح' });
                    setAddEmployeeDialog(false);
                    setNewEmpEmail('');
                    setNewEmpPassword('');
                    setNewEmpName('');
                    fetchUsers();
                  }
                } catch (err: any) {
                  toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
                }
                setCreatingEmployee(false);
              }}
            >
              {creatingEmployee ? t('loading') : 'إنشاء حساب الموظف'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
