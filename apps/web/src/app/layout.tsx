import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mondega Digital — La moneda digital de Guatemala y Mesoamérica',
  description: 'Envía y recibe dinero en toda Mesoamérica al instante con las monedas digitales más rápidas de la región.',
  icons: { icon: '/favicon.ico' },
  openGraph: {
    title: 'Mondega Digital',
    description: 'La moneda digital de Mesoamérica',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
