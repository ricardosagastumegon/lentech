'use client';

import { useState, useEffect, useRef } from 'react';

// ─── Slide data ───────────────────────────────────────────────────────────────
const SLIDES = [
  'hero',
  'problem',
  'solution',
  'network',
  'wallet',
  'security',
  'banks',
  'flow',
  'tech',
  'roadmap',
  'traction',
  'team',
] as const;

type SlideId = typeof SLIDES[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Chip({ children, color = 'purple' }: { children: React.ReactNode; color?: 'purple' | 'green' | 'amber' | 'blue' }) {
  const cls = {
    purple: 'bg-[#6C5CE7]/15 text-[#6C5CE7] border border-[#6C5CE7]/30',
    green:  'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    amber:  'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    blue:   'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  }[color];
  return <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${cls}`}>{children}</span>;
}

function StatCard({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
      <div className="text-3xl font-black text-white">{value}</div>
      <div className="text-white/60 text-sm mt-1">{label}</div>
      {sub && <div className="text-white/30 text-xs mt-0.5">{sub}</div>}
    </div>
  );
}

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 bg-[#6C5CE7]/20 border border-[#6C5CE7]/40 rounded-full px-4 py-1.5 text-[#A29BFE] text-xs font-bold uppercase tracking-widest mb-6">
      {children}
    </div>
  );
}

// ─── Individual slides ────────────────────────────────────────────────────────

function SlideHero() {
  return (
    <div className="flex flex-col items-center justify-center text-center h-full px-8 space-y-8">
      {/* Logo */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl">
          <span className="text-[#6C5CE7] font-black text-3xl">L</span>
        </div>
        <span className="text-white font-black text-5xl tracking-tight">LEN</span>
      </div>

      <div className="space-y-4 max-w-3xl">
        <h1 className="text-5xl lg:text-7xl font-black text-white leading-[1.05]">
          La red de <span className="text-[#A29BFE]">TokenCoins</span><br />
          nativa de Mesoamérica
        </h1>
        <p className="text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
          Transferencias instantáneas entre Guatemala, México y Honduras.
          Un token por moneda, respaldado 1:1. Sin bancos intermediarios.
        </p>
      </div>

      {/* Country pills */}
      <div className="flex flex-wrap gap-3 justify-center">
        {[
          { flag: '🇬🇹', code: 'QUETZA', fiat: 'GTQ' },
          { flag: '🇲🇽', code: 'MEXCOIN', fiat: 'MXN' },
          { flag: '🇭🇳', code: 'LEMPI', fiat: 'HNL' },
          { flag: '🇸🇻', code: 'COLÓN', fiat: 'USD', soon: true },
          { flag: '🇨🇷', code: 'CORI', fiat: 'CRC', soon: true },
        ].map(c => (
          <div key={c.code}
            className={`flex items-center gap-2 rounded-full px-4 py-2 border backdrop-blur
              ${c.soon
                ? 'bg-white/5 border-white/10 text-white/40'
                : 'bg-white/15 border-white/30 text-white'}`}
          >
            <span className="text-lg">{c.flag}</span>
            <span className="font-bold text-sm">{c.code}</span>
            <span className={`text-xs ${c.soon ? 'text-white/30' : 'text-white/50'}`}>
              {c.soon ? 'pronto' : `= 1 ${c.fiat}`}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 pt-4">
        <StatCard value="3" label="Países activos" sub="Fase 1" />
        <StatCard value="0.3%" label="Comisión mínima" sub="vs 5-8% WU/Remitly" />
        <StatCard value="$800B" label="TAM remesas" sub="Mesoamérica 2024" />
      </div>
    </div>
  );
}

function SlideProblem() {
  const problems = [
    {
      icon: '💸',
      title: '5–8% de comisión',
      desc: 'Western Union, Remitly y MoneyGram cobran entre $5 y $40 por envío. En remesas de $300 eso es el 13%.',
      stat: '$48B perdidos en fees al año solo en Mesoamérica',
    },
    {
      icon: '⏳',
      title: '1–5 días de espera',
      desc: 'Las transferencias bancarias internacionales entre Guatemala, México y Honduras tardan días hábiles.',
      stat: '47% de receptores necesitan el dinero el mismo día',
    },
    {
      icon: '🏦',
      title: '65% sin cuenta bancaria',
      desc: 'La mayoría de la población en CA no tiene acceso a servicios financieros formales.',
      stat: '38M personas desbancarizadas en la región',
    },
    {
      icon: '📱',
      title: 'Sin infraestructura común',
      desc: 'Cada país tiene su sistema. No hay una "SPEI mesoamericana". Los bancos no hablan entre sí.',
      stat: 'Cada remesa cruza 3–4 intermediarios',
    },
  ];

  return (
    <div className="flex flex-col h-full px-8 py-6">
      <SectionTag>01 — El Problema</SectionTag>
      <h2 className="text-4xl lg:text-5xl font-black text-white mb-3">
        Mover dinero en<br /><span className="text-red-400">Mesoamérica está roto</span>
      </h2>
      <p className="text-white/50 text-lg mb-10">
        El 12% del PIB de Guatemala son remesas. El costo de enviarlas es inaceptable.
      </p>

      <div className="grid grid-cols-2 gap-5 flex-1">
        {problems.map(p => (
          <div key={p.icon} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-3">
            <span className="text-4xl">{p.icon}</span>
            <div>
              <p className="text-white font-black text-lg">{p.title}</p>
              <p className="text-white/50 text-sm mt-1 leading-relaxed">{p.desc}</p>
            </div>
            <div className="mt-auto bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <p className="text-red-400 text-xs font-bold">{p.stat}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideSolution() {
  return (
    <div className="flex flex-col h-full px-8 py-6">
      <SectionTag>02 — La Solución</SectionTag>
      <h2 className="text-4xl lg:text-5xl font-black text-white mb-3">
        Un token por país.<br /><span className="text-[#A29BFE]">Un solo sistema.</span>
      </h2>
      <p className="text-white/50 text-lg mb-8">
        LEN emite tokens digitales respaldados 1:1 con la moneda local de cada país.
        Transferir QUETZA a LEMPI es instantáneo, trazable y cuesta 0.3%.
      </p>

      {/* Flow diagram */}
      <div className="flex items-center justify-center gap-3 mb-10 flex-wrap">
        {[
          { label: 'Carlos en GT', sub: 'deposita Q 500', bg: 'bg-indigo-500/20 border-indigo-500/40', text: 'text-indigo-300' },
          { label: '→', sub: '', bg: 'bg-transparent border-transparent', text: 'text-white/30 text-3xl font-black' },
          { label: 'QUETZA', sub: '500 tokens', bg: 'bg-[#6C5CE7]/25 border-[#6C5CE7]/50', text: 'text-[#A29BFE]' },
          { label: '→', sub: '', bg: 'bg-transparent border-transparent', text: 'text-white/30 text-3xl font-black' },
          { label: 'FX Engine', sub: '0.3% fee', bg: 'bg-emerald-500/15 border-emerald-500/30', text: 'text-emerald-400' },
          { label: '→', sub: '', bg: 'bg-transparent border-transparent', text: 'text-white/30 text-3xl font-black' },
          { label: 'LEMPI', sub: '1,280 tokens', bg: 'bg-[#6C5CE7]/25 border-[#6C5CE7]/50', text: 'text-[#A29BFE]' },
          { label: '→', sub: '', bg: 'bg-transparent border-transparent', text: 'text-white/30 text-3xl font-black' },
          { label: 'María en HN', sub: 'recibe L 1,280', bg: 'bg-indigo-500/20 border-indigo-500/40', text: 'text-indigo-300' },
        ].map((item, i) => (
          item.label === '→'
            ? <div key={i} className="text-white/30 text-3xl font-black">→</div>
            : (
              <div key={i} className={`border rounded-2xl px-5 py-3 text-center ${item.bg}`}>
                <p className={`font-black text-sm ${item.text}`}>{item.label}</p>
                {item.sub && <p className="text-white/40 text-xs mt-0.5">{item.sub}</p>}
              </div>
            )
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {[
          { icon: '⚡', title: 'Instantáneo', desc: 'Transferencia confirmada en segundos. Sin días de espera bancaria.' },
          { icon: '🔒', title: 'Respaldado 1:1', desc: 'Cada token tiene 1 unidad de moneda local en reserva bancaria segregada.' },
          { icon: '🌎', title: 'Sin fronteras', desc: 'El mismo sistema funciona en todos los países LEN. FX automático.' },
        ].map(f => (
          <div key={f.icon} className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <span className="text-3xl">{f.icon}</span>
            <p className="text-white font-black mt-2">{f.title}</p>
            <p className="text-white/50 text-sm mt-1 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideNetwork() {
  const coins = [
    { flag: '🇬🇹', code: 'QUETZA',  fiat: 'GTQ', country: 'Guatemala',   color: '#6C5CE7', phase: 1, status: 'Activo' },
    { flag: '🇲🇽', code: 'MEXCOIN', fiat: 'MXN', country: 'México',       color: '#6C5CE7', phase: 1, status: 'Activo' },
    { flag: '🇭🇳', code: 'LEMPI',   fiat: 'HNL', country: 'Honduras',     color: '#6C5CE7', phase: 1, status: 'Activo' },
    { flag: '🇸🇻', code: 'COLÓN',   fiat: 'USD', country: 'El Salvador',  color: '#374151', phase: 2, status: 'Q3 2025' },
    { flag: '🇧🇿', code: 'TIKAL',   fiat: 'BZD', country: 'Belize',       color: '#374151', phase: 3, status: 'Q1 2026' },
    { flag: '🇳🇮', code: 'NICORD',  fiat: 'NIO', country: 'Nicaragua',    color: '#374151', phase: 3, status: 'Q1 2026' },
    { flag: '🇨🇷', code: 'CORI',    fiat: 'CRC', country: 'Costa Rica',   color: '#374151', phase: 3, status: 'Q2 2026' },
    { flag: '🇵🇦', code: 'BALBÓA',  fiat: 'USD', country: 'Panamá',       color: '#374151', phase: 3, status: 'Q3 2026' },
  ];

  return (
    <div className="flex flex-col h-full px-8 py-6">
      <SectionTag>03 — Red TokenCoin</SectionTag>
      <h2 className="text-4xl font-black text-white mb-2">
        Un token por moneda,<br /><span className="text-[#A29BFE]">un sistema para toda la región</span>
      </h2>
      <p className="text-white/50 mb-8">8 países · 8 monedas · 1 red · Expansión por fases</p>

      <div className="grid grid-cols-4 gap-4 flex-1">
        {coins.map(c => (
          <div key={c.code}
            className={`rounded-2xl border p-5 flex flex-col gap-3 transition-all
              ${c.phase === 1
                ? 'bg-[#6C5CE7]/15 border-[#6C5CE7]/40'
                : 'bg-white/3 border-white/8 opacity-60'}`}
          >
            <div className="flex items-start justify-between">
              <span className="text-4xl">{c.flag}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                ${c.phase === 1
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white/5 text-white/30 border border-white/10'}`}>
                {c.status}
              </span>
            </div>
            <div>
              <p className={`font-black text-lg ${c.phase === 1 ? 'text-white' : 'text-white/40'}`}>{c.code}</p>
              <p className={`text-sm ${c.phase === 1 ? 'text-white/50' : 'text-white/25'}`}>{c.country}</p>
              <p className={`text-xs font-mono mt-1 ${c.phase === 1 ? 'text-[#A29BFE]' : 'text-white/20'}`}>
                1 {c.code} = 1 {c.fiat}
              </p>
            </div>
            <div className={`text-xs font-bold px-2 py-1 rounded-lg text-center
              ${c.phase === 1 ? 'bg-white/5 text-white/50' : 'bg-white/3 text-white/20'}`}>
              Fase {c.phase}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideWallet() {
  const features = [
    {
      icon: '💰',
      title: 'Balance dual',
      desc: 'Cada wallet tiene saldo fiat (dinero sin convertir) y tokens. El usuario controla cuándo convierte.',
      chips: ['fiatBalance', 'tokenBalance'],
    },
    {
      icon: '🔄',
      title: 'Compra / Venta de tokens',
      desc: 'Conversión 1:1 entre fiat local y tokens. Compra sin comisión. Venta al 0.5%.',
      chips: ['1:1 peg', '0.5% sell fee'],
    },
    {
      icon: '📤',
      title: 'Envío P2P',
      desc: 'Transferencia instantánea a cualquier usuario LEN. Mismo país: gratis. Internacional: 0.3%.',
      chips: ['Instant', '0.3% FX'],
    },
    {
      icon: '🏦',
      title: 'Retiro bancario',
      desc: 'El usuario retira fiat a su cuenta bancaria real. SPEI inmediato en MX, 1h en GT/HN.',
      chips: ['IBAN GT', 'CLABE MX', 'IBAN HN'],
    },
    {
      icon: '🧾',
      title: 'Comprobante digital',
      desc: 'Cada transacción genera un voucher PNG compartible. Canvas 2D, funciona en todos los móviles.',
      chips: ['PNG', 'Share API'],
    },
    {
      icon: '📊',
      title: 'Historial completo',
      desc: 'Rastreo de cada centavo: tipo, estado, ID único, fecha, comisión. Todos los movimientos.',
      chips: ['TX ID', 'Auditoria'],
    },
  ];

  return (
    <div className="flex flex-col h-full px-8 py-6">
      <SectionTag>04 — La Wallet</SectionTag>
      <h2 className="text-4xl font-black text-white mb-2">
        Más que una billetera —<br /><span className="text-[#A29BFE]">un banco en el bolsillo</span>
      </h2>
      <p className="text-white/50 mb-8">Disponible en iOS, Android y Web. Sin cuenta bancaria necesaria.</p>

      <div className="grid grid-cols-3 gap-4 flex-1">
        {features.map(f => (
          <div key={f.icon} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
            <span className="text-3xl">{f.icon}</span>
            <div className="flex-1">
              <p className="text-white font-black">{f.title}</p>
              <p className="text-white/50 text-sm mt-1 leading-relaxed">{f.desc}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {f.chips.map(c => (
                <span key={c} className="text-[10px] font-bold bg-[#6C5CE7]/20 text-[#A29BFE] border border-[#6C5CE7]/30 px-2 py-0.5 rounded-full">
                  {c}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideSecurity() {
  return (
    <div className="flex flex-col h-full px-8 py-6">
      <SectionTag>05 — Seguridad</SectionTag>
      <h2 className="text-4xl font-black text-white mb-2">
        Seguridad de grado<br /><span className="text-[#A29BFE]">institucional financiero</span>
      </h2>
      <p className="text-white/50 mb-8">Cada capa protege contra un vector de ataque distinto.</p>

      <div className="grid grid-cols-2 gap-6 flex-1">
        {/* Left — Layers */}
        <div className="space-y-3">
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">Capas de seguridad</p>
          {[
            { n: '01', title: 'Autenticación con PIN',       desc: 'PIN de 6 dígitos hasheado con bcrypt (salt rounds 12). Nunca en texto plano.', color: 'text-[#A29BFE]' },
            { n: '02', title: 'JWT + Refresh Token',          desc: 'Access token 15 min. Refresh token 30 días con rotación. Blacklist en Redis.', color: 'text-emerald-400' },
            { n: '03', title: 'HMAC-SHA256 en webhooks',      desc: 'Cada webhook bancario lleva firma digital. Rechazado si no coincide.', color: 'text-amber-400' },
            { n: '04', title: 'Idempotencia bancaria',        desc: 'externalReference con UNIQUE constraint en DB. El mismo depósito no se acredita dos veces.', color: 'text-blue-400' },
            { n: '05', title: 'Replay prevention',            desc: 'Webhooks con timestamp. Se rechazan si tienen más de 5 minutos de antigüedad.', color: 'text-rose-400' },
            { n: '06', title: 'Cuentas segregadas',           desc: 'Fondos de usuarios en cuentas separadas del capital operativo (requerimiento regulatorio).', color: 'text-purple-400' },
          ].map(l => (
            <div key={l.n} className="flex items-start gap-4 bg-white/4 border border-white/8 rounded-xl p-4">
              <span className={`font-black text-lg ${l.color} flex-shrink-0 w-8`}>{l.n}</span>
              <div>
                <p className="text-white font-bold text-sm">{l.title}</p>
                <p className="text-white/40 text-xs mt-0.5 leading-relaxed">{l.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Right — Compliance + KYC */}
        <div className="space-y-4">
          <div className="bg-white/4 border border-white/10 rounded-2xl p-6">
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">KYC / Cumplimiento</p>
            <div className="space-y-3">
              {[
                { level: 'KYC 0', limit: 'Solo visualización', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
                { level: 'KYC 1', limit: 'Q 5,000 / día', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
                { level: 'KYC 2', limit: 'Q 25,000 / día', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
                { level: 'KYC 3', limit: 'Sin límite (institucional)', color: 'bg-[#6C5CE7]/20 text-[#A29BFE] border-[#6C5CE7]/30' },
              ].map(k => (
                <div key={k.level} className="flex items-center justify-between">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${k.color}`}>{k.level}</span>
                  <span className="text-white/50 text-sm">{k.limit}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/4 border border-white/10 rounded-2xl p-6">
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">Stack de cumplimiento</p>
            <div className="space-y-2">
              {[
                '✓ AML — Monitoreo de transacciones en tiempo real',
                '✓ LAFT — Ley contra Lavado de Activos (GT)',
                '✓ FATF — Estándares internacionales de reporte',
                '✓ Almacenamiento de logs 5 años (auditoría)',
                '✓ Reporte automático de operaciones sospechosas',
              ].map(item => (
                <p key={item} className="text-white/60 text-sm">{item}</p>
              ))}
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-5">
            <p className="text-amber-400 font-bold text-sm mb-1">🏛 Estructura regulatoria</p>
            <p className="text-amber-300/70 text-xs leading-relaxed">
              LEN opera como Institución de Moneda Electrónica (IME) en GT bajo supervisión SIB.
              Licencias equivalentes en MX (SOFOM / CNBV) y HN (CNBS) — en proceso.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideBanks() {
  return (
    <div className="flex flex-col h-full px-8 py-6">
      <SectionTag>06 — Conectividad Bancaria</SectionTag>
      <h2 className="text-4xl font-black text-white mb-2">
        Cuentas virtuales dedicadas<br /><span className="text-[#A29BFE]">por usuario, por país</span>
      </h2>
      <p className="text-white/50 mb-8">
        LEN no recibe el dinero — el banco del usuario recibe el depósito y notifica a LEN automáticamente.
      </p>

      <div className="grid grid-cols-3 gap-5 mb-6">
        {[
          {
            flag: '🇬🇹', country: 'Guatemala', currency: 'GTQ',
            bank: 'Banrural / BAM',
            mechanism: 'Cuenta pool LEN + referencia única 8 dígitos por usuario',
            how: 'Usuario transfiere a cuenta Banrural de LEN incluyendo su código personal. Webhook HMAC confirma el depósito.',
            eta: '15–30 min',
            color: 'border-blue-500/30 bg-blue-500/8',
            banks: ['Banrural', 'BAM', 'Industrial', 'G&T', 'Agromercantil'],
          },
          {
            flag: '🇲🇽', country: 'México', currency: 'MXN',
            bank: 'STP / SPEI',
            mechanism: 'CLABE virtual de 18 dígitos exclusiva por usuario',
            how: 'Cada usuario tiene su propia CLABE. El depósito llega directo. SPEI notifica en tiempo real via webhook.',
            eta: 'Inmediato 24/7',
            color: 'border-emerald-500/30 bg-emerald-500/8',
            banks: ['BBVA', 'Santander', 'Banamex', 'HSBC', 'Banorte', '+50 más'],
          },
          {
            flag: '🇭🇳', country: 'Honduras', currency: 'HNL',
            bank: 'BAC Credomatic',
            mechanism: 'Cuenta pool LEN + referencia única 8 dígitos por usuario',
            how: 'Mismo modelo que GT. BAC firma los webhooks con HMAC-SHA256. Soporta retiro a todos los bancos HN.',
            eta: '30–60 min',
            color: 'border-[#6C5CE7]/30 bg-[#6C5CE7]/8',
            banks: ['Atlántida', 'BAC', 'Ficohsa', 'Banpaís', 'Occidente'],
          },
        ].map(c => (
          <div key={c.country} className={`border rounded-2xl p-5 flex flex-col gap-4 ${c.color}`}>
            <div className="flex items-center gap-2">
              <span className="text-3xl">{c.flag}</span>
              <div>
                <p className="text-white font-black">{c.country}</p>
                <p className="text-white/40 text-xs">{c.currency} · {c.bank}</p>
              </div>
            </div>

            <div className="bg-black/20 rounded-xl p-3">
              <p className="text-white/30 text-[10px] font-bold uppercase tracking-wider mb-1">Mecanismo</p>
              <p className="text-white/80 text-xs leading-relaxed">{c.mechanism}</p>
            </div>

            <p className="text-white/50 text-xs leading-relaxed flex-1">{c.how}</p>

            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">Tiempo acreditación</span>
              <span className="text-xs font-bold text-emerald-400">{c.eta}</span>
            </div>

            <div className="flex flex-wrap gap-1">
              {c.banks.map(b => (
                <span key={b} className="text-[10px] bg-white/5 text-white/40 border border-white/10 px-2 py-0.5 rounded-full">
                  {b}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Security row */}
      <div className="bg-white/4 border border-white/10 rounded-2xl p-4 flex items-center gap-6">
        <p className="text-white/30 text-xs font-bold uppercase tracking-widest flex-shrink-0">Seguridad bancaria</p>
        <div className="flex flex-wrap gap-3 flex-1">
          {[
            '🔐 HMAC-SHA256 en cada webhook',
            '⏱ Replay prevention (5 min TTL)',
            '🔁 Idempotencia garantizada',
            '🏛 Cuentas segregadas por ley',
            '📋 Auditoría completa de cada depósito',
          ].map(item => (
            <span key={item} className="text-white/50 text-xs bg-white/3 border border-white/8 px-3 py-1.5 rounded-xl">{item}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlideFlow() {
  const steps = [
    {
      n: '1', title: 'Usuario se registra', detail: 'KYC básico (DPI/INE/DNI). Wallet creada automáticamente.',
      icon: '👤', color: 'bg-indigo-500/20 border-indigo-500/40',
    },
    {
      n: '2', title: 'Cuenta virtual generada', detail: 'GT/HN: referencia 8-char. MX: CLABE virtual exclusiva de 18 dígitos.',
      icon: '🏦', color: 'bg-blue-500/20 border-blue-500/40',
    },
    {
      n: '3', title: 'Depósito bancario', detail: 'Usuario transfiere desde su banco a la cuenta LEN (con referencia o CLABE).',
      icon: '💳', color: 'bg-[#6C5CE7]/20 border-[#6C5CE7]/40',
    },
    {
      n: '4', title: 'Webhook bancario', detail: 'Banco notifica a LEN en tiempo real. Firma HMAC verificada al instante.',
      icon: '📡', color: 'bg-purple-500/20 border-purple-500/40',
    },
    {
      n: '5', title: 'Fiat acreditado', detail: 'fiatBalance aumenta automáticamente. Usuario ve el saldo en segundos.',
      icon: '✅', color: 'bg-emerald-500/20 border-emerald-500/40',
    },
    {
      n: '6', title: 'Compra tokens', detail: '1:1 conversión fiat → tokens. Sin comisión de entrada.',
      icon: '🪙', color: 'bg-amber-500/20 border-amber-500/40',
    },
    {
      n: '7', title: 'Envío / FX', detail: 'Transfiere a cualquier usuario LEN. FX automático si es diferente moneda.',
      icon: '📤', color: 'bg-[#6C5CE7]/20 border-[#6C5CE7]/40',
    },
    {
      n: '8', title: 'Retiro bancario', detail: 'Vende tokens → fiat → retira a su cuenta bancaria. SPEI inmediato.',
      icon: '🏧', color: 'bg-indigo-500/20 border-indigo-500/40',
    },
  ];

  return (
    <div className="flex flex-col h-full px-8 py-6">
      <SectionTag>07 — Flujo Completo</SectionTag>
      <h2 className="text-4xl font-black text-white mb-2">
        Del banco al banco —<br /><span className="text-[#A29BFE]">pasando por LEN</span>
      </h2>
      <p className="text-white/50 mb-8">El ciclo completo de vida del dinero dentro del sistema LEN.</p>

      <div className="grid grid-cols-4 gap-4 flex-1">
        {steps.map((s, i) => (
          <div key={s.n} className={`border rounded-2xl p-5 flex flex-col gap-3 ${s.color} relative`}>
            {i < steps.length - 1 && (
              <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 text-white/20 text-lg z-10">→</div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-2xl">{s.icon}</span>
              <span className="text-xs font-black text-white/30 bg-white/5 w-7 h-7 rounded-full flex items-center justify-center">
                {s.n}
              </span>
            </div>
            <div>
              <p className="text-white font-black text-sm">{s.title}</p>
              <p className="text-white/50 text-xs mt-1 leading-relaxed">{s.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideTech() {
  return (
    <div className="flex flex-col h-full px-8 py-6">
      <SectionTag>08 — Stack Tecnológico</SectionTag>
      <h2 className="text-4xl font-black text-white mb-2">
        Arquitectura de microservicios<br /><span className="text-[#A29BFE]">lista para escalar a millones</span>
      </h2>
      <p className="text-white/50 mb-8">Monorepo Turborepo · Railway · NestJS · Next.js 14 · Firebase</p>

      <div className="grid grid-cols-3 gap-5 flex-1">
        {/* Frontend */}
        <div className="bg-white/4 border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📱</span>
            <p className="text-white font-black">Frontend / App</p>
          </div>
          <div className="space-y-2 flex-1">
            {[
              { name: 'Next.js 14',        role: 'Web app (App Router)' },
              { name: 'React Native',       role: 'iOS + Android (Expo)' },
              { name: 'Zustand',            role: 'Estado global + persist' },
              { name: 'TailwindCSS',        role: 'UI system (LEN design)' },
              { name: 'Firebase Firestore', role: 'Sync cross-device demo' },
              { name: 'Canvas 2D API',      role: 'Vouchers PNG (sin deps)' },
            ].map(t => (
              <div key={t.name} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                <span className="text-white/80 text-sm font-semibold">{t.name}</span>
                <span className="text-white/30 text-xs">{t.role}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Backend services */}
        <div className="bg-white/4 border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚙️</span>
            <p className="text-white font-black">Microservicios</p>
          </div>
          <div className="space-y-2 flex-1">
            {[
              { name: 'auth-service',         role: 'JWT, PIN, KYC' },
              { name: 'wallet-service',        role: 'Balances, TX, tokens' },
              { name: 'fiat-bridge',           role: 'Depósitos / retiros banco' },
              { name: 'fx-engine',             role: 'Tipos de cambio en tiempo real' },
              { name: 'tx-engine',             role: 'Motor de transacciones' },
              { name: 'notification',          role: 'Push / SMS / Email' },
            ].map(t => (
              <div key={t.name} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                <span className="text-white/80 text-xs font-mono">{t.name}</span>
                <span className="text-white/30 text-xs">{t.role}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Infra */}
        <div className="bg-white/4 border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏗️</span>
            <p className="text-white font-black">Infraestructura</p>
          </div>
          <div className="space-y-2 flex-1">
            {[
              { name: 'Railway',      role: 'Deploy automático (Nixpacks)' },
              { name: 'PostgreSQL',   role: 'DB principal (Railway)' },
              { name: 'Redis',        role: 'Cache + colas Bull' },
              { name: 'NestJS',       role: 'Framework backend (TypeScript)' },
              { name: 'TypeORM',      role: 'ORM + migraciones' },
              { name: 'Bull / BullMQ',role: 'Procesamiento async webhooks' },
            ].map(t => (
              <div key={t.name} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                <span className="text-white/80 text-sm font-semibold">{t.name}</span>
                <span className="text-white/30 text-xs">{t.role}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="col-span-3 bg-[#6C5CE7]/10 border border-[#6C5CE7]/30 rounded-2xl p-5">
          <p className="text-[#A29BFE] font-bold mb-3 text-sm uppercase tracking-widest">Seguridad del Stack</p>
          <div className="grid grid-cols-5 gap-4">
            {[
              { k: 'Lenguaje', v: 'TypeScript strict — sin any implícitos' },
              { k: 'Secrets', v: 'Variables de entorno Railway — nunca en código' },
              { k: 'Comunicación', v: 'HTTPS + mTLS para SPEI (Banxico)' },
              { k: 'Auditoría', v: 'Logs estructurados, retención 5 años' },
              { k: 'CI/CD', v: 'Deploy solo desde main vía GitHub Actions' },
            ].map(item => (
              <div key={item.k}>
                <p className="text-white/30 text-[10px] uppercase tracking-widest">{item.k}</p>
                <p className="text-white/70 text-xs mt-1">{item.v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideRoadmap() {
  const phases = [
    {
      phase: 'Fase 1',
      period: 'Activo — Q2 2025',
      color: 'border-emerald-500/40 bg-emerald-500/8',
      badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      items: [
        'QUETZA (GT), MEXCOIN (MX), LEMPI (HN)',
        'Wallet web + app móvil',
        'Conectividad Banrural, STP/SPEI, BAC HN',
        'Compra / venta / envío / retiro',
        'KYC Nivel 1 y 2',
        'Voucher digital PNG',
      ],
    },
    {
      phase: 'Fase 2',
      period: 'Q3–Q4 2025',
      color: 'border-[#6C5CE7]/40 bg-[#6C5CE7]/8',
      badge: 'bg-[#6C5CE7]/20 text-[#A29BFE] border-[#6C5CE7]/30',
      items: [
        'COLÓN Digital (El Salvador)',
        'DÓLAR Digital (USA)',
        'Tarjeta LEN Mastercard virtual',
        'API pública para comercios',
        'Pagos QR en punto de venta',
        'Remesas programadas (recurrentes)',
      ],
    },
    {
      phase: 'Fase 3',
      period: 'Q1–Q3 2026',
      color: 'border-amber-500/30 bg-amber-500/5',
      badge: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
      items: [
        'TIKAL (BZ), NICORD (NI), CORI (CR), BALBÓA (PA)',
        'Red LEN completa (8 países)',
        'DeFi: staking, yield en tokens LEN',
        'KYC Nivel 3 institucional',
        'Licencia bancaria completa',
        'Expansión a Caribbean / S. América',
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full px-8 py-6">
      <SectionTag>09 — Roadmap</SectionTag>
      <h2 className="text-4xl font-black text-white mb-2">
        De 3 países a toda<br /><span className="text-[#A29BFE]">Centroamérica y más</span>
      </h2>
      <p className="text-white/50 mb-8">Expansión modular. Cada país nuevo usa la misma infraestructura.</p>

      <div className="grid grid-cols-3 gap-6 flex-1">
        {phases.map(p => (
          <div key={p.phase} className={`border rounded-2xl p-6 flex flex-col gap-4 ${p.color}`}>
            <div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${p.badge}`}>{p.phase}</span>
              <p className="text-white font-black text-xl mt-3">{p.period}</p>
            </div>
            <ul className="space-y-2.5 flex-1">
              {p.items.map(item => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="text-white/30 mt-0.5 flex-shrink-0">▸</span>
                  <span className="text-white/70 text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideTraction() {
  return (
    <div className="flex flex-col h-full px-8 py-6">
      <SectionTag>10 — Por qué ahora</SectionTag>
      <h2 className="text-4xl font-black text-white mb-2">
        El mercado ya está listo —<br /><span className="text-[#A29BFE]">LEN también</span>
      </h2>
      <p className="text-white/50 mb-8">
        Convergencia de regulación favorable, adopción móvil y timing post-cripto.
      </p>

      <div className="grid grid-cols-2 gap-6 flex-1">
        <div className="space-y-4">
          <p className="text-white/30 text-xs font-bold uppercase tracking-widest">El mercado</p>
          {[
            { stat: '$54B', label: 'Remesas Guatemala → USA 2024', growth: '+8% YoY' },
            { stat: '$63B', label: 'Remesas México recibidas 2024', growth: '+10% YoY' },
            { stat: '$8.4B', label: 'Remesas Honduras 2024', growth: '+12% YoY' },
            { stat: '65%', label: 'Población desbancarizada CA', growth: 'Mercado virgen' },
            { stat: '92%', label: 'Penetración smartphones en GT/MX', growth: 'Canal directo' },
          ].map(m => (
            <div key={m.label} className="flex items-center justify-between bg-white/4 border border-white/8 rounded-xl px-5 py-3">
              <div>
                <p className="text-white font-black text-xl">{m.stat}</p>
                <p className="text-white/50 text-xs mt-0.5">{m.label}</p>
              </div>
              <span className="text-emerald-400 text-xs font-bold bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-1 rounded-full">
                {m.growth}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <p className="text-white/30 text-xs font-bold uppercase tracking-widest">Ventajas competitivas</p>
          {[
            { icon: '🎯', title: 'First mover regional', desc: 'No existe una plataforma nativa de TokenCoins para Mesoamérica. LEN lo hace primero.' },
            { icon: '🏗️', title: 'Infraestructura lista', desc: 'fiat-bridge, wallet-service, fx-engine, auth — 6 microservicios en producción.' },
            { icon: '📱', title: 'Producto terminado', desc: 'Web app + móvil funcionando. Demo en vivo con 3 países, 3 wallets, transacciones reales.' },
            { icon: '🔗', title: 'Banco-agnostic', desc: 'La misma arquitectura conecta con cualquier banco que tenga API. Escalar es agregar un provider.' },
            { icon: '⚖️', title: 'Modelo regulatorio', desc: 'IME en Guatemala. Framework ya diseñado para licencias equivalentes en MX y HN.' },
          ].map(v => (
            <div key={v.icon} className="flex items-start gap-4 bg-white/4 border border-white/8 rounded-xl px-4 py-3">
              <span className="text-2xl flex-shrink-0">{v.icon}</span>
              <div>
                <p className="text-white font-bold text-sm">{v.title}</p>
                <p className="text-white/40 text-xs mt-0.5 leading-relaxed">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlideTeam() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center space-y-10">
      <div>
        <SectionTag>11 — Cierre</SectionTag>
        <h2 className="text-5xl lg:text-6xl font-black text-white mt-2">
          Por que cada<br />
          <span className="text-[#A29BFE]">LEN</span> cuenta.
        </h2>
        <p className="text-white/50 text-xl mt-4 max-w-2xl mx-auto leading-relaxed">
          Estamos construyendo la infraestructura financiera que Mesoamérica
          necesitaba desde hace 30 años. Empieza con 3 países. Termina con toda la región.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6 max-w-3xl w-full">
        <StatCard value="3" label="Países en red" sub="Fase 1 activa" />
        <StatCard value="0.3%" label="Fee mínimo FX" sub="vs 5–8% competencia" />
        <StatCard value="$800B" label="TAM Total" sub="remesas Mesoamérica" />
      </div>

      <div className="bg-white/5 border border-white/15 rounded-3xl p-8 max-w-2xl w-full space-y-4">
        <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Lo que buscamos</p>
        <div className="grid grid-cols-3 gap-4 text-left">
          {[
            { icon: '💰', label: 'Inversión Seed', detail: '$500K — $1.5M USD para GTM + 2 países adicionales' },
            { icon: '🤝', label: 'Banco ancla', detail: 'Acuerdo API con Banrural (GT) o STP (MX) para lanzamiento real' },
            { icon: '📋', label: 'Licencia IME', detail: 'Acompañamiento proceso SIB Guatemala (ya iniciado)' },
          ].map(i => (
            <div key={i.label} className="bg-white/4 border border-white/8 rounded-2xl p-4">
              <span className="text-2xl">{i.icon}</span>
              <p className="text-white font-bold text-sm mt-2">{i.label}</p>
              <p className="text-white/40 text-xs mt-1 leading-relaxed">{i.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
          <span className="text-[#6C5CE7] font-black text-2xl">L</span>
        </div>
        <div className="text-left">
          <p className="text-white font-black text-xl">LEN — Red TokenCoin · Mesoamérica</p>
          <p className="text-white/40 text-sm">len.app · hola@len.app</p>
        </div>
      </div>
    </div>
  );
}

// ─── Slide map ────────────────────────────────────────────────────────────────
const SLIDE_COMPONENTS: Record<SlideId, () => JSX.Element> = {
  hero:      SlideHero,
  problem:   SlideProblem,
  solution:  SlideSolution,
  network:   SlideNetwork,
  wallet:    SlideWallet,
  security:  SlideSecurity,
  banks:     SlideBanks,
  flow:      SlideFlow,
  tech:      SlideTech,
  roadmap:   SlideRoadmap,
  traction:  SlideTraction,
  team:      SlideTeam,
};

const SLIDE_LABELS: Record<SlideId, string> = {
  hero:      'Intro',
  problem:   'Problema',
  solution:  'Solución',
  network:   'Red',
  wallet:    'Wallet',
  security:  'Seguridad',
  banks:     'Bancos',
  flow:      'Flujo',
  tech:      'Tecnología',
  roadmap:   'Roadmap',
  traction:  'Mercado',
  team:      'Pitch',
};

// ─── Main presentation ────────────────────────────────────────────────────────
export default function PitchPage() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  const total    = SLIDES.length;
  const slideId  = SLIDES[current];
  const SlideComp = SLIDE_COMPONENTS[slideId];

  function go(idx: number) {
    if (animating || idx < 0 || idx >= total) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrent(idx);
      setAnimating(false);
    }, 180);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ')  go(current + 1);
      if (e.key === 'ArrowLeft')                     go(current - 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current]);

  return (
    <div
      className="min-h-screen bg-[#0D0B2B] flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 20% 0%, #1E1B4B 0%, #0D0B2B 60%)' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/8 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-[#6C5CE7] font-black text-sm">L</span>
          </div>
          <span className="text-white font-black text-lg">LEN</span>
          <span className="text-white/20 text-sm mx-2">·</span>
          <span className="text-white/40 text-sm">Investor Deck 2025</span>
        </div>

        {/* Nav dots */}
        <div className="hidden md:flex items-center gap-1.5">
          {SLIDES.map((s, i) => (
            <button
              key={s}
              onClick={() => go(i)}
              title={SLIDE_LABELS[s]}
              className={`transition-all rounded-full ${
                i === current
                  ? 'w-6 h-2 bg-[#6C5CE7]'
                  : 'w-2 h-2 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>

        <div className="text-white/30 text-sm font-mono">
          {current + 1} / {total}
        </div>
      </div>

      {/* Slide content */}
      <div
        className="flex-1 transition-opacity duration-180"
        style={{ opacity: animating ? 0 : 1 }}
      >
        <SlideComp />
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center justify-between px-8 py-4 border-t border-white/8 flex-shrink-0">
        {/* Slide label tabs */}
        <div className="hidden lg:flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {SLIDES.map((s, i) => (
            <button
              key={s}
              onClick={() => go(i)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg transition-all font-medium
                ${i === current
                  ? 'bg-[#6C5CE7]/30 text-[#A29BFE] border border-[#6C5CE7]/50'
                  : 'text-white/30 hover:text-white/60 hover:bg-white/5'}`}
            >
              {SLIDE_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Arrow buttons */}
        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={() => go(current - 1)}
            disabled={current === 0}
            className="w-10 h-10 rounded-xl border border-white/15 text-white/60 flex items-center justify-center
                       hover:border-white/30 hover:text-white transition-all disabled:opacity-20"
          >
            ←
          </button>
          <button
            onClick={() => go(current + 1)}
            disabled={current === total - 1}
            className="w-10 h-10 rounded-xl bg-[#6C5CE7] text-white flex items-center justify-center
                       hover:bg-[#7C6CF7] transition-all disabled:opacity-30 shadow-len"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
