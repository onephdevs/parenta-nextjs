import React from 'react';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Redirect if not authenticated or not tenant
  if (!session || session.user.role !== 'tenant') {
    redirect('/auth/signin?role=tenant');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
} 