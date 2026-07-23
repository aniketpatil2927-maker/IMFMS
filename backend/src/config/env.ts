import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? '',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  /** Comma-separated list of allowed frontend origins (Vite may use 5173, 5174, …). */
  frontendUrls: (process.env.FRONTEND_URL ?? 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean),
  company: {
    name: process.env.COMPANY_NAME ?? 'IMMACULATE MASTERS FACILITY MANAGEMENT SERVICES',
    address: process.env.COMPANY_ADDRESS ?? 'Shop No. 20 A Wing Ground Floor, Meera Classic, Thergoan, Pune - 411033',
    email: process.env.COMPANY_EMAIL ?? 'Immculatefms2023@gmail.com',
    gst: process.env.COMPANY_GST ?? '27EBJPP6596G1ZY',
    pan: process.env.COMPANY_PAN ?? 'EBJPP6596G',
    phone: process.env.COMPANY_PHONE ?? '9356418873',
    phoneAlt: process.env.COMPANY_PHONE_ALT ?? '8551074434',
    signatory: process.env.COMPANY_SIGNATORY ?? 'Krishna Patil',
    bankName: process.env.COMPANY_BANK_NAME ?? 'Sarsawat Bank',
    bankAccount: process.env.COMPANY_BANK_ACCOUNT ?? '610000000032123',
    bankBranch: process.env.COMPANY_BANK_BRANCH ?? 'Datta Mandir Road Wakad',
    bankIfsc: process.env.COMPANY_BANK_IFSC ?? 'SRCB0000459',
    bankAccountType: process.env.COMPANY_BANK_ACCOUNT_TYPE ?? 'Current account',
  },
} as const;
