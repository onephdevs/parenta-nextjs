/**
 * Receipt Generator Service
 * Generates PDF receipts for payments using @react-pdf/renderer
 */

import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';

// Define styles for receipt
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2 solid #000',
    paddingBottom: 15,
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  companyAddress: {
    fontSize: 9,
    color: '#666',
    marginBottom: 3,
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    textAlign: 'center',
  },
  receiptNumber: {
    fontSize: 10,
    textAlign: 'center',
    color: '#666',
    marginTop: 5,
  },
  section: {
    marginTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    borderBottom: '1 solid #ccc',
    paddingBottom: 5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  label: {
    width: '40%',
    fontSize: 10,
    color: '#666',
  },
  value: {
    width: '60%',
    fontSize: 10,
    fontWeight: 'bold',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 15,
    borderTop: '2 solid #000',
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 30,
    paddingTop: 15,
    borderTop: '1 solid #ccc',
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
  },
  thankYou: {
    marginTop: 20,
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

interface ReceiptData {
  receiptNumber: string;
  paymentDate: string;
  paymentAmount: number;
  paymentMethod: string;
  paymentType: string;
  referenceNumber?: string;
  tenantName: string;
  tenantEmail?: string;
  tenantPhone?: string;
  buildingName?: string;
  roomNumber?: string;
  address?: string;
  companyName?: string;
  companyAddress?: string;
  notes?: string;
}

/**
 * Receipt PDF Component
 */
const ReceiptPDF = ({ data }: { data: ReceiptData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.companyName}>
          {data.companyName || 'Alfonso Property Management System'}
        </Text>
        {data.companyAddress && (
          <Text style={styles.companyAddress}>{data.companyAddress}</Text>
        )}
        <Text style={styles.receiptTitle}>PAYMENT RECEIPT</Text>
        <Text style={styles.receiptNumber}>Receipt #: {data.receiptNumber}</Text>
      </View>

      {/* Payment Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Details</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Date:</Text>
          <Text style={styles.value}>
            {new Date(data.paymentDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Payment Method:</Text>
          <Text style={styles.value}>
            {data.paymentMethod.charAt(0).toUpperCase() + data.paymentMethod.slice(1).replace('_', ' ')}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Payment Type:</Text>
          <Text style={styles.value}>
            {data.paymentType.charAt(0).toUpperCase() + data.paymentType.slice(1).replace('_', ' ')}
          </Text>
        </View>
        {data.referenceNumber && (
          <View style={styles.row}>
            <Text style={styles.label}>Reference Number:</Text>
            <Text style={styles.value}>{data.referenceNumber}</Text>
          </View>
        )}
      </View>

      {/* Tenant Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tenant Information</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>{data.tenantName}</Text>
        </View>
        {data.tenantEmail && (
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{data.tenantEmail}</Text>
          </View>
        )}
        {data.tenantPhone && (
          <View style={styles.row}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{data.tenantPhone}</Text>
          </View>
        )}
      </View>

      {/* Property Information */}
      {(data.buildingName || data.roomNumber) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Information</Text>
          {data.buildingName && (
            <View style={styles.row}>
              <Text style={styles.label}>Building:</Text>
              <Text style={styles.value}>{data.buildingName}</Text>
            </View>
          )}
          {data.roomNumber && (
            <View style={styles.row}>
              <Text style={styles.label}>Room:</Text>
              <Text style={styles.value}>{data.roomNumber}</Text>
            </View>
          )}
          {data.address && (
            <View style={styles.row}>
              <Text style={styles.label}>Address:</Text>
              <Text style={styles.value}>{data.address}</Text>
            </View>
          )}
        </View>
      )}

      {/* Amount - use "P" (ASCII) instead of ₱ so PDF renders correctly in all viewers */}
      <View style={styles.amountRow}>
        <Text style={styles.amountLabel}>Amount Paid:</Text>
        <Text style={styles.amountValue}>
          P {data.paymentAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      </View>

      {/* Notes */}
      {data.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.value}>{data.notes}</Text>
        </View>
      )}

      {/* Thank You */}
      <View style={styles.thankYou}>
        <Text>Thank you for your payment!</Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>This is a computer-generated receipt. No signature required.</Text>
        <Text style={{ marginTop: 5 }}>
          Generated on {new Date().toLocaleString('en-US')}
        </Text>
      </View>
    </Page>
  </Document>
);

/**
 * Generate receipt PDF
 */
export async function generateReceiptPDF(data: ReceiptData): Promise<Buffer> {
  const receiptDoc = <ReceiptPDF data={data} />;
  const pdfBlob = await pdf(receiptDoc).toBlob();
  const arrayBuffer = await pdfBlob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
