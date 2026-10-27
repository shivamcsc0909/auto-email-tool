import { describe, it, expect } from 'vitest';
import {
  determineGreeting,
  extractCleanDomain,
  deriveCompanyFromDomain,
  isRoleBasedEmail,
  parseNameFromEmail,
} from '../src/modules/leads/greetingExtractor.js';
import { GreetingStrategy } from '@rankrise/shared';

describe('Greeting & Name Extractor', () => {
  describe('Domain & Company Derivation', () => {
    it('should clean domain from complex URLs and emails', () => {
      expect(extractCleanDomain('https://www.gordondesigngroup.com/services?ref=1')).toBe('gordondesigngroup.com');
      expect(extractCleanDomain('http://hostdesk.us:8080')).toBe('hostdesk.us');
      expect(extractCleanDomain('admin@meteorminerals.us')).toBe('meteorminerals.us');
      expect(extractCleanDomain('carolinacruise.com')).toBe('carolinacruise.com');
    });

    it('should derive clean company names from domain', () => {
      expect(deriveCompanyFromDomain('gordondesigngroup.com')).toBe('Gordon Design Group');
      expect(deriveCompanyFromDomain('meteorminerals.us')).toBe('Meteor Minerals');
      expect(deriveCompanyFromDomain('carolinacruise.com')).toBe('Carolina Cruise');
      expect(deriveCompanyFromDomain('agentic-flow.com')).toBe('Agentic Flow');
    });
  });

  describe('Role-based Email Detection', () => {
    it('should detect standard role-based mailboxes', () => {
      expect(isRoleBasedEmail('info@company.com')).toBe(true);
      expect(isRoleBasedEmail('admin@namefind.com')).toBe(true);
      expect(isRoleBasedEmail('support@catches.io')).toBe(true);
      expect(isRoleBasedEmail('sales@example.org')).toBe(true);
      expect(isRoleBasedEmail('hello@domain.com')).toBe(true);
      expect(isRoleBasedEmail('contact@brand.com')).toBe(true);
      expect(isRoleBasedEmail('office@firm.com')).toBe(true);
      expect(isRoleBasedEmail('operation@usunfinite.com')).toBe(true);
      expect(isRoleBasedEmail('hostdesk7@gmail.com')).toBe(true);
    });

    it('should not flag personal email addresses', () => {
      expect(isRoleBasedEmail('linda@gordondesigngroup.com')).toBe(false);
      expect(isRoleBasedEmail('sam.miller@gmail.com')).toBe(false);
      expect(isRoleBasedEmail('brad@bradazz.com')).toBe(false);
      expect(isRoleBasedEmail('thomas@rankriseusa.com')).toBe(false);
    });
  });

  describe('Name Parsing from Email', () => {
    it('should parse dot-separated and underscore-separated personal emails', () => {
      const parsed = parseNameFromEmail('sam.miller@gmail.com');
      expect(parsed.firstName).toBe('Sam');
      expect(parsed.lastName).toBe('Miller');
      expect(parsed.confidence).toBe('HIGH');
    });

    it('should parse single personal names', () => {
      const parsed = parseNameFromEmail('linda@gordondesigngroup.com');
      expect(parsed.firstName).toBe('Linda');
      expect(parsed.confidence).toBe('MEDIUM');
    });

    it('should not parse names from role-based emails', () => {
      const parsed = parseNameFromEmail('info@company.com');
      expect(parsed.firstName).toBeNull();
      expect(parsed.confidence).toBe('NONE');
    });
  });

  describe('Greeting Determination Rules', () => {
    it('should greet by personal name when available (e.g. linda@gordondesigngroup.com)', () => {
      const greeting = determineGreeting({
        email: 'linda@gordondesigngroup.com',
        website: 'https://gordondesigngroup.com',
      });
      expect(greeting.strategy).toBe(GreetingStrategy.PERSON_NAME);
      expect(greeting.greetingText).toBe('Hi Linda,');
      expect(greeting.firstName).toBe('Linda');
    });

    it('should greet by explicit name if provided', () => {
      const greeting = determineGreeting({
        email: 'brad@bradazz.com',
        explicitName: 'Brad Azz',
        companyName: 'Bradazz Minerals',
      });
      expect(greeting.strategy).toBe(GreetingStrategy.PERSON_NAME);
      expect(greeting.greetingText).toBe('Hi Brad,');
      expect(greeting.firstName).toBe('Brad');
      expect(greeting.lastName).toBe('Azz');
    });

    it('should NEVER say "Hi Info," or "Hi Admin,", but use "Hello [Company] team," if company is known', () => {
      const greetingInfo = determineGreeting({
        email: 'info@gordondesigngroup.com',
        website: 'gordondesigngroup.com',
      });
      expect(greetingInfo.strategy).toBe(GreetingStrategy.COMPANY_NAME);
      expect(greetingInfo.greetingText).toBe('Hello Gordon Design Group team,');
      expect(greetingInfo.firstName).toBeNull();
      expect(greetingInfo.greetingText).not.toContain('Info');

      const greetingAdmin = determineGreeting({
        email: 'admin@namefind.com',
        companyName: 'NameFind Inc',
      });
      expect(greetingAdmin.strategy).toBe(GreetingStrategy.COMPANY_NAME);
      expect(greetingAdmin.greetingText).toBe('Hello NameFind Inc team,');
      expect(greetingAdmin.greetingText).not.toContain('Admin');
    });

    it('should fallback to "Hi there," if role-based and no company can be determined', () => {
      const greetingGeneric = determineGreeting({
        email: 'support@gmail.com', // generic provider, no company derivable
      });
      expect(greetingGeneric.strategy).toBe(GreetingStrategy.GENERIC);
      expect(greetingGeneric.greetingText).toBe('Hi there,');
      expect(greetingGeneric.firstName).toBeNull();
    });
  });
});
