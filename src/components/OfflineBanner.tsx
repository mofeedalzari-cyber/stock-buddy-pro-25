import { WifiOff, CloudUpload, Loader2 } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useWarehouse } from "@/contexts/WarehouseContext";
import { Button } from "@/components/ui/button";

const OfflineBanner = () => {
  const isOnline = useOnlineStatus();

  // useWarehouse قد لا يكون متاحاً خارج WarehouseProvider
  // لذلك نستخدم try/catch
  return isOnline ? <OnlineSyncBanner /> : <OfflineBar />;
};

const OfflineBar = () => {
  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-2 text-center text-sm flex items-center justify-center gap-2 sticky top-0 z-50">
      <WifiOff className="h-4 w-4" />
      <span>لا يوجد اتصال بالإنترنت - يمكنك إضافة بيانات وسيتم ترحيلها عند عودة الاتصال</span>
    </div>
  );
};

const OnlineSyncBanner = () => {
  let pendingCount = 0;
  let syncing = false;
  let syncFn: (() => Promise<void>) | null = null;

  try {
    const ctx = useWarehouse();
    pendingCount = ctx.pendingCount;
    syncing = ctx.syncing;
    syncFn = ctx.syncOfflineData;
  } catch {
    return null;
  }

  if (pendingCount === 0) return null;

  return (
    <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm flex items-center justify-center gap-2 sticky top-0 z-50">
      <CloudUpload className="h-4 w-4" />
      <span>يوجد {pendingCount} عملية معلقة بحاجة للمزامنة</span>
      <Button
        size="sm"
        variant="secondary"
        className="h-6 px-3 text-xs"
        onClick={() => syncFn?.()}
        disabled={syncing}
      >
        {syncing ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
            جارٍ المزامنة...
          </>
        ) : (
          'مزامنة الآن'
        )}
      </Button>
    </div>
  );
};

export default OfflineBanner;
