import React, { useState, useEffect } from 'react';
import { Bundle, CustomizationOption } from '../lib/supabase';
import { X, CheckCircle, Info } from 'lucide-react';

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

  // Reset selections when modal opens with a new bundle
  useEffect(() => {
    if (isOpen) {
      setSelections({});
      setError('');
      
      // Auto-select required items if maxSelections is 1 and it has only 1 option
      if (bundle.customization_options) {
        const initialSelections: Record<string, string[]> = {};
        bundle.customization_options.forEach(opt => {
          if (opt.required && opt.maxSelections === 1 && opt.options.length === 1) {
            initialSelections[opt.category] = [opt.options[0]];
          } else {
            initialSelections[opt.category] = [];
          }
        });
        setSelections(initialSelections);
      }
    }
  }, [isOpen, bundle]);

  if (!isOpen || !bundle.customization_options) return null;

  const handleSelect = (category: string, option: string, maxSelections: number) => {
    setSelections((prev) => {
      const currentSelections = prev[category] || [];
      
      if (currentSelections.includes(option)) {
        // Deselect
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
        return prev; // Ignore if max reached
      }
    });
    setError(''); // Clear error on interaction
  };

  const handleConfirm = () => {
    // Validation
    for (const opt of bundle.customization_options!) {
      const selected = selections[opt.category] || [];
      
      // If the category matches a default item, they don't HAVE to select anything,
      // because not selecting anything means they are keeping the default item.
      const isSwap = bundle.items?.some(
        (item) => item.toLowerCase().trim() === opt.category.toLowerCase().trim()
      );

      if (opt.required && selected.length === 0 && !isSwap) {
        setError(`Please select at least one option for ${opt.category}.`);
        return;
      }
    }

    // Start with default items
    let finalItems = [...(bundle.items || [])];
    let hasCustomizations = false;

    // Process each category
    bundle.customization_options!.forEach(opt => {
      const selected = selections[opt.category] || [];
      if (selected.length > 0) {
        hasCustomizations = true;
        
        // Check if the category name matches a default item (case-insensitive)
        const targetIndex = finalItems.findIndex(
          (item) => item.toLowerCase().trim() === opt.category.toLowerCase().trim()
        );

        // If it matches, we assume this category is swapping out that item
        if (targetIndex !== -1) {
          finalItems.splice(targetIndex, 1);
        }

        // Add the selected custom items
        finalItems.push(...selected);
      }
    });

    if (!hasCustomizations) {
      onConfirm([]);
      return;
    }

    finalItems = finalItems.map(i => i.trim());
    onConfirm(finalItems);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-slate-800 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Customize Your Bundle</h2>
            <p className="text-gray-400 text-sm">{bundle.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {bundle.items && bundle.items.length > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Default Package Items
              </h3>
              <p className="text-xs text-gray-400 mb-3">This is the standard meal. Customize your options below to swap out or add items.</p>
              <div className="flex flex-wrap gap-2">
                {bundle.items.map((item, idx) => (
                  <span key={idx} className="text-xs bg-white/5 text-gray-300 px-2 py-1 rounded-md border border-white/10 flex items-center">
                    <span className="w-1.5 h-1.5 bg-blue-400/50 rounded-full mr-1.5"></span>
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
            const isFulfilled = opt.required ? selectedCount > 0 : true;

            return (
              <div key={idx} className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    {opt.category}
                    {opt.required && <span className="text-red-400 text-sm">*</span>}
                    {isFulfilled && opt.required && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                  </h3>
                  <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded-md">
                    {opt.maxSelections === 1 ? 'Choose 1' : `Choose up to ${opt.maxSelections}`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {opt.options.map((option, optIdx) => {
                    const isSelected = (selections[opt.category] || []).includes(option);
                    const isDisabled = !isSelected && selectedCount >= opt.maxSelections && opt.maxSelections !== 1;

                    return (
                      <button
                        key={optIdx}
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
                        <span className="font-medium pr-4">{option}</span>
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
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="flex-[2] bg-gradient-to-r from-blue-500 to-emerald-500 hover:shadow-lg hover:shadow-blue-500/25 text-white font-bold py-3 px-6 rounded-xl transition transform hover:scale-[1.02]"
            >
              Confirm & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
