import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showBackButton?: boolean;
  children?: React.ReactNode;
  subtitle?: string;
}

export default function Breadcrumb({ items, showBackButton = true, children, subtitle }: BreadcrumbProps) {
  const backHref = items.length > 1 ? items[items.length - 2].href : '/admin';

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-2 py-3 border-b border-gray-200">
          {items.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              {index > 0 && (
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
              {item.href ? (
                <Link 
                  href={item.href} 
                  className="text-sm text-gray-900 hover:text-gray-900 flex items-center"
                >
                  {index === 0 && (
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  )}
                  {item.label}
                </Link>
              ) : (
                <span className="text-sm text-gray-900 font-medium">{item.label}</span>
              )}
            </div>
          ))}
        </div>
        
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center">
            {showBackButton && backHref && (
              <Link 
                href={backHref} 
                className="mr-4 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title={`Back to ${items.length > 1 ? items[items.length - 2].label : 'Dashboard'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{items[items.length - 1].label}</h1>
              {subtitle && (
                <p className="text-sm text-gray-900 mt-1">{subtitle}</p>
              )}
            </div>
          </div>
          {children && (
            <div className="flex space-x-3">
              {children}
            </div>
          )}
        </div>
      </div>
    </header>
  );
} 