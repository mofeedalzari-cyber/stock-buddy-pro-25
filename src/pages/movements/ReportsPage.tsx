// ============================================================================
// ملف: src/pages/movements/ReportsPage.tsx (نسخة مصححة بالكامل)
// ============================================================================
import { useState, useMemo } from 'react';
import { useWarehouse } from '@/contexts/WarehouseContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  FileSpreadsheet, FileText, Package, ArrowDownCircle, ArrowUpCircle,
  AlertTriangle, Building2, RefreshCw, Users, Printer, ClipboardCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import {
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
import { Product } from '@/types/warehouse';

import { Badge } from '@/components/ui/badge';

type ReportTab = 'products' | 'movements' | 'warehouses' | 'low-stock' | 'entities' | 'entitlements';

const ReportsPage = () => {
  const {
    products, categories, warehouses, suppliers, clients, movements, entitlements,
    getCategoryName, getWarehouseName, getProductName, getSupplierName, getClientName,
    getUnitName,
    refreshAll,
  } = useWarehouse();
  const { displayName } = useAuth();

  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<ReportTab>('products');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [movementFilter, setMovementFilter] = useState<'all' | 'in' | 'out'>('all');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [groupByProduct, setGroupByProduct] = useState(false);

  const warehouseManager = selectedWarehouse
    ? warehouses.find(w => w.id === selectedWarehouse)?.manager || 'غير محدد'
    : 'غير محدد';

  const getDisplayQty = (product: Product) => {
    const totalBaseQty = selectedWarehouse
      ? getWarehouseQty(movements, product.id, selectedWarehouse)
      : getProductTotalQty(movements, product.id);
    
    if (product.display_unit_id && product.pack_size && product.pack_size > 1) {
      return totalBaseQty / product.pack_size;
    }
    return totalBaseQty;
  };

  const getFormattedQuantityForProduct = (product: Product): string => {
    const totalBaseQty = selectedWarehouse
      ? getWarehouseQty(movements, product.id, selectedWarehouse)
      : getProductTotalQty(movements, product.id);
    
    if (!product.display_unit_id || !product.pack_size || product.pack_size <= 1) {
      return `${totalBaseQty}`;
    }
    
    const wholeUnits = Math.floor(totalBaseQty / product.pack_size);
    const remainder = totalBaseQty % product.pack_size;
    
    const displayUnitName = getUnitName(product.display_unit_id);
    const baseUnitName = getUnitName(product.base_unit_id || '');
    
    if (wholeUnits === 0) return `${remainder} ${baseUnitName}`;
    if (remainder === 0) return `${wholeUnits} ${displayUnitName}`;
    return `${wholeUnits} ${displayUnitName} و ${remainder} ${baseUnitName}`;
  };

  const getMovementDisplayQty = (movement: any) => {
    return movement.display_quantity ?? movement.quantity ?? 0;
  };

  const getMovementDisplayUnit = (movement: any) => {
    const unitId = movement.display_unit_id ?? movement.unit_id;
    if (unitId) return getUnitName(unitId);
    return movement.unit || 'قطعة';
  };

  const getFormattedMovementQty = (movement: any) => {
    if (movement.display_quantity != null && movement.display_unit_id) {
      const displayUnitName = getUnitName(movement.display_unit_id);
      return `${movement.display_quantity} ${displayUnitName}`;
    }
    const qty = movement.quantity ?? 0;
    const unitId = movement.unit_id;
    if (unitId) {
      return `${qty} ${getUnitName(unitId)}`;
    }
    return `${qty} ${movement.unit || 'قطعة'}`;
  };

  const getFormattedNetQty = (productId: string, netQty: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return `${netQty}`;
    if (!product.display_unit_id || !product.pack_size || product.pack_size <= 1) {
      return `${netQty}`;
    }
    const absQty = Math.abs(netQty);
    const wholeUnits = Math.floor(absQty / product.pack_size);
    const remainder = absQty % product.pack_size;
    const displayUnitName = getUnitName(product.display_unit_id);
    const baseUnitName = getUnitName(product.base_unit_id || '');
    const sign = netQty < 0 ? '-' : '';
    if (wholeUnits === 0) return `${sign}${remainder} ${baseUnitName}`;
    if (remainder === 0) return `${sign}${wholeUnits} ${displayUnitName}`;
    return `${sign}${wholeUnits} ${displayUnitName} و ${remainder} ${baseUnitName}`;
  };

  const filteredProducts = selectedWarehouse
    ? products.filter(p =>
        movements.some(m =>
          (m.warehouse_id === selectedWarehouse && m.product_id === p.id) ||
          (m.warehouse_id === selectedWarehouse && m.items?.some(i => i.product_id === p.id))
        )
      )
    : products;

  const getMinQuantity = (product: Product) => (product as any).min_quantity ?? 2;
  const lowStock = filteredProducts.filter(p => {
    const qty = getDisplayQty(p);
    return qty > 0 && qty <= getMinQuantity(p);
  });
  const outOfStock = filteredProducts.filter(p => getDisplayQty(p) === 0);

  const expanded = expandMovements(movements, getProductName);
  const filteredExpanded = expanded
    .filter(m => movementFilter === 'all' || m.type === movementFilter)
    .filter(m => (!dateFrom || m.date >= dateFrom) && (!dateTo || m.date <= dateTo))
    .filter(m => !selectedWarehouse || m.warehouse_id === selectedWarehouse)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const groupedByProduct = useMemo(() => {
    const map = new Map<string, { productId: string; productName: string; netQty: number }>();
    filteredExpanded.forEach(m => {
      const existing = map.get(m.product_id);
      const qty = m.type === 'in' ? m.quantity : -m.quantity;
      if (existing) {
        existing.netQty += qty;
      } else {
        map.set(m.product_id, {
          productId: m.product_id,
          productName: m.productName,
          netQty: qty,
        });
      }
    });
    return Array.from(map.values());
  }, [filteredExpanded]);

  const warehouseStock = (selectedWarehouse ? warehouses.filter(w => w.id === selectedWarehouse) : warehouses).map(w => {
    const productIds = new Set<string>();
    movements.forEach(m => {
      if (m.warehouse_id !== w.id) return;
      if (m.product_id) productIds.add(m.product_id);
      if (m.items) m.items.forEach(i => productIds.add(i.product_id));
    });
    const totalQty = Array.from(productIds).reduce((sum, pid) => {
      const product = products.find(p => p.id === pid);
      const qty = getWarehouseQty(movements, pid, w.id);
      if (product?.display_unit_id && product.pack_size && product.pack_size > 1) {
        return sum + (qty / product.pack_size);
      }
      return sum + qty;
    }, 0);
    return { name: w.name, products: productIds.size, totalQty };
  });

  const warehouseStockDetails = (selectedWarehouse ? warehouses.filter(w => w.id === selectedWarehouse) : warehouses).flatMap(w => {
    const productIds = new Set<string>();
    movements.forEach(m => {
      if (m.warehouse_id !== w.id) return;
      if (m.product_id) productIds.add(m.product_id);
      if (m.items) m.items.forEach(i => productIds.add(i.product_id));
    });
    return Array.from(productIds).map(pid => {
      const product = products.find(p => p.id === pid);
      if (!product) return null;
      const qty = getWarehouseQty(movements, pid, w.id);
      const displayQty = product.display_unit_id && product.pack_size && product.pack_size > 1
        ? qty / product.pack_size
        : qty;
      return {
        warehouseName: w.name,
        productName: getProductName(pid),
        product,
        quantity: displayQty,
        unit: product.display_unit_id ? getUnitName(product.display_unit_id) : (product.unit || 'قطعة'),
      };
    }).filter(Boolean);
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
        const qty = getMovementDisplayQty(m);
        totalQty += qty;
        productIds.add(m.product_id);
      }
      if (m.items) {
        m.items.forEach(item => {
          const qty = getMovementDisplayQty(item);
          totalQty += qty;
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
        const qty = getMovementDisplayQty(m);
        totalQty += qty;
        productIds.add(m.product_id);
      }
      if (m.items) {
        m.items.forEach(item => {
          const qty = getMovementDisplayQty(item);
          totalQty += qty;
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
        'الكمية المتبقية': getFormattedQuantityForProduct(p),
        'الوحدة': p.display_unit_id ? getUnitName(p.display_unit_id) : (p.unit || 'قطعة'),
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
      getFormattedQuantityForProduct(p),
      p.display_unit_id ? getUnitName(p.display_unit_id) : (p.unit || 'قطعة'),
    ]);
    const html = buildSimplePdfHtml(
      'تقرير المنتجات',
      ['م', 'المنتج', 'الكود', 'الصنف', 'المورد', 'جهة الصرف', 'الكمية المتبقية', 'الوحدة'],
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
    if (groupByProduct) {
      exportExcel(
        groupedByProduct.map(item => ({
          'المنتج': item.productName,
          'صافي الكمية': getFormattedNetQty(item.productId, item.netQty),
          'المخزن': getWarehouseName(selectedWarehouse),
        })),
        'ملخص_الحركات',
        'ملخص_الحركات'
      );
    } else {
      exportExcel(
        filteredExpanded.map(m => ({
          'التاريخ': m.date,
          'النوع': m.type === 'in' ? 'وارد' : 'صادر',
          'المنتج': m.productName,
          'الكمية': getFormattedMovementQty(m),
          'الوحدة': getMovementDisplayUnit(m),
          'المخزن': getWarehouseName(m.warehouse_id),
          'المورد': m.entity_type === 'supplier' ? getSupplierName(m.entity_id) : '-',
          'جهة الصرف': m.entity_type === 'client' ? getClientName(m.entity_id) : '-',
          'ملاحظات': m.notes || '',
        })),
        'الحركات',
        'تقرير_الحركات'
      );
    }
  };

  const exportMovementsPdf = () => {
    if (!checkWarehouseSelected()) return;
    if (groupByProduct) {
      const rows = groupedByProduct.map((item, i) => [
        String(i + 1),
        item.productName,
        getFormattedNetQty(item.productId, item.netQty),
        getWarehouseName(selectedWarehouse),
      ]);
      const html = buildSimplePdfHtml(
        'ملخص حركات المخزون حسب المنتج',
        ['م', 'المنتج', 'صافي الكمية', 'المخزن'],
        rows,
        selectedWarehouse,
        getWarehouseName,
        warehouseManager,
        displayName || '__________'
      );
      printPdfFromHtml(html, 'ملخص_الحركات', toast);
    } else {
      const rows = filteredExpanded.map((m, i) => [
        String(i + 1),
        m.date,
        m.type === 'in' ? 'وارد' : 'صادر',
        m.productName,
        getFormattedMovementQty(m),
        getMovementDisplayUnit(m),
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
    }
  };

  const printMovements = () => {
    exportMovementsPdf();
  };

  const exportWarehousesExcel = () => {
    if (!checkWarehouseSelected()) return;
    exportExcel(
      warehouseStockDetails.map(d => ({
        'المنتج': d.productName,
        'المخزن': d.warehouseName,
        'الكمية': getFormattedQuantityForProduct(d.product),
        'الوحدة': d.unit,
      })),
      'تقرير_المخازن',
      'تقرير_المخازن'
    );
  };

  const exportWarehousesPdf = () => {
    if (!checkWarehouseSelected()) return;
    const rows = warehouseStockDetails.map(d => [d.productName, d.warehouseName, getFormattedQuantityForProduct(d.product), d.unit]);
    const html = buildSimplePdfHtml(
      'تقرير المخازن',
      ['المنتج', 'المخزن', 'الكمية', 'الوحدة'],
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
        'الكمية': getFormattedQuantityForProduct(p),
        'الوحدة': p.display_unit_id ? getUnitName(p.display_unit_id) : (p.unit || 'قطعة'),
        'المخزن': getWarehouseName(selectedWarehouse),
        'الحالة': getDisplayQty(p) === 0 ? 'نفذ' : 'منخفض',
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
      getFormattedQuantityForProduct(p),
      p.display_unit_id ? getUnitName(p.display_unit_id) : (p.unit || 'قطعة'),
      getWarehouseName(selectedWarehouse),
      getDisplayQty(p) === 0 ? 'نفذ' : 'منخفض',
    ]);
    const html = buildSimplePdfHtml(
      'تقرير المنتجات منخفضة المخزون',
      ['م', 'المنتج', 'الكود', 'الكمية', 'الوحدة', 'المخزن', 'الحالة'],
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

  const printSuppliersReport = async () => {
    if (!checkWarehouseSelected()) return;
    const html = buildSuppliersReportHtml(
      selectedWarehouse,
      supplierItems,
      suppliers,
      getWarehouseName,
      getSupplierName,
      warehouseManager,
      displayName || '__________',
      getUnitName
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
      displayName || '__________',
      getUnitName
    );
    await printPdfFromHtml(html, 'تقرير_جهات_الصرف', toast);
  };

  const printSuppliersDetails = async () => {
    if (!checkWarehouseSelected()) return;
    const rows = supplierItems.map((item, idx) => [
      String(idx + 1),
      getSupplierName(item.entity_id),
      item.productName,
      getFormattedMovementQty(item),
      getMovementDisplayUnit(item),
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
      getFormattedMovementQty(item),
      getMovementDisplayUnit(item),
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
      {/* القسم العلوي: اختيار المخزن */}
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

      {/* شريط التبويبات */}
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

      {/* محتوى تبويب المنتجات */}
      {tab === 'products' && (
        <div className="space-y-4 sm:space-y-5">
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {[
              { label: 'إجمالي المنتجات', value: filteredProducts.length },
              { label: 'إجمالي المخزون', value: filteredProducts.reduce((s, p) => s + getDisplayQty(p), 0) },
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
                <thead>
                  <tr className="bg-secondary/50 border-b border-border">
                    <th className="text-right p-2 sm:p-3 font-semibold">م</th>
                    <th className="text-right p-2 sm:p-3 font-semibold">المنتج</th>
                    <th className="text-right p-2 sm:p-3 font-semibold">الكود</th>
                    <th className="text-right p-2 sm:p-3 font-semibold">الصنف</th>
                    <th className="text-right p-2 sm:p-3 font-semibold">المورد</th>
                    <th className="text-right p-2 sm:p-3 font-semibold">جهة الصرف</th>
                    <th className="text-right p-2 sm:p-3 font-semibold">الكمية المتبقية</th>
                    <th className="text-right p-2 sm:p-3 font-semibold">الوحدة</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p, i) => {
                    const qty = getDisplayQty(p);
                    const styleClass = qty === 0 ? 'bg-destructive/10 text-destructive' : (qty <= 10 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success');
                    return (
                      <tr key={p.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                        <td className="p-2 sm:p-3">{i + 1}</td>
                        <td className="p-2 sm:p-3 font-medium">{p.name}</td>
                        <td className="p-2 sm:p-3 text-muted-foreground font-mono text-[10px] sm:text-xs">{p.code}</td>
                        <td className="p-2 sm:p-3 text-muted-foreground">{getCategoryName(p.category_id || '')}</td>
                        <td className="p-2 sm:p-3 text-muted-foreground">{getProductSuppliers(movements, p.id, selectedWarehouse, getSupplierName)}</td>
                        <td className="p-2 sm:p-3 text-muted-foreground">{getProductClients(movements, p.id, selectedWarehouse, getClientName)}</td>
                        <td className="p-2 sm:p-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${styleClass}`}>
                            {getFormattedQuantityForProduct(p)}
                          </span>
                        </td>
                        <td className="p-2 sm:p-3 text-muted-foreground">
                          {p.display_unit_id ? getUnitName(p.display_unit_id) : (p.unit || 'قطعة')}
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

      {/* محتوى تبويب الحركات */}
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
            <div className="p-3 sm:p-4 border-b border-border">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-foreground text-sm sm:text-base">
                  جدول الحركات ({groupByProduct ? groupedByProduct.length : filteredExpanded.length} عنصر)
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant={!groupByProduct ? "default" : "outline"} onClick={() => setGroupByProduct(false)} className="h-8 text-xs">عرض تفصيلي</Button>
                  <Button size="sm" variant={groupByProduct ? "default" : "outline"} onClick={() => setGroupByProduct(true)} className="h-8 text-xs">عرض ملخص</Button>
                  <Button size="sm" variant="outline" onClick={exportMovementsExcel} className="h-8 text-xs gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                  </Button>
                  <Button size="sm" variant="outline" onClick={exportMovementsPdf} className="h-8 text-xs gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={printMovements} className="h-8 text-xs gap-1.5">
                    <Printer className="w-3.5 h-3.5" /> طباعة
                  </Button>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm min-w-[600px]">
                <thead>
                  <tr className="bg-secondary/50 border-b border-border">
                    <th className="text-right p-2 sm:p-3 font-semibold">م</th>
                    <th className="text-right p-2 sm:p-3 font-semibold">التاريخ</th>
                    <th className="text-right p-2 sm:p-3 font-semibold">النوع</th>
                    <th className="text-right p-2 sm:p-3 font-semibold">المنتج</th>
                    <th className="text-right p-2 sm:p-3 font-semibold">الكمية</th>
                    <th className="text-right p-2 sm:p-3 font-semibold">الوحدة</th>
                    <th className="text-right p-2 sm:p-3 font-semibold">المخزن</th>
                    <th className="text-right p-2 sm:p-3 font-semibold">المورد</th>
                    <th className="text-right p-2 sm:p-3 font-semibold">جهة الصرف</th>
                  </tr>
                </thead>
                <tbody>
                  {groupByProduct ? (
                    groupedByProduct.map((item, i) => (
                      <tr key={item.productId} className="border-b border-border hover:bg-secondary/30">
                        <td className="p-2 sm:p-3">{i + 1}</td>
                        <td className="p-2 sm:p-3 text-muted-foreground">-</td>
                        <td className="p-2 sm:p-3">صافي</td>
                        <td className="p-2 sm:p-3 font-medium">{item.productName}</td>
                        <td className="p-2 sm:p-3 font-bold">{getFormattedNetQty(item.productId, item.netQty)}</td>
                        <td className="p-2 sm:p-3 text-muted-foreground">-</td>
                        <td className="p-2 sm:p-3 text-muted-foreground">{getWarehouseName(selectedWarehouse)}</td>
                        <td className="p-2 sm:p-3">-</td>
                        <td className="p-2 sm:p-3">-</td>
                      </tr>
                    ))
                  ) : (
                    filteredExpanded.map((m, i) => (
                      <tr key={m.itemId} className="border-b border-border hover:bg-secondary/30">
                        <td className="p-2 sm:p-3">{i + 1}</td>
                        <td className="p-2 sm:p-3 text-muted-foreground">{m.date}</td>
                        <td className="p-2 sm:p-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            m.type === 'in' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                          }`}>{m.type === 'in' ? 'وارد' : 'صادر'}</span>
                        </td>
                        <td className="p-2 sm:p-3 font-medium">{m.productName}</td>
                        <td className="p-2 sm:p-3 font-bold">{getFormattedMovementQty(m)}</td>
                        <td className="p-2 sm:p-3 text-muted-foreground">{getMovementDisplayUnit(m)}</td>
                        <td className="p-2 sm:p-3 text-muted-foreground">{getWarehouseName(m.warehouse_id)}</td>
                        <td className="p-2 sm:p-3 text-muted-foreground">{m.entity_type === 'supplier' ? getSupplierName(m.entity_id) : '-'}</td>
                        <td className="p-2 sm:p-3 text-muted-foreground">{m.entity_type === 'client' ? getClientName(m.entity_id) : '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* محتوى تبويب المخازن */}
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
                <thead>
                  <tr className="bg-secondary/50 border-b border-border">
                    <th className="text-right p-2 sm:p-3 font-semibold">المنتج</th>
                    <th className="text-right p-2 sm:p-3 font-semibold">المخزن</th>
                    <th className="text-right p-2 sm:p-3 font-semibold">الكمية</th>
                    <th className="text-right p-2 sm:p-3 font-semibold">الوحدة</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouseStockDetails.map((d, i) => (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/30">
                      <td className="p-2 sm:p-3 font-medium">{d.productName}</td>
                      <td className="p-2 sm:p-3">{d.warehouseName}</td>
                      <td className="p-2 sm:p-3 font-bold">{getFormattedQuantityForProduct(d.product)}</td>
                      <td className="p-2 sm:p-3">{d.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* محتوى تبويب المخزون المنخفض */}
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
                <thead>
                  <tr className="bg-secondary/50 border-b border-border">
                    <th className="text-right p-2 sm:p-3 font-semibold">م</th>
                    <th className="text-right p-2 sm:p-3 font-semibold">المنتج</th>
                    <th className="text-right p-2 sm:p-3 font-semibold">الكود</th>
                    <th className="text-right p-2 sm:p-3 font-semibold">الكمية</th>
                    <th className="text-right p-2 sm:p-3 font-semibold">الوحدة</th>
                    <th className="text-right p-2 sm:p-3 font-semibold">المخزن</th>
                    <th className="text-right p-2 sm:p-3 font-semibold">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((p, i) => {
                    const qty = getDisplayQty(p);
                    return (
                      <tr key={p.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                        <td className="p-2 sm:p-3">{i + 1}</td>
                        <td className="p-2 sm:p-3 font-medium">{p.name}</td>
                        <td className="p-2 sm:p-3 text-muted-foreground font-mono text-[10px] sm:text-xs">{p.code}</td>
                        <td className="p-2 sm:p-3 font-bold text-destructive">{getFormattedQuantityForProduct(p)}</td>
                        <td className="p-2 sm:p-3 text-muted-foreground">{p.display_unit_id ? getUnitName(p.display_unit_id) : (p.unit || 'قطعة')}</td>
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

      {/* محتوى تبويب الموردين وجهات الصرف */}
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
                <thead>
                  <tr className="bg-secondary/50 border-b border-border">
                    <th className="text-right p-2 font-semibold">م</th>
                    <th className="text-right p-2 font-semibold">المورد</th>
                    <th className="text-right p-2 font-semibold">المنتج</th>
                    <th className="text-right p-2 font-semibold">الكمية</th>
                    <th className="text-right p-2 font-semibold">الوحدة</th>
                    <th className="text-right p-2 font-semibold">المخزن</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierItems.map((item, idx) => (
                    <tr key={item.itemId} className="border-b border-border hover:bg-secondary/30">
                      <td className="p-2">{idx + 1}</td>
                      <td className="p-2 font-medium">{getSupplierName(item.entity_id)}</td>
                      <td className="p-2">{item.productName}</td>
                      <td className="p-2 font-bold">{getFormattedMovementQty(item)}</td>
                      <td className="p-2 text-muted-foreground">{getMovementDisplayUnit(item)}</td>
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
                <thead>
                  <tr className="bg-secondary/50 border-b border-border">
                    <th className="text-right p-2 font-semibold">م</th>
                    <th className="text-right p-2 font-semibold">جهة الصرف</th>
                    <th className="text-right p-2 font-semibold">المنتج</th>
                    <th className="text-right p-2 font-semibold">الكمية</th>
                    <th className="text-right p-2 font-semibold">الوحدة</th>
                    <th className="text-right p-2 font-semibold">المخزن</th>
                    <th className="text-right p-2 font-semibold">النوع</th>
                  </tr>
                </thead>
                <tbody>
                  {clientItems.map((item, idx) => (
                    <tr key={item.itemId} className="border-b border-border hover:bg-secondary/30">
                      <td className="p-2">{idx + 1}</td>
                      <td className="p-2 font-medium">{getClientName(item.entity_id)}</td>
                      <td className="p-2">{item.productName}</td>
                      <td className="p-2 font-bold">{getFormattedMovementQty(item)}</td>
                      <td className="p-2 text-muted-foreground">{getMovementDisplayUnit(item)}</td>
                      <td className="p-2 text-muted-foreground">{getWarehouseName(item.warehouse_id)}</td>
                      <td className="p-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-destructive/10 text-destructive">منصرف</span>
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
