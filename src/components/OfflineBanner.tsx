import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

const OfflineBanner = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-2 text-center text-sm flex items-center justify-center gap-2 sticky top-0 z-50">
      <WifiOff className="h-4 w-4" />
      <span>لا يوجد اتصال بالإنترنت - يمكنك تصفح البيانات المخزنة مؤقتاً فقط</span>
    </div>
  );
};

export default OfflineBanner;
