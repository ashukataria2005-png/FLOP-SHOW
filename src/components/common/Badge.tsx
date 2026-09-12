import React from 'react';

export type BadgeType = 'OWNED' | 'NOW' | 'FREE' | 'PRICE';

interface BadgeProps {
  type: BadgeType;
  price?: number;
}

export const Badge: React.FC<BadgeProps> = ({ type, price }) => {
  if (type === 'OWNED') {
    return <span className="badge-tag owned">OWNED</span>;
  }
  if (type === 'NOW') {
    return <span className="badge-tag now">NOW</span>;
  }
  if (type === 'FREE') {
    return <span className="badge-tag free">FREE</span>;
  }
  if (type === 'PRICE') {
    return <span className="badge-tag price">₹{price}</span>;
  }
  return null;
};
