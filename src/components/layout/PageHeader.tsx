'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('md:flex md:items-center md:justify-between gap-4', className)}>
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
      </div>
      {actions && <div className="mt-4 flex flex-shrink-0 gap-2 md:mt-0">{actions}</div>}
    </div>
  );
}
