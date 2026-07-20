export interface PurchaseEmailItem {
  name: string
  quantity: number
  amountCents?: number
  imageUrl?: string
}

export interface PurchaseEmailPayload {
  customerName: string
  customerEmail: string
  purchaseType: 'store' | 'ticket' | 'membership'
  referenceId: string
  amountCents: number
  items: PurchaseEmailItem[]
  planLabel?: string
}

export function formatPurchaseType(type: PurchaseEmailPayload['purchaseType']) {
  if (type === 'store') return 'Club store order'
  if (type === 'ticket') return 'Match tickets'
  return 'Membership payment'
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function buildPurchaseEmailHtml(payload: PurchaseEmailPayload) {
  const total = (payload.amountCents / 100).toFixed(2)
  const typeLabel = formatPurchaseType(payload.purchaseType)

  const itemsHtml = payload.items.length
    ? payload.items
        .map((item) => {
          const unit = item.amountCents != null ? (item.amountCents / 100).toFixed(2) : null
          const lineTotal = unit != null ? (Number(unit) * item.quantity).toFixed(2) : null
          const imageCell = item.imageUrl
            ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" width="72" height="72" style="display:block;width:72px;height:72px;object-fit:cover;border-radius:12px;border:1px solid #e2e8f0;" />`
            : `<div style="width:72px;height:72px;border-radius:12px;background:#e2e8f0;"></div>`

          return `<tr>
            <td style="padding:16px 0;border-bottom:1px solid #e2e8f0;vertical-align:top;width:84px;">${imageCell}</td>
            <td style="padding:16px 12px;border-bottom:1px solid #e2e8f0;vertical-align:top;">
              <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#0f172a;">${escapeHtml(item.name)}</p>
              <p style="margin:0;font-size:13px;color:#64748b;">Qty: ${item.quantity}${unit ? ` · €${unit} each` : ''}</p>
            </td>
            <td style="padding:16px 0;border-bottom:1px solid #e2e8f0;vertical-align:top;text-align:right;white-space:nowrap;">
              <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">${lineTotal ? `€${lineTotal}` : ''}</p>
            </td>
          </tr>`
        })
        .join('')
    : `<tr>
        <td colspan="3" style="padding:16px 0;color:#475569;">
          ${escapeHtml(payload.planLabel || typeLabel)}
        </td>
      </tr>`

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
      <div style="background:#0A1628;color:#ffffff;padding:24px;">
        <h1 style="margin:0;font-size:24px;">Purchase confirmed</h1>
        <p style="margin:8px 0 0;color:#cbd5e1;">Dublin Lions BC</p>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px;">Hi ${escapeHtml(payload.customerName)},</p>
        <p style="margin:0 0 20px;">Thank you — your ${escapeHtml(typeLabel.toLowerCase())} has been confirmed.</p>
        <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Reference</p>
        <p style="margin:0 0 24px;font-weight:bold;">${escapeHtml(payload.referenceId)}</p>
        <p style="margin:0 0 12px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">What you purchased</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tbody>${itemsHtml}</tbody>
        </table>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;text-align:right;">
          <p style="margin:0;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">Total paid</p>
          <p style="margin:6px 0 0;font-size:28px;font-weight:bold;color:#0f172a;">€${total}</p>
        </div>
        <p style="margin:24px 0 0;color:#64748b;font-size:14px;">If you have any questions, reply to this email or contact the club.</p>
      </div>
    </div>
  </body>
</html>`
}

export async function sendPurchaseEmail(payload: PurchaseEmailPayload): Promise<{ sent: boolean; skipped?: boolean; error?: string }> {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('PURCHASE_FROM_EMAIL') || 'Dublin Lions BC <onboarding@resend.dev>'

  if (!resendKey || !payload.customerEmail) {
    return { sent: false, skipped: true }
  }

  const subject = `Your Dublin Lions purchase is confirmed — ${payload.referenceId}`
  const html = buildPurchaseEmailHtml(payload)

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [payload.customerEmail],
      subject,
      html,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('Resend email failed', text)
    return { sent: false, error: text }
  }

  return { sent: true }
}
