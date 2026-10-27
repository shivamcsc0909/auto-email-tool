import { ServiceCategory } from '../enums/index.js';

export const APPLICATION_DAILY_SENDER_LIMIT = 20;

export const ROLE_BASED_EMAIL_PREFIXES = new Set([
  'info',
  'admin',
  'support',
  'sales',
  'hello',
  'contact',
  'office',
  'billing',
  'help',
  'team',
  'inquiries',
  'general',
  'service',
  'operation',
  'operations',
  'hostdesk',
  'press',
  'marketing',
  'jobs',
  'careers',
  'postmaster',
  'webmaster',
  'security',
]);

export const COLUMN_ALIASES: Record<string, string[]> = {
  email: [
    'email',
    'email id',
    'email_id',
    'email address',
    'registrant_email',
    'mail',
    'contact_email',
    'primary_email',
  ],
  website: [
    'website',
    'domain',
    'domain_name',
    'site',
    'website_url',
    'url',
    'web_address',
  ],
  country: [
    'country',
    'registrant_country',
    'country_name',
    'location_country',
  ],
  phone: [
    'phone',
    'contact number',
    'contact_number',
    'registrant_phone',
    'phone_number',
    'tel',
    'mobile',
  ],
  name: [
    'name',
    'client_name',
    'contact_name',
    'person_name',
    'full_name',
    'owner_name',
  ],
  company: [
    'company',
    'company_name',
    'business_name',
    'organization',
    'organization_name',
    'firm',
  ],
};

export interface SeedTemplateData {
  id: string;
  name: string;
  category: ServiceCategory;
  categories: ServiceCategory[];
  subject: string;
  bodyText: string;
  bodyHtml: string;
  weight: number;
}

export const SEED_TEMPLATES: SeedTemplateData[] = [
  {
    id: 'template-1',
    name: 'Mobile App Transformation',
    category: ServiceCategory.APP_DEVELOPMENT,
    categories: [ServiceCategory.APP_DEVELOPMENT, ServiceCategory.GENERAL_DIGITAL_SERVICES],
    subject: '📱 Transform Your Business with a Mobile App',
    bodyText: `Hi {{first_name}},

• In today's digital era, mobile app development is more affordable than ever before.
• People now spend more time on mobile phones than desktops, making apps the preferred customer touchpoint.
• Automate appointments, bookings, invoices, and client management while building recurring clients through a premium digital experience.

Best,
{{sender_name}}`,
    bodyHtml: `<p>Hi {{first_name}},</p>
<ul>
  <li>In today's digital era, mobile app development is more affordable than ever before.</li>
  <li>People now spend more time on mobile phones than desktops, making apps the preferred customer touchpoint.</li>
  <li>Automate appointments, bookings, invoices, and client management while building recurring clients through a premium digital experience.</li>
</ul>
<p>Best,<br>{{sender_name}}</p>`,
    weight: 1,
  },
  {
    id: 'template-2',
    name: 'Smarter Business Growth',
    category: ServiceCategory.APP_DEVELOPMENT,
    categories: [ServiceCategory.APP_DEVELOPMENT, ServiceCategory.GENERAL_DIGITAL_SERVICES],
    subject: '🚀 A Smarter Way to Grow Your Business',
    bodyText: `Hi {{first_name}},

• A custom mobile app helps automate your daily operations, saving both time and manual effort.
• With development costs now significantly lower than in previous years, it's a smart investment.
• Deliver a seamless customer experience that increases engagement and encourages recurring clients.

Best,
{{sender_name}}`,
    bodyHtml: `<p>Hi {{first_name}},</p>
<ul>
  <li>A custom mobile app helps automate your daily operations, saving both time and manual effort.</li>
  <li>With development costs now significantly lower than in previous years, it's a smart investment.</li>
  <li>Deliver a seamless customer experience that increases engagement and encourages recurring clients.</li>
</ul>
<p>Best,<br>{{sender_name}}</p>`,
    weight: 1,
  },
  {
    id: 'template-3',
    name: 'Customer Experience Upgrade',
    category: ServiceCategory.APP_DEVELOPMENT,
    categories: [ServiceCategory.APP_DEVELOPMENT, ServiceCategory.GENERAL_DIGITAL_SERVICES],
    subject: '💼 Upgrade Your Customer Experience',
    bodyText: `Hi {{first_name}},

• Today's customers expect instant access, online booking, and real-time updates from their phones.
• Since mobile usage has surpassed desktop usage, businesses with apps gain a competitive advantage.
• A dedicated app improves operations while helping you retain more recurring clients.

Best,
{{sender_name}}`,
    bodyHtml: `<p>Hi {{first_name}},</p>
<ul>
  <li>Today's customers expect instant access, online booking, and real-time updates from their phones.</li>
  <li>Since mobile usage has surpassed desktop usage, businesses with apps gain a competitive advantage.</li>
  <li>A dedicated app improves operations while helping you retain more recurring clients.</li>
</ul>
<p>Best,<br>{{sender_name}}</p>`,
    weight: 1,
  },
  {
    id: 'template-4',
    name: 'Run Smarter Operations',
    category: ServiceCategory.APP_DEVELOPMENT,
    categories: [ServiceCategory.APP_DEVELOPMENT, ServiceCategory.GENERAL_DIGITAL_SERVICES],
    subject: '📈 Build a Business That Runs Smarter',
    bodyText: `Hi {{first_name}},

• Mobile apps can automate bookings, invoices, scheduling, and customer management in one place.
• The cost of app development has become far more cost-effective than it was a few years ago.
• Enhance customer satisfaction, improve efficiency, and generate more recurring clients.

Best,
{{sender_name}}`,
    bodyHtml: `<p>Hi {{first_name}},</p>
<ul>
  <li>Mobile apps can automate bookings, invoices, scheduling, and customer management in one place.</li>
  <li>The cost of app development has become far more cost-effective than it was a few years ago.</li>
  <li>Enhance customer satisfaction, improve efficiency, and generate more recurring clients.</li>
</ul>
<p>Best,<br>{{sender_name}}</p>`,
    weight: 1,
  },
  {
    id: 'template-5',
    name: 'Better Digital Experience',
    category: ServiceCategory.APP_DEVELOPMENT,
    categories: [ServiceCategory.APP_DEVELOPMENT, ServiceCategory.GENERAL_DIGITAL_SERVICES],
    subject: '⭐ Give Your Customers a Better Digital Experience',
    bodyText: `Hi {{first_name}},

• People rely on mobile phones more than desktops, making a mobile app an essential business tool.
• A custom app simplifies your backend workflow while providing customers with a premium digital experience.
• It's an affordable way to increase efficiency, strengthen customer loyalty, and attract recurring clients.

Best,
{{sender_name}}`,
    bodyHtml: `<p>Hi {{first_name}},</p>
<ul>
  <li>People rely on mobile phones more than desktops, making a mobile app an essential business tool.</li>
  <li>A custom app simplifies your backend workflow while providing customers with a premium digital experience.</li>
  <li>It's an affordable way to increase efficiency, strengthen customer loyalty, and attract recurring clients.</li>
</ul>
<p>Best,<br>{{sender_name}}</p>`,
    weight: 1,
  },
  {
    id: 'template-6',
    name: 'Modern Websites & Apps',
    category: ServiceCategory.WEBSITE,
    categories: [ServiceCategory.WEBSITE, ServiceCategory.APP_DEVELOPMENT, ServiceCategory.GENERAL_DIGITAL_SERVICES],
    subject: 'Upgrade Your Business with a Mobile App',
    bodyText: `Hi {{first_name}},

• We build modern websites & mobile apps that help businesses attract and retain customers.
• A mobile app can automate bookings, scheduling, invoices & customer management in one place.
• With app development now more affordable, it's a smart way to improve efficiency and gain recurring clients.

Best,
{{sender_name}}`,
    bodyHtml: `<p>Hi {{first_name}},</p>
<ul>
  <li>We build modern websites & mobile apps that help businesses attract and retain customers.</li>
  <li>A mobile app can automate bookings, scheduling, invoices & customer management in one place.</li>
  <li>With app development now more affordable, it's a smart way to improve efficiency and gain recurring clients.</li>
</ul>
<p>Best,<br>{{sender_name}}</p>`,
    weight: 1,
  },
  {
    id: 'template-7',
    name: 'Make Your Business Mobile',
    category: ServiceCategory.APP_DEVELOPMENT,
    categories: [ServiceCategory.APP_DEVELOPMENT, ServiceCategory.GENERAL_DIGITAL_SERVICES],
    subject: 'Make Your Business More Mobile',
    bodyText: `Hi {{first_name}},

• Today's customers expect instant access, online booking & real-time updates from their phones.
• A custom app simplifies daily operations while delivering a premium customer experience.
• Better convenience means more engagement, loyalty, and recurring clients.

Best,
{{sender_name}}`,
    bodyHtml: `<p>Hi {{first_name}},</p>
<ul>
  <li>Today's customers expect instant access, online booking & real-time updates from their phones.</li>
  <li>A custom app simplifies daily operations while delivering a premium customer experience.</li>
  <li>Better convenience means more engagement, loyalty, and recurring clients.</li>
</ul>
<p>Best,<br>{{sender_name}}</p>`,
    weight: 1,
  },
  {
    id: 'template-8',
    name: 'Fast Modern Websites & Apps',
    category: ServiceCategory.WEBSITE,
    categories: [ServiceCategory.WEBSITE, ServiceCategory.GENERAL_DIGITAL_SERVICES],
    subject: 'A Smarter Digital Experience',
    bodyText: `Hi {{first_name}},

• We create fast, modern websites & apps that make your business easier to find and use.
• A strong digital experience can help businesses improve visibility, usability and customer engagement.
• A better digital experience can support more inquiries, better retention, and recurring clients.

Best,
{{sender_name}}`,
    bodyHtml: `<p>Hi {{first_name}},</p>
<ul>
  <li>We create fast, modern websites & apps that make your business easier to find and use.</li>
  <li>A strong digital experience can help businesses improve visibility, usability and customer engagement.</li>
  <li>A better digital experience can support more inquiries, better retention, and recurring clients.</li>
</ul>
<p>Best,<br>{{sender_name}}</p>`,
    weight: 1,
  },
  {
    id: 'template-9',
    name: 'Operations Automation',
    category: ServiceCategory.APP_DEVELOPMENT,
    categories: [ServiceCategory.APP_DEVELOPMENT, ServiceCategory.GENERAL_DIGITAL_SERVICES],
    subject: 'Automate Your Daily Operations',
    bodyText: `Hi {{first_name}},

• A custom mobile app can automate bookings, scheduling, invoices & customer management.
• It saves time and manual effort while keeping everything organized in one place.
• Improve efficiency, customer satisfaction, and build more recurring clients.

Best,
{{sender_name}}`,
    bodyHtml: `<p>Hi {{first_name}},</p>
<ul>
  <li>A custom mobile app can automate bookings, scheduling, invoices & customer management.</li>
  <li>It saves time and manual effort while keeping everything organized in one place.</li>
  <li>Improve efficiency, customer satisfaction, and build more recurring clients.</li>
</ul>
<p>Best,<br>{{sender_name}}</p>`,
    weight: 1,
  },
  {
    id: 'template-10',
    name: 'Stronger Digital Presence',
    category: ServiceCategory.DIGITAL_MARKETING,
    categories: [ServiceCategory.DIGITAL_MARKETING, ServiceCategory.WEBSITE, ServiceCategory.LOCAL_SEO, ServiceCategory.GENERAL_DIGITAL_SERVICES],
    subject: 'Build a Stronger Digital Presence',
    bodyText: `Hi {{first_name}},

• We help businesses grow with modern websites & mobile apps.
• A strong digital presence makes your business more accessible, credible, and convenient for customers.
• With mobile-first customers and more affordable development, it can be a practical way to drive more leads and recurring business.

Best,
{{sender_name}}`,
    bodyHtml: `<p>Hi {{first_name}},</p>
<ul>
  <li>We help businesses grow with modern websites & mobile apps.</li>
  <li>A strong digital presence makes your business more accessible, credible, and convenient for customers.</li>
  <li>With mobile-first customers and more affordable development, it can be a practical way to drive more leads and recurring business.</li>
</ul>
<p>Best,<br>{{sender_name}}</p>`,
    weight: 1,
  },
];
