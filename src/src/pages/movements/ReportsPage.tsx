// ============================================================================
// ملف: src/pages/movements/ReportsPage.tsx
// ============================================================================
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Badge } from '@/components/ui/badge';
import {
  FileSpreadsheet, FileText, Package, ArrowDownCircle, ArrowUpCircle,
  AlertTriangle, Building2, RefreshCw, Users, Printer, ClipboardCheck
} from 'lucide-react';
import { useReportsLogic } from './ReportsPageLogic';

const ReportsPage = () => {
  const {
    refreshing, tab, setTab,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    movementFilter, setMovementFilter,
    selectedWarehouse, setSelectedWarehouse,
    groupByProduct, setGroupByProduct,
    selectedClient, setSelectedClient,
    entitlementMonth, setEntitlementMonth,
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
    clientsWithEntitlements,
    entitlementReport,
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
  } = useReportsLogic();

  const tabs = [
    { id: 'products', label: 'المنتجات', icon: Package },
    { id: 'movements', label: 'الحركات', icon: ArrowDownCircle },
    { id: 'warehouses', label: 'المخازن', icon: Building2 },
    { id: 'low-stock', label: 'المخزون المنخفض', icon: AlertTriangle },
    { id: 'entities', label: 'الموردين وجهات الصرف', icon: Users },
    { id: 'entitlements', label: 'الاستحقاقات', icon: ClipboardCheck },
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
          {/* ... محتوى المنتجات (نفس الكود السابق) ... */}
        </div>
      )}

      {/* محتوى تبويب الحركات */}
      {tab === 'movements' && (
        <div className="space-y-4 sm:space-y-5">
          {/* ... محتوى الحركات (نفس الكود السابق) ... */}
        </div>
      )}

      {/* محتوى تبويب المخازن */}
      {tab === 'warehouses' && (
        <div className="space-y-4 sm:space-y-5">
          {/* ... محتوى المخازن (نفس الكود السابق) ... */}
        </div>
      )}

      {/* محتوى تبويب المخزون المنخفض */}
      {tab === 'low-stock' && (
        <div className="space-y-4 sm:space-y-5">
          {/* ... محتوى المخزون المنخفض (نفس الكود السابق) ... */}
        </div>
      )}

      {/* محتوى تبويب الموردين وجهات الصرف */}
      {tab === 'entities' && (
        <div className="space-y-4 sm:space-y-5">
          {/* ... محتوى الموردين وجهات الصرف (نفس الكود السابق) ... */}
        </div>
      )}

      {/* محتوى تبويب الاستحقاقات */}
      {tab === 'entitlements' && (
        <div className="space-y-4 sm:space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-foreground whitespace-nowrap">الشهر:</label>
              <Input
                type="month"
                value={entitlementMonth}
                onChange={e => setEntitlementMonth(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-foreground whitespace-nowrap">جهة الصرف:</label>
              <select
                value={selectedClient}
                onChange={e => setSelectedClient(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">-- جميع جهات الصرف --</option>
                {clientsWithEntitlements.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-1.5 sm:gap-2 mr-auto">
              <Button size="sm" variant="outline" onClick={exportEntitlementsExcel} className="text-[10px] sm:text-xs gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-3">
                <FileSpreadsheet className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Excel
              </Button>
              <Button size="sm" variant="outline" onClick={exportEntitlementsPdf} className="text-[10px] sm:text-xs gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-3">
                <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> PDF
              </Button>
              {selectedClient && (
                <Button size="sm" variant="outline" onClick={printSelectedClientEntitlements} className="text-[10px] sm:text-xs gap-1 sm:gap-1.5 h-7 sm:h-8 px-2 sm:px-3">
                  <Printer className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> طباعة لجهة الصرف
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {[
              { label: 'إجمالي الاستحقاقات', value: entitlementReport.length },
              { label: 'ضمن الاستحقاق', value: entitlementReport.filter((r: any) => !r.exceeded).length },
              { label: 'خارج الاستحقاق', value: entitlementReport.filter((r: any) => r.exceeded).length },
            ].map((s, i) => (
              <div key={i} className={`bg-card rounded-lg sm:rounded-xl p-3 sm:p-4 border border-border shadow-card text-center ${i === 2 && entitlementReport.some((r: any) => r.exceeded) ? 'border-destructive/50' : ''}`}>
                <div className={`text-lg sm:text-xl font-bold ${i === 2 ? 'text-destructive' : 'text-foreground'}`}>{s.value}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-card rounded-lg sm:rounded-xl border border-border shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm min-w-[700px]">
                <thead>
                  <tr className="bg-secondary/50 border-b border-border">
                    <th className="text-right p-2 sm:p-3 font-semibold">م</th>
                    <th className="text-right p-2 sm:p-3 font-semibold">جهة الصرف</th>
                    <th className="text-right p-2 sm:p-3 font-semibold">المنتج</th>
                    <th className="text-right p-2 sm:p-3 font-semibold">الاستحقاق</th>
                    <th className="text-right p-2 sm:p-3 font-semibold">المصروف</th>
                    <th className="text-right p-2 sm:p-3 font-semibold">المتبقي</th>
                    <th className="text-right p-2 sm:p-3 font-semibold">الوحدة</th>
                    <th className="text-center p-2 sm:p-3 font-semibold">الحالة</th>
                  </table>
                </thead>
                <tbody>
                  {entitlementReport.map((r: any, i: number) => (
                    <tr key={`${r.clientId}-${r.productId}`} className={`border-b border-border hover:bg-secondary/30 ${r.exceeded ? 'bg-destructive/5' : ''}`}>
                      <td className="p-2 sm:p-3">{i + 1}</td>
                      <td className="p-2 sm:p-3 font-medium">{r.clientName}</td>
                      <td className="p-2 sm:p-3">{r.productName}</td>
                      <td className="p-2 sm:p-3 font-bold">{r.entitlement}</td>
                      <td className="p-2 sm:p-3 font-bold">{r.actual}</td>
                      <td className="p-2 sm:p-3">{r.remaining}</td>
                      <td className="p-2 sm:p-3 text-muted-foreground">{r.unit}</td>
                      <td className="p-2 sm:p-3 text-center">
                        {r.exceeded ? (
                          <Badge variant="destructive" className="text-[10px]">
                            خارج الاستحقاق (+{r.overAmount})
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-green-500 text-green-600">
                            ضمن الاستحقاق
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                  {entitlementReport.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">
                        لا توجد استحقاقات محددة. قم بإضافة استحقاقات من صفحة جهات الصرف.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
