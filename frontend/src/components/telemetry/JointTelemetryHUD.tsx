import React from 'react';
import { Cpu } from 'lucide-react';
import { JointAngles, GripperState } from '../../types/robot';
import { formatNumber, formatRadToDeg } from '../../utils/formatters';

interface JointTelemetryHUDProps {
  joints?: JointAngles;
  gripper?: GripperState;
  activeIntent?: string;
  controllerFreq?: number;
}

export const JointTelemetryHUD: React.FC<JointTelemetryHUDProps> = ({
  joints,
  gripper,
  activeIntent = 'STANDBY',
  controllerFreq = 50.0
}) => {

  const jointItems = [
    { name: 'J1: Base Yaw', val: joints?.joint1 ?? 0, min: -3.14, max: 3.14 },
    { name: 'J2: Shoulder', val: joints?.joint2 ?? 0, min: -1.57, max: 1.57 },
    { name: 'J3: Elbow', val: joints?.joint3 ?? 0, min: -2.09, max: 2.09 },
    { name: 'J4: Wrist 1', val: joints?.joint4 ?? 0, min: -3.14, max: 3.14 },
    { name: 'J5: Wrist 2', val: joints?.joint5 ?? 0, min: -1.74, max: 1.74 },
    { name: 'J6: Wrist 3', val: joints?.joint6 ?? 0, min: -3.14, max: 3.14 }
  ];

  const fingerOpening = joints?.finger_joint ?? 0.04;
  const isClosed = Boolean(gripper?.is_closed);

  return (
    <div className="panel h-full flex flex-col font-sans select-none">
      <div className="panel-header">
        <div className="panel-header-title">
          <Cpu size={14} className="text-[#ff7a00]" />
          <span>Kinematic Telemetry & Joint States</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-[#64748b]">
          <span>{formatNumber(controllerFreq, 1, '50.0')} Hz</span>
          <span className="text-[#10b981]">ONLINE</span>
        </div>
      </div>

      <div className="p-2.5 flex-1 overflow-y-auto flex flex-col gap-2 font-mono">
        {/* Status Strip */}
        <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#11141c] p-2 rounded border border-[#222938]">
          <div>
            <span className="text-[#64748b]">Active Intent: </span>
            <span className="text-[#ff7a00] font-semibold">{activeIntent || 'STANDBY'}</span>
          </div>
          <div>
            <span className="text-[#64748b]">Gripper: </span>
            <span className={isClosed ? 'text-[#10b981]' : 'text-[#94a3b8]'}>
              {isClosed ? 'CLOSED (Grasped)' : `OPEN (${formatNumber(fingerOpening * 1000, 0)}mm)`}
            </span>
          </div>
        </div>

        {/* 6 Joint Values */}
        <div className="flex flex-col gap-1.5">
          {jointItems.map((j, i) => {
            const val = typeof j.val === 'number' && !isNaN(j.val) ? j.val : 0;
            const pct = Math.min(100, Math.max(0, ((val - j.min) / (j.max - j.min)) * 100));
            return (
              <div key={i} className="bg-[#11141c] p-1.5 rounded border border-[#1e2433] text-xs">
                <div className="flex justify-between text-[#cbd5e1] mb-1">
                  <span>{j.name}</span>
                  <span>
                    {formatRadToDeg(val, 1)}° <span className="text-[#64748b]">({formatNumber(val, 2)} rad)</span>
                  </span>
                </div>
                <div className="w-full h-1 bg-[#1e2433] rounded overflow-hidden">
                  <div
                    className="h-full bg-[#00e5ff] transition-all duration-100"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Gripper Linear Stroke */}
        <div className="bg-[#11141c] p-2 rounded border border-[#1e2433] text-xs">
          <div className="flex justify-between text-[#cbd5e1] mb-1">
            <span>Pneumatic Claw Stroke</span>
            <span>{formatNumber(fingerOpening * 1000, 1)} mm</span>
          </div>
          <div className="w-full h-1.5 bg-[#1e2433] rounded overflow-hidden">
            <div
              className="h-full bg-[#10b981] transition-all duration-100"
              style={{ width: `${Math.min(100, Math.max(0, (fingerOpening / 0.04) * 100))}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
