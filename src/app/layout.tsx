import type { Metadata } from 'next';
import { Suspense } from 'react';

import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MetaPixel } from '@/components/MetaPixel';
import { getCategories, getSiteSettings } from '@/lib/queries';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'SmartLar — Tudo o que a sua casa precisa',
    template: '%s | SmartLar',
  },
  description:
    'Eletrodomésticos, cozinha, organização, decoração e limpeza com entrega em Maputo e Matola. Pagamento por M-Pesa ou e-Mola.',
  applicationName: 'SmartLar',
  openGraph: {
    type: 'website',
    locale: 'pt_MZ',
    siteName: 'SmartLar',
    title: 'SmartLar — Tudo o que a sua casa precisa',
    description: 'Entregas em Maputo e Matola. Pagamento por M-Pesa ou e-Mola.',
    url: siteUrl,
  },
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
  icons: {
    icon: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SmartLar',
  },
};

export const viewport = {
  themeColor: '#0e1e3f',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [categories, settings] = await Promise.all([getCategories(), getSiteSettings()]);

  return (
    <html lang="pt-MZ">
      <body className="flex min-h-screen flex-col">
        <Suspense fallback={null}>
          <MetaPixel />
        </Suspense>

        <Suspense fallback={<div className="h-28 border-b border-navy-100" />}>
          <Header categories={categories} announcement={settings.announcement} />
        </Suspense>

        <main className="flex-1">{children}</main>

        <Footer categories={categories} settings={settings} />
      </body>
    </html>
  );
}
