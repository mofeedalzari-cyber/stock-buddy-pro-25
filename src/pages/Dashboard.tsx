import { useState } from 'react';
import { useWarehouse } from '@/contexts/WarehouseContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Package, Building2, Truck, ArrowLeftRight, AlertTriangle, TrendingUp, RefreshCw, ArrowDownCircle, ArrowUpCircle, BarChart3, AlertCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getProductTotalQty } from '@/pages/movements/reportsUtils';

const CHART_COLORS = ['hsl(174, 62%, 38%)', 'hsl(37, 95%, 55%)', 'hsl(220, 30%, 40%)', 'hsl(152, 60%, 40%)', 'hsl(0, 72%, 51%)', 'hsl(280, 50%, 50%)', 'hsl(200, 60%, 50%)'];

const Dashboard = () => {
  const { products, warehouses, suppliers, movements, categories, refreshAll, getWarehouseName, getUnitName, units } = useWarehouse();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
    toast({ title: t('updated'), description: t('data_updated') });
  };

  const getMinQuantity = (product: any) => product.min_quantity ?? 2;
  const getActualQty = (product: any) => getProductTotalQty(movements, product.id);

  // حساب الوارد والصادر لكل منتج
  const getProductInQty = (productId: string) => {
    let total = 0;
    movements.forEach(m => {
      if (m.type !== 'in') return;
      if (m.product_id === productId) {
        total += m.quantity || 0;
      } else if (m.items) {
        const item = m.items.find(i => i.product_id === productId);
        if (item) total += item.quantity || 0;
      }
    });
    return total;
  };

  const getProductOutQty = (productId: string) => {
    let total = 0;
    movements.forEach(m => {
      if (m.type !== 'out') return;
      if (m.product_id === productId) {
        total += m.quantity || 0;
      } else if (m.items) {
        const item = m.items.find(i => i.product_id === productId);
        if (item) total += item.quantity || 0;
      }
    });
    return total;
  };

  // تحويل الكمية للوحدة المعروضة
  const getDisplayInfo = (product: any, qty: number) => {
    if (product.display_unit_id && product.pack_size && product.pack_size > 0) {
      const displayQty = Math.floor(qty / product.pack_size);
      const remainder = qty % product.pack_size;
      const displayUnitName = getUnitName(product.display_unit_id);
      const baseUnitName = product.base_unit_id ? getUnitName(product.base_unit_id) : (product.unit || 'قطعة');
      if (remainder > 0) {
        return `${displayQty} ${displayUnitName} و ${remainder} ${baseUnitName}`;
      }
      return `${displayQty} ${displayUnitName}`;
    }
    const unitName = product.base_unit_id ? getUnitName(product.base_unit_id) : (product.unit || 'قطعة');
    return `${qty} ${unitName}`;
  };

  // بيانات المنتجات مع الإحصائيات
  const productStats = products.map(p => {
    const inQty = getProductInQty(p.id);
    const outQty = getProductOutQty(p.id);
    const stock = getActualQty(p);
    return { ...p, inQty, outQty, stock };
  });

  // فلتر البحث
  const filteredProducts = productStats.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // المنتجات المنخفضة والمنتهية
  const lowStock = products.filter(p => {
    const qty = getActualQty(p);
    return qty > 0 && qty <= getMinQuantity(p);
  });
  const criticalStock = lowStock;
  const outOfStock = products.filter(p => getActualQty(p) === 0);

  // إحصائيات عامة
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + getActualQty(p), 0);
  const totalWarehouses = warehouses.length;
  const totalMovements = movements.length;
  const totalSuppliers = suppliers.length;

  const totalInQuantity = movements.filter(m => m.type === 'in').reduce((sum, m) => {
    if (m.quantity) return sum + m.quantity;
    if (m.items) return sum + m.items.reduce((s, i) => s + (i.quantity || 0), 0);
    return sum;
  }, 0);
  const totalOutQuantity = movements.filter(m => m.type === 'out').reduce((sum, m) => {
    if (m.quantity) return sum + m.quantity;
    if (m.items) return sum + m.items.reduce((s, i) => s + (i.quantity || 0), 0);
    return sum;
  }, 0);

  // بيانات الرسم البياني
  const topProductsChart = productStats
    .sort((a, b) => b.stock - a.stock)
    .slice(0, 7)
    .map(p => ({
      name: p.name.length > 10 ? p.name.substring(0, 10) + '...' : p.name,
      وارد: p.inQty,
      صادر: p.outQty,
      رصيد: p.stock,
    }));

  const categoryData = categories.map(cat => ({
    name: cat.name,
    count: products.filter(p => p.category_id === cat.id).length,
  }));

  const movementChartData = [
    { name: t('incoming'), value: totalInQuantity },
    { name: t('outgoing'), value: totalOutQuantity },
  ];

  const recentMovements = movements.slice(-5).reverse();

  const getStockAlertColor = (product: any) => {
    const qty = getActualQty(product);
    const threshold = getMinQuantity(product);
    if (qty === 0) return 'bg-destructive/10 text-destructive';
    if (qty <= threshold) return 'bg-warning/10 text-warning';
    return 'bg-success/10 text-success';
  };

  const getStockStatus = (p: any) => {
    if (p.stock === 0) return { label: 'نفذ', class: 'bg-destructive text-destructive-foreground' };
    if (p.stock <= getMinQuantity(p)) return { label: 'منخفض', class: 'bg-warning/20 text-warning' };
    return { label: 'متوفر', class: 'bg-success/20 text-success' };
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* شريط العنوان */}
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-bold text-foreground">{t('nav_dashboard')}</h2>
        <Button onClick={handleRefresh} variant="outline" size="sm" className="gap-2 text-sm" disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{t('refresh')}</span>
        </Button>
      </div>

      {/* تحذير المخزون المنخفض */}
      {criticalStock.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-semibold text-foreground mb-0.5">
                ⚠️ تنبيه: منتجات بكمية منخفضة ({criticalStock.length} منتج)
              </h3>
              <p className="text-[10px] text-muted-foreground mb-1.5">
                المنتجات التالية وصلت إلى الحد الأدنى المحدد لها أو أقل.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {criticalStock.slice(0, 5).map(p => (
                  <span key={p.id} className={`text-[10px] px-2 py-0.5 rounded-full ${getStockAlertColor(p)}`}>
                    {p.name}: {getDisplayInfo(p, getActualQty(p))} (الحد: {getDisplayInfo(p, getMinQuantity(p))})
                  </span>
                ))}
                {criticalStock.length > 5 && (
                  <span className="text-[10px] text-muted-foreground">+{criticalStock.length - 5} أخرى</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
        <StatCard label={t('dash_total_products')} value={totalProducts} icon={Package} color="primary" />
        <StatCard label={t('dash_warehouses')} value={totalWarehouses} icon={Building2} color="accent" />
        <StatCard label={t('dash_suppliers')} value={totalSuppliers} icon={Truck} color="success" />
        <StatCard label={t('dash_movements')} value={totalMovements} icon={ArrowLeftRight} color="warning" />
        <StatCard label={t('dash_total_stock')} value={totalStock} icon={TrendingUp} color="primary" />
        <StatCard label={t('dash_low_stock')} value={lowStock.length} icon={AlertTriangle} color="destructive" />
      </div>

      {/* وارد / صادر */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <div className="bg-card rounded-xl p-4 shadow-card border border-border flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
            <ArrowDownCircle className="w-6 h-6 text-success" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{totalInQuantity}</div>
            <div className="text-xs text-muted-foreground">{t('dash_in_qty')}</div>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card border border-border flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
            <ArrowUpCircle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{totalOutQuantity}</div>
            <div className="text-xs text-muted-foreground">{t('dash_out_qty')}</div>
          </div>
        </div>
      </div>

      {/* ✅ جدول المنتجات الشامل - وارد / صادر / رصيد */}
      <div className="bg-card rounded-xl p-4 sm:p-5 shadow-card border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            جرد المنتجات - وارد / صادر / رصيد
          </h3>
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-full">
            {filteredProducts.length} منتج
          </span>
        </div>

        {/* بحث */}
        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث عن منتج..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pr-9 text-sm h-9"
          />
        </div>

        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-xs sm:text-sm min-w-[500px]">
            <thead>
              <tr className="border-b-2 border-primary/20">
                <th className="text-right py-2 px-2 sm:px-3 font-semibold text-foreground">المنتج</th>
                <th className="text-center py-2 px-2 sm:px-3 font-semibold text-success">
                  <div className="flex items-center justify-center gap-1">
                    <ArrowDownCircle className="w-3 h-3" />
                    وارد
                  </div>
                </th>
                <th className="text-center py-2 px-2 sm:px-3 font-semibold text-destructive">
                  <div className="flex items-center justify-center gap-1">
                    <ArrowUpCircle className="w-3 h-3" />
                    صادر
                  </div>
                </th>
                <th className="text-center py-2 px-2 sm:px-3 font-semibold text-primary">الرصيد</th>
                <th className="text-center py-2 px-2 sm:px-3 font-semibold text-foreground">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-muted-foreground">لا توجد منتجات</td>
                </tr>
              ) : (
                filteredProducts.map((p, idx) => {
                  const status = getStockStatus(p);
                  return (
                    <tr key={p.id} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? 'bg-muted/10' : ''}`}>
                      <td className="py-2.5 px-2 sm:px-3">
                        <div className="font-medium text-foreground">{p.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {p.base_unit_id ? getUnitName(p.base_unit_id) : (p.unit || 'قطعة')}
                        </div>
                      </td>
                      <td className="text-center py-2.5 px-2 sm:px-3">
                        <span className="font-bold text-success">{getDisplayInfo(p, p.inQty)}</span>
                      </td>
                      <td className="text-center py-2.5 px-2 sm:px-3">
                        <span className="font-bold text-destructive">{getDisplayInfo(p, p.outQty)}</span>
                      </td>
                      <td className="text-center py-2.5 px-2 sm:px-3">
                        <span className="font-bold text-primary">{getDisplayInfo(p, p.stock)}</span>
                      </td>
                      <td className="text-center py-2.5 px-2 sm:px-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${status.class}`}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredProducts.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-primary/30 bg-muted/20">
                  <td className="py-2.5 px-2 sm:px-3 font-bold text-foreground">الإجمالي</td>
                  <td className="text-center py-2.5 px-2 sm:px-3 font-bold text-success">
                    {filteredProducts.reduce((s, p) => s + p.inQty, 0)}
                  </td>
                  <td className="text-center py-2.5 px-2 sm:px-3 font-bold text-destructive">
                    {filteredProducts.reduce((s, p) => s + p.outQty, 0)}
                  </td>
                  <td className="text-center py-2.5 px-2 sm:px-3 font-bold text-primary">
                    {filteredProducts.reduce((s, p) => s + p.stock, 0)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* رسم بياني: أعلى المنتجات (وارد/صادر/رصيد) */}
      <div className="bg-card rounded-xl p-4 sm:p-5 shadow-card border border-border">
        <h3 className="text-sm sm:text-base font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          مقارنة المنتجات (وارد / صادر / رصيد)
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={topProductsChart} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
            />
            <Bar dataKey="وارد" fill="hsl(152, 60%, 40%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="صادر" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="رصيد" fill="hsl(174, 62%, 38%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* الرسوم البيانية */}
      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-card rounded-xl p-4 sm:p-5 shadow-card border border-border">
          <h3 className="text-sm sm:text-base font-semibold text-foreground mb-3 sm:mb-4">{t('dash_movement_chart')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={movementChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(174, 62%, 38%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl p-4 sm:p-5 shadow-card border border-border">
          <h3 className="text-sm sm:text-base font-semibold text-foreground mb-3 sm:mb-4">{t('dash_category_dist')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                outerRadius={70}
                dataKey="count"
                nameKey="name"
                label={({ name, count }) => `${name} (${count})`}
                labelLine={false}
              >
                {categoryData.map((_, idx) => (
                  <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* آخر الحركات + المنتجات المنخفضة */}
      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-card rounded-xl p-4 sm:p-5 shadow-card border border-border">
          <h3 className="text-sm sm:text-base font-semibold text-foreground mb-3 sm:mb-4">{t('dash_recent_movements')}</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {recentMovements.length === 0 ? (
              <p className="text-xs sm:text-sm text-muted-foreground">{t('mov_no_movements')}</p>
            ) : (
              recentMovements.map(m => {
                const product = products.find(p => p.id === m.product_id);
                return (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      {m.type === 'in' ? (
                        <ArrowDownCircle className="w-4 h-4 text-success" />
                      ) : (
                        <ArrowUpCircle className="w-4 h-4 text-destructive" />
                      )}
                      <span className="text-xs sm:text-sm text-foreground">{product?.name || 'متعددة'}</span>
                    </div>
                    <span className="text-xs sm:text-sm font-bold">{m.quantity || (m.items?.length + ' أصناف')}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 sm:p-5 shadow-card border border-border">
          <h3 className="text-sm sm:text-base font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            {t('dash_out_of_stock')} والمنخفض
          </h3>
          {outOfStock.length === 0 && lowStock.length === 0 ? (
            <p className="text-xs sm:text-sm text-muted-foreground">{t('no_data')}</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {outOfStock.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-xs sm:text-sm text-foreground">{p.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground">نفذ</span>
                </div>
              ))}
              {lowStock.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-xs sm:text-sm text-foreground">{p.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/20 text-warning font-medium">
                    {getDisplayInfo(p, getActualQty(p))} (الحد: {getDisplayInfo(p, getMinQuantity(p))})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// مكون بطاقة الإحصائيات
const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) => (
  <div className="bg-card rounded-xl p-3 sm:p-4 shadow-card border border-border hover:shadow-elevated transition-shadow">
    <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${
        color === 'primary' ? 'gradient-primary' :
        color === 'accent' ? 'gradient-accent' :
        color === 'success' ? 'bg-success' :
        color === 'warning' ? 'bg-warning' : 'bg-destructive'
      }`}>
        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
      </div>
    </div>
    <div className="text-lg sm:text-2xl font-bold text-foreground">{value}</div>
    <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{label}</div>
  </div>
);

export default Dashboard;
