import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Trash2, FileText } from 'lucide-react';
import { StockMovement } from '@/types/warehouse';
import { useWarehouse } from '@/contexts/WarehouseContext';

interface MovementCardProps {
  movement: StockMovement;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPrint: () => void;
  showCheckbox: boolean;
}

export const MovementCard: React.FC<MovementCardProps> = ({
  movement,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
  onPrint,
  showCheckbox,
}) => {
  const { getProductName, getWarehouseName, getSupplierName, getClientName } = useWarehouse();
  const isSingle = !!movement.product_id;

  return (
    <div className="bg-card rounded-xl p-3 border border-border shadow-card space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showCheckbox && (
            <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} className="ml-1" />
          )}
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            movement.type === 'in' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
          }`}>
            {movement.type === 'in' ? 'وارد' : 'صادر'}
          </span>
          <span className="text-xs text-muted-foreground">{movement.date}</span>
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-primary/10 text-primary">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {showCheckbox && (
            <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onPrint} className="p-1.5 rounded-md hover:bg-accent/20 text-accent">
            <FileText className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="text-sm font-medium text-foreground">
        {isSingle
          ? getProductName(movement.product_id)
          : `حركة متعددة (${movement.items?.length || 0} أصناف)`}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {isSingle ? (
          <>
            <span>الكمية: <strong className="text-foreground">{movement.quantity}</strong></span>
            <span>الوحدة: <strong className="text-foreground">{movement.unit || 'قطعة'}</strong></span>
          </>
        ) : (
          <span>عدد الأصناف: <strong className="text-foreground">{movement.items?.length || 0}</strong></span>
        )}
        <span>المخزن: {getWarehouseName(movement.warehouse_id)}</span>
        <span>{movement.entity_type === 'supplier' ? 'المورد' : 'جهة الصرف'}: {
          movement.entity_type === 'supplier'
            ? getSupplierName(movement.entity_id)
            : getClientName(movement.entity_id)
        }</span>
      </div>
    </div>
  );
};
