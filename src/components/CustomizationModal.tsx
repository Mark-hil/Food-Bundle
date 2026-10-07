import { useState, useEffect } from 'react';
import { Bundle } from '../lib/supabase';
import { X, CheckCircle, Info, RotateCcw } from 'lucide-react';

interface CustomizationModalProps {
  bundle: Bundle;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (customItems: string[]) => void;
}

export default function CustomizationModal({
  bundle,
  isOpen,
  onClose,
  onConfirm,
}: CustomizationModalProps) {
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string>('');

  const hasDefaultItems = Array.isArray(bundle.items) && bundle.items.length > 0;

  // Reset selections when modal opens with a new bundle.
  // Start with empty selections so customers retain standard items by default
  // and only customize when they intentionally pick an alternative.
  useEffect(() => {
    if (isOpen) {
      setError('');
      const initialSelections: Record<string, string[]> = {};
      if (bundle.customization_options) {
        bundle.customization_options.forEach((opt) => {
          initialSelections[opt.category] = [];
        });
      }
      setSelections(initialSelections);
    }
  }, [isOpen, bundle]);

  if (!isOpen || !bundle.customization_options) return null;

  // Smart matching to find which default item corresponds to a category for swapping
  const findMatchingDefaultItemIndex = (items: string[], category: string): number => {
    if (!items || items.length === 0) return -1;
    const normCat = category.toLowerCase().trim();

    // 1. Exact match
    let idx = items.findIndex((item) => item.toLowerCase().trim() === normCat);
    if (idx !== -1) return idx;

    // 2. Substring match (e.g. item "1 box of Spaghetti" contains category "Spaghetti" or vice versa)
    idx = items.findIndex(
      (item) => item.toLowerCase().includes(normCat) || normCat.includes(item.toLowerCase().trim())
    );
    if (idx !== -1) return idx;

    // 3. Clean leading quantities/units (e.g., "5 Ena pa mackerel" vs "4 Ena pa mackerel")
    const cleanStr = (s: string) =>
      s
        .toLowerCase()
        .replace(/^(?:\d+\s*(?:kg|g|lt|l|pack|packs|box|boxes|pieces|pcs|lines)?\s*(?:of)?\s*)/i, '')
        .trim();

    const cleanedCat = cleanStr(category);
    if (cleanedCat.length > 2) {
      idx = items.findIndex((item) => {
        const cleanedItem = cleanStr(item);
        return (
          cleanedItem === cleanedCat ||
          cleanedItem.includes(cleanedCat) ||
          cleanedCat.includes(cleanedItem)
        );
      });
    }
    return idx;
  };

  const getMatchedDefaultItem = (category: string): string | null => {
    const idx = findMatchingDefaultItemIndex(bundle.items || [], category);
    return idx !== -1 ? bundle.items![idx] : null;
  };

  const handleSelect = (category: string, option: string, maxSelections: number) => {
    setSelections((prev) => {
      const currentSelections = prev[category] || [];

      if (currentSelections.includes(option)) {
        // Deselect / Uncheck -> reverts this category back to keeping the standard item!
        return {
          ...prev,
          [category]: currentSelections.filter((item) => item !== option),
        };
      } else {
        // Select
        if (maxSelections === 1) {
          return { ...prev, [category]: [option] };
        } else if (currentSelections.length < maxSelections) {
          return { ...prev, [category]: [...currentSelections, option] };
        }
        return prev;
      }
    });
    setError(''); // Clear error on interaction
  };

  // Immediate action: Order standard package with zero customization
  const handleKeepStandard = () => {
    onConfirm([]);
  };

  const handleConfirm = () => {
    // Only enforce required selection if the package has NO default items to fall back to.
    // If the package already has default items, unchecking or leaving unselected means keeping the standard items!
    if (!hasDefaultItems && bundle.customization_options) {
      for (const opt of bundle.customization_options) {
        const selected = selections[opt.category] || [];
        if (opt.required && selected.length === 0) {
          setError(`Please select at least one option for ${opt.category}.`);
          return;
        }
      }
    }

    // Start with default items
    let finalItems = [...(bundle.items || [])];
    let hasCustomizations = false;

    // Process each category
    if (bundle.customization_options) {
      bundle.customization_options.forEach((opt) => {
        const selected = selections[opt.category] || [];
        if (selected.length > 0) {
          hasCustomizations = true;

          // Swap out the default item if found
          const targetIndex = findMatchingDefaultItemIndex(finalItems, opt.category);
          if (targetIndex !== -1) {
            finalItems.splice(targetIndex, 1);
          }

          // Add the selected custom items
          finalItems.push(...selected);
        }
      });
    }

    // If no custom options were selected (or all options were unchecked),
    // proceed with the standard package!
    if (!hasCustomizations) {
      onConfirm([]);
      return;
    }

    finalItems = finalItems.map((i) => i.trim());
    onConfirm(finalItems);
  };

  const totalCustomSelections = Object.values(selections).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Customize Your Bundle</h2>
            <p className="text-gray-400 text-sm">
              {bundle.name} {hasDefaultItems ? '• Standard items included by default' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {bundle.items && bundle.items.length > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Standard Package Items
                  </h3>
                  <p className="text-xs text-gray-300">
                    This meal package comes with all items listed below. Select options below to swap, or keep standard.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleKeepStandard}
                  className="self-start sm:self-auto px-3.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 shrink-0"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Order As Standard
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {bundle.items.map((item, idx) => (
                  <span key={idx} className="text-xs bg-white/5 text-gray-300 px-2.5 py-1 rounded-md border border-white/10 flex items-center">
                    <span className="w-1.5 h-1.5 bg-blue-400/60 rounded-full mr-1.5"></span>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg flex items-start text-sm">
              <Info className="w-5 h-5 mr-2 shrink-0" />
              {error}
            </div>
          )}

          {bundle.customization_options.map((opt, idx) => {
            const selectedCount = (selections[opt.category] || []).length;
            const matchedItem = getMatchedDefaultItem(opt.category);

            return (
              <div key={idx} className="space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      {opt.category}
                    </h3>
                    {matchedItem && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Standard in package: <span className="text-slate-200 font-medium">{matchedItem}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedCount === 0 ? (
                      <span className="text-xs text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-medium">
                        Keeping standard item
                      </span>
                    ) : (
                      <span className="text-xs text-blue-300 bg-blue-500/15 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
                        Customized ({selectedCount})
                      </span>
                    )}
                    <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded-md">
                      {opt.maxSelections === 1 ? 'Choose 1' : `Choose up to ${opt.maxSelections}`}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {opt.options.map((option, optIdx) => {
                    const isSelected = (selections[opt.category] || []).includes(option);
                    const isDisabled = !isSelected && selectedCount >= opt.maxSelections && opt.maxSelections !== 1;

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelect(opt.category, option, opt.maxSelections)}
                        disabled={isDisabled}
                        className={`
                          relative flex items-center justify-between p-4 rounded-xl border text-left transition-all duration-200
                          ${isSelected 
                            ? 'bg-blue-500/20 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                            : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/30 hover:bg-white/10'
                          }
                          ${isDisabled ? 'opacity-50 cursor-not-allowed hover:border-white/10 hover:bg-white/5' : ''}
                        `}
                      >
                        <div className="pr-4">
                          <span className="font-medium block">{option}</span>
                          {matchedItem && isSelected && (
                            <span className="text-[11px] text-blue-300/90 block mt-0.5">
                              Swaps out {matchedItem}
                            </span>
                          )}
                          {isSelected && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              (Click again to uncheck & keep standard)
                            </span>
                          )}
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                          ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-500'}
                          ${opt.maxSelections === 1 ? 'rounded-full' : 'rounded-md'}
                        `}>
                          {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-slate-800/50 rounded-b-2xl">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition text-sm text-center"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleKeepStandard}
              className="px-5 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-white border border-emerald-500/30 font-semibold rounded-xl transition text-sm flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Keep Standard Package
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 bg-gradient-to-r from-blue-500 to-emerald-500 hover:shadow-lg hover:shadow-blue-500/25 text-white font-bold py-3 px-6 rounded-xl transition transform hover:scale-[1.01] text-sm text-center"
            >
              {totalCustomSelections > 0
                ? `Confirm Customization (${totalCustomSelections}) & Continue`
                : 'Confirm & Continue (Standard)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
