import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ButterflyControlState,
  WingKinematicsFrame,
} from '../kinematics/butterflyKinematics';

interface PosterBackdropProps {
  visible: boolean;
  telemetry: WingKinematicsFrame['telemetry'];
  rendererLabel: string;
  controlState?: ButterflyControlState;
}

/**
 * Iconic 3-circle crimson segmented triad glyph with 45° cut-lines from the reference poster.
 */
function CrimsonTriadGlyph({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 110 105"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      {/* Circle 1 (Top-Left) */}
      <g transform="translate(28, 28)">
        <circle cx="0" cy="0" r="22" fill="#E61E2A" />
        <line
          x1="0"
          y1="0"
          x2="-16"
          y2="-16"
          stroke="#101114"
          strokeWidth="3.5"
        />
      </g>
      {/* Circle 2 (Top-Right) */}
      <g transform="translate(78, 32)">
        <circle cx="0" cy="0" r="22" fill="#E61E2A" />
        <line
          x1="0"
          y1="0"
          x2="16"
          y2="-15"
          stroke="#101114"
          strokeWidth="3.5"
        />
      </g>
      {/* Circle 3 (Bottom) */}
      <g transform="translate(68, 78)">
        <circle cx="0" cy="0" r="22" fill="#E61E2A" />
        <line
          x1="0"
          y1="0"
          x2="-15"
          y2="-15"
          stroke="#101114"
          strokeWidth="3.5"
        />
      </g>
    </svg>
  );
}

/**
 * Technical Wireframe Box with diagonal X-crosshairs and crimson square vertex nodes
 * from the top-left and bottom-right of the reference poster.
 */
function WireframeNodeBox({
  rows = 2,
  className = '',
}: {
  rows?: 1 | 2;
  className?: string;
}) {
  const height = rows === 2 ? 200 : 110;
  return (
    <svg
      viewBox={`0 0 120 ${height}`}
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <rect
        x="6"
        y="6"
        width="108"
        height={height - 12}
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.8"
      />
      {rows === 2 ? (
        <>
          <line
            x1="6"
            y1={height / 2}
            x2="114"
            y2={height / 2}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="0.8"
          />
          <line
            x1="6"
            y1="6"
            x2="114"
            y2={height / 2}
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="0.8"
          />
          <line
            x1="114"
            y1="6"
            x2="6"
            y2={height / 2}
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="0.8"
          />
          <line
            x1="6"
            y1={height / 2}
            x2="114"
            y2={height - 6}
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="0.8"
          />
          <line
            x1="114"
            y1={height / 2}
            x2="6"
            y2={height - 6}
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="0.8"
          />
          {/* 6 Crimson Corner/Mid Vertex Nodes */}
          <rect x="2" y="2" width="8" height="8" fill="#E61E2A" />
          <rect x="110" y="2" width="8" height="8" fill="#E61E2A" />
          <rect x="2" y={height / 2 - 4} width="8" height="8" fill="#E61E2A" />
          <rect
            x="110"
            y={height / 2 - 4}
            width="8"
            height="8"
            fill="#E61E2A"
          />
          <rect x="2" y={height - 10} width="8" height="8" fill="#E61E2A" />
          <rect x="110" y={height - 10} width="8" height="8" fill="#E61E2A" />
        </>
      ) : (
        <>
          <line
            x1="6"
            y1="6"
            x2="114"
            y2={height - 6}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="0.8"
          />
          <line
            x1="114"
            y1="6"
            x2="6"
            y2={height - 6}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="0.8"
          />
          <rect x="2" y="2" width="8" height="8" fill="#E61E2A" />
          <rect x="110" y="2" width="8" height="8" fill="#E61E2A" />
          <rect x="2" y={height - 10} width="8" height="8" fill="#E61E2A" />
          <rect x="110" y={height - 10} width="8" height="8" fill="#E61E2A" />
        </>
      )}
    </svg>
  );
}

/**
 * Animated Server Cluster Node Monitor showing live telemetry, fluctuating CPU bars,
 * active ping, and memory registers.
 */
function ServerClusterMonitor() {
  const [ticks, setTicks] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTicks((t) => t + 1);
    }, 900);
    return () => clearInterval(timer);
  }, []);

  const servers = useMemo(() => {
    const s1 = 88 + Math.sin(ticks * 0.9) * 8;
    const s2 = 64 + Math.cos(ticks * 1.3) * 11;
    const s3 = 79 + Math.sin(ticks * 1.7) * 9;
    const s4 = 92 + Math.cos(ticks * 0.7) * 5;

    return [
      { id: 'SRV-01', name: 'KINEMATICS.DAEMON', load: Math.round(s1), ping: '8ms', status: 'ONLINE' },
      { id: 'SRV-02', name: 'SYNAPSE.CORE.BUS', load: Math.round(s2), ping: '12ms', status: 'OPTIMAL' },
      { id: 'SRV-03', name: 'PLASMA.REACTOR.FLUX', load: Math.round(s3), ping: '9ms', status: 'ACTIVE' },
      { id: 'SRV-04', name: 'VORTEX.FLUID.GRID', load: Math.round(s4), ping: '14ms', status: 'LOCKED' },
    ];
  }, [ticks]);

  return (
    <div className="space-y-2 border border-white/10 bg-[#101114]/80 p-2.5 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/10 pb-1.5 font-mono text-[9px] tracking-widest text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-[#E61E2A] animate-led-blink" />
          <span className="font-bold text-white">MAINFRAME CLUSTER</span>
        </div>
        <span className="text-[8px] text-slate-500">SYS_V9.4</span>
      </div>

      <div className="space-y-1.5 font-mono text-[8.5px]">
        {servers.map((srv) => (
          <div key={srv.id} className="space-y-0.5">
            <div className="flex items-center justify-between text-slate-300">
              <span className="font-semibold text-white/90">{srv.name}</span>
              <span className="text-slate-400 tabular-nums">
                {srv.load}% · {srv.ping}
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-xs bg-white/10">
              <div
                className="h-full bg-gradient-to-r from-slate-400 via-white to-[#E61E2A] transition-all duration-700 ease-out"
                style={{ width: `${srv.load}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-1 font-mono text-[7.5px] text-slate-500">
        <span>MEM: 0x7FFA8921 · 64GB</span>
        <span className="text-[#E61E2A]">THROUGHPUT: 48.2 GB/S</span>
      </div>
    </div>
  );
}

/**
 * Live Terminal Stream with text appearing line by line and a blinking cursor.
 */
function AppearingTerminalStream() {
  const logEntries = useMemo(
    () => [
      'SYS.INIT: Biomechanical neuro-link established',
      'CALIBRATE: Wing-root wishbone servos zeroed at 0.00°',
      'AERO.FLAP: Kinematic harmonic frequency locked 1.25 Hz',
      'PIEZO.ARRAY: Kinetic energy harvesting active [23.4 MW]',
      'LATTICE: Carbon-fiber micro-grain stress within 0.04% tolerance',
      'OPTICAL.DOMES: Dual compound crimson ocular array synced',
      'HYDRAULIC: Dual outer-margin pushrods pressurized at 340 bar',
      'CONTAINMENT: Synthetic plasma field stability 99.82%',
      'ACTUATOR.CHASSIS: Stepped 9-segment ladder abdomen locked',
      'AERO.VORTEX: Leading-edge vortex stabilization confirmed',
      'VECTOR.NAV: 6-DOF flight profile armed and autonomous',
      'DOWNLINK: High-speed quantum telemetry stream 60 FPS',
    ],
    []
  );

  const [visibleCount, setVisibleCount] = useState(4);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleCount((count) => (count >= logEntries.length ? 3 : count + 1));
    }, 2400);
    return () => clearInterval(timer);
  }, [logEntries.length]);

  const displayedLogs = useMemo(() => {
    return logEntries.slice(Math.max(0, visibleCount - 5), visibleCount);
  }, [logEntries, visibleCount]);

  return (
    <div className="relative overflow-hidden border border-white/10 bg-[#101114]/85 p-2.5 font-mono text-[8px] leading-relaxed text-slate-300 backdrop-blur-md">
      <div className="mb-1.5 flex items-center justify-between border-b border-white/10 pb-1 text-[8.5px] tracking-wider text-slate-400">
        <span className="flex items-center gap-1.5 text-white">
          <span className="h-1.5 w-1.5 bg-[#E61E2A]" />
          LIVE DIAGNOSTIC LOG
        </span>
        <span className="text-[7.5px] text-slate-500">STREAMING</span>
      </div>

      <div className="space-y-1">
        {displayedLogs.map((log, idx) => (
          <div
            key={`${log}-${idx}`}
            className="flex items-start gap-1.5 transition-all duration-300"
          >
            <span className="text-[#E61E2A] select-none">&gt;</span>
            <span
              className={
                idx === displayedLogs.length - 1
                  ? 'text-white font-semibold'
                  : 'text-slate-400'
              }
            >
              {log}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1 text-[#E61E2A]">
          <span className="animate-pulse">_</span>
          <span className="text-[7px] text-slate-500">AWAITING BUFFER SYNC</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Animated SVG Oscilloscope Waveform & Equalizer Bars tightly synchronized
 * with the real-time mechanical butterfly wing flapping kinematics.
 */
function KinematicOscilloscope({
  telemetry,
  controlState,
}: {
  telemetry: WingKinematicsFrame['telemetry'];
  controlState?: ButterflyControlState;
}) {
  const isPlaying = controlState?.isPlaying ?? telemetry.isPlaying ?? true;
  const frequencyHz = telemetry.frequencyHz || 1.25;
  const [displayPhase, setDisplayPhase] = useState(telemetry.kinematicPhaseRad ?? 0);
  const phaseRef = useRef(telemetry.kinematicPhaseRad ?? 0);
  const prevTimeRef = useRef(performance.now());

  useEffect(() => {
    let animId: number;

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - prevTimeRef.current) / 1000);
      prevTimeRef.current = now;

      if (isPlaying) {
        // Progress display phase at the exact kinematic frequency
        const step = dt * frequencyHz * (Math.PI * 2);
        phaseRef.current += step;

        // Gently drift-correct towards live telemetry kinematicPhaseRad to eliminate accumulated error
        if (typeof telemetry.kinematicPhaseRad === 'number') {
          const target = telemetry.kinematicPhaseRad;
          const tau = Math.PI * 2;
          let diff = target - (phaseRef.current % tau);
          while (diff < -Math.PI) diff += tau;
          while (diff > Math.PI) diff -= tau;
          phaseRef.current += diff * 0.2;
        }
      } else {
        // Paused: lock phase directly to telemetry kinematicPhaseRad
        if (typeof telemetry.kinematicPhaseRad === 'number') {
          phaseRef.current = telemetry.kinematicPhaseRad;
        }
      }

      setDisplayPhase(phaseRef.current);
      animId = requestAnimationFrame(loop);
    };

    prevTimeRef.current = performance.now();
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, frequencyHz, telemetry.kinematicPhaseRad]);

  const { wavePath, centerDotY, isUpstroke, strokeAngleText } = useMemo(() => {
    const points: string[] = [];
    const width = 200;
    const height = 46;
    const midY = height / 2;
    const amplitude =
      14 * Math.min(1.4, Math.max(0.65, (telemetry.plasmaOutputMw || 28) / 28));

    // True mechanical harmonic formula from butterflyKinematics.ts:
    // harmonic = Math.sin(phase) - 0.18 * Math.sin(2 * phase)
    // Normalized by 1.18 so max peak matches amplitude
    const spatialCycles = 2.0;

    let centerDotY = midY;
    for (let x = 0; x <= width; x += 3) {
      // Spatial offset centered at x = 100 (the vertical centerline reticle)
      const spatialAngle =
        ((x - 100) / width) * (Math.PI * 2 * spatialCycles);
      const angle = displayPhase + spatialAngle;
      const harmonic = (Math.sin(angle) - 0.18 * Math.sin(2 * angle)) / 1.18;
      // When harmonic > 0 (wings up), y is smaller (higher on screen)
      const y = midY - harmonic * amplitude;

      if (Math.abs(x - 100) < 2) {
        centerDotY = y;
      }
      points.push(`${x === 0 ? 'M' : 'L'} ${x} ${y.toFixed(1)}`);
    }

    const currentDeg =
      telemetry.currentStrokeAngleDeg ??
      (Math.sin(displayPhase) - 0.18 * Math.sin(2 * displayPhase)) * 38;
    const isUpstroke = currentDeg >= 0;
    const strokeAngleText = `${isUpstroke ? '+' : ''}${currentDeg.toFixed(1)}°`;

    return {
      wavePath: points.join(' '),
      centerDotY,
      isUpstroke,
      strokeAngleText,
    };
  }, [displayPhase, telemetry.plasmaOutputMw, telemetry.currentStrokeAngleDeg]);

  const eqBars = useMemo(() => {
    const flapPower = Math.min(
      1.5,
      Math.max(0.4, (telemetry.wingtipVelocityMs || 4.2) / 4.2)
    );
    const normalizedFlap =
      typeof telemetry.normalizedFlap === 'number'
        ? Math.abs(telemetry.normalizedFlap)
        : Math.abs(Math.sin(displayPhase));

    return Array.from({ length: 14 }).map((_, i) => {
      const barPhase = displayPhase - (i / 14) * Math.PI * 1.6;
      const barHarmonic =
        (Math.sin(barPhase) - 0.18 * Math.sin(2 * barPhase)) * 0.5 + 0.5;
      const baseH =
        6 + barHarmonic * 22 * flapPower * (isPlaying ? 1.0 : 0.45);
      const pulseH = normalizedFlap * 6 * (isPlaying ? 1.0 : 0.3);
      return Math.min(42, Math.max(5, Math.round(baseH + pulseH)));
    });
  }, [
    displayPhase,
    isPlaying,
    telemetry.wingtipVelocityMs,
    telemetry.normalizedFlap,
  ]);

  return (
    <div className="border border-white/10 bg-[#101114]/85 p-2.5 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/10 pb-1 font-mono text-[8.5px] tracking-wider text-slate-400">
        <span className="flex items-center gap-1.5 text-white">
          <span
            className={`h-1.5 w-1.5 ${
              isPlaying ? 'bg-[#E61E2A] animate-pulse' : 'bg-slate-500'
            }`}
          />
          KINEMATIC HARMONIC WAVEFORM
        </span>
        <div className="flex items-center gap-2">
          <span
            className={`text-[7.5px] font-bold ${
              isUpstroke ? 'text-emerald-400' : 'text-[#FF4D58]'
            }`}
          >
            {isPlaying ? strokeAngleText : 'HOLD [PAUSED]'}
          </span>
          <span className="tabular-nums text-slate-300">
            {frequencyHz.toFixed(2)} HZ
          </span>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <svg
          viewBox="0 0 200 46"
          className="h-11 w-44 overflow-visible"
          fill="none"
          aria-hidden="true"
        >
          {/* Neutral Baseline & Center Reticle */}
          <line
            x1="0"
            y1="23"
            x2="200"
            y2="23"
            stroke="rgba(255,255,255,0.12)"
            strokeDasharray="3 3"
          />
          <line
            x1="100"
            y1="0"
            x2="100"
            y2="46"
            stroke="rgba(255,255,255,0.18)"
          />

          {/* Upper/Lower Peak Bounds */}
          <line
            x1="0"
            y1="9"
            x2="200"
            y2="9"
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="1 4"
          />
          <line
            x1="0"
            y1="37"
            x2="200"
            y2="37"
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="1 4"
          />

          {/* Crimson Harmonic Wave with Glow */}
          <path d={wavePath} stroke="#E61E2A" strokeWidth="3" opacity="0.4" />
          <path d={wavePath} stroke="#FFFFFF" strokeWidth="1.5" />

          {/* Dynamic Center Tracking Marker (Current Wing Stroke Elevation) */}
          <g transform={`translate(100, ${centerDotY})`}>
            <circle
              cx="0"
              cy="0"
              r="4.5"
              fill="none"
              stroke="#E61E2A"
              strokeWidth="1"
              opacity="0.75"
            />
            <circle cx="0" cy="0" r="2.2" fill="#E61E2A" />
            <circle cx="0" cy="0" r="1.2" fill="#FFFFFF" />
            <line
              x1="-7"
              y1="0"
              x2="-3.5"
              y2="0"
              stroke="#FF4D58"
              strokeWidth="1"
            />
            <line
              x1="3.5"
              y1="0"
              x2="7"
              y2="0"
              stroke="#FF4D58"
              strokeWidth="1"
            />
          </g>
        </svg>

        {/* Kinematic Power Equalizer Bars */}
        <div className="flex h-11 items-end gap-1">
          {eqBars.map((h, i) => (
            <div
              key={i}
              className="w-1 bg-gradient-to-t from-slate-600 via-white to-[#E61E2A] transition-all duration-75"
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Rotating Mechanical Radar Reticle with technical degree ticks.
 */
function MechanicalReticle({ className = '' }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 160 160"
        className="absolute inset-0 h-full w-full animate-radar-spin-reverse opacity-40"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="80" cy="80" r="76" stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="6 8" />
        <circle cx="80" cy="80" r="68" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="18 12" />
        <line x1="80" y1="2" x2="80" y2="12" stroke="#E61E2A" strokeWidth="2" />
        <line x1="80" y1="148" x2="80" y2="158" stroke="#E61E2A" strokeWidth="2" />
        <line x1="2" y1="80" x2="12" y2="80" stroke="#E61E2A" strokeWidth="2" />
        <line x1="148" y1="80" x2="158" y2="80" stroke="#E61E2A" strokeWidth="2" />
      </svg>

      <svg
        viewBox="0 0 160 160"
        className="h-full w-full animate-radar-spin opacity-70"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="80" cy="80" r="54" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeDasharray="40 14" />
        <circle cx="80" cy="80" r="38" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
        <line x1="80" y1="26" x2="80" y2="134" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
        <line x1="26" y1="80" x2="134" y2="80" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
        <line x1="80" y1="80" x2="134" y2="80" stroke="#E61E2A" strokeWidth="1.8" />
        <circle cx="80" cy="80" r="4" fill="#E61E2A" />
      </svg>

      <div className="pointer-events-none absolute font-mono text-[7px] font-bold tracking-widest text-white/80">
        360° RADAR
      </div>
    </div>
  );
}

/**
 * Interactive Avionics & Biomechanical Flight Vector Hub.
 * Features a miniature wireframe butterfly silhouette physically flapping in real-time,
 * interactive mode tabs [VECTOR], [POWER], [ARMOR], and dynamic telemetry.
 */
function AvionicsVectorHub({
  frequencyHz,
  velocityMs,
  plasmaMw,
}: {
  frequencyHz: number;
  velocityMs: number;
  plasmaMw: number;
}) {
  const [activeTab, setActiveTab] = useState<'VECTOR' | 'POWER' | 'ARMOR'>('VECTOR');
  const [simTime, setSimTime] = useState(0);

  useEffect(() => {
    let animId: number;
    let prev = performance.now();

    const loop = (now: number) => {
      const dt = (now - prev) / 1000;
      prev = now;
      setSimTime((t) => t + dt);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const flapAngleDeg = Math.sin(simTime * Math.max(0.4, frequencyHz) * Math.PI * 2) * 32;
  const isUpstroke = Math.cos(simTime * Math.max(0.4, frequencyHz) * Math.PI * 2) > 0;

  const hexBlock = useMemo(() => {
    const seed = Math.floor(simTime * 2);
    const h1 = ((seed * 1103515245 + 12345) & 0xffff).toString(16).toUpperCase().padStart(4, '0');
    const h2 = ((seed * 1664525 + 1013904223) & 0xffff).toString(16).toUpperCase().padStart(4, '0');
    return `0x${h1} 0x${h2}`;
  }, [simTime]);

  return (
    <div className="pointer-events-auto max-w-[310px] border border-white/10 bg-[#101114]/90 p-3 shadow-2xl backdrop-blur-md select-none">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div>
          <div className="flex items-center gap-1.5 font-display text-sm font-black tracking-wide text-white">
            <span className="inline-block h-2 w-2 rounded-xs bg-[#E61E2A] animate-pulse" />
            <span>NX-0621</span>
            <span className="text-[#E61E2A] font-light">//</span>
            <span className="text-slate-200">VECTOR HUB</span>
          </div>
          <div className="font-mono text-[7.5px] tracking-widest text-slate-400">
            AUTONOMOUS BIOMECHATRONIC AVIONICS
          </div>
        </div>
        <div className="border border-[#E61E2A]/30 bg-[#E61E2A]/10 px-1.5 py-0.5 font-mono text-[7.5px] font-bold text-[#FF4D58]">
          REV-E · ARMED
        </div>
      </div>

      <div className="my-2 flex gap-1 border-b border-white/10 pb-1.5">
        {(['VECTOR', 'POWER', 'ARMOR'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`cursor-pointer px-2 py-0.5 font-mono text-[8px] font-bold tracking-wider transition-colors ${
              activeTab === tab
                ? 'bg-white text-black'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            [{tab}]
          </button>
        ))}
        <div className="ml-auto font-mono text-[7px] text-slate-500 self-center">
          {hexBlock}
        </div>
      </div>

      {activeTab === 'VECTOR' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 border border-white/5 bg-black/40 p-2">
            {/* Tactical 3-Axis Attitude Director Indicator (ADI) & Vector Horizon */}
            <div className="relative h-13 w-20 flex items-center justify-center overflow-hidden border border-white/10 bg-black/60 rounded-xs">
              <svg viewBox="0 0 72 52" className="h-full w-full" fill="none" aria-hidden="true">
                {/* Background Compass Ring */}
                <circle cx="36" cy="26" r="23" stroke="rgba(255,255,255,0.14)" strokeWidth="0.8" strokeDasharray="3 3" />
                <circle cx="36" cy="26" r="16" stroke="rgba(255,255,255,0.08)" strokeWidth="0.6" />

                {/* Horizon Line & Pitch Ladder (Tilts and shifts smoothly with kinematics) */}
                <g transform={`rotate(${flapAngleDeg * 0.25}, 36, 26)`}>
                  <line x1="14" y1="26" x2="28" y2="26" stroke="#FFFFFF" strokeWidth="1.2" />
                  <line x1="44" y1="26" x2="58" y2="26" stroke="#FFFFFF" strokeWidth="1.2" />
                  {/* +10 Degree Pitch Ladder */}
                  <line x1="26" y1="20" x2="46" y2="20" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
                  <line x1="26" y1="20" x2="26" y2="22" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
                  <line x1="46" y1="20" x2="46" y2="22" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
                  {/* -10 Degree Pitch Ladder */}
                  <line x1="28" y1="32" x2="44" y2="32" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" strokeDasharray="2 2" />
                </g>

                {/* Tactical Flight Path Boresight Reticle */}
                <circle cx="36" cy="26" r="2" fill="#E61E2A" />
                <path d="M 30 26 L 33 26 M 39 26 L 42 26" stroke="#E61E2A" strokeWidth="1.4" />
                <path d="M 36 21 L 36 23" stroke="#E61E2A" strokeWidth="1.2" />

                {/* Corner Frame Ticks */}
                <path d="M 4 8 L 4 4 L 8 4" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
                <path d="M 68 8 L 68 4 L 64 4" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
                <path d="M 4 44 L 4 48 L 8 48" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
                <path d="M 68 44 L 68 48 L 64 48" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />

                {/* Status Readout in Corner */}
                <text x="6" y="11" fill="rgba(255,255,255,0.4)" fontSize="4.5" fontFamily="monospace">ADI</text>
                <text x="46" y="46" fill="#E61E2A" fontSize="4.5" fontFamily="monospace">6-DOF</text>
              </svg>
            </div>

            <div className="flex-1 font-mono text-[8px] space-y-0.5">
              <div className="flex justify-between">
                <span className="text-slate-400">STROKE ANGLE:</span>
                <span className="font-bold text-white tabular-nums">
                  {flapAngleDeg >= 0 ? `+${flapAngleDeg.toFixed(1)}°` : `${flapAngleDeg.toFixed(1)}°`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">KINEMATIC PHASE:</span>
                <span className="text-[#FF4D58] font-bold">
                  {isUpstroke ? 'UPSTROKE' : 'DOWNSTROKE'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">TIP SPEED:</span>
                <span className="text-slate-200 tabular-nums">
                  {velocityMs.toFixed(2)} M/S
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 font-mono text-[7.5px]">
            <div className="border border-white/5 bg-white/5 p-1.5">
              <span className="text-slate-400">LIFT COEFF Cl:</span>{' '}
              <span className="font-bold text-white">1.48 MAX</span>
            </div>
            <div className="border border-white/5 bg-white/5 p-1.5">
              <span className="text-slate-400">VORTEX STABILITY:</span>{' '}
              <span className="font-bold text-[#E61E2A]">LOCKED</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'POWER' && (
        <div className="space-y-2">
          <div className="border border-white/5 bg-black/40 p-2 font-mono text-[8px] space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">SYNTHETIC PLASMA:</span>
              <span className="font-bold text-[#FF4D58] tabular-nums">
                {plasmaMw.toFixed(1)} MW
              </span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-xs overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-600 via-white to-red-500"
                style={{ width: `${Math.min(100, (plasmaMw / 30) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between pt-1 text-[7.5px]">
              <span className="text-slate-400">CORE TEMPERATURE:</span>
              <span className="text-slate-200">482°C [NOMINAL]</span>
            </div>
            <div className="flex justify-between text-[7.5px]">
              <span className="text-slate-400">MAGNETIC CONTAINMENT:</span>
              <span className="text-white">99.8% STABLE</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 font-mono text-[7.5px]">
            <div className="border border-white/5 bg-white/5 p-1.5">
              <span className="text-slate-400">PIEZO HARVEST:</span>{' '}
              <span className="font-bold text-white">ACTIVE</span>
            </div>
            <div className="border border-white/5 bg-white/5 p-1.5">
              <span className="text-slate-400">EFFICIENCY:</span>{' '}
              <span className="font-bold text-slate-200">94.2%</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ARMOR' && (
        <div className="space-y-2">
          <div className="border border-white/5 bg-black/40 p-2 font-mono text-[8px] space-y-1.5">
            <div className="space-y-0.5">
              <div className="flex justify-between text-[7.5px]">
                <span className="text-slate-400">D-42 CERAMIC PLATES</span>
                <span className="text-white font-bold">100% NOMINAL</span>
              </div>
              <div className="h-1 w-full bg-white/10 rounded-xs overflow-hidden">
                <div className="h-full bg-white w-full" />
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="flex justify-between text-[7.5px]">
                <span className="text-slate-400">BRUSHED TITANIUM BEZEL</span>
                <span className="text-slate-200 font-bold">99.8% INTEGRITY</span>
              </div>
              <div className="h-1 w-full bg-white/10 rounded-xs overflow-hidden">
                <div className="h-full bg-slate-300 w-[99.8%]" />
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="flex justify-between text-[7.5px]">
                <span className="text-slate-400">OBSIDIAN CARBON CHASSIS</span>
                <span className="text-[#FF4D58] font-bold">100% SECURE</span>
              </div>
              <div className="h-1 w-full bg-white/10 rounded-xs overflow-hidden">
                <div className="h-full bg-red-600 w-full" />
              </div>
            </div>
          </div>

          <div className="font-mono text-[7px] text-slate-400 border border-white/5 bg-white/5 p-1.5 flex justify-between">
            <span>MICRO-GRAIN STRAIN: 0.02%</span>
            <span className="text-[#E61E2A]">NO BREACH DETECTED</span>
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-1.5 font-mono text-[7.5px] text-slate-400">
        <span className="flex items-center gap-1 text-slate-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          SYSTEMS AUTONOMOUS
        </span>
        <span className="text-[#E61E2A]">FREQ: {(frequencyHz || 1.25).toFixed(2)} HZ</span>
      </div>
    </div>
  );
}

export function PosterBackdrop({
  visible,
  telemetry,
  rendererLabel,
  controlState,
}: PosterBackdropProps) {
  const [mobileTab, setMobileTab] = useState<'HUB' | 'TELEMETRY' | 'MIN'>('HUB');

  if (!visible) {
    return (
      <div className="pointer-events-none absolute inset-0 z-0 bg-[#141517]" />
    );
  }

  return (
    <>
      {/* =====================================================================
          LAYER 0 (BEHIND 3D BUTTERFLY):
          Matte Charcoal-Black Backdrop, Blueprint X-Frames, Grid & Redesigned Header
         ===================================================================== */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#141517] select-none">
        {/* Subtle neutral studio vignette behind the butterfly */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 48%, rgba(36, 38, 42, 0.4) 0%, rgba(20, 21, 23, 0.88) 55%, rgba(16, 17, 19, 1) 90%)',
          }}
        />

        {/* High-Tech Background Structural Grid Lines & Poster X-Frames */}
        <svg
          viewBox="0 0 1440 900"
          className="absolute inset-0 h-full w-full opacity-20"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="cyber-grid"
              width="60"
              height="60"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 60 0 L 0 0 0 60"
                fill="none"
                stroke="rgba(255, 255, 255, 0.15)"
                strokeWidth="0.8"
              />
              <circle cx="60" cy="0" r="1.5" fill="#E61E2A" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cyber-grid)" />

          {/* Central Structural X-Frames matching the original reference poster */}
          <g stroke="rgba(255,255,255,0.22)" strokeWidth="1" fill="none">
            <rect x="330" y="640" width="240" height="220" />
            <line x1="330" y1="640" x2="570" y2="860" />
            <line x1="570" y1="640" x2="330" y2="860" />
            <rect x="940" y="420" width="210" height="210" />
            <line x1="940" y1="420" x2="1150" y2="630" />
            <line x1="1150" y1="420" x2="940" y2="630" />
          </g>

          {/* Central Alignment Cross & Flight Vector Circles */}
          <circle
            cx="720"
            cy="450"
            r="380"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1.2"
            strokeDasharray="8 12"
            fill="none"
          />
          <circle
            cx="720"
            cy="450"
            r="220"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
            fill="none"
          />
          <line
            x1="720"
            y1="40"
            x2="720"
            y2="860"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="0.8"
            strokeDasharray="4 6"
          />
          <line
            x1="80"
            y1="450"
            x2="1360"
            y2="450"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="0.8"
            strokeDasharray="4 6"
          />
        </svg>

        {/* Top-Right Corner Reference Graphic: Iconic Crimson Triad Glyph & Radar Reticle */}
        <div className="absolute top-5 right-6 flex items-center gap-3 md:top-7 md:right-8 lg:right-10">
          <div className="hidden sm:block">
            <MechanicalReticle className="h-20 w-20 lg:h-24 lg:w-24" />
          </div>
          <CrimsonTriadGlyph className="h-16 w-16 md:h-20 md:w-20 shrink-0" />
        </div>

        {/* Redesigned Architectural Hero Typography (Sits behind upper wings) */}
        <div className="absolute inset-x-0 top-[2.5%] sm:top-[4%] flex flex-col items-center text-center px-2">
          <div className="mb-1.5 flex flex-wrap justify-center items-center gap-1.5 sm:gap-3 font-mono text-[8px] sm:text-[11px] tracking-[0.16em] sm:tracking-[0.28em] text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-[#E61E2A] animate-led-blink" />
              SYNAPSE-BIOKINETIC
            </span>
            <span className="text-slate-500">·</span>
            <span className="font-semibold text-white">MK-09 FLIGHT ARCHITECTURE</span>
            <span className="text-slate-500 hidden xs:inline">·</span>
            <span className="text-slate-400 hidden xs:inline">CHASSIS 0621-RN</span>
          </div>

          <h1
            className="font-display font-black tracking-[-0.02em] select-none uppercase"
            style={{ fontFamily: '"Archivo", "Chakra Petch", sans-serif' }}
          >
            <div className="flex items-center justify-center gap-1.5 sm:gap-4">
              <span className="bg-gradient-to-b from-white via-[#D4DAE2] to-[#8C95A2] bg-clip-text text-[clamp(2.1rem,6.8vw,6.4rem)] leading-none text-transparent">
                VECTOR
              </span>
              <span className="text-[#E61E2A] text-[clamp(1.8rem,5.6vw,5.2rem)] font-light">
                //
              </span>
              <span className="bg-gradient-to-b from-[#C4CCD6] via-[#9AA3B0] to-[#5D6572] bg-clip-text text-[clamp(2.1rem,6.8vw,6.4rem)] leading-none text-transparent">
                SYNAPSE
              </span>
            </div>
          </h1>

          <div className="mt-1.5 sm:mt-2.5 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 font-mono text-[7.5px] tracking-wider text-slate-400 sm:text-[9.5px]">
            <span className="border border-white/15 bg-white/5 px-2 py-0.5 text-white">
              AUTONOMOUS MORPHING EXOSKELETON
            </span>
            <span className="border border-[#E61E2A]/40 bg-[#E61E2A]/10 px-2 py-0.5 text-[#FF4D58]">
              PLASMA CORE // 23.4 MW
            </span>
            <span className="hidden border border-white/15 bg-white/5 px-2 py-0.5 text-slate-300 md:inline-block">
              PIPELINE: {rendererLabel}
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          LAYER 20 (FOREGROUND EDITORIAL TELEMETRY, REFERENCE POSTER GRAPHICS & DATA):
          Non-blocking overlay around the 3D butterfly
         ===================================================================== */}
      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden select-none">
        {/* Top-Left: Reference Poster Wireframe Node Box & Editorial Badges */}
        <div className="absolute top-6 left-6 hidden sm:block md:top-8 md:left-9">
          <div className="relative w-36 md:w-44">
            <WireframeNodeBox rows={2} className="w-full" />
            <div className="absolute inset-0 flex flex-col justify-between p-3 text-[10px] leading-tight tracking-wider text-slate-200">
              <div>
                <div className="font-mono text-xs font-semibold tracking-widest text-white">
                  //SYS-ACTIVE
                </div>
                <div className="mt-2.5 font-mono text-[8px] text-slate-400">
                  MORPH-CYCLE:
                  <br />
                  COMPLETE
                </div>
                <div className="mt-2 font-mono text-[8px] text-slate-400">
                  MATERIAL: NANO-
                  <br />
                  CARBON WEAVE
                </div>
              </div>
              <div className="space-y-2 pb-1">
                <div className="font-display text-[11px] leading-none font-semibold tracking-wider text-white">
                  KINETIC
                  <br />
                  ARCHITECTURE
                </div>
                <div className="text-right font-display text-[11px] leading-none font-semibold tracking-wider text-slate-200">
                  BIOMIMETIC
                  <br />
                  PROTOCOL
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Left Flank: Paired Red Square Dots, Live Diagnostic Log & Server Cluster */}
        <div className="absolute top-[32%] left-6 hidden max-w-[260px] flex-col gap-2.5 lg:flex xl:left-9">
          {/* Reference Poster Paired Crimson Square Dots */}
          <div className="flex flex-col gap-1.5">
            <span className="h-2.5 w-2.5 bg-[#E61E2A]" />
            <span className="h-2.5 w-2.5 bg-[#E61E2A]" />
          </div>

          {/* Mainframe Server Cluster Monitor */}
          <ServerClusterMonitor />

          {/* Streaming Live Terminal Logs with Typewriter/Appearing text */}
          <AppearingTerminalStream />
        </div>

        {/* Right Flank: Paired Red Squares, Live Oscilloscope Waveform & Flight Metrics */}
        <div className="absolute top-[26%] right-6 hidden max-w-[260px] flex-col gap-2.5 lg:flex xl:right-9">
          {/* Reference Poster Flank Header */}
          <div className="flex justify-between items-center font-mono text-[9px] tracking-widest text-slate-400 border-b border-white/10 pb-1">
            <span>PRTCL-X</span>
            <span className="text-white">OBSIDIAN-9</span>
          </div>

          <div className="flex justify-between font-display text-xs font-semibold tracking-wider text-slate-200">
            <div>THEORETICAL FORM</div>
            <div className="text-right text-[#FF4D58]">TACTICAL FUNCTION</div>
          </div>

          {/* Reference Poster Paired Crimson Square Dots */}
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 bg-[#E61E2A]" />
            <span className="h-2.5 w-2.5 bg-[#E61E2A]" />
            <span className="font-display text-[10px] font-bold text-white tracking-widest">
              SYNAPSE-LINKED CHASSIS
            </span>
          </div>

          {/* Live Kinematic Harmonic Waveform & Equalizer */}
          <KinematicOscilloscope
            telemetry={telemetry}
            controlState={controlState}
          />

          {/* Aerodynamic Flight Vector Spec Sheet */}
          <div className="space-y-1.5 border border-white/10 bg-[#101114]/80 p-2.5 font-mono text-[8.5px] leading-relaxed text-slate-300 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/10 pb-1 text-[9px] tracking-wider text-slate-400">
              <span className="font-bold text-white">AERO SPECIFICATIONS</span>
              <span className="text-[#E61E2A]">CLASS-IX</span>
            </div>

            <div className="space-y-1 text-[8px]">
              <div className="flex justify-between">
                <span className="text-slate-400">WINGSPAN:</span>
                <span className="font-semibold text-white">1.40 METERS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">CHASSIS MASS:</span>
                <span className="font-semibold text-white">12.60 KG</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ARMOR BEZEL:</span>
                <span className="text-slate-200">SLATE TITANIUM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ARMOR PLATING:</span>
                <span className="text-slate-200">D-42 CERAMIC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">POWER CORE:</span>
                <span className="text-[#FF4D58]">SYNTHETIC PLASMA</span>
              </div>
            </div>

            <p className="border-t border-white/10 pt-1 text-[7.5px] leading-normal text-slate-400">
              NATURE&apos;S BLUEPRINT, WEAPONIZED. DYNAMIC VARIABLE GEOMETRY FORCES
              THE ENVIRONMENT TO ADAPT TO IT.
            </p>
          </div>
        </div>

        {/* Desktop Bottom-Left Flank: Interactive Avionics Vector Hub & Reference Poster Triad/X-Box */}
        <div className="hidden sm:flex absolute bottom-5 left-6 items-end gap-3 xl:left-9 z-30">
          <AvionicsVectorHub
            frequencyHz={telemetry.frequencyHz}
            velocityMs={telemetry.wingtipVelocityMs}
            plasmaMw={telemetry.plasmaOutputMw}
          />

          {/* Reference Poster Graphic Cues: Bottom-Left Crimson Triad Glyph & Wireframe X-Box */}
          <div className="hidden 2xl:flex flex-col gap-1.5 pb-1">
            <CrimsonTriadGlyph className="h-11 w-11 shrink-0" />
            <div className="flex items-center gap-1.5">
              <span
                className="font-mono text-[7px] tracking-widest text-slate-400"
                style={{
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                }}
              >
                0621-RN ENHANCED
              </span>
              <svg viewBox="0 0 88 44" className="h-6 w-12" fill="none" aria-hidden="true">
                <rect x="2" y="2" width="84" height="40" stroke="white" strokeWidth="1.5" />
                <line x1="44" y1="2" x2="44" y2="42" stroke="white" strokeWidth="1.5" />
                <line x1="2" y1="2" x2="44" y2="42" stroke="white" strokeWidth="1" />
                <line x1="44" y1="2" x2="2" y2="42" stroke="white" strokeWidth="1" />
                <line x1="44" y1="2" x2="86" y2="42" stroke="white" strokeWidth="1" />
                <line x1="86" y1="2" x2="44" y2="42" stroke="white" strokeWidth="1" />
              </svg>
            </div>
          </div>
        </div>

        {/* Bottom Center: Reference Poster Editorial Micro-Text */}
        <div className="absolute bottom-3 inset-x-0 hidden md:flex justify-center pointer-events-none">
          <p className="max-w-[560px] text-center font-mono text-[7.5px] leading-tight tracking-wider text-slate-500 uppercase">
            CONSTRUCTED FROM SELF-HEALING CARBON-ALLOY NANITES, THE 0621-RN SERIES
            BYPASSES TRADITIONAL MECHANICAL LIMITATIONS BY UTILIZING A DECENTRALIZED
            NEURAL MESH.
          </p>
        </div>

        {/* Right Side: Bold Iconic "ENHANCED MODEL" Display Headline (responsive positioning & typography) */}
        <div className="absolute right-4 top-[24%] sm:top-auto sm:right-[10%] lg:right-[13%] sm:bottom-[22%] text-right sm:text-left select-none z-20">
          <h2
            className="font-display text-[clamp(1.5rem,5.5vw,2.4rem)] sm:text-[clamp(2.1rem,4.4vw,3.9rem)] leading-[0.88] font-black tracking-tight text-white drop-shadow-[0_8px_32px_rgba(0,0,0,0.95)] uppercase"
            style={{ fontFamily: '"Archivo", sans-serif' }}
          >
            ENHANCED
            <br />
            MODEL
          </h2>
          <div className="mt-1 font-display text-[8px] sm:text-[10px] font-semibold tracking-[0.22em] text-slate-300">
            FAIL-SAFE. ADAPT. SURVIVE.
          </div>
        </div>

        {/* Desktop Bottom-Right Flank: Reference Wireframe Node Box & Live Telemetry Feed */}
        <div className="hidden sm:flex absolute right-6 bottom-5 items-end gap-3 xl:right-9 z-30">
          {/* Reference Poster Beyond Biology Wireframe Node Box */}
          <div className="hidden xl:block relative w-32">
            <WireframeNodeBox rows={1} className="w-full" />
            <div className="absolute inset-0 flex flex-col justify-between p-2 font-display text-[9px] leading-tight font-medium tracking-wider text-slate-200">
              <div>
                BEYOND BIOLOGY
                <br />
                <span className="font-mono text-[7.5px] text-slate-400">
                  ITERATION // 09.4
                </span>
              </div>
              <div className="text-right text-[8.5px]">
                AERO-DYNAMIC
                <br />
                <span className="text-[#E61E2A]">OVERRIDE</span>
              </div>
            </div>
          </div>

          {/* Real-Time Dynamic Kinematic Telemetry HUD */}
          <div className="border border-white/10 bg-[#101114]/85 p-3 backdrop-blur-md min-w-[210px]">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5 font-mono text-[9px] tracking-widest text-slate-400">
              <span className="flex items-center gap-1.5 text-white">
                <span className="h-1.5 w-1.5 bg-[#E61E2A] animate-ping" />
                TELEMETRY FEED
              </span>
              <span className="text-[#E61E2A] font-bold">LIVE</span>
            </div>

            <div className="mt-2 space-y-1.5 font-mono text-[9px] tabular-nums">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">FLAP FREQUENCY:</span>
                <span className="font-bold text-white" data-testid="telemetry-freq">
                  {telemetry.frequencyHz.toFixed(2)} HZ
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">WINGTIP VELOCITY:</span>
                <span className="font-bold text-white" data-testid="telemetry-velocity">
                  {telemetry.wingtipVelocityMs.toFixed(2)} M/S
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">PLASMA CORE OUTPUT:</span>
                <span className="font-bold text-[#FF4D58]" data-testid="telemetry-plasma">
                  {telemetry.plasmaOutputMw.toFixed(1)} MW
                </span>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2 font-mono text-[8px] text-slate-400">
              <span>DRAG MOUSE TO ORBIT</span>
              <span className="text-slate-300">· SPACE TO PAUSE</span>
            </div>
          </div>
        </div>

        {/* Mobile Screen Responsive Unified Bottom HUD (screens < 640px) */}
        <div className="sm:hidden pointer-events-auto absolute bottom-3 inset-x-3 z-30 flex flex-col items-center select-none">
          {/* Mode Switcher Tabs */}
          <div className="mb-1.5 flex items-center gap-1 border border-white/10 bg-[#101114]/90 p-1 backdrop-blur-md">
            <button
              onClick={() => setMobileTab('HUB')}
              className={`cursor-pointer px-2.5 py-1 font-mono text-[8px] font-bold tracking-wider transition-colors ${
                mobileTab === 'HUB'
                  ? 'bg-white text-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              [VECTOR HUB]
            </button>
            <button
              onClick={() => setMobileTab('TELEMETRY')}
              className={`cursor-pointer px-2.5 py-1 font-mono text-[8px] font-bold tracking-wider transition-colors ${
                mobileTab === 'TELEMETRY'
                  ? 'bg-[#E61E2A] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              [TELEMETRY]
            </button>
            <button
              onClick={() => setMobileTab(mobileTab === 'MIN' ? 'HUB' : 'MIN')}
              className="cursor-pointer px-2 py-1 font-mono text-[8px] text-slate-400 hover:text-white"
              title="Toggle HUD"
            >
              {mobileTab === 'MIN' ? '▴ EXPAND' : '▾ HIDE'}
            </button>
          </div>

          {mobileTab === 'HUB' && (
            <div className="w-full max-w-[340px]">
              <AvionicsVectorHub
                frequencyHz={telemetry.frequencyHz}
                velocityMs={telemetry.wingtipVelocityMs}
                plasmaMw={telemetry.plasmaOutputMw}
              />
            </div>
          )}

          {mobileTab === 'TELEMETRY' && (
            <div className="w-full max-w-[340px] border border-white/10 bg-[#101114]/95 p-3 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-white/10 pb-1.5 font-mono text-[9px] tracking-widest text-slate-400">
                <span className="flex items-center gap-1.5 text-white">
                  <span className="h-1.5 w-1.5 bg-[#E61E2A] animate-ping" />
                  TELEMETRY FEED
                </span>
                <span className="text-[#E61E2A] font-bold">LIVE</span>
              </div>

              <div className="mt-2 space-y-1.5 font-mono text-[9px] tabular-nums">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">FLAP FREQUENCY:</span>
                  <span className="font-bold text-white">
                    {telemetry.frequencyHz.toFixed(2)} HZ
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">WINGTIP VELOCITY:</span>
                  <span className="font-bold text-white">
                    {telemetry.wingtipVelocityMs.toFixed(2)} M/S
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">PLASMA CORE OUTPUT:</span>
                  <span className="font-bold text-[#FF4D58]">
                    {telemetry.plasmaOutputMw.toFixed(1)} MW
                  </span>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-1.5 font-mono text-[7.5px] text-slate-400">
                <span>TOUCH &amp; DRAG TO ORBIT</span>
                <span className="text-slate-300">· PINCH TO ZOOM</span>
              </div>
            </div>
          )}

          {mobileTab === 'MIN' && (
            <div className="flex w-full max-w-[340px] items-center justify-between border border-white/10 bg-[#101114]/90 px-3 py-1.5 font-mono text-[8.5px] text-slate-300 shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#E61E2A] animate-led-blink" />
                <span className="font-bold text-white">0621-RN</span>
                <span className="text-slate-500">·</span>
                <span>{telemetry.frequencyHz.toFixed(2)} HZ</span>
                <span className="text-slate-500">·</span>
                <span className="text-[#FF4D58]">{telemetry.plasmaOutputMw.toFixed(1)} MW</span>
              </div>
              <button
                onClick={() => setMobileTab('HUB')}
                className="text-[8px] text-slate-400 hover:text-white cursor-pointer"
              >
                OPEN HUD
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
