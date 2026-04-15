'use client';

import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4"
         style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 55%, #4338CA 100%)' }}>
      <div className="w-full max-w-sm text-center">

        {/* Logo */}
        <div className="mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <span className="text-[#4338CA] font-black text-2xl">L</span>
          </div>
          <h1 className="text-2xl font-black text-white">LEN</h1>
          <p className="text-white/50 text-sm mt-1">Red TokenCoin · Mesoamérica</p>
        </div>

        {/* Coming soon card */}
        <div className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl p-8 space-y-5">
          <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center mx-auto">
            <span className="text-3xl">🚀</span>
          </div>

          <div>
            <h2 className="text-xl font-black text-white mb-2">Registro próximamente</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              El registro de nuevos usuarios estará disponible en el lanzamiento oficial de LEN.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left space-y-2">
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-3">Prueba la demo ahora</p>
            {[
              { flag: '🇬🇹', label: 'Guatemala', hint: 'demo-gt' },
              { flag: '🇲🇽', label: 'México',    hint: 'demo-mx' },
              { flag: '🇭🇳', label: 'Honduras',  hint: 'demo-hn' },
            ].map(c => (
              <div key={c.hint} className="flex items-center gap-2">
                <span>{c.flag}</span>
                <span className="text-white/70 text-sm">{c.label}</span>
                <span className="ml-auto text-white/30 text-xs font-mono">{c.hint}</span>
              </div>
            ))}
          </div>

          <Link
            href="/login"
            className="block w-full bg-white text-[#4338CA] font-black py-3 rounded-2xl text-sm
                       hover:bg-white/90 transition-colors"
          >
            Ir a iniciar sesión →
          </Link>
        </div>

        <p className="text-white/25 text-xs mt-6">
          GAFILAT / FATF Compliant · Solo personal autorizado
        </p>
      </div>
    </div>
  );
}
