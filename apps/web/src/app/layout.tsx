import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'LEN — La red de TokenCoins de Mesoamérica',
  description: 'Envía dinero entre Guatemala, México y Centroamérica al instante. QUETZA · MEXCOIN · LEMPI y más. Comisiones desde 0.3%.',
  icons: { icon: '/favicon.ico' },
  openGraph: {
    title: 'LEN — TokenCoins de Mesoamérica',
    description: 'La red de monedas digitales nativa de Mesoamérica',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
