'use client';

import { forwardRef } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input, type InputProps } from '@/components/ui/Input';

export interface SearchInputProps extends Omit<InputProps, 'type'> {
  /** Extra class on the outer relative wrapper */
  wrapperClassName?: string;
}

/** Text field with leading icon — standard pattern for admin list filters. */
const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, wrapperClassName, ...props }, ref) => {
    return (
      <div className={cn('relative', wrapperClassName)}>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          ref={ref}
          type="search"
          className={cn('h-10 rounded-md pl-10 shadow-none', className)}
          {...props}
        />
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';

export { SearchInput };
