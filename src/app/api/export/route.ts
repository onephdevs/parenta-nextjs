import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ExportRequest, ReportBuilder } from '@/types/documents';

// Mock export data generators
const generateFinancialReport = (parameters: any) => {
  const { dateRange, buildingIds, format } = parameters;
  
  // Mock financial data
  const data = [
    { building: 'Sunset Apartments', revenue: 25000, expenses: 18000, netIncome: 7000, occupancy: 95 },
    { building: 'Downtown Lofts', revenue: 32000, expenses: 22000, netIncome: 10000, occupancy: 88 },
    { building: 'Garden View Complex', revenue: 28000, expenses: 19500, netIncome: 8500, occupancy: 92 },
  ];

  if (format === 'csv') {
    const headers = ['Building', 'Revenue', 'Expenses', 'Net Income', 'Occupancy %'];
    const rows = data.map(row => [
      row.building,
      row.revenue.toString(),
      row.expenses.toString(),
      row.netIncome.toString(),
      row.occupancy.toString()
    ]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  if (format === 'json') {
    return JSON.stringify({
      report: 'Financial Summary',
      period: `${dateRange.startDate} to ${dateRange.endDate}`,
      data,
      summary: {
        totalRevenue: data.reduce((sum, item) => sum + item.revenue, 0),
        totalExpenses: data.reduce((sum, item) => sum + item.expenses, 0),
        totalNetIncome: data.reduce((sum, item) => sum + item.netIncome, 0),
        averageOccupancy: data.reduce((sum, item) => sum + item.occupancy, 0) / data.length,
      },
      generatedAt: new Date().toISOString(),
    }, null, 2);
  }

  // Default to JSON for other formats in this demo
  return JSON.stringify(data, null, 2);
};

const generateTenantList = (parameters: any) => {
  const { buildingIds, includeFields, format } = parameters;
  
  const mockTenants = [
    {
      id: '1',
      name: 'John Smith',
      email: 'john.smith@email.com',
      phone: '(555) 123-4567',
      building: 'Sunset Apartments',
      unit: 'A101',
      leaseStart: '2024-01-15',
      leaseEnd: '2024-12-15',
      rent: 1250,
      status: 'active',
      moveInDate: '2024-01-15',
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah.j@email.com',
      phone: '(555) 234-5678',
      building: 'Downtown Lofts',
      unit: 'B205',
      leaseStart: '2024-03-01',
      leaseEnd: '2025-02-28',
      rent: 1800,
      status: 'active',
      moveInDate: '2024-03-01',
    },
    {
      id: '3',
      name: 'Mike Chen',
      email: 'mike.chen@email.com',
      phone: '(555) 345-6789',
      building: 'Garden View Complex',
      unit: 'C312',
      leaseStart: '2024-06-01',
      leaseEnd: '2025-05-31',
      rent: 1400,
      status: 'active',
      moveInDate: '2024-06-01',
    },
  ];

  // Filter by included fields if specified
  let processedData = mockTenants;
  if (includeFields && includeFields.length > 0) {
    processedData = mockTenants.map(tenant => {
      const filtered: any = {};
      includeFields.forEach((field: string) => {
        if (tenant.hasOwnProperty(field)) {
          filtered[field] = (tenant as any)[field];
        }
      });
      return filtered;
    });
  }

  if (format === 'csv') {
    const headers = Object.keys(processedData[0] || {});
    const rows = processedData.map(tenant => 
      headers.map(header => (tenant as any)[header]?.toString() || '')
    );
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  if (format === 'json') {
    return JSON.stringify({
      report: 'Tenant List',
      totalTenants: processedData.length,
      data: processedData,
      generatedAt: new Date().toISOString(),
    }, null, 2);
  }

  return JSON.stringify(processedData, null, 2);
};

const generateMaintenanceLog = (parameters: any) => {
  const { dateRange, buildingIds, format } = parameters;
  
  const mockMaintenance = [
    {
      id: 'MR-001',
      building: 'Sunset Apartments',
      unit: 'A101',
      type: 'HVAC',
      priority: 'High',
      status: 'Completed',
      requestDate: '2024-12-15',
      completedDate: '2024-12-16',
      cost: 350,
      description: 'AC unit not cooling properly',
      technician: 'John Technical',
    },
    {
      id: 'MR-002',
      building: 'Downtown Lofts',
      unit: 'B205',
      type: 'Plumbing',
      priority: 'Medium',
      status: 'In Progress',
      requestDate: '2024-12-20',
      completedDate: null,
      cost: 0,
      description: 'Kitchen faucet leak',
      technician: 'Mike Plumber',
    },
    {
      id: 'MR-003',
      building: 'Garden View Complex',
      unit: 'C312',
      type: 'Electrical',
      priority: 'Low',
      status: 'Completed',
      requestDate: '2024-12-18',
      completedDate: '2024-12-19',
      cost: 150,
      description: 'Replace light fixture',
      technician: 'Sarah Electric',
    },
  ];

  if (format === 'csv') {
    const headers = ['ID', 'Building', 'Unit', 'Type', 'Priority', 'Status', 'Request Date', 'Completed Date', 'Cost', 'Description', 'Technician'];
    const rows = mockMaintenance.map(item => [
      item.id,
      item.building,
      item.unit,
      item.type,
      item.priority,
      item.status,
      item.requestDate,
      item.completedDate || '',
      item.cost.toString(),
      item.description,
      item.technician,
    ]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  if (format === 'json') {
    return JSON.stringify({
      report: 'Maintenance Log',
      period: `${dateRange?.startDate || 'All time'} to ${dateRange?.endDate || 'Present'}`,
      data: mockMaintenance,
      summary: {
        totalRequests: mockMaintenance.length,
        completed: mockMaintenance.filter(m => m.status === 'Completed').length,
        inProgress: mockMaintenance.filter(m => m.status === 'In Progress').length,
        totalCost: mockMaintenance.reduce((sum, item) => sum + item.cost, 0),
      },
      generatedAt: new Date().toISOString(),
    }, null, 2);
  }

  return JSON.stringify(mockMaintenance, null, 2);
};

const generateOccupancyReport = (parameters: any) => {
  const { dateRange, buildingIds, format } = parameters;
  
  const mockOccupancy = [
    {
      building: 'Sunset Apartments',
      totalUnits: 24,
      occupiedUnits: 23,
      vacantUnits: 1,
      occupancyRate: 95.8,
      avgRent: 1275,
      totalRevenue: 29325,
      turnoverRate: 8.3,
    },
    {
      building: 'Downtown Lofts',
      totalUnits: 18,
      occupiedUnits: 16,
      vacantUnits: 2,
      occupancyRate: 88.9,
      avgRent: 1850,
      totalRevenue: 29600,
      turnoverRate: 11.1,
    },
    {
      building: 'Garden View Complex',
      totalUnits: 30,
      occupiedUnits: 28,
      vacantUnits: 2,
      occupancyRate: 93.3,
      avgRent: 1420,
      totalRevenue: 39760,
      turnoverRate: 6.7,
    },
  ];

  if (format === 'csv') {
    const headers = ['Building', 'Total Units', 'Occupied', 'Vacant', 'Occupancy %', 'Avg Rent', 'Total Revenue', 'Turnover %'];
    const rows = mockOccupancy.map(item => [
      item.building,
      item.totalUnits.toString(),
      item.occupiedUnits.toString(),
      item.vacantUnits.toString(),
      item.occupancyRate.toString(),
      item.avgRent.toString(),
      item.totalRevenue.toString(),
      item.turnoverRate.toString(),
    ]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  if (format === 'json') {
    return JSON.stringify({
      report: 'Occupancy Report',
      period: `${dateRange?.startDate || 'Current'} to ${dateRange?.endDate || 'Current'}`,
      data: mockOccupancy,
      summary: {
        totalUnits: mockOccupancy.reduce((sum, item) => sum + item.totalUnits, 0),
        totalOccupied: mockOccupancy.reduce((sum, item) => sum + item.occupiedUnits, 0),
        overallOccupancyRate: (mockOccupancy.reduce((sum, item) => sum + (item.occupancyRate * item.totalUnits), 0) / mockOccupancy.reduce((sum, item) => sum + item.totalUnits, 0)),
        totalRevenue: mockOccupancy.reduce((sum, item) => sum + item.totalRevenue, 0),
      },
      generatedAt: new Date().toISOString(),
    }, null, 2);
  }

  return JSON.stringify(mockOccupancy, null, 2);
};

// Mock export queue
const exportQueue: ExportRequest[] = [];
let exportCounter = 1;

// Mock report builders
const reportBuilders: ReportBuilder[] = [
  {
    id: 'custom-financial',
    name: 'Custom Financial Report',
    description: 'Customizable financial performance report',
    dataSource: 'payments',
    fields: [
      { fieldName: 'building_name', displayName: 'Building', dataType: 'string', isVisible: true, sortOrder: 1 },
      { fieldName: 'revenue', displayName: 'Revenue', dataType: 'currency', aggregation: 'sum', isVisible: true, sortOrder: 2 },
      { fieldName: 'expenses', displayName: 'Expenses', dataType: 'currency', aggregation: 'sum', isVisible: true, sortOrder: 3 },
      { fieldName: 'net_income', displayName: 'Net Income', dataType: 'currency', aggregation: 'sum', isVisible: true, sortOrder: 4 },
    ],
    filters: [
      { fieldName: 'payment_date', operator: 'between', value: '', isRequired: true },
      { fieldName: 'building_id', operator: 'in', value: [], isRequired: false },
    ],
    grouping: [
      { fieldName: 'building_name', displayName: 'By Building', aggregations: { revenue: 'sum', expenses: 'sum' } },
    ],
    sorting: [
      { fieldName: 'building_name', direction: 'asc', priority: 1 },
    ],
    isPublic: true,
    createdBy: 'system',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-12-01'),
  },
  {
    id: 'tenant-details',
    name: 'Tenant Details Report',
    description: 'Comprehensive tenant information report',
    dataSource: 'tenants',
    fields: [
      { fieldName: 'tenant_name', displayName: 'Tenant Name', dataType: 'string', isVisible: true, sortOrder: 1 },
      { fieldName: 'email', displayName: 'Email', dataType: 'string', isVisible: true, sortOrder: 2 },
      { fieldName: 'phone', displayName: 'Phone', dataType: 'string', isVisible: true, sortOrder: 3 },
      { fieldName: 'building_name', displayName: 'Building', dataType: 'string', isVisible: true, sortOrder: 4 },
      { fieldName: 'unit_number', displayName: 'Unit', dataType: 'string', isVisible: true, sortOrder: 5 },
      { fieldName: 'lease_start', displayName: 'Lease Start', dataType: 'date', isVisible: true, sortOrder: 6 },
      { fieldName: 'lease_end', displayName: 'Lease End', dataType: 'date', isVisible: true, sortOrder: 7 },
      { fieldName: 'monthly_rent', displayName: 'Monthly Rent', dataType: 'currency', isVisible: true, sortOrder: 8 },
    ],
    filters: [
      { fieldName: 'tenant_status', operator: 'equals', value: 'active', isRequired: false },
      { fieldName: 'building_id', operator: 'in', value: [], isRequired: false },
    ],
    grouping: [],
    sorting: [
      { fieldName: 'building_name', direction: 'asc', priority: 1 },
      { fieldName: 'unit_number', direction: 'asc', priority: 2 },
    ],
    isPublic: true,
    createdBy: 'system',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-12-01'),
  },
];

// GET /api/export - Get export requests, report builders, or export data
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
    const type = searchParams.get('type') || 'queue';
    const exportId = searchParams.get('exportId');

    switch (type) {
      case 'queue':
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const status = searchParams.get('status');
        
        let filteredQueue = [...exportQueue];
        if (status) {
          filteredQueue = filteredQueue.filter(e => e.status === status);
        }
        
        const paginatedQueue = filteredQueue.slice(offset, offset + limit);
        
        return NextResponse.json({
          success: true,
          data: {
            exports: paginatedQueue,
            total: filteredQueue.length,
            limit,
            offset,
          },
        });

      case 'builders':
        return NextResponse.json({
          success: true,
          data: reportBuilders,
        });

      case 'download':
        if (!exportId) {
          return NextResponse.json(
            { error: 'Export ID is required for download' },
            { status: 400 }
          );
        }

        const exportRequest = exportQueue.find(e => e.id === exportId);
        if (!exportRequest) {
          return NextResponse.json(
            { error: 'Export not found' },
            { status: 404 }
          );
        }

        if (exportRequest.status !== 'completed') {
          return NextResponse.json(
            { error: 'Export not ready for download' },
            { status: 400 }
          );
        }

        // In production, this would serve the actual file
        return NextResponse.json({
          success: true,
          data: {
            downloadUrl: exportRequest.downloadUrl,
            fileName: exportRequest.fileName,
            fileSize: exportRequest.fileSize,
            expiresAt: exportRequest.expiresAt,
          },
        });

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error handling export GET request:', error);
    return NextResponse.json(
      { error: 'Failed to process export request' },
      { status: 500 }
    );
  }
}

// POST /api/export - Create new export request
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
    const { name, exportType, format, parameters, schedule } = body;

    if (!name || !exportType || !format) {
      return NextResponse.json(
        { error: 'Name, export type, and format are required' },
        { status: 400 }
      );
    }

    // Validate parameters based on export type
    if (exportType === 'financial_report' && (!parameters?.dateRange)) {
      return NextResponse.json(
        { error: 'Date range is required for financial reports' },
        { status: 400 }
      );
    }

    // Create export request
    const exportRequest: ExportRequest = {
      id: `export_${exportCounter++}`,
      name,
      exportType,
      format,
      parameters: parameters || {},
      schedule,
      status: 'pending',
      createdBy: session.user.name || session.user.email || 'Unknown',
      createdAt: new Date(),
    };

    exportQueue.push(exportRequest);

    // Simulate processing (in production, this would be handled by a background job)
    setTimeout(() => {
      const queuedExport = exportQueue.find(e => e.id === exportRequest.id);
      if (!queuedExport) return;

      try {
        queuedExport.status = 'processing';

        let exportData: string = '';
        let fileName: string = '';

        // Generate export data based on type
        switch (exportType) {
          case 'financial_report':
            exportData = generateFinancialReport(parameters);
            fileName = `financial_report_${new Date().toISOString().split('T')[0]}.${format}`;
            break;
          case 'tenant_list':
            exportData = generateTenantList(parameters);
            fileName = `tenant_list_${new Date().toISOString().split('T')[0]}.${format}`;
            break;
          case 'maintenance_log':
            exportData = generateMaintenanceLog(parameters);
            fileName = `maintenance_log_${new Date().toISOString().split('T')[0]}.${format}`;
            break;
          case 'occupancy_report':
            exportData = generateOccupancyReport(parameters);
            fileName = `occupancy_report_${new Date().toISOString().split('T')[0]}.${format}`;
            break;
          default:
            throw new Error('Unsupported export type');
        }

        // Simulate file creation and storage
        queuedExport.status = 'completed';
        queuedExport.fileName = fileName;
        queuedExport.fileSize = exportData.length;
        queuedExport.downloadUrl = `/api/export/download/${queuedExport.id}`;
        queuedExport.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        queuedExport.completedAt = new Date();

      } catch (error) {
        queuedExport.status = 'failed';
        queuedExport.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      }
    }, 3000); // 3 second delay to simulate processing

    return NextResponse.json({
      success: true,
      message: 'Export request created successfully',
      data: exportRequest,
    });
  } catch (error) {
    console.error('Error creating export request:', error);
    return NextResponse.json(
      { error: 'Failed to create export request' },
      { status: 500 }
    );
  }
}

// PUT /api/export - Update export request or report builder
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, id, ...updateData } = body;

    if (!type || !id) {
      return NextResponse.json(
        { error: 'Type and ID are required' },
        { status: 400 }
      );
    }

    if (type === 'export') {
      const exportIndex = exportQueue.findIndex(e => e.id === id);
      if (exportIndex === -1) {
        return NextResponse.json(
          { error: 'Export request not found' },
          { status: 404 }
        );
      }

      // Only allow cancelling pending or processing exports
      if (updateData.status === 'cancelled' && 
          ['pending', 'processing'].includes(exportQueue[exportIndex].status)) {
        exportQueue[exportIndex].status = 'cancelled';
        return NextResponse.json({
          success: true,
          message: 'Export cancelled successfully',
        });
      }

      return NextResponse.json(
        { error: 'Invalid update operation' },
        { status: 400 }
      );

    } else if (type === 'builder') {
      if (session.user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }

      const builderIndex = reportBuilders.findIndex(b => b.id === id);
      if (builderIndex === -1) {
        return NextResponse.json(
          { error: 'Report builder not found' },
          { status: 404 }
        );
      }

      reportBuilders[builderIndex] = {
        ...reportBuilders[builderIndex],
        ...updateData,
        updatedAt: new Date(),
      };

      return NextResponse.json({
        success: true,
        message: 'Report builder updated successfully',
        data: reportBuilders[builderIndex],
      });
    }

    return NextResponse.json(
      { error: 'Invalid type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating export/builder:', error);
    return NextResponse.json(
      { error: 'Failed to update' },
      { status: 500 }
    );
  }
}

// DELETE /api/export - Delete export request or report builder
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'export';
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    if (type === 'export') {
      const exportIndex = exportQueue.findIndex(e => e.id === id);
      if (exportIndex === -1) {
        return NextResponse.json(
          { error: 'Export request not found' },
          { status: 404 }
        );
      }

      exportQueue.splice(exportIndex, 1);

      return NextResponse.json({
        success: true,
        message: 'Export request deleted successfully',
      });

    } else if (type === 'builder') {
      if (session.user.role !== 'admin') {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }

      const builderIndex = reportBuilders.findIndex(b => b.id === id);
      if (builderIndex === -1) {
        return NextResponse.json(
          { error: 'Report builder not found' },
          { status: 404 }
        );
      }

      reportBuilders.splice(builderIndex, 1);

      return NextResponse.json({
        success: true,
        message: 'Report builder deleted successfully',
      });
    }

    return NextResponse.json(
      { error: 'Invalid type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error deleting export/builder:', error);
    return NextResponse.json(
      { error: 'Failed to delete' },
      { status: 500 }
    );
  }
} 