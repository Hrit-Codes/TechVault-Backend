import { layout } from './newsletterEmailTemplate';

type OrderShippedItem = {
  productName: string;
  variantName?: string | null;
  price: number;
  quantity: number;
};

type OrderShippedOrder = {
  id: string;
  totalAmount: number;
  paymentMethod: string;
  shippingAddress: {
    fullName: string;
    street: string;
    city: string;
    phoneNumber: string;
  };
  items?: OrderShippedItem[];
};

export const orderShippedTemplate = (
  order: OrderShippedOrder,
  shopUrl: string,
): string => {
  // Format the items into an HTML table
  const itemsHtml =
    order.items
      ?.map(
        (item) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
          <p class="text-strong" style="margin: 0; font-size: 14px; font-weight: 600; color: #111827;">
            ${item.productName} ${item.variantName ? `(${item.variantName})` : ''}
          </p>
          <p class="text-body" style="margin: 4px 0 0; font-size: 13px; color: #6b7280;">
            Qty: ${item.quantity} &times; Rs. ${item.price.toLocaleString('en-IN')}
          </p>
        </td>
        <td align="right" style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
          <p class="text-strong" style="margin: 0; font-size: 14px; font-weight: 600; color: #111827;">
            Rs. ${(item.price * item.quantity).toLocaleString('en-IN')}
          </p>
        </td>
      </tr>
    `,
      )
      .join('') ?? '';

  return layout({
    badge: 'Shipping',
    heading: 'Your order is on the way! 🚚',
    intro: `Hi <strong class="text-strong" style="color:#111827;">${order.shippingAddress.fullName}</strong>,<br/>
            Great news! Your order <strong>#${order.id.slice(0, 8).toUpperCase()}</strong> has been shipped and is headed your way.`,

    // The body contains the shipping info and itemized receipt
    body: `
      <!-- Shipping Address Summary -->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px; background-color: #f9fafb; border-radius: 12px; padding: 16px;">
        <tr>
          <td style="padding: 16px;">
            <p class="text-body" style="margin:0 0 4px; font-size:12px; text-transform:uppercase; letter-spacing:1px; color:#6b7280; font-weight:700;">
              Delivering To
            </p>
            <p class="text-strong" style="margin:0; font-size:14px; font-weight:600; color:#111827;">
              ${order.shippingAddress.fullName}
            </p>
            <p class="text-body" style="margin:4px 0 0; font-size:14px; color:#374151; line-height:1.5;">
              ${order.shippingAddress.street}<br/>
              ${order.shippingAddress.city}<br/>
              ${order.shippingAddress.phoneNumber}
            </p>
          </td>
        </tr>
      </table>

      <!-- Order Items -->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
        <tr>
          <td style="padding-bottom: 8px;">
             <p class="text-strong" style="margin:0; font-size:14px; font-weight:700; color:#111827;">Order Summary</p>
          </td>
        </tr>
        ${itemsHtml}
      </table>

      <!-- Total -->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
        <tr>
          <td align="right" style="padding-top: 8px;">
            <p class="text-body" style="margin:0; font-size:14px; color:#6b7280;">
              Payment Method: <strong style="color:#111827;">${order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Khalti'}</strong>
            </p>
            <p class="text-strong" style="margin:4px 0 0; font-size:18px; font-weight:700; color:#111827;">
              Total: Rs. ${order.totalAmount.toLocaleString('en-IN')}
            </p>
          </td>
        </tr>
      </table>
    `,

    cta: {
      label: 'Track Your Order',
      url: `${shopUrl}/orders/${order.id}`,
    },

    footnote:
      'If you have any questions about your delivery, please contact our support team.',

    // Transactional emails don't need an unsubscribe link.
    unsubscribeUrl: undefined,

    subFooter:
      'This email was sent to you because you placed an order on TechVault.',
  });
};
