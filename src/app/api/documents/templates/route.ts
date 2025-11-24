import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { DocumentTemplate } from '@/types/documents';

// Mock document templates
const documentTemplates: DocumentTemplate[] = [
  {
    id: 'lease-agreement-standard',
    name: 'Standard Lease Agreement',
    category: 'lease',
    description: 'Standard residential lease agreement template',
    templateContent: `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px;">
        <h1 style="text-align: center; margin-bottom: 30px;">RESIDENTIAL LEASE AGREEMENT</h1>
        
        <div style="margin-bottom: 20px;">
          <p><strong>Property Address:</strong> {{propertyAddress}}</p>
          <p><strong>Unit Number:</strong> {{unitNumber}}</p>
          <p><strong>City, State, ZIP:</strong> {{cityStateZip}}</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h3>PARTIES</h3>
          <p>This lease agreement is entered into on {{leaseDate}} between:</p>
          <p><strong>Landlord:</strong> {{landlordName}}<br>
          Address: {{landlordAddress}}</p>
          <p><strong>Tenant(s):</strong> {{tenantNames}}<br>
          Phone: {{tenantPhone}}<br>
          Email: {{tenantEmail}}</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h3>LEASE TERMS</h3>
          <p><strong>Lease Start Date:</strong> {{leaseStartDate}}</p>
          <p><strong>Lease End Date:</strong> {{leaseEndDate}}</p>
          <p><strong>Monthly Rent:</strong> {{monthlyRent}}</p>
          <p><strong>Security Deposit:</strong> {{securityDeposit}}</p>
          <p><strong>Pet Deposit:</strong> {{petDeposit}} (if applicable)</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h3>PAYMENT TERMS</h3>
          <p>Rent is due on the {{rentDueDay}} of each month.</p>
          <p>Late fee of {{lateFee}} will be charged for payments received after {{gracePeriod}} days.</p>
          <p>Payment method: {{paymentMethod}}</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h3>UTILITIES AND SERVICES</h3>
          <p>Tenant is responsible for: {{tenantUtilities}}</p>
          <p>Landlord is responsible for: {{landlordUtilities}}</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h3>RULES AND REGULATIONS</h3>
          <p>Pets: {{petPolicy}}</p>
          <p>Smoking: {{smokingPolicy}}</p>
          <p>Guests: {{guestPolicy}}</p>
          <p>Parking: {{parkingPolicy}}</p>
        </div>

        <div style="margin-top: 40px;">
          <div style="display: flex; justify-content: space-between;">
            <div style="width: 45%;">
              <p>Landlord Signature: _________________________</p>
              <p>Date: {{signatureDate}}</p>
            </div>
            <div style="width: 45%;">
              <p>Tenant Signature: _________________________</p>
              <p>Date: {{signatureDate}}</p>
            </div>
          </div>
        </div>
      </div>
    `,
    variables: [
      { name: 'propertyAddress', type: 'address', label: 'Property Address', description: 'Full property address', required: true },
      { name: 'unitNumber', type: 'string', label: 'Unit Number', description: 'Unit or apartment number', required: false },
      { name: 'cityStateZip', type: 'string', label: 'City, State, ZIP', description: 'City, state, and ZIP code', required: true },
      { name: 'leaseDate', type: 'date', label: 'Lease Date', description: 'Date the lease is signed', required: true },
      { name: 'landlordName', type: 'string', label: 'Landlord Name', description: 'Full name of landlord', required: true },
      { name: 'landlordAddress', type: 'address', label: 'Landlord Address', description: 'Landlord contact address', required: true },
      { name: 'tenantNames', type: 'string', label: 'Tenant Names', description: 'Names of all tenants', required: true },
      { name: 'tenantPhone', type: 'string', label: 'Tenant Phone', description: 'Tenant contact phone', required: true },
      { name: 'tenantEmail', type: 'string', label: 'Tenant Email', description: 'Tenant contact email', required: true },
      { name: 'leaseStartDate', type: 'date', label: 'Lease Start Date', description: 'When lease begins', required: true },
      { name: 'leaseEndDate', type: 'date', label: 'Lease End Date', description: 'When lease ends', required: true },
      { name: 'monthlyRent', type: 'currency', label: 'Monthly Rent', description: 'Monthly rent amount', required: true },
      { name: 'securityDeposit', type: 'currency', label: 'Security Deposit', description: 'Security deposit amount', required: true },
      { name: 'petDeposit', type: 'currency', label: 'Pet Deposit', description: 'Pet deposit if applicable', required: false },
      { name: 'rentDueDay', type: 'number', label: 'Rent Due Day', description: 'Day of month rent is due', required: true },
      { name: 'lateFee', type: 'currency', label: 'Late Fee', description: 'Late payment fee', required: true },
      { name: 'gracePeriod', type: 'number', label: 'Grace Period', description: 'Grace period in days', required: true },
      { name: 'paymentMethod', type: 'string', label: 'Payment Method', description: 'How rent should be paid', required: true },
      { name: 'tenantUtilities', type: 'string', label: 'Tenant Utilities', description: 'Utilities tenant pays for', required: false },
      { name: 'landlordUtilities', type: 'string', label: 'Landlord Utilities', description: 'Utilities landlord pays for', required: false },
      { name: 'petPolicy', type: 'string', label: 'Pet Policy', description: 'Pet rules and restrictions', required: false },
      { name: 'smokingPolicy', type: 'string', label: 'Smoking Policy', description: 'Smoking rules', required: false },
      { name: 'guestPolicy', type: 'string', label: 'Guest Policy', description: 'Guest rules and restrictions', required: false },
      { name: 'parkingPolicy', type: 'string', label: 'Parking Policy', description: 'Parking arrangements', required: false },
    ],
    isActive: true,
    isSystem: true,
    usageCount: 45,
    lastUsed: new Date('2024-12-20'),
    createdBy: 'system',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-12-01'),
  },
  {
    id: 'rent-invoice-monthly',
    name: 'Monthly Rent Invoice',
    category: 'invoice',
    description: 'Standard monthly rent invoice template',
    templateContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6366f1; margin-bottom: 10px;">RENT INVOICE</h1>
          <p style="color: #6b7280;">Invoice #{{invoiceNumber}}</p>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div>
            <h3>From:</h3>
            <p>{{propertyManagerName}}<br>
            {{propertyManagerAddress}}<br>
            {{propertyManagerPhone}}<br>
            {{propertyManagerEmail}}</p>
          </div>
          <div style="text-align: right;">
            <h3>To:</h3>
            <p>{{tenantName}}<br>
            {{propertyAddress}}<br>
            {{unitNumber}}<br>
            {{tenantEmail}}</p>
          </div>
        </div>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span><strong>Invoice Date:</strong></span>
            <span>{{invoiceDate}}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span><strong>Due Date:</strong></span>
            <span>{{dueDate}}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span><strong>Period:</strong></span>
            <span>{{billingPeriod}}</span>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background: #6366f1; color: white;">
              <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Description</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">Monthly Rent</td>
              <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">{{monthlyRent}}</td>
            </tr>
            {{#if lateFee}}
            <tr>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">Late Fee</td>
              <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">{{lateFee}}</td>
            </tr>
            {{/if}}
            {{#if additionalCharges}}
            <tr>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">{{additionalChargesDescription}}</td>
              <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">{{additionalCharges}}</td>
            </tr>
            {{/if}}
            <tr style="background: #f9fafb; font-weight: bold;">
              <td style="padding: 12px; border: 1px solid #e5e7eb;">Total Amount Due</td>
              <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">{{totalAmount}}</td>
            </tr>
          </tbody>
        </table>

        <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #1e40af;">Payment Instructions</h3>
          <p>{{paymentInstructions}}</p>
          {{#if paymentPortalUrl}}
          <p><a href="{{paymentPortalUrl}}" style="color: #6366f1;">Pay Online</a></p>
          {{/if}}
        </div>

        <div style="text-align: center; color: #6b7280; font-size: 12px;">
          <p>Thank you for your prompt payment.</p>
          <p>For questions, please contact us at {{propertyManagerPhone}} or {{propertyManagerEmail}}</p>
        </div>
      </div>
    `,
    variables: [
      { name: 'invoiceNumber', type: 'string', label: 'Invoice Number', description: 'Unique invoice number', required: true },
      { name: 'propertyManagerName', type: 'string', label: 'Property Manager', description: 'Property manager name', required: true },
      { name: 'propertyManagerAddress', type: 'address', label: 'Manager Address', description: 'Property manager address', required: true },
      { name: 'propertyManagerPhone', type: 'string', label: 'Manager Phone', description: 'Property manager phone', required: true },
      { name: 'propertyManagerEmail', type: 'string', label: 'Manager Email', description: 'Property manager email', required: true },
      { name: 'tenantName', type: 'string', label: 'Tenant Name', description: 'Tenant full name', required: true },
      { name: 'propertyAddress', type: 'address', label: 'Property Address', description: 'Property address', required: true },
      { name: 'unitNumber', type: 'string', label: 'Unit Number', description: 'Unit number', required: false },
      { name: 'tenantEmail', type: 'string', label: 'Tenant Email', description: 'Tenant email', required: true },
      { name: 'invoiceDate', type: 'date', label: 'Invoice Date', description: 'Date invoice was created', required: true },
      { name: 'dueDate', type: 'date', label: 'Due Date', description: 'Payment due date', required: true },
      { name: 'billingPeriod', type: 'string', label: 'Billing Period', description: 'Period being billed for', required: true },
      { name: 'monthlyRent', type: 'currency', label: 'Monthly Rent', description: 'Monthly rent amount', required: true },
      { name: 'lateFee', type: 'currency', label: 'Late Fee', description: 'Late fee if applicable', required: false },
      { name: 'additionalCharges', type: 'currency', label: 'Additional Charges', description: 'Any additional charges', required: false },
      { name: 'additionalChargesDescription', type: 'string', label: 'Additional Charges Description', description: 'Description of additional charges', required: false },
      { name: 'totalAmount', type: 'currency', label: 'Total Amount', description: 'Total amount due', required: true },
      { name: 'paymentInstructions', type: 'string', label: 'Payment Instructions', description: 'How to make payment', required: true },
      { name: 'paymentPortalUrl', type: 'string', label: 'Payment Portal URL', description: 'Online payment link', required: false },
    ],
    isActive: true,
    isSystem: true,
    usageCount: 180,
    lastUsed: new Date('2024-12-25'),
    createdBy: 'system',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-12-01'),
  },
  {
    id: 'move-out-notice',
    name: 'Move-Out Notice',
    category: 'notice',
    description: 'Notice to tenant regarding move-out procedures',
    templateContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px;">
        <h1 style="text-align: center; color: #dc2626; margin-bottom: 30px;">MOVE-OUT NOTICE</h1>

        <div style="margin-bottom: 20px;">
          <p><strong>Date:</strong> {{noticeDate}}</p>
          <p><strong>To:</strong> {{tenantName}}</p>
          <p><strong>Property:</strong> {{propertyAddress}}, {{unitNumber}}</p>
        </div>

        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;">
          <p><strong>NOTICE TO VACATE</strong></p>
          <p>You are hereby required to quit and deliver up to the undersigned the premises you now hold as our tenant, namely the above-described premises, within {{noticePeriod}} days after service of this notice.</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h3>Move-Out Date: {{moveOutDate}}</h3>
          <p><strong>Reason for Notice:</strong> {{moveOutReason}}</p>
        </div>

        <div style="margin-bottom: 20px;">
          <h3>MOVE-OUT PROCEDURES</h3>
          <ol>
            <li>Clean the unit thoroughly, including appliances, carpets, and fixtures</li>
            <li>Remove all personal belongings and trash</li>
            <li>Return all keys, garage door openers, and access cards</li>
            <li>Provide forwarding address for security deposit return</li>
            <li>Schedule final walk-through inspection</li>
          </ol>
        </div>

        <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">SECURITY DEPOSIT</h3>
          <p>Your security deposit of {{securityDeposit}} will be returned within {{depositReturnDays}} days after move-out, minus any deductions for:</p>
          <ul>
            <li>Unpaid rent</li>
            <li>Damage beyond normal wear and tear</li>
            <li>Cleaning fees</li>
            <li>Other charges as outlined in your lease</li>
          </ul>
        </div>

        <div style="margin-bottom: 20px;">
          <h3>CONTACT INFORMATION</h3>
          <p>For questions or to schedule your move-out inspection, please contact:</p>
          <p>{{propertyManagerName}}<br>
          Phone: {{propertyManagerPhone}}<br>
          Email: {{propertyManagerEmail}}</p>
        </div>

        <div style="margin-top: 40px;">
          <p>Failure to comply with this notice may result in legal action to recover possession of the premises, damages, and court costs.</p>
          
          <div style="margin-top: 30px;">
            <p>_________________________<br>
            {{landlordName}}<br>
            Owner/Manager</p>
            <p>Date: {{signatureDate}}</p>
          </div>
        </div>
      </div>
    `,
    variables: [
      { name: 'noticeDate', type: 'date', label: 'Notice Date', description: 'Date notice is given', required: true },
      { name: 'tenantName', type: 'string', label: 'Tenant Name', description: 'Name of tenant', required: true },
      { name: 'propertyAddress', type: 'address', label: 'Property Address', description: 'Property address', required: true },
      { name: 'unitNumber', type: 'string', label: 'Unit Number', description: 'Unit number', required: false },
      { name: 'noticePeriod', type: 'number', label: 'Notice Period (days)', description: 'Number of days notice', required: true },
      { name: 'moveOutDate', type: 'date', label: 'Move-Out Date', description: 'Required move-out date', required: true },
      { name: 'moveOutReason', type: 'string', label: 'Reason for Move-Out', description: 'Reason for notice', required: true },
      { name: 'securityDeposit', type: 'currency', label: 'Security Deposit', description: 'Security deposit amount', required: true },
      { name: 'depositReturnDays', type: 'number', label: 'Deposit Return Days', description: 'Days to return deposit', required: true },
      { name: 'propertyManagerName', type: 'string', label: 'Property Manager', description: 'Property manager name', required: true },
      { name: 'propertyManagerPhone', type: 'string', label: 'Manager Phone', description: 'Property manager phone', required: true },
      { name: 'propertyManagerEmail', type: 'string', label: 'Manager Email', description: 'Property manager email', required: true },
      { name: 'landlordName', type: 'string', label: 'Landlord Name', description: 'Landlord/owner name', required: true },
    ],
    isActive: true,
    isSystem: true,
    usageCount: 12,
    lastUsed: new Date('2024-12-10'),
    createdBy: 'system',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-12-01'),
  },
];

// Helper function to replace template variables
function replaceTemplateVariables(template: string, variables: Record<string, any>): string {
  let result = template;
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    let formattedValue = value;
    
    // Format based on variable type
    if (typeof value === 'number' && key.toLowerCase().includes('amount')) {
      formattedValue = new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
      }).format(value);
    } else if (value instanceof Date || (typeof value === 'string' && Date.parse(value))) {
      const date = new Date(value);
      formattedValue = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    
    result = result.replace(regex, formattedValue);
  });
  
  return result;
}

// GET /api/documents/templates - Get document templates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    let filteredTemplates = [...documentTemplates];

    if (category) {
      filteredTemplates = filteredTemplates.filter(t => t.category === category);
    }

    if (!includeInactive) {
      filteredTemplates = filteredTemplates.filter(t => t.isActive);
    }

    return NextResponse.json({
      success: true,
      data: filteredTemplates,
    });
  } catch (error) {
    console.error('Error fetching document templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document templates' },
      { status: 500 }
    );
  }
}

// POST /api/documents/templates - Create new template or generate document
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, templateId, variables, ...templateData } = body;

    if (action === 'generate') {
      // Generate document from template
      if (!templateId || !variables) {
        return NextResponse.json(
          { error: 'Template ID and variables are required for generation' },
          { status: 400 }
        );
      }

      const template = documentTemplates.find(t => t.id === templateId);
      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }

      // Validate required variables
      const missingVariables = template.variables
        .filter(v => v.required && !variables[v.name])
        .map(v => v.name);

      if (missingVariables.length > 0) {
        return NextResponse.json(
          { 
            error: 'Missing required variables',
            missingVariables 
          },
          { status: 400 }
        );
      }

      // Generate document content
      const generatedContent = replaceTemplateVariables(template.templateContent, variables);
      
      const generatedDocument = {
        id: `doc_${Date.now()}`,
        templateId: template.id,
        templateName: template.name,
        fileName: `${template.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`,
        generatedContent,
        variables,
        status: 'draft',
        documentType: template.category,
        generatedBy: session.user.name || session.user.email || 'Unknown',
        signatureRequired: template.category === 'lease' || template.category === 'agreement',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Update template usage
      const templateIndex = documentTemplates.findIndex(t => t.id === templateId);
      if (templateIndex !== -1) {
        documentTemplates[templateIndex].usageCount++;
        documentTemplates[templateIndex].lastUsed = new Date();
      }

      return NextResponse.json({
        success: true,
        message: 'Document generated successfully',
        data: generatedDocument,
      });
    } else {
      // Create new template
      if (session.user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Admin access required to create templates' },
          { status: 403 }
        );
      }

      const { name, category, description, templateContent, variables } = templateData;

      if (!name || !category || !templateContent) {
        return NextResponse.json(
          { error: 'Name, category, and template content are required' },
          { status: 400 }
        );
      }

      const newTemplate: DocumentTemplate = {
        id: `template_${Date.now()}`,
        name,
        category,
        description,
        templateContent,
        variables: variables || [],
        isActive: true,
        isSystem: false,
        usageCount: 0,
        createdBy: session.user.name || session.user.email || 'Unknown',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      documentTemplates.push(newTemplate);

      return NextResponse.json({
        success: true,
        message: 'Template created successfully',
        data: newTemplate,
      });
    }
  } catch (error) {
    console.error('Error processing template request:', error);
    return NextResponse.json(
      { error: 'Failed to process template request' },
      { status: 500 }
    );
  }
}

// PUT /api/documents/templates - Update template
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const templateIndex = documentTemplates.findIndex(t => t.id === id);
    if (templateIndex === -1) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    const template = documentTemplates[templateIndex];
    if (template.isSystem && updateData.isActive === false) {
      return NextResponse.json(
        { error: 'Cannot deactivate system templates' },
        { status: 400 }
      );
    }

    // Update template
    documentTemplates[templateIndex] = {
      ...template,
      ...updateData,
      updatedAt: new Date(),
    };

    return NextResponse.json({
      success: true,
      message: 'Template updated successfully',
      data: documentTemplates[templateIndex],
    });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/templates - Delete template
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const templateIndex = documentTemplates.findIndex(t => t.id === templateId);
    if (templateIndex === -1) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    const template = documentTemplates[templateIndex];
    if (template.isSystem) {
      return NextResponse.json(
        { error: 'Cannot delete system templates' },
        { status: 400 }
      );
    }

    // Remove template
    documentTemplates.splice(templateIndex, 1);

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
} 