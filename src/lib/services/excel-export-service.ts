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
  workbook.creator = 'Parenta Property Management';
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
 * Generate Payment History Report Excel
 */
export async function generatePaymentHistoryReportExcel(data: any): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  
  workbook.creator = 'Parenta Property Management';
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
  
  workbook.creator = 'Parenta Property Management';
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
 * Generate Expense Report Excel
 */
export async function generateExpenseReportExcel(data: any): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  
  workbook.creator = 'Parenta Property Management';
  workbook.created = new Date();
  
  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary');
  
  summarySheet.mergeCells('A1:D1');
  summarySheet.getCell('A1').value = 'Expense Report';
  summarySheet.getCell('A1').font = { size: 18, bold: true };
  summarySheet.getCell('A1').alignment = { horizontal: 'center' };
  
  summarySheet.mergeCells('A2:D2');
  summarySheet.getCell('A2').value = `Period: ${data.summary.period}`;
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
  
  // By Category Sheet
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
      item.category,
      item.amount,
      item.percentage / 100,
      item.count
    ]);
  });
  
  categorySheet.getColumn(1).width = 20;
  categorySheet.getColumn(2).width = 15;
  categorySheet.getColumn(2).numFmt = '₱#,##0.00';
  categorySheet.getColumn(3).width = 12;
  categorySheet.getColumn(3).numFmt = '0.0%';
  categorySheet.getColumn(4).width = 10;
  
  // By Month Sheet
  if (data.byMonth.length > 0) {
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
  
  // Top Expenses Sheet
  if (data.topExpenses.length > 0) {
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

