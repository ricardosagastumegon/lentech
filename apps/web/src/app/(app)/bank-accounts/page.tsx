'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useBankStore, BANKS, ACCOUNT_LABELS, BankAccount, BankCountry } from '@/store/bank.store';

// ─── Add account form ─────────────────────────────────────────────────────────
function AddAccountForm({
  country,
  onSave,
  onCancel,
}: {
  country: BankCountry;
  onSave: (data: Omit<BankAccount, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}) {
  const banks  = BANKS[country];
  const label  = ACCOUNT_LABELS[country];
  const [bankCode,   setBankCode]   = useState(banks[0].code);
  const [accountNum, setAccountNum] = useState('');
  const [holder,     setHolder]     = useState('');
  const [alias,      setAlias]      = useState('');
  const [error,      setError]      = useState('');

  function handleSave() {
    if (!accountNum.trim()) { setError('Ingresa el número de cuenta'); return; }
    if (!holder.trim())     { setError('Ingresa el nombre del titular'); return; }
    if (country === 'MX' && accountNum.replace(/\s/g,'').length !== 18) {
      setError('La CLABE debe tener exactamente 18 dígitos'); return;
    }
    if (country !== 'MX' && accountNum.replace(/\D/g,'').length < 8) {
      setError('El número de cuenta debe tener al menos 8 dígitos'); return;
    }
    const bank = banks.find(b => b.code === bankCode)!;
    onSave({
      country, bankCode, bankName: bank.name,
      accountNumber: accountNum.replace(/\s/g,'').toUpperCase(),
      holderName: holder.trim(),
      alias: alias.trim() || undefined,
    });
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl border-2 border-len-border p-5 space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Banco</label>
          <select value={bankCode} onChange={e => setBankCode(e.target.value)}
            className="w-full rounded-2xl border-2 border-len-border bg-len-light px-4 py-3
                       text-sm font-semibold text-len-dark focus:outline-none focus:border-len-purple">
            {banks.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
            {label.field} <span className="text-gray-300 normal-case font-normal">({label.format})</span>
          </label>
          <input type="text" inputMode="numeric"
            className="w-full rounded-2xl border-2 border-len-border bg-len-light px-4 py-3
                       text-sm font-mono font-semibold text-len-dark placeholder:text-gray-300
                       focus:outline-none focus:border-len-purple tracking-wider"
            placeholder={label.placeholder}
            value={accountNum}
            onChange={e => { setAccountNum(e.target.value.replace(/\D/g,'')); setError(''); }}
            maxLength={country === 'MX' ? 18 : 16}
          />
          {label.hint && <p className="text-xs text-gray-400 mt-1.5">{label.hint}</p>}
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Nombre del titular</label>
          <input type="text"
            className="w-full rounded-2xl border-2 border-len-border bg-len-light px-4 py-3
                       text-sm font-semibold text-len-dark placeholder:text-gray-300
                       focus:outline-none focus:border-len-purple"
            placeholder="Nombre completo"
            value={holder}
            onChange={e => { setHolder(e.target.value); setError(''); }}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
            Alias <span className="text-gray-300 font-normal normal-case">(opcional)</span>
          </label>
          <input type="text"
            className="w-full rounded-2xl border-2 border-len-border bg-len-light px-4 py-3
                       text-sm font-semibold text-len-dark placeholder:text-gray-300
                       focus:outline-none focus:border-len-purple"
            placeholder="Ej. Mi Banrural personal"
            value={alias}
            onChange={e => setAlias(e.target.value)}
            maxLength={40}
          />
        </div>
      </div>
      {error && <div className="bg-red-50 text-red-700 rounded-2xl p-3 text-sm text-center">{error}</div>}
      <button className="btn-primary w-full" onClick={handleSave}>Guardar cuenta →</button>
      <button className="btn-secondary w-full" onClick={onCancel}>Cancelar</button>
    </div>
  );
}

// ─── Account card ─────────────────────────────────────────────────────────────
function AccountCard({ account, onDelete }: { account: BankAccount; onDelete: () => void }) {
  const label  = ACCOUNT_LABELS[account.country];
  const masked = account.accountNumber.length > 8
    ? `${account.accountNumber.slice(0,4)}···${account.accountNumber.slice(-4)}`
    : account.accountNumber;
  const flagMap: Record<BankCountry, string> = { GT: '🇬🇹', MX: '🇲🇽', HN: '🇭🇳' };

  return (
    <div className="bg-white rounded-3xl border-2 border-len-border p-4 flex items-start justify-between gap-3
                    hover:border-len-violet transition-colors">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-10 h-10 bg-len-light rounded-xl flex items-center justify-center flex-shrink-0 border border-len-border">
          <span className="text-lg">{flagMap[account.country]}</span>
        </div>
        <div className="min-w-0">
          <p className="font-bold text-len-dark text-sm">
            {account.alias ?? account.bankName}
          </p>
          {account.alias && (
            <p className="text-xs text-gray-400">{account.bankName}</p>
          )}
          <p className="text-xs font-mono text-gray-400 mt-0.5">
            {label.field}: {masked}
          </p>
          <p className="text-xs text-gray-400">{account.holderName}</p>
          <p className="text-[10px] text-gray-300 mt-0.5">
            Agregada {new Date(account.createdAt).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>
      <button
        onClick={onDelete}
        className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center
                   text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors mt-0.5"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function BankAccountsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { accounts, addAccount, removeAccount } = useBankStore();

  const country  = (user?.country ?? 'GT') as BankCountry;
  const [adding, setAdding] = useState(false);
  const [deleted, setDeleted] = useState<string | null>(null);

  const myAccounts = accounts.filter(a => a.country === country);
  const otherAccounts = accounts.filter(a => a.country !== country);

  const countryName: Record<BankCountry, string> = { GT: 'Guatemala', MX: 'México', HN: 'Honduras' };
  const flagMap: Record<BankCountry, string> = { GT: '🇬🇹', MX: '🇲🇽', HN: '🇭🇳' };

  function handleSave(data: Omit<BankAccount, 'id' | 'createdAt'>) {
    addAccount(data);
    setAdding(false);
  }

  function handleDelete(id: string) {
    setDeleted(id);
    setTimeout(() => {
      removeAccount(id);
      setDeleted(null);
    }, 300);
  }

  return (
    <div className="max-w-md mx-auto px-4 pb-8">

      {/* Header */}
      <div className="pt-5 mb-6">
        <button onClick={() => router.back()} className="btn-ghost mb-3 -ml-2 text-sm">
          ← Volver
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-len-dark">Cuentas bancarias</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              Para depósitos y retiros · {accounts.length} guardada{accounts.length !== 1 ? 's' : ''}
            </p>
          </div>
          <span className="text-2xl">{flagMap[country]}</span>
        </div>
      </div>

      {adding ? (
        <>
          {/* Country context */}
          <div className="bg-len-light rounded-2xl px-4 py-3 border border-len-border mb-4">
            <p className="text-xs font-bold text-len-dark">
              {flagMap[country]} Cuenta en {countryName[country]}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {ACCOUNT_LABELS[country].field} — {ACCOUNT_LABELS[country].format}
            </p>
          </div>
          <AddAccountForm country={country} onSave={handleSave} onCancel={() => setAdding(false)} />
        </>
      ) : (
        <div className="space-y-5">

          {/* My country accounts */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                {flagMap[country]} {countryName[country]}
              </p>
              <span className="text-xs text-gray-300">{myAccounts.length} cuenta{myAccounts.length !== 1 ? 's' : ''}</span>
            </div>

            {myAccounts.length === 0 ? (
              <div className="bg-white rounded-3xl border-2 border-dashed border-len-border p-8 text-center">
                <div className="w-12 h-12 bg-len-light rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18" />
                  </svg>
                </div>
                <p className="text-sm font-bold text-len-dark mb-1">Sin cuentas guardadas</p>
                <p className="text-xs text-gray-400">Agrega tu cuenta para recibir retiros</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myAccounts.map(acc => (
                  <div
                    key={acc.id}
                    className={`transition-all duration-300 ${deleted === acc.id ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                  >
                    <AccountCard account={acc} onDelete={() => handleDelete(acc.id)} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add account button */}
          <button
            onClick={() => setAdding(true)}
            className="w-full flex items-center justify-center gap-2 rounded-3xl border-2 border-dashed
                       border-len-border py-4 text-sm font-bold text-len-purple
                       hover:border-len-purple hover:bg-len-light transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Agregar cuenta en {countryName[country]}
          </button>

          {/* Other countries (if any) */}
          {otherAccounts.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Otros países</p>
              <div className="space-y-3">
                {otherAccounts.map(acc => (
                  <AccountCard key={acc.id} account={acc} onDelete={() => handleDelete(acc.id)} />
                ))}
              </div>
            </div>
          )}

          {/* Info card */}
          <div className="bg-len-light rounded-2xl px-4 py-4 border border-len-border">
            <p className="text-xs font-bold text-len-dark mb-2">¿Para qué sirven estas cuentas?</p>
            <ul className="space-y-1.5">
              {[
                'Para recibir retiros de tu wallet al banco',
                'Se sincronizan en todos tus dispositivos',
                'Máximo 5 cuentas guardadas recomendado',
              ].map(item => (
                <li key={item} className="text-xs text-gray-500 flex items-start gap-2">
                  <span className="text-len-purple mt-0.5">›</span>{item}
                </li>
              ))}
            </ul>
          </div>

          {/* Withdraw shortcut */}
          {myAccounts.length > 0 && (
            <button
              onClick={() => router.push('/withdraw')}
              className="btn-primary w-full"
            >
              Ir a retirar →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
