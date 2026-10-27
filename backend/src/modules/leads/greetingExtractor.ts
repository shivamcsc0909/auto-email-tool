import { GreetingStrategy, ROLE_BASED_EMAIL_PREFIXES } from '@rankrise/shared';

export interface GreetingDetermination {
  strategy: GreetingStrategy;
  greetingText: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  companyName: string | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
}

export const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'zoho.com',
  'mail.com',
  'gmx.com',
  'yandex.com',
]);

const COMMON_BUSINESS_WORDS = [
  'design',
  'group',
  'minerals',
  'cruise',
  'flow',
  'trucking',
  'solutions',
  'media',
  'digital',
  'agency',
  'studio',
  'tech',
  'technologies',
  'services',
  'management',
  'consulting',
  'consultants',
  'logistics',
  'properties',
  'realty',
  'ventures',
  'capital',
  'partners',
  'systems',
  'works',
  'lab',
  'labs',
  'health',
  'care',
  'dental',
  'legal',
  'law',
  'auto',
  'solar',
  'roofing',
  'plumbing',
  'electric',
  'cleaning',
  'security',
  'finance',
  'financial',
  'holdings',
  'corp',
  'llc',
  'inc',
];

/**
 * Extracts a clean domain from a website URL or email address.
 */
export function extractCleanDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  let raw = input.trim().toLowerCase();

  // If it's an email, take the domain part
  if (raw.includes('@')) {
    const parts = raw.split('@');
    raw = parts[parts.length - 1];
  }

  // Strip protocol
  raw = raw.replace(/^[a-z]+:\/\//, '');

  // Strip path, query, fragment
  raw = raw.split('/')[0].split('?')[0].split('#')[0];

  // Strip port
  raw = raw.split(':')[0];

  // Strip leading www.
  raw = raw.replace(/^www\./, '');

  return raw.trim() || null;
}

/**
 * Splits unhyphenated compound domain names into distinct words using common business lexicon.
 * E.g. "gordondesigngroup" -> ["gordon", "design", "group"]
 *      "meteorminerals" -> ["meteor", "minerals"]
 *      "carolinacruise" -> ["carolina", "cruise"]
 *      "agenticflow" -> ["agentic", "flow"]
 */
function splitCompoundDomain(rawName: string): string[] {
  let text = rawName.toLowerCase();
  for (const word of COMMON_BUSINESS_WORDS) {
    const regex = new RegExp(`(?<=[a-z])(${word})(?=[a-z]|$)`, 'gi');
    text = text.replace(regex, ' $1 ');
  }
  return text.split(/\s+/).filter(Boolean);
}

/**
 * Derives a human-friendly company name from a domain name.
 */
export function deriveCompanyFromDomain(domain: string | null | undefined): string | null {
  if (!domain) return null;
  const clean = extractCleanDomain(domain);
  if (!clean) return null;

  // Do not derive company names from public webmail domains
  if (PUBLIC_EMAIL_DOMAINS.has(clean)) return null;

  // Remove common generic TLDs
  const baseName = clean
    .replace(/\.(com|net|org|io|us|co|biz|info|agency|design|tech|app|ai|ca|uk|co\.uk)$/i, '');

  if (!baseName || baseName.length < 2) return null;

  // If hyphens or underscores exist
  if (baseName.includes('-') || baseName.includes('_')) {
    return baseName
      .split(/[-_]+/)
      .filter(Boolean)
      .map(word => capitalize(word))
      .join(' ');
  }

  // Split camelCase
  const splitCamel = baseName.replace(/([a-z])([A-Z])/g, '$1 $2');
  if (splitCamel !== baseName) {
    return splitCamel.split(' ').map(w => capitalize(w)).join(' ');
  }

  // Split common compound words
  const words = splitCompoundDomain(baseName);
  if (words.length > 1) {
    return words.map(w => capitalize(w)).join(' ');
  }

  // Otherwise capitalize base name
  return capitalize(baseName);
}

function capitalize(word: string): string {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Analyzes local-part of an email to determine if it is personal or role-based.
 */
export function isRoleBasedEmail(email: string): boolean {
  if (!email || !email.includes('@')) return false;
  const localPart = email.split('@')[0].toLowerCase().trim();

  // Check exact prefix
  if (ROLE_BASED_EMAIL_PREFIXES.has(localPart)) return true;

  // Check prefix before numbers (e.g. hostdesk7, info1, support2)
  const prefixWithoutDigits = localPart.replace(/\d+$/, '');
  if (ROLE_BASED_EMAIL_PREFIXES.has(prefixWithoutDigits)) return true;

  // Common composite prefixes (e.g. sales-team, info_office)
  const subparts = localPart.split(/[\._\-+]/);
  for (const sub of subparts) {
    if (ROLE_BASED_EMAIL_PREFIXES.has(sub)) {
      return true;
    }
  }

  return false;
}

/**
 * Attempts to parse a person's first and last name from an email address.
 */
export function parseNameFromEmail(email: string): {
  firstName: string | null;
  lastName: string | null;
  confidence: 'HIGH' | 'MEDIUM' | 'NONE';
} {
  if (!email || !email.includes('@')) {
    return { firstName: null, lastName: null, confidence: 'NONE' };
  }

  if (isRoleBasedEmail(email)) {
    return { firstName: null, lastName: null, confidence: 'NONE' };
  }

  const localPart = email.split('@')[0].trim();

  // Reject purely numeric or hex strings
  if (/^[\d_-]+$/.test(localPart) || /^[0-9a-f]{10,}$/i.test(localPart)) {
    return { firstName: null, lastName: null, confidence: 'NONE' };
  }

  // Pattern 1: first.last or first_last (e.g. sam.miller, linda.smith)
  const parts = localPart.split(/[\._]/).filter(p => p.length > 1 && !/^\d+$/.test(p));
  if (parts.length === 2) {
    const [first, last] = parts;
    if (/^[a-zA-Z]{2,20}$/.test(first) && /^[a-zA-Z]{2,25}$/.test(last)) {
      return {
        firstName: capitalize(first),
        lastName: capitalize(last),
        confidence: 'HIGH',
      };
    }
  }

  // Pattern 2: single name (e.g. linda@, brad@, thomas@)
  if (parts.length === 1) {
    const single = parts[0].replace(/\d+$/, '');
    if (/^[a-zA-Z]{3,20}$/.test(single)) {
      const genericWords = new Set(['user', 'email', 'mail', 'test', 'example', 'client', 'demo', 'inbox']);
      if (!genericWords.has(single.toLowerCase())) {
        return {
          firstName: capitalize(single),
          lastName: null,
          confidence: 'MEDIUM',
        };
      }
    }
  }

  return { firstName: null, lastName: null, confidence: 'NONE' };
}

/**
 * Intelligently determines the best available greeting according to business rules.
 */
export function determineGreeting(params: {
  email: string;
  explicitName?: string | null;
  companyName?: string | null;
  website?: string | null;
  domain?: string | null;
}): GreetingDetermination {
  const { email, explicitName, companyName, website, domain } = params;

  // 1. Resolve company name
  let resolvedCompany = companyName?.trim() || null;
  if (!resolvedCompany) {
    const explicitDom = domain || extractCleanDomain(website);
    if (explicitDom && !PUBLIC_EMAIL_DOMAINS.has(explicitDom)) {
      resolvedCompany = deriveCompanyFromDomain(explicitDom);
    } else {
      const emailDom = extractCleanDomain(email);
      if (emailDom && !PUBLIC_EMAIL_DOMAINS.has(emailDom)) {
        resolvedCompany = deriveCompanyFromDomain(emailDom);
      }
    }
  }

  // 2. Resolve person name
  let firstName: string | null = null;
  let lastName: string | null = null;
  let fullName: string | null = null;
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' = 'NONE';

  if (explicitName && explicitName.trim().length > 1) {
    const nameParts = explicitName.trim().split(/\s+/);
    if (nameParts.length >= 2) {
      firstName = capitalize(nameParts[0]);
      lastName = nameParts.slice(1).map(capitalize).join(' ');
      fullName = `${firstName} ${lastName}`;
      confidence = 'HIGH';
    } else {
      firstName = capitalize(nameParts[0]);
      fullName = firstName;
      confidence = 'MEDIUM';
    }
  } else {
    // Attempt parse from email
    const emailParsed = parseNameFromEmail(email);
    if (emailParsed.firstName) {
      firstName = emailParsed.firstName;
      lastName = emailParsed.lastName;
      fullName = lastName ? `${firstName} ${lastName}` : firstName;
      confidence = emailParsed.confidence;
    }
  }

  // 3. Determine greeting strategy
  // Case A: Valid personal name exists and not role-based email
  if (firstName && !isRoleBasedEmail(email)) {
    return {
      strategy: GreetingStrategy.PERSON_NAME,
      greetingText: `Hi ${firstName},`,
      firstName,
      lastName,
      fullName,
      companyName: resolvedCompany,
      confidence,
    };
  }

  // Case B: Role-based email or no personal name, but company name is available
  if (resolvedCompany && resolvedCompany.length > 1) {
    return {
      strategy: GreetingStrategy.COMPANY_NAME,
      greetingText: `Hello ${resolvedCompany} team,`,
      firstName: null,
      lastName: null,
      fullName: null,
      companyName: resolvedCompany,
      confidence: 'MEDIUM',
    };
  }

  // Case C: Generic fallback (Never "Hi Info")
  return {
    strategy: GreetingStrategy.GENERIC,
    greetingText: 'Hi there,',
    firstName: null,
    lastName: null,
    fullName: null,
    companyName: null,
    confidence: 'LOW',
  };
}
