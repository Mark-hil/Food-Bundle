import { useState, useRef, useEffect } from 'react';
import { 
  MapPin, 
  ChevronDown, 
  Check, 
  Clock, 
  Search, 
  Building2, 
  Truck, 
  Layers
} from 'lucide-react';

export interface DeliveryZone {
  id: string;
  hub_name: string;
  zone_name: string;
  delivery_fee: number;
  estimated_time: string;
  is_active: boolean;
  display_order: number;
}

interface LocationZoneSelectorProps {
  deliveryZones: DeliveryZone[];
  selectedHub: string;
  selectedZoneId: string;
  roomOrLandmark: string;
  isCustomAddress: boolean;
  deliveryAddress: string;
  onSelectHub: (hub: string) => void;
  onSelectZone: (zoneId: string) => void;
  onChangeRoom: (room: string) => void;
  onChangeCustomAddress: (address: string) => void;
  onToggleCustom: () => void;
}

export default function LocationZoneSelector({
  deliveryZones,
  selectedHub,
  selectedZoneId,
  roomOrLandmark,
  isCustomAddress,
  deliveryAddress,
  onSelectHub,
  onSelectZone,
  onChangeRoom,
  onChangeCustomAddress,
  onToggleCustom
}: LocationZoneSelectorProps) {
  const [isHubOpen, setIsHubOpen] = useState(false);
  const [isZoneOpen, setIsZoneOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const hubRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (hubRef.current && !hubRef.current.contains(event.target as Node)) {
        setIsHubOpen(false);
      }
      if (zoneRef.current && !zoneRef.current.contains(event.target as Node)) {
        setIsZoneOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const uniqueHubs = Array.from(new Set(deliveryZones.map(z => z.hub_name)));
  const zonesForCurrentHub = deliveryZones.filter(z => z.hub_name === selectedHub);
  const activeZone = deliveryZones.find(z => z.id === selectedZoneId) || zonesForCurrentHub[0];

  const filteredZones = zonesForCurrentHub.filter(z => 
    z.zone_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getHubIcon = (hub: string) => {
    const lower = hub.toLowerCase();
    if (lower.includes('inter-city') || lower.includes('courier')) {
      return <Truck className="w-4 h-4 text-amber-400 shrink-0" />;
    }
    if (lower.includes('accra') || lower.includes('legon')) {
      return <Building2 className="w-4 h-4 text-blue-400 shrink-0" />;
    }
    if (lower.includes('sunyani') || lower.includes('uenr')) {
      return <Building2 className="w-4 h-4 text-teal-400 shrink-0" />;
    }
    return <Building2 className="w-4 h-4 text-purple-400 shrink-0" />;
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-white/15 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Header with Switch Option */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-inner">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Delivery Destination</h3>
            <p className="text-[11px] text-gray-400">Campus zone, hostel, or out-of-town address</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleCustom}
          className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5"
        >
          <Layers className="w-3.5 h-3.5" />
          {isCustomAddress ? 'Campus Zone List' : 'Custom Address'}
        </button>
      </div>

      {!isCustomAddress && deliveryZones.length > 0 ? (
        <div className="space-y-4">
          {/* Step 1: Custom Hub Selector Dropdown */}
          <div className="space-y-1.5" ref={hubRef}>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
              1. University Campus / City Hub
            </label>

            <div className="relative">
              <button
                type="button"
                onClick={() => { setIsHubOpen(!isHubOpen); setIsZoneOpen(false); }}
                className={`w-full px-4 py-3.5 bg-slate-800/90 hover:bg-slate-800 border text-left rounded-xl transition-all duration-200 flex items-center justify-between shadow-sm group ${
                  isHubOpen 
                    ? 'border-blue-500 ring-2 ring-blue-500/30 bg-slate-800' 
                    : 'border-white/15 hover:border-white/30'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-105 transition-transform">
                    {getHubIcon(selectedHub)}
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-bold text-white block truncate">
                      {selectedHub || 'Select University / City'}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {zonesForCurrentHub.length} delivery areas available
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-md hidden sm:inline-block">
                    Hub
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isHubOpen ? 'rotate-180 text-blue-400' : ''}`} />
                </div>
              </button>

              {/* Hub Dropdown Popover */}
              {isHubOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/20 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-2 divide-y divide-white/5">
                    {uniqueHubs.map((hub) => {
                      const isSelected = selectedHub === hub;
                      const hubZoneCount = deliveryZones.filter(z => z.hub_name === hub).length;

                      return (
                        <button
                          key={hub}
                          type="button"
                          onClick={() => {
                            onSelectHub(hub);
                            setIsHubOpen(false);
                            setSearchQuery('');
                          }}
                          className={`w-full px-3.5 py-3 rounded-xl text-left transition-all flex items-center justify-between ${
                            isSelected 
                              ? 'bg-blue-600/20 text-white border border-blue-500/40' 
                              : 'hover:bg-white/5 text-gray-300 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                              isSelected ? 'bg-blue-500 text-white border-blue-400' : 'bg-slate-800 text-gray-400 border-white/10'
                            }`}>
                              {getHubIcon(hub)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">{hub}</p>
                              <p className="text-[10px] text-gray-400">{hubZoneCount} delivery zones</p>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Custom Hostel / Zone Dropdown */}
          <div className="space-y-1.5" ref={zoneRef}>
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
              2. Hostel / Delivery Zone
            </label>

            <div className="relative">
              <button
                type="button"
                onClick={() => { setIsZoneOpen(!isZoneOpen); setIsHubOpen(false); }}
                className={`w-full px-4 py-3.5 bg-slate-800/90 hover:bg-slate-800 border text-left rounded-xl transition-all duration-200 flex items-center justify-between shadow-sm group ${
                  isZoneOpen 
                    ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-slate-800' 
                    : 'border-white/15 hover:border-white/30'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-bold text-white block truncate">
                      {activeZone ? activeZone.zone_name : 'Choose your hostel or zone'}
                    </span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-blue-400" />
                      {activeZone?.estimated_time || '20-35 mins delivery'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {activeZone && (
                    <span className="text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                      GH₵ {Number(activeZone.delivery_fee).toFixed(2)}
                    </span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isZoneOpen ? 'rotate-180 text-emerald-400' : ''}`} />
                </div>
              </button>

              {/* Zone Dropdown Popover */}
              {isZoneOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/20 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-80 flex flex-col">
                  {/* Search Bar if multiple zones */}
                  {zonesForCurrentHub.length > 4 && (
                    <div className="p-3 border-b border-white/10 bg-slate-950/60 sticky top-0 z-10">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search hostel or area..."
                          className="w-full pl-9 pr-3 py-2 bg-slate-800/90 border border-white/15 rounded-xl text-xs text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
                          autoFocus
                        />
                      </div>
                    </div>
                  )}

                  {/* Zones list */}
                  <div className="p-2 overflow-y-auto divide-y divide-white/5 space-y-1">
                    {filteredZones.length > 0 ? (
                      filteredZones.map((zone) => {
                        const isSelected = selectedZoneId === zone.id;
                        return (
                          <button
                            key={zone.id}
                            type="button"
                            onClick={() => {
                              onSelectZone(zone.id);
                              setIsZoneOpen(false);
                              setSearchQuery('');
                            }}
                            className={`w-full px-3.5 py-3 rounded-xl text-left transition-all flex items-center justify-between ${
                              isSelected 
                                ? 'bg-emerald-500/20 text-white border border-emerald-500/40' 
                                : 'hover:bg-white/5 text-gray-300 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-3 truncate pr-2">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${
                                isSelected ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-slate-800 text-gray-400 border-white/10'
                              }`}>
                                <MapPin className="w-3.5 h-3.5" />
                              </div>
                              <div className="truncate">
                                <p className="text-xs font-bold text-white truncate">{zone.zone_name}</p>
                                <p className="text-[10px] text-gray-400 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5 text-blue-400" />
                                  {zone.estimated_time || 'Standard Delivery'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                                isSelected 
                                  ? 'bg-emerald-500 text-white' 
                                  : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                              }`}>
                                GH₵ {Number(zone.delivery_fee).toFixed(2)}
                              </span>
                              {isSelected && (
                                <Check className="w-4 h-4 text-emerald-400" />
                              )}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="py-6 text-center text-gray-400 text-xs">
                        No hostels match "{searchQuery}"
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Inter-City Out of Town Advisory */}
          {selectedHub.toLowerCase().includes('inter-city') && (
            <div className="p-3.5 bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/15 border border-amber-500/30 rounded-xl text-xs text-amber-200 leading-relaxed flex items-start gap-2.5">
              <Truck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-100 font-bold block mb-0.5">📦 Nationwide Inter-City Delivery:</strong>
                <span>Packages heading outside campus arrive within 24–48 hours via VIP Bus or STC Parcel Station pickup in your city.</span>
              </div>
            </div>
          )}

          {/* Step 3: Room Number & Landmark */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
              3. Room Number, Floor or Specific Landmark
            </label>
            <div className="relative">
              <input
                type="text"
                value={roomOrLandmark}
                onChange={(e) => onChangeRoom(e.target.value)}
                placeholder="e.g. Room 304, Block B or Near Front Porch"
                className="w-full px-4 py-3 bg-slate-800/90 border border-white/15 text-white rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm placeholder-gray-500 transition-all font-medium"
                required={!isCustomAddress}
              />
            </div>
          </div>
        </div>
      ) : (
        /* Custom Freeform Address */
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
            Detailed Delivery Address
          </label>
          <textarea
            value={deliveryAddress}
            onChange={(e) => onChangeCustomAddress(e.target.value)}
            className="w-full px-4 py-3 bg-slate-800/90 border border-white/15 text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none placeholder-gray-500 text-sm transition-all"
            rows={3}
            placeholder="Enter full hostel name, street name, house number, or city delivery details"
            required
          />
        </div>
      )}
    </div>
  );
}
