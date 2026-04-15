'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';

// ─── Language ─────────────────────────────────────────────────────────────────
type Lang = 'es' | 'en';
const LangCtx = createContext<Lang>('es');
const useLang = () => useContext(LangCtx);

// ─── Slide registry ───────────────────────────────────────────────────────────
const SLIDES = [
  'hero', 'problem', 'solution', 'network',
  'legal', 'model', 'wallet', 'security',
  'banks', 'mexico', 'flow', 'tech', 'roadmap', 'traction', 'ask',
] as const;
type SlideId = typeof SLIDES[number];

const SLIDE_LABELS: Record<SlideId, { es: string; en: string }> = {
  hero:     { es: 'Intro',       en: 'Intro' },
  problem:  { es: 'Problema',    en: 'Problem' },
  solution: { es: 'Solución',    en: 'Solution' },
  network:  { es: 'Red',         en: 'Network' },
  legal:    { es: 'Legal',       en: 'Legal' },
  model:    { es: 'Modelo',      en: 'Model' },
  wallet:   { es: 'Wallet',      en: 'Wallet' },
  security: { es: 'Seguridad',   en: 'Security' },
  banks:    { es: 'Bancos',      en: 'Banks' },
  mexico:   { es: 'México',      en: 'Mexico' },
  flow:     { es: 'Flujo',       en: 'Flow' },
  tech:     { es: 'Tecnología',  en: 'Tech' },
  roadmap:  { es: 'Roadmap',     en: 'Roadmap' },
  traction: { es: 'Mercado',     en: 'Market' },
  ask:      { es: 'Pitch',       en: 'Ask' },
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
  const lang = useLang();
  const t = lang === 'en' ? {
    tag: 'Mesoamerican TokenCoin Network',
    title1: 'The native', hi: 'TokenCoin network', title2: 'of Mesoamerica',
    sub: 'Instant transfers between Guatemala, Mexico and Honduras. One token per currency, backed 1:1. No intermediary banks.',
    soon: 'soon', countries: 'Active countries', fee: 'Min. fee', tam: 'TAM informal economy',
    phase: 'Phase 1',
  } : {
    tag: 'Red TokenCoin de Mesoamérica',
    title1: 'La red de', hi: 'TokenCoins', title2: 'nativa de Mesoamérica',
    sub: 'Transferencias instantáneas entre Guatemala, México y Honduras. Un token por moneda, respaldado 1:1. Sin bancos intermediarios.',
    soon: 'pronto', countries: 'Países activos', fee: 'Comisión mínima', tam: 'TAM economía informal',
    phase: 'Fase 1',
  };
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
          {t.title1} <span className="text-[#A29BFE]">{t.hi}</span><br />{t.title2}
        </h1>
        <p className="text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">{t.sub}</p>
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
              {c.soon ? t.soon : `= 1 ${c.fiat}`}
            </span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6 pt-2">
        <Stat value="3"     label={t.countries}  sub={t.phase} />
        <Stat value="0.3%"  label={t.fee}        sub="vs 5–8% WU" />
        <Stat value="$500M" label={t.tam}        sub="GT · MX · HN" />
      </div>
    </div>
  );
}

function SlideProblem() {
  const lang = useLang();
  const t = lang === 'en' ? {
    tag: '01 — The Problem',
    title: 'Moving money in', hi: 'Mesoamerica is broken',
    sub: '12% of Guatemala\'s GDP is remittances. The cost of sending them is unacceptable.',
    problems: [
      { icon: '💸', title: '5–8% in fees', desc: 'Western Union, Remitly and MoneyGram charge $5–$40 per transfer. On a $300 remittance that\'s 13%.', stat: '$48B lost in fees per year in Mesoamerica alone' },
      { icon: '⏳', title: '1–5 day delays', desc: 'International bank transfers between GT, MX and HN take business days.', stat: '47% of recipients need the money same-day' },
      { icon: '🏦', title: '65% unbanked', desc: 'Most of the population in CA has no access to formal financial services.', stat: '38M unbanked people in the region' },
      { icon: '📱', title: 'No common infrastructure', desc: 'Each country has its own system. There is no "Mesoamerican SPEI". Banks don\'t talk to each other.', stat: 'Each remittance crosses 3–4 intermediaries' },
    ],
  } : {
    tag: '01 — El Problema',
    title: 'Mover dinero en', hi: 'Mesoamérica está roto',
    sub: 'El 12% del PIB de Guatemala son remesas. El costo de enviarlas es inaceptable.',
    problems: [
      { icon: '💸', title: '5–8% de comisión', desc: 'Western Union, Remitly y MoneyGram cobran entre $5 y $40 por envío. En remesas de $300 eso es el 13%.', stat: '$48B perdidos en fees al año solo en Mesoamérica' },
      { icon: '⏳', title: '1–5 días de espera', desc: 'Las transferencias bancarias internacionales entre GT, MX y HN tardan días hábiles.', stat: '47% de receptores necesitan el dinero el mismo día' },
      { icon: '🏦', title: '65% sin cuenta bancaria', desc: 'La mayoría de la población en CA no tiene acceso a servicios financieros formales.', stat: '38M personas desbancarizadas en la región' },
      { icon: '📱', title: 'Sin infraestructura común', desc: 'Cada país tiene su sistema. No hay una "SPEI mesoamericana". Los bancos no se comunican.', stat: 'Cada remesa cruza 3–4 intermediarios' },
    ],
  };
  return (
    <div className="flex flex-col h-full px-8 py-6">
      <Tag>{t.tag}</Tag>
      <h2 className="text-4xl lg:text-5xl font-black text-white mb-3">
        {t.title}<br /><span className="text-red-400">{t.hi}</span>
      </h2>
      <p className="text-white/50 text-lg mb-8">{t.sub}</p>
      <div className="grid grid-cols-2 gap-5 flex-1">
        {t.problems.map(p => (
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
  const lang = useLang();
  const t = lang === 'en' ? {
    tag: '02 — The Solution',
    title: 'One token per country.', hi: 'One system.',
    sub: 'LEN issues digital tokens backed 1:1. Transferring QUETZA to LEMPI is instant and costs 0.3%.',
    labels: [
      { label: 'Carlos GT', sub: 'deposits Q 500' },
      { label: 'QUETZA', sub: '500 tokens' },
      { label: 'FX 0.3%', sub: 'automatic' },
      { label: 'LEMPI', sub: '1,280 tokens' },
      { label: 'María HN', sub: 'receives L 1,280' },
    ],
    features: [
      { icon: '⚡', title: 'Instant', desc: 'Confirmed in seconds. No banking wait times.' },
      { icon: '🔒', title: 'Backed 1:1', desc: 'Every token has 1 unit of local currency in reserve.' },
      { icon: '🌎', title: 'Borderless', desc: 'Automatic FX between all LEN countries.' },
    ],
  } : {
    tag: '02 — La Solución',
    title: 'Un token por país.', hi: 'Un solo sistema.',
    sub: 'LEN emite tokens digitales respaldados 1:1. Transferir QUETZA a LEMPI es instantáneo y cuesta 0.3%.',
    labels: [
      { label: 'Carlos GT', sub: 'deposita Q 500' },
      { label: 'QUETZA', sub: '500 tokens' },
      { label: 'FX 0.3%', sub: 'automático' },
      { label: 'LEMPI', sub: '1,280 tokens' },
      { label: 'María HN', sub: 'recibe L 1,280' },
    ],
    features: [
      { icon: '⚡', title: 'Instantáneo', desc: 'Confirmado en segundos. Sin días de espera bancaria.' },
      { icon: '🔒', title: 'Respaldado 1:1', desc: 'Cada token tiene 1 unidad de moneda local en reserva.' },
      { icon: '🌎', title: 'Sin fronteras', desc: 'FX automático entre todos los países LEN.' },
    ],
  };
  const flow = [
    { ...t.labels[0], bg: 'bg-indigo-500/20 border-indigo-500/40', tc: 'text-indigo-300' },
    { label: '→', sub: '', bg: '', tc: 'text-white/30 text-3xl font-black' },
    { ...t.labels[1], bg: 'bg-[#6C5CE7]/25 border-[#6C5CE7]/50', tc: 'text-[#A29BFE]' },
    { label: '→', sub: '', bg: '', tc: 'text-white/30 text-3xl font-black' },
    { ...t.labels[2], bg: 'bg-emerald-500/15 border-emerald-500/30', tc: 'text-emerald-400' },
    { label: '→', sub: '', bg: '', tc: 'text-white/30 text-3xl font-black' },
    { ...t.labels[3], bg: 'bg-[#6C5CE7]/25 border-[#6C5CE7]/50', tc: 'text-[#A29BFE]' },
    { label: '→', sub: '', bg: '', tc: 'text-white/30 text-3xl font-black' },
    { ...t.labels[4], bg: 'bg-indigo-500/20 border-indigo-500/40', tc: 'text-indigo-300' },
  ];
  return (
    <div className="flex flex-col h-full px-8 py-6">
      <Tag>{t.tag}</Tag>
      <h2 className="text-4xl lg:text-5xl font-black text-white mb-3">
        {t.title}<br /><span className="text-[#A29BFE]">{t.hi}</span>
      </h2>
      <p className="text-white/50 text-lg mb-8">{t.sub}</p>
      <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
        {flow.map((item, i) =>
          item.label === '→'
            ? <div key={i} className="text-white/30 text-3xl font-black">→</div>
            : <div key={i} className={`border rounded-2xl px-5 py-3 text-center ${item.bg}`}>
                <p className={`font-black text-sm ${item.tc}`}>{item.label}</p>
                {item.sub && <p className="text-white/40 text-xs mt-0.5">{item.sub}</p>}
              </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-5">
        {t.features.map(f => (
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
  const lang = useLang();
  const t = lang === 'en' ? {
    tag: '03 — TokenCoin Network',
    title: 'One token per currency,', hi: 'the whole region',
    sub: '8 countries · 8 currencies · 1 network · Modular expansion by phases',
    phase: 'Phase',
  } : {
    tag: '03 — Red TokenCoin',
    title: 'Un token por moneda,', hi: 'toda la región',
    sub: '8 países · 8 monedas · 1 red · Expansión modular por fases',
    phase: 'Fase',
  };
  const coins = [
    { flag: '🇬🇹', code: 'QUETZA',  fiat: 'GTQ', country: lang === 'en' ? 'Guatemala'   : 'Guatemala',  phase: 1, status: lang === 'en' ? 'Live' : 'Activo' },
    { flag: '🇲🇽', code: 'MEXCOIN', fiat: 'MXN', country: lang === 'en' ? 'Mexico'       : 'México',     phase: 1, status: lang === 'en' ? 'Live' : 'Activo' },
    { flag: '🇭🇳', code: 'LEMPI',   fiat: 'HNL', country: lang === 'en' ? 'Honduras'     : 'Honduras',   phase: 1, status: lang === 'en' ? 'Live' : 'Activo' },
    { flag: '🇸🇻', code: 'COLÓN',   fiat: 'USD', country: lang === 'en' ? 'El Salvador'  : 'El Salvador',phase: 2, status: 'Q3 2025' },
    { flag: '🇧🇿', code: 'TIKAL',   fiat: 'BZD', country: 'Belize',      phase: 3, status: 'Q1 2026' },
    { flag: '🇳🇮', code: 'NICORD',  fiat: 'NIO', country: 'Nicaragua',   phase: 3, status: 'Q1 2026' },
    { flag: '🇨🇷', code: 'CORI',    fiat: 'CRC', country: lang === 'en' ? 'Costa Rica'   : 'Costa Rica', phase: 3, status: 'Q2 2026' },
    { flag: '🇵🇦', code: 'BALBÓA',  fiat: 'USD', country: lang === 'en' ? 'Panama'       : 'Panamá',     phase: 3, status: 'Q3 2026' },
  ];
  return (
    <div className="flex flex-col h-full px-8 py-6">
      <Tag>{t.tag}</Tag>
      <h2 className="text-4xl font-black text-white mb-2">{t.title}<br /><span className="text-[#A29BFE]">{t.hi}</span></h2>
      <p className="text-white/50 mb-8">{t.sub}</p>
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
              {t.phase} {c.phase}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideLegal() {
  const lang = useLang();
  const t = lang === 'en' ? {
    tag: '04 — Legal Structure',
    title: 'American software.', hi: 'Guatemalan tokens.',
    sub: 'The structure used by the world\'s top fintechs to scale fast and protect IP.',
    corp: {
      name: 'LEN Technologies Inc.', sub: 'Delaware C-Corp',
      items: ['Owns the LEN software and brand','Receives licensing royalties','Raises capital from US investors','Does NOT operate directly in GT/MX/HN','Protected from local banking regulation'],
      badge: 'Receives: royalties + equity gains',
    },
    arrow: { title: 'License Agreement', p1: 'Software licensed to GT S.A.', p2: 'Royalty: X% of revenue', title2: 'Token Instruction', p3: 'GT S.A. instructs the trustee', p4: 'to issue / burn tokens' },
    sa: {
      name: 'LEN Red Digital S.A.', sub: 'Guatemala Operator',
      items: ['Issues QUETZA/MEXCOIN/LEMPI tokens','Operates the platform (US license)','Local AML/KYC compliance','Signs agreements with local banks'],
    },
    trust: {
      name: 'Reserve Trust', sub: 'Banrural / BAC (trustee)',
      items: ['Holds user GTQ/HNL','GT S.A. = settlor','Users = beneficiaries','Funds NEVER belong to LEN','Regulated under GT banking law'],
    },
  } : {
    tag: '04 — Estructura Legal',
    title: 'Software americano.', hi: 'Tokens guatemaltecos.',
    sub: 'La estructura que usan las mejores fintechs del mundo para escalar rápido y proteger el IP.',
    corp: {
      name: 'LEN Technologies Inc.', sub: 'Delaware C-Corp',
      items: ['Dueña del software y la marca LEN','Recibe royalties de licencia','Levanta capital de inversionistas US','NO opera directamente en GT/MX/HN','Protegida de regulación bancaria local'],
      badge: 'Recibe: royalties + equity gains',
    },
    arrow: { title: 'Acuerdo de licencia', p1: 'Software licenciado a GT S.A.', p2: 'Royalty: X% de revenue', title2: 'Instrucción de tokens', p3: 'GT S.A. instruye al fiduciario', p4: 'Emitir / quemar tokens' },
    sa: {
      name: 'LEN Red Digital S.A.', sub: 'Operadora Guatemala',
      items: ['Emite tokens QUETZA/MEXCOIN/LEMPI','Opera la plataforma (licencia US)','Cumple AML/KYC local','Firma acuerdos con bancos locales'],
    },
    trust: {
      name: 'Fideicomiso de Reserva', sub: 'Banrural / BAC (fiduciario)',
      items: ['Custodia el GTQ/HNL de usuarios','GT S.A. = fideicomitente','Usuarios = fideicomisarios','Fondos NUNCA son de LEN','Regulado bajo ley bancaria GT'],
    },
  };
  return (
    <div className="flex flex-col h-full px-8 py-6">
      <Tag>{t.tag}</Tag>
      <h2 className="text-4xl font-black text-white mb-2">{t.title}<br /><span className="text-[#A29BFE]">{t.hi}</span></h2>
      <p className="text-white/50 mb-8">{t.sub}</p>
      <div className="grid grid-cols-3 gap-5 flex-1">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🇺🇸</span>
            <div><p className="text-blue-300 font-black">{t.corp.name}</p><p className="text-white/40 text-xs">{t.corp.sub}</p></div>
          </div>
          <ul className="space-y-2 flex-1">
            {t.corp.items.map(i => (
              <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                <span className="text-blue-400 mt-0.5 flex-shrink-0">▸</span>{i}
              </li>
            ))}
          </ul>
          <div className="bg-blue-500/15 rounded-xl px-3 py-2">
            <p className="text-blue-300 text-xs font-bold">{t.corp.badge}</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="text-white/20 text-center space-y-2">
            <p className="text-3xl">↓</p>
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white/50 text-center">
              <p className="font-bold text-white/70 mb-1">{t.arrow.title}</p>
              <p>{t.arrow.p1}</p><p className="mt-1">{t.arrow.p2}</p>
            </div>
            <p className="text-3xl">↓</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white/50 text-center">
            <p className="font-bold text-white/70 mb-1">{t.arrow.title2}</p>
            <p>{t.arrow.p3}</p><p className="mt-1">{t.arrow.p4}</p>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="bg-[#6C5CE7]/15 border border-[#6C5CE7]/40 rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🇬🇹</span>
              <div><p className="text-[#A29BFE] font-black">{t.sa.name}</p><p className="text-white/40 text-xs">{t.sa.sub}</p></div>
            </div>
            <ul className="space-y-1.5">
              {t.sa.items.map(i => (
                <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                  <span className="text-[#A29BFE] mt-0.5 flex-shrink-0">▸</span>{i}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏛</span>
              <div><p className="text-emerald-400 font-black text-sm">{t.trust.name}</p><p className="text-white/40 text-xs">{t.trust.sub}</p></div>
            </div>
            <ul className="space-y-1.5">
              {t.trust.items.map(i => (
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
  const lang = useLang();
  const t = lang === 'en' ? {
    tag: '05 — Operating Model',
    title: "We're not a bank.", hi: "We're token issuers.",
    sub: 'The legal distinction that defines everything. Same model as Circle (USDC), Tether and Bitso.',
    not: '❌ What we are NOT',
    notItems: ['A bank that takes deposits','An institution that lends user funds','A regulated financial intermediary','Custodians of user fiat'],
    yes: '✅ What we ARE',
    yesItems: ['A software company (IP in USA)','Issuer of 1:1 backed tokens','Fiat is in regulated bank trust (GT/HN) or user sub-CLABE (MX)','Same as Tether, Circle, Bitso at launch'],
    cols: ['Model','Intermediation','Launch','Initial Cost','Legal Risk'],
    note: '★ = Selected model for LEN Phase 1',
    rows: [
      { model: 'Pool account (bank)', inter: true,  launch: 'Immediate', cost: '$0',         risk: 'High legal — deposit-taking', highlight: false },
      { model: 'Trust + token issuance GT/HN', inter: false, launch: '3–6 wks', cost: '$5–15K', risk: 'Minimal — not a deposit', highlight: true },
      { model: 'STP sub-CLABE per user (MX)', inter: false, launch: '2–4 wks', cost: 'API costs', risk: 'Minimal — user\'s own funds', highlight: true },
      { model: 'BaaS partner (Bitso/BAC)', inter: false, launch: '4–8 wks', cost: 'Rev share', risk: 'Low — partner dependency', highlight: false },
      { model: 'IFPE/IDE own license', inter: false, launch: '6–18 mo', cost: '$50–200K', risk: 'Low — long term', highlight: false },
    ],
    yes_label: '✓ No', no_label: '⚠ Yes',
  } : {
    tag: '05 — Modelo de Gestión',
    title: 'No somos un banco.', hi: 'Somos emisores de tokens.',
    sub: 'La distinción legal que define todo. Mismo modelo que Circle (USDC), Tether y Bitso.',
    not: '❌ Lo que NO somos',
    notItems: ['Un banco que capta depósitos','Una institución que presta el dinero de los usuarios','Un intermediario financiero regulado','Custodios del fiat de los usuarios'],
    yes: '✅ Lo que SÍ somos',
    yesItems: ['Empresa de software (IP en USA)','Emisor de tokens respaldados 1:1','El fiat está en fideicomiso bancario regulado (GT/HN) o en sub-CLABE del usuario (MX)','Igual que Tether, Circle, Bitso en su inicio'],
    cols: ['Modelo','Intermediación','Lanzamiento','Costo inicial','Riesgo legal'],
    note: '★ = Modelo seleccionado para Fase 1 LEN',
    rows: [
      { model: 'Pool account (banco)', inter: true,  launch: 'Inmediato', cost: '$0',         risk: 'Legal alto — captación', highlight: false },
      { model: 'Fideicomiso + emisión token GT/HN', inter: false, launch: '3–6 sem', cost: '$5–15K', risk: 'Mínimo — no es depósito', highlight: true },
      { model: 'STP sub-CLABE por usuario (MX)', inter: false, launch: '2–4 sem', cost: 'API costs', risk: 'Mínimo — fondos del usuario', highlight: true },
      { model: 'BaaS partner (Bitso/BAC)', inter: false, launch: '4–8 sem', cost: 'Rev share', risk: 'Bajo — dependencia partner', highlight: false },
      { model: 'IFPE/IDE licencia propia', inter: false, launch: '6–18 meses', cost: '$50–200K', risk: 'Bajo — largo plazo', highlight: false },
    ],
    yes_label: '✓ No', no_label: '⚠ Sí',
  };
  return (
    <div className="flex flex-col h-full px-8 py-6">
      <Tag>{t.tag}</Tag>
      <h2 className="text-4xl font-black text-white mb-2">
        {t.title}<br /><span className="text-[#A29BFE]">{t.hi}</span>
      </h2>
      <p className="text-white/50 mb-6">{t.sub}</p>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-5">
          <p className="text-red-400 font-black mb-3">{t.not}</p>
          <ul className="space-y-2 text-sm text-white/60">
            {t.notItems.map(i => (
              <li key={i} className="flex items-start gap-2"><span className="text-red-500 flex-shrink-0">✗</span>{i}</li>
            ))}
          </ul>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-5">
          <p className="text-emerald-400 font-black mb-3">{t.yes}</p>
          <ul className="space-y-2 text-sm text-white/60">
            {t.yesItems.map(i => (
              <li key={i} className="flex items-start gap-2"><span className="text-emerald-400 flex-shrink-0">✓</span>{i}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="bg-white/3 border border-white/10 rounded-2xl overflow-hidden flex-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              {t.cols.map(c => <th key={c} className="text-left px-4 py-3 text-white/40 text-xs uppercase tracking-wide font-bold">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {t.rows.map((r, i) => (
              <tr key={i} className={`border-b border-white/5 ${r.highlight ? 'bg-[#6C5CE7]/15 border-[#6C5CE7]/20' : ''}`}>
                <td className="px-4 py-3"><span className={`font-semibold ${r.highlight ? 'text-white' : 'text-white/60'}`}>{r.highlight && <span className="text-[#A29BFE] mr-1">★</span>}{r.model}</span></td>
                <td className="px-3 py-3 text-center">{r.inter ? <span className="text-red-400 font-bold">{t.no_label}</span> : <span className="text-emerald-400 font-bold">{t.yes_label}</span>}</td>
                <td className="px-3 py-3 text-center"><span className={`text-xs font-bold px-2 py-1 rounded-lg ${r.highlight ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/50'}`}>{r.launch}</span></td>
                <td className="px-3 py-3 text-center text-white/50 text-xs">{r.cost}</td>
                <td className="px-4 py-3 text-white/50 text-xs">{r.risk}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-white/5 bg-white/3">
          <p className="text-xs text-white/30">{t.note}</p>
        </div>
      </div>
    </div>
  );
}

function SlideWallet() {
  const lang = useLang();
  const t = lang === 'en' ? {
    tag: '06 — The Wallet',
    title: 'A bank in your pocket —', hi: 'without being a bank',
    sub: 'iOS · Android · Web. No bank account required.',
    features: [
      { icon: '💰', title: 'Dual balance', desc: 'Fiat balance (unconverted) and tokens separated. User controls when to convert.', chips: ['fiatBalance', 'tokenBalance'] },
      { icon: '🔄', title: 'Buy / Sell tokens', desc: '1:1 conversion between fiat and tokens. No fee to buy. 0.5% to sell.', chips: ['1:1 peg', '0.5% sell'] },
      { icon: '📤', title: 'P2P Transfers', desc: 'Instant to any LEN wallet. Same country: 0%. International: 0.3%.', chips: ['Instant', '0.3% FX'] },
      { icon: '🏦', title: 'Bank withdrawal', desc: 'From fiat balance to any bank in the country. Instant SPEI MX, 30–60 min GT/HN.', chips: ['ACH GT', 'SPEI MX', 'SIEFOM HN'] },
      { icon: '🧾', title: 'PNG Voucher', desc: 'Shareable digital receipt. Pure Canvas 2D, works on all mobile devices.', chips: ['PNG', 'Web Share API'] },
      { icon: '📊', title: 'Full history', desc: 'Every cent tracked: type, status, unique ID, date, fee. Auditable.', chips: ['TX ID', 'Audit'] },
    ],
  } : {
    tag: '06 — La Wallet',
    title: 'Un banco en el bolsillo —', hi: 'sin ser un banco',
    sub: 'iOS · Android · Web. Sin cuenta bancaria requerida.',
    features: [
      { icon: '💰', title: 'Balance dual', desc: 'Saldo fiat (sin convertir) y tokens separados. El usuario controla cuándo convierte.', chips: ['fiatBalance', 'tokenBalance'] },
      { icon: '🔄', title: 'Compra / Venta tokens', desc: 'Conversión 1:1 entre fiat y tokens. Sin comisión al comprar. 0.5% al vender.', chips: ['1:1 peg', '0.5% sell'] },
      { icon: '📤', title: 'Envío P2P', desc: 'Instantáneo a cualquier wallet LEN. Mismo país: 0%. Internacional: 0.3%.', chips: ['Instant', '0.3% FX'] },
      { icon: '🏦', title: 'Retiro bancario', desc: 'Del saldo fiat a cualquier banco del país. SPEI inmediato MX, 30–60 min GT/HN.', chips: ['ACH GT', 'SPEI MX', 'SIEFOM HN'] },
      { icon: '🧾', title: 'Voucher PNG', desc: 'Comprobante digital compartible. Canvas 2D puro, funciona en todos los móviles.', chips: ['PNG', 'Web Share API'] },
      { icon: '📊', title: 'Historial completo', desc: 'Cada centavo rastreado: tipo, estado, ID único, fecha, fee. Auditable.', chips: ['TX ID', 'Auditoría'] },
    ],
  };
  return (
    <div className="flex flex-col h-full px-8 py-6">
      <Tag>{t.tag}</Tag>
      <h2 className="text-4xl font-black text-white mb-2">{t.title}<br /><span className="text-[#A29BFE]">{t.hi}</span></h2>
      <p className="text-white/50 mb-8">{t.sub}</p>
      <div className="grid grid-cols-3 gap-4 flex-1">
        {t.features.map(f => (
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
  const lang = useLang();
  const t = lang === 'en' ? {
    tag: '07 — Security',
    title: 'Institutional-grade', hi: 'financial security',
    sub: 'Each layer protects a different attack vector.',
    layers: [
      { n: '01', t: '6-digit PIN + bcrypt',          d: 'Never in plain text. Salt rounds 12. Rate limiting anti-brute force.',   c: 'text-[#A29BFE]' },
      { n: '02', t: 'JWT + Rotating Refresh',         d: 'Access token 15 min. Refresh 30 days with rotation. Blacklist in Redis.', c: 'text-emerald-400' },
      { n: '03', t: 'HMAC-SHA256 on webhooks',        d: 'Every bank notification verified. Rejected if signature doesn\'t match.', c: 'text-amber-400' },
      { n: '04', t: 'Banking idempotency',             d: 'externalReference UNIQUE in DB. Same deposit never credited twice.',      c: 'text-blue-400' },
      { n: '05', t: 'Replay prevention',               d: 'Webhooks with timestamp. Rejected if >5 minutes old.',                   c: 'text-rose-400' },
      { n: '06', t: 'Segregated funds (trust)',        d: 'Reserves in bank trust — never mixed with LEN capital.',                 c: 'text-purple-400' },
      { n: '07', t: 'Isolated admin panel',            d: 'Separate Next.js app with independent auth. No shared session with users.', c: 'text-cyan-400' },
    ],
    kycTitle: 'KYC / Limits',
    kyc: [
      { level: 'KYC 0', limit: 'View only', c: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
      { level: 'KYC 1', limit: 'Q 5,000/day', c: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
      { level: 'KYC 2', limit: 'Q 25,000/day', c: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
      { level: 'KYC 3', limit: 'Unlimited (institutional)', c: 'bg-[#6C5CE7]/20 text-[#A29BFE] border-[#6C5CE7]/30' },
    ],
    complianceTitle: 'Compliance',
    compliance: ['✓ AML — Real-time monitoring','✓ LAFT — Guatemala anti-laundering law','✓ FATF — International standards','✓ Auditable logs 5 years','✓ Automatic suspicious activity reporting','✓ GAFILAT — Mesoamerican AML group'],
    reg: '🏛 Regulatory framework',
    regNote: 'LEN operates under the token regulatory vacuum in GT/HN (same as Tigo Money at launch). GT IDE license in progress. MX IFPE via partner (Bitso/Conekta).',
  } : {
    tag: '07 — Seguridad',
    title: 'Seguridad de grado', hi: 'institucional financiero',
    sub: 'Cada capa protege un vector de ataque distinto.',
    layers: [
      { n: '01', t: 'PIN 6 dígitos + bcrypt',         d: 'Nunca en texto plano. Salt rounds 12. Rate limiting anti-fuerza bruta.', c: 'text-[#A29BFE]' },
      { n: '02', t: 'JWT + Refresh rotativo',          d: 'Access token 15 min. Refresh 30 días con rotación. Blacklist en Redis.',  c: 'text-emerald-400' },
      { n: '03', t: 'HMAC-SHA256 en webhooks',         d: 'Cada notificación bancaria verificada. Rechazada si firma no coincide.', c: 'text-amber-400' },
      { n: '04', t: 'Idempotencia bancaria',            d: 'externalReference UNIQUE en DB. El mismo depósito no se acredita dos veces.', c: 'text-blue-400' },
      { n: '05', t: 'Replay prevention',                d: 'Webhooks con timestamp. Rechazo si >5 minutos de antigüedad.',           c: 'text-rose-400' },
      { n: '06', t: 'Fondos segregados (fideicomiso)', d: 'Reservas en fideicomiso bancario — nunca mezcladas con capital de LEN.', c: 'text-purple-400' },
      { n: '07', t: 'Panel Admin aislado',              d: 'App Next.js separada con autenticación independiente. Sin sesión compartida con usuarios.', c: 'text-cyan-400' },
    ],
    kycTitle: 'KYC / Límites',
    kyc: [
      { level: 'KYC 0', limit: 'Solo visualización', c: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
      { level: 'KYC 1', limit: 'Q 5,000/día', c: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
      { level: 'KYC 2', limit: 'Q 25,000/día', c: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
      { level: 'KYC 3', limit: 'Sin límite (institucional)', c: 'bg-[#6C5CE7]/20 text-[#A29BFE] border-[#6C5CE7]/30' },
    ],
    complianceTitle: 'Compliance',
    compliance: ['✓ AML — Monitoreo en tiempo real','✓ LAFT — Ley contra lavado GT','✓ FATF — Estándares internacionales','✓ Logs auditables 5 años','✓ Reporte automático operaciones sospechosas','✓ GAFILAT — Grupo AML mesoamericano'],
    reg: '🏛 Marco regulatorio',
    regNote: 'LEN opera bajo vacío regulatorio de tokens en GT/HN (igual que Tigo Money en sus inicios). Licencia IDE GT en proceso. IFPE MX vía partner (Bitso/Conekta).',
  };
  return (
    <div className="flex flex-col h-full px-8 py-6">
      <Tag>{t.tag}</Tag>
      <h2 className="text-4xl font-black text-white mb-2">{t.title}<br /><span className="text-[#A29BFE]">{t.hi}</span></h2>
      <p className="text-white/50 mb-8">{t.sub}</p>
      <div className="grid grid-cols-2 gap-6 flex-1">
        <div className="space-y-3">
          {t.layers.map(l => (
            <div key={l.n} className="flex items-start gap-4 bg-white/4 border border-white/8 rounded-xl p-4">
              <span className={`font-black text-lg ${l.c} flex-shrink-0 w-8`}>{l.n}</span>
              <div><p className="text-white font-bold text-sm">{l.t}</p><p className="text-white/40 text-xs mt-0.5 leading-relaxed">{l.d}</p></div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="bg-white/4 border border-white/10 rounded-2xl p-5">
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">{t.kycTitle}</p>
            {t.kyc.map(k => (
              <div key={k.level} className="flex items-center justify-between mb-2 last:mb-0">
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${k.c}`}>{k.level}</span>
                <span className="text-white/50 text-sm">{k.limit}</span>
              </div>
            ))}
          </div>
          <div className="bg-white/4 border border-white/10 rounded-2xl p-5">
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3">{t.complianceTitle}</p>
            {t.compliance.map(i => <p key={i} className="text-white/60 text-sm mb-1">{i}</p>)}
          </div>
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4">
            <p className="text-amber-400 font-bold text-sm mb-1">{t.reg}</p>
            <p className="text-amber-300/70 text-xs leading-relaxed">{t.regNote}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideBanks() {
  const lang = useLang();
  const t = lang === 'en' ? {
    tag: '08 — Banking Connectivity',
    title: 'Trust GT/HN.', hi: 'Sub-CLABE MX.',
    sub: 'Fiat is NEVER LEN\'s. It belongs to the user in regulated bank custody.',
    custodian: 'Custodian', deposit_in: 'Deposit (inbound)', withdraw_out: 'Withdrawal (outbound)',
    inbound: 'Inbound', outbound: 'Outbound', security: 'Security',
    countries: [
      { flag: '🇬🇹', country: 'Guatemala', currency: 'GTQ', model: 'Trust', bank: 'Banrural (trustee)',
        deposit: 'Sub-account 1832-2383738-XXXX\n(last 4 = user wallet ID)',
        withdraw: 'ACH BANGUAT → Industrial, BAM,\nG&T, Bantrab, Promerica, Citi GT...',
        eta_in: '15–30 min', eta_out: '15–60 min M-F', color: 'border-blue-500/30 bg-blue-500/8' },
      { flag: '🇲🇽', country: 'Mexico', currency: 'MXN', model: 'STP sub-CLABE',bank: 'STP / Conekta',
        deposit: 'Unique 18-digit virtual CLABE\nper user — NOT a LEN account',
        withdraw: 'SPEI → any MX bank\nBBVA, Nu, Santander, Mercado Pago...',
        eta_in: 'Instant 24/7', eta_out: 'Instant 24/7', color: 'border-emerald-500/30 bg-emerald-500/8' },
      { flag: '🇭🇳', country: 'Honduras', currency: 'HNL', model: 'Trust', bank: 'BAC Credomatic (trustee)',
        deposit: 'Sub-account 3090-2847561-XXXX\n(last 4 = user wallet ID)',
        withdraw: 'SIEFOM → Atlántida, Ficohsa,\nBanpaís, Occidente, Davivienda...',
        eta_in: '15–30 min', eta_out: '30–60 min M-F', color: 'border-[#6C5CE7]/30 bg-[#6C5CE7]/8' },
    ],
    badges: ['🔐 HMAC-SHA256 per webhook','⏱ Replay prevention 5min','🔁 Guaranteed idempotency','🏛 Trust regulated by law','📋 Full audit trail','🔒 Bank accounts encrypted in Firestore','⚙️ Admin panel with full KYC/AML queue'],
  } : {
    tag: '08 — Conectividad Bancaria',
    title: 'Fideicomiso GT/HN.', hi: 'Sub-CLABE MX.',
    sub: 'El fiat NUNCA es de LEN. Es del usuario en custodia bancaria regulada.',
    custodian: 'Institución custodio', deposit_in: 'Depósito (entrada)', withdraw_out: 'Retiro (salida)',
    inbound: 'Entrada', outbound: 'Salida', security: 'Seguridad',
    countries: [
      { flag: '🇬🇹', country: 'Guatemala', currency: 'GTQ', model: 'Fideicomiso', bank: 'Banrural (fiduciario)',
        deposit: 'Sub-cuenta 1832-2383738-XXXX\n(últimos 4 = wallet ID del usuario)',
        withdraw: 'ACH BANGUAT → Industrial, BAM,\nG&T, Bantrab, Promerica, Citi GT...',
        eta_in: '15–30 min', eta_out: '15–60 min L-V', color: 'border-blue-500/30 bg-blue-500/8' },
      { flag: '🇲🇽', country: 'México', currency: 'MXN', model: 'STP sub-CLABE', bank: 'STP / Conekta',
        deposit: 'CLABE virtual 18 dígitos exclusiva\npor usuario — NO es cuenta de LEN',
        withdraw: 'SPEI → cualquier banco MX\nBBVA, Nu, Santander, Mercado Pago...',
        eta_in: 'Inmediato 24/7', eta_out: 'Inmediato 24/7', color: 'border-emerald-500/30 bg-emerald-500/8' },
      { flag: '🇭🇳', country: 'Honduras', currency: 'HNL', model: 'Fideicomiso', bank: 'BAC Credomatic (fiduciario)',
        deposit: 'Sub-cuenta 3090-2847561-XXXX\n(últimos 4 = wallet ID del usuario)',
        withdraw: 'SIEFOM → Atlántida, Ficohsa,\nBanpaís, Occidente, Davivienda...',
        eta_in: '15–30 min', eta_out: '30–60 min L-V', color: 'border-[#6C5CE7]/30 bg-[#6C5CE7]/8' },
    ],
    badges: ['🔐 HMAC-SHA256 por webhook','⏱ Replay prevention 5min','🔁 Idempotencia garantizada','🏛 Fideicomiso regulado por ley','📋 Auditoría completa','🔒 Cuentas bancarias cifradas en Firestore','⚙️ Panel admin con cola KYC/AML'],
  };
  return (
    <div className="flex flex-col h-full px-8 py-6">
      <Tag>{t.tag}</Tag>
      <h2 className="text-4xl font-black text-white mb-2">{t.title}<br /><span className="text-[#A29BFE]">{t.hi}</span></h2>
      <p className="text-white/50 mb-6">{t.sub}</p>
      <div className="grid grid-cols-3 gap-4 mb-5">
        {t.countries.map(c => (
          <div key={c.country} className={`border rounded-2xl p-5 flex flex-col gap-3 ${c.color}`}>
            <div className="flex items-center gap-2">
              <span className="text-3xl">{c.flag}</span>
              <div>
                <p className="text-white font-black">{c.country}</p>
                <span className="text-[10px] font-bold bg-white/10 text-white/50 border border-white/15 px-2 py-0.5 rounded-full">{c.model}</span>
              </div>
            </div>
            <div className="bg-black/20 rounded-xl p-3">
              <p className="text-white/30 text-[10px] font-bold uppercase mb-1">{t.custodian}</p>
              <p className="text-white/80 text-xs font-semibold">{c.bank}</p>
            </div>
            <div>
              <p className="text-white/30 text-[10px] font-bold uppercase mb-1">{t.deposit_in}</p>
              <p className="text-white/70 text-xs leading-relaxed whitespace-pre-line">{c.deposit}</p>
            </div>
            <div>
              <p className="text-white/30 text-[10px] font-bold uppercase mb-1">{t.withdraw_out}</p>
              <p className="text-white/70 text-xs leading-relaxed whitespace-pre-line">{c.withdraw}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
              <div className="text-center"><p className="text-[10px] text-white/30">{t.inbound}</p><p className="text-xs font-bold text-emerald-400">{c.eta_in}</p></div>
              <div className="text-center"><p className="text-[10px] text-white/30">{t.outbound}</p><p className="text-xs font-bold text-emerald-400">{c.eta_out}</p></div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white/4 border border-white/10 rounded-2xl p-4 flex items-center gap-6">
        <p className="text-white/30 text-xs font-bold uppercase tracking-widest flex-shrink-0">{t.security}</p>
        <div className="flex flex-wrap gap-2">
          {t.badges.map(i => (
            <span key={i} className="text-white/50 text-xs bg-white/3 border border-white/8 px-3 py-1.5 rounded-xl">{i}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlideMexico() {
  const lang = useLang();
  const t = lang === 'en' ? {
    tag: '09 — Mexico in Detail',
    title: 'The most advanced', hi: 'infrastructure in LATAM',
    sub: 'SPEI settles in seconds, 365 days. Each user has their own CLABE. Zero pool account.',
    modelTitle: 'STP sub-CLABE model',
    master: 'LEN master at STP:', masterVal: '646180 000000000000',
    clabe1: 'Carlos CLABE:', clabe2: 'Sofía CLABE:', clabe3: 'Pedro CLABE:',
    clabeNote: 'Each CLABE is legally the user\'s account within STP. The MXN Carlos deposits ', bold: 'is NOT LEN\'s', clabeNote2: ' — it\'s Carlos\'s in his sub-CLABE. LEN only issues MEXCOIN as digital representation.',
    ecosysTitle: 'MX ecosystem layers',
    layers: [
      { layer: 'Banxico / SPEI', role: 'Real-time interbank settlement', color: 'text-white/70' },
      { layer: 'STP (Banxico-licensed)', role: 'SPEI participant. Issues virtual CLABEs per user', color: 'text-[#A29BFE]' },
      { layer: 'Conekta / Arcus', role: 'API on top of STP. Fast integration without own license', color: 'text-emerald-400' },
      { layer: 'IFPE (CNBV license)', role: 'Own route. 6–12 months. Examples: Clip, Cuenca, Klar', color: 'text-amber-400' },
    ],
    othersTitle: 'How others operate (reference)',
    others: [
      { name: 'Tether (USDT)', model: 'Issues tokens backed in USD. No banking license. Operates from BVI/El Salvador.', status: 'bg-emerald-500/20 text-emerald-400', s: 'Global reference' },
      { name: 'Circle (USDC)', model: 'Money transmitter license USA. Reserves in treasuries + bank. Issues USDC 1:1.', status: 'bg-blue-500/20 text-blue-400', s: 'Mature model' },
      { name: 'Bitso (MX)', model: 'IFPE + exchange. CLABEs via STP. Operates crypto and fiat. CNBV regulated.', status: 'bg-[#6C5CE7]/20 text-[#A29BFE]', s: 'Regional comparable' },
      { name: 'Cuenca (MX)', model: 'IFPE. Account + virtual CLABE + card. No full banking license.', status: 'bg-amber-500/20 text-amber-400', s: 'Fast-launch model' },
    ],
    routeTitle: '🎯 LEN route for MX (Phase 1)',
    routeNote: 'Integration with ', routeBold: 'Conekta or Arcus', routeNote2: ' as a layer over STP. They provide virtual CLABEs via API — LEN assigns them 1:1 per user. No own license needed to launch. Then: IFPE CNBV application (6–12 months).',
    badge1: 'Launch: 2–4 weeks', badge2: 'Zero intermediation',
  } : {
    tag: '09 — México en detalle',
    title: 'La infraestructura más', hi: 'avanzada de LATAM',
    sub: 'SPEI liquida en segundos, 365 días. Cada usuario tiene su propia CLABE. Zero pool account.',
    modelTitle: 'Modelo STP sub-CLABE',
    master: 'Master LEN en STP:', masterVal: '646180 000000000000',
    clabe1: 'CLABE Carlos:', clabe2: 'CLABE Sofía:', clabe3: 'CLABE Pedro:',
    clabeNote: 'Cada CLABE es legalmente la cuenta del usuario dentro de STP. El MXN que deposita Carlos ', bold: 'NO es de LEN', clabeNote2: ' — es de Carlos en su sub-CLABE. LEN solo emite MEXCOIN como representación digital.',
    ecosysTitle: 'Capas del ecosistema MX',
    layers: [
      { layer: 'Banxico / SPEI', role: 'Liquidación interbancaria en tiempo real', color: 'text-white/70' },
      { layer: 'STP (Banxico-licensed)', role: 'Participante SPEI. Emite CLABEs virtuales por usuario', color: 'text-[#A29BFE]' },
      { layer: 'Conekta / Arcus', role: 'API sobre STP. Integración rápida sin licencia directa', color: 'text-emerald-400' },
      { layer: 'IFPE (licencia CNBV)', role: 'Ruta propia. 6–12 meses. Ejemplos: Clip, Cuenca, Klar', color: 'text-amber-400' },
    ],
    othersTitle: 'Así operan otros (referencia)',
    others: [
      { name: 'Tether (USDT)', model: 'Emite tokens respaldados en USD. Sin licencia bancaria. Opera desde BVI/El Salvador.', status: 'bg-emerald-500/20 text-emerald-400', s: 'Referencia global' },
      { name: 'Circle (USDC)', model: 'Money transmitter license USA. Reservas en treasuries + banco. Emite USDC 1:1.', status: 'bg-blue-500/20 text-blue-400', s: 'Modelo maduro' },
      { name: 'Bitso (MX)', model: 'IFPE + exchange. CLABEs via STP. Opera cripto y fiat. Regulado CNBV.', status: 'bg-[#6C5CE7]/20 text-[#A29BFE]', s: 'Comparable regional' },
      { name: 'Cuenca (MX)', model: 'IFPE. Cuenta + CLABE virtual + tarjeta. Sin licencia bancaria completa.', status: 'bg-amber-500/20 text-amber-400', s: 'Modelo fast-launch' },
    ],
    routeTitle: '🎯 Ruta LEN para MX (Fase 1)',
    routeNote: 'Integración con ', routeBold: 'Conekta o Arcus', routeNote2: ' como capa sobre STP. Ellos proveen CLABEs virtuales vía API — LEN las asigna 1:1 por usuario. Sin licencia propia necesaria para lanzar. Después: solicitud IFPE CNBV (6–12 meses).',
    badge1: 'Launch: 2–4 semanas', badge2: 'Zero intermediación',
  };
  return (
    <div className="flex flex-col h-full px-8 py-6">
      <Tag>{t.tag}</Tag>
      <h2 className="text-4xl font-black text-white mb-2">{t.title}<br /><span className="text-[#A29BFE]">{t.hi}</span></h2>
      <p className="text-white/50 mb-6">{t.sub}</p>
      <div className="grid grid-cols-2 gap-5 flex-1">
        <div className="space-y-4">
          <div className="bg-white/4 border border-white/10 rounded-2xl p-5">
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3">{t.modelTitle}</p>
            <div className="space-y-2 font-mono text-sm">
              {[
                { label: t.master, value: t.masterVal, color: 'text-white/40' },
                { label: t.clabe1, value: '646180 234567890001', color: 'text-[#A29BFE]' },
                { label: t.clabe2, value: '646180 234567890002', color: 'text-[#A29BFE]' },
                { label: t.clabe3, value: '646180 234567890003', color: 'text-[#A29BFE]' },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between gap-4">
                  <span className="text-white/30 text-xs">{r.label}</span>
                  <span className={`text-xs ${r.color}`}>{r.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-xs text-white/40 leading-relaxed">
                {t.clabeNote}<span className="text-emerald-400 font-bold">{t.bold}</span>{t.clabeNote2}
              </p>
            </div>
          </div>
          <div className="bg-white/4 border border-white/10 rounded-2xl p-5">
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3">{t.ecosysTitle}</p>
            {t.layers.map(l => (
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
        <div className="space-y-4">
          <div className="bg-white/4 border border-white/10 rounded-2xl p-5">
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-3">{t.othersTitle}</p>
            {t.others.map(c => (
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
            <p className="text-[#A29BFE] font-bold text-sm mb-2">{t.routeTitle}</p>
            <p className="text-white/60 text-xs leading-relaxed">
              {t.routeNote}<strong className="text-white">{t.routeBold}</strong>{t.routeNote2}
            </p>
            <div className="flex gap-2 mt-3">
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-full font-bold">{t.badge1}</span>
              <span className="text-[10px] bg-white/10 text-white/50 border border-white/15 px-2 py-1 rounded-full font-bold">{t.badge2}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideFlow() {
  const lang = useLang();
  const t = lang === 'en' ? {
    tag: '10 — Full Flow',
    title: 'From bank to bank —', hi: 'no intermediaries',
    sub: 'Fiat enters the trust, exits the trust. LEN only moves digital tokens in between.',
    steps: [
      { n: '1', title: 'Registration + KYC', detail: 'Passport/ID basic. Wallet + virtual account auto-generated.', icon: '👤', color: 'bg-indigo-500/20 border-indigo-500/40' },
      { n: '2', title: 'Dedicated account', detail: 'GT/HN: trust sub-account. MX: STP virtual CLABE. Exclusive to the user.', icon: '🏦', color: 'bg-blue-500/20 border-blue-500/40' },
      { n: '3', title: 'Bank deposit', detail: 'From any bank → their LEN account (trust or CLABE). No reference needed.', icon: '💳', color: 'bg-[#6C5CE7]/20 border-[#6C5CE7]/40' },
      { n: '4', title: 'Bank webhook', detail: 'Bank notifies LEN. HMAC verified. Idempotency guaranteed.', icon: '📡', color: 'bg-purple-500/20 border-purple-500/40' },
      { n: '5', title: 'Token issued', detail: 'LEN issues tokens 1:1. fiatBalance credited. User sees balance in seconds.', icon: '🪙', color: 'bg-amber-500/20 border-amber-500/40' },
      { n: '6', title: 'Send / FX', detail: 'Instant P2P. Automatic FX if different currency. 0.3% fee.', icon: '📤', color: 'bg-[#6C5CE7]/20 border-[#6C5CE7]/40' },
      { n: '7', title: 'Bank withdrawal', detail: 'Tokens → fiat → withdrawal to any bank in-country via ACH/SPEI/SIEFOM.', icon: '🏧', color: 'bg-emerald-500/20 border-emerald-500/40' },
      { n: '8', title: 'Token burned', detail: 'On withdrawal, token is "burned". Fiat exits the trust to user\'s bank.', icon: '🔥', color: 'bg-rose-500/20 border-rose-500/40' },
    ],
  } : {
    tag: '10 — Flujo Completo',
    title: 'Del banco al banco —', hi: 'sin intermediarios',
    sub: 'El fiat entra al fideicomiso, sale del fideicomiso. LEN solo mueve tokens digitales entre medias.',
    steps: [
      { n: '1', title: 'Registro + KYC', detail: 'DPI/INE/DNI básico. Wallet + cuenta virtual generada automáticamente.', icon: '👤', color: 'bg-indigo-500/20 border-indigo-500/40' },
      { n: '2', title: 'Cuenta dedicada', detail: 'GT/HN: sub-cuenta fideicomiso. MX: CLABE virtual STP. Exclusiva del usuario.', icon: '🏦', color: 'bg-blue-500/20 border-blue-500/40' },
      { n: '3', title: 'Depósito bancario', detail: 'Desde cualquier banco → su cuenta LEN (fideicomiso o CLABE). Sin referencia necesaria.', icon: '💳', color: 'bg-[#6C5CE7]/20 border-[#6C5CE7]/40' },
      { n: '4', title: 'Webhook bancario', detail: 'Banco notifica LEN. HMAC verificado. Idempotencia garantizada.', icon: '📡', color: 'bg-purple-500/20 border-purple-500/40' },
      { n: '5', title: 'Token emitido', detail: 'LEN emite tokens 1:1. fiatBalance acreditado. Usuario ve saldo en segundos.', icon: '🪙', color: 'bg-amber-500/20 border-amber-500/40' },
      { n: '6', title: 'Envío / FX', detail: 'P2P instantáneo. FX automático si diferente moneda. Fee 0.3%.', icon: '📤', color: 'bg-[#6C5CE7]/20 border-[#6C5CE7]/40' },
      { n: '7', title: 'Retiro bancario', detail: 'Tokens → fiat → retiro a cualquier banco del país vía ACH/SPEI/SIEFOM.', icon: '🏧', color: 'bg-emerald-500/20 border-emerald-500/40' },
      { n: '8', title: 'Token quemado', detail: 'Al retirar, el token es "quemado". El fiat sale del fideicomiso al banco del usuario.', icon: '🔥', color: 'bg-rose-500/20 border-rose-500/40' },
    ],
  };
  return (
    <div className="flex flex-col h-full px-8 py-6">
      <Tag>{t.tag}</Tag>
      <h2 className="text-4xl font-black text-white mb-2">{t.title}<br /><span className="text-[#A29BFE]">{t.hi}</span></h2>
      <p className="text-white/50 mb-8">{t.sub}</p>
      <div className="grid grid-cols-4 gap-4 flex-1">
        {t.steps.map((s, i) => (
          <div key={s.n} className={`border rounded-2xl p-5 flex flex-col gap-3 ${s.color} relative`}>
            {i < t.steps.length - 1 && <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 text-white/20 text-lg z-10">→</div>}
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
  const lang = useLang();
  const t = lang === 'en' ? {
    tag: '11 — Tech Stack',
    title: 'Production-ready', hi: 'architecture',
    sub: 'Turborepo monorepo · Railway · Next.js 14 · Firebase Firestore · Isolated admin panel',
    cols: [
      { icon: '📱', title: 'Frontend / App', items: [
        { name: 'Next.js 14', role: 'Web app + Admin (2 separate apps)' },
        { name: 'React Native', role: 'iOS + Android (Expo)' },
        { name: 'Zustand + persist', role: 'Global state + offline cache' },
        { name: 'Firebase Firestore', role: 'Real-time cross-device sync' },
        { name: 'TailwindCSS', role: 'LEN UI design system' },
        { name: 'Canvas 2D API', role: 'PNG vouchers — no deps' },
      ]},
      { icon: '⚙️', title: 'Microservices (roadmap)', items: [
        { name: 'auth-service', role: 'JWT, PIN, KYC' },
        { name: 'wallet-service', role: 'Balances, TX, tokens' },
        { name: 'fiat-bridge', role: 'Trust + STP webhooks' },
        { name: 'fx-engine', role: 'Real-time exchange rates' },
        { name: 'tx-engine', role: 'Transaction engine (Go)' },
        { name: 'compliance', role: 'AML monitoring + alerts' },
      ]},
      { icon: '🏗️', title: 'Infrastructure', items: [
        { name: 'Railway', role: 'Auto-deploy via Nixpacks' },
        { name: 'GitHub Actions', role: 'CI: typecheck + build' },
        { name: 'PostgreSQL', role: 'Main database' },
        { name: 'Redis', role: 'Cache + Bull queues' },
        { name: 'NestJS', role: 'TS backend framework' },
        { name: 'BullMQ', role: 'Async webhook processing' },
      ]},
    ],
    secTitle: 'Stack Security',
    secItems: [
      { k: 'Language', v: 'TypeScript strict — no implicit any' },
      { k: 'Secrets', v: 'Railway env vars — never in code' },
      { k: 'Admin', v: 'Isolated app — independent auth, no shared session' },
      { k: 'Audit', v: 'Structured logs, 5-year retention' },
      { k: 'CI/CD', v: 'typecheck + build on every push to main' },
    ],
  } : {
    tag: '11 — Stack Tecnológico',
    title: 'Arquitectura lista', hi: 'para producción',
    sub: 'Monorepo Turborepo · Railway · Next.js 14 · Firebase Firestore · Panel admin aislado',
    cols: [
      { icon: '📱', title: 'Frontend / App', items: [
        { name: 'Next.js 14', role: 'Web app + Admin (2 apps separadas)' },
        { name: 'React Native', role: 'iOS + Android (Expo)' },
        { name: 'Zustand + persist', role: 'Estado global + caché offline' },
        { name: 'Firebase Firestore', role: 'Sync cross-device en tiempo real' },
        { name: 'TailwindCSS', role: 'Sistema de diseño LEN' },
        { name: 'Canvas 2D API', role: 'Vouchers PNG sin dependencias' },
      ]},
      { icon: '⚙️', title: 'Microservicios (roadmap)', items: [
        { name: 'auth-service', role: 'JWT, PIN, KYC' },
        { name: 'wallet-service', role: 'Balances, TX, tokens' },
        { name: 'fiat-bridge', role: 'Fideicomiso + STP webhooks' },
        { name: 'fx-engine', role: 'Tipos de cambio RT' },
        { name: 'tx-engine', role: 'Motor transacciones (Go)' },
        { name: 'compliance', role: 'Monitoreo AML + alertas' },
      ]},
      { icon: '🏗️', title: 'Infraestructura', items: [
        { name: 'Railway', role: 'Deploy auto via Nixpacks' },
        { name: 'GitHub Actions', role: 'CI: typecheck + build' },
        { name: 'PostgreSQL', role: 'DB principal' },
        { name: 'Redis', role: 'Cache + colas Bull' },
        { name: 'NestJS', role: 'Framework backend TS' },
        { name: 'BullMQ', role: 'Webhooks async' },
      ]},
    ],
    secTitle: 'Seguridad del stack',
    secItems: [
      { k: 'Lenguaje', v: 'TypeScript strict — sin any implícitos' },
      { k: 'Secrets', v: 'Railway env vars — nunca en código' },
      { k: 'Admin', v: 'App aislada — auth independiente, sin sesión compartida' },
      { k: 'Auditoría', v: 'Logs estructurados, retención 5 años' },
      { k: 'CI/CD', v: 'typecheck + build en cada push a main' },
    ],
  };
  return (
    <div className="flex flex-col h-full px-8 py-6">
      <Tag>{t.tag}</Tag>
      <h2 className="text-4xl font-black text-white mb-2">{t.title}<br /><span className="text-[#A29BFE]">{t.hi}</span></h2>
      <p className="text-white/50 mb-8">{t.sub}</p>
      <div className="grid grid-cols-3 gap-5 flex-1">
        {t.cols.map(col => (
          <div key={col.icon} className="bg-white/4 border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2"><span className="text-2xl">{col.icon}</span><p className="text-white font-black">{col.title}</p></div>
            <div className="space-y-2 flex-1">
              {col.items.map(item => (
                <div key={item.name} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                  <span className="text-white/80 text-sm font-semibold">{item.name}</span>
                  <span className="text-white/30 text-xs">{item.role}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="col-span-3 bg-[#6C5CE7]/10 border border-[#6C5CE7]/30 rounded-2xl p-5">
          <p className="text-[#A29BFE] font-bold mb-3 text-sm uppercase tracking-widest">{t.secTitle}</p>
          <div className="grid grid-cols-5 gap-4">
            {t.secItems.map(i => (
              <div key={i.k}><p className="text-white/30 text-[10px] uppercase tracking-widest">{i.k}</p><p className="text-white/70 text-xs mt-1">{i.v}</p></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SlideRoadmap() {
  const lang = useLang();
  const t = lang === 'en' ? {
    tag: '12 — Roadmap',
    title: 'From 3 countries to all of', hi: 'Central America and beyond',
    sub: 'The same infrastructure scales to each new country. Adding a country = adding a provider.',
    phases: [
      { phase: 'Phase 1', period: 'Live — Q2 2025', color: 'border-emerald-500/40 bg-emerald-500/8', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        items: ['✓ QUETZA (GT), MEXCOIN (MX), LEMPI (HN)','✓ Web wallet + bank accounts + admin panel','✓ KYC 1 & 2 — local documents + AML queue','✓ P2P transfers + FX + bank withdrawal','✓ Real-time cross-device sync (Firestore)','Banrural trust + STP sub-CLABEs (in progress)'] },
      { phase: 'Phase 2', period: 'Q3–Q4 2025', color: 'border-[#6C5CE7]/40 bg-[#6C5CE7]/8', badge: 'bg-[#6C5CE7]/20 text-[#A29BFE] border-[#6C5CE7]/30',
        items: ['COLÓN Digital (El Salvador)','LEN Mastercard virtual card','Public API for merchants','QR payments at point of sale','Scheduled (recurring) remittances','IFPE CNBV application in progress'] },
      { phase: 'Phase 3', period: 'Q1–Q3 2026', color: 'border-amber-500/30 bg-amber-500/5', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
        items: ['TIKAL, NICORD, CORI, BALBÓA','LEN 8-country network complete','Own GT IDE / MX IFPE licenses','DeFi: staking and yield on LEN tokens','KYC 3 institutional','Caribbean + South America expansion'] },
    ],
  } : {
    tag: '12 — Roadmap',
    title: 'De 3 países a toda', hi: 'Centroamérica y más',
    sub: 'La misma infraestructura escala a cada país nuevo. Agregar un país = agregar un provider.',
    phases: [
      { phase: 'Fase 1', period: 'Activo — Q2 2025', color: 'border-emerald-500/40 bg-emerald-500/8', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        items: ['✓ QUETZA (GT), MEXCOIN (MX), LEMPI (HN)','✓ Wallet web + cuentas bancarias + panel admin','✓ KYC 1 y 2 — documentos locales + cola AML','✓ Envío P2P + FX + retiro bancario','✓ Sync cross-device en tiempo real (Firestore)','Fideicomiso Banrural + STP sub-CLABEs (en proceso)'] },
      { phase: 'Fase 2', period: 'Q3–Q4 2025', color: 'border-[#6C5CE7]/40 bg-[#6C5CE7]/8', badge: 'bg-[#6C5CE7]/20 text-[#A29BFE] border-[#6C5CE7]/30',
        items: ['COLÓN Digital (El Salvador)','Tarjeta LEN Mastercard virtual','API pública para comercios','Pagos QR en punto de venta','Remesas programadas (recurrentes)','Solicitud IFPE CNBV en proceso'] },
      { phase: 'Fase 3', period: 'Q1–Q3 2026', color: 'border-amber-500/30 bg-amber-500/5', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
        items: ['TIKAL, NICORD, CORI, BALBÓA','Red LEN 8 países completa','Licencias IDE GT / IFPE MX propias','DeFi: staking y yield en tokens LEN','KYC 3 institucional','Expansión Caribe + Sudamérica'] },
    ],
  };
  return (
    <div className="flex flex-col h-full px-8 py-6">
      <Tag>{t.tag}</Tag>
      <h2 className="text-4xl font-black text-white mb-2">{t.title}<br /><span className="text-[#A29BFE]">{t.hi}</span></h2>
      <p className="text-white/50 mb-8">{t.sub}</p>
      <div className="grid grid-cols-3 gap-6 flex-1">
        {t.phases.map(p => (
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
  const lang = useLang();
  const t = lang === 'en' ? {
    tag: '13 — Market & Timing',
    title: 'The market is ready —', hi: 'so is LEN',
    sub: 'Focus: informal economy cash flows between GT, MX and HN — $500M that move without formal infrastructure.',
    marketTitle: 'The market',
    market: [
      { stat: '$500M', label: 'Annual informal economy GT/MX/HN (Phase 1 TAM)', growth: 'Our focus' },
      { stat: '65%',   label: 'Unbanked population in CA — no bank account', growth: 'Untapped market' },
      { stat: '92%',   label: 'Smartphone penetration GT/MX — direct channel', growth: 'Distribution ready' },
      { stat: '5–8%',  label: 'Fee charged by WU, Remitly and cash networks', growth: 'LEN: 0.3%' },
      { stat: '38M',   label: 'Unbanked people in the region', growth: 'Serviceable' },
    ],
    edgeTitle: 'Competitive advantages',
    edges: [
      { icon: '🎯', title: 'Regional first mover', desc: 'No native Mesoamerican TokenCoin network exists. LEN does it first.' },
      { icon: '📱', title: 'Working product', desc: 'Live: web app + admin panel, 3 countries, wallets, bank accounts, transfers, FX, voucher.' },
      { icon: '🔐', title: 'Bank-grade security', desc: 'HMAC webhooks, idempotency, JWT rotation, segregated trust funds, KYC levels 0–3.' },
      { icon: '⚖️', title: 'Solid legal model', desc: 'US Corp + GT S.A. + trust = same structure as Tether/Circle at launch.' },
      { icon: '🔗', title: 'Bank-agnostic', desc: 'Same architecture connects to any bank via webhook. Scale = add provider.' },
    ],
  } : {
    tag: '13 — Mercado y Timing',
    title: 'El mercado ya está listo —', hi: 'LEN también',
    sub: 'Enfoque: flujos de economía informal entre GT, MX y HN — $500M que se mueven sin infraestructura formal.',
    marketTitle: 'El mercado',
    market: [
      { stat: '$500M', label: 'Economía informal anual GT/MX/HN (TAM Fase 1)', growth: 'Nuestro foco' },
      { stat: '65%',   label: 'Población desbancarizada en CA — sin cuenta bancaria', growth: 'Mercado virgen' },
      { stat: '92%',   label: 'Penetración smartphones GT/MX — canal directo', growth: 'Distribución lista' },
      { stat: '5–8%',  label: 'Comisión que cobran WU, Remitly y redes en efectivo', growth: 'LEN: 0.3%' },
      { stat: '38M',   label: 'Personas desbancarizadas en la región', growth: 'Alcanzable' },
    ],
    edgeTitle: 'Ventajas competitivas',
    edges: [
      { icon: '🎯', title: 'First mover regional', desc: 'No existe red de TokenCoins nativa de Mesoamérica. LEN lo hace primero.' },
      { icon: '📱', title: 'Producto funcionando', desc: 'En vivo: web app + panel admin, 3 países, wallets, cuentas bancarias, envíos, FX, voucher.' },
      { icon: '🔐', title: 'Seguridad bancaria', desc: 'Webhooks HMAC, idempotencia, JWT rotativo, fondos en fideicomiso segregado, KYC niveles 0–3.' },
      { icon: '⚖️', title: 'Modelo legal sólido', desc: 'US Corp + GT S.A. + fideicomiso = misma estructura que Tether/Circle en su inicio.' },
      { icon: '🔗', title: 'Banco-agnostic', desc: 'La misma arquitectura conecta con cualquier banco vía webhook. Escalar = agregar provider.' },
    ],
  };
  return (
    <div className="flex flex-col h-full px-8 py-6">
      <Tag>{t.tag}</Tag>
      <h2 className="text-4xl font-black text-white mb-2">{t.title}<br /><span className="text-[#A29BFE]">{t.hi}</span></h2>
      <p className="text-white/50 mb-8">{t.sub}</p>
      <div className="grid grid-cols-2 gap-6 flex-1">
        <div className="space-y-3">
          <p className="text-white/30 text-xs font-bold uppercase tracking-widest">{t.marketTitle}</p>
          {t.market.map(m => (
            <div key={m.label} className="flex items-center justify-between bg-white/4 border border-white/8 rounded-xl px-5 py-3">
              <div><p className="text-white font-black text-xl">{m.stat}</p><p className="text-white/50 text-xs mt-0.5">{m.label}</p></div>
              <span className="text-emerald-400 text-xs font-bold bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-1 rounded-full">{m.growth}</span>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <p className="text-white/30 text-xs font-bold uppercase tracking-widest">{t.edgeTitle}</p>
          {t.edges.map(v => (
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
  const lang = useLang();
  const t = lang === 'en' ? {
    tag: '14 — The Ask',
    title: 'Because every', hi: 'LEN', title2: 'counts.',
    sub: 'American software. Guatemalan tokens. Mesoamerican infrastructure. The financial network the region has needed for 30 years.',
    stats: [
      { value: '3',     label: 'Countries in network',    sub: 'Phase 1 live' },
      { value: '0.3%',  label: 'Minimum FX fee',          sub: 'vs 5–8% competition' },
      { value: '$500M', label: 'Phase 1 TAM',             sub: 'informal economy GT/MX/HN' },
    ],
    roundLabel: 'What we\'re looking for — Seed Round',
    asks: [
      { icon: '💰', label: 'Seed Investment', detail: '$500K – $1.5M USD for GTM in GT/MX + 2 additional countries + team' },
      { icon: '🤝', label: 'Anchor bank', detail: 'Trust agreement with Banrural (GT) and BAC (HN) + Conekta/STP for MX' },
      { icon: '📋', label: 'IDE/IFPE License', detail: 'Support for SIB Guatemala (IDE) and CNBV Mexico (IFPE) process' },
    ],
    footer: 'LEN — TokenCoin Network · Mesoamerica',
  } : {
    tag: '14 — Pitch',
    title: 'Por que cada', hi: 'LEN', title2: 'cuenta.',
    sub: 'Software americano. Tokens guatemaltecos. Infraestructura mesoamericana. La red financiera que la región necesitaba desde hace 30 años.',
    stats: [
      { value: '3',     label: 'Países en red',    sub: 'Fase 1 activa' },
      { value: '0.3%',  label: 'Fee mínimo FX',    sub: 'vs 5–8% competencia' },
      { value: '$500M', label: 'TAM Fase 1',        sub: 'economía informal GT/MX/HN' },
    ],
    roundLabel: 'Lo que buscamos — Seed Round',
    asks: [
      { icon: '💰', label: 'Inversión Seed', detail: '$500K – $1.5M USD para GTM en GT/MX + 2 países adicionales + equipo' },
      { icon: '🤝', label: 'Banco ancla', detail: 'Acuerdo fideicomiso con Banrural (GT) y BAC (HN) + Conekta/STP para MX' },
      { icon: '📋', label: 'Licencia IDE/IFPE', detail: 'Acompañamiento proceso SIB Guatemala (IDE) y CNBV México (IFPE)' },
    ],
    footer: 'LEN — Red TokenCoin · Mesoamérica',
  };
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center space-y-8">
      <div>
        <Tag>{t.tag}</Tag>
        <h2 className="text-5xl lg:text-6xl font-black text-white mt-2">
          {t.title}<br /><span className="text-[#A29BFE]">{t.hi}</span> {t.title2}
        </h2>
        <p className="text-white/50 text-lg mt-4 max-w-2xl mx-auto leading-relaxed">{t.sub}</p>
      </div>
      <div className="grid grid-cols-3 gap-6 max-w-3xl w-full">
        {t.stats.map(s => <Stat key={s.value} value={s.value} label={s.label} sub={s.sub} />)}
      </div>
      <div className="bg-white/5 border border-white/15 rounded-3xl p-8 max-w-3xl w-full">
        <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-5">{t.roundLabel}</p>
        <div className="grid grid-cols-3 gap-4 text-left">
          {t.asks.map(i => (
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
          <p className="text-white font-black text-xl">{t.footer}</p>
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
  const [lang,      setLang]      = useState<Lang>('es');

  const total     = SLIDES.length;
  const slideId   = SLIDES[current];
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
    setTimeout(() => { window.print(); setPrinting(false); }, 300);
  }

  // ── Print mode: render ALL slides ─────────────────────────────────────────
  if (printing) {
    return (
      <LangCtx.Provider value={lang}>
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
      </LangCtx.Provider>
    );
  }

  // ── Normal presentation mode ───────────────────────────────────────────────
  return (
    <LangCtx.Provider value={lang}>
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
              <button key={s} onClick={() => go(i)} title={SLIDE_LABELS[s][lang]}
                className={`transition-all rounded-full ${i === current ? 'w-6 h-2 bg-[#6C5CE7]' : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <button
              onClick={() => setLang(l => l === 'es' ? 'en' : 'es')}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20
                         text-white text-xs font-bold px-3 py-2 rounded-xl transition-all"
              title="Switch language"
            >
              <span>{lang === 'es' ? '🇺🇸' : '🇬🇹'}</span>
              <span>{lang === 'es' ? 'EN' : 'ES'}</span>
            </button>
            {/* Download PDF */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20
                         text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
              title="Download as PDF (Ctrl+P)"
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
                {SLIDE_LABELS[s][lang]}
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
    </LangCtx.Provider>
  );
}
