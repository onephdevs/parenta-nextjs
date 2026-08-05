/**
 * Excel Export Service
 * Generates Excel spreadsheets from report data using exceljs
 */

import ExcelJS from 'exceljs';

/**
 * Generate Revenue Report Excel
 */
export async function generateRevenueReportExcel(data: any): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  
  // Set metadata
  workbook.creator = 'Alfonso Property Management System';
  workbook.created = new Date();
  workbook.modified = new Date();
  
  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary');
  
  // Title
  summarySheet.mergeCells('A1:D1');
  summarySheet.getCell('A1').value = 'Revenue Report';
  summarySheet.getCell('A1').font = { size: 18, bold: true };
  summarySheet.getCell('A1').alignment = { horizontal: 'center' };
  
  // Period
  summarySheet.mergeCells('A2:D2');
  summarySheet.getCell('A2').value = `Period: ${data.summary.period}`;
  summarySheet.getCell('A2').font = { size: 12 };
  summarySheet.getCell('A2').alignment = { horizontal: 'center' };
  
  // Summary data
  summarySheet.addRow([]);
  summarySheet.addRow(['Metric', 'Value']);
  summarySheet.getRow(4).font = { bold: true };
  summarySheet.getRow(4).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  summarySheet.addRow(['Total Revenue', data.summary.totalRevenue]);
  summarySheet.addRow(['Total Payments', data.summary.totalPayments]);
  summarySheet.addRow(['Average Payment', data.summary.averagePayment]);
  
  // Format currency
  summarySheet.getCell('B5').numFmt = '₱#,##0.00';
  summarySheet.getCell('B7').numFmt = '₱#,##0.00';
  
  // Column widths
  summarySheet.getColumn(1).width = 20;
  summarySheet.getColumn(2).width = 20;
  
  // By Month Sheet
  const monthSheet = workbook.addWorksheet('By Month');
  monthSheet.addRow(['Revenue by Month']);
  monthSheet.getRow(1).font = { size: 14, bold: true };
  monthSheet.addRow([]);
  monthSheet.addRow(['Month', 'Revenue', 'Payments']);
  monthSheet.getRow(3).font = { bold: true };
  monthSheet.getRow(3).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  data.byMonth.forEach((item: any) => {
    monthSheet.addRow([item.month, item.revenue, item.payments]);
  });
  
  // Format month sheet
  monthSheet.getColumn(1).width = 15;
  monthSheet.getColumn(2).width = 15;
  monthSheet.getColumn(3).width = 15;
  monthSheet.getColumn(2).numFmt = '₱#,##0.00';
  
  // Add totals row
  const lastMonthRow = monthSheet.lastRow!.number;
  monthSheet.addRow([
    'TOTAL',
    { formula: `SUM(B4:B${lastMonthRow})` },
    { formula: `SUM(C4:C${lastMonthRow})` }
  ]);
  monthSheet.lastRow!.font = { bold: true };
  monthSheet.lastRow!.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFEB3B' }
  };
  
  // By Property Sheet
  if (data.byProperty.length > 0) {
    const propertySheet = workbook.addWorksheet('By Property');
    propertySheet.addRow(['Revenue by Property']);
    propertySheet.getRow(1).font = { size: 14, bold: true };
    propertySheet.addRow([]);
    propertySheet.addRow(['Property Name', 'Revenue', 'Payments']);
    propertySheet.getRow(3).font = { bold: true };
    propertySheet.getRow(3).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    data.byProperty.forEach((item: any) => {
      propertySheet.addRow([item.buildingName, item.revenue, item.payments]);
    });
    
    propertySheet.getColumn(1).width = 30;
    propertySheet.getColumn(2).width = 15;
    propertySheet.getColumn(3).width = 15;
    propertySheet.getColumn(2).numFmt = '₱#,##0.00';
    
    // Add totals
    const lastPropertyRow = propertySheet.lastRow!.number;
    propertySheet.addRow([
      'TOTAL',
      { formula: `SUM(B4:B${lastPropertyRow})` },
      { formula: `SUM(C4:C${lastPropertyRow})` }
    ]);
    propertySheet.lastRow!.font = { bold: true };
  }
  
  // By Payment Method Sheet
  if (data.byPaymentMethod.length > 0) {
    const methodSheet = workbook.addWorksheet('By Payment Method');
    methodSheet.addRow(['Revenue by Payment Method']);
    methodSheet.getRow(1).font = { size: 14, bold: true };
    methodSheet.addRow([]);
    methodSheet.addRow(['Payment Method', 'Revenue', 'Count']);
    methodSheet.getRow(3).font = { bold: true };
    methodSheet.getRow(3).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    data.byPaymentMethod.forEach((item: any) => {
      methodSheet.addRow([item.method, item.revenue, item.count]);
    });
    
    methodSheet.getColumn(1).width = 20;
    methodSheet.getColumn(2).width = 15;
    methodSheet.getColumn(3).width = 10;
    methodSheet.getColumn(2).numFmt = '₱#,##0.00';
  }
  
  // Generate buffer
  return await workbook.xlsx.writeBuffer() as Buffer;
}

/**
 * Generate Tenant List Report Excel
 */
export async function generateTenantListReportExcel(data: any): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  
  workbook.creator = 'Alfonso Property Management System';
  workbook.created = new Date();
  
  const sheet = workbook.addWorksheet('Tenant List');
  
  // Title
  sheet.mergeCells('A1:J1');
  sheet.getCell('A1').value = 'Tenant List Report';
  sheet.getCell('A1').font = { size: 18, bold: true };
  sheet.getCell('A1').alignment = { horizontal: 'center' };
  
  // Summary
  sheet.mergeCells('A2:J2');
  sheet.getCell('A2').value = `Total Tenants: ${data.summary.totalTenants} | Total Balance: ₱${data.summary.totalBalance.toFixed(2)} | Past Due: ₱${data.summary.totalPastDue.toFixed(2)}`;
  sheet.getCell('A2').font = { size: 12 };
  sheet.getCell('A2').alignment = { horizontal: 'center' };
  
  // Generated date
  sheet.mergeCells('A3:J3');
  sheet.getCell('A3').value = `Generated: ${new Date().toLocaleString()}`;
  sheet.getCell('A3').font = { size: 10, italic: true };
  sheet.getCell('A3').alignment = { horizontal: 'center' };
  
  // Headers
  sheet.addRow([]);
  const headerRow = sheet.addRow([
    'Tenant Name',
    'Email',
    'Phone',
    'Room #',
    'Building',
    'Balance',
    'Past Due Amount',
    'Days Past Due',
    'Lease Start',
    'Lease End',
    'Status'
  ]);
  
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  // Data rows
  data.tenants.forEach((tenant: any) => {
    sheet.addRow([
      `${tenant.firstName} ${tenant.lastName}`,
      tenant.email || '',
      tenant.phone || '',
      tenant.roomNumber || 'N/A',
      tenant.buildingName || 'N/A',
      tenant.balance,
      tenant.pastDueAmount,
      tenant.daysPastDue > 0 ? tenant.daysPastDue : 'Current',
      tenant.leaseStart ? new Date(tenant.leaseStart).toLocaleDateString() : '',
      tenant.leaseEnd ? new Date(tenant.leaseEnd).toLocaleDateString() : '',
      tenant.tenantStatus || 'active'
    ]);
  });
  
  // Format columns
  sheet.getColumn(1).width = 20; // Name
  sheet.getColumn(2).width = 25; // Email
  sheet.getColumn(3).width = 15; // Phone
  sheet.getColumn(4).width = 10; // Room #
  sheet.getColumn(5).width = 20; // Building
  sheet.getColumn(6).width = 15; // Balance
  sheet.getColumn(7).width = 15; // Past Due
  sheet.getColumn(8).width = 12; // Days Past Due
  sheet.getColumn(9).width = 12; // Lease Start
  sheet.getColumn(10).width = 12; // Lease End
  sheet.getColumn(11).width = 12; // Status
  
  // Format currency columns
  sheet.getColumn(6).numFmt = '₱#,##0.00';
  sheet.getColumn(7).numFmt = '₱#,##0.00';
  
  // Add totals row
  const lastRow = sheet.lastRow!.number;
  sheet.addRow([
    'TOTAL',
    '',
    '',
    '',
    '',
    { formula: `SUM(F6:F${lastRow})` },
    { formula: `SUM(G6:G${lastRow})` },
    '',
    '',
    '',
    ''
  ]);
  
  const totalRow = sheet.lastRow!;
  totalRow.font = { bold: true };
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFEB3B' }
  };
  
  // Generate buffer
  return await workbook.xlsx.writeBuffer() as Buffer;
}

/**
 * Generate Payment History Report Excel
 */
export async function generatePaymentHistoryReportExcel(data: any): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  
  workbook.creator = 'Alfonso Property Management System';
  workbook.created = new Date();
  
  const sheet = workbook.addWorksheet('Payment History');
  
  // Title
  sheet.mergeCells('A1:G1');
  sheet.getCell('A1').value = 'Payment History Report';
  sheet.getCell('A1').font = { size: 18, bold: true };
  sheet.getCell('A1').alignment = { horizontal: 'center' };
  
  // Period
  sheet.mergeCells('A2:G2');
  sheet.getCell('A2').value = `Period: ${data.summary.period}`;
  sheet.getCell('A2').font = { size: 12 };
  sheet.getCell('A2').alignment = { horizontal: 'center' };
  
  // Tenant name if specific tenant
  if (data.summary.tenantName) {
    sheet.mergeCells('A3:G3');
    sheet.getCell('A3').value = `Tenant: ${data.summary.tenantName}`;
    sheet.getCell('A3').font = { size: 12 };
    sheet.getCell('A3').alignment = { horizontal: 'center' };
  }
  
  // Summary
  const summaryRow = data.summary.tenantName ? 5 : 4;
  sheet.addRow([]);
  sheet.addRow(['Total Payments:', data.summary.totalPayments, '', 'Total Amount:', data.summary.totalAmount]);
  sheet.getRow(summaryRow + 1).font = { bold: true };
  sheet.getCell(`E${summaryRow + 1}`).numFmt = '₱#,##0.00';
  
  // Headers
  sheet.addRow([]);
  sheet.addRow(['Date', 'Tenant', 'Amount', 'Method', 'Type', 'Status', 'Reference']);
  const headerRow = sheet.lastRow!;
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  // Data rows
  data.payments.forEach((payment: any) => {
    sheet.addRow([
      new Date(payment.paymentDate),
      payment.tenantName,
      payment.amount,
      payment.paymentMethod,
      payment.paymentType,
      payment.status,
      payment.referenceNumber || ''
    ]);
  });
  
  // Format columns
  sheet.getColumn(1).width = 12;
  sheet.getColumn(1).numFmt = 'yyyy-mm-dd';
  sheet.getColumn(2).width = 25;
  sheet.getColumn(3).width = 15;
  sheet.getColumn(3).numFmt = '₱#,##0.00';
  sheet.getColumn(4).width = 15;
  sheet.getColumn(5).width = 12;
  sheet.getColumn(6).width = 12;
  sheet.getColumn(7).width = 20;
  
  return await workbook.xlsx.writeBuffer() as Buffer;
}

/**
 * Generate Occupancy Report Excel
 */
export async function generateOccupancyReportExcel(data: any): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  
  workbook.creator = 'Alfonso Property Management System';
  workbook.created = new Date();
  
  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary');
  
  summarySheet.mergeCells('A1:D1');
  summarySheet.getCell('A1').value = 'Occupancy Report';
  summarySheet.getCell('A1').font = { size: 18, bold: true };
  summarySheet.getCell('A1').alignment = { horizontal: 'center' };
  
  summarySheet.addRow([]);
  summarySheet.addRow(['Metric', 'Value']);
  summarySheet.getRow(3).font = { bold: true };
  summarySheet.getRow(3).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  summarySheet.addRow(['Current Occupancy Rate', `${data.summary.currentOccupancyRate.toFixed(1)}%`]);
  summarySheet.addRow(['Occupied Rooms', data.summary.occupiedRooms]);
  summarySheet.addRow(['Total Rooms', data.summary.totalRooms]);
  summarySheet.addRow(['Vacant Rooms', data.summary.vacantRooms]);
  
  summarySheet.getColumn(1).width = 25;
  summarySheet.getColumn(2).width = 15;
  
  // By Building Sheet
  const buildingSheet = workbook.addWorksheet('By Building');
  
  buildingSheet.addRow(['Occupancy by Building']);
  buildingSheet.getRow(1).font = { size: 14, bold: true };
  buildingSheet.addRow([]);
  buildingSheet.addRow(['Building Name', 'Occupancy Rate', 'Occupied', 'Total']);
  buildingSheet.getRow(3).font = { bold: true };
  buildingSheet.getRow(3).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  data.byBuilding.forEach((item: any) => {
    buildingSheet.addRow([
      item.buildingName,
      item.occupancyRate / 100,
      item.occupied,
      item.total
    ]);
  });
  
  buildingSheet.getColumn(1).width = 30;
  buildingSheet.getColumn(2).width = 15;
  buildingSheet.getColumn(2).numFmt = '0.0%';
  buildingSheet.getColumn(3).width = 12;
  buildingSheet.getColumn(4).width = 12;
  
  // Move-in/out Sheet
  if (data.moveInOut.length > 0) {
    const moveSheet = workbook.addWorksheet('Move-in Move-out');
    
    moveSheet.addRow(['Move-in and Move-out Activity']);
    moveSheet.getRow(1).font = { size: 14, bold: true };
    moveSheet.addRow([]);
    moveSheet.addRow(['Month', 'Move-ins', 'Move-outs', 'Net Change']);
    moveSheet.getRow(3).font = { bold: true };
    moveSheet.getRow(3).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    data.moveInOut.forEach((item: any) => {
      moveSheet.addRow([
        item.month,
        item.moveIns,
        item.moveOuts,
        item.netChange
      ]);
    });
    
    moveSheet.getColumn(1).width = 15;
    moveSheet.getColumn(2).width = 12;
    moveSheet.getColumn(3).width = 12;
    moveSheet.getColumn(4).width = 12;
  }
  
  return await workbook.xlsx.writeBuffer() as Buffer;
}

/**
 * Generate Expense Report Excel (with period support)
 */
export async function generateExpenseReportExcel(data: any): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  
  workbook.creator = 'Alfonso Property Management System';
  workbook.created = new Date();
  
  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary');
  
  summarySheet.mergeCells('A1:D1');
  summarySheet.getCell('A1').value = 'Expense Report';
  summarySheet.getCell('A1').font = { size: 18, bold: true };
  summarySheet.getCell('A1').alignment = { horizontal: 'center' };
  
  summarySheet.mergeCells('A2:D2');
  summarySheet.getCell('A2').value = `Period: ${data.summary.period} (${data.summary.periodType})`;
  summarySheet.getCell('A2').font = { size: 12 };
  summarySheet.getCell('A2').alignment = { horizontal: 'center' };
  
  summarySheet.addRow([]);
  summarySheet.addRow(['Metric', 'Value']);
  summarySheet.getRow(4).font = { bold: true };
  summarySheet.getRow(4).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  summarySheet.addRow(['Total Expenses', data.summary.totalExpenses]);
  summarySheet.addRow(['Number of Expenses', data.summary.totalCount]);
  summarySheet.addRow(['Average Expense', data.summary.averageExpense]);
  
  summarySheet.getColumn(1).width = 20;
  summarySheet.getColumn(2).width = 20;
  summarySheet.getCell('B5').numFmt = '₱#,##0.00';
  summarySheet.getCell('B7').numFmt = '₱#,##0.00';
  
  // By Period Sheet (if available)
  if (data.byPeriod && data.byPeriod.length > 0) {
    const periodSheet = workbook.addWorksheet('By Period');
    
    periodSheet.addRow(['Expenses by Period']);
    periodSheet.getRow(1).font = { size: 14, bold: true };
    periodSheet.addRow([]);
    periodSheet.addRow(['Period', 'Amount', 'Count']);
    periodSheet.getRow(3).font = { bold: true };
    periodSheet.getRow(3).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    data.byPeriod.forEach((item: any) => {
      periodSheet.addRow([item.period, item.amount, item.count]);
    });
    
    periodSheet.getColumn(1).width = 20;
    periodSheet.getColumn(2).width = 15;
    periodSheet.getColumn(2).numFmt = '₱#,##0.00';
    periodSheet.getColumn(3).width = 10;
    
    // Add totals
    const lastRow = periodSheet.lastRow!.number;
    periodSheet.addRow([
      'TOTAL',
      { formula: `SUM(B4:B${lastRow})` },
      { formula: `SUM(C4:C${lastRow})` }
    ]);
    periodSheet.lastRow!.font = { bold: true };
    periodSheet.lastRow!.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFEB3B' }
    };
  }
  
  // By Category Sheet
  if (data.byCategory && data.byCategory.length > 0) {
    const categorySheet = workbook.addWorksheet('By Category');
    
    categorySheet.addRow(['Expenses by Category']);
    categorySheet.getRow(1).font = { size: 14, bold: true };
    categorySheet.addRow([]);
    categorySheet.addRow(['Category', 'Amount', 'Percentage', 'Count']);
    categorySheet.getRow(3).font = { bold: true };
    categorySheet.getRow(3).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    data.byCategory.forEach((item: any) => {
      categorySheet.addRow([
        item.category.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        item.amount,
        item.percentage / 100,
        item.count
      ]);
    });
    
    categorySheet.getColumn(1).width = 25;
    categorySheet.getColumn(2).width = 15;
    categorySheet.getColumn(2).numFmt = '₱#,##0.00';
    categorySheet.getColumn(3).width = 12;
    categorySheet.getColumn(3).numFmt = '0.0%';
    categorySheet.getColumn(4).width = 10;
  }
  
  // By Building Sheet
  if (data.byBuilding && data.byBuilding.length > 0) {
    const buildingSheet = workbook.addWorksheet('By Building');
    
    buildingSheet.addRow(['Expenses by Building']);
    buildingSheet.getRow(1).font = { size: 14, bold: true };
    buildingSheet.addRow([]);
    buildingSheet.addRow(['Building', 'Amount', 'Count']);
    buildingSheet.getRow(3).font = { bold: true };
    buildingSheet.getRow(3).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    data.byBuilding.forEach((item: any) => {
      buildingSheet.addRow([item.buildingName, item.amount, item.count]);
    });
    
    buildingSheet.getColumn(1).width = 30;
    buildingSheet.getColumn(2).width = 15;
    buildingSheet.getColumn(2).numFmt = '₱#,##0.00';
    buildingSheet.getColumn(3).width = 10;
  }
  
  // Expense Details Sheet
  if (data.details && data.details.length > 0) {
    const detailsSheet = workbook.addWorksheet('Expense Details');
    
    detailsSheet.addRow(['Expense Details']);
    detailsSheet.getRow(1).font = { size: 14, bold: true };
    detailsSheet.addRow([]);
    detailsSheet.addRow(['Date', 'Description', 'Category', 'Building', 'Vendor', 'Amount', 'Status']);
    detailsSheet.getRow(3).font = { bold: true };
    detailsSheet.getRow(3).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    data.details.forEach((item: any) => {
      detailsSheet.addRow([
        new Date(item.expenseDate),
        item.description,
        item.category.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        item.buildingName || '-',
        item.vendorName || '-',
        item.amount,
        item.expenseStatus
      ]);
    });
    
    detailsSheet.getColumn(1).width = 12;
    detailsSheet.getColumn(1).numFmt = 'yyyy-mm-dd';
    detailsSheet.getColumn(2).width = 40;
    detailsSheet.getColumn(3).width = 20;
    detailsSheet.getColumn(4).width = 25;
    detailsSheet.getColumn(5).width = 25;
    detailsSheet.getColumn(6).width = 15;
    detailsSheet.getColumn(6).numFmt = '₱#,##0.00';
    detailsSheet.getColumn(7).width = 12;
  }
  
  // Legacy support: By Month Sheet (if available)
  if (data.byMonth && data.byMonth.length > 0) {
    const monthSheet = workbook.addWorksheet('By Month');
    
    monthSheet.addRow(['Expenses by Month']);
    monthSheet.getRow(1).font = { size: 14, bold: true };
    monthSheet.addRow([]);
    monthSheet.addRow(['Month', 'Amount', 'Count']);
    monthSheet.getRow(3).font = { bold: true };
    monthSheet.getRow(3).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    data.byMonth.forEach((item: any) => {
      monthSheet.addRow([item.month, item.amount, item.count]);
    });
    
    monthSheet.getColumn(1).width = 15;
    monthSheet.getColumn(2).width = 15;
    monthSheet.getColumn(2).numFmt = '₱#,##0.00';
    monthSheet.getColumn(3).width = 10;
  }
  
  // Legacy support: Top Expenses Sheet (if available)
  if (data.topExpenses && data.topExpenses.length > 0) {
    const topSheet = workbook.addWorksheet('Top Expenses');
    
    topSheet.addRow(['Top Expenses']);
    topSheet.getRow(1).font = { size: 14, bold: true };
    topSheet.addRow([]);
    topSheet.addRow(['Description', 'Amount', 'Category', 'Date']);
    topSheet.getRow(3).font = { bold: true };
    topSheet.getRow(3).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    data.topExpenses.forEach((item: any) => {
      topSheet.addRow([
        item.description,
        item.amount,
        item.category,
        new Date(item.date)
      ]);
    });
    
    topSheet.getColumn(1).width = 40;
    topSheet.getColumn(2).width = 15;
    topSheet.getColumn(2).numFmt = '₱#,##0.00';
    topSheet.getColumn(3).width = 20;
    topSheet.getColumn(4).width = 12;
    topSheet.getColumn(4).numFmt = 'yyyy-mm-dd';
  }
  
  return await workbook.xlsx.writeBuffer() as Buffer;
}

/**
 * Combined bills + expenses report (summary or detail)
 */
export async function generateBillsExpensesReportExcel(data: any): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Parenta';
  workbook.created = new Date();

  const isSummary = data.view !== 'detail';
  const sheet = workbook.addWorksheet(isSummary ? 'Summary' : 'Detail');

  sheet.mergeCells('A1:D1');
  sheet.getCell('A1').value = 'Expense & Utility Report';
  sheet.getCell('A1').font = { size: 16, bold: true };

  sheet.mergeCells('A2:D2');
  sheet.getCell('A2').value = `${data.periodLabel || ''} — ${
    isSummary ? 'Summary by category' : 'Detail list'
  }${data.buildingName ? ` · ${data.buildingName}` : ' · All buildings'}`;

  sheet.addRow([]);

  if (isSummary) {
    sheet.addRow(['Category', 'Amount', '% of total', 'Count']);
    sheet.getRow(4).font = { bold: true };
    (data.summary || []).forEach((item: any) => {
      sheet.addRow([item.label, item.amount, item.percentage / 100, item.count]);
    });
    sheet.addRow(['Total', data.totalAmount || 0, '', '']);
    sheet.lastRow!.font = { bold: true };
    sheet.getColumn(2).numFmt = '₱#,##0.00';
    sheet.getColumn(3).numFmt = '0%';
    sheet.getColumn(1).width = 28;
    sheet.getColumn(2).width = 16;
    sheet.getColumn(3).width = 12;
    sheet.getColumn(4).width = 10;
  } else {
    sheet.addRow(['Date', 'Category', 'Description', 'Location', 'Vendor', 'Amount']);
    sheet.getRow(4).font = { bold: true };
    (data.details || []).forEach((item: any) => {
      sheet.addRow([
        item.date,
        item.categoryLabel,
        item.description,
        item.locationLabel,
        item.vendor || '',
        item.amount,
      ]);
    });
    sheet.addRow(['', '', '', '', 'Total', data.totalAmount || 0]);
    sheet.lastRow!.font = { bold: true };
    sheet.getColumn(6).numFmt = '₱#,##0.00';
    sheet.getColumn(1).width = 12;
    sheet.getColumn(2).width = 18;
    sheet.getColumn(3).width = 36;
    sheet.getColumn(4).width = 28;
    sheet.getColumn(5).width = 20;
    sheet.getColumn(6).width = 14;
  }

  return (await workbook.xlsx.writeBuffer()) as Buffer;
}

/**
 * Generate Collected Amount Report Excel
 */
export async function generateCollectedAmountReportExcel(data: any): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  
  workbook.creator = 'Alfonso Property Management System';
  workbook.created = new Date();
  
  const sheet = workbook.addWorksheet('Collected Amount');
  
  // Title
  sheet.mergeCells('A1:E1');
  sheet.getCell('A1').value = 'Collected Amount Report';
  sheet.getCell('A1').font = { size: 18, bold: true };
  sheet.getCell('A1').alignment = { horizontal: 'center' };
  
  // Period
  sheet.mergeCells('A2:E2');
  sheet.getCell('A2').value = `Period: ${data.summary.period}`;
  sheet.getCell('A2').font = { size: 12 };
  sheet.getCell('A2').alignment = { horizontal: 'center' };
  
  // Summary
  sheet.addRow([]);
  sheet.addRow(['Metric', 'Value']);
  sheet.getRow(4).font = { bold: true };
  sheet.getRow(4).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  sheet.addRow(['Total Collected', data.summary.totalCollected]);
  sheet.addRow(['Total Payments', data.summary.totalPayments]);
  sheet.addRow(['Average Payment', data.summary.averagePayment]);
  if (data.summary.growth !== undefined) {
    sheet.addRow(['Growth vs Previous Period', `${data.summary.growth.toFixed(2)}%`]);
  }
  
  // Format currency
  sheet.getCell('B5').numFmt = '₱#,##0.00';
  sheet.getCell('B7').numFmt = '₱#,##0.00';
  
  // By Period Sheet
  if (data.byPeriod && data.byPeriod.length > 0) {
    const periodSheet = workbook.addWorksheet('By Period');
    periodSheet.addRow(['Collected Amount by Period']);
    periodSheet.getRow(1).font = { size: 14, bold: true };
    periodSheet.addRow([]);
    periodSheet.addRow(['Period', 'Amount', 'Payments']);
    periodSheet.getRow(3).font = { bold: true };
    periodSheet.getRow(3).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    data.byPeriod.forEach((item: any) => {
      periodSheet.addRow([item.period, item.amount, item.count]);
    });
    
    periodSheet.getColumn(1).width = 20;
    periodSheet.getColumn(2).width = 15;
    periodSheet.getColumn(2).numFmt = '₱#,##0.00';
    periodSheet.getColumn(3).width = 12;
  }
  
  // By Payment Method Sheet
  if (data.byPaymentMethod && data.byPaymentMethod.length > 0) {
    const methodSheet = workbook.addWorksheet('By Payment Method');
    methodSheet.addRow(['Collected Amount by Payment Method']);
    methodSheet.getRow(1).font = { size: 14, bold: true };
    methodSheet.addRow([]);
    methodSheet.addRow(['Payment Method', 'Amount', 'Count', 'Percentage']);
    methodSheet.getRow(3).font = { bold: true };
    methodSheet.getRow(3).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    data.byPaymentMethod.forEach((item: any) => {
      methodSheet.addRow([item.method, item.amount, item.count, `${item.percentage.toFixed(2)}%`]);
    });
    
    methodSheet.getColumn(1).width = 20;
    methodSheet.getColumn(2).width = 15;
    methodSheet.getColumn(2).numFmt = '₱#,##0.00';
    methodSheet.getColumn(3).width = 12;
    methodSheet.getColumn(4).width = 12;
  }
  
  // Timeline Sheet
  if (data.timeline && data.timeline.length > 0) {
    const timelineSheet = workbook.addWorksheet('Timeline');
    timelineSheet.addRow(['Daily Collection Timeline']);
    timelineSheet.getRow(1).font = { size: 14, bold: true };
    timelineSheet.addRow([]);
    timelineSheet.addRow(['Date', 'Amount', 'Payments']);
    timelineSheet.getRow(3).font = { bold: true };
    timelineSheet.getRow(3).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    data.timeline.forEach((item: any) => {
      timelineSheet.addRow([item.date, item.amount, item.count]);
    });
    
    timelineSheet.getColumn(1).width = 15;
    timelineSheet.getColumn(2).width = 15;
    timelineSheet.getColumn(2).numFmt = '₱#,##0.00';
    timelineSheet.getColumn(3).width = 12;
  }
  
  // Format summary sheet
  sheet.getColumn(1).width = 25;
  sheet.getColumn(2).width = 20;
  
  // Generate buffer
  return await workbook.xlsx.writeBuffer() as Buffer;
}


/**
 * Generate Deposit Report Excel
 */
export async function generateDepositReportExcel(data: any): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  
  workbook.creator = 'Alfonso Property Management System';
  workbook.created = new Date();
  
  const sheet = workbook.addWorksheet('Deposit Report');
  
  sheet.mergeCells('A1:D1');
  sheet.getCell('A1').value = 'Deposit Received Report';
  sheet.getCell('A1').font = { size: 18, bold: true };
  sheet.getCell('A1').alignment = { horizontal: 'center' };
  
  sheet.mergeCells('A2:D2');
  sheet.getCell('A2').value = `Period: ${data.summary.period}`;
  sheet.getCell('A2').font = { size: 12 };
  sheet.getCell('A2').alignment = { horizontal: 'center' };
  
  sheet.addRow([]);
  sheet.addRow(['Metric', 'Value']);
  sheet.getRow(4).font = { bold: true };
  sheet.getRow(4).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  sheet.addRow(['Total Deposits Received', data.summary.totalDepositsReceived]);
  sheet.addRow(['Total Refunds Issued', data.summary.totalRefundsIssued]);
  sheet.addRow(['Net Deposit Balance', data.summary.netDepositBalance]);
  sheet.addRow(['Total Transactions', data.summary.totalTransactions]);
  sheet.addRow(['Tenant Count', data.summary.tenantCount]);
  
  sheet.getCell('B5').numFmt = '₱#,##0.00';
  sheet.getCell('B6').numFmt = '₱#,##0.00';
  sheet.getCell('B7').numFmt = '₱#,##0.00';
  
  if (data.byPeriod && data.byPeriod.length > 0) {
    const periodSheet = workbook.addWorksheet('By Period');
    periodSheet.addRow(['Deposits by Period']);
    periodSheet.getRow(1).font = { size: 14, bold: true };
    periodSheet.addRow([]);
    periodSheet.addRow(['Period', 'Deposits Received', 'Refunds Issued', 'Net Amount', 'Tenants']);
    periodSheet.getRow(3).font = { bold: true };
    periodSheet.getRow(3).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    data.byPeriod.forEach((item: any) => {
      periodSheet.addRow([item.period, item.depositsReceived, item.refundsIssued, item.netAmount, item.tenantCount]);
    });
    
    periodSheet.getColumn(1).width = 20;
    periodSheet.getColumn(2).width = 18;
    periodSheet.getColumn(2).numFmt = '₱#,##0.00';
    periodSheet.getColumn(3).width = 18;
    periodSheet.getColumn(3).numFmt = '₱#,##0.00';
    periodSheet.getColumn(4).width = 18;
    periodSheet.getColumn(4).numFmt = '₱#,##0.00';
    periodSheet.getColumn(5).width = 12;
  }
  
  sheet.getColumn(1).width = 25;
  sheet.getColumn(2).width = 20;
  
  return await workbook.xlsx.writeBuffer() as Buffer;
}

/**
 * Generate Vacant Rooms Report Excel
 */
export async function generateVacantRoomsReportExcel(data: any): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  
  workbook.creator = 'Alfonso Property Management System';
  workbook.created = new Date();
  
  const sheet = workbook.addWorksheet('Vacant Rooms');
  
  sheet.mergeCells('A1:J1');
  sheet.getCell('A1').value = 'Vacant Rooms Report';
  sheet.getCell('A1').font = { size: 18, bold: true };
  sheet.getCell('A1').alignment = { horizontal: 'center' };
  
  sheet.mergeCells('A2:J2');
  sheet.getCell('A2').value = `Total Vacant: ${data.summary.totalVacant} | Vacancy Rate: ${data.summary.vacancyRate.toFixed(1)}% | Potential Revenue: ₱${data.summary.totalPotentialRevenue.toFixed(2)}`;
  sheet.getCell('A2').font = { size: 12 };
  sheet.getCell('A2').alignment = { horizontal: 'center' };
  
  sheet.mergeCells('A3:J3');
  sheet.getCell('A3').value = `Generated: ${new Date().toLocaleString()}`;
  sheet.getCell('A3').font = { size: 10, italic: true };
  sheet.getCell('A3').alignment = { horizontal: 'center' };
  
  sheet.addRow([]);
  const headerRow = sheet.addRow([
    'Room #',
    'Building',
    'Floor',
    'Type',
    'Monthly Rate',
    'Days Vacant',
    'Last Tenant',
    'Status'
  ]);
  
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  data.rooms.forEach((room: any) => {
    sheet.addRow([
      room.roomNumber,
      room.buildingName,
      room.floorNumber || 'N/A',
      room.roomType || 'N/A',
      room.monthlyRate,
      room.daysVacant || 'N/A',
      room.lastTenantName || 'N/A',
      room.maintenanceStatus || 'vacant'
    ]);
  });
  
  sheet.getColumn(1).width = 12;
  sheet.getColumn(2).width = 20;
  sheet.getColumn(3).width = 10;
  sheet.getColumn(4).width = 12;
  sheet.getColumn(5).width = 15;
  sheet.getColumn(6).width = 12;
  sheet.getColumn(7).width = 20;
  sheet.getColumn(8).width = 12;
  
  sheet.getColumn(5).numFmt = '₱#,##0.00';
  
  const lastRow = sheet.lastRow!.number;
  sheet.addRow([
    'TOTAL',
    '',
    '',
    '',
    { formula: `SUM(E6:E${lastRow})` },
    '',
    '',
    ''
  ]);
  
  const totalRow = sheet.lastRow!;
  totalRow.font = { bold: true };
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFEB3B' }
  };
  
  return await workbook.xlsx.writeBuffer() as Buffer;
}

/**
 * Generate Financial Report Excel (summary, revenue by category, expenses, trends, outstanding)
 */
export async function generateFinancialReportExcel(data: {
  financialReport: any;
  revenueByCategory: { category: string; amount: number; count: number }[];
  expenseByCategory: { category: string; amount: number; count: number }[];
  monthlyTrends: { month: string; revenue: number; expenses: number; profit: number }[];
  outstandingBalances: { tenantName: string; totalAmount: number; overdueAmount: number; daysPastDue: number }[];
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const { financialReport: r, revenueByCategory, expenseByCategory, monthlyTrends, outstandingBalances } = data;
  const periodStart = r.period?.start ? new Date(r.period.start).toLocaleDateString('en-US') : '';
  const periodEnd = r.period?.end ? new Date(r.period.end).toLocaleDateString('en-US') : '';

  workbook.creator = 'Alfonso Property Management System';
  workbook.created = new Date();

  // Summary sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.mergeCells('A1:D1');
  summarySheet.getCell('A1').value = 'Financial Report';
  summarySheet.getCell('A1').font = { size: 18, bold: true };
  summarySheet.mergeCells('A2:D2');
  summarySheet.getCell('A2').value = `Period: ${periodStart} - ${periodEnd}`;
  summarySheet.getCell('A2').font = { size: 12 };
  summarySheet.addRow([]);
  summarySheet.addRow(['Metric', 'Value']);
  summarySheet.getRow(4).font = { bold: true };
  summarySheet.getRow(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  summarySheet.addRow(['Total Revenue', r.revenue?.totalRevenue ?? 0]);
  summarySheet.addRow(['Total Expenses', r.expenses?.totalExpenses ?? 0]);
  summarySheet.addRow(['Net Profit', r.profitLoss?.netProfit ?? 0]);
  summarySheet.addRow(['Profit Margin %', r.profitLoss?.profitMargin ?? 0]);
  summarySheet.addRow(['Total Outstanding', r.outstandingBalances?.totalOutstanding ?? 0]);
  summarySheet.addRow(['Overdue Outstanding', r.outstandingBalances?.overdueOutstanding ?? 0]);
  summarySheet.getColumn(1).width = 22;
  summarySheet.getColumn(2).width = 18;
  [5, 6, 7, 8, 9, 10].forEach(row => {
    summarySheet.getCell(`B${row}`).numFmt = '₱#,##0.00';
  });
  summarySheet.getCell('B8').numFmt = '0.0%';

  // Revenue by category
  const revSheet = workbook.addWorksheet('Revenue by Category');
  revSheet.addRow(['Revenue by Category']).font = { size: 14, bold: true };
  revSheet.addRow([]);
  revSheet.addRow(['Category', 'Amount', 'Transactions']);
  revSheet.getRow(3).font = { bold: true };
  revSheet.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  (revenueByCategory || []).forEach((item: any) => {
    revSheet.addRow([item.category, item.amount, item.count]);
  });
  revSheet.getColumn(1).width = 20;
  revSheet.getColumn(2).width = 16;
  revSheet.getColumn(2).numFmt = '₱#,##0.00';

  // Expenses by category
  const expSheet = workbook.addWorksheet('Expenses by Category');
  expSheet.addRow(['Expenses by Category']).font = { size: 14, bold: true };
  expSheet.addRow([]);
  expSheet.addRow(['Category', 'Amount', 'Count']);
  expSheet.getRow(3).font = { bold: true };
  expSheet.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  (expenseByCategory || []).forEach((item: any) => {
    expSheet.addRow([item.category, item.amount, item.count]);
  });
  expSheet.getColumn(1).width = 20;
  expSheet.getColumn(2).width = 16;
  expSheet.getColumn(2).numFmt = '₱#,##0.00';

  // Monthly trends
  const trendSheet = workbook.addWorksheet('Monthly Trends');
  trendSheet.addRow(['Monthly Financial Trends']).font = { size: 14, bold: true };
  trendSheet.addRow([]);
  trendSheet.addRow(['Month', 'Revenue', 'Expenses', 'Profit']);
  trendSheet.getRow(3).font = { bold: true };
  trendSheet.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  (monthlyTrends || []).forEach((t: any) => {
    trendSheet.addRow([t.month, t.revenue, t.expenses, t.profit]);
  });
  trendSheet.getColumn(1).width = 12;
  trendSheet.getColumn(2).width = 16;
  trendSheet.getColumn(3).width = 16;
  trendSheet.getColumn(4).width = 16;
  trendSheet.getColumn(2).numFmt = '₱#,##0.00';
  trendSheet.getColumn(3).numFmt = '₱#,##0.00';
  trendSheet.getColumn(4).numFmt = '₱#,##0.00';

  // Outstanding balances
  const outSheet = workbook.addWorksheet('Outstanding Balances');
  outSheet.addRow(['Outstanding Balances by Tenant']).font = { size: 14, bold: true };
  outSheet.addRow([]);
  outSheet.addRow(['Tenant', 'Total Outstanding', 'Overdue Amount', 'Days Past Due']);
  outSheet.getRow(3).font = { bold: true };
  outSheet.getRow(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  (outstandingBalances || []).forEach((b: any) => {
    outSheet.addRow([b.tenantName, b.totalAmount, b.overdueAmount, b.daysPastDue]);
  });
  outSheet.getColumn(1).width = 28;
  outSheet.getColumn(2).width = 18;
  outSheet.getColumn(3).width = 18;
  outSheet.getColumn(2).numFmt = '₱#,##0.00';
  outSheet.getColumn(3).numFmt = '₱#,##0.00';

  return await workbook.xlsx.writeBuffer() as Buffer;
}
