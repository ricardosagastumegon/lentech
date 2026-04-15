'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  hasCeloWallet,
  connectWallet,
  getConnectedAddress,
  getMexcoinBalance,
  sendMexcoin,
  isOnCelo,
  getCeloEnv,
  getActiveContracts,
} from '@/lib/minipay';
import type { Address } from 'viem';

// ── Estado de la UI ───────────────────────────────────────────────────────────
type View = 'loading' | 'no-wallet' | 'wrong-network' | 'connect' | 'dashboard' | 'send';

interface TxState {
  status: 'idle' | 'pending' | 'success' | 'error';
  hash?: string;
  error?: string;
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm"
        style={{ background: 'linear-gradient(135deg, #1E1B4B, #4338CA)' }}
      >
        L
      </div>
      <span className="font-black text-xl" style={{ color: '#1E1B4B' }}>LEN</span>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: '#EEF2FF', color: '#4338CA' }}
    >
      {label}
    </span>
  );
}

// ── Pantalla: no tiene wallet ────────────────────────────────────────────────
function NoWalletScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center"
         style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 55%, #4338CA 100%)' }}>
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
        <Logo />
        <div className="mt-6 text-5xl mb-4">📱</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Abre LEN en MiniPay
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          Para usar MEXCOIN necesitas la app MiniPay de Opera Mini. Está disponible en México.
        </p>
        <a
          href="https://www.opera.com/es/mini"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-3 rounded-xl text-white font-bold text-center"
          style={{ background: 'linear-gradient(135deg, #4338CA, #818CF8)' }}
        >
          Descargar MiniPay
        </a>
        <a href="/" className="block mt-3 text-sm text-gray-400 hover:text-gray-600">
          Ir a la app completa →
        </a>
      </div>
    </div>
  );
}

// ── Pantalla: conectar wallet ────────────────────────────────────────────────
function ConnectScreen({ onConnect }: { onConnect: () => void }) {
  const [connecting, setConnecting] = useState(false);

  function handleConnect() {
    setConnecting(true);
    onConnect();
    setConnecting(false);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center"
         style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 55%, #4338CA 100%)' }}>
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
        <Logo />
        <div className="mt-6 text-5xl mb-4">🇲🇽</div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">
          LEN para México
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          Envía y recibe MEXCOIN instantáneamente sin comisiones bancarias.
        </p>
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="w-full py-3 rounded-xl text-white font-bold transition-opacity disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #4338CA, #818CF8)' }}
        >
          {connecting ? 'Conectando…' : 'Conectar Wallet'}
        </button>
      </div>
    </div>
  );
}

// ── Pantalla: red incorrecta ──────────────────────────────────────────────────
function WrongNetworkScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center"
         style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 55%, #4338CA 100%)' }}>
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
        <Logo />
        <div className="mt-6 text-5xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Cambia a Celo
        </h1>
        <p className="text-gray-500 text-sm">
          LEN corre en la red Celo. Por favor cambia la red en tu wallet a Celo Mainnet (chain 42220) o Alfajores (testnet).
        </p>
      </div>
    </div>
  );
}

// ── Pantalla: contratos no deployados aún ───────────────────────────────────
function ContractPendingScreen({ address }: { address: Address }) {
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
  const env = getCeloEnv();
  return (
    <div className="flex flex-col min-h-screen px-5 pb-8"
         style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 55%, #4338CA 100%)' }}>
      {/* Header */}
      <div className="pt-10 pb-6 flex items-center justify-between">
        <Logo />
        <span className="text-white/60 text-xs">{short}</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="bg-white/10 backdrop-blur rounded-2xl p-8 max-w-sm w-full">
          <div className="text-5xl mb-4">🚀</div>
          <h2 className="text-white font-bold text-xl mb-2">
            MEXCOIN en Celo
          </h2>
          <p className="text-white/70 text-sm mb-4">
            Los contratos MEXCOIN están listos y compilados.
            El deploy en Celo {env === 'mainnet' ? 'mainnet' : 'testnet'} está pendiente.
          </p>
          <Badge label={`Red: Celo ${env === 'mainnet' ? 'Mainnet' : 'Alfajores'}`} />
          <div className="mt-6 pt-6 border-t border-white/20">
            <p className="text-white/50 text-xs">
              Wallet conectada correctamente ✓
            </p>
            <a
              href="/"
              className="mt-4 block text-sm text-white/70 hover:text-white underline"
            >
              Usar app completa (demo Firestore) →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard principal ───────────────────────────────────────────────────────
function Dashboard({
  address,
  balance,
  onRefresh,
  onSend,
}: {
  address: Address;
  balance: string;
  onRefresh: () => void;
  onSend: () => void;
}) {
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
  const env = getCeloEnv();

  return (
    <div className="flex flex-col min-h-screen pb-8"
         style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 55%, #4338CA 100%)' }}>
      {/* Header */}
      <div className="pt-10 pb-4 px-5 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2">
          <Badge label={env === 'mainnet' ? 'Mainnet' : 'Testnet'} />
          <span
            className="text-xs px-2 py-0.5 rounded-full font-mono"
            style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
          >
            {short}
          </span>
        </div>
      </div>

      {/* Balance card */}
      <div className="px-5 mb-6">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-white">
          <p className="text-white/60 text-sm font-medium mb-1">Balance MEXCOIN</p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black tracking-tight">{balance}</span>
            <span className="text-xl font-bold text-white/70 pb-1">MEXCOIN</span>
          </div>
          <p className="text-white/40 text-xs mt-2">≈ MXN {(parseFloat(balance) * 1).toFixed(2)}</p>
        </div>
      </div>

      {/* Acciones */}
      <div className="px-5 grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={onSend}
          className="flex flex-col items-center gap-2 bg-white rounded-2xl py-5 font-semibold text-sm transition-transform active:scale-95"
          style={{ color: '#4338CA' }}
        >
          <span className="text-2xl">↑</span>
          Enviar
        </button>
        <button
          className="flex flex-col items-center gap-2 rounded-2xl py-5 font-semibold text-sm border-2 transition-transform active:scale-95"
          style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'white' }}
          onClick={onRefresh}
        >
          <span className="text-2xl">⟳</span>
          Actualizar
        </button>
      </div>

      {/* Info: como recargar */}
      <div className="px-5">
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-white/70 text-xs font-semibold mb-2 uppercase tracking-wide">
            ¿Cómo recargar MEXCOIN?
          </p>
          <div className="space-y-1.5 text-white/50 text-xs">
            <p>① Deposita MXN en tu banco (SPEI/Conekta)</p>
            <p>② LEN emite MEXCOIN 1:1 en tu wallet</p>
            <p>③ Úsalo como si fuera efectivo digital</p>
          </div>
        </div>
      </div>

      <div className="px-5 mt-4">
        <a href="/" className="text-white/40 text-xs text-center block hover:text-white/60">
          Ir a la app completa →
        </a>
      </div>
    </div>
  );
}

// ── Pantalla: enviar ──────────────────────────────────────────────────────────
function SendScreen({
  address,
  balance,
  onBack,
  onSuccess,
}: {
  address: Address;
  balance: string;
  onBack: () => void;
  onSuccess: (hash: string) => void;
}) {
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [tx, setTx] = useState<TxState>({ status: 'idle' });

  async function handleSend() {
    if (!to || !amount) return;
    if (parseFloat(amount) > parseFloat(balance)) {
      setTx({ status: 'error', error: 'Saldo insuficiente' });
      return;
    }
    setTx({ status: 'pending' });
    const hash = await sendMexcoin(address, to as Address, amount);
    if (hash) {
      setTx({ status: 'success', hash });
      onSuccess(hash);
    } else {
      setTx({ status: 'error', error: 'Transacción fallida. Verifica la dirección.' });
    }
  }

  return (
    <div className="flex flex-col min-h-screen pb-8"
         style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 55%, #4338CA 100%)' }}>
      {/* Header */}
      <div className="pt-10 pb-4 px-5 flex items-center gap-3">
        <button onClick={onBack} className="text-white/70 hover:text-white text-xl">←</button>
        <Logo />
      </div>

      <div className="px-5 flex-1">
        <h1 className="text-white font-bold text-2xl mb-6">Enviar MEXCOIN</h1>

        {/* Disponible */}
        <div className="bg-white/10 rounded-xl px-4 py-3 mb-6 flex justify-between items-center">
          <span className="text-white/60 text-sm">Disponible</span>
          <span className="text-white font-bold">{balance} MEXCOIN</span>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          <div>
            <label className="block text-white/70 text-sm mb-1.5">Dirección destino</label>
            <input
              type="text"
              placeholder="0x..."
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm font-mono focus:outline-none focus:border-white/50"
            />
          </div>
          <div>
            <label className="block text-white/70 text-sm mb-1.5">Cantidad MEXCOIN</label>
            <div className="relative">
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0.01"
                step="0.01"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 text-lg font-bold focus:outline-none focus:border-white/50"
              />
              <button
                onClick={() => setAmount(balance)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold px-2 py-1 rounded-lg"
                style={{ background: '#4338CA', color: 'white' }}
              >
                MAX
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {tx.status === 'error' && (
          <div className="mt-4 bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-3">
            <p className="text-red-300 text-sm">{tx.error}</p>
          </div>
        )}

        {/* Botón enviar */}
        <button
          onClick={handleSend}
          disabled={tx.status === 'pending' || !to || !amount}
          className="mt-6 w-full py-4 rounded-xl text-white font-bold text-base transition-opacity disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #4338CA, #818CF8)' }}
        >
          {tx.status === 'pending' ? 'Enviando…' : 'Confirmar envío'}
        </button>

        <p className="text-white/30 text-xs text-center mt-3">
          Transacción on-chain en Celo · ~2 segundos
        </p>
      </div>
    </div>
  );
}

// ── Pantalla: tx exitosa ──────────────────────────────────────────────────────
function SuccessScreen({ hash, onDone }: { hash: string; onDone: () => void }) {
  const env = getCeloEnv();
  const explorerBase = env === 'mainnet'
    ? 'https://celoscan.io/tx/'
    : 'https://alfajores.celoscan.io/tx/';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center"
         style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 55%, #4338CA 100%)' }}>
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
        <Logo />
        <div className="mt-6 text-5xl mb-3">✅</div>
        <h2 className="font-bold text-xl text-gray-900 mb-2">¡Enviado!</h2>
        <p className="text-gray-500 text-sm mb-4">
          Tu transacción fue confirmada en Celo.
        </p>
        <a
          href={`${explorerBase}${hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono break-all text-indigo-600 hover:underline block mb-6"
        >
          {hash.slice(0, 20)}…{hash.slice(-10)}
        </a>
        <button
          onClick={onDone}
          className="w-full py-3 rounded-xl text-white font-bold"
          style={{ background: 'linear-gradient(135deg, #4338CA, #818CF8)' }}
        >
          Volver al balance
        </button>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function MiniPayPage() {
  const [view, setView] = useState<View>('loading');
  const [address, setAddress] = useState<Address | null>(null);
  const [balance, setBalance] = useState('0.00');
  const [successHash, setSuccessHash] = useState<string>('');
  const [contractsDeployed, setContractsDeployed] = useState(false);

  const checkContracts = useCallback(() => {
    const c = getActiveContracts();
    return !!(c.MEXCOIN && c.MEXCOIN.length > 0);
  }, []);

  const refreshBalance = useCallback(async (addr: Address) => {
    const bal = await getMexcoinBalance(addr);
    setBalance(bal);
  }, []);

  const initialize = useCallback(async () => {
    // Comprobar soporte de wallet
    if (!hasCeloWallet()) {
      setView('no-wallet');
      return;
    }

    // Comprobar si ya hay una cuenta conectada
    const addr = await getConnectedAddress();
    if (!addr) {
      setView('connect');
      return;
    }

    // Comprobar red
    const onCelo = await isOnCelo();
    if (!onCelo) {
      setView('wrong-network');
      return;
    }

    setAddress(addr);

    // Comprobar si contratos están deployados
    const deployed = checkContracts();
    setContractsDeployed(deployed);

    if (deployed) {
      await refreshBalance(addr);
      setView('dashboard');
    } else {
      setView('dashboard'); // mostramos el estado "pending deploy"
    }
  }, [checkContracts, refreshBalance]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  async function handleConnect() {
    const addr = await connectWallet();
    if (!addr) return;
    const onCelo = await isOnCelo();
    if (!onCelo) { setView('wrong-network'); return; }
    setAddress(addr);
    const deployed = checkContracts();
    setContractsDeployed(deployed);
    if (deployed) await refreshBalance(addr);
    setView('dashboard');
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (view === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen"
           style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 100%)' }}>
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (view === 'no-wallet') return <NoWalletScreen />;
  if (view === 'wrong-network') return <WrongNetworkScreen />;
  if (view === 'connect') return <ConnectScreen onConnect={handleConnect} />;

  if (!address) return null;

  if (view === 'send') {
    return (
      <SendScreen
        address={address}
        balance={balance}
        onBack={() => setView('dashboard')}
        onSuccess={(hash) => { setSuccessHash(hash); setView('send'); }}
      />
    );
  }

  if (successHash) {
    return (
      <SuccessScreen
        hash={successHash}
        onDone={() => { setSuccessHash(''); refreshBalance(address); setView('dashboard'); }}
      />
    );
  }

  // Dashboard — detecta si contratos están deployados
  if (!contractsDeployed) {
    return <ContractPendingScreen address={address} />;
  }

  return (
    <Dashboard
      address={address}
      balance={balance}
      onRefresh={() => refreshBalance(address)}
      onSend={() => setView('send')}
    />
  );
}
