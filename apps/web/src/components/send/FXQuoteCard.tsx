'use client';

interface FXQuote {
  quoteId: string;
  fromCoin: string;
  toCoin: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  rateDisplay?: string;
  feeAmount: number;
  feePercent: number;
  usdEquivalent?: number;
  validUntil: Date;
}

interface FXQuoteCardProps {
  quote: FXQuote;
  recipient: string;
}

export function FXQuoteCard({ quote, recipient }: FXQuoteCardProps) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Cotización confirmada</span>
        <span className="text-xs text-blue-400">#{quote.quoteId.slice(-6)}</span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Para</span>
          <span className="font-semibold text-gray-800">{recipient}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Envías</span>
          <span className="font-semibold">{quote.fromAmount.toLocaleString()} {quote.fromCoin}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Tasa</span>
          <span className="font-mono text-gray-700">
            {quote.rateDisplay ?? `1 ${quote.fromCoin} = ${quote.rate.toFixed(6)} ${quote.toCoin}`}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Fee ({quote.feePercent}%)</span>
          <span className="text-gray-500">-{quote.feeAmount.toLocaleString()} {quote.fromCoin}</span>
        </div>
        {quote.usdEquivalent !== undefined && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">≈ USD</span>
            <span className="text-gray-500">${quote.usdEquivalent.toFixed(2)}</span>
          </div>
        )}
        <div className="border-t border-blue-200 pt-2 flex justify-between">
          <span className="font-semibold text-gray-900">Recibe</span>
          <span className="font-bold text-lg text-mondega-green">
            {quote.toAmount.toLocaleString()} {quote.toCoin}
          </span>
        </div>
      </div>
    </div>
  );
}
