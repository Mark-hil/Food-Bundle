import { FileText } from 'lucide-react';

interface Student {
  full_name: string;
  email: string;
}

interface Bundle {
  name: string;
  price?: number;
}

interface OrderData {
  id: string;
  created_at: string;
  bundle: Bundle | string | undefined; // Can be object, name string, or undefined
  quantity: number;
  total_amount: number;
  delivery_fee?: number;
  delivery_address: string;
  delivery_date?: string;
  delivery_time?: string;
  status: string;
  student?: Student | null;
  full_name?: string;
  email?: string;
}

interface ReceiptDownloadProps {
  order: OrderData;
}

export default function ReceiptDownload({ order }: ReceiptDownloadProps) {
  const handleDownloadReceipt = () => {
    // Extract bundle info
    const bundleName = typeof order.bundle === 'string' ? order.bundle : order.bundle?.name || 'Food Bundle';

    // Extract customer info
    const customerName = order.student?.full_name || order.full_name || 'Guest Customer';
    const customerEmail = order.student?.email || order.email || 'N/A';

    // Format dates
    const orderDate = new Date(order.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const deliveryDate = order.delivery_date
      ? new Date(order.delivery_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'TBD';

    const deliveryTime = order.delivery_time || 'TBD';

    // Calculate unit price
    const unitPrice = order.quantity > 0 ? order.total_amount / order.quantity : 0;

    // Format amounts
    const formattedUnitPrice = Number(unitPrice).toFixed(2);
    const deliveryFee = order.delivery_fee || 0;
    const subtotal = order.total_amount - deliveryFee;
    const formattedSubtotal = Number(subtotal).toFixed(2);
    const formattedDeliveryFee = Number(deliveryFee).toFixed(2);
    const formattedTotal = Number(order.total_amount).toFixed(2);

    // Create receipt HTML
    const receiptHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Receipt - ${order.id.slice(0, 8)}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background-color: #f9fafb;
          }

          .receipt-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            background-color: white;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }

          .receipt-content {
            flex: 1;
          }

          header {
            text-align: center;
            padding-bottom: 30px;
            border-bottom: 2px solid #e5e7eb;
            margin-bottom: 30px;
          }

          .logo {
            font-size: 28px;
            font-weight: 700;
            color: #0066cc;
            margin-bottom: 8px;
          }

          .tagline {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 20px;
          }

          .receipt-header {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
            padding: 20px;
            background-color: #f3f4f6;
            border-radius: 8px;
          }

          .header-section h3 {
            font-size: 12px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
          }

          .header-section p {
            font-size: 14px;
            margin-bottom: 4px;
          }

          .order-id {
            font-size: 16px;
            font-weight: 600;
            color: #0066cc;
            font-family: 'Courier New', monospace;
          }

          .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            margin-top: 8px;
          }

          .status-pending {
            background-color: #fef3c7;
            color: #92400e;
          }

          .status-confirmed {
            background-color: #dbeafe;
            color: #0c4a6e;
          }

          .status-preparing {
            background-color: #e9d5ff;
            color: #6b21a8;
          }

          .status-ready {
            background-color: #ccfbf1;
            color: #134e4a;
          }

          .status-delivered {
            background-color: #dcfce7;
            color: #166534;
          }

          .status-cancelled {
            background-color: #fee2e2;
            color: #991b1b;
          }

          .section-title {
            font-size: 16px;
            font-weight: 700;
            color: #1f2937;
            margin-top: 30px;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e5e7eb;
          }

          .section-content {
            margin-bottom: 20px;
          }

          .info-row {
            display: grid;
            grid-template-columns: 140px 1fr;
            gap: 15px;
            margin-bottom: 12px;
            font-size: 14px;
          }

          .info-label {
            font-weight: 600;
            color: #6b7280;
          }

          .info-value {
            color: #1f2937;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }

          th {
            background-color: #f3f4f6;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
            color: #374151;
            border-bottom: 2px solid #e5e7eb;
          }

          td {
            padding: 14px 12px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 14px;
          }

          tr:last-child td {
            border-bottom: none;
          }

          .text-right {
            text-align: right;
          }

          .summary {
            background-color: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
          }

          .summary-row {
            display: grid;
            grid-template-columns: 1fr 120px;
            gap: 15px;
            margin-bottom: 12px;
            font-size: 14px;
            align-items: center;
          }

          .summary-row.total {
            border-top: 2px solid #e5e7eb;
            padding-top: 12px;
            margin-top: 12px;
            font-size: 16px;
            font-weight: 700;
          }

          .total-amount {
            font-size: 24px;
            font-weight: 700;
            color: #0066cc;
            text-align: right;
          }

          .thank-you {
            text-align: center;
            padding: 30px 0;
            border-top: 2px solid #e5e7eb;
            margin-top: 30px;
          }

          .thank-you-text {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 10px;
          }

          footer {
            text-align: center;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            margin-top: auto;
            font-size: 12px;
            color: #6b7280;
          }

          .contact-info {
            margin-bottom: 8px;
          }

          @media print {
            body {
              background-color: white;
              padding: 0;
            }

            .receipt-container {
              max-width: 100%;
              padding: 0;
              min-height: auto;
            }

            header {
              page-break-after: avoid;
            }

            .section-title {
              page-break-after: avoid;
            }

            table {
              page-break-inside: avoid;
            }

            .summary {
              page-break-inside: avoid;
            }

            .thank-you {
              page-break-before: avoid;
            }
          }

          @media (max-width: 600px) {
            .receipt-header {
              grid-template-columns: 1fr;
              gap: 15px;
            }

            .info-row {
              grid-template-columns: 100px 1fr;
              gap: 10px;
            }

            .summary-row {
              grid-template-columns: 1fr 80px;
              gap: 10px;
            }

            table {
              font-size: 12px;
            }

            th, td {
              padding: 8px 6px;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="receipt-content">
            <header>
              <div class="logo">FoodBundle</div>
              <div class="tagline">Delicious Food, Delivered Fresh</div>
            </header>

            <div class="receipt-header">
              <div class="header-section">
                <h3>Order Information</h3>
                <div class="order-id">${order.id.slice(0, 8).toUpperCase()}</div>
                <p style="margin-top: 10px;">Date: ${orderDate}</p>
                <div class="status-badge status-${order.status.toLowerCase()}">
                  ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </div>
              </div>
              <div class="header-section">
                <h3>Customer Information</h3>
                <p>${customerName}</p>
                <p>${customerEmail}</p>
              </div>
            </div>

            <div class="section-title">Items</div>
            <table>
              <thead>
                <tr>
                  <th>Bundle Name</th>
                  <th class="text-right">Quantity</th>
                  <th class="text-right">Unit Price</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${bundleName}</td>
                  <td class="text-right">${order.quantity}</td>
                  <td class="text-right">GH₵ ${formattedUnitPrice}</td>
                  <td class="text-right"><strong>GH₵ ${formattedSubtotal}</strong></td>
                </tr>
              </tbody>
            </table>

            <div class="summary">
              ${deliveryFee > 0 ? `
              <div class="summary-row">
                <span>Subtotal</span>
                <div class="text-right">GH₵ ${formattedSubtotal}</div>
              </div>
              <div class="summary-row">
                <span>Delivery Fee</span>
                <div class="text-right">GH₵ ${formattedDeliveryFee}</div>
              </div>
              ` : ''}
              <div class="summary-row total">
                <span>Total Amount</span>
                <div class="total-amount">GH₵ ${formattedTotal}</div>
              </div>
            </div>

            <div class="section-title">Delivery Information</div>
            <div class="section-content">
              <div class="info-row">
                <span class="info-label">Address:</span>
                <span class="info-value">${order.delivery_address}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Delivery Date:</span>
                <span class="info-value">${deliveryDate}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Delivery Time:</span>
                <span class="info-value">${deliveryTime}</span>
              </div>
            </div>

            <div class="thank-you">
              <div class="thank-you-text">Thank you for your order!</div>
              <p style="font-size: 13px; color: #6b7280;">We appreciate your business and look forward to serving you again.</p>
            </div>
          </div>

          <footer>
            <div class="contact-info">FoodBundle - Delicious Food Delivered</div>
            <div class="contact-info">Receipt Generated: ${new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}</div>
            <div>For inquiries, please contact our support team</div>
          </footer>
        </div>

        <script>
          window.print();
        </script>
      </body>
      </html>
    `;

    // Open new window with receipt
    const receiptWindow = window.open('', '_blank');
    if (receiptWindow) {
      receiptWindow.document.write(receiptHTML);
      receiptWindow.document.close();
    }
  };

  return (
    <button
      onClick={handleDownloadReceipt}
      className="flex items-center gap-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold px-4 py-2 rounded-lg transition"
      title="Download receipt as PDF"
    >
      <FileText size={18} />
      Download Receipt
    </button>
  );
}
