import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card = ({ children, className }: CardProps) => (
  <div className={cn('bg-white rounded-[2rem] border border-gray-100/50 shadow-sm overflow-hidden', className)}>
    {children}
  </div>
);
