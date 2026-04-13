'use client';

import { useAuthStore } from '@/store/auth.store';
import Link from 'next/link';

export function TopBar() {
  const { user } = useAuthStore();

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-mondega-border z-50 h-16">
      <div className="flex items-center justify-between h-full max-w-2xl mx-auto px-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-mondega-green rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <span className="font-bold text-mondega-dark text-sm hidden sm:block">Mondega</span>
        </Link>

        {/* KYC badge + notifications */}
        <div className="flex items-center gap-3">
          {user && (
            <Link
              href="/kyc"
              className={`text-xs font-medium px-2.5 py-1 rounded-full
                ${user.kycLevel >= 2 ? 'bg-green-100 text-green-800'
                  : user.kycLevel === 1 ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'}`}
            >
              KYC {['', 'Básico', 'Verificado', 'Business'][user.kycLevel] || 'Pendiente'}
            </Link>
          )}

          <Link
            href="/settings"
            className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <span className="text-sm">
              {user?.firstName?.[0]?.toUpperCase() ?? '👤'}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
