// ============================================================================
// خدمة طابور العمليات غير المتصلة (Offline Queue)
// تخزن العمليات محلياً عند عدم وجود إنترنت وتزامنها عند عودة الاتصال
// ============================================================================

export type OfflineOperationType = 
  | 'addProduct' | 'updateProduct' | 'deleteProduct'
  | 'addCategory' | 'updateCategory' | 'deleteCategory'
  | 'addWarehouse' | 'updateWarehouse' | 'deleteWarehouse'
  | 'addSupplier' | 'updateSupplier' | 'deleteSupplier'
  | 'addClient' | 'updateClient' | 'deleteClient'
  | 'addMovement' | 'updateMovement' | 'deleteMovement';

export interface OfflineOperation {
  id: string;
  type: OfflineOperationType;
  data: any;
  timestamp: number;
  tempId?: string; // ID مؤقت للعنصر المضاف محلياً
}

const QUEUE_KEY = 'offline_queue';
const LOCAL_DATA_KEY = 'offline_local_data';

// ========== إدارة الطابور ==========
export const getQueue = (): OfflineOperation[] => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveQueue = (queue: OfflineOperation[]) => {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const addToQueue = (op: Omit<OfflineOperation, 'id' | 'timestamp'>): OfflineOperation => {
  const queue = getQueue();
  const operation: OfflineOperation = {
    ...op,
    id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };
  queue.push(operation);
  saveQueue(queue);
  return operation;
};

export const removeFromQueue = (id: string) => {
  const queue = getQueue().filter(op => op.id !== id);
  saveQueue(queue);
};

export const clearQueue = () => {
  localStorage.removeItem(QUEUE_KEY);
};

export const getQueueCount = (): number => {
  return getQueue().length;
};

// ========== توليد ID مؤقت ==========
export const generateTempId = (): string => {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const isTempId = (id: string): boolean => {
  return id.startsWith('temp_');
};

// ========== تخزين البيانات المحلية ==========
export const getLocalData = (): Record<string, any[]> => {
  try {
    const raw = localStorage.getItem(LOCAL_DATA_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const saveLocalItems = (table: string, items: any[]) => {
  const data = getLocalData();
  data[table] = items;
  localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(data));
};

export const getLocalItems = (table: string): any[] => {
  return getLocalData()[table] || [];
};

export const clearLocalData = () => {
  localStorage.removeItem(LOCAL_DATA_KEY);
};
