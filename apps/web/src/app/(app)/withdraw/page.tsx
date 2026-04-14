'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useWalletStore, COINS, COUNTRY_TO_COIN, genTxId } from '@/store/wallet.store';
import { useBankStore, BANKS, ACCOUNT_LABELS, BankAccount, BankCountry } from '@/store/bank.store';
import { PINConfirmModal } from '@/components/ui/pin-confirm-modal';
import { TransactionVoucher } from '@/components/ui/TransactionVoucher';

type Step = 'accounts' | 'add' | 'amount' | 'confirm' | 'success';

// ─── Add account sub-form ────────────────────────────────────────────────────
function AddAccountForm({
  country,
  onSave,
  onCancel,
}: {
  country: BankCountry;
  onSave: (data: Omit<BankAccount, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}) {
  const banks    = BANKS[country];
  const label    = ACCOUNT_LABELS[country];

  const [bankCode,   setBankCode]   = useState(banks[0].code);
  const [accountNum, setAccountNum] = useState('');
  const [holder,     setHolder]     = useState('');
  const [alias,      setAlias]      = useState('');
  const [error,      setError]      = useState('');

  function validate(): boolean {
    if (!accountNum.trim()) { setError('Ingresa el número de cuenta'); return false; }
    if (!holder.trim())     { setError('Ingresa el nombre del titular'); return false; }
    if (country === 'MX' && accountNum.replace(/\s/g, '').length !== 18) {
      setError('La CLABE debe tener exactamente 18 dígitos'); return false;
    }
    if (country !== 'MX' && accountNum.replace(/\D/g, '').length < 8) {
      setError('El número de cuenta debe tener al menos 8 dígitos'); return false;
    }
    setError('');
    return true;
  }

  function handleSave() {
    if (!validate()) return;
    const bank = banks.find(b => b.code === bankCode)!;
    onSave({
      country,
      bankCode,
      bankName: bank.name,
      accountNumber: accountNum.replace(/\s/g, '').toUpperCase(),
      holderName: holder.trim(),
      alias: alias.trim() || undefined,
    });
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl border-2 border-len-border p-5 space-y-4">

        {/* Bank selector */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
            Banco
          </label>
          <select
            value={bankCode}
            onChange={e => setBankCode(e.target.value)}
            className="w-full rounded-2xl border-2 border-len-border bg-len-light px-4 py-3
                       text-sm font-semibold text-len-dark focus:outline-none focus:border-len-purple"
          >
            {banks.map(b => (
              <option key={b.code} value={b.code}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Account number / CLABE */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
            {label.field}
            <span className="ml-2 text-gray-300 normal-case font-medium">({label.format})</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            className="w-full rounded-2xl border-2 border-len-border bg-len-light px-4 py-3
                       text-sm font-mono font-semibold text-len-dark placeholder:text-gray-300
                       focus:outline-none focus:border-len-purple tracking-wider"
            placeholder={label.placeholder}
            value={accountNum}
            onChange={e => { setAccountNum(e.target.value.replace(/\D/g, '')); setError(''); }}
            maxLength={country === 'MX' ? 18 : 16}
          />
          {label.hint && (
            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{label.hint}</p>
          )}
        </div>

        {/* Holder name */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
            Nombre del titular
          </label>
          <input
            type="text"
            className="w-full rounded-2xl border-2 border-len-border bg-len-light px-4 py-3
                       text-sm font-semibold text-len-dark placeholder:text-gray-300
                       focus:outline-none focus:border-len-purple"
            placeholder="Nombre completo"
            value={holder}
            onChange={e => { setHolder(e.target.value); setError(''); }}
          />
        </div>

        {/* Alias (optional) */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
            Alias <span className="text-gray-300 font-normal normal-case">(opcional)</span>
          </label>
          <input
            type="text"
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

      {error && (
        <div className="bg-red-50 text-red-700 rounded-2xl p-3 text-sm text-center">{error}</div>
      )}

      <button className="btn-primary w-full" onClick={handleSave}>
        Guardar cuenta →
      </button>
      <button className="btn-secondary w-full" onClick={onCancel}>
        Cancelar
      </button>
    </div>
  );
}

// ─── Account card ─────────────────────────────────────────────────────────────
function AccountCard({
  account,
  selected,
  onSelect,
  onDelete,
}: {
  account: BankAccount;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const label = ACCOUNT_LABELS[account.country];
  const masked = account.accountNumber.length > 8
    ? `${account.accountNumber.slice(0, 4)}···${account.accountNumber.slice(-4)}`
    : account.accountNumber;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-3xl border-2 p-4 transition-all
        ${selected
          ? 'border-len-purple bg-len-light shadow-len'
          : 'border-len-border bg-white hover:border-len-violet'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3 min-w-0">
          {/* Radio */}
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5
            ${selected ? 'border-len-purple bg-len-purple' : 'border-gray-300'}`}>
            {selected && <div className="w-2 h-2 bg-white rounded-full" />}
          </div>

          <div className="min-w-0">
            <p className="font-bold text-len-dark text-sm truncate">
              {account.alias ?? account.bankName}
            </p>
            <p className="text-xs text-gray-500">{account.bankName}</p>
            <p className="text-xs font-mono text-gray-400 mt-1">
              {label.field}: {masked}
            </p>
            <p className="text-xs text-gray-400 truncate">{account.holderName}</p>
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center
                     text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function WithdrawPage() {
  const router       = useRouter();
  const { user }     = useAuthStore();
  const { wallets }  = useWalletStore();
  const { accounts, addAccount, removeAccount } = useBankStore();

  const country  = (user?.country ?? 'GT') as BankCountry;
  const coin     = COUNTRY_TO_COIN[country] ?? 'QUETZA';
  const meta     = COINS[coin];
  const wallet   = wallets.find(w => w.coin === coin);

  const fiatAvailable = parseFloat(wallet?.fiatBalance ?? '0');

  const [step,       setStep]      = useState<Step>('accounts');
  const [selected,   setSelected]  = useState<BankAccount | null>(null);
  const [amount,     setAmount]    = useState('');
  const [error,      setError]     = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [txId,       setTxId]      = useState('');
  const [txDate,     setTxDate]    = useState('');

  // Filter accounts for current country
  const myAccounts = accounts.filter(a => a.country === country);

  const numAmount  = parseFloat(amount) || 0;
  const isValid    = numAmount > 0 && numAmount <= fiatAvailable && !!selected;

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function handleAddAccount(data: Omit<BankAccount, 'id' | 'createdAt'>) {
    addAccount(data);
    setStep('accounts');
  }

  function handleContinue() {
    if (!selected) { setError('Selecciona una cuenta bancaria'); return; }
    setError('');
    setStep('amount');
  }

  function handleAmountNext() {
    if (!isValid) { setError('Monto inválido o insuficiente saldo fiat'); return; }
    setError('');
    setStep('confirm');
  }

  async function handleExecute(pin: string) {
    setPinLoading(true);
    if (pin !== '111111') {
      setPinLoading(false);
      throw new Error('PIN incorrecto');
    }
    await new Promise(r => setTimeout(r, 800));

    // Deduct fiat balance
    const id  = genTxId('FWD');
    const now = new Date().toISOString();
    setTxId(id);
    setTxDate(now);

    // Record withdrawal (deducts fiatBalance)
    const { setWallets } = useWalletStore.getState();
    const updated = wallets.map(w => {
      if (w.coin !== coin) return w;
      const newFiat = Math.max(0, parseFloat(w.fiatBalance) - numAmount);
      return { ...w, fiatBalance: newFiat.toFixed(2) };
    });
    setWallets(updated);

    // Add TX to history
    const { appendTransactions } = useWalletStore.getState();
    appendTransactions([{
      id,
      type:        'fiat_withdraw',
      status:      'processing',
      direction:   'internal',
      fromCoin:    coin,
      toCoin:      coin,
      fromAmount:  numAmount.toFixed(2),
      toAmount:    numAmount.toFixed(2),
      fee:         '0.0000',
      description: `Retiro ${meta.fiat} → ${selected!.bankName} ···${selected!.accountNumber.slice(-4)}`,
      createdAt:   now,
    }]);

    setPinLoading(false);
    setStep('success');
  }

  const goBack = () => {
    if (step === 'accounts') router.back();
    else if (step === 'add')    setStep('accounts');
    else if (step === 'amount') setStep('accounts');
    else if (step === 'confirm') setStep('amount');
    else router.push('/dashboard');
  };

  return (
    <div className="max-w-md mx-auto px-4 pb-6">

      {/* Header */}
      <div className="pt-5 mb-6">
        <button onClick={goBack} className="btn-ghost mb-3 -ml-2 text-sm">
          ← {step === 'accounts' ? 'Volver' : step === 'success' ? 'Inicio' : 'Atrás'}
        </button>
        <h1 className="text-2xl font-black text-len-dark">
          {step === 'success' ? '¡Retiro enviado!' : `Retirar ${meta.fiat}`}
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          {step === 'success'
            ? 'El depósito llegará en breve'
            : `Transfiere tu saldo ${meta.fiat} a tu banco`}
        </p>
      </div>

      {/* ── Step: Accounts list ── */}
      {step === 'accounts' && (
        <div className="space-y-4">

          {/* Fiat balance available */}
          <div className="bg-len-light rounded-2xl px-4 py-3 border border-len-border flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium">Saldo disponible para retirar</p>
              <p className="text-lg font-black text-len-dark tabular-nums">
                {fmt(fiatAvailable)} <span className="text-gray-400 font-bold text-sm">{meta.fiat}</span>
              </p>
            </div>
            <span className="text-2xl">{meta.flag}</span>
          </div>

          {/* Accounts */}
          {myAccounts.length === 0 ? (
            <div className="bg-white rounded-3xl border-2 border-dashed border-len-border p-8 text-center">
              <div className="w-14 h-14 bg-len-light rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18" />
                </svg>
              </div>
              <p className="text-sm font-bold text-len-dark mb-1">Sin cuentas guardadas</p>
              <p className="text-xs text-gray-400">Agrega tu cuenta bancaria para retirar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myAccounts.map(acc => (
                <AccountCard
                  key={acc.id}
                  account={acc}
                  selected={selected?.id === acc.id}
                  onSelect={() => setSelected(acc)}
                  onDelete={() => {
                    removeAccount(acc.id);
                    if (selected?.id === acc.id) setSelected(null);
                  }}
                />
              ))}
            </div>
          )}

          {/* Add account button */}
          <button
            onClick={() => setStep('add')}
            className="w-full flex items-center justify-center gap-2 rounded-3xl border-2 border-dashed
                       border-len-border py-4 text-sm font-bold text-len-purple
                       hover:border-len-purple hover:bg-len-light transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Agregar cuenta bancaria
          </button>

          {/* Interbank coverage info */}
          <div className="bg-emerald-50 rounded-2xl px-4 py-3 border border-emerald-100">
            <p className="text-xs font-bold text-emerald-700 mb-1">
              ✓ Retiro a CUALQUIER banco de {country === 'GT' ? 'Guatemala' : country === 'MX' ? 'México' : 'Honduras'}
            </p>
            <p className="text-xs text-emerald-600 leading-relaxed">
              {country === 'GT' && 'El retiro sale de LEN via Banrural → sistema ACH BANGUAT → llega a Industrial, BAM, G&T, Bantrab, Promerica, Citi GT y más.'}
              {country === 'MX' && 'El retiro sale de LEN via SPEI → llega a cualquier banco con CLABE en México. Inmediato, 24/7.'}
              {country === 'HN' && 'El retiro sale de LEN via BAC → sistema SIEFOM → llega a Atlántida, Ficohsa, Banpaís, Occidente, Davivienda y más.'}
            </p>
          </div>

          {/* Time estimate */}
          <div className="bg-amber-50 rounded-2xl px-4 py-3 border border-amber-100 text-xs text-amber-700">
            <p className="font-bold mb-1">Tiempo de acreditación</p>
            {country === 'GT' && <p>15–60 min (L-V 8am–5pm hábil). Fines de semana: siguiente día hábil.</p>}
            {country === 'MX' && <p>Inmediato vía SPEI — disponible 24 horas, 365 días al año.</p>}
            {country === 'HN' && <p>30–60 min (L-V 8am–5pm hábil). Fines de semana: siguiente día hábil.</p>}
          </div>

          {error && <div className="bg-red-50 text-red-700 rounded-2xl p-3 text-sm text-center">{error}</div>}

          <button
            className="btn-primary w-full"
            onClick={handleContinue}
            disabled={!selected || fiatAvailable <= 0}
          >
            Continuar →
          </button>
        </div>
      )}

      {/* ── Step: Add account form ── */}
      {step === 'add' && (
        <div className="space-y-4">
          <div className="bg-len-light rounded-2xl px-4 py-3 border border-len-border">
            <p className="text-xs font-bold text-len-dark">
              {meta.flag} Cuenta bancaria en {country}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {ACCOUNT_LABELS[country].field} — {ACCOUNT_LABELS[country].format}
            </p>
          </div>
          <AddAccountForm
            country={country}
            onSave={handleAddAccount}
            onCancel={() => setStep('accounts')}
          />
        </div>
      )}

      {/* ── Step: Amount ── */}
      {step === 'amount' && selected && (
        <div className="space-y-4">

          {/* Selected account summary */}
          <div className="bg-white rounded-3xl border-2 border-len-border p-4 flex items-start gap-3">
            <div className="w-10 h-10 bg-len-light rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-len-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-len-dark truncate">{selected.alias ?? selected.bankName}</p>
              <p className="text-xs text-gray-400">{selected.bankName}</p>
              <p className="text-xs font-mono text-gray-400">
                ···{selected.accountNumber.slice(-4)}
              </p>
            </div>
            <button
              onClick={() => setStep('accounts')}
              className="text-xs text-len-purple font-bold flex-shrink-0"
            >
              Cambiar
            </button>
          </div>

          {/* Available balance */}
          <div className="bg-len-light rounded-2xl px-4 py-2.5 border border-len-border flex items-center justify-between">
            <span className="text-xs text-gray-500">Disponible para retirar</span>
            <span className="text-sm font-black text-len-dark tabular-nums">
              {fmt(fiatAvailable)} {meta.fiat}
            </span>
          </div>

          {/* Amount input */}
          <div className="bg-white rounded-3xl border-2 border-len-border p-5">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              ¿Cuánto deseas retirar?
            </label>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-gray-200">{meta.symbol}</span>
              <input
                type="number"
                inputMode="decimal"
                className="flex-1 text-4xl font-black text-len-dark border-0 outline-none bg-transparent min-w-0 placeholder:text-gray-200"
                placeholder="0.00"
                value={amount}
                onChange={e => { setAmount(e.target.value); setError(''); }}
                max={fiatAvailable}
                min="1"
              />
              <span className="text-sm font-bold text-gray-400 flex-shrink-0">{meta.fiat}</span>
            </div>

            {/* Quick fill */}
            <div className="flex gap-2 mt-3">
              {[0.25, 0.5, 0.75, 1].map(pct => (
                <button
                  key={pct}
                  onClick={() => setAmount((fiatAvailable * pct).toFixed(2))}
                  className="flex-1 text-xs font-bold text-len-purple bg-len-light border border-len-border
                             rounded-xl py-1.5 hover:border-len-purple transition-colors"
                >
                  {pct === 1 ? 'Todo' : `${pct * 100}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {numAmount > 0 && (
            <div className="bg-white rounded-2xl border border-len-border px-4 py-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Retiras</span>
                <span className="font-bold text-len-dark tabular-nums">{fmt(numAmount)} {meta.fiat}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Comisión de retiro</span>
                <span className="font-bold text-emerald-600">Sin comisión</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-len-border">
                <span className="font-black text-len-dark">Recibirás en tu banco</span>
                <span className="font-black text-emerald-600 text-base tabular-nums">
                  {fmt(numAmount)} {meta.fiat}
                </span>
              </div>
            </div>
          )}

          {error && <div className="bg-red-50 text-red-700 rounded-2xl p-3 text-sm text-center">{error}</div>}

          <button
            className="btn-primary w-full"
            onClick={handleAmountNext}
            disabled={!isValid}
          >
            Ver resumen →
          </button>
        </div>
      )}

      {/* ── Step: Confirm ── */}
      {step === 'confirm' && selected && (
        <div className="space-y-4">
          <div className="rounded-3xl border-2 border-len-border overflow-hidden">
            {/* Header */}
            <div className="bg-len-gradient px-5 py-4">
              <p className="text-white/60 text-xs font-medium">Resumen de retiro</p>
              <p className="text-white font-bold text-sm mt-0.5">
                {meta.fiat} → {selected.bankName}
              </p>
            </div>

            <div className="bg-white px-5 py-4 space-y-4">
              {/* Bank destination */}
              <div className="flex items-start gap-3 bg-len-light rounded-2xl px-4 py-3">
                <svg className="w-5 h-5 text-len-purple flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18" />
                </svg>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 font-medium">Destino</p>
                  <p className="text-sm font-bold text-len-dark">{selected.bankName}</p>
                  <p className="text-xs font-mono text-gray-500">
                    {ACCOUNT_LABELS[selected.country].field}: ···{selected.accountNumber.slice(-6)}
                  </p>
                  <p className="text-xs text-gray-400">{selected.holderName}</p>
                </div>
              </div>

              {/* Amount */}
              <div className="flex items-center justify-between bg-emerald-50 rounded-2xl px-4 py-3 border border-emerald-200">
                <div>
                  <p className="text-xs text-emerald-600 font-medium">Monto a recibir</p>
                  <p className="font-black text-emerald-800 text-2xl tabular-nums">
                    {fmt(numAmount)} <span className="text-sm font-bold">{meta.fiat}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-emerald-600 font-bold">Sin</p>
                  <p className="text-xs text-emerald-600 font-bold">comisión</p>
                </div>
              </div>

              {/* Time estimate */}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  {country === 'MX' ? 'Inmediato vía SPEI (24/7)' : 'Hasta 1 hora hábil (L-V 8am–5pm)'}
                </span>
              </div>
            </div>
          </div>

          <PINConfirmModal
            trigger={
              <button className="btn-primary w-full">
                🔒 Confirmar retiro
              </button>
            }
            onConfirm={handleExecute}
            loading={pinLoading}
            title="Confirmar retiro"
            description={`Autoriza el retiro de ${fmt(numAmount)} ${meta.fiat} a ${selected.bankName}`}
          />

          <button className="btn-secondary w-full" onClick={() => setStep('amount')}>
            Modificar monto
          </button>
        </div>
      )}

      {/* ── Step: Success + Voucher ── */}
      {step === 'success' && selected && (
        <div className="space-y-6 py-4">
          <div className="text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-200">
              <span className="text-4xl">✓</span>
            </div>
            <h2 className="text-2xl font-black text-len-dark mb-1">¡Retiro enviado!</h2>
            <p className="text-gray-400 text-sm">Tu comprobante está listo para compartir</p>
          </div>

          <TransactionVoucher
            txId={txId}
            typeLabel="Retiro bancario"
            statusLabel="En proceso"
            createdAt={txDate}
            lines={[
              { label: 'Banco destino',  value: selected.bankName, bold: true },
              { label: 'Cuenta',         value: `···${selected.accountNumber.slice(-6)}` },
              { label: 'Titular',        value: selected.holderName },
              { label: 'Monto',          value: `${fmt(numAmount)} ${meta.fiat}`, highlight: 'green', large: true },
              { label: 'Estado',         value: 'En proceso de acreditación', highlight: 'amber' },
            ]}
          />

          <div className="space-y-3">
            <button className="btn-primary w-full" onClick={() => router.push('/dashboard')}>
              Ir al inicio
            </button>
            <button className="btn-secondary w-full" onClick={() => router.push('/transactions')}>
              Ver historial
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
