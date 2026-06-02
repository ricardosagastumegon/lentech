/**
 * LEN — Seed de usuarios demo REALES (arquitectura de producción)
 * Crea usuarios en `len_users` (PIN scrypt) + saldo inicial en el ledger
 * (`len_ledger_entries` + `len_balances`). Login real con phone + PIN 111111.
 *
 * Uso (desde apps/web):  node scripts/seed-real-demo.mjs
 */
import { readFileSync } from 'node:fs';
import { randomBytes, scryptSync } from 'node:crypto';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const sa = JSON.parse(readFileSync(new URL('../../../firebase-service-account.json', import.meta.url)));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

// scrypt — mismo formato que lib/password.ts: scrypt:<saltHex>:<hashHex>
function hashPin(pin) {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

const PIN = '111111';
const USERS = [
  { id: 'usr_gt_demo01', phone: '50211111111',  name: 'Carlos Mendoza',  country: 'GT', coin: 'QUETZA',  balance: 55000 },
  { id: 'usr_mx_demo01', phone: '5215511111111', name: 'Sofía Hernández', country: 'MX', coin: 'MEXCOIN', balance: 250000 },
  { id: 'usr_hn_demo01', phone: '50411111111',  name: 'José Reyes',      country: 'HN', coin: 'LEMPI',   balance: 500000 },
];

for (const u of USERS) {
  const now = new Date();

  // 1) Usuario en len_users
  await db.collection('len_users').doc(u.id).set({
    phone: u.phone, display_name: u.name, country: u.country,
    pin_hash: hashPin(PIN), role: 'user', status: 'active',
    kyc_level: 2, kyc_status: 'approved',
    created_at: now, updated_at: now,
  });

  // 2) Asiento de depósito inicial en el ledger (idempotente por entry_id)
  const entryId = `seed_${u.id}_deposit`;
  await db.collection('len_ledger_entries').doc(entryId).set({
    entry_id: entryId, user_id: u.id, coin: u.coin,
    direction: 'credit', amount: u.balance, type: 'deposit',
    ref: 'seed', description: 'Depósito inicial (seed demo)', created_at: now,
  });

  // 3) Balance cacheado
  await db.collection('len_balances').doc(`${u.id}__${u.coin}`).set({
    user_id: u.id, coin: u.coin, balance: u.balance, updated_at: now,
  });

  console.log(`✓ ${u.name} · phone ${u.phone} · PIN ${PIN} · ${u.balance.toLocaleString()} ${u.coin}`);
}

console.log('\nListo. Login real: usa el teléfono + PIN 111111.');
process.exit(0);
