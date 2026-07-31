'use client';

import React, { useState, useEffect } from 'react';
import { DocumentTemplate } from '@/types/documents';
import { useNotifications } from '@/hooks/useNotifications';
import { FileText, Settings, Eye, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Dialog } from '@/components/ui/Dialog';
import { Alert } from '@/components/ui/Alert';
import { FormField } from '@/components/forms/FormField';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/Tabs';

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Document Templates</h2>
          <p className="text-gray-900">Create and manage document templates for automated generation</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="success" onClick={() => setShowGenerator(true)}>
            Generate Document
          </Button>
          <Button variant="primary" onClick={() => setShowForm(true)}>
            Create Template
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabList>
          {tabs.map((tab) => (
            <Tab key={tab.id} value={tab.id}>
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </Tab>
          ))}
        </TabList>

        <TabPanel value="templates">
          <div className="space-y-6">
            <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className="flex h-full flex-col border border-gray-100 shadow-sm transition-all duration-200 hover:border-purple-100 hover:shadow-md"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3
                        className="text-xl font-bold leading-snug text-gray-900 line-clamp-2 break-words"
                        title={template.name}
                      >
                        {template.name}
                      </h3>
                      <span
                        className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          categories.find((c) => c.id === template.category)?.color ||
                          'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {template.category}
                      </span>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      {template.isSystem && (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                          System
                        </span>
                      )}
                      {!template.isActive && (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="mb-4 min-h-[2.5rem] text-sm leading-snug text-gray-500 line-clamp-2">
                    {template.description || (
                      <span className="italic text-gray-400">No description</span>
                    )}
                  </p>

                  <div className="mb-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Variables</span>
                      <span className="font-medium text-gray-900">{template.variables.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Usage</span>
                      <span className="font-medium text-gray-900">{template.usageCount}</span>
                    </div>
                    {template.lastUsed && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Last used</span>
                        <span className="font-medium text-gray-900">
                          {new Date(template.lastUsed).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto flex items-center gap-2 border-t border-gray-100 pt-4">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setGenerationData({ templateId: template.id, variables: {} });
                        setShowGenerator(true);
                      }}
                    >
                      Generate
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowForm(true);
                      }}
                    >
                      Edit
                    </Button>
                    {!template.isSystem && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {templates.length === 0 && (
              <EmptyState
                icon={<span className="text-6xl">📄</span>}
                title="No Templates Found"
                description="Create your first document template to get started."
                action={
                  <Button variant="primary" onClick={() => setShowForm(true)}>
                    Create Template
                  </Button>
                }
              />
            )}
          </div>
        </TabPanel>

        <TabPanel value="generate">
          <DocumentGenerator
            templates={templates}
            onGenerate={handleGenerateDocument}
            generationData={generationData}
            setGenerationData={setGenerationData}
          />
        </TabPanel>

        <TabPanel value="categories">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Card key={category.id}>
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
                        <span className="text-gray-900">{template.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-purple-600 hover:text-purple-700 h-auto p-0"
                          onClick={() => {
                            setGenerationData({ templateId: template.id, variables: {} });
                            setShowGenerator(true);
                          }}
                        >
                          Use
                        </Button>
                      </div>
                    ))}

                  {templates.filter(t => t.category === category.id).length > 3 && (
                    <div className="text-sm text-gray-900">
                      +{templates.filter(t => t.category === category.id).length - 3} more
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabPanel>
      </Tabs>

      <DocumentGeneratorModal
        isOpen={showGenerator}
        templates={templates}
        generationData={generationData}
        setGenerationData={setGenerationData}
        onGenerate={handleGenerateDocument}
        onClose={() => setShowGenerator(false)}
      />

      <TemplateFormModal
        isOpen={showForm}
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
    </div>
  );
}

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
      <Card>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Select Template</h3>
        <FormField label="Template" htmlFor="gen-template-select">
          <Select
            id="gen-template-select"
            value={generationData.templateId}
            onChange={(e) => setGenerationData({ templateId: e.target.value, variables: {} })}
          >
            <option value="">Choose a template...</option>
            {templates.filter(t => t.isActive).map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} ({template.category})
              </option>
            ))}
          </Select>
        </FormField>
      </Card>

      {selectedTemplate && (
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Fill Template Variables</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedTemplate.variables.map((variable) => (
              <FormField
                key={variable.name}
                label={variable.label}
                htmlFor={`gen-var-${variable.name}`}
                required={variable.required}
                hint={variable.description}
              >
                <Input
                  id={`gen-var-${variable.name}`}
                  type={variable.type === 'date' ? 'date' : variable.type === 'number' ? 'number' : 'text'}
                  value={generationData.variables[variable.name] || ''}
                  onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                  placeholder={variable.description}
                  required={variable.required}
                />
              </FormField>
            ))}
          </div>

          <div className="mt-6">
            <Button variant="primary" onClick={onGenerate}>
              Generate Document
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function DocumentGeneratorModal({
  isOpen,
  templates,
  generationData,
  setGenerationData,
  onGenerate,
  onClose,
}: {
  isOpen: boolean;
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
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Document"
      description="Create a new document from template"
      size="lg"
      className="max-w-3xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleGenerate}
            isDisabled={!selectedTemplate || !isFormValid}
            isLoading={isGenerating}
            leftIcon={!isGenerating ? <FileText className="h-4 w-4" /> : undefined}
          >
            {isGenerating ? 'Generating...' : 'Generate Document'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <Card padding="sm" className="bg-gray-50 border-gray-200 shadow-none">
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
                    <span className="text-xs px-2 py-1 bg-gray-200 text-gray-900 rounded-full capitalize">
                      {template.category}
                    </span>
                  </div>
                  {template.description && (
                    <p className="text-sm text-gray-900 mt-1">{template.description}</p>
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
        </Card>

        {selectedTemplate && selectedTemplate.variables.length > 0 && (
          <Card padding="sm" className="bg-gray-50 border-gray-200 shadow-none">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-600" />
              Template Variables
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedTemplate.variables.map((variable) => (
                <FormField
                  key={variable.name}
                  label={variable.label}
                  htmlFor={`modal-var-${variable.name}`}
                  required={variable.required}
                  hint={variable.description}
                >
                  {variable.type === 'textarea' ? (
                    <Textarea
                      id={`modal-var-${variable.name}`}
                      value={generationData.variables[variable.name] || ''}
                      onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                      placeholder={variable.description}
                      rows={3}
                      required={variable.required}
                    />
                  ) : variable.type === 'select' ? (
                    <Select
                      id={`modal-var-${variable.name}`}
                      value={generationData.variables[variable.name] || ''}
                      onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                      required={variable.required}
                    >
                      <option value="">Select {variable.label}</option>
                      {variable.options?.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      id={`modal-var-${variable.name}`}
                      type={variable.type === 'date' ? 'date' : variable.type === 'number' ? 'number' : 'text'}
                      value={generationData.variables[variable.name] || ''}
                      onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                      placeholder={variable.description}
                      required={variable.required}
                    />
                  )}
                </FormField>
              ))}
            </div>
          </Card>
        )}

        {selectedTemplate && (
          <Card padding="sm" className="bg-gray-50 border-gray-200 shadow-none">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-600" />
              Document Preview
            </h4>

            <Card padding="sm" className="shadow-none">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-medium text-gray-900">{selectedTemplate.name}</h5>
                <span className="text-sm text-gray-900">
                  Format: {selectedTemplate.format?.toUpperCase() || 'PDF'}
                </span>
              </div>

              <div className="text-sm text-gray-900 space-y-2">
                <p><strong>Category:</strong> {selectedTemplate.category}</p>
                <p><strong>Variables:</strong> {selectedTemplate.variables.length}</p>
                <p><strong>Completed:</strong> {Object.keys(generationData.variables).length}/{selectedTemplate.variables.length}</p>
              </div>

              {!isFormValid && (
                <Alert variant="warning" className="mt-3">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Required fields missing
                  </span>
                </Alert>
              )}
            </Card>
          </Card>
        )}
      </div>
    </Dialog>
  );
}

function TemplateFormModal({
  isOpen,
  template,
  onSave,
  onCancel,
}: {
  isOpen: boolean;
  template: DocumentTemplate | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onCancel}
      title={template ? 'Edit Template' : 'Create Template'}
      size="lg"
      className="max-w-4xl"
      footer={
        <>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onSave}>
            Save Template
          </Button>
        </>
      }
    >
      <p className="text-gray-900 text-center py-8">
        Template creation form would be implemented here.
        This would include fields for template name, category, content editor,
        and variable definitions.
      </p>
    </Dialog>
  );
}
