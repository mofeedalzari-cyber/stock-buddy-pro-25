import { useState } from 'react';
import { useWarehouse } from '@/contexts/WarehouseContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Package, Building2, Truck, ArrowLeftRight, AlertTriangle, TrendingUp, RefreshCw, ArrowDownCircle, ArrowUpCircle, BarChart3, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const CHART_COLORS = ['hsl(174, 62%, 38%)', 'hsl(37, 95%, 55%)', 'hsl(220, 30%, 40%)', 'hsl(152, 60%, 40%)', 'hsl(0, 72%, 51%)'];

const Dashboard = () => {
  const { products, warehouses, suppliers, movements, categories, refreshAll, getWarehouseName } = useWarehouse();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
    toast({ title: t('updated'), description: t('data_updated') });
  };

  // ✅ دالة للحصول على حد التنبيه للمنتج (افتراضي 2)
  const getMinQuantity = (product: any) => product.min_quantity ?? 2;

  // ✅ المنتجات المنخفضة: الكمية > 0 والكمية ≤ الحد الأدنى
  const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= getMinQuantity(p));
  
  // ✅ المنتجات الحرجية (نفس lowStock) - يمكن استخدامها في التنبيه العلوي
  const criticalStock = lowStock;
  
  // المنتجات المنتهية (0)
  const outOfStock = products.filter(p => p.quantity === 0);

  // إحصائيات المنتجات
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + p.quantity, 0);

  // إحصائيات المخازن
  const totalWarehouses = warehouses.length;

  // إحصائيات الحركات (مع دعم الحركات المتعددة)
  const totalMovements = movements.length;
  const inMovements = movements.filter(m => m.type === 'in');
  const outMovements = movements.filter(m => m.type === 'out');
  const totalInQuantity = inMovements.reduce((sum, m) => {
    if (m.quantity) return sum + m.quantity;
    if (m.items) return sum + m.items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0);
    return sum;
  }, 0);
  const totalOutQuantity = outMovements.reduce((sum, m) => {
    if (m.quantity) return sum + m.quantity;
    if (m.items) return sum + m.items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0);
    return sum;
  }, 0);

  // إحصائيات الموردين
  const totalSuppliers = suppliers.length;

  // بيانات الرسم البياني للحركات (وارد/صادر)
  const movementChartData = [
    { name: t('incoming'), value: totalInQuantity },
    { name: t('outgoing'), value: totalOutQuantity },
  ];

  // بيانات الرسم البياني لتوزيع المنتجات حسب المخازن
  const warehouseProductData = warehouses.map(w => {
    const count = products.filter(p => p.warehouse_id === w.id).length;
    return { name: w.name, count };
  }).filter(w => w.count > 0);

  // بيانات الرسم البياني للمنتجات حسب الفئة
  const categoryData = categories.map(cat => ({
    name: cat.name,
    count: products.filter(p => p.category_id === cat.id).length,
  }));

  // آخر 5 حركات
  const recentMovements = movements.slice(-5).reverse();

  // ✅ دالة لتحديد لون التحذير حسب الكمية والحد
  const getStockAlertColor = (product: any) => {
    const qty = product.quantity;
    const threshold = getMinQuantity(product);
    if (qty === 0) return 'bg-destructive/10 text-destructive';
    if (qty <= threshold) return 'bg-warning/10 text-warning';
    return 'bg-success/10 text-success';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* شريط العنوان وزر التحديث */}
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-bold text-foreground">{t('nav_dashboard')}</h2>
        <Button onClick={handleRefresh} variant="outline" size="sm" className="gap-2 text-sm" disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{t('refresh')}</span>
        </Button>
      </div>

      {/* ✅ تحذير للمخزون المنخفض (حسب min_quantity لكل منتج) */}
      {criticalStock.length > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">
                ⚠️ تنبيه: منتجات بكمية منخفضة ({criticalStock.length} منتج)
              </h3>
              <p className="text-xs text-muted-foreground mb-2">
                المنتجات التالية وصلت إلى الحد الأدنى المحدد لها أو أقل، يرجى إعادة التوريد.
              </p>
              <div className="flex flex-wrap gap-2">
                {criticalStock.slice(0, 5).map(p => (
                  <span key={p.id} className={`text-xs px-2 py-1 rounded-full ${getStockAlertColor(p)}`}>
                    {p.name}: {p.quantity} {p.unit || 'قطعة'} (الحد: {getMinQuantity(p)})
                    {p.warehouse_id && ` - ${getWarehouseName(p.warehouse_id)}`}
                  </span>
                ))}
                {criticalStock.length > 5 && (
                  <span className="text-xs text-muted-foreground">+{criticalStock.length - 5} منتجات أخرى</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
        <StatCard label={t('dash_total_products')} value={totalProducts} icon={Package} color="primary" />
        <StatCard label={t('dash_warehouses')} value={totalWarehouses} icon={Building2} color="accent" />
        <StatCard label={t('dash_suppliers')} value={totalSuppliers} icon={Truck} color="success" />
        <StatCard label={t('dash_movements')} value={totalMovements} icon={ArrowLeftRight} color="warning" />
        <StatCard label={t('dash_total_stock')} value={totalStock} icon={TrendingUp} color="primary" />
        <StatCard label={t('dash_low_stock')} value={lowStock.length} icon={AlertTriangle} color="destructive" />
      </div>

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
          <h3 className="text-sm sm:text-base font-semibold text-foreground mb-3 sm:mb-4">{t('dash_warehouse_dist')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={warehouseProductData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(37, 95%, 55%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-card rounded-xl p-4 sm:p-5 shadow-card border border-border">
          <h3 className="text-sm sm:text-base font-semibold text-foreground mb-3 sm:mb-4">{t('dash_category_dist')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(152, 60%, 40%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

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
                      <span className="text-xs sm:text-sm text-foreground">{product?.name || 'منتج'}</span>
                    </div>
                    <span className="text-xs sm:text-sm font-bold">{m.quantity}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* منتجات منخفضة (حسب min_quantity) وغير متوفرة */}
      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-card rounded-xl p-4 sm:p-5 shadow-card border border-border">
          <h3 className="text-sm sm:text-base font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            {t('dash_low_stock_alert')} (حسب الحد المحدد)
          </h3>
          {lowStock.length === 0 ? (
            <p className="text-xs sm:text-sm text-muted-foreground">{t('no_data')}</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {lowStock.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex flex-col">
                    <span className="text-xs sm:text-sm text-foreground">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {getWarehouseName(p.warehouse_id)} | الحد: {getMinQuantity(p)}
                    </span>
                  </div>
                  <span className={`text-xs sm:text-sm font-bold px-2 py-0.5 rounded-full ${getStockAlertColor(p)}`}>
                    {p.quantity} {p.unit || 'قطعة'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl p-4 sm:p-5 shadow-card border border-border">
          <h3 className="text-sm sm:text-base font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            {t('dash_out_of_stock')}
          </h3>
          {outOfStock.length === 0 ? (
            <p className="text-xs sm:text-sm text-muted-foreground">{t('no_data')}</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {outOfStock.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex flex-col">
                    <span className="text-xs sm:text-sm text-foreground">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {getWarehouseName(p.warehouse_id)}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground">
                    نفذ
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
const StatCard = ({ label, value, icon: Icon, color }) => (
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
