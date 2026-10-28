import React from 'react';
import { Layers } from 'lucide-react';
import { RobotObject, ZoneConfig } from '../../types/robot';
import { formatCoordinates, formatNumber } from '../../utils/formatters';

interface InventoryPanelProps {
  objects?: Record<string, RobotObject>;
  zones?: Record<string, ZoneConfig>;
  selectedObjectId?: string;
  onSelectObject: (id: string) => void;
}

export const InventoryPanel: React.FC<InventoryPanelProps> = ({
  objects = {},
  zones = {},
  selectedObjectId,
  onSelectObject
}) => {
  // Group objects safely by zone
  const zoneOccupancy: Record<string, RobotObject[]> = {
    zone_a: [],
    zone_b: [],
    zone_c: [],
    zone_d: []
  };

  Object.values(objects || {}).forEach((obj) => {
    if (obj && obj.zone_id && zoneOccupancy[obj.zone_id]) {
      zoneOccupancy[obj.zone_id].push(obj);
    }
  });

  return (
    <div className="panel h-full flex flex-col font-sans select-none">
      <div className="panel-header">
        <div className="panel-header-title">
          <Layers size={14} className="text-[#10b981]" />
          <span>Zone Occupancy & Object Inventory</span>
        </div>
        <span className="text-[11px] font-mono text-[#64748b]">
          {Object.keys(objects || {}).length} Entities
        </span>
      </div>

      <div className="p-2.5 flex-1 overflow-y-auto flex flex-col gap-2">
        {Object.values(zones || {}).map((zone) => {
          if (!zone || !zone.id) return null;
          const objsInZone = zoneOccupancy[zone.id] || [];
          const centerText = formatCoordinates(zone.center, 2);

          return (
            <div
              key={zone.id}
              className="bg-[#11141c] border border-[#222938] rounded p-2 flex flex-col gap-1.5"
            >
              {/* Zone Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: zone.color || '#ff8a00' }}
                  />
                  <span className="text-xs font-semibold text-[#f1f5f9]">{zone.name || zone.id}</span>
                  <span className="text-[10px] text-[#64748b] font-mono">({objsInZone.length} items)</span>
                </div>
                <span className="text-[10px] text-[#64748b] font-mono">{centerText}</span>
              </div>

              {/* Objects in this Zone */}
              <div className="flex flex-wrap gap-1.5 mt-0.5">
                {objsInZone.length === 0 ? (
                  <span className="text-[11px] text-[#475569] italic">Empty zone</span>
                ) : (
                  objsInZone.map((obj) => {
                    if (!obj || !obj.id) return null;
                    const isSelected = obj.id === selectedObjectId;
                    return (
                      <button
                        key={obj.id}
                        onClick={() => onSelectObject(obj.id)}
                        className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 font-mono border transition-all ${
                          isSelected
                            ? 'bg-[#ff7a0022] border-[#ff7a00] text-[#ff7a00]'
                            : 'bg-[#151922] border-[#222938] text-[#cbd5e1] hover:border-[#3b455b]'
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: obj.color || '#3b82f6' }}
                        />
                        <span>{obj.name || obj.id}</span>
                        <span className="text-[9px] text-[#64748b]">({formatNumber(obj.weight_kg, 2)}kg)</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
