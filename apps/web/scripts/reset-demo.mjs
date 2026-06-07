/**
 * LEN — Reset del estado demo en el ledger.
 * Borra balances y asientos de los usuarios demo + treasury, y re-siembra saldos limpios.
 * Uso (desde apps/web):  node scripts/reset-demo.mjs
 */
import { readFileSync } from 'node:fs';
import { randomBytes, scryptSync } from 'node:crypto';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const sa = JSON.parse(readFileSync(new URL('../../../firebase-service-account.json', import.meta.url)));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const hashPin = (pin) => {
  const salt = randomBytes(16);
  return `scrypt:${salt.toString('hex')}:${scryptSync(pin, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex')}`;
};

const PIN = '111111';
const USERS = [
  { id: 'usr_gt_demo01', phone: '50211111111',  name: 'Carlos Mendoza',  country: 'GT', coin: 'QUETZA',  balance: 55000,  account: '10101001' },
  { id: 'usr_mx_demo01', phone: '5215511111111', name: 'Sofía Hernández', country: 'MX', coin: 'MEXCOIN', balance: 250000, account: '20202002' },
  { id: 'usr_hn_demo01', phone: '50411111111',  name: 'José Reyes',      country: 'HN', coin: 'LEMPI',   balance: 500000, account: '30303003' },
];
const ALL_IDS = [...USERS.map(u => u.id), 'len_treasury'];

async function deleteWhere(col, field, value) {
  const snap = await db.collection(col).where(field, '==', value).get();
  let n = 0;
  for (const d of snap.docs) { await d.ref.delete(); n++; }
  return n;
}

// 1) Limpiar balances + asientos de los usuarios demo y treasury
for (const id of ALL_IDS) {
  const b = await deleteWhere('len_balances', 'user_id', id);
  const e = await deleteWhere('len_ledger_entries', 'user_id', id);
  console.log(`🧹 ${id}: ${b} balances, ${e} asientos borrados`);
}

// 2) Re-sembrar usuarios + saldo inicial limpio
for (const u of USERS) {
  const now = new Date();
  await db.collection('len_users').doc(u.id).set({
    phone: u.phone, display_name: u.name, country: u.country,
    pin_hash: hashPin(PIN), role: 'user', status: 'active',
    account_number: u.account, account_type: 'virtual',
    kyc_level: 2, kyc_status: 'approved', created_at: now, updated_at: now,
  });
  const entryId = `seed_${u.id}_${Date.now()}`;
  await db.collection('len_ledger_entries').doc(entryId).set({
    entry_id: entryId, user_id: u.id, coin: u.coin,
    direction: 'credit', amount: u.balance, type: 'deposit',
    ref: 'seed', description: 'Depósito inicial', created_at: now,
  });
  await db.collection('len_balances').doc(`${u.id}__${u.coin}`).set({
    user_id: u.id, coin: u.coin, balance: u.balance, updated_at: now,
  });
  console.log(`✓ ${u.name} · cuenta ${u.account} · ${u.phone} · PIN ${PIN} · ${u.balance.toLocaleString()} ${u.coin}`);
}

console.log('\nEstado demo limpio. Login: teléfono + PIN 111111.');
process.exit(0);
