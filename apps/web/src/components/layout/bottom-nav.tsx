'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-[22px] h-[22px] ${active ? 'text-len-purple' : 'text-gray-400'}`}
      fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 0 : 1.8}>
      {active
        ? <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        : <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      }
    </svg>
  );
}

function ActivityIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-[22px] h-[22px] ${active ? 'text-len-purple' : 'text-gray-400'}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d={active
          ? 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01'
          : 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
        }
      />
    </svg>
  );
}

function CardIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-[22px] h-[22px] ${active ? 'text-len-purple' : 'text-gray-400'}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-[22px] h-[22px] ${active ? 'text-len-purple' : 'text-gray-400'}`}
      fill={active ? 'currentColor' : 'none'} stroke={active ? 'none' : 'currentColor'} viewBox="0 0 24 24" strokeWidth={1.8}>
      {active
        ? <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        : <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      }
    </svg>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      {/* Glassmorphism bar */}
      <div className="bg-white/95 backdrop-blur-xl border-t border-len-border shadow-[0_-4px_24px_rgba(108,92,231,0.08)]">
        <div className="flex items-center max-w-lg mx-auto h-[68px] px-2 relative">

          {/* Home */}
          <Link href="/dashboard" className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-2xl transition-all
            ${isActive('/dashboard') ? 'text-len-purple' : 'text-gray-400 hover:text-gray-600'}`}>
            <HomeIcon active={isActive('/dashboard')} />
            <span className={`text-[10px] font-semibold tracking-tight
              ${isActive('/dashboard') ? 'text-len-purple' : 'text-gray-400'}`}>
              Inicio
            </span>
          </Link>

          {/* Activity */}
          <Link href="/transactions" className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-2xl transition-all
            ${isActive('/transactions') ? 'text-len-purple' : 'text-gray-400 hover:text-gray-600'}`}>
            <ActivityIcon active={isActive('/transactions')} />
            <span className={`text-[10px] font-semibold tracking-tight
              ${isActive('/transactions') ? 'text-len-purple' : 'text-gray-400'}`}>
              Actividad
            </span>
          </Link>

          {/* ── Center FAB: Send ── */}
          <div className="flex-none flex flex-col items-center justify-center -mt-6 px-3">
            <Link href="/send" className="group relative">
              {/* Glow ring */}
              <div className="absolute inset-0 rounded-full bg-len-gradient opacity-30 blur-md scale-110 group-hover:opacity-50 transition-opacity" />
              {/* Button */}
              <div className={`relative w-14 h-14 bg-len-gradient rounded-full shadow-len-lg
                flex items-center justify-center transition-transform group-hover:scale-105 group-active:scale-95
                ${isActive('/send') ? 'ring-4 ring-len-violet/40' : ''}`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
            </Link>
            <span className={`text-[10px] font-bold mt-1.5 tracking-tight
              ${isActive('/send') ? 'text-len-purple' : 'text-gray-400'}`}>
              Enviar
            </span>
          </div>

          {/* Card */}
          <Link href="/card" className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-2xl transition-all
            ${isActive('/card') ? 'text-len-purple' : 'text-gray-400 hover:text-gray-600'}`}>
            <CardIcon active={isActive('/card')} />
            <span className={`text-[10px] font-semibold tracking-tight
              ${isActive('/card') ? 'text-len-purple' : 'text-gray-400'}`}>
              Tarjeta
            </span>
          </Link>

          {/* Profile */}
          <Link href="/settings" className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-2xl transition-all
            ${isActive('/settings') ? 'text-len-purple' : 'text-gray-400 hover:text-gray-600'}`}>
            <ProfileIcon active={isActive('/settings')} />
            <span className={`text-[10px] font-semibold tracking-tight
              ${isActive('/settings') ? 'text-len-purple' : 'text-gray-400'}`}>
              Perfil
            </span>
          </Link>

        </div>

        {/* iPhone safe area padding */}
        <div className="h-safe-bottom bg-transparent" />
      </div>
    </nav>
  );
}
