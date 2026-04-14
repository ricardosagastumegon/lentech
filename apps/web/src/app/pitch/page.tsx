'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Slide registry ───────────────────────────────────────────────────────────
const SLIDES = [
  'hero', 'problem', 'solution', 'network',
  'legal', 'model', 'wallet', 'security',
  'banks', 'mexico', 'flow', 'tech', 'roadmap', 'traction', 'ask',
] as const;
type SlideId = typeof SLIDES[number];

const SLIDE_LABELS: Record<SlideId, string> = {
  hero:     'Intro',
  problem:  'Problema',
  solution: 'Solución',
  network:  'Red',
  legal:    'Legal',
  model:    'Modelo',
  wallet:   'Wallet',
  security: 'Seguridad',
  banks:    'Bancos',
  mexico:   'México',
  flow:     'Flujo',
  tech:     'Tecnología',
  roadmap:  'Roadmap',
  traction: 'Mercado',
  ask:      'Pitch',
};

// ─── Shared atoms ─────────────────────────────────────────────────────────────
function Tag({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 bg-[#6C5CE7]/20 border border-[#6C5CE7]/40
                    rounded-full px-4 py-1.5 text-[#A29BFE] text-xs font-bold uppercase tracking-widest mb-5">
      {children}
    </div>
  );
}
function Stat({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
      <div className="text-3xl font-black text-white">{value}</div>
      <div className="text-white/60 text-sm mt-1">{label}</div>
      {sub && <div className="text-white/30 text-xs mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Slides ───────────────────────────────────────────────────────────────────

function SlideHero() {
  return (
    <div className="flex flex-col items-center justify-center text-center h-full px-8 space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl">
          <span className="text-[#6C5CE7] font-black text-3xl">L</span>
        </div>
        <span className="text-white font-black text-5xl tracking-tight">LEN</span>
      </div>
      <div className="space-y-4 max-w-3xl">
        <h1 className="text-5xl lg:text-6xl font-black text-white leading-[1.05]">
          La red de <span className="text-[#A29BFE]">TokenCoins</span><br />nativa de Mesoamérica
        </h1>
        <p className="text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
          Transferencias instantáneas entre Guatemala, México y Honduras.
          Un token por moneda, respaldado 1:1. Sin bancos intermediarios.
        </p>
      </div>
      <div className="flex flex-wrap gap-3 justify-center">
        {[
          { flag: '🇬🇹', code: 'QUETZA',  fiat: 'GTQ' },
          { flag: '🇲🇽', code: 'MEXCOIN', fiat: 'MXN' },
          { flag: '🇭🇳', code: 'LEMPI',   fiat: 'HNL' },
          { flag: '🇸🇻', code: 'COLÓN',   fiat: 'USD', soon: true },
          { flag: '🇨🇷', code: 'CORI',    fiat: 'CRC', soon: true },
        ].map(c => (
          <div key={c.code} className={`flex items-center gap-2 rounded-full px-4 py-2 border backdrop-blur
            ${c.soon ? 'bg-white/5 border-white/10 text-white/40' : 'bg-white/15 border-white/30 text-white'}`}>
            <span className="text-lg">{c.flag}</span>
            <span className="font-bold text-sm">{c.code}</span>
            <span className={`text-xs ${c.soon ? 'text-white/30' : 'text-white/50'}`}>
              {c.soon ? 'pronto' : `= 1 ${c.fiat}`}
            </span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6 pt-2">
        <Stat value="3"    label="Países activos"   sub="Fase 1" />
        <Stat value="0.3%" label="Comisión mínima"  sub="vs 5–8% WU" />
        <Stat value="$800B" label="TAM remesas"     sub="Mesoamérica 2024" />
      </div>
    </div>
  );
}

function SlideProblem() {
  return (
    <div className="flex flex-col h-full px-8 py-6">
      <Tag>01 — El Problema</Tag>
      <h2 className="text-4xl lg:text-5xl font-black text-white mb-3">
        Mover dinero en<br /><span className="text-red-400">Mesoamérica está roto</span>
      </h2>
      <p className="text-white/50 text-lg mb-8">El 12% del PIB de Guatemala son remesas. El costo de enviarlas es inaceptable.</p>
      <div className="grid grid-cols-2 gap-5 flex-1">
        {[
          { icon: '💸', title: '5–8% de comisión', desc: 'Western Union, Remitly y MoneyGram cobran entre $5 y $40 por envío. En remesas de $300 eso es el 13%.', stat: '$48B perdidos en fees al año solo en Mesoamérica' },
          { icon: '⏳', title: '1–5 días de espera', desc: 'Las transferencias bancarias internacionales entre GT, MX y HN tardan días hábiles.', stat: '47% de receptores necesitan el dinero el mismo día' },
          { icon: '🏦', title: '65% sin cuenta bancaria', desc: 'La mayoría de la población en CA no tiene acceso a servicios financieros formales.', stat: '38M personas desbancarizadas en la región' },
          { icon: '📱', title: 'Sin infraestructura común', desc: 'Cada país tiene su sistema. No hay una "SPEI mesoamericana". Los bancos no se comunican.', stat: 'Cada remesa cruza 3–4 intermediarios' },
        ].map(p => (
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
      <Tag>02 — La Solución</Tag>
      <h2 className="text-4xl lg:text-5xl font-black text-white mb-3">
        Un token por país.<br /><span className="text-[#A29BFE]">Un solo sistema.</span>
      </h2>
      <p className="text-white/50 text-lg mb-8">LEN emite tokens digitales respaldados 1:1. Transferir QUETZA a LEMPI es instantáneo y cuesta 0.3%.</p>
      <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
        {[
          { label: 'Carlos GT', sub: 'deposita Q 500', bg: 'bg-indigo-500/20 border-indigo-500/40', t: 'text-indigo-300' },
          { label: '→', sub: '', bg: '', t: 'text-white/20 text-3xl font-black' },
          { label: 'QUETZA', sub: '500 tokens', bg: 'bg-[#6C5CE7]/25 border-[#6C5CE7]/50', t: 'text-[#A29BFE]' },
          { label: '→', sub: '', bg: '', t: 'text-white/20 text-3xl font-black' },
          { label: 'FX 0.3%', sub: 'automático', bg: 'bg-emerald-500/15 border-emerald-500/30', t: 'text-emerald-400' },
          { label: '→', sub: '', bg: '', t: 'text-white/20 text-3xl font-black' },
          { label: 'LEMPI', sub: '1,280 tokens', bg: 'bg-[#6C5CE7]/25 border-[#6C5CE7]/50', t: 'text-[#A29BFE]' },
          { label: '→', sub: '', bg: '', t: 'text-white/20 text-3xl font-black' },
          { label: 'María HN', sub: 'recibe L 1,280', bg: 'bg-indigo-500/20 border-indigo-500/40', t: 'text-indigo-300' },
        ].map((item, i) =>
          item.label === '→'
            ? <div key={i} className="text-white/30 text-3xl font-black">→</div>
            : <div key={i} className={`border rounded-2xl px-5 py-3 text-center ${item.bg}`}>
                <p className={`font-black text-sm ${item.t}`}>{item.label}</p>
                {item.sub && <p className="text-white/40 text-xs mt-0.5">{item.sub}</p>}
              </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-5">
        {[
          { icon: '⚡', title: 'Instantáneo', desc: 'Confirmado en segundos. Sin días de espera bancaria.' },
          { icon: '🔒', title: 'Respaldado 1:1', desc: 'Cada token tiene 1 unidad de moneda local en reserva.' },
          { icon: '🌎', title: 'Sin fronteras', desc: 'FX automático entre todos los países LEN.' },
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
    { flag: '🇬🇹', code: 'QUETZA',  fiat: 'GTQ', country: 'Guatemala',  phase: 1, status: 'Activo' },
    { flag: '🇲🇽', code: 'MEXCOIN', fiat: 'MXN', country: 'México',      phase: 1, status: 'Activo' },
    { flag: '🇭🇳', code: 'LEMPI',   fiat: 'HNL', country: 'Honduras',    phase: 1, status: 'Activo' },
    { flag: '🇸🇻', code: 'COLÓN',   fiat: 'USD', country: 'El Salvador', phase: 2, status: 'Q3 2025' },
    { flag: '🇧🇿', code: 'TIKAL',   fiat: 'BZD', country: 'Belize',      phase: 3, status: 'Q1 2026' },
    { flag: '🇳🇮', code: 'NICORD',  fiat: 'NIO', country: 'Nicaragua',   phase: 3, status: 'Q1 2026' },
    { flag: '🇨🇷', code: 'CORI',    fiat: 'CRC', country: 'Costa Rica',  phase: 3, status: 'Q2 2026' },
    { flag: '🇵🇦', code: 'BALBÓA',  fiat: 'USD', country: 'Panamá',      phase: 3, status: 'Q3 2026' },
  ];
  return (
    <div className="flex flex-col h-full px-8 py-6">
      <Tag>03 — Red TokenCoin</Tag>
      <h2 className="text-4xl font-black text-white mb-2">Un token por moneda,<br /><span className="text-[#A29BFE]">toda la región</span></h2>
      <p className="text-white/50 mb-8">8 países · 8 monedas · 1 red · Expansión modular por fases</p>
      <div className="grid grid-cols-4 gap-4 flex-1">
        {coins.map(c => (
          <div key={c.code} className={`rounded-2xl border p-5 flex flex-col gap-3
            ${c.phase === 1 ? 'bg-[#6C5CE7]/15 border-[#6C5CE7]/40' : 'bg-white/3 border-white/8 opacity-55'}`}>
            <div className="flex items-start justify-between">
              <span className="text-4xl">{c.flag}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                ${c.phase === 1 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
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

function SlideLegal() {
  return (
    <div className="flex flex-col h-full px-8 py-6">
      <Tag>04 — Estructura Legal</Tag>
      <h2 className="text-4xl font-black text-white mb-2">
        Software americano.<br /><span className="text-[#A29BFE]">Tokens guatemaltecos.</span>
      </h2>
      <p className="text-white/50 mb-8">La estructura que usan las mejores fintechs del mundo para escalar rápido y proteger el IP.</p>
      <div className="grid grid-cols-3 gap-5 flex-1">
        {/* US Corp */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🇺🇸</span>
            <div>
              <p className="text-blue-300 font-black">LEN Technologies Inc.</p>
              <p className="text-white/40 text-xs">Delaware C-Corp</p>
            </div>
          </div>
          <ul className="space-y-2 flex-1">
            {['Dueña del software y la marca LEN','Recibe royalties de licencia','Levanta capital de inversionistas US','NO opera directamente en GT/MX/HN','Protegida de regulación bancaria local'].map(i => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                <span className="text-blue-400 mt-0.5 flex-shrink-0">▸</span>{i}
              </li>
            ))}
          </ul>
          <div className="bg-blue-500/15 rounded-xl px-3 py-2">
            <p className="text-blue-300 text-xs font-bold">Recibe: royalties + equity gains</p>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="text-white/20 text-center space-y-2">
            <p className="text-3xl">↓</p>
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white/50 text-center">
              <p className="font-bold text-white/70 mb-1">Acuerdo de licencia</p>
              <p>Software licenciado a GT S.A.</p>
              <p className="mt-1">Royalty: X% de revenue</p>
            </div>
            <p className="text-3xl">↓</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white/50 text-center">
            <p className="font-bold text-white/70 mb-1">Instrucción de tokens</p>
            <p>GT S.A. instruye al fiduciario</p>
            <p className="mt-1">Emitir / quemar tokens</p>
          </div>
        </div>

        {/* GT S.A. + Fideicomiso */}
        <div className="flex flex-col gap-4">
          <div className="bg-[#6C5CE7]/15 border border-[#6C5CE7]/40 rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🇬🇹</span>
              <div>
                <p className="text-[#A29BFE] font-black">LEN Red Digital S.A.</p>
                <p className="text-white/40 text-xs">Operadora Guatemala</p>
              </div>
            </div>
            <ul className="space-y-1.5">
              {['Emite tokens QUETZA/MEXCOIN/LEMPI','Opera la plataforma (licencia US)','Cumple AML/KYC local','Firma acuerdos con bancos locales'].map(i => (
                <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                  <span className="text-[#A29BFE] mt-0.5 flex-shrink-0">▸</span>{i}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏛</span>
              <div>
                <p className="text-emerald-400 font-black text-sm">Fideicomiso de Reserva</p>
                <p className="text-white/40 text-xs">Banrural / BAC (fiduciario)</p>
              </div>
            </div>
            <ul className="space-y-1.5">
              {['Custodia el GTQ/HNL de usuarios','GT S.A. = fideicomitente','Usuarios = fideicomisarios','Fondos NUNCA son de LEN','Regulado bajo ley bancaria GT'].map(i => (
                <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                  <span className="text-emerald-400 mt-0.5 flex-shrink-0">▸</span>{i}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideModel() {
  const rows = [
    { model: 'Pool account (banco)', inter: true,  launch: 'Inmediato', cost: '$0', risk: 'Legal alto — captación', highlight: false },
    { model: 'Fideicomiso + emisión token GT/HN', inter: false, launch: '3–6 sem', cost: '$5–15K', risk: 'Mínimo — no es depósito', highlight: true },
    { model: 'STP sub-CLABE por usuario (MX)', inter: false, launch: '2–4 sem', cost: 'API costs', risk: 'Mínimo — fondos del usuario', highlight: true },
    { model: 'BaaS partner (Bitso/BAC)', inter: false, launch: '4–8 sem', cost: 'Rev share', risk: 'Bajo — dependencia partner', highlight: false },
    { model: 'IFPE/IDE licencia propia', inter: false, launch: '6–18 meses', cost: '$50–200K', risk: 'Bajo — largo plazo', highlight: false },
  ];

  return (
    <div className="flex flex-col h-full px-8 py-6">
      <Tag>05 — Modelo de Gestión</Tag>
      <h2 className="text-4xl font-black text-white mb-2">
        No somos un banco.<br /><span className="text-[#A29BFE]">Somos emisores de tokens.</span>
      </h2>
      <p className="text-white/50 mb-6">La distinción legal que define todo. Mismo modelo que Circle (USDC), Tether y Bitso.</p>

      {/* Key distinction */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-5">
          <p className="text-red-400 font-black mb-3">❌ Lo que NO somos</p>
          <ul className="space-y-2 text-sm text-white/60">
            {['Un banco que capta depósitos','Una institución que presta el dinero de los usuarios','Un intermediario financiero regulado','Custodios del fiat de los usuarios'].map(i => (
              <li key={i} className="flex items-start gap-2"><span className="text-red-500 flex-shrink-0">✗</span>{i}</li>
            ))}
          </ul>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-5">
          <p className="text-emerald-400 font-black mb-3">✅ Lo que SÍ somos</p>
          <ul className="space-y-2 text-sm text-white/60">
            {['Empresa de software (IP en USA)','Emisor de tokens respaldados 1:1','El fiat está en fideicomiso bancario regulado (GT/HN) o en sub-CLABE del usuario (MX)','Igual que Tether, Circle, Bitso en su inicio'].map(i => (
              <li key={i} className="flex items-start gap-2"><span className="text-emerald-400 flex-shrink-0">✓</span>{i}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Comparison table */}
      <div className="bg-white/3 border border-white/10 rounded-2xl overflow-hidden flex-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="text-left px-4 py-3 text-white/40 text-xs uppercase tracking-wide font-bold">Modelo</th>
              <th className="text-center px-3 py-3 text-white/40 text-xs uppercase tracking-wide font-bold">Intermediación</th>
              <th className="text-center px-3 py-3 text-white/40 text-xs uppercase tracking-wide font-bold">Lanzamiento</th>
              <th className="text-center px-3 py-3 text-white/40 text-xs uppercase tracking-wide font-bold">Costo inicial</th>
              <th className="text-left px-4 py-3 text-white/40 text-xs uppercase tracking-wide font-bold">Riesgo legal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}
                className={`border-b border-white/5 transition-colors
                  ${r.highlight ? 'bg-[#6C5CE7]/15 border-[#6C5CE7]/20' : ''}`}>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${r.highlight ? 'text-white' : 'text-white/60'}`}>
                    {r.highlight && <span className="text-[#A29BFE] mr-1">★</span>}
                    {r.model}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  {r.inter
                    ? <span className="text-red-400 font-bold">⚠ Sí</span>
                    : <span className="text-emerald-400 font-bold">✓ No</span>}
                </td>
                <td className="px-3 py-3 text-center">
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg
                    ${r.highlight ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/50'}`}>
                    {r.launch}
                  </span>
                </td>
                <td className="px-3 py-3 text-center text-white/50 text-xs">{r.cost}</td>
                <td className="px-4 py-3 text-white/50 text-xs">{r.risk}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-white/5 bg-white/3">
          <p className="text-xs text-white/30">★ = Modelo seleccionado para Fase 1 LEN</p>
        </div>
      </div>
    </div>
  );
}

function SlideWallet() {
  const features = [
    { icon: '💰', title: 'Balance dual', desc: 'Saldo fiat (sin convertir) y tokens separados. El usuario controla cuándo convierte.', chips: ['fiatBalance', 'tokenBalance'] },
    { icon: '🔄', title: 'Compra / Venta tokens', desc: 'Conversión 1:1 entre fiat y tokens. Sin comisión al comprar. 0.5% al vender.', chips: ['1:1 peg', '0.5% sell'] },
    { icon: '📤', title: 'Envío P2P', desc: 'Instantáneo a cualquier wallet LEN. Mismo país: 0%. Internacional: 0.3%.', chips: ['Instant', '0.3% FX'] },
    { icon: '🏦', title: 'Retiro bancario', desc: 'Del saldo fiat a cualquier banco del país. SPEI inmediato MX, 30–60 min GT/HN.', chips: ['ACH GT', 'SPEI MX', 'SIEFOM HN'] },
    { icon: '🧾', title: 'Voucher PNG', desc: 'Comprobante digital compartible. Canvas 2D puro, funciona en todos los móviles.', chips: ['PNG', 'Web Share API'] },
    { icon: '📊', title: 'Historial completo', desc: 'Cada centavo rastreado: tipo, estado, ID único, fecha, fee. Auditable.', chips: ['TX ID', 'Auditoría'] },
  ];
  return (
    <div className="flex flex-col h-full px-8 py-6">
      <Tag>06 — La Wallet</Tag>
      <h2 className="text-4xl font-black text-white mb-2">Un banco en el bolsillo —<br /><span className="text-[#A29BFE]">sin ser un banco</span></h2>
      <p className="text-white/50 mb-8">iOS · Android · Web. Sin cuenta bancaria requerida.</p>
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
                <span key={c} className="text-[10px] font-bold bg-[#6C5CE7]/20 text-[#A29BFE] border border-[#6C5CE7]/30 px-2 py-0.5 rounded-full">{c}</span>
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
      <Tag>07 — Seguridad</Tag>
      <h2 className="text-4xl font-black text-white mb-2">Seguridad de grado<br /><span className="text-[#A29BFE]">institucional financiero</span></h2>
      <p className="text-white/50 mb-8">Cada capa protege un vector de ataque distinto.</p>
      <div className="grid grid-cols-2 gap-6 flex-1">
        <div className="space-y-3">
          {[
            { n: '01', t: 'PIN 6 dígitos + bcrypt',       d: 'Nunca en texto plano. Salt rounds 12. Rate limiting anti-fuerza bruta.', c: 'text-[#A29BFE]' },
            { n: '02', t: 'JWT + Refresh rotativo',        d: 'Access token 15 min. Refresh 30 días con rotación. Blacklist en Redis.', c: 'text-emerald-400' },
            { n: '03', t: 'HMAC-SHA256 en webhooks',       d: 'Cada notificación bancaria verificada. Rechazada si firma no coincide.', c: 'text-amber-400' },
            { n: '04', t: 'Idempotencia bancaria',         d: 'externalReference UNIQUE en DB. El mismo depósito no se acredita dos veces.', c: 'text-blue-400' },
            { n: '05', t: 'Replay prevention',             d: 'Webhooks con timestamp. Rechazo si >5 minutos de antigüedad.', c: 'text-rose-400' },
            { n: '06', t: 'Fondos segregados (fideicomiso)', d: 'Reservas en fideicomiso bancario — nunca mezcladas con capital de LEN.', c: 'text-purple-400' },
          ].map(l => (
            <div key={l.n} className="flex items-start gap-4 bg-white/4 border border-white/8 rounded-xl p-4">
              <span className={`font-black text-lg ${l.c} flex-shrink-0 w-8`}>{l.n}</span>
              <div><p className="text-white font-bold text-sm">{l.t}</p><p className="text-white/40 text-xs mt-0.5 leading-relaxed">{l.d}</p></div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="bg-white/4 border border-white/10 rounded-2xl p-5">
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">KYC / Límites</p>
            {[
              { level: 'KYC 0', limit: 'Solo visualización', c: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
              { level: 'KYC 1', limit: 'Q 5,000/día', c: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
              { level: 'KYC 2', limit: 'Q 25,000/día', c: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
              { level: 'KYC 3', limit: 'Sin límite (institucional)', c: 'bg-[#6C5CE7]/20 text-[#A29BFE] border-[#6C5CE7]/30' },
            ].map(k => (
              <div key={k.level} className="flex items-center justify-between mb-2 last:mb-0">
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${k.c}`}>{k.level}</span>
                <span className="text-white/50 text-sm">{k.limit}</span>
              </div>
            ))}
          </div>
          <div className="bg-white/4 border border-white/10 rounded-2xl p-5">
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3">Compliance</p>
            {['✓ AML — Monitoreo en tiempo real','✓ LAFT — Ley contra lavado GT','✓ FATF — Estándares internacionales','✓ Logs auditables 5 años','✓ Reporte automático operaciones sospechosas'].map(i => (
              <p key={i} className="text-white/60 text-sm mb-1">{i}</p>
            ))}
          </div>
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4">
            <p className="text-amber-400 font-bold text-sm mb-1">🏛 Marco regulatorio</p>
            <p className="text-amber-300/70 text-xs leading-relaxed">LEN opera bajo vacío regulatorio de tokens en GT/HN (igual que Tigo Money en sus inicios). Licencia IDE GT en proceso. IFPE MX vía partner (Bitso/Conekta).</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideBanks() {
  return (
    <div className="flex flex-col h-full px-8 py-6">
      <Tag>08 — Conectividad Bancaria</Tag>
      <h2 className="text-4xl font-black text-white mb-2">Fideicomiso GT/HN.<br /><span className="text-[#A29BFE]">Sub-CLABE MX.</span></h2>
      <p className="text-white/50 mb-6">El fiat NUNCA es de LEN. Es del usuario en custodia bancaria regulada.</p>
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          {
            flag: '🇬🇹', country: 'Guatemala', currency: 'GTQ',
            model: 'Fideicomiso',
            bank: 'Banrural (fiduciario)',
            deposit: 'Sub-cuenta 1832-2383738-XXXX\n(últimos 4 = wallet ID del usuario)',
            withdraw: 'ACH BANGUAT → Industrial, BAM,\nG&T, Bantrab, Promerica, Citi GT...',
            eta_in: '15–30 min', eta_out: '15–60 min L-V',
            color: 'border-blue-500/30 bg-blue-500/8',
          },
          {
            flag: '🇲🇽', country: 'México', currency: 'MXN',
            model: 'STP sub-CLABE',
            bank: 'STP / Conekta',
            deposit: 'CLABE virtual 18 dígitos exclusiva\npor usuario — NO es cuenta de LEN',
            withdraw: 'SPEI → cualquier banco MX\nBBVA, Nu, Santander, Mercado Pago...',
            eta_in: 'Inmediato 24/7', eta_out: 'Inmediato 24/7',
            color: 'border-emerald-500/30 bg-emerald-500/8',
          },
          {
            flag: '🇭🇳', country: 'Honduras', currency: 'HNL',
            model: 'Fideicomiso',
            bank: 'BAC Credomatic (fiduciario)',
            deposit: 'Sub-cuenta 3090-2847561-XXXX\n(últimos 4 = wallet ID del usuario)',
            withdraw: 'SIEFOM → Atlántida, Ficohsa,\nBanpaís, Occidente, Davivienda...',
            eta_in: '15–30 min', eta_out: '30–60 min L-V',
            color: 'border-[#6C5CE7]/30 bg-[#6C5CE7]/8',
          },
        ].map(c => (
          <div key={c.country} className={`border rounded-2xl p-5 flex flex-col gap-3 ${c.color}`}>
            <div className="flex items-center gap-2">
              <span className="text-3xl">{c.flag}</span>
              <div>
                <p className="text-white font-black">{c.country}</p>
                <span className="text-[10px] font-bold bg-white/10 text-white/50 border border-white/15 px-2 py-0.5 rounded-full">{c.model}</span>
              </div>
            </div>
            <div className="bg-black/20 rounded-xl p-3">
              <p className="text-white/30 text-[10px] font-bold uppercase mb-1">Institución custodio</p>
              <p className="text-white/80 text-xs font-semibold">{c.bank}</p>
            </div>
            <div>
              <p className="text-white/30 text-[10px] font-bold uppercase mb-1">Depósito (entrada)</p>
              <p className="text-white/70 text-xs leading-relaxed whitespace-pre-line">{c.deposit}</p>
            </div>
            <div>
              <p className="text-white/30 text-[10px] font-bold uppercase mb-1">Retiro (salida)</p>
              <p className="text-white/70 text-xs leading-relaxed whitespace-pre-line">{c.withdraw}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
              <div className="text-center"><p className="text-[10px] text-white/30">Entrada</p><p className="text-xs font-bold text-emerald-400">{c.eta_in}</p></div>
              <div className="text-center"><p className="text-[10px] text-white/30">Salida</p><p className="text-xs font-bold text-emerald-400">{c.eta_out}</p></div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white/4 border border-white/10 rounded-2xl p-4 flex items-center gap-6">
        <p className="text-white/30 text-xs font-bold uppercase tracking-widest flex-shrink-0">Seguridad</p>
        <div className="flex flex-wrap gap-2">
          {['🔐 HMAC-SHA256 por webhook','⏱ Replay prevention 5min','🔁 Idempotencia garantizada','🏛 Fideicomiso regulado por ley','📋 Auditoría completa'].map(i => (
            <span key={i} className="text-white/50 text-xs bg-white/3 border border-white/8 px-3 py-1.5 rounded-xl">{i}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlideMexico() {
  return (
    <div className="flex flex-col h-full px-8 py-6">
      <Tag>09 — México en detalle</Tag>
      <h2 className="text-4xl font-black text-white mb-2">
        La infraestructura más<br /><span className="text-[#A29BFE]">avanzada de LATAM</span>
      </h2>
      <p className="text-white/50 mb-6">SPEI liquida en segundos, 365 días. Cada usuario tiene su propia CLABE. Zero pool account.</p>
      <div className="grid grid-cols-2 gap-5 flex-1">
        {/* Left: CLABE model */}
        <div className="space-y-4">
          <div className="bg-white/4 border border-white/10 rounded-2xl p-5">
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3">Modelo STP sub-CLABE</p>
            <div className="space-y-2 font-mono text-sm">
              {[
                { label: 'Master LEN en STP:', value: '646180 000000000000', color: 'text-white/40' },
                { label: 'CLABE Carlos:', value: '646180 234567890001', color: 'text-[#A29BFE]' },
                { label: 'CLABE Sofía:', value: '646180 234567890002', color: 'text-[#A29BFE]' },
                { label: 'CLABE Pedro:', value: '646180 234567890003', color: 'text-[#A29BFE]' },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between gap-4">
                  <span className="text-white/30 text-xs">{r.label}</span>
                  <span className={`text-xs ${r.color}`}>{r.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-xs text-white/40 leading-relaxed">
                Cada CLABE es legalmente la cuenta del usuario dentro de STP.
                El MXN que deposita Carlos <span className="text-emerald-400 font-bold">NO es de LEN</span> — es de Carlos en su sub-CLABE.
                LEN solo emite MEXCOIN como representación digital.
              </p>
            </div>
          </div>
          <div className="bg-white/4 border border-white/10 rounded-2xl p-5">
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3">Capas del ecosistema MX</p>
            {[
              { layer: 'Banxico / SPEI', role: 'Liquidación interbancaria en tiempo real', color: 'text-white/70' },
              { layer: 'STP (Banxico-licensed)', role: 'Participante SPEI. Emite CLABEs virtuales por usuario', color: 'text-[#A29BFE]' },
              { layer: 'Conekta / Arcus', role: 'API sobre STP. Integración rápida sin licencia directa', color: 'text-emerald-400' },
              { layer: 'IFPE (licencia CNBV)', role: 'Ruta propia. 6–12 meses. Exemplos: Clip, Cuenca, Klar', color: 'text-amber-400' },
            ].map(l => (
              <div key={l.layer} className="flex items-start gap-3 mb-3 last:mb-0">
                <div className="w-2 h-2 rounded-full bg-white/20 mt-1.5 flex-shrink-0" />
                <div>
                  <p className={`text-sm font-bold ${l.color}`}>{l.layer}</p>
                  <p className="text-white/40 text-xs mt-0.5">{l.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Right: Comparison + path */}
        <div className="space-y-4">
          <div className="bg-white/4 border border-white/10 rounded-2xl p-5">
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3">Así operan otros (referencia)</p>
            {[
              { name: 'Tether (USDT)', model: 'Emite tokens respaldados en USD. Sin licencia bancaria. Opera desde BVI/El Salvador.', status: 'bg-emerald-500/20 text-emerald-400', s: 'Referencia global' },
              { name: 'Circle (USDC)', model: 'Money transmitter license USA. Reservas en treasuries + banco. Emite USDC 1:1.', status: 'bg-blue-500/20 text-blue-400', s: 'Modelo maduro' },
              { name: 'Bitso (MX)', model: 'IFPE + exchange. CLABEs via STP. Opera cripto y fiat. Regulado CNBV.', status: 'bg-[#6C5CE7]/20 text-[#A29BFE]', s: 'Comparable regional' },
              { name: 'Cuenca (MX)', model: 'IFPE. Cuenta + CLABE virtual + tarjeta. Sin licencia bancaria completa.', status: 'bg-amber-500/20 text-amber-400', s: 'Modelo fast-launch' },
            ].map(c => (
              <div key={c.name} className="flex items-start gap-3 mb-3 last:mb-0 pb-3 last:pb-0 border-b border-white/5 last:border-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white font-bold text-sm">{c.name}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.status}`}>{c.s}</span>
                  </div>
                  <p className="text-white/40 text-xs leading-relaxed">{c.model}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-[#6C5CE7]/15 border border-[#6C5CE7]/30 rounded-2xl p-5">
            <p className="text-[#A29BFE] font-bold text-sm mb-2">🎯 Ruta LEN para MX (Fase 1)</p>
            <p className="text-white/60 text-xs leading-relaxed">
              Integración con <strong className="text-white">Conekta o Arcus</strong> como capa sobre STP.
              Ellos proveen CLABEs virtuales vía API — LEN las asigna 1:1 por usuario.
              Sin licencia propia necesaria para lanzar. Después: solicitud IFPE CNBV (6–12 meses).
            </p>
            <div className="flex gap-2 mt-3">
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-full font-bold">Launch: 2–4 semanas</span>
              <span className="text-[10px] bg-white/10 text-white/50 border border-white/15 px-2 py-1 rounded-full font-bold">Zero intermediación</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideFlow() {
  const steps = [
    { n: '1', title: 'Registro + KYC', detail: 'DPI/INE/DNI básico. Wallet + cuenta virtual generada automáticamente.', icon: '👤', color: 'bg-indigo-500/20 border-indigo-500/40' },
    { n: '2', title: 'Cuenta dedicada', detail: 'GT/HN: sub-cuenta fideicomiso. MX: CLABE virtual STP. Exclusiva del usuario.', icon: '🏦', color: 'bg-blue-500/20 border-blue-500/40' },
    { n: '3', title: 'Depósito bancario', detail: 'Desde cualquier banco → su cuenta LEN (fideicomiso o CLABE). Sin referencia necesaria.', icon: '💳', color: 'bg-[#6C5CE7]/20 border-[#6C5CE7]/40' },
    { n: '4', title: 'Webhook bancario', detail: 'Banco notifica LEN. HMAC verificado. Idempotencia garantizada.', icon: '📡', color: 'bg-purple-500/20 border-purple-500/40' },
    { n: '5', title: 'Token emitido', detail: 'LEN emite tokens 1:1. fiatBalance acreditado. Usuario ve saldo en segundos.', icon: '🪙', color: 'bg-amber-500/20 border-amber-500/40' },
    { n: '6', title: 'Envío / FX', detail: 'P2P instantáneo. FX automático si diferente moneda. Fee 0.3%.', icon: '📤', color: 'bg-[#6C5CE7]/20 border-[#6C5CE7]/40' },
    { n: '7', title: 'Retiro bancario', detail: 'Tokens → fiat → retiro a cualquier banco del país vía ACH/SPEI/SIEFOM.', icon: '🏧', color: 'bg-emerald-500/20 border-emerald-500/40' },
    { n: '8', title: 'Token quemado', detail: 'Al retirar, el token es "quemado". El fiat sale del fideicomiso al banco del usuario.', icon: '🔥', color: 'bg-rose-500/20 border-rose-500/40' },
  ];
  return (
    <div className="flex flex-col h-full px-8 py-6">
      <Tag>10 — Flujo Completo</Tag>
      <h2 className="text-4xl font-black text-white mb-2">Del banco al banco —<br /><span className="text-[#A29BFE]">sin intermediarios</span></h2>
      <p className="text-white/50 mb-8">El fiat entra al fideicomiso, sale del fideicomiso. LEN solo mueve tokens digitales entre medias.</p>
      <div className="grid grid-cols-4 gap-4 flex-1">
        {steps.map((s, i) => (
          <div key={s.n} className={`border rounded-2xl p-5 flex flex-col gap-3 ${s.color} relative`}>
            {i < steps.length - 1 && <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 text-white/20 text-lg z-10">→</div>}
            <div className="flex items-center justify-between">
              <span className="text-2xl">{s.icon}</span>
              <span className="text-xs font-black text-white/30 bg-white/5 w-7 h-7 rounded-full flex items-center justify-center">{s.n}</span>
            </div>
            <div><p className="text-white font-black text-sm">{s.title}</p><p className="text-white/50 text-xs mt-1 leading-relaxed">{s.detail}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideTech() {
  return (
    <div className="flex flex-col h-full px-8 py-6">
      <Tag>11 — Stack Tecnológico</Tag>
      <h2 className="text-4xl font-black text-white mb-2">Microservicios listos<br /><span className="text-[#A29BFE]">para producción</span></h2>
      <p className="text-white/50 mb-8">Monorepo Turborepo · Railway · NestJS · Next.js 14 · Firebase</p>
      <div className="grid grid-cols-3 gap-5 flex-1">
        {[
          { icon: '📱', title: 'Frontend / App', items: [
            { name: 'Next.js 14', role: 'Web app (App Router)' },
            { name: 'React Native', role: 'iOS + Android (Expo)' },
            { name: 'Zustand + persist', role: 'Estado global + offline' },
            { name: 'TailwindCSS', role: 'UI system LEN' },
            { name: 'Canvas 2D API', role: 'Vouchers PNG sin deps' },
            { name: 'Firebase Firestore', role: 'Sync cross-device' },
          ]},
          { icon: '⚙️', title: 'Microservicios', items: [
            { name: 'auth-service', role: 'JWT, PIN, KYC' },
            { name: 'wallet-service', role: 'Balances, TX, tokens' },
            { name: 'fiat-bridge', role: 'Fideicomiso + STP webhooks' },
            { name: 'fx-engine', role: 'Tipos de cambio RT' },
            { name: 'tx-engine', role: 'Motor transacciones' },
            { name: 'notification', role: 'Push / SMS / Email' },
          ]},
          { icon: '🏗️', title: 'Infraestructura', items: [
            { name: 'Railway', role: 'Deploy auto (Nixpacks)' },
            { name: 'PostgreSQL', role: 'DB principal' },
            { name: 'Redis', role: 'Cache + colas Bull' },
            { name: 'NestJS', role: 'Framework backend TS' },
            { name: 'TypeORM', role: 'ORM + migraciones' },
            { name: 'BullMQ', role: 'Webhooks async' },
          ]},
        ].map(col => (
          <div key={col.icon} className="bg-white/4 border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2"><span className="text-2xl">{col.icon}</span><p className="text-white font-black">{col.title}</p></div>
            <div className="space-y-2 flex-1">
              {col.items.map(t => (
                <div key={t.name} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                  <span className="text-white/80 text-sm font-semibold">{t.name}</span>
                  <span className="text-white/30 text-xs">{t.role}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="col-span-3 bg-[#6C5CE7]/10 border border-[#6C5CE7]/30 rounded-2xl p-5">
          <p className="text-[#A29BFE] font-bold mb-3 text-sm uppercase tracking-widest">Seguridad del stack</p>
          <div className="grid grid-cols-5 gap-4">
            {[
              { k: 'Lenguaje', v: 'TypeScript strict — sin any implícitos' },
              { k: 'Secrets', v: 'Railway env vars — nunca en código' },
              { k: 'Comunicación', v: 'HTTPS + mTLS para SPEI (Banxico)' },
              { k: 'Auditoría', v: 'Logs estructurados, retención 5 años' },
              { k: 'CI/CD', v: 'Deploy desde main via GitHub Actions' },
            ].map(i => (
              <div key={i.k}><p className="text-white/30 text-[10px] uppercase tracking-widest">{i.k}</p><p className="text-white/70 text-xs mt-1">{i.v}</p></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideRoadmap() {
  const phases = [
    { phase: 'Fase 1', period: 'Activo — Q2 2025', color: 'border-emerald-500/40 bg-emerald-500/8', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      items: ['QUETZA (GT), MEXCOIN (MX), LEMPI (HN)','Fideicomiso Banrural + STP sub-CLABEs','Wallet web + app móvil iOS/Android','KYC 1 y 2 — documentos locales','Envío P2P + FX + retiro bancario','Acuerdo Conekta/Arcus para MX'] },
    { phase: 'Fase 2', period: 'Q3–Q4 2025', color: 'border-[#6C5CE7]/40 bg-[#6C5CE7]/8', badge: 'bg-[#6C5CE7]/20 text-[#A29BFE] border-[#6C5CE7]/30',
      items: ['COLÓN Digital (El Salvador)','Tarjeta LEN Mastercard virtual','API pública para comercios','Pagos QR en punto de venta','Remesas programadas (recurrentes)','Solicitud IFPE CNBV en proceso'] },
    { phase: 'Fase 3', period: 'Q1–Q3 2026', color: 'border-amber-500/30 bg-amber-500/5', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
      items: ['TIKAL, NICORD, CORI, BALBÓA','Red LEN 8 países completa','Licencias IDE GT / IFPE MX propias','DeFi: staking y yield en tokens LEN','KYC 3 institucional','Expansión Caribe + Sudamérica'] },
  ];
  return (
    <div className="flex flex-col h-full px-8 py-6">
      <Tag>12 — Roadmap</Tag>
      <h2 className="text-4xl font-black text-white mb-2">De 3 países a toda<br /><span className="text-[#A29BFE]">Centroamérica y más</span></h2>
      <p className="text-white/50 mb-8">La misma infraestructura escala a cada país nuevo. Agregar un país = agregar un provider.</p>
      <div className="grid grid-cols-3 gap-6 flex-1">
        {phases.map(p => (
          <div key={p.phase} className={`border rounded-2xl p-6 flex flex-col gap-4 ${p.color}`}>
            <div><span className={`text-xs font-bold px-3 py-1 rounded-full border ${p.badge}`}>{p.phase}</span><p className="text-white font-black text-xl mt-3">{p.period}</p></div>
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
      <Tag>13 — Mercado y Timing</Tag>
      <h2 className="text-4xl font-black text-white mb-2">El mercado ya está listo —<br /><span className="text-[#A29BFE]">LEN también</span></h2>
      <p className="text-white/50 mb-8">Convergencia de vacío regulatorio, adopción móvil y demanda insatisfecha.</p>
      <div className="grid grid-cols-2 gap-6 flex-1">
        <div className="space-y-3">
          <p className="text-white/30 text-xs font-bold uppercase tracking-widest">El mercado</p>
          {[
            { stat: '$54B', label: 'Remesas Guatemala → USA 2024', growth: '+8% YoY' },
            { stat: '$63B', label: 'Remesas México recibidas 2024', growth: '+10% YoY' },
            { stat: '$8.4B', label: 'Remesas Honduras 2024', growth: '+12% YoY' },
            { stat: '65%', label: 'Población desbancarizada CA', growth: 'Mercado virgen' },
            { stat: '92%', label: 'Penetración smartphones GT/MX', growth: 'Canal directo' },
          ].map(m => (
            <div key={m.label} className="flex items-center justify-between bg-white/4 border border-white/8 rounded-xl px-5 py-3">
              <div><p className="text-white font-black text-xl">{m.stat}</p><p className="text-white/50 text-xs mt-0.5">{m.label}</p></div>
              <span className="text-emerald-400 text-xs font-bold bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-1 rounded-full">{m.growth}</span>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <p className="text-white/30 text-xs font-bold uppercase tracking-widest">Ventajas competitivas</p>
          {[
            { icon: '🎯', title: 'First mover regional', desc: 'No existe red de TokenCoins nativa de Mesoamérica. LEN lo hace primero.' },
            { icon: '🏗️', title: 'Infraestructura lista', desc: '6 microservicios en producción. fiat-bridge, wallet, fx-engine, auth funcionando.' },
            { icon: '⚖️', title: 'Modelo legal sólido', desc: 'US Corp + GT S.A. + fideicomiso = misma estructura que Tether/Circle en su inicio.' },
            { icon: '📱', title: 'Producto terminado', desc: 'Demo en vivo: 3 países, 3 wallets, envíos, FX, voucher. Todo funcionando.' },
            { icon: '🔗', title: 'Banco-agnostic', desc: 'La misma arquitectura conecta con cualquier banco vía webhook. Escalar = agregar provider.' },
          ].map(v => (
            <div key={v.icon} className="flex items-start gap-4 bg-white/4 border border-white/8 rounded-xl px-4 py-3">
              <span className="text-2xl flex-shrink-0">{v.icon}</span>
              <div><p className="text-white font-bold text-sm">{v.title}</p><p className="text-white/40 text-xs mt-0.5 leading-relaxed">{v.desc}</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlideAsk() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center space-y-8">
      <div>
        <Tag>14 — Pitch</Tag>
        <h2 className="text-5xl lg:text-6xl font-black text-white mt-2">
          Por que cada<br /><span className="text-[#A29BFE]">LEN</span> cuenta.
        </h2>
        <p className="text-white/50 text-lg mt-4 max-w-2xl mx-auto leading-relaxed">
          Software americano. Tokens guatemaltecos. Infraestructura mesoamericana.
          La red financiera que la región necesitaba desde hace 30 años.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-6 max-w-3xl w-full">
        <Stat value="3"     label="Países en red"   sub="Fase 1 activa" />
        <Stat value="0.3%"  label="Fee mínimo FX"   sub="vs 5–8% competencia" />
        <Stat value="$800B" label="TAM Total"        sub="remesas Mesoamérica" />
      </div>
      <div className="bg-white/5 border border-white/15 rounded-3xl p-8 max-w-3xl w-full">
        <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-5">Lo que buscamos — Seed Round</p>
        <div className="grid grid-cols-3 gap-4 text-left">
          {[
            { icon: '💰', label: 'Inversión Seed', detail: '$500K – $1.5M USD para GTM en GT/MX + 2 países adicionales + equipo' },
            { icon: '🤝', label: 'Banco ancla', detail: 'Acuerdo fideicomiso con Banrural (GT) y BAC (HN) + Conekta/STP para MX' },
            { icon: '📋', label: 'Licencia IDE/IFPE', detail: 'Acompañamiento proceso SIB Guatemala (IDE) y CNBV México (IFPE)' },
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
  hero: SlideHero, problem: SlideProblem, solution: SlideSolution,
  network: SlideNetwork, legal: SlideLegal, model: SlideModel,
  wallet: SlideWallet, security: SlideSecurity, banks: SlideBanks,
  mexico: SlideMexico, flow: SlideFlow, tech: SlideTech,
  roadmap: SlideRoadmap, traction: SlideTraction, ask: SlideAsk,
};

// ─── Print styles ─────────────────────────────────────────────────────────────
const PRINT_STYLE = `
  @media print {
    @page { size: 1280px 720px landscape; margin: 0; }
    body { background: #0D0B2B !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    .print-slide { page-break-after: always; page-break-inside: avoid; width: 1280px; height: 720px; overflow: hidden; display: flex !important; }
    .print-slide:last-child { page-break-after: auto; }
  }
`;

// ─── Main component ───────────────────────────────────────────────────────────
export default function PitchPage() {
  const [current,   setCurrent]   = useState(0);
  const [animating, setAnimating] = useState(false);
  const [printing,  setPrinting]  = useState(false);

  const total    = SLIDES.length;
  const slideId  = SLIDES[current];
  const SlideComp = SLIDE_COMPONENTS[slideId];

  const go = useCallback((idx: number) => {
    if (animating || idx < 0 || idx >= total) return;
    setAnimating(true);
    setTimeout(() => { setCurrent(idx); setAnimating(false); }, 160);
  }, [animating, total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') go(current + 1);
      if (e.key === 'ArrowLeft')                    go(current - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, go]);

  function handlePrint() {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 300);
  }

  // ── Print mode: render ALL slides ─────────────────────────────────────────
  if (printing) {
    return (
      <div style={{ background: 'radial-gradient(ellipse at 20% 0%, #1E1B4B 0%, #0D0B2B 60%)' }}>
        <style>{PRINT_STYLE}</style>
        {SLIDES.map((id) => {
          const Comp = SLIDE_COMPONENTS[id];
          return (
            <div key={id} className="print-slide" style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
              <Comp />
            </div>
          );
        })}
      </div>
    );
  }

  // ── Normal presentation mode ───────────────────────────────────────────────
  return (
    <>
      <style>{PRINT_STYLE}</style>
      <div
        className="min-h-screen flex flex-col"
        style={{ background: 'radial-gradient(ellipse at 20% 0%, #1E1B4B 0%, #0D0B2B 60%)' }}
      >
        {/* Top bar */}
        <div className="no-print flex items-center justify-between px-6 py-3 border-b border-white/8 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
              <span className="text-[#6C5CE7] font-black text-sm">L</span>
            </div>
            <span className="text-white font-black">LEN</span>
            <span className="text-white/20 mx-1">·</span>
            <span className="text-white/40 text-sm">Investor Deck 2025</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5">
            {SLIDES.map((s, i) => (
              <button key={s} onClick={() => go(i)} title={SLIDE_LABELS[s]}
                className={`transition-all rounded-full ${i === current ? 'w-6 h-2 bg-[#6C5CE7]' : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`} />
            ))}
          </div>
          <div className="flex items-center gap-3">
            {/* Download button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20
                         text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
              title="Descargar como PDF (Ctrl+P)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              PDF
            </button>
            <span className="text-white/30 text-sm font-mono">{current + 1}/{total}</span>
          </div>
        </div>

        {/* Slide */}
        <div className="flex-1 transition-opacity duration-160" style={{ opacity: animating ? 0 : 1 }}>
          <SlideComp />
        </div>

        {/* Bottom nav */}
        <div className="no-print flex items-center justify-between px-6 py-3 border-t border-white/8 flex-shrink-0">
          <div className="hidden lg:flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {SLIDES.map((s, i) => (
              <button key={s} onClick={() => go(i)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg transition-all font-medium
                  ${i === current
                    ? 'bg-[#6C5CE7]/30 text-[#A29BFE] border border-[#6C5CE7]/50'
                    : 'text-white/30 hover:text-white/60 hover:bg-white/5'}`}>
                {SLIDE_LABELS[s]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <button onClick={() => go(current - 1)} disabled={current === 0}
              className="w-10 h-10 rounded-xl border border-white/15 text-white/60 flex items-center justify-center hover:border-white/30 hover:text-white transition-all disabled:opacity-20">
              ←
            </button>
            <button onClick={() => go(current + 1)} disabled={current === total - 1}
              className="w-10 h-10 rounded-xl bg-[#6C5CE7] text-white flex items-center justify-center hover:bg-[#7C6CF7] transition-all disabled:opacity-30">
              →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
