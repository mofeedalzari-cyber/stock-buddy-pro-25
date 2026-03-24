// ============================================================================
// ملف: src/pages/movements/ReportsPage.tsx (محدث)
// ============================================================================
import { useState } from 'react';
import { useWarehouse } from '@/contexts/WarehouseContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  FileSpreadsheet, FileText, Package, ArrowDownCircle, ArrowUpCircle,
  AlertTriangle, Building2, RefreshCw, Users, Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import {
  COLORS,
  getWarehouseQty,
  getProductTotalQty,
  getProductSuppliers,
  getProductClients,
  expandMovements,
  exportExcel,
  printPdfFromHtml,
  buildSuppliersReportHtml,
  buildClientsReportHtml,
  buildSimplePdfHtml
} from './reportsUtils';

type ReportTab = 'products' | 'movements' | 'warehouses' | 'low-stock' | 'entities';

const ReportsPage = () => {
  const {
    products, categories, warehouses, suppliers, clients, movements,
    getCategoryName, getWarehouseName, getProductName, getSupplierName, getClientName,
    refreshAll,
  } = useWarehouse();
  const { displayName } = useAuth(); // اسم المستخدم الحالي

  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<ReportTab>('products');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [movementFilter, setMovementFilter] = useState<'all' | 'in' | 'out'>('all');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');

  // الحصول على اسم مدير المخزن المحدد
  const warehouseManager = selectedWarehouse
    ? warehouses.find(w => w.id === selectedWarehouse)?.manager || 'غير محدد'
    : 'غير محدد';

  // ========== دوال محسنة تعتمد على الحالة ==========
  const getDisplayQty = (productId: string) => {
    if (selectedWarehouse) return getWarehouseQty(movements, productId, selectedWarehouse);
    return getProductTotalQty(movements, productId);
  };

  const filteredProducts = selectedWarehouse
    ? products.filter(p =>
        movements.some(m =>
          (m.warehouse_id === selectedWarehouse && m.product_id === p.id) ||
          (m.warehouse_id === selectedWarehouse && m.items?.some(i => i.product_id === p.id))
        )
      )
    : products;

  const lowStock = filteredProducts.filter(p => getDisplayQty(p.id) <= 10);
  const outOfStock = filteredProducts.filter(p => getDisplayQty(p.id) === 0);

  const expanded = expandMovements(movements, getProductName);
  const filteredExpanded = expanded
    .filter(m => movementFilter === 'all' || m.type === movementFilter)
    .filter(m => (!dateFrom || m.date >= dateFrom) && (!dateTo || m.date <= dateTo))
    .filter(m => !selectedWarehouse || m.warehouse_id === selectedWarehouse)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const warehouseStock = (selectedWarehouse ? warehouses.filter(w => w.id === selectedWarehouse) : warehouses).map(w => {
    const productIds = new Set<string>();
    movements.forEach(m => {
      if (m.warehouse_id !== w.id) return;
      if (m.product_id) productIds.add(m.product_id);
      if (m.items) m.items.forEach(i => productIds.add(i.product_id));
    });
    const totalQty = Array.from(productIds).reduce((sum, pid) => sum + getWarehouseQty(movements, pid, w.id), 0);
    return { name: w.name, products: productIds.size, totalQty };
  });

  const warehouseStockDetails = (selectedWarehouse ? warehouses.filter(w => w.id === selectedWarehouse) : warehouses).flatMap(w => {
    const productIds = new Set<string>();
    movements.forEach(m => {
      if (m.warehouse_id !== w.id) return;
      if (m.product_id) productIds.add(m.product_id);
      if (m.items) m.items.forEach(i => productIds.add(i.product_id));
    });
    return Array.from(productIds).map(pid => ({
      warehouseName: w.name,
      productName: getProductName(pid),
      quantity: getWarehouseQty(movements, pid, w.id),
    }));
  });

  const supplierItems = expanded
    .filter(m => m.entity_type === 'supplier' && (!selectedWarehouse || m.warehouse_id === selectedWarehouse))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const clientItems = expanded
    .filter(m => m.entity_type === 'client' && (!selectedWarehouse || m.warehouse_id === selectedWarehouse))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const supplierReport = suppliers.map(s => {
    const sMovements = movements.filter(m =>
      m.entity_type === 'supplier' && m.entity_id === s.id &&
      (!selectedWarehouse || m.warehouse_id === selectedWarehouse)
    );
    let totalQty = 0;
    const productIds = new Set<string>();
    sMovements.forEach(m => {
      if (m.product_id) {
        totalQty += m.quantity;
        productIds.add(m.product_id);
      }
      if (m.items) {
        m.items.forEach(item => {
          totalQty += item.quantity;
          productIds.add(item.product_id);
        });
      }
    });
    return {
      name: s.name,
      phone: s.phone,
      totalQty,
      productCount: productIds.size,
      productNames: Array.from(productIds).map(id => getProductName(id)).join('، ') || '-',
    };
  }).filter(s => s.totalQty > 0);

  const clientReport = clients.map(c => {
    const cMovements = movements.filter(m =>
      m.entity_type === 'client' && m.entity_id === c.id &&
      (!selectedWarehouse || m.warehouse_id === selectedWarehouse)
    );
    let totalQty = 0;
    const productIds = new Set<string>();
    cMovements.forEach(m => {
      if (m.product_id) {
        totalQty += m.quantity;
        productIds.add(m.product_id);
      }
      if (m.items) {
        m.items.forEach(item => {
          totalQty += item.quantity;
          productIds.add(item.product_id);
        });
      }
    });
    return {
      name: c.name,
      phone: c.phone,
      totalQty,
      productCount: productIds.size,
      productNames: Array.from(productIds).map(id => getProductName(id)).join('، ') || '-',
    };
  }).filter(c => c.totalQty > 0);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
    toast({ title: 'تم التحديث', description: 'تم تحديث البيانات بنجاح' });
  };

  const checkWarehouseSelected = () => {
    if (!selectedWarehouse) {
      toast({ title: 'تنبيه', description: 'يجب اختيار المخزن أولاً قبل التصدير', variant: 'destructive' });
      return false;
    }
    return true;
  };

  // ========== دوال التصدير (تستدعي الدوال من utils) ==========
  const exportProductsExcel = () => {
    if (!checkWarehouseSelected()) return;
    exportExcel(
      filteredProducts.map(p => ({
        'المنتج': p.name,
        'الكود': p.code,
        'الباركود': p.barcode,
        'الصنف': getCategoryName(p.category_id || ''),
        'المورد': getProductSuppliers(movements, p.id, selectedWarehouse, getSupplierName),
        'جهة الصرف': getProductClients(movements, p.id, selectedWarehouse, getClientName),
        'الكمية المتبقية': getDisplayQty(p.id),
        'المخزن': getWarehouseName(selectedWarehouse),
      })),
      'المنتجات',
      'تقرير_المنتجات'
    );
  };

  const exportProductsPdf = () => {
    if (!checkWarehouseSelected()) return;
    const rows = filteredProducts.map((p, i) => [
      String(i + 1),
      p.name,
      p.code,
      getCategoryName(p.category_id || ''),
      getProductSuppliers(movements, p.id, selectedWarehouse, getSupplierName),
      getProductClients(movements, p.id, selectedWarehouse, getClientName),
      String(getDisplayQty(p.id)),
    ]);
    const html = buildSimplePdfHtml(
      'تقرير المنتجات',
      ['م', 'المنتج', 'الكود', 'الصنف', 'المورد', 'جهة الصرف', 'الكمية المتبقية'],
      rows,
      selectedWarehouse,
      getWarehouseName,
      warehouseManager,
      displayName || '__________'
    );
    printPdfFromHtml(html, 'تقرير_المنتجات', toast);
  };

  const exportMovementsExcel = () => {
    if (!checkWarehouseSelected()) return;
    exportExcel(
      filteredExpanded.map(m => ({
        'التاريخ': m.date,
        'النوع': m.type === 'in' ? 'وارد' : 'صادر',
        'المنتج': m.productName,
        'الكمية': m.quantity,
        'الوحدة': m.unit,
        'المخزن': getWarehouseName(m.warehouse_id),
        'المورد': m.entity_type === 'supplier' ? getSupplierName(m.entity_id) : '-',
        'جهة الصرف': m.entity_type === 'client' ? getClientName(m.entity_id) : '-',
        'ملاحظات': m.notes || '',
      })),
      'الحركات',
      'تقرير_الحركات'
    );
  };

  const exportMovementsPdf = () => {
    if (!checkWarehouseSelected()) return;
    const rows = filteredExpanded.map((m, i) => [
      String(i + 1),
      m.date,
      m.type === 'in' ? 'وارد' : 'صادر',
      m.productName,
      String(m.quantity),
      m.unit || '-',
      getWarehouseName(m.warehouse_id),
      m.entity_type === 'supplier' ? getSupplierName(m.entity_id) : '-',
      m.entity_type === 'client' ? getClientName(m.entity_id) : '-',
    ]);
    const html = buildSimplePdfHtml(
      'تقرير حركة المخزون',
      ['م', 'التاريخ', 'النوع', 'المنتج', 'الكمية', 'الوحدة', 'المخزن', 'المورد', 'جهة الصرف'],
      rows,
      selectedWarehouse,
      getWarehouseName,
      warehouseManager,
      displayName || '__________'
    );
    printPdfFromHtml(html, 'تقرير_الحركات', toast);
  };

  const exportWarehousesExcel = () => {
    if (!checkWarehouseSelected()) return;
    exportExcel(
      warehouseStockDetails.map(d => ({
        'المنتج': d.productName,
        'المخزن': d.warehouseName,
        'الكمية': d.quantity,
      })),
      'تقرير_المخازن',
      'تقرير_المخازن'
    );
  };

  const exportWarehousesPdf = () => {
    if (!checkWarehouseSelected()) return;
    const rows = warehouseStockDetails.map(d => [d.productName, d.warehouseName, String(d.quantity)]);
    const html = buildSimplePdfHtml(
      'تقرير المخازن',
      ['المنتج', 'المخزن', 'الكمية'],
      rows,
      selectedWarehouse,
      getWarehouseName,
      warehouseManager,
      displayName || '__________'
    );
    printPdfFromHtml(html, 'تقرير_المخازن', toast);
  };

  const exportLowStockExcel = () => {
    if (!checkWarehouseSelected()) return;
    exportExcel(
      lowStock.map(p => ({
        'المنتج': p.name,
        'الكود': p.code,
        'الكمية': getDisplayQty(p.id),
        'المخزن': getWarehouseName(selectedWarehouse),
        'الحالة': getDisplayQty(p.id) === 0 ? 'نفذ' : 'منخفض',
      })),
      'منخفض المخزون',
      'تقرير_المخزون_المنخفض'
    );
  };

  const exportLowStockPdf = () => {
    if (!checkWarehouseSelected()) return;
    const rows = lowStock.map((p, i) => [
      String(i + 1),
      p.name,
      p.code,
      String(getDisplayQty(p.id)),
      getWarehouseName(selectedWarehouse),
      getDisplayQty(p.id) === 0 ? 'نفذ' : 'منخفض',
    ]);
    const html = buildSimplePdfHtml(
      'تقرير المنتجات منخفضة المخزون',
      ['م', 'المنتج', 'الكود', 'الكمية', 'المخزن', 'الحالة'],
      rows,
      selectedWarehouse,
      getWarehouseName,
      warehouseManager,
      displayName || '__________'
    );
    printPdfFromHtml(html, 'تقرير_المخزون_المنخفض', toast);
  };

  const exportEntitiesExcel = () => {
    if (!checkWarehouseSelected()) return;
    const data = [
      ...supplierReport.map(s => ({
        'النوع': 'مورد',
        'الاسم': s.name,
        'الهاتف': s.phone,
        'عدد المنتجات': s.productCount,
        'إجمالي الكميات': s.totalQty,
        'المنتجات': s.productNames,
      })),
      ...clientReport.map(c => ({
        'النوع': 'جهة صرف',
        'الاسم': c.name,
        'الهاتف': c.phone,
        'عدد المنتجات': c.productCount,
        'إجمالي الكميات': c.totalQty,
        'المنتجات': c.productNames,
      })),
    ];
    exportExcel(data, 'الموردين_وجهات_الصرف', 'تقرير_الموردين_وجهات_الصرف');
  };

  const exportEntitiesPdf = () => {
    if (!checkWarehouseSelected()) return;
    const rows = [
      ...supplierReport.map((s, i) => [String(i + 1), 'مورد', s.name, String(s.productCount), String(s.totalQty), s.productNames]),
      ...clientReport.map((c, i) => [String(supplierReport.length + i + 1), 'جهة صرف', c.name, String(c.productCount), String(c.totalQty), c.productNames]),
    ];
    const html = buildSimplePdfHtml(
      'تقرير الموردين وجهات الصرف',
      ['م', 'النوع', 'الاسم', 'عدد المنتجات', 'إجمالي الكميات', 'المنتجات'],
      rows,
      selectedWarehouse,
      getWarehouseName,
      warehouseManager,
      displayName || '__________'
    );
    printPdfFromHtml(html, 'تقرير_الموردين_وجهات_الصرف', toast);
  };

  // ========== دوال طباعة التقارير المفصلة ==========
  const printSuppliersReport = async () => {
    if (!checkWarehouseSelected()) return;
    const html = buildSuppliersReportHtml(
      selectedWarehouse,
      supplierItems,
      suppliers,
      getWarehouseName,
      getSupplierName,
      warehouseManager,
      displayName || '__________'
    );
    await printPdfFromHtml(html, 'تقرير_الموردين', toast);
  };

  const printClientsReport = async () => {
    if (!checkWarehouseSelected()) return;
    const html = buildClientsReportHtml(
      selectedWarehouse,
      clientItems,
      clients,
      getWarehouseName,
      getClientName,
      warehouseManager,
      displayName || '__________'
    );
    await printPdfFromHtml(html, 'تقرير_جهات_الصرف', toast);
  };

  const printSuppliersDetails = async () => {
    if (!checkWarehouseSelected()) return;
    const rows = supplierItems.map((item, idx) => [
      String(idx + 1),
      getSupplierName(item.entity_id),
      item.productName,
      String(item.quantity),
      item.unit || '-',
      getWarehouseName(item.warehouse_id),
    ]);
    const html = buildSimplePdfHtml(
      'تقرير تفاصيل حركات الموردين',
      ['م', 'المورد', 'المنتج', 'الكمية', 'الوحدة', 'المخزن'],
      rows,
      selectedWarehouse,
      getWarehouseName,
      warehouseManager,
      displayName || '__________'
    );
    await printPdfFromHtml(html, 'تقرير_تفاصيل_الموردين', toast);
  };

  const printClientsDetails = async () => {
    if (!checkWarehouseSelected()) return;
    const rows = clientItems.map((item, idx) => [
      String(idx + 1),
      getClientName(item.entity_id),
      item.productName,
      String(item.quantity),
      item.unit || '-',
      getWarehouseName(item.warehouse_id),
      'منصرف',
    ]);
    const html = buildSimplePdfHtml(
      'تقرير تفاصيل حركات جهات الصرف',
      ['م', 'جهة الصرف', 'المنتج', 'الكمية', 'الوحدة', 'المخزن', 'النوع'],
      rows,
      selectedWarehouse,
      getWarehouseName,
      warehouseManager,
      displayName || '__________'
    );
    await printPdfFromHtml(html, 'تقرير_تفاصيل_جهات_الصرف', toast);
  };

  const tabs: { id: ReportTab; label: string; icon: any }[] = [
    { id: 'products', label: 'المنتجات', icon: Package },
    { id: 'movements', label: 'الحركات', icon: ArrowDownCircle },
    { id: 'warehouses', label: 'المخازن', icon: Building2 },
    { id: 'low-stock', label: 'المخزون المنخفض', icon: AlertTriangle },
    { id: 'entities', label: 'الموردين وجهات الصرف', icon: Users },
  ];

  return (
    <div className="space-y-4 sm:space-y-5" dir="rtl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <label className="text-sm font-semibold text-foreground whitespace-nowrap">المخزن:</label>
          <select
            value={selectedWarehouse}
            onChange={e => setSelectedWarehouse(e.target.value)}
            className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="">-- اختر المخزن --</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
        {!selectedWarehouse && (
          <span className="text-xs text-destructive font-medium">⚠ يجب اختيار المخزن للتصدير</span>
        )}
        <Button onClick={handleRefresh} variant="outline" className="text-sm shrink-0" disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 ml-2 ${refreshing ? 'animate-spin' : ''}`} />تحديث
        </Button>
      </div>

      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
              tab === t.id ? 'gradient-primary text-primary-foreground shadow-elevated' : 'bg-card text-muted-foreground border border-border hover:bg-secondary'
            }`}>
            <t.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'products' && (
        <div className="space-y-4 sm:space-y-5">
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {[
              { label: 'إجمالي المنتجات', value: filteredProducts.length },
              { label: 'إجمالي المخزون', value: filteredProducts.reduce((s, p) => s + getDisplayQty(p.id), 0) },
              { label: 'الأصناف', value: categories.length },
            ].map((s, i) => (
              <div key={i} className="bg-card rounded-lg sm:rounded-xl p-3 sm:p-4 border border-border shadow-card text-center">
                <div className="text-lg sm:text-xl font-bold text-foreground">{s.value}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-card rounded-lg sm:rounded-xl p-3 sm:p-5 border border-border shadow-card">
            <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-3 sm:mb-4">توزيع المنتجات حسب الصنف</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categories.map(c => ({ name: c.name, count: filteredProducts.filter(p => p.category_id === c.id).length }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(174, 62%, 38%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-lg sm:rounded-xl border border-border shadow-card overflow-hidden">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border gap-2">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">جدول المنتجات</h3>
              <div className="flex gap-1.5 sm:gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={exportProductsExcel} className="text-[10px] sm:text-xs gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-3">
                  <FileSpreadsheet className="w-3 h-3 sm:w-3.5 sm:h-3.5" />Excel
                </Button>
                <Button size="sm" variant="outline" onClick={exportProductsPdf} className="text-[10px] sm:text-xs gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-3">
                  <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" />PDF
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm min-w-[600px]">
                <thead><tr className="bg-secondary/50 border-b border-border">
                  <th className="text-right p-2 sm:p-3 font-semibold">م</th>
                  <th className="text-right p-2 sm:p-3 font-semibold">المنتج</th>
                  <th className="text-right p-2 sm:p-3 font-semibold">الكود</th>
                  <th className="text-right p-2 sm:p-3 font-semibold">الصنف</th>
                  <th className="text-right p-2 sm:p-3 font-semibold">المورد</th>
                  <th className="text-right p-2 sm:p-3 font-semibold">جهة الصرف</th>
                  <th className="text-right p-2 sm:p-3 font-semibold">الكمية المتبقية</th>
                </tr></thead>
                <tbody>
                  {filteredProducts.map((p, i) => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                      <td className="p-2 sm:p-3">{i + 1}</td>
                      <td className="p-2 sm:p-3 font-medium">{p.name}</td>
                      <td className="p-2 sm:p-3 text-muted-foreground font-mono text-[10px] sm:text-xs">{p.code}</td>
                      <td className="p-2 sm:p-3 text-muted-foreground">{getCategoryName(p.category_id || '')}</td>
                      <td className="p-2 sm:p-3 text-muted-foreground">{getProductSuppliers(movements, p.id, selectedWarehouse, getSupplierName)}</td>
                      <td className="p-2 sm:p-3 text-muted-foreground">{getProductClients(movements, p.id, selectedWarehouse, getClientName)}</td>
                      <td className="p-2 sm:p-3">
                        {(() => { const qty = getDisplayQty(p.id); return (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          qty === 0 ? 'bg-destructive/10 text-destructive' :
                          qty <= 10 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                        }`}>{qty}</span>
                        ); })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'movements' && (
        <div className="space-y-4 sm:space-y-5">
          <div className="bg-card rounded-lg sm:rounded-xl p-3 sm:p-4 border border-border shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
              <div className="flex gap-2 flex-1">
                <div className="flex-1">
                  <label className="text-[10px] sm:text-xs font-medium text-muted-foreground block mb-1">من تاريخ</label>
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 sm:h-9 text-xs sm:text-sm" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] sm:text-xs font-medium text-muted-foreground block mb-1">إلى تاريخ</label>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 sm:h-9 text-xs sm:text-sm" />
                </div>
              </div>
              <div className="flex rounded-lg border border-border overflow-hidden self-start sm:self-auto">
                {(['all', 'in', 'out'] as const).map(f => (
                  <button key={f} onClick={() => setMovementFilter(f)}
                    className={`px-3 py-1.5 sm:py-2 text-xs font-medium transition-colors ${
                      movementFilter === f ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-secondary'
                    }`}>
                    {f === 'all' ? 'الكل' : f === 'in' ? 'وارد' : 'صادر'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-card rounded-lg sm:rounded-xl border border-border shadow-card overflow-hidden">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border gap-2">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">
                جدول الحركات ({filteredExpanded.length} عنصر)
              </h3>
              <div className="flex gap-1.5 sm:gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={exportMovementsExcel} className="text-[10px] sm:text-xs gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-3">
                  <FileSpreadsheet className="w-3 h-3 sm:w-3.5 sm:h-3.5" />Excel
                </Button>
                <Button size="sm" variant="outline" onClick={exportMovementsPdf} className="text-[10px] sm:text-xs gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-3">
                  <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" />PDF
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm min-w-[600px]">
                <thead><tr className="bg-secondary/50 border-b border-border">
                  <th className="text-right p-2 sm:p-3 font-semibold">م</th>
                  <th className="text-right p-2 sm:p-3 font-semibold">التاريخ</th>
                  <th className="text-right p-2 sm:p-3 font-semibold">النوع</th>
                  <th className="text-right p-2 sm:p-3 font-semibold">المنتج</th>
                  <th className="text-right p-2 sm:p-3 font-semibold">الكمية</th>
                  <th className="text-right p-2 sm:p-3 font-semibold">الوحدة</th>
                  <th className="text-right p-2 sm:p-3 font-semibold">المخزن</th>
                  <th className="text-right p-2 sm:p-3 font-semibold">المورد</th>
                  <th className="text-right p-2 sm:p-3 font-semibold">جهة الصرف</th>
                </tr></thead>
                <tbody>
                  {filteredExpanded.map((m, i) => (
                    <tr key={m.itemId} className="border-b border-border last:border-0 hover:bg-secondary/30">
                      <td className="p-2 sm:p-3">{i + 1}</td>
                      <td className="p-2 sm:p-3 text-muted-foreground">{m.date}</td>
                      <td className="p-2 sm:p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          m.type === 'in' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                        }`}>{m.type === 'in' ? 'وارد' : 'صادر'}</span>
                      </td>
                      <td className="p-2 sm:p-3 font-medium">{m.productName}</td>
                      <td className="p-2 sm:p-3 font-bold">{m.quantity}</td>
                      <td className="p-2 sm:p-3 text-muted-foreground">{m.unit || '-'}</td>
                      <td className="p-2 sm:p-3 text-muted-foreground">{getWarehouseName(m.warehouse_id)}</td>
                      <td className="p-2 sm:p-3 text-muted-foreground">{m.entity_type === 'supplier' ? getSupplierName(m.entity_id) : '-'}</td>
                      <td className="p-2 sm:p-3 text-muted-foreground">{m.entity_type === 'client' ? getClientName(m.entity_id) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'warehouses' && (
        <div className="space-y-4 sm:space-y-5">
          <div className="bg-card rounded-lg sm:rounded-xl p-3 sm:p-5 border border-border shadow-card">
            <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-3 sm:mb-4">مقارنة المخازن</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={warehouseStock}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="totalQty" name="الكميات" fill="hsl(174, 62%, 38%)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="products" name="المنتجات" fill="hsl(37, 95%, 55%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card rounded-lg sm:rounded-xl border border-border shadow-card overflow-hidden">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border gap-2">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">ملخص المخازن</h3>
              <div className="flex gap-1.5 sm:gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={exportWarehousesExcel} className="text-[10px] sm:text-xs gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-3">
                  <FileSpreadsheet className="w-3 h-3 sm:w-3.5 sm:h-3.5" />Excel
                </Button>
                <Button size="sm" variant="outline" onClick={exportWarehousesPdf} className="text-[10px] sm:text-xs gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-3">
                  <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" />PDF
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead><tr className="bg-secondary/50 border-b border-border">
                  <th className="text-right p-2 sm:p-3 font-semibold">المنتج</th>
                  <th className="text-right p-2 sm:p-3 font-semibold">المخزن</th>
                  <th className="text-right p-2 sm:p-3 font-semibold">الكمية</th>
                </tr></thead>
                <tbody>
                  {warehouseStockDetails.map((d, i) => (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/30">
                      <td className="p-2 sm:p-3 font-medium">{d.productName}</td>
                      <td className="p-2 sm:p-3">{d.warehouseName}</td>
                      <td className="p-2 sm:p-3 font-bold">{d.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'low-stock' && (
        <div className="space-y-4 sm:space-y-5">
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div className="bg-card rounded-lg sm:rounded-xl p-3 sm:p-4 border border-border shadow-card text-center">
              <div className="text-xl sm:text-2xl font-bold text-warning">{lowStock.length - outOfStock.length}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">منخفض الكمية</div>
            </div>
            <div className="bg-card rounded-lg sm:rounded-xl p-3 sm:p-4 border border-border shadow-card text-center">
              <div className="text-xl sm:text-2xl font-bold text-destructive">{outOfStock.length}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">غير متوفر (نفذ)</div>
            </div>
          </div>
          <div className="bg-card rounded-lg sm:rounded-xl border border-border shadow-card overflow-hidden">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border gap-2">
              <h3 className="font-semibold text-foreground flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-warning" />
                المنتجات منخفضة المخزون ({lowStock.length})
              </h3>
              <div className="flex gap-1.5 sm:gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={exportLowStockExcel} className="text-[10px] sm:text-xs gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-3">
                  <FileSpreadsheet className="w-3 h-3 sm:w-3.5 sm:h-3.5" />Excel
                </Button>
                <Button size="sm" variant="outline" onClick={exportLowStockPdf} className="text-[10px] sm:text-xs gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-3">
                  <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" />PDF
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm min-w-[500px]">
                <thead><tr className="bg-secondary/50 border-b border-border">
                  <th className="text-right p-2 sm:p-3 font-semibold">م</th>
                  <th className="text-right p-2 sm:p-3 font-semibold">المنتج</th>
                  <th className="text-right p-2 sm:p-3 font-semibold">الكود</th>
                  <th className="text-right p-2 sm:p-3 font-semibold">الكمية</th>
                  <th className="text-right p-2 sm:p-3 font-semibold">المخزن</th>
                  <th className="text-right p-2 sm:p-3 font-semibold">الحالة</th>
                </tr></thead>
                <tbody>
                  {lowStock.map((p, i) => {
                    const qty = getDisplayQty(p.id);
                    return (
                      <tr key={p.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                        <td className="p-2 sm:p-3">{i + 1}</td>
                        <td className="p-2 sm:p-3 font-medium">{p.name}</td>
                        <td className="p-2 sm:p-3 text-muted-foreground font-mono text-[10px] sm:text-xs">{p.code}</td>
                        <td className="p-2 sm:p-3 font-bold text-destructive">{qty}</td>
                        <td className="p-2 sm:p-3 text-muted-foreground">{getWarehouseName(selectedWarehouse)}</td>
                        <td className="p-2 sm:p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${qty === 0 ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}>
                            {qty === 0 ? 'نفذ' : 'منخفض'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'entities' && (
        <div className="space-y-4 sm:space-y-5">
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div className="bg-card rounded-lg sm:rounded-xl p-3 sm:p-4 border border-border shadow-card text-center">
              <div className="text-xl sm:text-2xl font-bold text-primary">{supplierReport.length}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">موردين نشطين</div>
            </div>
            <div className="bg-card rounded-lg sm:rounded-xl p-3 sm:p-4 border border-border shadow-card text-center">
              <div className="text-xl sm:text-2xl font-bold text-accent-foreground">{clientReport.length}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">جهات صرف نشطة</div>
            </div>
          </div>

          <div className="bg-card rounded-lg sm:rounded-xl border border-border shadow-card overflow-hidden">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border gap-2">
              <h3 className="font-semibold text-foreground text-sm sm:text-base flex items-center gap-2">
                <ArrowDownCircle className="w-4 h-4 text-success" />
                تفاصيل حركات الموردين
              </h3>
              <Button size="sm" variant="outline" onClick={printSuppliersDetails} className="text-[10px] sm:text-xs gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-3">
                <Printer className="w-3 h-3 sm:w-3.5 sm:h-3.5" />طباعة التقرير
              </Button>
            </div>
            <div className="overflow-x-auto p-3">
              <table className="w-full text-xs sm:text-sm">
                <thead><tr className="bg-secondary/50 border-b border-border">
                  <th className="text-right p-2 font-semibold">م</th>
                  <th className="text-right p-2 font-semibold">المورد</th>
                  <th className="text-right p-2 font-semibold">المنتج</th>
                  <th className="text-right p-2 font-semibold">الكمية</th>
                  <th className="text-right p-2 font-semibold">الوحدة</th>
                  <th className="text-right p-2 font-semibold">المخزن</th>
                </tr></thead>
                <tbody>
                  {supplierItems.map((item, idx) => (
                    <tr key={item.itemId} className="border-b border-border hover:bg-secondary/30">
                      <td className="p-2">{idx + 1}</td>
                      <td className="p-2 font-medium">{getSupplierName(item.entity_id)}</td>
                      <td className="p-2">{item.productName}</td>
                      <td className="p-2 font-bold">{item.quantity}</td>
                      <td className="p-2 text-muted-foreground">{item.unit || '-'}</td>
                      <td className="p-2 text-muted-foreground">{getWarehouseName(item.warehouse_id)}</td>
                    </tr>
                  ))}
                  {supplierItems.length === 0 && (
                    <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">لا توجد حركات موردين</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-card rounded-lg sm:rounded-xl border border-border shadow-card overflow-hidden">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border gap-2">
              <h3 className="font-semibold text-foreground text-sm sm:text-base flex items-center gap-2">
                <ArrowUpCircle className="w-4 h-4 text-destructive" />
                تفاصيل حركات جهات الصرف
              </h3>
              <Button size="sm" variant="outline" onClick={printClientsDetails} className="text-[10px] sm:text-xs gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-3">
                <Printer className="w-3 h-3 sm:w-3.5 sm:h-3.5" />طباعة التقرير
              </Button>
            </div>
            <div className="overflow-x-auto p-3">
              <table className="w-full text-xs sm:text-sm">
                <thead><tr className="bg-secondary/50 border-b border-border">
                  <th className="text-right p-2 font-semibold">م</th>
                  <th className="text-right p-2 font-semibold">جهة الصرف</th>
                  <th className="text-right p-2 font-semibold">المنتج</th>
                  <th className="text-right p-2 font-semibold">الكمية</th>
                  <th className="text-right p-2 font-semibold">الوحدة</th>
                  <th className="text-right p-2 font-semibold">المخزن</th>
                  <th className="text-right p-2 font-semibold">النوع</th>
                </tr></thead>
                <tbody>
                  {clientItems.map((item, idx) => (
                    <tr key={item.itemId} className="border-b border-border hover:bg-secondary/30">
                      <td className="p-2">{idx + 1}</td>
                      <td className="p-2 font-medium">{getClientName(item.entity_id)}</td>
                      <td className="p-2">{item.productName}</td>
                      <td className="p-2 font-bold">{item.quantity}</td>
                      <td className="p-2 text-muted-foreground">{item.unit || '-'}</td>
                      <td className="p-2 text-muted-foreground">{getWarehouseName(item.warehouse_id)}</td>
                      <td className="p-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-destructive/10 text-destructive">
                          منصرف
                        </span>
                      </td>
                    </tr>
                  ))}
                  {clientItems.length === 0 && (
                    <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">لا توجد حركات جهات صرف</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={exportEntitiesExcel} className="text-[10px] sm:text-xs gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-3">
              <FileSpreadsheet className="w-3 h-3 sm:w-3.5 sm:h-3.5" />تصدير Excel شامل
            </Button>
            <Button size="sm" variant="outline" onClick={exportEntitiesPdf} className="text-[10px] sm:text-xs gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-3">
              <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" />تصدير PDF شامل
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
