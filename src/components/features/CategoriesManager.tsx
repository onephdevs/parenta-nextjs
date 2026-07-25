'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DocumentCategory } from '@/types/document';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { FormField } from '@/components/forms/FormField';
import { Plus, Tag } from 'lucide-react';

interface CategoriesManagerProps {
  categories: DocumentCategory[];
}

export default function CategoriesManager({ categories }: CategoriesManagerProps) {
  const router = useRouter();
  const { showNotification } = useNotifications();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newCategoryData, setNewCategoryData] = useState({
    name: '',
    description: '',
    parentCategoryId: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setNewCategoryData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/documents/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCategoryData.name,
          description: newCategoryData.description || undefined,
          parentCategoryId: newCategoryData.parentCategoryId || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showNotification({
          type: 'success',
          title: 'Category created',
          message: `Category "${newCategoryData.name}" has been created successfully.`,
        });

        setIsCreateModalOpen(false);
        setNewCategoryData({ name: '', description: '', parentCategoryId: '' });
        router.refresh();
      } else {
        throw new Error(result.error || 'Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      showNotification({
        type: 'error',
        title: 'Creation failed',
        message: error instanceof Error ? error.message : 'Failed to create category',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const rootCategories = categories.filter((cat) => !cat.parentCategoryId);
  const getSubCategories = (parentId: string) =>
    categories.filter((cat) => cat.parentCategoryId === parentId);

  const getCategoryStats = (categoryId: string) => {
    return { documentCount: 0 };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Document Categories</h2>
          <p className="text-sm text-gray-900">
            Organize your documents with categories for easier management and searching.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateModalOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
          New Category
        </Button>
      </div>

      <Card padding="none">
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No categories yet</h3>
            <p className="text-gray-900 mb-4">Get started by creating your first document category.</p>
            <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
              Create Category
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {rootCategories.map((category) => {
              const subCategories = getSubCategories(category.id);
              const stats = getCategoryStats(category.id);

              return (
                <div key={category.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Tag className="w-5 h-5 text-purple-600" aria-hidden="true" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">{category.name}</h3>
                          {category.description && (
                            <p className="text-sm text-gray-900 mt-1">{category.description}</p>
                          )}
                        </div>
                      </div>

                      {subCategories.length > 0 && (
                        <div className="mt-4 ml-11">
                          <div className="space-y-2">
                            {subCategories.map((subCategory) => (
                              <div key={subCategory.id} className="flex items-center space-x-3">
                                <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                                  <Tag className="w-3 h-3 text-gray-900" aria-hidden="true" />
                                </div>
                                <div>
                                  <span className="text-sm text-gray-900">{subCategory.name}</span>
                                  {subCategory.description && (
                                    <span className="text-sm text-gray-900 ml-2">
                                      - {subCategory.description}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="ml-6 text-right">
                      <div className="text-sm text-gray-900 font-medium">{stats.documentCount} documents</div>
                      <div className="text-xs text-gray-900">Created {formatDate(category.createdAt)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Dialog
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Category"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} isDisabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-category-form"
              variant="primary"
              isLoading={isSubmitting}
              isDisabled={!newCategoryData.name.trim()}
            >
              Create Category
            </Button>
          </>
        }
      >
        <form id="create-category-form" onSubmit={handleCreateCategory} className="space-y-4">
          <FormField htmlFor="name" label="Category Name" required>
            <Input
              id="name"
              name="name"
              required
              value={newCategoryData.name}
              onChange={handleInputChange}
              placeholder="e.g., Leases, Invoices, Photos"
            />
          </FormField>

          <FormField htmlFor="description" label="Description">
            <Textarea
              id="description"
              name="description"
              rows={3}
              value={newCategoryData.description}
              onChange={handleInputChange}
              placeholder="Brief description of what this category contains..."
            />
          </FormField>

          <FormField htmlFor="parentCategoryId" label="Parent Category (optional)">
            <Select
              id="parentCategoryId"
              name="parentCategoryId"
              value={newCategoryData.parentCategoryId}
              onChange={handleInputChange}
            >
              <option value="">No parent (root category)</option>
              {rootCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </FormField>
        </form>
      </Dialog>
    </div>
  );
}
