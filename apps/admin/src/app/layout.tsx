import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mondega Admin — Panel de Control',
  description: 'Panel de administración interno Mondega Digital',
  robots: 'noindex, nofollow',
};

const NAV = [
  { href: '/dashboard',    label: 'Dashboard',       icon: '📊' },
  { href: '/users',        label: 'Usuarios',         icon: '👥' },
  { href: '/kyc-review',  label: 'Cola KYC',         icon: '🔐' },
  { href: '/alerts',       label: 'Alertas AML',      icon: '⚠️' },
  { href: '/transactions', label: 'Transacciones',    icon: '💸' },
  { href: '/reports',      label: 'Reportes',         icon: '📋' },
];

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-gray-50`}>
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="w-56 bg-gray-900 text-white flex-shrink-0 flex flex-col">
            <div className="px-5 py-6 border-b border-gray-800">
              <div className="text-lg font-bold text-white">Mondega</div>
              <div className="text-xs text-gray-400 mt-0.5">Admin Panel</div>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {NAV.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                    text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="px-5 py-4 border-t border-gray-800">
              <p className="text-xs text-gray-500">GAFILAT / FATF Compliant</p>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto p-6">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
