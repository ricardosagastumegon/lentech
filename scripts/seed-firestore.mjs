/**
 * LEN — Seed Firestore demo users
 *
 * Corre UNA vez para pre-poblar los 3 usuarios demo con wallets + historial rico.
 * Usa el service account → no necesita reglas abiertas.
 *
 * Usage:
 *   node scripts/seed-firestore.mjs
 *
 * Requiere: firebase-admin (ya instalado en root)
 *   pnpm add -w firebase-admin   (si no está)
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore }         from 'firebase-admin/firestore';
import { readFileSync }         from 'fs';

// ── Init ──────────────────────────────────────────────────────────────────
const sa = JSON.parse(readFileSync('./firebase-service-account.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

// ── Helpers ───────────────────────────────────────────────────────────────
const ago = ms => new Date(Date.now() - ms).toISOString();
const D   = 86400000; // 1 day in ms

// ── Demo users ────────────────────────────────────────────────────────────
const USERS = [
  {
    id:          'demo-gt',
    coin:        'QUETZA',
    fiat:        'GTQ',
    flag:        '🇬🇹',
    country:     'GT',
    name:        'Carlos Mendoza',
    balance:     '50000.00',
    fiatBalance: '25000.00',
    balanceUSD:  9500,
    peer1:       'MEXCOIN',
    peer2:       'LEMPI',
  },
  {
    id:          'demo-mx',
    coin:        'MEXCOIN',
    fiat:        'MXN',
    flag:        '🇲🇽',
    country:     'MX',
    name:        'Sofía Hernández',
    balance:     '250000.00',
    fiatBalance: '100000.00',
    balanceUSD:  7200,
    peer1:       'QUETZA',
    peer2:       'LEMPI',
  },
  {
    id:          'demo-hn',
    coin:        'LEMPI',
    fiat:        'HNL',
    flag:        '🇭🇳',
    country:     'HN',
    name:        'José Reyes',
    balance:     '500000.00',
    fiatBalance: '200000.00',
    balanceUSD:  8500,
    peer1:       'MEXCOIN',
    peer2:       'QUETZA',
  },
];

// ── FX receive amounts (realistic demo) ──────────────────────────────────
const FX_RECEIVE = { GT: '260.00', MX: '9760.00', HN: '6200.00' };
const FX_SEND    = { GT: '323440.00', MX: '78320.00', HN: '197600.00' };

// ── Seed ──────────────────────────────────────────────────────────────────
async function seedUser(u) {
  const coin  = u.coin;
  const fiat  = u.fiat;

  const wallets = [{
    coin,
    balance:      u.balance,
    available:    u.balance,
    fiatBalance:  u.fiatBalance,
    fiatCurrency: fiat,
    balanceUSD:   u.balanceUSD,
  }];

  const transactions = [
    { id: `LEN-20260408-FLD-${u.country}01`, type: 'fiat_load',   status: 'completed', direction: 'received',
      fromCoin: coin, toCoin: coin,
      fromAmount: u.fiatBalance, toAmount: u.fiatBalance, fee: '0',
      description: `Depósito bancario inicial — ${fiat}`,
      createdAt: ago(10*D), completedAt: ago(10*D) },

    { id: `LEN-20260409-TKB-${u.country}02`, type: 'token_buy',   status: 'completed', direction: 'internal',
      fromCoin: coin, toCoin: coin,
      fromAmount: (parseFloat(u.fiatBalance) * 0.5).toFixed(2),
      toAmount:   (parseFloat(u.balance) * 0.5).toFixed(2),
      fee: '0.0000', feePercent: 0,
      description: `Compra de tokens ${coin} · 0%`,
      createdAt: ago(9*D), completedAt: ago(9*D) },

    { id: `LEN-20260410-FXS-${u.country}03`, type: 'fx_swap',     status: 'completed', direction: 'received',
      fromCoin: u.peer1, toCoin: coin,
      fromAmount: '3000.00', toAmount: FX_RECEIVE[u.country],
      fee: '9.00', feePercent: 0.003,
      description: 'Remesa internacional recibida',
      senderName: u.country === 'MX' ? 'Carlos Mendoza' : 'Sofía Hernández',
      createdAt: ago(7*D), completedAt: ago(7*D) },

    { id: `LEN-20260410-TRF-${u.country}04`, type: 'transfer',    status: 'completed', direction: 'sent',
      fromCoin: coin, toCoin: coin,
      fromAmount: '8000.00', toAmount: '8000.00', fee: '0',
      description: 'Pago a proveedor local',
      recipientName: 'Distribuidora Central',
      createdAt: ago(6*D), completedAt: ago(6*D) },

    { id: `LEN-20260411-TRF-${u.country}05`, type: 'transfer',    status: 'completed', direction: 'received',
      fromCoin: coin, toCoin: coin,
      fromAmount: '15000.00', toAmount: '15000.00', fee: '0',
      description: 'Pago cliente — servicio mensual',
      senderName: 'Empresa Regional S.A.',
      createdAt: ago(5*D), completedAt: ago(5*D) },

    { id: `LEN-20260411-TKB-${u.country}06`, type: 'token_buy',   status: 'completed', direction: 'internal',
      fromCoin: coin, toCoin: coin,
      fromAmount: (parseFloat(u.fiatBalance) * 0.3).toFixed(2),
      toAmount:   (parseFloat(u.balance) * 0.3).toFixed(2),
      fee: '0.0000', feePercent: 0,
      description: `Compra de tokens ${coin} · 0%`,
      createdAt: ago(4*D), completedAt: ago(4*D) },

    { id: `LEN-20260412-FXS-${u.country}07`, type: 'fx_swap',     status: 'completed', direction: 'sent',
      fromCoin: coin, toCoin: u.peer2,
      fromAmount: '12000.00', toAmount: FX_SEND[u.country],
      fee: '60.00', feePercent: 0.005,
      description: 'Envío internacional — familia',
      recipientName: u.country === 'HN' ? 'Ana Ramos' : 'Pedro Reyes',
      createdAt: ago(3*D), completedAt: ago(3*D) },

    { id: `LEN-20260412-TKS-${u.country}08`, type: 'token_sell',  status: 'completed', direction: 'internal',
      fromCoin: coin, toCoin: coin,
      fromAmount: '5000.00', toAmount: '4975.00',
      fee: '25.0000', feePercent: 0.005,
      description: `Venta de tokens ${coin} · 0.5%`,
      createdAt: ago(2*D), completedAt: ago(2*D) },

    { id: `LEN-20260413-TRF-${u.country}09`, type: 'transfer',    status: 'completed', direction: 'received',
      fromCoin: coin, toCoin: coin,
      fromAmount: '20000.00', toAmount: '20000.00', fee: '0',
      description: 'Depósito adicional — banco',
      senderName: 'Transferencia propia',
      createdAt: ago(D), completedAt: ago(D) },

    { id: `LEN-20260413-TRF-${u.country}10`, type: 'transfer',    status: 'pending',   direction: 'sent',
      fromCoin: coin, toCoin: u.peer1,
      fromAmount: '2500.00', toAmount: '6450.00',
      fee: '12.50', feePercent: 0.005,
      description: 'Pago en proceso — proveedor',
      recipientName: 'Importaciones GT',
      createdAt: ago(3600000) }, // 1h ago
  ];

  await db.collection('len_demo_users').doc(u.id).set({
    wallets,
    transactions,
    updatedAt: new Date().toISOString(),
  });

  console.log(`✅ ${u.flag}  ${u.id} — ${transactions.length} txs · wallet ${coin} ${u.balance}`);
}

// ── Run ───────────────────────────────────────────────────────────────────
console.log('🌱 Seeding LEN demo users → Firestore...\n');
Promise.all(USERS.map(seedUser))
  .then(() => {
    console.log('\n✅ Done. Firestore collection: len_demo_users');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
