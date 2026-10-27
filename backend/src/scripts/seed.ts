import { prisma } from '../prisma.js';
import bcrypt from 'bcryptjs';
import { encryptToken } from '../utils/encryption.js';
import { seedTemplatesIfNoneExist } from '../modules/templates/templatesService.js';
import {
  SenderProvider,
  SenderStatus,
  LeadStatus,
  SuppressionReason,
  ServiceCategory,
  CampaignStatus,
} from '@rankrise/shared';

export async function runSeed() {
  console.log('🌱 Starting RankRiseUSA Platform Demo Seeding...');

  // 1. Seed Admin User
  const adminEmail = 'admin@rankriseusa.com';
  const existingAdmin = await prisma.adminUser.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('RankRiseAdmin2026!', 10);
    await prisma.adminUser.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
      },
    });
    console.log('✅ Admin user created: admin@rankriseusa.com / RankRiseAdmin2026!');
  } else {
    console.log('ℹ️ Admin user already exists: admin@rankriseusa.com');
  }

  // 2. Seed 10 Reference Templates
  await seedTemplatesIfNoneExist();
  console.log('✅ 10 Reference outreach templates initialized');

  // 3. Seed Demo Senders
  const mockToken = 'mock_demo_token_' + Date.now();
  const encAccess = encryptToken(mockToken);
  const encRefresh = encryptToken(mockToken + '_refresh');

  const sender1 = await prisma.senderAccount.upsert({
    where: { email: 'sarah.jenkins@rankriseusa.com' },
    update: { status: SenderStatus.CONNECTED },
    create: {
      email: 'sarah.jenkins@rankriseusa.com',
      provider: SenderProvider.GMAIL,
      displayName: 'Sarah Jenkins',
      senderName: 'Sarah Jenkins',
      title: 'Head of Client Growth',
      company: 'RankRiseUSA',
      phone: '+1 (555) 234-8901',
      website: 'https://rankriseusa.com',
      status: SenderStatus.CONNECTED,
      dailySendLimit: 20,
      sentToday: 0,
      enabled: true,
      priority: 1,
      encryptedAccessToken: encAccess,
      encryptedRefreshToken: encRefresh,
      tokenExpiry: new Date(Date.now() + 3600 * 1000 * 24 * 30),
      signatureHtml: `<div style="font-family: Arial, sans-serif; font-size: 13px; color: #333333; line-height: 1.4;">
  <p style="margin: 0 0 6px 0;">Best regards,</p>
  <p style="margin: 0; font-weight: bold; color: #1e293b; font-size: 14px;">Sarah Jenkins</p>
  <p style="margin: 0; color: #64748b; font-size: 12px;">Head of Client Growth | RankRiseUSA</p>
  <p style="margin: 4px 0 0 0; color: #0284c7; font-size: 12px;">
    📞 +1 (555) 234-8901 &bull; 🌐 <a href="https://rankriseusa.com" style="color: #0284c7; text-decoration: none;">rankriseusa.com</a>
  </p>
</div>`,
      signatureText: `Best regards,\nSarah Jenkins\nHead of Client Growth | RankRiseUSA\nPhone: +1 (555) 234-8901\nWeb: https://rankriseusa.com`,
    },
  });

  const sender2 = await prisma.senderAccount.upsert({
    where: { email: 'david.vance@rankriseusa.com' },
    update: { status: SenderStatus.CONNECTED },
    create: {
      email: 'david.vance@rankriseusa.com',
      provider: SenderProvider.MICROSOFT,
      displayName: 'David Vance',
      senderName: 'David Vance',
      title: 'Digital Outreach Specialist',
      company: 'RankRiseUSA',
      phone: '+1 (555) 345-6789',
      website: 'https://rankriseusa.com',
      status: SenderStatus.CONNECTED,
      dailySendLimit: 20,
      sentToday: 0,
      enabled: true,
      priority: 2,
      encryptedAccessToken: encAccess,
      encryptedRefreshToken: encRefresh,
      tokenExpiry: new Date(Date.now() + 3600 * 1000 * 24 * 30),
      signatureHtml: `<div style="font-family: Arial, sans-serif; font-size: 13px; color: #333333; line-height: 1.4;">
  <p style="margin: 0 0 6px 0;">Sincerely,</p>
  <p style="margin: 0; font-weight: bold; color: #1e293b; font-size: 14px;">David Vance</p>
  <p style="margin: 0; color: #64748b; font-size: 12px;">Digital Outreach Specialist | RankRiseUSA</p>
  <p style="margin: 4px 0 0 0; color: #0284c7; font-size: 12px;">
    📞 +1 (555) 345-6789 &bull; 🌐 <a href="https://rankriseusa.com" style="color: #0284c7; text-decoration: none;">rankriseusa.com</a>
  </p>
</div>`,
      signatureText: `Sincerely,\nDavid Vance\nDigital Outreach Specialist | RankRiseUSA\nPhone: +1 (555) 345-6789\nWeb: https://rankriseusa.com`,
    },
  });
  console.log('✅ 2 Demo sender accounts seeded (Sarah Jenkins - Google, David Vance - Microsoft)');

  // 4. Seed Realistic Business Leads
  const demoLeads = [
    {
      firstName: 'Michael',
      lastName: 'Scott',
      fullName: 'Michael Scott',
      companyName: 'Dunder Mifflin Paper Co',
      email: 'mscott@dundermifflinpaper.com',
      website: 'https://dundermifflinpaper.com',
      domain: 'dundermifflinpaper.com',
      country: 'United States',
      city: 'Scranton',
      phone: '+1 (570) 555-0123',
      industry: 'Office Supplies',
      serviceInterest: 'WEBSITE',
      source: 'Demo Seed',
      status: LeadStatus.READY,
    },
    {
      firstName: 'Elena',
      lastName: 'Rostova',
      fullName: 'Elena Rostova',
      companyName: 'Apex Dental Care',
      email: 'dr.elena@apexdentalcare.org',
      website: 'https://apexdentalcare.org',
      domain: 'apexdentalcare.org',
      country: 'United States',
      city: 'Austin',
      phone: '+1 (512) 555-0199',
      industry: 'Healthcare',
      serviceInterest: 'LOCAL_SEO',
      source: 'Demo Seed',
      status: LeadStatus.READY,
    },
    {
      firstName: 'Marcus',
      lastName: 'Chen',
      fullName: 'Marcus Chen',
      companyName: 'Summit Peak Coffee Roasters',
      email: 'marcus@summitpeakcoffee.com',
      website: 'https://summitpeakcoffee.com',
      domain: 'summitpeakcoffee.com',
      country: 'United States',
      city: 'Seattle',
      phone: '+1 (206) 555-0182',
      industry: 'Food & Beverage',
      serviceInterest: 'GOOGLE_BUSINESS_PROFILE',
      source: 'Demo Seed',
      status: LeadStatus.READY,
    },
    {
      firstName: 'Sophia',
      lastName: 'Turner',
      fullName: 'Sophia Turner',
      companyName: 'Nova Fitness Studios',
      email: 'sophia@novafitstudio.io',
      website: 'https://novafitstudio.io',
      domain: 'novafitstudio.io',
      country: 'United States',
      city: 'Denver',
      phone: '+1 (303) 555-0144',
      industry: 'Health & Wellness',
      serviceInterest: 'APP_DEVELOPMENT',
      source: 'Demo Seed',
      status: LeadStatus.READY,
    },
    {
      firstName: null,
      lastName: null,
      fullName: null,
      companyName: 'Vanguard Auto Mechanics',
      email: 'info@vanguardautoclinic.com',
      website: 'https://vanguardautoclinic.com',
      domain: 'vanguardautoclinic.com',
      country: 'United States',
      city: 'Chicago',
      phone: '+1 (312) 555-0177',
      industry: 'Automotive',
      serviceInterest: 'SEO',
      source: 'Demo Seed',
      status: LeadStatus.READY,
    },
  ];

  for (const lead of demoLeads) {
    const existing = await prisma.lead.findFirst({ where: { email: lead.email } });
    if (!existing) {
      await prisma.lead.create({ data: lead });
    } else {
      await prisma.lead.update({ where: { id: existing.id }, data: { status: LeadStatus.READY } });
    }
  }
  console.log(`✅ ${demoLeads.length} Demo leads seeded across industries`);

  // 5. Seed Suppression List
  await prisma.suppressionEntry.upsert({
    where: { email: 'unsubscribed-client@competitor.com' },
    update: {},
    create: {
      email: 'unsubscribed-client@competitor.com',
      reason: SuppressionReason.UNSUBSCRIBED,
      notes: 'Opted out via unsubscribe link demo',
    },
  });

  await prisma.suppressionEntry.upsert({
    where: { email: 'do-not-contact@example.org' },
    update: {},
    create: {
      email: 'do-not-contact@example.org',
      reason: SuppressionReason.MANUAL_BLOCK,
      notes: 'Executive requested exclusion',
    },
  });
  console.log('✅ 2 Suppression list entries seeded');

  // 6. Seed Sample Campaign
  const existingCampaign = await prisma.campaign.findFirst({
    where: { name: 'Q1 Local Business Modernization Campaign' },
  });

  if (!existingCampaign) {
    const templates = await prisma.template.findMany({ take: 2 });
    const templateIds = templates.map((t) => t.id);
    const leads = await prisma.lead.findMany({ take: 5 });

    const campaign = await prisma.campaign.create({
      data: {
        name: 'Q1 Local Business Modernization Campaign',
        description: 'Automated outreach targeting high-intent business owners with modernized web presence proposals.',
        serviceCategory: ServiceCategory.WEBSITE,
        templateIds,
        senderIds: [sender1.id, sender2.id],
        dailyCampaignLimit: 40,
        perSenderLimit: 20,
        delayMin: 60,
        delayMax: 180,
        scheduleStart: '09:00',
        scheduleEnd: '17:00',
        timezone: 'America/New_York',
        status: CampaignStatus.DRAFT,
        totalLeads: leads.length,
        sentLeads: 0,
        failedLeads: 0,
        campaignLeads: {
          create: leads.map((l) => ({
            leadId: l.id,
            status: 'PENDING',
          })),
        },
      },
    });
    console.log(`✅ Sample campaign created: "${campaign.name}" (ID: ${campaign.id})`);
  }

  console.log('\n🎉 RankRiseUSA Outreach Platform Seeding Complete!\n');
}

// Run directly if called as a script
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  runSeed()
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
