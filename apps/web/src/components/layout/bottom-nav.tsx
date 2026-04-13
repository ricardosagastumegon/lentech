'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Inicio',     icon: '🏠' },
  { href: '/send',      label: 'Enviar',     icon: '📤' },
  { href: '/receive',   label: 'Recibir',    icon: '📥' },
  { href: '/transactions', label: 'Historial', icon: '📋' },
  { href: '/settings',  label: 'Perfil',     icon: '👤' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-mondega-border z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors
                ${isActive
                  ? 'text-mondega-green bg-mondega-green/5'
                  : 'text-gray-400 hover:text-gray-600'}`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className={`text-xs font-medium ${isActive ? 'text-mondega-green' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
