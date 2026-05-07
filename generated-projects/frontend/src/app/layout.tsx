/**
 * Root Layout Component - Swiss Clean Design
 *
 * Provides the application shell with:
 * - Theme configuration (light/dark mode)
 * - Font loading (Inter, Newsreader, JetBrains Mono)
 * - Provider wrapping
 *
 * Generated: 2026-05-07T08:59:26.657Z
 * Project: crm-app
 */

import type { Metadata } from 'next';
import { Inter, Newsreader, JetBrains_Mono } from 'next/font/google';
import { Providers } from '@/providers';
import { Toaster } from 'sonner';
import '@/styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
  axes: ['opsz'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'crm-app',
  description: 'Generated application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${newsreader.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <Providers>
          <main className="min-h-screen bg-background">
            {children}
          </main>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
