// قوالب نصوص الإشعارات
export type NotificationType = 'movement_in' | 'movement_out' | 'low_stock' | 'out_of_stock';

interface MovementNotificationData {
  productName: string;
  quantity: number;
  unit: string;
  warehouseName: string;
  userName: string;
  entityName: string;
}

interface LowStockNotificationData {
  productName: string;
  quantity: number;
  warehouseName: string;
}

export function getMovementNotification(
  type: 'in' | 'out',
  data: MovementNotificationData
): { title: string; message: string } {
  if (type === 'in') {
    return {
      title: '📥 حركة وارد جديدة',
      message: `تم إضافة ${data.quantity} ${data.unit} ${data.productName} إلى ${data.warehouseName} من ${data.entityName} بواسطة ${data.userName}.`,
    };
  }
  return {
    title: '📤 حركة صادر جديدة',
    message: `تم تصدير ${data.quantity} ${data.unit} ${data.productName} من ${data.warehouseName} إلى ${data.entityName} بواسطة ${data.userName}.`,
  };
}

export function getMultiMovementNotification(
  type: 'in' | 'out',
  itemCount: number,
  warehouseName: string,
  entityName: string,
  userName: string
): { title: string; message: string } {
  if (type === 'in') {
    return {
      title: '📥 حركة وارد متعددة',
      message: `تم إضافة ${itemCount} أصناف إلى ${warehouseName} من ${entityName} بواسطة ${userName}.`,
    };
  }
  return {
    title: '📤 حركة صادر متعددة',
    message: `تم تصدير ${itemCount} أصناف من ${warehouseName} إلى ${entityName} بواسطة ${userName}.`,
  };
}

export function getLowStockNotification(
  data: LowStockNotificationData
): { title: string; message: string } {
  if (data.quantity <= 0) {
    return {
      title: '🚨 نفاد المخزون!',
      message: `تنبيه: مخزون ${data.productName} في ${data.warehouseName} قد نفد تماماً!`,
    };
  }
  return {
    title: '⚠️ مخزون منخفض',
    message: `تنبيه: مخزون ${data.productName} في ${data.warehouseName} منخفض جداً (${data.quantity} قطعة فقط).`,
  };
}
