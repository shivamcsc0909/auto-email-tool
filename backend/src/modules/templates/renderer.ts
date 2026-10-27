import sanitizeHtml from 'sanitize-html';
import { PersonalizationVariables, RenderedEmail } from '@rankrise/shared';

/**
 * Default fallback values for variables when lead or sender data is omitted.
 * Critical business requirement: NEVER emit "{{variable}}" or broken placeholders.
 */
const DEFAULT_FALLBACKS: Record<string, string> = {
  first_name: 'there',
  last_name: '',
  full_name: 'there',
  company_name: 'your business',
  email: '',
  website: 'your website',
  domain: 'your domain',
  country: 'United States',
  city: 'your area',
  phone: '',
  industry: 'your industry',
  service: 'modern digital solutions',
  sender_name: 'RankRise Outreach Team',
  sender_email: 'outreach@rankriseusa.com',
  sender_title: 'Business Development',
  sender_company: 'RANKRISEUSA',
  sender_website: 'rankriseusa.com',
  sender_phone: '',
  sender_signature: 'Best regards,\nRankRise Outreach Team',
  campaign_name: 'RankRise Outreach',
};

/**
 * Safely renders a template string by substituting variables with fallback safety.
 */
export function renderTemplateString(
  templateStr: string,
  variables: Partial<PersonalizationVariables> = {}
): string {
  if (!templateStr) return '';

  // Get current date formatted nicely (e.g. September 5, 2025)
  const currentDate = variables.current_date || new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
  }).format(new Date());

  const mergedContext: Record<string, string> = {
    ...DEFAULT_FALLBACKS,
    current_date: currentDate,
    ...Object.fromEntries(
      Object.entries(variables)
        .filter(([_, v]) => v !== undefined && v !== null && String(v).trim() !== '')
        .map(([k, v]) => [k, String(v).trim()])
    ),
  };

  // Replace all {{variable}} patterns
  let rendered = templateStr.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, varName) => {
    const key = varName.toLowerCase();
    if (key in mergedContext) {
      return mergedContext[key];
    }
    // Unknown placeholder: replace with empty string to avoid leaking raw {{brackets}}
    return '';
  });

  // Clean up any double spaces or broken punctuation caused by blank fallbacks (e.g., "Hi  ," -> "Hi there,")
  rendered = rendered.replace(/\bHi\s*,/g, 'Hi there,');
  rendered = rendered.replace(/\bHello\s*,/g, 'Hello,');
  rendered = rendered.replace(/[ ]{2,}/g, ' ');

  return rendered;
}

/**
 * Sanitizes HTML to ensure safe email rendering across clients (Outlook, Gmail, Apple Mail).
 * Strips script tags, iframes, and dangerous attributes while preserving typography and tables.
 */
export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3',
      'h4', 'h5', 'h6', 'blockquote', 'div', 'span', 'table', 'tbody', 'thead',
      'tr', 'td', 'th', 'img', 'hr',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'style', 'rel'],
      img: ['src', 'alt', 'width', 'height', 'style'],
      div: ['style', 'class'],
      span: ['style', 'class'],
      p: ['style', 'class'],
      table: ['style', 'cellpadding', 'cellspacing', 'border', 'width'],
      td: ['style', 'width', 'align', 'valign'],
      th: ['style', 'width', 'align', 'valign'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  });
}

/**
 * Wraps email HTML body in a responsive, email-client-safe container with inline styles.
 */
export function wrapInEmailSafeLayout(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RankRise Outreach</title>
</head>
<body style="margin: 0; padding: 20px 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; font-size: 15px; line-height: 1.6;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; padding: 24px 32px;" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              ${bodyHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Fully renders subject, HTML body, and plain-text body for an email dispatch.
 */
export function renderEmail(params: {
  subjectTemplate: string;
  bodyHtmlTemplate: string;
  bodyTextTemplate: string;
  variables: Partial<PersonalizationVariables>;
}): RenderedEmail {
  const renderedSubject = renderTemplateString(params.subjectTemplate, params.variables);
  const renderedHtmlRaw = renderTemplateString(params.bodyHtmlTemplate, params.variables);
  const renderedText = renderTemplateString(params.bodyTextTemplate, params.variables);

  const sanitizedHtml = sanitizeEmailHtml(renderedHtmlRaw);
  const wrappedHtml = wrapInEmailSafeLayout(sanitizedHtml);

  return {
    subject: renderedSubject,
    bodyHtml: wrappedHtml,
    bodyText: renderedText,
  };
}
