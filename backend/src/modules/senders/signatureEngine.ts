export interface SenderSignatureData {
  senderName: string;
  email: string;
  title?: string | null;
  company?: string | null;
  website?: string | null;
  phone?: string | null;
  signatureLogoUrl?: string | null;
}

/**
 * Builds standard plain-text signature fallback matching sender identity.
 */
export function generatePlainTextSignature(data: SenderSignatureData): string {
  const name = data.senderName.trim();
  const title = data.title?.trim() || 'Business Development';
  const company = data.company?.trim() || 'RANKRISEUSA';
  const website = data.website?.trim() || 'rankriseusa.com';
  const email = data.email.trim();
  const phone = data.phone?.trim();

  let sig = `Best regards,\n\n${name}\n${title} | ${company}\n🌐 ${website}\n📧 ${email}`;
  if (phone) {
    sig += `\n📞 ${phone}`;
  }

  return sig;
}

/**
 * Builds email-safe HTML signature table matching sender identity.
 */
export function generateHtmlSignature(data: SenderSignatureData): string {
  const name = data.senderName.trim();
  const title = data.title?.trim() || 'Business Development';
  const company = data.company?.trim() || 'RANKRISEUSA';
  const website = data.website?.trim() || 'rankriseusa.com';
  const cleanUrl = website.startsWith('http') ? website : `https://${website}`;
  const email = data.email.trim();
  const phone = data.phone?.trim();
  const logoUrl = data.signatureLogoUrl?.trim();

  let logoCell = '';
  if (logoUrl) {
    logoCell = `
      <td style="padding-right: 16px; vertical-align: top;">
        <img src="${logoUrl}" alt="${company} Logo" width="60" height="60" style="display: block; width: 60px; height: 60px; border-radius: 6px; object-fit: contain;" />
      </td>`;
  }

  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
  <p style="margin: 0 0 12px 0; color: #475569; font-size: 14px;">Best regards,</p>
  <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="line-height: 1.4;">
    <tr>
      ${logoCell}
      <td style="vertical-align: top;">
        <div style="font-weight: 700; color: #0f172a; font-size: 15px;">${name}</div>
        <div style="color: #64748b; font-size: 13px; margin-top: 2px;">${title} | <span style="font-weight: 600; color: #1e40af;">${company}</span></div>
        <div style="margin-top: 6px; font-size: 13px;">
          <span style="margin-right: 12px;">🌐 <a href="${cleanUrl}" target="_blank" style="color: #2563eb; text-decoration: none;">${website}</a></span>
          <span>📧 <a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a></span>
          ${phone ? `<span style="margin-left: 12px; color: #475569;">📞 ${phone}</span>` : ''}
        </div>
      </td>
    </tr>
  </table>
</div>`.trim();
}

/**
 * Ensures a sender account has its individual HTML and text signatures populated.
 */
export function resolveSenderSignatures(sender: SenderSignatureData, customHtml?: string | null, customText?: string | null): {
  signatureHtml: string;
  signatureText: string;
} {
  return {
    signatureHtml: customHtml && customHtml.trim() ? customHtml : generateHtmlSignature(sender),
    signatureText: customText && customText.trim() ? customText : generatePlainTextSignature(sender),
  };
}
