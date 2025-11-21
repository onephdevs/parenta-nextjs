/**
 * PDF Export Service
 * Generates PDF documents from report data using @react-pdf/renderer
 */

import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';

// Define styles for PDF documents
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2 solid #000',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  section: {
    marginTop: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    borderBottom: '1 solid #ccc',
    paddingBottom: 5,
  },
  table: {
    width: '100%',
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '2 solid #000',
    paddingBottom: 5,
    marginBottom: 5,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #eee',
    paddingVertical: 5,
  },
  tableCell: {
    flex: 1,
    textAlign: 'left',
  },
  tableCellRight: {
    flex: 1,
    textAlign: 'right',
  },
  summaryCard: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 3,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#999',
    borderTop: '1 solid #ccc',
    paddingTop: 10,
  },
});

/**
 * Revenue Report PDF Component
 */
const RevenueReportPDF = ({ data }: { data: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Revenue Report</Text>
        <Text style={styles.subtitle}>
          Period: {data.summary.period}
        </Text>
        <Text style={styles.subtitle}>
          Generated: {new Date().toLocaleString()}
        </Text>
      </View>

      {/* Summary Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Summary</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Revenue</Text>
          <Text style={styles.summaryValue}>
            ₱{data.summary.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Payments</Text>
          <Text style={styles.summaryValue}>{data.summary.totalPayments}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Average Payment</Text>
          <Text style={styles.summaryValue}>
            ₱{data.summary.averagePayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
        </View>
      </View>

      {/* By Month Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue by Month</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableCell}>Month</Text>
            <Text style={styles.tableCellRight}>Revenue</Text>
            <Text style={styles.tableCellRight}>Payments</Text>
          </View>
          {data.byMonth.map((item: any, index: number) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableCell}>{item.month}</Text>
              <Text style={styles.tableCellRight}>
                ₱{item.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
              <Text style={styles.tableCellRight}>{item.payments}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* By Property Section */}
      {data.byProperty.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenue by Property</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCell}>Property</Text>
              <Text style={styles.tableCellRight}>Revenue</Text>
              <Text style={styles.tableCellRight}>Payments</Text>
            </View>
            {data.byProperty.map((item: any, index: number) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCell}>{item.buildingName}</Text>
                <Text style={styles.tableCellRight}>
                  ₱{item.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
                <Text style={styles.tableCellRight}>{item.payments}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Footer */}
      <Text style={styles.footer}>Parenta Property Management System</Text>
    </Page>
  </Document>
);

/**
 * Payment History Report PDF Component
 */
const PaymentHistoryReportPDF = ({ data }: { data: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Payment History Report</Text>
        <Text style={styles.subtitle}>
          Period: {data.summary.period}
        </Text>
        {data.summary.tenantName && (
          <Text style={styles.subtitle}>
            Tenant: {data.summary.tenantName}
          </Text>
        )}
        <Text style={styles.subtitle}>
          Generated: {new Date().toLocaleString()}
        </Text>
      </View>

      {/* Summary Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Summary</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Payments</Text>
          <Text style={styles.summaryValue}>{data.summary.totalPayments}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Amount</Text>
          <Text style={styles.summaryValue}>
            ₱{data.summary.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
        </View>
      </View>

      {/* Payments Table */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Details</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, { flex: 0.8 }]}>Date</Text>
            <Text style={[styles.tableCell, { flex: 1.2 }]}>Tenant</Text>
            <Text style={styles.tableCellRight}>Amount</Text>
            <Text style={[styles.tableCell, { flex: 0.8 }]}>Method</Text>
          </View>
          {data.payments.slice(0, 50).map((payment: any, index: number) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 0.8, fontSize: 8 }]}>
                {new Date(payment.paymentDate).toLocaleDateString()}
              </Text>
              <Text style={[styles.tableCell, { flex: 1.2, fontSize: 8 }]}>
                {payment.tenantName}
              </Text>
              <Text style={[styles.tableCellRight, { fontSize: 8 }]}>
                ₱{payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
              <Text style={[styles.tableCell, { flex: 0.8, fontSize: 8 }]}>
                {payment.paymentMethod}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>Parenta Property Management System</Text>
    </Page>
  </Document>
);

/**
 * Occupancy Report PDF Component
 */
const OccupancyReportPDF = ({ data }: { data: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Occupancy Report</Text>
        <Text style={styles.subtitle}>
          Generated: {new Date().toLocaleString()}
        </Text>
      </View>

      {/* Summary Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Occupancy</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Occupancy Rate</Text>
          <Text style={styles.summaryValue}>
            {data.summary.currentOccupancyRate.toFixed(1)}%
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Occupied / Total Rooms</Text>
          <Text style={styles.summaryValue}>
            {data.summary.occupiedRooms} / {data.summary.totalRooms}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Vacant Rooms</Text>
          <Text style={styles.summaryValue}>{data.summary.vacantRooms}</Text>
        </View>
      </View>

      {/* By Building Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Occupancy by Building</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableCell}>Building</Text>
            <Text style={styles.tableCellRight}>Rate</Text>
            <Text style={styles.tableCellRight}>Occupied</Text>
            <Text style={styles.tableCellRight}>Total</Text>
          </View>
          {data.byBuilding.map((item: any, index: number) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableCell}>{item.buildingName}</Text>
              <Text style={styles.tableCellRight}>{item.occupancyRate.toFixed(1)}%</Text>
              <Text style={styles.tableCellRight}>{item.occupied}</Text>
              <Text style={styles.tableCellRight}>{item.total}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>Parenta Property Management System</Text>
    </Page>
  </Document>
);

/**
 * Expense Report PDF Component
 */
const ExpenseReportPDF = ({ data }: { data: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Expense Report</Text>
        <Text style={styles.subtitle}>
          Period: {data.summary.period}
        </Text>
        <Text style={styles.subtitle}>
          Generated: {new Date().toLocaleString()}
        </Text>
      </View>

      {/* Summary Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Summary</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Expenses</Text>
          <Text style={styles.summaryValue}>
            ₱{data.summary.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Number of Expenses</Text>
          <Text style={styles.summaryValue}>{data.summary.totalCount}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Average Expense</Text>
          <Text style={styles.summaryValue}>
            ₱{data.summary.averageExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
        </View>
      </View>

      {/* By Category Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Expenses by Category</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableCell}>Category</Text>
            <Text style={styles.tableCellRight}>Amount</Text>
            <Text style={styles.tableCellRight}>%</Text>
            <Text style={styles.tableCellRight}>Count</Text>
          </View>
          {data.byCategory.map((item: any, index: number) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableCell}>{item.category}</Text>
              <Text style={styles.tableCellRight}>
                ₱{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
              <Text style={styles.tableCellRight}>{item.percentage.toFixed(1)}%</Text>
              <Text style={styles.tableCellRight}>{item.count}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>Parenta Property Management System</Text>
    </Page>
  </Document>
);

/**
 * Generate PDF buffer from report data
 */
export async function generateRevenueReportPDF(data: any): Promise<Buffer> {
  const doc = <RevenueReportPDF data={data} />;
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();
  return Buffer.from(await blob.arrayBuffer());
}

export async function generatePaymentHistoryReportPDF(data: any): Promise<Buffer> {
  const doc = <PaymentHistoryReportPDF data={data} />;
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();
  return Buffer.from(await blob.arrayBuffer());
}

export async function generateOccupancyReportPDF(data: any): Promise<Buffer> {
  const doc = <OccupancyReportPDF data={data} />;
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();
  return Buffer.from(await blob.arrayBuffer());
}

export async function generateExpenseReportPDF(data: any): Promise<Buffer> {
  const doc = <ExpenseReportPDF data={data} />;
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();
  return Buffer.from(await blob.arrayBuffer());
}

