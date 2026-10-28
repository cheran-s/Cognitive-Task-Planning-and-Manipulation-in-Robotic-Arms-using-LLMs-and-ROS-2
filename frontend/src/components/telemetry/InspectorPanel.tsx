import React from 'react';
import {
  Info,
  Layers,
  Cpu,
  Crosshair
} from 'lucide-react';
import { RobotObject, ZoneConfig, JointAngles, GripperState } from '../../types/robot';
import { formatNumber, formatRadToDeg, formatCoordinates } from '../../utils/formatters';

interface InspectorPanelProps {
  selectedObject?: RobotObject;
  targetZoneId?: string;
  zones: Record<string, ZoneConfig>;
  objects: Record<string, RobotObject>;
  joints: JointAngles;
  gripper: GripperState;
  activeIntent?: string;
  onSelectObject: (id: string) => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  selectedObject,
  targetZoneId,
  zones = {},
  objects = {},
  joints,
  gripper,
  activeIntent = 'STANDBY',
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

  const targetZone = targetZoneId && zones ? zones[targetZoneId] : undefined;
  const currentZone =
    selectedObject && selectedObject.zone_id && zones ? zones[selectedObject.zone_id] : undefined;

  const jointItems = [
    { label: 'J1 (Base Yaw)', rad: joints?.joint1 ?? 0, min: -3.14, max: 3.14 },
    { label: 'J2 (Shoulder)', rad: joints?.joint2 ?? 0, min: -1.57, max: 1.57 },
    { label: 'J3 (Elbow)', rad: joints?.joint3 ?? 0, min: -2.09, max: 2.09 },
    { label: 'J4 (Wrist 1)', rad: joints?.joint4 ?? 0, min: -3.14, max: 3.14 },
    { label: 'J5 (Wrist 2)', rad: joints?.joint5 ?? 0, min: -1.74, max: 1.74 },
    { label: 'J6 (Wrist 3)', rad: joints?.joint6 ?? 0, min: -3.14, max: 3.14 }
  ];

  const pos =
    selectedObject?.position && Array.isArray(selectedObject.position)
      ? selectedObject.position
      : [0, 0, 0];

  return (
    <div className="panel h-full flex flex-col font-sans select-none overflow-hidden">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-header-title">
          <Info size={14} className="text-[#ff8a00]" />
          <span>Inspector & Telemetry</span>
        </div>
        <span className="text-[10px] text-[#64748b] font-mono uppercase bg-[#161b26] px-1.5 py-0.5 rounded border border-[#282e3a]">
          {activeIntent || 'STANDBY'}
        </span>
      </div>

      <div className="p-2.5 flex-1 overflow-y-auto flex flex-col gap-3 font-mono text-xs">
        {/* 1. SELECTED OBJECT CARD */}
        <div className="bg-[#161b26] border border-[#282e3a] rounded p-2.5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#94a3b8] flex items-center gap-1.5">
              <Crosshair size={13} className="text-[#ff8a00]" />
              Target Entity
            </span>
            {selectedObject ? (
              <span className="text-[10px] text-[#10b981] bg-[#10b98122] px-1.5 py-0.5 rounded border border-[#10b98144]">
                Available
              </span>
            ) : (
              <span className="text-[10px] text-[#64748b]">No Selection</span>
            )}
          </div>

          {selectedObject ? (
            <div className="flex flex-col gap-1.5 bg-[#0b0d12] p-2 rounded border border-[#222836]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-white/20"
                    style={{ backgroundColor: selectedObject.color || '#3b82f6' }}
                  />
                  <span className="font-semibold text-[#f1f5f9] text-xs">
                    {selectedObject.name || selectedObject.id}
                  </span>
                </div>
                <span className="text-[10px] text-[#64748b]">{selectedObject.id}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-[#1e2433]">
                <div>
                  <span className="text-[#64748b]">Current: </span>
                  <span className="text-[#00e5ff] font-semibold">
                    {currentZone?.name || selectedObject.zone_id || 'Unknown'}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748b]">Target: </span>
                  <span className="text-[#ff8a00] font-semibold">
                    {targetZone?.name || targetZoneId || 'Unassigned'}
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-[#64748b] flex items-center justify-between pt-1">
                <span>
                  Coord: {formatCoordinates(selectedObject.position, 2)}
                </span>
                <span>Mass: {formatNumber(selectedObject.weight_kg, 2)}kg</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-2 text-[#475569] italic text-[11px]">
              Click any object in the 3D scene to inspect
            </div>
          )}
        </div>

        {/* 2. ROBOT JOINT TELEMETRY & GRIPPER STATE */}
        <div className="bg-[#161b26] border border-[#282e3a] rounded p-2.5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#94a3b8] flex items-center gap-1.5">
              <Cpu size={13} className="text-[#00e5ff]" />
              6-DOF Kinematics
            </span>
            <span className="text-[10px] text-[#64748b]">50.0 Hz</span>
          </div>

          <div className="flex flex-col gap-1.5">
            {jointItems.map((j, i) => {
              const rad = typeof j.rad === 'number' && !isNaN(j.rad) ? j.rad : 0;
              const pct = Math.min(100, Math.max(0, ((rad - j.min) / (j.max - j.min)) * 100));
              return (
                <div key={i} className="flex flex-col gap-0.5 text-[10px]">
                  <div className="flex justify-between text-[#cbd5e1]">
                    <span className="text-[#94a3b8]">{j.label}</span>
                    <span>
                      {formatRadToDeg(rad, 1)}° <span className="text-[#64748b]">({formatNumber(rad, 2)})</span>
                    </span>
                  </div>
                  <div className="w-full h-1 bg-[#0b0d12] rounded overflow-hidden">
                    <div
                      className="h-full bg-[#00e5ff] transition-all duration-100"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Gripper State */}
          <div className="bg-[#0b0d12] p-2 rounded border border-[#222836] flex items-center justify-between text-[11px] mt-1">
            <span className="text-[#94a3b8]">Gripper Claws:</span>
            <span
              className={`font-semibold ${
                gripper?.is_closed ? 'text-[#10b981]' : 'text-[#ff8a00]'
              }`}
            >
              {gripper?.is_closed
                ? `LOCKED (${gripper.grasped_object_id || 'Object'})`
                : `OPEN (${formatNumber(((joints?.finger_joint ?? 0.04)) * 1000, 0)}mm)`}
            </span>
          </div>
        </div>

        {/* 3. INVENTORY GROUPED BY ZONE */}
        <div className="bg-[#161b26] border border-[#282e3a] rounded p-2.5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#94a3b8] flex items-center gap-1.5">
              <Layers size={13} className="text-[#10b981]" />
              Zone Allocation
            </span>
            <span className="text-[10px] text-[#64748b]">
              {Object.keys(objects || {}).length} Items
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            {Object.values(zones || {}).map((zone) => {
              if (!zone || !zone.id) return null;
              const objsInZone = zoneOccupancy[zone.id] || [];
              const isTargetZone = zone.id === targetZoneId;

              return (
                <div
                  key={zone.id}
                  className={`p-1.5 rounded border transition-colors ${
                    isTargetZone
                      ? 'bg-[#ff8a0011] border-[#ff8a0055]'
                      : 'bg-[#0b0d12] border-[#222836]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-sm shrink-0"
                        style={{ backgroundColor: zone.color || '#ff8a00' }}
                      />
                      <span className="text-[#f1f5f9] font-semibold">{zone.name || zone.id}</span>
                    </div>
                    <span className="text-[10px] text-[#64748b]">{objsInZone.length} objs</span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {objsInZone.length === 0 ? (
                      <span className="text-[10px] text-[#475569] italic">Empty</span>
                    ) : (
                      objsInZone.map((obj) => {
                        if (!obj || !obj.id) return null;
                        return (
                          <button
                            key={obj.id}
                            onClick={() => onSelectObject(obj.id)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-all flex items-center gap-1 ${
                              obj.id === selectedObject?.id
                                ? 'bg-[#ff8a0022] border-[#ff8a00] text-[#ff8a00]'
                                : 'bg-[#131720] border-[#282e3a] text-[#cbd5e1] hover:text-white'
                            }`}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: obj.color || '#3b82f6' }}
                            />
                            <span>{obj.name || obj.id}</span>
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
      </div>
    </div>
  );
};
