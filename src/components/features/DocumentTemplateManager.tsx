'use client';

import React, { useState, useEffect } from 'react';
import { DocumentTemplate, DocumentTemplateVariable } from '@/types/documents';
import { useNotifications } from '@/hooks/useNotifications';
import { X, FileText, Settings, Eye, AlertCircle, RefreshCw, Plus, Edit, Trash2, Download, CheckCircle } from 'lucide-react';

interface DocumentTemplateManagerProps {
  onTemplateCreated?: () => void;
}

export default function DocumentTemplateManager({ onTemplateCreated }: DocumentTemplateManagerProps) {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('templates');
  const [showForm, setShowForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [generationData, setGenerationData] = useState<{ templateId: string; variables: Record<string, any> }>({
    templateId: '',
    variables: {},
  });
  const { addNotification } = useNotifications();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/documents/templates');
      const data = await response.json();
      if (data.success) {
        setTemplates(data.data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      addNotification('Failed to fetch templates', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDocument = async () => {
    if (!generationData.templateId) {
      addNotification('Please select a template', 'warning');
      return;
    }

    try {
      const response = await fetch('/api/documents/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          templateId: generationData.templateId,
          variables: generationData.variables,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        addNotification('Document generated successfully', 'success');
        setShowGenerator(false);
        setGenerationData({ templateId: '', variables: {} });
        
        // Open generated document in new tab for preview
        const blob = new Blob([result.data.generatedContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        addNotification(result.error || 'Failed to generate document', 'error');
      }
    } catch (error) {
      console.error('Error generating document:', error);
      addNotification('Failed to generate document', 'error');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`/api/documents/templates?id=${templateId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        addNotification('Template deleted successfully', 'success');
        fetchTemplates();
      } else {
        addNotification(result.error || 'Failed to delete template', 'error');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      addNotification('Failed to delete template', 'error');
    }
  };

  const tabs = [
    { id: 'templates', name: 'Templates', icon: '📄' },
    { id: 'generate', name: 'Generate Document', icon: '🔨' },
    { id: 'categories', name: 'Categories', icon: '📁' },
  ];

  const categories = [
    { id: 'lease', name: 'Lease Agreements', count: templates.filter(t => t.category === 'lease').length, color: 'bg-blue-100 text-blue-800' },
    { id: 'invoice', name: 'Invoices', count: templates.filter(t => t.category === 'invoice').length, color: 'bg-green-100 text-green-800' },
    { id: 'notice', name: 'Notices', count: templates.filter(t => t.category === 'notice').length, color: 'bg-yellow-100 text-yellow-800' },
    { id: 'agreement', name: 'Agreements', count: templates.filter(t => t.category === 'agreement').length, color: 'bg-purple-100 text-purple-800' },
    { id: 'receipt', name: 'Receipts', count: templates.filter(t => t.category === 'receipt').length, color: 'bg-pink-100 text-pink-800' },
    { id: 'report', name: 'Reports', count: templates.filter(t => t.category === 'report').length, color: 'bg-indigo-100 text-indigo-800' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Document Templates</h2>
          <p className="text-gray-600">Create and manage document templates for automated generation</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowGenerator(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Generate Document
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Create Template
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {templates.map((template) => (
                <div key={template.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        categories.find(c => c.id === template.category)?.color || 'bg-gray-100 text-gray-800'
                      }`}>
                        {template.category}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {template.isSystem && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          System
                        </span>
                      )}
                      {!template.isActive && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  {template.description && (
                    <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Variables:</span>
                      <span className="font-medium">{template.variables.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Usage Count:</span>
                      <span className="font-medium">{template.usageCount}</span>
                    </div>
                    {template.lastUsed && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Last Used:</span>
                        <span className="font-medium">
                          {new Date(template.lastUsed).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        setGenerationData({ templateId: template.id, variables: {} });
                        setShowGenerator(true);
                      }}
                      className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                      Generate
                    </button>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedTemplate(template);
                          setShowForm(true);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Edit
                      </button>
                      {!template.isSystem && (
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {templates.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📄</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates Found</h3>
                <p className="text-gray-500 mb-6">Create your first document template to get started.</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
                >
                  Create Template
                </button>
              </div>
            )}
          </div>
        )}

        {/* Generate Document Tab */}
        {activeTab === 'generate' && (
          <DocumentGenerator
            templates={templates}
            onGenerate={handleGenerateDocument}
            generationData={generationData}
            setGenerationData={setGenerationData}
          />
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <div key={category.id} className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">{category.name}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${category.color}`}>
                    {category.count}
                  </span>
                </div>
                
                <div className="space-y-2">
                  {templates
                    .filter(t => t.category === category.id)
                    .slice(0, 3)
                    .map((template) => (
                      <div key={template.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{template.name}</span>
                        <button
                          onClick={() => {
                            setGenerationData({ templateId: template.id, variables: {} });
                            setShowGenerator(true);
                          }}
                          className="text-purple-600 hover:text-purple-700"
                        >
                          Use
                        </button>
                      </div>
                    ))}
                  
                  {templates.filter(t => t.category === category.id).length > 3 && (
                    <div className="text-sm text-gray-500">
                      +{templates.filter(t => t.category === category.id).length - 3} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document Generator Modal */}
      {showGenerator && (
        <DocumentGeneratorModal
          templates={templates}
          generationData={generationData}
          setGenerationData={setGenerationData}
          onGenerate={handleGenerateDocument}
          onClose={() => setShowGenerator(false)}
        />
      )}

      {/* Template Form Modal */}
      {showForm && (
        <TemplateFormModal
          template={selectedTemplate}
          onSave={() => {
            setShowForm(false);
            setSelectedTemplate(null);
            fetchTemplates();
            onTemplateCreated?.();
          }}
          onCancel={() => {
            setShowForm(false);
            setSelectedTemplate(null);
          }}
        />
      )}
    </div>
  );
}

// Document Generator Component
function DocumentGenerator({ 
  templates, 
  onGenerate, 
  generationData, 
  setGenerationData 
}: {
  templates: DocumentTemplate[];
  onGenerate: () => void;
  generationData: { templateId: string; variables: Record<string, any> };
  setGenerationData: (data: { templateId: string; variables: Record<string, any> }) => void;
}) {
  const selectedTemplate = templates.find(t => t.id === generationData.templateId);

  const handleVariableChange = (variableName: string, value: any) => {
    setGenerationData({
      ...generationData,
      variables: {
        ...generationData.variables,
        [variableName]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Select Template</h3>
        
        <select
          value={generationData.templateId}
          onChange={(e) => setGenerationData({ templateId: e.target.value, variables: {} })}
          className="w-full border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="">Choose a template...</option>
          {templates.filter(t => t.isActive).map((template) => (
            <option key={template.id} value={template.id}>
              {template.name} ({template.category})
            </option>
          ))}
        </select>
      </div>

      {selectedTemplate && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Fill Template Variables</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedTemplate.variables.map((variable) => (
              <div key={variable.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {variable.label}
                  {variable.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <input
                  type={variable.type === 'date' ? 'date' : variable.type === 'number' ? 'number' : 'text'}
                  value={generationData.variables[variable.name] || ''}
                  onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  placeholder={variable.description}
                  required={variable.required}
                />
              </div>
            ))}
          </div>

          <div className="mt-6">
            <button
              onClick={onGenerate}
              className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Generate Document
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Enhanced Document Generator Modal
function DocumentGeneratorModal({
  templates,
  generationData,
  setGenerationData,
  onGenerate,
  onClose,
}: {
  templates: DocumentTemplate[];
  generationData: { templateId: string; variables: Record<string, any> };
  setGenerationData: (data: { templateId: string; variables: Record<string, any> }) => void;
  onGenerate: () => void;
  onClose: () => void;
}) {
  const selectedTemplate = templates.find(t => t.id === generationData.templateId);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleVariableChange = (variableName: string, value: any) => {
    setGenerationData({
      ...generationData,
      variables: {
        ...generationData.variables,
        [variableName]: value,
      },
    });
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerate();
      onClose();
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const isFormValid = selectedTemplate?.variables.every(variable => 
    !variable.required || generationData.variables[variable.name]
  );

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[95vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold text-white">Generate Document</h3>
              <p className="text-purple-100 text-sm">Create a new document from template</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-purple-200 transition-colors rounded-full p-1 hover:bg-white/10"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-160px)]">
          <div className="space-y-6">
            
            {/* Template Selection */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                Select Template
              </h4>
              
              <div className="space-y-3">
                {templates.filter(t => t.isActive).map((template) => (
                  <label
                    key={template.id}
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      generationData.templateId === template.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="template"
                      value={template.id}
                      checked={generationData.templateId === template.id}
                      onChange={(e) => setGenerationData({ templateId: e.target.value, variables: {} })}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium text-gray-900">{template.name}</h5>
                        <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-full capitalize">
                          {template.category}
                        </span>
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                      )}
                    </div>
                    {generationData.templateId === template.id && (
                      <div className="ml-3 text-purple-600">
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Template Variables */}
            {selectedTemplate && selectedTemplate.variables.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Settings className="h-5 w-5 text-purple-600" />
                  Template Variables
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedTemplate.variables.map((variable) => (
                    <div key={variable.name} className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {variable.label}
                        {variable.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      
                      {variable.type === 'textarea' ? (
                        <textarea
                          value={generationData.variables[variable.name] || ''}
                          onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder={variable.description}
                          rows={3}
                          required={variable.required}
                        />
                      ) : variable.type === 'select' ? (
                        <select
                          value={generationData.variables[variable.name] || ''}
                          onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          required={variable.required}
                        >
                          <option value="">Select {variable.label}</option>
                          {variable.options?.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={variable.type === 'date' ? 'date' : variable.type === 'number' ? 'number' : 'text'}
                          value={generationData.variables[variable.name] || ''}
                          onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder={variable.description}
                          required={variable.required}
                        />
                      )}
                      
                      {variable.description && (
                        <p className="text-xs text-gray-500">{variable.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview */}
            {selectedTemplate && (
              <div className="bg-gray-50 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-purple-600" />
                  Document Preview
                </h4>
                
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-gray-900">{selectedTemplate.name}</h5>
                    <span className="text-sm text-gray-500">
                      Format: {selectedTemplate.format?.toUpperCase() || 'PDF'}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-2">
                    <p><strong>Category:</strong> {selectedTemplate.category}</p>
                    <p><strong>Variables:</strong> {selectedTemplate.variables.length}</p>
                    <p><strong>Completed:</strong> {Object.keys(generationData.variables).length}/{selectedTemplate.variables.length}</p>
                  </div>
                  
                  {!isFormValid && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center gap-2 text-amber-700">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Required fields missing</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={!selectedTemplate || !isFormValid || isGenerating}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Generate Document
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Template Form Modal (placeholder)
function TemplateFormModal({
  template,
  onSave,
  onCancel,
}: {
  template: DocumentTemplate | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">
              {template ? 'Edit Template' : 'Create Template'}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <p className="text-gray-500 text-center py-8">
            Template creation form would be implemented here.
            This would include fields for template name, category, content editor,
            and variable definitions.
          </p>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Save Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 