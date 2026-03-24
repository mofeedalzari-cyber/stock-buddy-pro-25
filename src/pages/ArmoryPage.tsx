import { useState } from 'react';
import { useArmory } from '@/contexts/ArmoryContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Search, Trash2, Edit, AlertTriangle, Package, 
  Shield, Box, Users, ArrowLeftRight, FileText, ClipboardList,
  Crosshair, Flashlight, Briefcase
} from 'lucide-react';
import { WeaponType, Caliber, EquipmentType, MovementTypeArmory } from '@/types/warehouse';

const weaponTypes: WeaponType[] = ['بندقية', 'مسدس', 'رشاش', 'قاذفة', 'أخرى'];
const calibers: Caliber[] = ['5.56', '7.62', '9mm', '12.7', '45', 'أخرى'];
const equipmentTypes: EquipmentType[] = ['منظار', 'جهاز', 'حقيبة', 'أخرى'];
const movementTypes: MovementTypeArmory[] = ['وارد', 'صادر', 'تحويل', 'إرجاع'];

export default function ArmoryPage() {
  const {
    warehouses, weapons, ammunition, equipment, personalEquipment, recipients, movements,
    addWarehouse, updateWarehouse, deleteWarehouse,
    addWeapon, updateWeapon, deleteWeapon,
    addAmmunition, updateAmmunition, deleteAmmunition,
    addEquipment, updateEquipment, deleteEquipment,
    addPersonalEquipment, deletePersonalEquipment,
    addRecipient, updateRecipient, deleteRecipient,
    addMovement, getLowStockAmmunition,
    getWeaponById, getEquipmentById, getRecipientById, getWarehouseById,
  } = useArmory();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('weapons');

  const lowStock = getLowStockAmmunition();

  const filteredWeapons = weapons.filter(w => 
    w.name.includes(searchTerm) || w.serial_number.includes(searchTerm)
  );
  const filteredAmmunition = ammunition.filter(a => 
    a.type.includes(searchTerm)
  );
  const filteredEquipment = equipment.filter(e => 
    e.name.includes(searchTerm) || e.serial_number.includes(searchTerm)
  );
  const filteredRecipients = recipients.filter(r => 
    r.name.includes(searchTerm) || r.military_number.includes(searchTerm)
  );

  return (
    <div className="space-y-4">
      {lowStock.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-bold">تنبيه: نفاد الذخيرة</span>
              <Badge variant="outline" className="mr-2">{lowStock.length} أصناف</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 lg:grid-cols-7 gap-1 h-auto p-1">
          <TabsTrigger value="weapons" className="flex items-center gap-2 py-2">
            <Crosshair className="w-4 h-4" /> أسلحة
          </TabsTrigger>
          <TabsTrigger value="ammunition" className="flex items-center gap-2 py-2">
            <Flashlight className="w-4 h-4" /> ذخيرة
          </TabsTrigger>
          <TabsTrigger value="equipment" className="flex items-center gap-2 py-2">
            <Briefcase className="w-4 h-4" /> معدات
          </TabsTrigger>
          <TabsTrigger value="personal" className="flex items-center gap-2 py-2">
            <Shield className="w-4 h-4" /> العهدة
          </TabsTrigger>
          <TabsTrigger value="warehouses" className="flex items-center gap-2 py-2">
            <Box className="w-4 h-4" /> المخازن
          </TabsTrigger>
          <TabsTrigger value="recipients" className="flex items-center gap-2 py-2">
            <Users className="w-4 h-4" /> المستلمين
          </TabsTrigger>
          <TabsTrigger value="movements" className="flex items-center gap-2 py-2">
            <ArrowLeftRight className="w-4 h-4" /> الحركات
          </TabsTrigger>
        </TabsList>

        {/* Weapons Tab */}
        <TabsContent value="weapons" className="mt-4">
          <WeaponsTab 
            weapons={filteredWeapons} 
            warehouses={warehouses}
            addWeapon={addWeapon} 
            updateWeapon={updateWeapon} 
            deleteWeapon={deleteWeapon}
          />
        </TabsContent>

        {/* Ammunition Tab */}
        <TabsContent value="ammunition" className="mt-4">
          <AmmunitionTab 
            ammunition={filteredAmmunition}
            warehouses={warehouses}
            addAmmunition={addAmmunition}
            updateAmmunition={updateAmmunition}
            deleteAmmunition={deleteAmmunition}
          />
        </TabsContent>

        {/* Equipment Tab */}
        <TabsContent value="equipment" className="mt-4">
          <EquipmentTab 
            equipment={filteredEquipment}
            warehouses={warehouses}
            addEquipment={addEquipment}
            updateEquipment={updateEquipment}
            deleteEquipment={deleteEquipment}
          />
        </TabsContent>

        {/* Personal Equipment Tab */}
        <TabsContent value="personal" className="mt-4">
          <PersonalEquipmentTab 
            personalEquipment={personalEquipment}
            weapons={weapons}
            equipment={equipment}
            recipients={recipients}
            warehouses={warehouses}
            addPersonalEquipment={addPersonalEquipment}
            deletePersonalEquipment={deletePersonalEquipment}
            getWeaponById={getWeaponById}
            getEquipmentById={getEquipmentById}
            getRecipientById={getRecipientById}
            getWarehouseById={getWarehouseById}
          />
        </TabsContent>

        {/* Warehouses Tab */}
        <TabsContent value="warehouses" className="mt-4">
          <WarehousesTab 
            warehouses={warehouses}
            addWarehouse={addWarehouse}
            updateWarehouse={updateWarehouse}
            deleteWarehouse={deleteWarehouse}
          />
        </TabsContent>

        {/* Recipients Tab */}
        <TabsContent value="recipients" className="mt-4">
          <RecipientsTab 
            recipients={filteredRecipients}
            addRecipient={addRecipient}
            updateRecipient={updateRecipient}
            deleteRecipient={deleteRecipient}
          />
        </TabsContent>

        {/* Movements Tab */}
        <TabsContent value="movements" className="mt-4">
          <MovementsTab 
            movements={movements}
            weapons={weapons}
            ammunition={ammunition}
            equipment={equipment}
            recipients={recipients}
            warehouses={warehouses}
            addMovement={addMovement}
            getWeaponById={getWeaponById}
            getEquipmentById={getEquipmentById}
            getRecipientById={getRecipientById}
            getWarehouseById={getWarehouseById}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Weapons Component
function WeaponsTab({ weapons, warehouses, addWeapon, updateWeapon, deleteWeapon }: {
  weapons: any[];
  warehouses: any[];
  addWeapon: (w: any) => void;
  updateWeapon: (w: any) => void;
  deleteWeapon: (id: string) => boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'بندقية' as WeaponType, caliber: '7.62' as Caliber, serial_number: '', warehouse_id: '', status: 'متاح' as const, notes: '' });

  const handleSubmit = () => {
    if (!form.name || !form.serial_number || !form.warehouse_id) return;
    addWeapon(form);
    setForm({ name: '', type: 'بندقية', caliber: '7.62', serial_number: '', warehouse_id: '', status: 'متاح', notes: '' });
    setIsOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'متاح': return 'bg-green-100 text-green-800';
      case 'مسلّم': return 'bg-blue-100 text-blue-800';
      case 'صيانة': return 'bg-yellow-100 text-yellow-800';
      case 'معطل': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100';
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="mb-4"><Plus className="w-4 h-4 ml-2" />إضافة سلاح</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة سلاح جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم السلاح</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="كلاشينكوف" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>النوع</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as WeaponType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {weaponTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>العيار</Label>
                <Select value={form.caliber} onValueChange={(v) => setForm({ ...form, caliber: v as Caliber })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {calibers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>الرقم التسلسلي</Label>
              <Input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} placeholder="AK44521" />
            </div>
            <div>
              <Label>المخزن</Label>
              <Select value={form.warehouse_id} onValueChange={(v) => setForm({ ...form, warehouse_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر المخزن" /></SelectTrigger>
                <SelectContent>
                  {warehouses.filter(w => w.type === 'أسلحة' || w.type === 'عام').map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSubmit} className="w-full">حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {weapons.map(weapon => (
          <Card key={weapon.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{weapon.name}</CardTitle>
                <Badge className={getStatusColor(weapon.status)}>{weapon.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">النوع:</span> {weapon.type}</p>
                <p><span className="text-muted-foreground">العيار:</span> {weapon.caliber}</p>
                <p><span className="text-muted-foreground">الرقم التسلسلي:</span> {weapon.serial_number}</p>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => deleteWeapon(weapon.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {weapons.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            لا توجد أسلحة مسجلة
          </div>
        )}
      </div>
    </>
  );
}

// Ammunition Component
function AmmunitionTab({ ammunition, warehouses, addAmmunition, updateAmmunition, deleteAmmunition }: {
  ammunition: any[];
  warehouses: any[];
  addAmmunition: (a: any) => void;
  updateAmmunition: (a: any) => void;
  deleteAmmunition: (id: string) => boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ type: '', caliber: '7.62' as Caliber, quantity: 0, warehouse_id: '', min_quantity: 100, notes: '' });

  const handleSubmit = () => {
    if (!form.type || !form.warehouse_id) return;
    addAmmunition(form);
    setForm({ type: '', caliber: '7.62', quantity: 0, warehouse_id: '', min_quantity: 100, notes: '' });
    setIsOpen(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="mb-4"><Plus className="w-4 h-4 ml-2" />إضافة ذخيرة</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة ذخيرة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>نوع الذخيرة</Label>
              <Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="ذخيرة بندقية" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>العيار</Label>
                <Select value={form.caliber} onValueChange={(v) => setForm({ ...form, caliber: v as Caliber })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {calibers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الكمية</Label>
                <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>الحد الأدنى</Label>
                <Input type="number" value={form.min_quantity} onChange={(e) => setForm({ ...form, min_quantity: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>المخزن</Label>
                <Select value={form.warehouse_id} onValueChange={(v) => setForm({ ...form, warehouse_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر المخزن" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.filter(w => w.type === 'ذخيرة' || w.type === 'عام').map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSubmit} className="w-full">حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ammunition.map(ammo => (
          <Card key={ammo.id} className={ammo.quantity <= ammo.min_quantity ? 'border-orange-300' : ''}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{ammo.type}</CardTitle>
                {ammo.quantity <= ammo.min_quantity && <AlertTriangle className="w-5 h-5 text-orange-500" />}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">العيار:</span> {ammo.caliber}</p>
                <p><span className="text-muted-foreground">الكمية:</span> <span className="font-bold">{ammo.quantity}</span></p>
                <p><span className="text-muted-foreground">الحد الأدنى:</span> {ammo.min_quantity}</p>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => deleteAmmunition(ammo.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {ammunition.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            لا توجد ذخيرة مسجلة
          </div>
        )}
      </div>
    </>
  );
}

// Equipment Component
function EquipmentTab({ equipment, warehouses, addEquipment, updateEquipment, deleteEquipment }: {
  equipment: any[];
  warehouses: any[];
  addEquipment: (e: any) => void;
  updateEquipment: (e: any) => void;
  deleteEquipment: (id: string) => boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'منظار' as EquipmentType, serial_number: '', warehouse_id: '', status: 'متاح' as const, notes: '' });

  const handleSubmit = () => {
    if (!form.name || !form.serial_number || !form.warehouse_id) return;
    addEquipment(form);
    setForm({ name: '', type: 'منظار', serial_number: '', warehouse_id: '', status: 'متاح', notes: '' });
    setIsOpen(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="mb-4"><Plus className="w-4 h-4 ml-2" />إضافة معداة</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة معداة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم المعداة</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="منظار ليلي" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>النوع</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as EquipmentType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {equipmentTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الرقم التسلسلي</Label>
                <Input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>المخزن</Label>
              <Select value={form.warehouse_id} onValueChange={(v) => setForm({ ...form, warehouse_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر المخزن" /></SelectTrigger>
                <SelectContent>
                  {warehouses.filter(w => w.type === 'معدات' || w.type === 'عام').map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSubmit} className="w-full">حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {equipment.map(eq => (
          <Card key={eq.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{eq.name}</CardTitle>
                <Badge variant={eq.status === 'متاح' ? 'default' : 'secondary'}>{eq.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">النوع:</span> {eq.type}</p>
                <p><span className="text-muted-foreground">الرقم التسلسلي:</span> {eq.serial_number}</p>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => deleteEquipment(eq.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {equipment.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            لا توجد معدات مسجلة
          </div>
        )}
      </div>
    </>
  );
}

// Personal Equipment Component
function PersonalEquipmentTab({ personalEquipment, weapons, equipment, recipients, warehouses, addPersonalEquipment, deletePersonalEquipment, getWeaponById, getEquipmentById, getRecipientById, getWarehouseById }: {
  personalEquipment: any[];
  weapons: any[];
  equipment: any[];
  recipients: any[];
  warehouses: any[];
  addPersonalEquipment: (p: any) => void;
  deletePersonalEquipment: (id: string) => boolean;
  getWeaponById: (id: string) => any;
  getEquipmentById: (id: string) => any;
  getRecipientById: (id: string) => any;
  getWarehouseById: (id: string) => any;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ weapon_id: '', equipment_id: '', recipient_id: '', warehouse_id: '', issue_date: new Date().toISOString().split('T')[0], notes: '' });

  const availableWeapons = weapons.filter(w => w.status === 'متاح');
  const availableEquipment = equipment.filter(e => e.status === 'متاح');

  const handleSubmit = () => {
    if (!form.recipient_id || (!form.weapon_id && !form.equipment_id)) return;
    addPersonalEquipment(form);
    setForm({ weapon_id: '', equipment_id: '', recipient_id: '', warehouse_id: '', issue_date: new Date().toISOString().split('T')[0], notes: '' });
    setIsOpen(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="mb-4"><Plus className="w-4 h-4 ml-2" />تسليم عهدة</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تسليم عهدة شخصية</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>المستلم</Label>
              <Select value={form.recipient_id} onValueChange={(v) => setForm({ ...form, recipient_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر المستلم" /></SelectTrigger>
                <SelectContent>
                  {recipients.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name} - {r.military_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>السلاح (اختياري)</Label>
              <Select value={form.weapon_id} onValueChange={(v) => setForm({ ...form, weapon_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر سلاح" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">لا يوجد</SelectItem>
                  {availableWeapons.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name} - {w.serial_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>المعداة (اختياري)</Label>
              <Select value={form.equipment_id} onValueChange={(v) => setForm({ ...form, equipment_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر معداة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">لا يوجد</SelectItem>
                  {availableEquipment.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name} - {e.serial_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>المخزن</Label>
              <Select value={form.warehouse_id} onValueChange={(v) => setForm({ ...form, warehouse_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر المخزن" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSubmit} className="w-full">حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>سجل العهدة الشخصية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {personalEquipment.map(pe => {
              const recipient = getRecipientById(pe.recipient_id);
              const weapon = pe.weapon_id ? getWeaponById(pe.weapon_id) : null;
              const eq = pe.equipment_id ? getEquipmentById(pe.equipment_id) : null;
              return (
                <div key={pe.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-bold">{recipient?.name}</p>
                    <p className="text-sm text-muted-foreground">{recipient?.military_number} - {recipient?.unit}</p>
                    <div className="flex gap-2 mt-1">
                      {weapon && <Badge variant="outline">{weapon.name}</Badge>}
                      {eq && <Badge variant="outline">{eq.name}</Badge>}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => deletePersonalEquipment(pe.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
            {personalEquipment.length === 0 && (
              <p className="text-center text-muted-foreground py-4">لا توجد عهدة مسجلة</p>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// Warehouses Component
function WarehousesTab({ warehouses, addWarehouse, updateWarehouse, deleteWarehouse }: {
  warehouses: any[];
  addWarehouse: (w: any) => void;
  updateWarehouse: (w: any) => void;
  deleteWarehouse: (id: string) => boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'أسلحة' as const, manager: '', location: '', notes: '' });

  const handleSubmit = () => {
    if (!form.name || !form.manager) return;
    addWarehouse(form);
    setForm({ name: '', type: 'أسلحة', manager: '', location: '', notes: '' });
    setIsOpen(false);
  };

  const warehouseTypes = ['أسلحة', 'ذخيرة', 'معدات', 'عهدة', 'عام'];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="mb-4"><Plus className="w-4 h-4 ml-2" />إضافة مخزن</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة مخزن جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم المخزن</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مخزن الأسلحة الرئيسي" />
            </div>
            <div>
              <Label>النوع</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {warehouseTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>المسؤول</Label>
              <Input value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} placeholder="أمين المخزن" />
            </div>
            <div>
              <Label>الموقع</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <Button onClick={handleSubmit} className="w-full">حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {warehouses.map(wh => (
          <Card key={wh.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{wh.name}</CardTitle>
                <Badge>{wh.type}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">المسؤول:</span> {wh.manager}</p>
                <p><span className="text-muted-foreground">الموقع:</span> {wh.location}</p>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => deleteWarehouse(wh.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {warehouses.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            لا توجد مخازن مسجلة
          </div>
        )}
      </div>
    </>
  );
}

// Recipients Component
function RecipientsTab({ recipients, addRecipient, updateRecipient, deleteRecipient }: {
  recipients: any[];
  addRecipient: (r: any) => void;
  updateRecipient: (r: any) => void;
  deleteRecipient: (id: string) => boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ name: '', military_number: '', unit: '', rank: '', phone: '' });

  const handleSubmit = () => {
    if (!form.name || !form.military_number) return;
    addRecipient(form);
    setForm({ name: '', military_number: '', unit: '', rank: '', phone: '' });
    setIsOpen(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="mb-4"><Plus className="w-4 h-4 ml-2" />إضافة مستلم</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة مستلم جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>الاسم</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>الرقم العسكري</Label>
                <Input value={form.military_number} onChange={(e) => setForm({ ...form, military_number: e.target.value })} />
              </div>
              <div>
                <Label>الرتبة</Label>
                <Input value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>الوحدة</Label>
              <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </div>
            <div>
              <Label>الهاتف</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <Button onClick={handleSubmit} className="w-full">حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="pt-4">
          <div className="space-y-2">
            {recipients.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-bold">{r.name} <span className="text-muted-foreground">({r.rank})</span></p>
                  <p className="text-sm text-muted-foreground">رقم عسكري: {r.military_number} | الوحدة: {r.unit}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => deleteRecipient(r.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {recipients.length === 0 && (
              <p className="text-center text-muted-foreground py-4">لا توجد مستلمين مسجلين</p>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// Movements Component
function MovementsTab({ movements, weapons, ammunition, equipment, recipients, warehouses, addMovement, getWeaponById, getEquipmentById, getRecipientById, getWarehouseById }: {
  movements: any[];
  weapons: any[];
  ammunition: any[];
  equipment: any[];
  recipients: any[];
  warehouses: any[];
  addMovement: (m: any) => void;
  getWeaponById: (id: string) => any;
  getEquipmentById: (id: string) => any;
  getRecipientById: (id: string) => any;
  getWarehouseById: (id: string) => any;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<{ item_type: string; item_id: string; warehouse_from: string; warehouse_to: string; recipient_id: string; type: MovementTypeArmory; quantity: number; date: string; notes: string }>({ item_type: 'weapon', item_id: '', warehouse_from: '', warehouse_to: '', recipient_id: '', type: 'وارد', quantity: 1, date: new Date().toISOString().split('T')[0], notes: '' });

  const handleSubmit = () => {
    if (!form.item_id || !form.date) return;
    addMovement(form);
    setForm({ item_type: 'weapon', item_id: '', warehouse_from: '', warehouse_to: '', recipient_id: '', type: 'وارد', quantity: 1, date: new Date().toISOString().split('T')[0], notes: '' });
    setIsOpen(false);
  };

  const getItemName = (type: string, id: string) => {
    if (type === 'weapon') return getWeaponById(id)?.name || '-';
    if (type === 'ammunition') return ammunition.find(a => a.id === id)?.type || '-';
    if (type === 'equipment') return getEquipmentById(id)?.name || '-';
    return '-';
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'وارد': return 'bg-green-100 text-green-800';
      case 'صادر': return 'bg-red-100 text-red-800';
      case 'تحويل': return 'bg-blue-100 text-blue-800';
      case 'إرجاع': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100';
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="mb-4"><Plus className="w-4 h-4 ml-2" />إضافة حركة</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة حركة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>نوع الصنف</Label>
              <Select value={form.item_type} onValueChange={(v) => setForm({ ...form, item_type: v as any, item_id: '' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weapon">سلاح</SelectItem>
                  <SelectItem value="ammunition">ذخيرة</SelectItem>
                  <SelectItem value="equipment">معداة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الصنف</Label>
              <Select value={form.item_id} onValueChange={(v) => setForm({ ...form, item_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر الصنف" /></SelectTrigger>
                <SelectContent>
                  {form.item_type === 'weapon' && weapons.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name} - {w.serial_number}</SelectItem>
                  ))}
                  {form.item_type === 'ammunition' && ammunition.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.type} - {a.caliber}</SelectItem>
                  ))}
                  {form.item_type === 'equipment' && equipment.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name} - {e.serial_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>نوع الحركة</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as MovementTypeArmory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {movementTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.type === 'صادر' && (
              <div>
                <Label>المستلم</Label>
                <Select value={form.recipient_id} onValueChange={(v) => setForm({ ...form, recipient_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر المستلم" /></SelectTrigger>
                  <SelectContent>
                    {recipients.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name} - {r.military_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.item_type === 'ammunition' && (
              <div>
                <Label>الكمية</Label>
                <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} />
              </div>
            )}
            <div>
              <Label>التاريخ</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <Button onClick={handleSubmit} className="w-full">حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>سجل الحركات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {movements.map(m => (
              <div key={m.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className={getTypeColor(m.type)}>{m.type}</Badge>
                    <span className="font-bold">{getItemName(m.item_type, m.item_id)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {m.date} {m.recipient_id && `| المستلم: ${getRecipientById(m.recipient_id)?.name}`}
                  </p>
                </div>
                {m.item_type === 'ammunition' && <span className="font-bold">{m.quantity}</span>}
              </div>
            ))}
            {movements.length === 0 && (
              <p className="text-center text-muted-foreground py-4">لا توجد حركات مسجلة</p>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
