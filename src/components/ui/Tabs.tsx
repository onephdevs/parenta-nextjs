'use client';

import {
  createContext,
  useContext,
  useId,
  KeyboardEvent,
  ReactNode,
  ButtonHTMLAttributes,
  HTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs components must be used within <Tabs>');
  return ctx;
}

export interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  const baseId = useId();
  return (
    <TabsContext.Provider value={{ value, onValueChange, baseId }}>
      <div className={cn(className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabList({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn('border-b border-gray-200 -mb-px flex space-x-6 overflow-x-auto', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export interface TabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  children: ReactNode;
}

export function Tab({ value, children, className, ...props }: TabProps) {
  const { value: active, onValueChange, baseId } = useTabsContext();
  const selected = active === value;

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const tabs = Array.from(
      e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []
    );
    const index = tabs.indexOf(e.currentTarget);
    if (index < 0) return;
    const next =
      e.key === 'ArrowRight'
        ? tabs[(index + 1) % tabs.length]
        : tabs[(index - 1 + tabs.length) % tabs.length];
    next?.focus();
    next?.click();
  };

  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-controls={`${baseId}-panel-${value}`}
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      onClick={() => onValueChange(value)}
      onKeyDown={onKeyDown}
      className={cn(
        'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors',
        selected
          ? 'border-purple-500 text-purple-700'
          : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export interface TabPanelProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ value, children, className }: TabPanelProps) {
  const { value: active, baseId } = useTabsContext();
  if (active !== value) return null;

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      className={cn('pt-6', className)}
    >
      {children}
    </div>
  );
}
