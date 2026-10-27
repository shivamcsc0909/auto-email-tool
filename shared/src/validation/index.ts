import { z } from 'zod';
import {
  LeadStatus,
  SenderProvider,
  SenderStatus,
  CampaignStatus,
  SuppressionReason,
  ServiceCategory,
} from '../enums/index.js';

// Auth Validation
export const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Column Mapping Validation for Import
export const columnMappingSchema = z.object({
  email: z.string().min(1, 'Email column mapping is required'),
  website: z.string().optional(),
  name: z.string().optional(),
  company: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  industry: z.string().optional(),
});

export const importConfirmSchema = z.object({
  leadSourceId: z.string().min(1, 'Lead source ID is required'),
  columnMapping: columnMappingSchema,
  serviceInterest: z.string().optional(),
  skipDuplicates: z.boolean().default(true),
});

// Single Lead Create/Update
export const createLeadSchema = z.object({
  email: z.string().email('Valid email is required'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  fullName: z.string().optional(),
  companyName: z.string().optional(),
  website: z.string().optional(),
  domain: z.string().optional(),
  country: z.string().default('United States'),
  city: z.string().optional(),
  phone: z.string().optional(),
  industry: z.string().optional(),
  serviceInterest: z.string().optional(),
  customNotes: z.string().optional(),
  status: z.nativeEnum(LeadStatus).default(LeadStatus.NEW),
});

export const updateLeadSchema = createLeadSchema.partial();

// Template Validation
export const createTemplateSchema = z.object({
  name: z.string().min(2, 'Template name is required'),
  category: z.nativeEnum(ServiceCategory).default(ServiceCategory.GENERAL_DIGITAL_SERVICES),
  categories: z.array(z.string()).default([]),
  service: z.string().default('General'),
  language: z.string().default('en'),
  subject: z.string().min(1, 'Subject is required'),
  bodyHtml: z.string().min(1, 'HTML body is required'),
  bodyText: z.string().min(1, 'Text body is required'),
  weight: z.number().int().min(1).max(100).default(1),
  active: z.boolean().default(true),
});

export const updateTemplateSchema = createTemplateSchema.partial();

// Sender Profile Validation
export const updateSenderProfileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').optional(),
  senderName: z.string().min(1, 'Sender name is required').optional(),
  title: z.string().optional(),
  company: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  signatureHtml: z.string().optional(),
  signatureText: z.string().optional(),
  signatureLogoUrl: z.string().optional(),
  dailySendLimit: z.number().int().min(1).max(20, 'Safety cap maximum is 20 sends/day').default(20),
  priority: z.number().int().min(1).max(10).default(1),
  enabled: z.boolean().optional(),
});

// Campaign Validation
export const createCampaignSchema = z.object({
  name: z.string().min(2, 'Campaign name must be at least 2 characters'),
  description: z.string().optional(),
  serviceCategory: z.nativeEnum(ServiceCategory).default(ServiceCategory.GENERAL_DIGITAL_SERVICES),
  templateIds: z.array(z.string()).min(1, 'At least one template must be selected'),
  senderIds: z.array(z.string()).min(1, 'At least one sender must be selected'),
  leadIds: z.array(z.string()).optional(),
  dailyCampaignLimit: z.number().int().min(1).default(100),
  perSenderLimit: z.number().int().min(1).max(20, 'Safety limit cannot exceed 20/day').default(20),
  delayMin: z.number().int().min(30, 'Minimum delay must be at least 30 seconds').default(90),
  delayMax: z.number().int().min(60, 'Maximum delay must be at least 60 seconds').default(300),
  scheduleStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:mm').default('09:00'),
  scheduleEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format must be HH:mm').default('17:00'),
  timezone: z.string().default('America/New_York'),
});

export const updateCampaignSchema = createCampaignSchema.partial();

// Suppression List Entry
export const createSuppressionSchema = z.object({
  email: z.string().email('Valid email is required'),
  domain: z.string().optional(),
  reason: z.nativeEnum(SuppressionReason).default(SuppressionReason.MANUAL_BLOCK),
  notes: z.string().optional(),
});

// Test Email Request
export const sendTestEmailSchema = z.object({
  senderId: z.string().min(1, 'Sender account is required'),
  templateId: z.string().optional(),
  recipientEmail: z.string().email('Valid recipient email is required'),
  customSubject: z.string().optional(),
  customBodyHtml: z.string().optional(),
});
