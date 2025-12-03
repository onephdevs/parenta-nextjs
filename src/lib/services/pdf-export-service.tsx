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
 * Expense Report PDF Component (with period support)
 */
const ExpenseReportPDF = ({ data }: { data: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Expense Report</Text>
        <Text style={styles.subtitle}>
          Period: {data.summary.period} ({data.summary.periodType || 'monthly'})
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

      {/* By Period Section */}
      {data.byPeriod && data.byPeriod.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expenses by Period</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCell}>Period</Text>
              <Text style={styles.tableCellRight}>Amount</Text>
              <Text style={styles.tableCellRight}>Count</Text>
            </View>
            {data.byPeriod.map((item: any, index: number) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCell}>{item.period}</Text>
                <Text style={styles.tableCellRight}>
                  ₱{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
                <Text style={styles.tableCellRight}>{item.count}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* By Category Section */}
      {data.byCategory && data.byCategory.length > 0 && (
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
                <Text style={styles.tableCell}>
                  {item.category.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </Text>
                <Text style={styles.tableCellRight}>
                  ₱{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
                <Text style={styles.tableCellRight}>{item.percentage.toFixed(1)}%</Text>
                <Text style={styles.tableCellRight}>{item.count}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* By Building Section */}
      {data.byBuilding && data.byBuilding.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expenses by Building</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCell}>Building</Text>
              <Text style={styles.tableCellRight}>Amount</Text>
              <Text style={styles.tableCellRight}>Count</Text>
            </View>
            {data.byBuilding.map((item: any, index: number) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCell}>{item.buildingName}</Text>
                <Text style={styles.tableCellRight}>
                  ₱{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
                <Text style={styles.tableCellRight}>{item.count}</Text>
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

/**
 * Tenant List Report PDF Component
 */
const TenantListReportPDF = ({ data }: { data: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Tenant List Report</Text>
        <Text style={styles.subtitle}>
          Total Tenants: {data.summary.totalTenants}
        </Text>
        <Text style={styles.subtitle}>
          Total Balance: ₱{data.summary.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </Text>
        <Text style={styles.subtitle}>
          Past Due: ₱{data.summary.totalPastDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </Text>
        <Text style={styles.subtitle}>
          Generated: {new Date().toLocaleString()}
        </Text>
      </View>

      {/* Summary Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Summary</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Tenants</Text>
          <Text style={styles.summaryValue}>{data.summary.totalTenants}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Tenants with Balance</Text>
          <Text style={styles.summaryValue}>{data.summary.tenantsWithBalance}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Tenants Past Due</Text>
          <Text style={styles.summaryValue}>{data.summary.tenantsPastDue}</Text>
        </View>
      </View>

      {/* Tenants Table */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tenant Details</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, { flex: 1.5 }]}>Tenant</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>Room</Text>
            <Text style={styles.tableCellRight}>Balance</Text>
            <Text style={styles.tableCellRight}>Past Due</Text>
            <Text style={[styles.tableCell, { flex: 0.8 }]}>Status</Text>
          </View>
          {data.tenants.map((tenant: any, index: number) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1.5 }]}>
                {tenant.firstName} {tenant.lastName}
              </Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>
                {tenant.roomNumber || 'N/A'}
              </Text>
              <Text style={styles.tableCellRight}>
                ₱{tenant.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
              <Text style={styles.tableCellRight}>
                ₱{tenant.pastDueAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
              <Text style={[styles.tableCell, { flex: 0.8 }]}>
                {tenant.daysPastDue > 0 ? `${tenant.daysPastDue}d` : 'Current'}
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

export async function generateTenantListReportPDF(data: any): Promise<Buffer> {
  const doc = <TenantListReportPDF data={data} />;
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();
  return Buffer.from(await blob.arrayBuffer());
}

/**
 * Collected Amount Report PDF Component
 */
const CollectedAmountReportPDF = ({ data }: { data: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Collected Amount Report</Text>
        <Text style={styles.subtitle}>
          Period: {data.summary.period}
        </Text>
        {data.summary.growth !== undefined && (
          <Text style={styles.subtitle}>
            Growth: {data.summary.growth >= 0 ? '+' : ''}{data.summary.growth.toFixed(2)}%
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
          <Text style={styles.summaryLabel}>Total Collected</Text>
          <Text style={styles.summaryValue}>
            ₱{data.summary.totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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

      {/* By Period Section */}
      {data.byPeriod && data.byPeriod.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Collected by Period</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCell}>Period</Text>
              <Text style={styles.tableCellRight}>Amount</Text>
              <Text style={styles.tableCellRight}>Payments</Text>
            </View>
            {data.byPeriod.map((item: any, index: number) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCell}>{item.period}</Text>
                <Text style={styles.tableCellRight}>
                  ₱{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
                <Text style={styles.tableCellRight}>{item.count}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* By Payment Method Section */}
      {data.byPaymentMethod && data.byPaymentMethod.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By Payment Method</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCell}>Method</Text>
              <Text style={styles.tableCellRight}>Amount</Text>
              <Text style={styles.tableCellRight}>%</Text>
            </View>
            {data.byPaymentMethod.map((item: any, index: number) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCell}>{item.method}</Text>
                <Text style={styles.tableCellRight}>
                  ₱{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
                <Text style={styles.tableCellRight}>{item.percentage.toFixed(1)}%</Text>
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

export async function generateCollectedAmountReportPDF(data: any): Promise<Buffer> {
  const doc = <CollectedAmountReportPDF data={data} />;
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();
  return Buffer.from(await blob.arrayBuffer());
}

/**
 * Deposit Report PDF Component
 */
const DepositReportPDF = ({ data }: { data: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Deposit Received Report</Text>
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
          <Text style={styles.summaryLabel}>Total Deposits Received</Text>
          <Text style={styles.summaryValue}>
            ₱{data.summary.totalDepositsReceived.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Refunds Issued</Text>
          <Text style={styles.summaryValue}>
            ₱{data.summary.totalRefundsIssued.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Net Deposit Balance</Text>
          <Text style={styles.summaryValue}>
            ₱{data.summary.netDepositBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
        </View>
      </View>

      {/* By Period Section */}
      {data.byPeriod && data.byPeriod.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deposits by Period</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCell}>Period</Text>
              <Text style={styles.tableCellRight}>Deposits</Text>
              <Text style={styles.tableCellRight}>Refunds</Text>
              <Text style={styles.tableCellRight}>Net</Text>
            </View>
            {data.byPeriod.map((item: any, index: number) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCell}>{item.period}</Text>
                <Text style={styles.tableCellRight}>
                  ₱{item.depositsReceived.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
                <Text style={styles.tableCellRight}>
                  ₱{item.refundsIssued.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
                <Text style={styles.tableCellRight}>
                  ₱{item.netAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
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

export async function generateDepositReportPDF(data: any): Promise<Buffer> {
  const doc = <DepositReportPDF data={data} />;
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();
  return Buffer.from(await blob.arrayBuffer());
}

/**
 * Vacant Rooms Report PDF Component
 */
const VacantRoomsReportPDF = ({ data }: { data: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Vacant Rooms Report</Text>
        <Text style={styles.subtitle}>
          Total Vacant: {data.summary.totalVacant} | Vacancy Rate: {data.summary.vacancyRate.toFixed(1)}%
        </Text>
        <Text style={styles.subtitle}>
          Potential Revenue: ₱{data.summary.totalPotentialRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </Text>
        <Text style={styles.subtitle}>
          Generated: {new Date().toLocaleString()}
        </Text>
      </View>

      {/* Summary Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Summary</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Vacant Rooms</Text>
          <Text style={styles.summaryValue}>{data.summary.totalVacant}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Vacancy Rate</Text>
          <Text style={styles.summaryValue}>{data.summary.vacancyRate.toFixed(1)}%</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Average Monthly Rate</Text>
          <Text style={styles.summaryValue}>
            ₱{data.summary.averageMonthlyRate.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
        </View>
      </View>

      {/* Rooms Table */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vacant Rooms</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, { flex: 0.8 }]}>Room #</Text>
            <Text style={[styles.tableCell, { flex: 1.2 }]}>Building</Text>
            <Text style={[styles.tableCell, { flex: 0.8 }]}>Floor</Text>
            <Text style={styles.tableCellRight}>Monthly Rate</Text>
            <Text style={[styles.tableCell, { flex: 0.8 }]}>Days Vacant</Text>
          </View>
          {data.rooms.map((room: any, index: number) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 0.8 }]}>{room.roomNumber}</Text>
              <Text style={[styles.tableCell, { flex: 1.2 }]}>{room.buildingName}</Text>
              <Text style={[styles.tableCell, { flex: 0.8 }]}>{room.floorNumber || 'N/A'}</Text>
              <Text style={styles.tableCellRight}>
                ₱{room.monthlyRate.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
              <Text style={[styles.tableCell, { flex: 0.8 }]}>
                {room.daysVacant ? `${room.daysVacant}d` : 'N/A'}
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

export async function generateVacantRoomsReportPDF(data: any): Promise<Buffer> {
  const doc = <VacantRoomsReportPDF data={data} />;
  const asPdf = pdf(doc);
  const blob = await asPdf.toBlob();
  return Buffer.from(await blob.arrayBuffer());
}

