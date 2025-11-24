'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Building, Users, FileText, DollarSign, Wrench, Clock } from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'building' | 'tenant' | 'room' | 'payment' | 'invoice' | 'document' | 'maintenance';
  title: string;
  subtitle: string;
  url: string;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  // Simulate search with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      // In a real app, this would be an API call
      // const response = await fetch(`/api/search?q=${searchQuery}`);
      // const data = await response.json();
      
      // Simulated search results
      const mockResults: SearchResult[] = [
        {
          id: '1',
          type: 'building',
          title: 'Building A - Downtown',
          subtitle: '123 Main St, Manila',
          url: '/admin/buildings/1',
        },
        {
          id: '2',
          type: 'tenant',
          title: 'John Smith',
          subtitle: 'Room 101, Building A',
          url: '/admin/tenants/1',
        },
        {
          id: '3',
          type: 'room',
          title: 'Room 101',
          subtitle: 'Building A - Occupied',
          url: '/admin/rooms/1',
        },
        {
          id: '4',
          type: 'payment',
          title: 'Payment #1234',
          subtitle: 'PHP 15,000 - Paid on Nov 20, 2025',
          url: '/admin/financial/payments',
        },
        {
          id: '5',
          type: 'invoice',
          title: 'Invoice #INV-2025-001',
          subtitle: 'PHP 15,000 - Due Dec 1, 2025',
          url: '/admin/financial/invoices',
        },
      ].filter((item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
      );

      setResults(mockResults);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleResultClick = (url: string) => {
    router.push(url);
    onClose();
    setSearchQuery('');
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'building':
        return <Building className="w-5 h-5" />;
      case 'tenant':
        return <Users className="w-5 h-5" />;
      case 'room':
        return <Building className="w-5 h-5" />;
      case 'payment':
        return <DollarSign className="w-5 h-5" />;
      case 'invoice':
        return <FileText className="w-5 h-5" />;
      case 'document':
        return <FileText className="w-5 h-5" />;
      case 'maintenance':
        return <Wrench className="w-5 h-5" />;
      default:
        return <Search className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'building':
        return 'text-blue-600 bg-blue-50';
      case 'tenant':
        return 'text-green-600 bg-green-50';
      case 'room':
        return 'text-purple-600 bg-purple-50';
      case 'payment':
        return 'text-emerald-600 bg-emerald-50';
      case 'invoice':
        return 'text-orange-600 bg-orange-50';
      case 'document':
        return 'text-gray-600 bg-gray-50';
      case 'maintenance':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-start justify-center p-4 pt-20">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full">
            {/* Search Input */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search buildings, tenants, rooms, payments..."
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                />
                <button
                  onClick={onClose}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto">
              {isSearching && (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <p className="mt-2 text-sm text-gray-600">Searching...</p>
                </div>
              )}

              {!isSearching && searchQuery && results.length === 0 && (
                <div className="p-8 text-center">
                  <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-900 font-medium">No results found</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Try searching with different keywords
                  </p>
                </div>
              )}

              {!isSearching && results.length > 0 && (
                <div className="py-2">
                  {results.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result.url)}
                      className="w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left flex items-center gap-3 group"
                    >
                      <div className={`p-2 rounded-lg ${getTypeColor(result.type)}`}>
                        {getIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-purple-600 transition-colors">
                          {result.title}
                        </p>
                        <p className="text-sm text-gray-600 truncate">
                          {result.subtitle}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 uppercase font-medium">
                        {result.type}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {!searchQuery && (
                <div className="p-8">
                  <p className="text-sm font-medium text-gray-900 mb-4">Quick Actions</p>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleResultClick('/admin/buildings')}
                      className="w-full px-4 py-2 text-left rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-3"
                    >
                      <Building className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-900">View All Buildings</span>
                    </button>
                    <button
                      onClick={() => handleResultClick('/admin/tenants')}
                      className="w-full px-4 py-2 text-left rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-3"
                    >
                      <Users className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-900">View All Tenants</span>
                    </button>
                    <button
                      onClick={() => handleResultClick('/admin/financial/payments')}
                      className="w-full px-4 py-2 text-left rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-3"
                    >
                      <DollarSign className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-900">View Payments</span>
                    </button>
                    <button
                      onClick={() => handleResultClick('/admin/financial/reports')}
                      className="w-full px-4 py-2 text-left rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-3"
                    >
                      <FileText className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-900">View Reports</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
              <p className="text-xs text-gray-600 text-center">
                Press <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">ESC</kbd> to close
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

