'use client';

import { useEffect, useState } from 'react';
import { FilterBar, SearchInput, Select } from '@/components/ui';
import { FormField } from '@/components/forms/FormField';
import { useListQuery } from '@/hooks/useListQuery';

interface ReportsFilterBarProps {
  query: string;
  category: string;
  categories: string[];
  shown: number;
}

export function ReportsFilterBar({
  query,
  category,
  categories,
  shown,
}: ReportsFilterBarProps) {
  const { replaceQuery } = useListQuery();
  const [searchDraft, setSearchDraft] = useState(query);
  const [categoryDraft, setCategoryDraft] = useState(category);

  useEffect(() => {
    setSearchDraft(query);
    setCategoryDraft(category);
  }, [query, category]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchDraft === query) return;
      replaceQuery({ q: searchDraft });
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce search only
  }, [searchDraft]);

  return (
    <FilterBar
      columns={4}
      collapsible
      activeCount={categoryDraft ? 1 : 0}
      search={
        <SearchInput
          id="reports-search"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          placeholder="Report name..."
          aria-label="Search reports"
        />
      }
      footer={
        <p className="text-sm text-gray-600">Showing {shown} reports</p>
      }
    >
      <FormField label="Category" htmlFor="reports-category">
        <Select
          id="reports-category"
          value={categoryDraft}
          onChange={(e) => {
            const value = e.target.value;
            setCategoryDraft(value);
            replaceQuery({ category: value });
          }}
        >
          <option value="">All categories</option>
          {categories.map((title) => (
            <option key={title} value={title}>
              {title}
            </option>
          ))}
        </Select>
      </FormField>
    </FilterBar>
  );
}
