import { useState, useEffect } from 'react';
import { Calculator, Check } from 'lucide-react';
import { calculateGrossPrice } from '../../lib/paymentUtils';

interface PaystackFeeCalculatorProps {
  currentPrice: string;
  suggestedBasePrice?: string;
  onApplyPrice: (price: string) => void;
  className?: string;
}

export default function PaystackFeeCalculator({
  currentPrice,
  suggestedBasePrice,
  onApplyPrice,
  className = '',
}: PaystackFeeCalculatorProps) {
  const [baseMealPrice, setBaseMealPrice] = useState<string>('');
  const [feePercent, setFeePercent] = useState<number>(1.95);
  const [useRounding, setUseRounding] = useState<boolean>(true);
  const [isOpen, setIsOpen] = useState<boolean>(true);

  // Sync suggestedBasePrice when provided from inventory calculation
  useEffect(() => {
    if (suggestedBasePrice && !isNaN(parseFloat(suggestedBasePrice)) && parseFloat(suggestedBasePrice) > 0) {
      setBaseMealPrice(suggestedBasePrice);
    }
  }, [suggestedBasePrice]);

  // Initialize base price from currentPrice if empty
  useEffect(() => {
    if (!baseMealPrice && currentPrice && !isNaN(parseFloat(currentPrice))) {
      setBaseMealPrice(currentPrice);
    }
  }, [currentPrice]);

  const numBasePrice = parseFloat(baseMealPrice) || 0;
  const calculation = calculateGrossPrice(numBasePrice, feePercent);
  const suggestedPrice = useRounding 
    ? calculation.roundedGrossPrice.toFixed(2) 
    : calculation.exactGrossPrice.toFixed(2);

  const handleApply = (priceToApply: string) => {
    onApplyPrice(priceToApply);
  };

  return (
    <div className={`bg-gradient-to-br from-blue-50 to-indigo-50/70 border border-blue-200/80 rounded-2xl p-4 sm:p-5 text-slate-800 shadow-xs ${className}`}>
      <div className="flex items-center justify-between pb-3 border-b border-blue-200/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-xs">
            <Calculator size={16} />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
              Paystack Fee Auto-Calculator
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full border border-emerald-300">
                100% Net Revenue
              </span>
            </h4>
            <p className="text-[11px] text-slate-500">Automatically adds the {feePercent}% transaction fee into your selling price</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
        >
          {isOpen ? 'Collapse' : 'Open'}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Base Cost Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Your Desired Net Meal Price (GH₵)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  GH₵
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={baseMealPrice}
                  onChange={(e) => setBaseMealPrice(e.target.value)}
                  placeholder="e.g. 50.00"
                  className="w-full pl-11 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-2xs"
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                The exact amount you want to keep per order
              </span>
            </div>

            {/* Fee Percentage Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Paystack Fee Rate (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={feePercent}
                  onChange={(e) => setFeePercent(parseFloat(e.target.value) || 0)}
                  className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-2xs"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  %
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Standard Ghana MoMo & Card rate is 1.95%
              </span>
            </div>
          </div>

          {/* Live Breakdown Box */}
          {numBasePrice > 0 && (
            <div className="bg-white/90 rounded-xl p-3.5 border border-blue-200/80 space-y-2 text-xs shadow-2xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Base Meal Price (Your Net):</span>
                <span className="font-semibold text-slate-800">GH₵ {calculation.baseNetPrice.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Estimated Paystack Fee ({feePercent}%):</span>
                <span className="font-semibold text-blue-600">+ GH₵ {calculation.feeAmount.toFixed(2)}</span>
              </div>

              {/* Rounding option toggle */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-600 font-medium">
                  <input
                    type="checkbox"
                    checked={useRounding}
                    onChange={(e) => setUseRounding(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Round up to whole Cedi (Best for MoMo)</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {useRounding ? `GH₵ ${calculation.roundedGrossPrice.toFixed(2)}` : `GH₵ ${calculation.exactGrossPrice.toFixed(2)}`}
                </span>
              </div>

              {/* Action Banner */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">
                    Customer Selling Price:
                  </span>
                  <span className="text-base sm:text-lg font-extrabold text-emerald-600">
                    GH₵ {suggestedPrice}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleApply(suggestedPrice)}
                  className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-xs"
                >
                  <Check size={14} />
                  <span>Set Package Price to GH₵ {suggestedPrice}</span>
                </button>
              </div>

              <div className="text-[10px] text-slate-500 italic bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                💡 When the customer pays <strong>GH₵ {suggestedPrice}</strong>, Paystack will deposit approx. <strong>GH₵ {calculation.baseNetPrice.toFixed(2)}</strong> into your account.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
