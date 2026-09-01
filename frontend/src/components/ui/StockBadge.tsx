import type { StockStatus } from '../../types/product.types';
import { cn } from '../../lib/utils';

const config: Record<StockStatus, { label: string; cls: string }> = {
  in_stock:     { label: 'In Stock',     cls: 'bg-green-100 text-green-800' },
  low_stock:    { label: 'Low Stock',    cls: 'bg-amber-100 text-amber-800' },
  out_of_stock: { label: 'Out of Stock', cls: 'bg-red-100   text-red-800'   },
};

interface StockBadgeProps {
  status: StockStatus;
  className?: string;
}

export default function StockBadge({ status, className }: StockBadgeProps) {
  const { label, cls } = config[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        cls,
        className,
      )}
    >
      {label}
    </span>
  );
}
