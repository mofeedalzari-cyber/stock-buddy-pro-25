import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import {
  ArmoryWarehouse, Weapon, Ammunition, Equipment,
  PersonalEquipment, ArmoryRecipient, ArmoryMovement
} from '@/types/warehouse';
import { useToast } from '@/hooks/use-toast';

interface ArmoryContextType {
  warehouses: ArmoryWarehouse[];
  weapons: Weapon[];
  ammunition: Ammunition[];
  equipment: Equipment[];
  personalEquipment: PersonalEquipment[];
  recipients: ArmoryRecipient[];
  movements: ArmoryMovement[];
  loading: boolean;
  addWarehouse: (w: Omit<ArmoryWarehouse, 'id' | 'created_at'>) => void;
  updateWarehouse: (w: ArmoryWarehouse) => void;
  deleteWarehouse: (id: string) => boolean;
  addWeapon: (w: Omit<Weapon, 'id' | 'created_at'>) => void;
  updateWeapon: (w: Weapon) => void;
  deleteWeapon: (id: string) => boolean;
  addAmmunition: (a: Omit<Ammunition, 'id' | 'created_at'>) => void;
  updateAmmunition: (a: Ammunition) => void;
  deleteAmmunition: (id: string) => boolean;
  addEquipment: (e: Omit<Equipment, 'id' | 'created_at'>) => void;
  updateEquipment: (e: Equipment) => void;
  deleteEquipment: (id: string) => boolean;
  addPersonalEquipment: (p: Omit<PersonalEquipment, 'id' | 'created_at'>) => void;
  updatePersonalEquipment: (p: PersonalEquipment) => void;
  deletePersonalEquipment: (id: string) => boolean;
  addRecipient: (r: Omit<ArmoryRecipient, 'id' | 'created_at'>) => void;
  updateRecipient: (r: ArmoryRecipient) => void;
  deleteRecipient: (id: string) => boolean;
  addMovement: (m: Omit<ArmoryMovement, 'id' | 'created_at' | 'created_by'>) => void;
  deleteMovement: (id: string) => void;
  getWarehouseById: (id: string) => ArmoryWarehouse | undefined;
  getWeaponById: (id: string) => Weapon | undefined;
  getAmmunitionById: (id: string) => Ammunition | undefined;
  getEquipmentById: (id: string) => Equipment | undefined;
  getRecipientById: (id: string) => ArmoryRecipient | undefined;
  getLowStockAmmunition: () => Ammunition[];
}

const ArmoryContext = createContext<ArmoryContextType | undefined>(undefined);

const STORAGE_KEY = 'armory_data';

interface ArmoryData {
  warehouses: ArmoryWarehouse[];
  weapons: Weapon[];
  ammunition: Ammunition[];
  equipment: Equipment[];
  personalEquipment: PersonalEquipment[];
  recipients: ArmoryRecipient[];
  movements: ArmoryMovement[];
}

const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

export const ArmoryProvider = ({ children }: { children: ReactNode }) => {
  const [warehouses, setWarehouses] = useState<ArmoryWarehouse[]>([]);
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [ammunition, setAmmunition] = useState<Ammunition[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [personalEquipment, setPersonalEquipment] = useState<PersonalEquipment[]>([]);
  const [recipients, setRecipients] = useState<ArmoryRecipient[]>([]);
  const [movements, setMovements] = useState<ArmoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data: ArmoryData = JSON.parse(saved);
        setWarehouses(data.warehouses || []);
        setWeapons(data.weapons || []);
        setAmmunition(data.ammunition || []);
        setEquipment(data.equipment || []);
        setPersonalEquipment(data.personalEquipment || []);
        setRecipients(data.recipients || []);
        setMovements(data.movements || []);
      } catch (e) {
        console.error('Failed to load armory data', e);
      }
    }
    setLoading(false);
  }, []);

  const saveData = useCallback(() => {
    const data: ArmoryData = { warehouses, weapons, ammunition, equipment, personalEquipment, recipients, movements };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [warehouses, weapons, ammunition, equipment, personalEquipment, recipients, movements]);

  useEffect(() => {
    if (!loading) saveData();
  }, [loading, saveData]);

  const showToast = (title: string, description: string, variant: 'default' | 'destructive' = 'default') => {
    toast({ title, description, variant });
  };

  // Warehouses
  const addWarehouse = useCallback((w: Omit<ArmoryWarehouse, 'id' | 'created_at'>) => {
    const newWarehouse: ArmoryWarehouse = { ...w, id: generateId(), created_at: new Date().toISOString() };
    setWarehouses(prev => [...prev, newWarehouse]);
    showToast('تم', 'تمت إضافة المخزن بنجاح');
  }, []);

  const updateWarehouse = useCallback((w: ArmoryWarehouse) => {
    setWarehouses(prev => prev.map(wh => wh.id === w.id ? w : wh));
    showToast('تم', 'تم تحديث المخزن بنجاح');
  }, []);

  const deleteWarehouse = useCallback((id: string): boolean => {
    const hasItems = [...weapons, ...ammunition, ...equipment].some(i => i.warehouse_id === id);
    if (hasItems) {
      showToast('خطأ', 'لا يمكن حذف المخزن لوجود أصناف فيه', 'destructive');
      return false;
    }
    setWarehouses(prev => prev.filter(w => w.id !== id));
    showToast('تم', 'تم حذف المخزن بنجاح');
    return true;
  }, [weapons, ammunition, equipment]);

  // Weapons
  const addWeapon = useCallback((w: Omit<Weapon, 'id' | 'created_at'>) => {
    const newWeapon: Weapon = { ...w, id: generateId(), created_at: new Date().toISOString() };
    setWeapons(prev => [...prev, newWeapon]);
    showToast('تم', 'تمت إضافة السلاح بنجاح');
  }, []);

  const updateWeapon = useCallback((w: Weapon) => {
    setWeapons(prev => prev.map(we => we.id === w.id ? w : we));
    showToast('تم', 'تم تحديث السلاح بنجاح');
  }, []);

  const deleteWeapon = useCallback((id: string): boolean => {
    const hasPersonal = personalEquipment.some(p => p.weapon_id === id);
    if (hasPersonal) {
      showToast('خطأ', 'السلاح مرتبط بعهدة شخصية', 'destructive');
      return false;
    }
    setWeapons(prev => prev.filter(w => w.id !== id));
    showToast('تم', 'تم حذف السلاح بنجاح');
    return true;
  }, [personalEquipment]);

  // Ammunition
  const addAmmunition = useCallback((a: Omit<Ammunition, 'id' | 'created_at'>) => {
    const newAmmunition: Ammunition = { ...a, id: generateId(), created_at: new Date().toISOString() };
    setAmmunition(prev => [...prev, newAmmunition]);
    showToast('تم', 'تمت إضافة الذخيرة بنجاح');
  }, []);

  const updateAmmunition = useCallback((a: Ammunition) => {
    setAmmunition(prev => prev.map(am => am.id === a.id ? a : am));
    showToast('تم', 'تم تحديث الذخيرة بنجاح');
  }, []);

  const deleteAmmunition = useCallback((id: string): boolean => {
    setAmmunition(prev => prev.filter(a => a.id !== id));
    showToast('تم', 'تم حذف الذخيرة بنجاح');
    return true;
  }, []);

  // Equipment
  const addEquipment = useCallback((e: Omit<Equipment, 'id' | 'created_at'>) => {
    const newEquipment: Equipment = { ...e, id: generateId(), created_at: new Date().toISOString() };
    setEquipment(prev => [...prev, newEquipment]);
    showToast('تم', 'تمت إضافة المعداة بنجاح');
  }, []);

  const updateEquipment = useCallback((e: Equipment) => {
    setEquipment(prev => prev.map(eq => eq.id === e.id ? e : eq));
    showToast('تم', 'تم تحديث المعداة بنجاح');
  }, []);

  const deleteEquipment = useCallback((id: string): boolean => {
    const hasPersonal = personalEquipment.some(p => p.equipment_id === id);
    if (hasPersonal) {
      showToast('خطأ', 'المعداة مرتبطة بعهدة شخصية', 'destructive');
      return false;
    }
    setEquipment(prev => prev.filter(e => e.id !== id));
    showToast('تم', 'تم حذف المعداة بنجاح');
    return true;
  }, [personalEquipment]);

  // Personal Equipment
  const addPersonalEquipment = useCallback((p: Omit<PersonalEquipment, 'id' | 'created_at'>) => {
    const newPE: PersonalEquipment = { ...p, id: generateId(), created_at: new Date().toISOString() };
    setPersonalEquipment(prev => [...prev, newPE]);
    
    if (p.weapon_id) {
      setWeapons(prev => prev.map(w => w.id === p.weapon_id ? { ...w, status: 'مسلّم' as const } : w));
    }
    if (p.equipment_id) {
      setEquipment(prev => prev.map(e => e.id === p.equipment_id ? { ...e, status: 'مسلّم' as const } : e));
    }
    showToast('تم', 'تمت تسليمة العهدة بنجاح');
  }, []);

  const updatePersonalEquipment = useCallback((p: PersonalEquipment) => {
    setPersonalEquipment(prev => prev.map(pe => pe.id === p.id ? p : pe));
    showToast('تم', 'تم تحديث العهدة بنجاح');
  }, []);

  const deletePersonalEquipment = useCallback((id: string): boolean => {
    const pe = personalEquipment.find(p => p.id === id);
    if (pe) {
      if (pe.weapon_id) {
        setWeapons(prev => prev.map(w => w.id === pe.weapon_id ? { ...w, status: 'متاح' as const } : w));
      }
      if (pe.equipment_id) {
        setEquipment(prev => prev.map(e => e.id === pe.equipment_id ? { ...e, status: 'متاح' as const } : e));
      }
    }
    setPersonalEquipment(prev => prev.filter(p => p.id !== id));
    showToast('تم', 'تم حذف العهدة بنجاح');
    return true;
  }, [personalEquipment]);

  // Recipients
  const addRecipient = useCallback((r: Omit<ArmoryRecipient, 'id' | 'created_at'>) => {
    const newRecipient: ArmoryRecipient = { ...r, id: generateId(), created_at: new Date().toISOString() };
    setRecipients(prev => [...prev, newRecipient]);
    showToast('تم', 'تمت إضافة المستلم بنجاح');
  }, []);

  const updateRecipient = useCallback((r: ArmoryRecipient) => {
    setRecipients(prev => prev.map(re => re.id === r.id ? r : re));
    showToast('تم', 'تم تحديث المستلم بنجاح');
  }, []);

  const deleteRecipient = useCallback((id: string): boolean => {
    const hasPE = personalEquipment.some(p => p.recipient_id === id);
    if (hasPE) {
      showToast('خطأ', 'المستلم له عهدة مسجلة', 'destructive');
      return false;
    }
    setRecipients(prev => prev.filter(r => r.id !== id));
    showToast('تم', 'تم حذف المستلم بنجاح');
    return true;
  }, [personalEquipment]);

  // Movements
  const addMovement = useCallback((m: Omit<ArmoryMovement, 'id' | 'created_at' | 'created_by'>) => {
    const newMovement: ArmoryMovement = { ...m, id: generateId(), created_at: new Date().toISOString(), created_by: '' };
    setMovements(prev => [...prev, newMovement]);

    if (m.type === 'صادر' && m.item_type === 'ammunition') {
      setAmmunition(prev => prev.map(a => {
        if (a.id === m.item_id) {
          return { ...a, quantity: Math.max(0, a.quantity - m.quantity) };
        }
        return a;
      }));
    } else if (m.type === 'وارد' && m.item_type === 'ammunition') {
      setAmmunition(prev => prev.map(a => {
        if (a.id === m.item_id) {
          return { ...a, quantity: a.quantity + m.quantity };
        }
        return a;
      }));
    }

    const typeMsg = m.type === 'وارد' ? '✅ تم توريد للمخزن بنجاح' : '📤 تم تصدير حركة بنجاح';
    showToast(m.type === 'وارد' ? 'توريد' : 'تصدير', typeMsg);
  }, []);

  const deleteMovement = useCallback((id: string) => {
    setMovements(prev => prev.filter(m => m.id !== id));
    showToast('تم', 'تم حذف الحركة بنجاح');
  }, []);

  // Helpers
  const getWarehouseById = useCallback((id: string) => warehouses.find(w => w.id === id), [warehouses]);
  const getWeaponById = useCallback((id: string) => weapons.find(w => w.id === id), [weapons]);
  const getAmmunitionById = useCallback((id: string) => ammunition.find(a => a.id === id), [ammunition]);
  const getEquipmentById = useCallback((id: string) => equipment.find(e => e.id === id), [equipment]);
  const getRecipientById = useCallback((id: string) => recipients.find(r => r.id === id), [recipients]);

  const getLowStockAmmunition = useCallback(() => {
    return ammunition.filter(a => a.quantity <= a.min_quantity);
  }, [ammunition]);

  return (
    <ArmoryContext.Provider value={{
      warehouses, weapons, ammunition, equipment, personalEquipment, recipients, movements, loading,
      addWarehouse, updateWarehouse, deleteWarehouse,
      addWeapon, updateWeapon, deleteWeapon,
      addAmmunition, updateAmmunition, deleteAmmunition,
      addEquipment, updateEquipment, deleteEquipment,
      addPersonalEquipment, updatePersonalEquipment, deletePersonalEquipment,
      addRecipient, updateRecipient, deleteRecipient,
      addMovement, deleteMovement,
      getWarehouseById, getWeaponById, getAmmunitionById, getEquipmentById, getRecipientById,
      getLowStockAmmunition,
    }}>
      {children}
    </ArmoryContext.Provider>
  );
};

export const useArmory = () => {
  const ctx = useContext(ArmoryContext);
  if (!ctx) throw new Error('useArmory must be used within ArmoryProvider');
  return ctx;
};
