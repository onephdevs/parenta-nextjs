# Admin Layout Implementation Guide

This guide explains how to use the new AdminLayout and AdminSidebar components for a consistent admin interface.

## Components

### AdminSidebar
A collapsible sidebar with:
- Logo and branding
- Hierarchical navigation menu
- Collapsible sections
- Active state highlighting
- Icon-based navigation
- User profile section with sign out

### AdminLayout
A wrapper component that provides:
- Responsive sidebar (desktop/mobile)
- Top bar with quick actions
- Sidebar toggle functionality
- Mobile overlay for sidebar
- Consistent spacing and styling

## How to Use

### Option 1: Wrap Individual Pages (Recommended for gradual migration)

```tsx
// src/app/admin/your-page/page.tsx
import AdminLayout from '@/components/layout/AdminLayout';

export default function YourAdminPage() {
  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Your Page Title</h1>
        {/* Your page content */}
      </div>
    </AdminLayout>
  );
}
```

### Option 2: Add to Root Admin Layout (Recommended for new projects)

```tsx
// src/app/admin/layout.tsx
import AdminLayout from '@/components/layout/AdminLayout';

export default function AdminLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
```

## Navigation Structure

The sidebar includes the following sections:

### Main Sections
- **Dashboard** - `/admin`
- **Properties**
  - All Buildings - `/admin/buildings`
  - All Rooms - `/admin/rooms`
- **Tenants**
  - All Tenants - `/admin/tenants`
  - Add New Tenant - `/admin/tenants/new`
- **Financial**
  - Dashboard - `/admin/financial`
  - Invoices - `/admin/financial/invoices`
  - Payments - `/admin/financial/payments`
  - Record Payment - `/admin/financial/payments/new`
- **Utilities**
  - Overview - `/admin/utilities`
  - Bills - `/admin/utilities/bills`
- **Assets**
  - All Assets - `/admin/assets`
  - Add Asset - `/admin/assets/add`
- **Documents** - `/admin/documents`

## Customization

### Adding New Menu Items

Edit `src/components/layout/AdminSidebar.tsx` and add to the `menuItems` array:

```tsx
{
  name: 'Your Section',
  icon: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {/* Your icon path */}
    </svg>
  ),
  children: [
    {
      name: 'Sub Item',
      href: '/admin/your-route',
      icon: (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      ),
    },
  ],
}
```

### Styling

The components use Tailwind CSS classes. You can customize:
- Colors (currently using purple theme)
- Spacing
- Font sizes
- Border styles
- Hover effects

## Features

### Collapsible Sections
- Click section headers to expand/collapse
- Sections remember their state
- Smooth animations

### Active State
- Automatically highlights current page
- Shows active state for parent sections
- Visual feedback on hover

### Responsive Design
- Desktop: Fixed sidebar on the left
- Mobile: Overlay sidebar with backdrop
- Toggle button for both views

### User Profile
- Shows user avatar (placeholder)
- User name and email
- Quick sign out link

## Migration Checklist

When implementing the new layout:

- [ ] Test all existing pages work with new layout
- [ ] Verify navigation links are correct
- [ ] Check mobile responsiveness
- [ ] Test sidebar collapse/expand
- [ ] Verify active state highlighting
- [ ] Test all menu items navigate correctly
- [ ] Check user profile section
- [ ] Verify sign out functionality
- [ ] Test with different screen sizes
- [ ] Ensure no layout shifts

## Benefits

✅ Consistent navigation across all admin pages
✅ Improved user experience
✅ Professional look and feel
✅ Mobile-friendly interface
✅ Easy to maintain and extend
✅ Better accessibility
✅ Clear visual hierarchy
✅ Quick access to all features

## Example Implementation

See the tenant detail page for an example of how to wrap content:

```tsx
import AdminLayout from '@/components/layout/AdminLayout';

export default function TenantDetailPage() {
  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Your page header */}
        <div className="bg-white shadow">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Header content */}
          </div>
        </div>
        
        {/* Your page content */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Content */}
        </div>
      </div>
    </AdminLayout>
  );
}
```

## Notes

- The layout is client-side rendered (`'use client'`)
- Sidebar state persists within the session
- Mobile sidebar closes on navigation
- Desktop sidebar can be toggled
- All icons are SVG-based for crispness
- Fully keyboard accessible

## Support

For issues or feature requests related to the admin layout:
1. Check existing navigation structure
2. Verify route paths match your application
3. Test in different browsers
4. Check console for any errors
5. Verify Tailwind CSS is configured correctly

