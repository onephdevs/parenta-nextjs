'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Building,
  Users,
  FileText,
  DollarSign,
  Package,
  ScrollText,
  Receipt,
  Wallet,
  DoorOpen,
} from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';

type SearchCategory =
  | 'property'
  | 'tenant'
  | 'room'
  | 'asset'
  | 'invoice'
  | 'document'
  | 'lease'
  | 'payment'
  | 'expense';

interface SearchResult {
  id: string;
  type: SearchCategory;
  title: string;
  subtitle: string;
  url: string;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: { id: 'all' | SearchCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'tenant', label: 'Tenant' },
  { id: 'property', label: 'Property' },
  { id: 'room', label: 'Room' },
  { id: 'asset', label: 'Asset' },
  { id: 'invoice', label: 'Invoice' },
  { id: 'document', label: 'Document' },
  { id: 'lease', label: 'Lease' },
  { id: 'payment', label: 'Payment' },
  { id: 'expense', label: 'Expense' },
];

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<'all' | SearchCategory>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (!isOpen) {
      setSearchQuery('');
      setCategory('all');
      setResults([]);
      setIsSearching(false);
      abortRef.current?.abort();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      abortRef.current?.abort();
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const params = new URLSearchParams({
          q: searchQuery.trim(),
        });
        if (category !== 'all') params.set('type', category);

        const response = await fetch(`/api/search?${params.toString()}`, {
          signal: controller.signal,
          credentials: 'include',
        });
        const data = await response.json();
        if (data.success) {
          setResults(data.data || []);
        } else {
          setResults([]);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        setResults([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      abortRef.current?.abort();
    };
  }, [searchQuery, category, isOpen]);

  const handleResultClick = (url: string) => {
    router.push(url);
    onClose();
    setSearchQuery('');
    setCategory('all');
  };

  const getIcon = (type: SearchCategory) => {
    switch (type) {
      case 'property':
        return <Building className="w-5 h-5" />;
      case 'tenant':
        return <Users className="w-5 h-5" />;
      case 'room':
        return <DoorOpen className="w-5 h-5" />;
      case 'asset':
        return <Package className="w-5 h-5" />;
      case 'payment':
        return <DollarSign className="w-5 h-5" />;
      case 'invoice':
        return <Receipt className="w-5 h-5" />;
      case 'document':
        return <FileText className="w-5 h-5" />;
      case 'lease':
        return <ScrollText className="w-5 h-5" />;
      case 'expense':
        return <Wallet className="w-5 h-5" />;
      default:
        return <Search className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: SearchCategory) => {
    switch (type) {
      case 'property':
        return 'text-blue-600 bg-blue-50';
      case 'tenant':
        return 'text-green-600 bg-green-50';
      case 'room':
        return 'text-purple-600 bg-purple-50';
      case 'asset':
        return 'text-cyan-700 bg-cyan-50';
      case 'payment':
        return 'text-emerald-600 bg-emerald-50';
      case 'invoice':
        return 'text-orange-600 bg-orange-50';
      case 'document':
        return 'text-gray-900 bg-gray-50';
      case 'lease':
        return 'text-indigo-700 bg-indigo-50';
      case 'expense':
        return 'text-rose-700 bg-rose-50';
      default:
        return 'text-gray-900 bg-gray-50';
    }
  };

  const quickActions = [
    { url: '/admin/properties', icon: Building, label: 'View All Properties' },
    { url: '/admin/tenants', icon: Users, label: 'View All Tenants' },
    { url: '/admin/financial/payments', icon: DollarSign, label: 'View Payments' },
    { url: '/admin/financial/expenses', icon: Wallet, label: 'View Expenses' },
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Search"
      description="Search tenants, properties, rooms, assets, invoices, and more"
      size="lg"
      className="max-w-2xl"
      footer={
        <p className="text-xs text-gray-500 w-full text-center">
          Press <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">ESC</kbd> to close
        </p>
      }
    >
      <div className="space-y-4 -mt-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <Input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, number, email..."
            className="pl-10"
          />
        </div>

        <div
          className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1"
          role="tablist"
          aria-label="Search category"
        >
          {CATEGORIES.map((item) => {
            const selected = category === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setCategory(item.id)}
                className={cn(
                  'shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  selected
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="max-h-96 overflow-y-auto -mx-2">
          {isSearching && (
            <div className="p-8 text-center">
              <Spinner label="Searching" />
              <p className="mt-2 text-sm text-gray-900">Searching...</p>
            </div>
          )}

          {!isSearching && searchQuery.trim().length >= 2 && results.length === 0 && (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-900 font-medium">No results found</p>
              <p className="text-sm text-gray-500 mt-1">
                Try another keyword or switch category
              </p>
            </div>
          )}

          {!isSearching && results.length > 0 && (
            <div className="py-2">
              {results.map((result) => (
                <Button
                  key={`${result.type}-${result.id}`}
                  variant="ghost"
                  onClick={() => handleResultClick(result.url)}
                  className="w-full px-4 py-3 h-auto justify-start text-left flex items-center gap-3 rounded-none"
                >
                  <div className={`p-2 rounded-lg ${getTypeColor(result.type)}`}>
                    {getIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {result.title}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {result.subtitle}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 uppercase font-medium">
                    {result.type}
                  </span>
                </Button>
              ))}
            </div>
          )}

          {!searchQuery && (
            <div className="py-2">
              <p className="text-sm font-medium text-gray-900 mb-4 px-2">Quick Actions</p>
              <div className="space-y-1">
                {quickActions.map(({ url, icon: Icon, label }) => (
                  <Button
                    key={url}
                    variant="ghost"
                    onClick={() => handleResultClick(url)}
                    className="w-full px-4 py-2 h-auto justify-start text-left rounded-lg flex items-center gap-3"
                  >
                    <Icon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-900">{label}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
