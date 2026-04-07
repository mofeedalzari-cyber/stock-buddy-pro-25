// ============================================================================
// ملف: src/pages/movements/ReportsPageLogic.tsx
// ============================================================================
import { useState, useMemo } from 'react';
import { useWarehouse } from '@/contexts/WarehouseContext';
import { useAuth } from '@/contexts/AuthContext';
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

export const useReportsLogic = () => {
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
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [entitlementMonth, setEntitlementMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

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

  // دوال التصدير والطباعة...
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

  // ... (جميع دوال التصدير والطباعة الأخرى بنفس النمط)
  // نظراً لطول الكود، سأكمل في الرد التالي...

  return {
    // البيانات والحالات
    refreshing, setRefreshing,
    tab, setTab,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    movementFilter, setMovementFilter,
    selectedWarehouse, setSelectedWarehouse,
    groupByProduct, setGroupByProduct,
    selectedClient, setSelectedClient,
    entitlementMonth, setEntitlementMonth,
    
    // القيم المحسوبة
    warehouseManager,
    filteredProducts,
    lowStock,
    outOfStock,
    filteredExpanded,
    groupedByProduct,
    warehouseStock,
    warehouseStockDetails,
    supplierItems,
    clientItems,
    supplierReport,
    clientReport,
    clientsWithEntitlements: useMemo(() => {
      const clientIds = new Set(entitlements.map(e => e.client_id));
      return clients.filter(c => clientIds.has(c.id));
    }, [clients, entitlements]),
    
    // الدوال
    handleRefresh,
    getDisplayQty,
    getFormattedQuantityForProduct,
    getFormattedMovementQty,
    getMovementDisplayUnit,
    getFormattedNetQty,
    exportProductsExcel,
    exportProductsPdf,
    exportMovementsExcel,
    exportMovementsPdf,
    printMovements,
    exportWarehousesExcel,
    exportWarehousesPdf,
    exportLowStockExcel,
    exportLowStockPdf,
    exportEntitiesExcel,
    exportEntitiesPdf,
    printSuppliersReport,
    printClientsReport,
    printSuppliersDetails,
    printClientsDetails,
    printSelectedClientEntitlements,
    exportEntitlementsPdf,
    exportEntitlementsExcel,
  };
};

type ReportTab = 'products' | 'movements' | 'warehouses' | 'low-stock' | 'entities' | 'entitlements';
