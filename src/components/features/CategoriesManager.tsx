'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DocumentCategory } from '@/types/document';
import { useNotifications } from '@/hooks/useNotifications';

interface CategoriesManagerProps {
  categories: DocumentCategory[];
}

export default function CategoriesManager({ categories }: CategoriesManagerProps) {
  const router = useRouter();
  const { addNotification } = useNotifications();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newCategoryData, setNewCategoryData] = useState({
    name: '',
    description: '',
    parentCategoryId: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewCategoryData(prev => ({
      ...prev,
      [name]: value
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
        addNotification({
          type: 'success',
          title: 'Category created',
          message: `Category "${newCategoryData.name}" has been created successfully.`
        });
        
        setIsCreateModalOpen(false);
        setNewCategoryData({ name: '', description: '', parentCategoryId: '' });
        router.refresh();
      } else {
        throw new Error(result.error || 'Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      addNotification({
        type: 'error',
        title: 'Creation failed',
        message: error instanceof Error ? error.message : 'Failed to create category'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Organize categories hierarchically
  const rootCategories = categories.filter(cat => !cat.parentCategoryId);
  const getSubCategories = (parentId: string) => 
    categories.filter(cat => cat.parentCategoryId === parentId);

  const getCategoryStats = (categoryId: string) => {
    // This would typically come from the API, but for now we'll show placeholder
    return { documentCount: 0 };
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Document Categories</h2>
          <p className="text-sm text-gray-900">
            Organize your documents with categories for easier management and searching.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Category
        </button>
      </div>

      {/* Categories List */}
      <div className="bg-white shadow rounded-lg">
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a1.414 1.414 0 01-2.828 0l-7-7A1.414 1.414 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No categories yet</h3>
            <p className="text-gray-900 mb-4">Get started by creating your first document category.</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
            >
              Create Category
            </button>
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
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a1.414 1.414 0 01-2.828 0l-7-7A1.414 1.414 0 013 12V7a4 4 0 014-4z" />
                          </svg>
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
                                  <svg className="w-3 h-3 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a1.414 1.414 0 01-2.828 0l-7-7A1.414 1.414 0 013 12V7a4 4 0 014-4z" />
                                  </svg>
                                </div>
                                <div>
                                  <span className="text-sm text-gray-900">{subCategory.name}</span>
                                  {subCategory.description && (
                                    <span className="text-sm text-gray-900 ml-2">- {subCategory.description}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-6 text-right">
                      <div className="text-sm text-gray-900 font-medium">
                        {stats.documentCount} documents
                      </div>
                      <div className="text-xs text-gray-900">
                        Created {formatDate(category.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Category Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsCreateModalOpen(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleCreateCategory}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Create New Category</h3>
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="text-gray-400 hover:text-gray-900"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-1">
                        Category Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={newCategoryData.name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="e.g., Leases, Invoices, Photos"
                      />
                    </div>

                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-1">
                        Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        rows={3}
                        value={newCategoryData.description}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Brief description of what this category contains..."
                      />
                    </div>

                    <div>
                      <label htmlFor="parentCategoryId" className="block text-sm font-medium text-gray-900 mb-1">
                        Parent Category (optional)
                      </label>
                      <select
                        id="parentCategoryId"
                        name="parentCategoryId"
                        value={newCategoryData.parentCategoryId}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">No parent (root category)</option>
                        {rootCategories.map(category => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={isSubmitting || !newCategoryData.name.trim()}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </>
                    ) : (
                      'Create Category'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={isSubmitting}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 