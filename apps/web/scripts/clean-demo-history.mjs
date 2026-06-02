/**
 * LEN — Limpieza de historial demo
 * Quita transacciones token_buy/token_sell (modelo viejo de 2 pasos) y pliega
 * cualquier fiatBalance dentro del saldo del coin (modelo de una sola moneda).
 *
 * Uso (desde apps/web):  node scripts/clean-demo-history.mjs
 */
import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const sa = JSON.parse(readFileSync(new URL('../../../firebase-service-account.json', import.meta.url)));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const COLLECTION = 'len_demo_users';
const DEMO = ['demo-gt', 'demo-mx', 'demo-hn'];

for (const id of DEMO) {
  const ref  = db.collection(COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) { console.log(`-  ${id}: no existe, skip`); continue; }

  const data = snap.data();
  const txs  = data.transactions ?? [];
  const cleaned = txs.filter(t => t.type !== 'token_buy' && t.type !== 'token_sell');

  const wallets = (data.wallets ?? []).map(w => {
    const total = parseFloat(w.available || w.balance || '0') + parseFloat(w.fiatBalance || '0');
    return { ...w, balance: total.toFixed(2), available: total.toFixed(2), fiatBalance: '0' };
  });

  await ref.set({
    ...data,
    wallets,
    transactions: cleaned,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system',
  });

  const saldo = wallets[0] ? `${wallets[0].available} ${wallets[0].coin}` : '(sin wallet)';
  console.log(`✓  ${id}: ${txs.length} → ${cleaned.length} txs (quitadas ${txs.length - cleaned.length} compra/venta) · saldo único ${saldo}`);
}

console.log('Listo. Recarga la app para ver el historial limpio.');
process.exit(0);
