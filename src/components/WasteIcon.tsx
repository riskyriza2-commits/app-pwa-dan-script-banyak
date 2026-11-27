import React from 'react';
import { Milk, Wine, Package, ShoppingBag, Recycle } from 'lucide-react';

interface WasteIconProps {
  categoryId: number;
  className?: string;
}

export const WasteIcon: React.FC<WasteIconProps> = ({
  categoryId,
  className = 'w-4 h-4',
}) => {
  switch (categoryId) {
    case 0:
      return <Milk className={className} />;
    case 1:
      return <Wine className={className} />;
    case 2:
      return <Recycle className={className} />;
    case 3:
      return <Package className={className} />;
    default:
      return <ShoppingBag className={className} />;
  }
};
