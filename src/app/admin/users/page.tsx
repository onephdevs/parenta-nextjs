'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import {
  Plus,
  Search,
  Users,
  UserCheck,
  UserX,
  Pencil,
  KeyRound,
} from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { RouteLoadingFallback, useRouteReady } from '@/components/layout/route-loader';
import {
  AppLoader,
  Button,
  Dialog,
  EmptyState,
  FilterBar,
  Input,
  ListSummaryCard,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  TableCard,
  WorkItemRow,
} from '@/components/ui';
import { FormField } from '@/components/forms/FormField';
import { formatShortDate } from '@/lib/utils';

const PAGE_SIZE = 20;

interface AdminUser {
  id: string;
  email: string | null;
  username: string | null;
  role: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UsersStats {
  total: number;
  active: number;
  inactive: number;
}

const emptyCreateForm = {
  firstName: '',
  lastName: '',
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
};

const emptyEditForm = {
  firstName: '',
  lastName: '',
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
  isActive: true,
};

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const { showNotification } = useNotifications();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<UsersStats>({ total: 0, active: 0, inactive: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/users');
      const data = await response.json();

      if (data.success) {
        setUsers(data.data.users || []);
        setStats(data.data.stats || { total: 0, active: 0, inactive: 0 });
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to load admin users',
        });
      }
    } catch (error) {
      console.error('Error fetching admin users:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load admin users',
      });
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user.role === 'admin') {
      fetchUsers();
    }
  }, [status, session, fetchUsers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (statusFilter === 'active' && !user.isActive) return false;
      if (statusFilter === 'inactive' && user.isActive) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        user.firstName.toLowerCase().includes(term) ||
        user.lastName.toLowerCase().includes(term) ||
        (user.email || '').toLowerCase().includes(term) ||
        (user.username || '').toLowerCase().includes(term)
      );
    });
  }, [users, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageUsers = filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const pageReady = !(
    status === 'loading' ||
    (status === 'authenticated' && isLoading && users.length === 0)
  );
  const { covering } = useRouteReady(pageReady);

  if (!pageReady) {
    if (covering) return <RouteLoadingFallback className="min-h-[50vh]" />;
    return <AppLoader variant="inline" className="min-h-[50vh]" />;
  }

  if (!session || session.user.role !== 'admin') {
    redirect('/auth/signin');
  }

  const openCreateModal = () => {
    setCreateForm(emptyCreateForm);
    setShowCreateModal(true);
  };

  const openEditModal = (user: AdminUser) => {
    setSelectedUser(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email || '',
      username: user.username || '',
      password: '',
      confirmPassword: '',
      isActive: user.isActive,
    });
    setShowEditModal(true);
  };

  const handleCreate = async () => {
    if (createForm.password !== createForm.confirmPassword) {
      showNotification({
        type: 'error',
        title: 'Validation',
        message: 'Passwords do not match',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: createForm.firstName,
          lastName: createForm.lastName,
          email: createForm.email,
          username: createForm.username || undefined,
          password: createForm.password,
          role: 'admin',
        }),
      });
      const data = await response.json();

      if (data.success) {
        showNotification({
          type: 'success',
          title: 'Success',
          message: 'Admin account created successfully',
        });
        setShowCreateModal(false);
        setCreateForm(emptyCreateForm);
        await fetchUsers();
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to create admin account',
        });
      }
    } catch (error) {
      console.error('Error creating admin user:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to create admin account',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;

    if (editForm.password || editForm.confirmPassword) {
      if (editForm.password !== editForm.confirmPassword) {
        showNotification({
          type: 'error',
          title: 'Validation',
          message: 'Passwords do not match',
        });
        return;
      }
      if (editForm.password.length < 8) {
        showNotification({
          type: 'error',
          title: 'Validation',
          message: 'Password must be at least 8 characters',
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        username: editForm.username || null,
        isActive: editForm.isActive,
      };
      if (editForm.password) {
        payload.password = editForm.password;
      }

      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (data.success) {
        showNotification({
          type: 'success',
          title: 'Success',
          message: 'Admin user updated successfully',
        });
        setShowEditModal(false);
        setSelectedUser(null);
        await fetchUsers();
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to update admin user',
        });
      }
    } catch (error) {
      console.error('Error updating admin user:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update admin user',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (user: AdminUser) => {
    if (user.id === session.user.id && user.isActive) {
      showNotification({
        type: 'error',
        title: 'Not allowed',
        message: 'You cannot deactivate your own account',
      });
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const data = await response.json();

      if (data.success) {
        showNotification({
          type: 'success',
          title: 'Success',
          message: user.isActive ? 'Admin account deactivated' : 'Admin account activated',
        });
        await fetchUsers();
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to update account status',
        });
      }
    } catch (error) {
      console.error('Error toggling admin status:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update account status',
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Admin Users"
        description="Manage accounts that can access the admin portal"
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
            Create Admin
          </Button>
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <ListSummaryCard
          title="Total Admins"
          value={stats.total}
          footer="all admin accounts"
          icon={<Users className="h-8 w-8 text-blue-600" />}
        />
        <ListSummaryCard
          title="Active"
          value={stats.active}
          footer="can sign in"
          icon={<UserCheck className="h-8 w-8 text-green-600" />}
        />
        <ListSummaryCard
          title="Inactive"
          value={stats.inactive}
          footer="deactivated accounts"
          icon={<UserX className="h-8 w-8 text-yellow-600" />}
        />
        <ListSummaryCard
          title="Showing"
          value={filteredUsers.length}
          footer="matching filters"
          icon={<Search className="h-8 w-8 text-slate-600" />}
        />
      </div>

      <FilterBar
        columns={4}
        collapsible
        activeCount={statusFilter ? 1 : 0}
        search={
          <SearchInput
            id="users-search"
            placeholder="Name, email, username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search users"
          />
        }
        footer={
          <p className="text-sm text-gray-600">
            Showing {filteredUsers.length} of {users.length} users
          </p>
        }
      >
        <FormField label="Status" htmlFor="users-status">
          <Select
            id="users-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </FormField>
      </FilterBar>

      <TableCard title="Admin users" description="Accounts that can sign in to the admin portal.">
        {filteredUsers.length === 0 ? (
          <EmptyState
            title="No admin users found"
            description="Try adjusting your search or filters."
          />
        ) : (
          <>
            {pageUsers.map((user) => {
              const isSelf = user.id === session.user.id;
              const fullName = `${user.firstName} ${user.lastName}`.trim() || 'Unnamed user';
              return (
                <WorkItemRow
                  key={user.id}
                  title={isSelf ? `${fullName} (you)` : fullName}
                  subtitle={user.email || user.username || null}
                  badges={[
                    {
                      key: 'role',
                      label: 'Admin',
                      tone: 'info',
                    },
                    {
                      key: 'status',
                      label: user.isActive ? 'Active' : 'Inactive',
                      tone: user.isActive ? 'success' : 'neutral',
                    },
                  ]}
                  date={formatShortDate(user.createdAt)}
                  metaLabel={user.isActive ? 'Active' : 'Inactive'}
                  metaTone={user.isActive ? 'muted' : 'default'}
                  dotTone={user.isActive ? 'success' : 'neutral'}
                  actions={
                    <>
                      <button
                        type="button"
                        onClick={() => openEditModal(user)}
                        className="text-gray-500 hover:text-gray-900"
                        title="Edit"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleActive(user)}
                        disabled={isSelf && user.isActive}
                        className="text-gray-500 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
                        title={user.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {user.isActive ? (
                          <UserX className="h-5 w-5" />
                        ) : (
                          <UserCheck className="h-5 w-5" />
                        )}
                      </button>
                    </>
                  }
                />
              );
            })}
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={filteredUsers.length}
              itemsPerPage={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </TableCard>

      <Dialog
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create portal account"
        description="Office accounts have full admin access, including payments, reports, and user management."
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create Account'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="First name" htmlFor="create-first-name" required>
              <Input
                id="create-first-name"
                value={createForm.firstName}
                onChange={(e) => setCreateForm((f) => ({ ...f, firstName: e.target.value }))}
                required
              />
            </FormField>
            <FormField label="Last name" htmlFor="create-last-name" required>
              <Input
                id="create-last-name"
                value={createForm.lastName}
                onChange={(e) => setCreateForm((f) => ({ ...f, lastName: e.target.value }))}
                required
              />
            </FormField>
          </div>
          <FormField label="Email" htmlFor="create-email" required>
            <Input
              id="create-email"
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </FormField>
          <FormField
            label="Username"
            htmlFor="create-username"
            hint="Optional. Can be used instead of email to sign in."
          >
            <Input
              id="create-username"
              value={createForm.username}
              onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
            />
          </FormField>
          <FormField
            label="Password"
            htmlFor="create-password"
            required
            hint="At least 8 characters."
          >
            <Input
              id="create-password"
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
              required
            />
          </FormField>
          <FormField label="Confirm password" htmlFor="create-confirm-password" required>
            <Input
              id="create-confirm-password"
              type="password"
              value={createForm.confirmPassword}
              onChange={(e) => setCreateForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              required
            />
          </FormField>
        </div>
      </Dialog>

      <Dialog
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Admin User"
        description="Update account details or reset the password."
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="First name" htmlFor="edit-first-name" required>
              <Input
                id="edit-first-name"
                value={editForm.firstName}
                onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                required
              />
            </FormField>
            <FormField label="Last name" htmlFor="edit-last-name" required>
              <Input
                id="edit-last-name"
                value={editForm.lastName}
                onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                required
              />
            </FormField>
          </div>
          <FormField label="Email" htmlFor="edit-email" required>
            <Input
              id="edit-email"
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </FormField>
          <FormField label="Username" htmlFor="edit-username">
            <Input
              id="edit-username"
              value={editForm.username}
              onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
            />
          </FormField>
          <FormField label="Status" htmlFor="edit-status">
            <Select
              id="edit-status"
              value={editForm.isActive ? 'active' : 'inactive'}
              isDisabled={selectedUser?.id === session.user.id}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, isActive: e.target.value === 'active' }))
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </FormField>
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-900">
              <KeyRound className="h-4 w-4" />
              Reset password
            </div>
            <div className="space-y-3">
              <FormField
                label="New password"
                htmlFor="edit-password"
                hint="Leave blank to keep the current password."
              >
                <Input
                  id="edit-password"
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                />
              </FormField>
              <FormField label="Confirm new password" htmlFor="edit-confirm-password">
                <Input
                  id="edit-confirm-password"
                  type="password"
                  value={editForm.confirmPassword}
                  onChange={(e) => setEditForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                />
              </FormField>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
