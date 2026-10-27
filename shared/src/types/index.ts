import {
  LeadStatus,
  SenderProvider,
  SenderStatus,
  CampaignStatus,
  CampaignLeadStatus,
  EmailLogStatus,
  SuppressionReason,
  ServiceCategory,
  GreetingStrategy,
} from '../enums/index.js';

export interface AdminUserDto {
  id: string;
  email: string;
  name: string;
  role: string;
  twoFactorEnabled: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface LeadDto {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  companyName: string | null;
  email: string;
  website: string | null;
  domain: string | null;
  country: string | null;
  city: string | null;
  phone: string | null;
  industry: string | null;
  serviceInterest: string | null;
  source: string | null;
  sourceRowNumber: number | null;
  customNotes: string | null;
  status: LeadStatus;
  lastContactedAt: Date | string | null;
  lastSenderId: string | null;
  lastTemplateId: string | null;
  campaignId: string | null;
  leadSourceId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SenderAccountDto {
  id: string;
  provider: SenderProvider;
  email: string;
  displayName: string;
  senderName: string;
  title: string | null;
  company: string;
  phone: string | null;
  website: string | null;
  signatureHtml: string | null;
  signatureText: string | null;
  signatureLogoUrl: string | null;
  status: SenderStatus;
  dailySendLimit: number;
  sentToday: number;
  remainingToday: number;
  lastSentAt: Date | string | null;
  enabled: boolean;
  priority: number;
  lastErrorMessage: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface TemplateDto {
  id: string;
  name: string;
  category: ServiceCategory;
  categories: string[];
  service: string | null;
  language: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  variables: string[];
  weight: number;
  active: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CampaignDto {
  id: string;
  name: string;
  description: string | null;
  serviceCategory: ServiceCategory;
  templateIds: string[];
  senderIds: string[];
  dailyCampaignLimit: number;
  perSenderLimit: number;
  delayMin: number;
  delayMax: number;
  scheduleStart: string;
  scheduleEnd: string;
  timezone: string;
  status: CampaignStatus;
  totalLeads: number;
  sentLeads: number;
  failedLeads: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface EmailLogDto {
  id: string;
  leadId: string | null;
  campaignId: string | null;
  senderId: string | null;
  templateId: string | null;
  provider: SenderProvider;
  recipient: string;
  subject: string;
  status: EmailLogStatus;
  providerMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  attemptNumber: number;
  queuedAt: Date | string;
  startedAt: Date | string | null;
  sentAt: Date | string | null;
  createdAt: Date | string;
}

export interface SuppressionEntryDto {
  id: string;
  email: string;
  domain: string | null;
  reason: SuppressionReason;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AuditLogDto {
  id: string;
  userId: string | null;
  module: string;
  action: string;
  status: string;
  referenceId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: Date | string;
}

// Import wizard types
export interface DetectedColumn {
  originalHeader: string;
  suggestedField: string | null;
  sampleValues: string[];
  confidence: number;
}

export interface ColumnMappingConfig {
  email: string;
  website?: string;
  name?: string;
  company?: string;
  country?: string;
  phone?: string;
  city?: string;
  industry?: string;
}

export interface ImportPreviewRow {
  rowNumber: number;
  raw: Record<string, any>;
  normalized: {
    email: string;
    domain?: string;
    website?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    companyName?: string;
    country?: string;
    phone?: string;
  };
  isValid: boolean;
  validationErrors: string[];
  isDuplicate: boolean;
  isSuppressed: boolean;
}

export interface ImportPreviewResult {
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  duplicateRowsCount: number;
  suppressedRowsCount: number;
  sampleRows: ImportPreviewRow[];
  headers: string[];
  detectedColumns: DetectedColumn[];
}

// Personalization Context
export interface PersonalizationVariables {
  first_name: string;
  last_name: string;
  full_name: string;
  company_name: string;
  email: string;
  website: string;
  domain: string;
  country: string;
  city: string;
  phone: string;
  industry: string;
  service: string;
  sender_name: string;
  sender_email: string;
  sender_title: string;
  sender_company: string;
  sender_website: string;
  sender_phone: string;
  sender_signature: string;
  campaign_name: string;
  current_date: string;
}

export interface RenderedEmail {
  subject: string;
  bodyHtml: string;
  bodyText: string;
}
