'use client';

import { Inter } from 'next/font/google';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAdminStore } from '@/store/admin.store';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const NAV = [
  { href: '/',            label: 'Panel de Control', icon: '⚡' },
  { href: '/users',       label: 'Usuarios',          icon: '👥' },
  { href: '/kyc-review',  label: 'Cola KYC',          icon: '🔐' },
  { href: '/alerts',      label: 'Alertas AML',       icon: '⚠️' },
];

function LoginGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, login } = useAdminStore();
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  if (!hydrated) return null;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-900/50">
              <span className="text-white font-black text-2xl">L</span>
            </div>
            <h1 className="text-2xl font-black text-white">LEN Admin</h1>
            <p className="text-gray-500 text-sm mt-1">Panel de administración interno</p>
          </div>

          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
                Contraseña de acceso
              </label>
              <input
                type="password"
                value={pwd}
                onChange={e => { setPwd(e.target.value); setErr(''); }}
                onKeyDown={e => { if (e.key === 'Enter') { if (!login(pwd)) setErr('Contraseña incorrecta'); } }}
                placeholder="••••••••"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm
                           focus:outline-none focus:border-indigo-500 placeholder:text-gray-600"
                autoFocus
              />
            </div>
            {err && <p className="text-red-400 text-xs text-center">{err}</p>}
            <button
              onClick={() => { if (!login(pwd)) setErr('Contraseña incorrecta'); }}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl
                         text-sm transition-colors"
            >
              Entrar →
            </button>
          </div>

          <p className="text-gray-600 text-xs text-center mt-6">
            Acceso restringido · Solo personal autorizado LEN
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function Sidebar() {
  const pathname = usePathname();
  const logout   = useAdminStore(s => s.logout);
  const liveMode = useAdminStore(s => s.liveMode);

  return (
    <aside className="w-60 bg-gray-900 text-white flex-shrink-0 flex flex-col border-r border-gray-800">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md">
            <span className="text-white font-black text-base">L</span>
          </div>
          <div>
            <p className="font-black text-white text-sm">LEN Admin</p>
            <p className="text-gray-500 text-[10px]">Panel de Control</p>
          </div>
        </div>
        {/* Live mode indicator */}
        <div className={`mt-3 flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full
          ${liveMode ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800'
                     : 'bg-amber-900/30 text-amber-400 border border-amber-800/50'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${liveMode ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          {liveMode ? 'Modo LIVE' : 'Modo DEMO'}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(item => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${active
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/50'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-800 space-y-2">
        <a href="https://web-production-1c372.up.railway.app" target="_blank" rel="noreferrer"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors">
          <span>🌐</span> App LEN →
        </a>
        <button onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-red-500
                     hover:bg-red-900/20 transition-colors">
          <span>🚪</span> Cerrar sesión
        </button>
        <p className="text-[10px] text-gray-600 px-3">GAFILAT / FATF Compliant</p>
      </div>
    </aside>
  );
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <title>LEN Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body className={`${inter.className} bg-gray-950`}>
        <LoginGate>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-gray-950">
              <div className="max-w-7xl mx-auto p-6">
                {children}
              </div>
            </main>
          </div>
        </LoginGate>
      </body>
    </html>
  );
}
