import {
  Pause,
  Play,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Orbit,
  Eye,
  Sliders,
  Layers,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { useState } from 'react';
import {
  ButterflyControlState,
  CAMERA_PRESETS,
  CameraPresetId,
  DEFAULT_CONTROL_STATE,
  FLIGHT_PRESETS,
  FlightPresetId,
  ShaderModeId,
  WingKinematicsFrame,
} from '../kinematics/butterflyKinematics';

interface ControlDockProps {
  state: ButterflyControlState;
  telemetry: WingKinematicsFrame['telemetry'];
  onChange: (patch: Partial<ButterflyControlState>) => void;
  onReset: () => void;
}

const SHADER_MODES: { id: ShaderModeId; label: string }[] = [
  { id: 'ceramic', label: 'Ceramic PBR' },
  { id: 'synapse', label: 'Synapse Pulse' },
  { id: 'thermal', label: 'Thermal Plasma' },
  { id: 'wireframe', label: 'Neural Mesh' },
];

export function ControlDock({
  state,
  telemetry,
  onChange,
  onReset,
}: ControlDockProps) {
  const [activeTab, setActiveTab] = useState<'kinematics' | 'rotation' | 'shaders'>(
    'kinematics'
  );
  const [showRefModal, setShowRefModal] = useState(false);

  const applyFlightPreset = (presetId: FlightPresetId) => {
    const preset = FLIGHT_PRESETS[presetId];
    onChange({
      flapSpeed: preset.flapSpeed,
      wingAmplitude: preset.wingAmplitude,
      morphExpansion: preset.morphExpansion,
      phaseLag: preset.phaseLag,
      isPlaying: true,
    });
  };

  const applyCameraPreset = (presetId: CameraPresetId) => {
    const preset = CAMERA_PRESETS[presetId];
    onChange({
      cameraPreset: presetId,
      rotationXDeg: preset.rotationDeg[0],
      rotationYDeg: preset.rotationDeg[1],
      rotationZDeg: preset.rotationDeg[2],
      autoRotate: false,
    });
  };

  return (
    <>
      {/* Optional Reference Poster Comparison Modal */}
      {showRefModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Original Reference Poster Comparison"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
        >
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col border border-white/20 bg-[#0D1016] p-5 text-white shadow-2xl">
            <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="font-display text-sm font-bold tracking-wider text-white">
                  0621-RN Poster Reference Specification
                </h2>
                <p className="font-mono text-[11px] text-slate-400">
                  Original mechanical butterfly concept artwork
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRefModal(false)}
                className="flex h-8 w-8 items-center justify-center border border-white/15 bg-white/5 text-slate-300 transition-colors hover:bg-white/15 hover:text-white"
                aria-label="Close Reference Modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto">
              <img
                src="/assets/aistudio/HWidtrHXQAApPpB_392d5cd3.jpg"
                alt="The Morphing Machine 0621-RN Reference Poster"
                referrerPolicy="no-referrer"
                className="mx-auto max-h-[72vh] w-auto border border-white/10 object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Unified Collapsible Bottom Control Dock (Zero Viewport Occlusion) */}
      <aside
        aria-label="Mechanical Butterfly Interactive Controls"
        className="fixed bottom-3 left-1/2 z-30 w-[94vw] max-w-[780px] -translate-x-1/2 transition-transform duration-200 ease-out"
      >
        {/* Top Drawer Handle Bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 border border-b-0 border-white/15 bg-[#0C0E13] px-3 py-1.5 font-mono text-[11px] whitespace-nowrap text-slate-300 tabular-nums">
            <span className="font-semibold text-white">0621-RN</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span>{telemetry.frequencyHz.toFixed(2)} Hz</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span>
              Rot ({Math.round(state.rotationXDeg)}°,{' '}
              {Math.round(state.rotationYDeg)}°,{' '}
              {Math.round(state.rotationZDeg)}°)
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-[#FF4D58]">
              Morph {Math.round(state.morphExpansion * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowRefModal(true)}
              className="flex items-center gap-1.5 border border-b-0 border-white/15 bg-[#0C0E13] px-3 py-1.5 font-mono text-[11px] font-medium whitespace-nowrap text-slate-300 transition-colors hover:bg-[#171B24] hover:text-white"
            >
              <ImageIcon className="h-3.5 w-3.5 text-[#E61E2A]" />
              <span>View Reference</span>
            </button>
            <button
              type="button"
              onClick={() =>
                onChange({ showPosterOverlay: !state.showPosterOverlay })
              }
              className="flex items-center gap-1.5 border border-b-0 border-white/15 bg-[#0C0E13] px-3 py-1.5 font-mono text-[11px] font-medium whitespace-nowrap text-slate-300 transition-colors hover:bg-[#171B24] hover:text-white"
            >
              <Eye className="h-3.5 w-3.5 text-slate-400" />
              <span>
                {state.showPosterOverlay ? 'Hide Poster Frame' : 'Show Poster Frame'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onChange({ dockCollapsed: !state.dockCollapsed })}
              className="flex items-center gap-1.5 border border-b-0 border-white/15 bg-[#0C0E13] px-3 py-1.5 font-mono text-[11px] font-medium whitespace-nowrap text-white transition-colors hover:bg-[#171B24]"
            >
              {state.dockCollapsed ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5 text-[#E61E2A]" />
                  <span>Show Controls</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5 text-[#E61E2A]" />
                  <span>Hide Controls</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Main Control Panel Body */}
        {!state.dockCollapsed && (
          <div className="border border-white/15 bg-[#0C0E13] p-3.5 text-slate-100 shadow-2xl">
            {/* Top Row: Primary Actions + Mode Tabs + Quick Presets */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
              {/* Transport & Reset */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onChange({ isPlaying: !state.isPlaying })}
                  className={`flex h-9 items-center gap-2 px-3.5 font-mono text-xs font-semibold whitespace-nowrap transition-colors ${
                    state.isPlaying
                      ? 'bg-[#E61E2A] text-white hover:bg-[#c81924]'
                      : 'border border-white/20 bg-[#171B24] text-white hover:bg-[#222836]'
                  }`}
                >
                  {state.isPlaying ? (
                    <>
                      <Pause className="h-3.5 w-3.5" />
                      <span>Pause Flap</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      <span>Resume Flap</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onChange({ autoRotate: !state.autoRotate })}
                  aria-pressed={state.autoRotate}
                  className={`flex h-9 items-center gap-1.5 border px-3 font-mono text-xs font-medium whitespace-nowrap transition-colors ${
                    state.autoRotate
                      ? 'border-[#E61E2A] bg-[#E61E2A]/20 text-white'
                      : 'border-white/15 bg-[#131720] text-slate-300 hover:text-white'
                  }`}
                >
                  <Orbit className="h-3.5 w-3.5" />
                  <span>Auto-Rotate</span>
                </button>

                <button
                  type="button"
                  onClick={onReset}
                  className="flex h-9 items-center gap-1.5 border border-white/15 bg-[#131720] px-3 font-mono text-xs font-medium whitespace-nowrap text-slate-300 transition-colors hover:bg-[#1B202C] hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Navigation Section Tabs */}
              <div
                role="tablist"
                aria-label="Control Categories"
                className="flex items-center gap-1 bg-[#141821] p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'kinematics'}
                  onClick={() => setActiveTab('kinematics')}
                  className={`flex items-center gap-1.5 px-3 py-1 font-mono text-xs font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'kinematics'
                      ? 'bg-white text-[#090A0D]'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span>Speed & Morph</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'rotation'}
                  onClick={() => setActiveTab('rotation')}
                  className={`flex items-center gap-1.5 px-3 py-1 font-mono text-xs font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'rotation'
                      ? 'bg-white text-[#090A0D]'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Orbit className="h-3.5 w-3.5" />
                  <span>3D Rotation & Camera</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'shaders'}
                  onClick={() => setActiveTab('shaders')}
                  className={`flex items-center gap-1.5 px-3 py-1 font-mono text-xs font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'shaders'
                      ? 'bg-white text-[#090A0D]'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Shaders & Presets</span>
                </button>
              </div>
            </div>

            {/* Tab 1: Flap Speed, Morph Expansion, and Rotational Yaw Quick Control */}
            {activeTab === 'kinematics' && (
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* 1. Flap Speed Multiplier */}
                <div className="flex flex-col justify-between border border-white/10 bg-[#12161F] p-2.5">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <label
                      htmlFor="slider-flap-speed"
                      className="font-medium text-slate-200"
                    >
                      Flap Speed
                    </label>
                    <span
                      className="font-semibold text-white tabular-nums"
                      data-testid="readout-flap-speed"
                    >
                      {state.flapSpeed.toFixed(2)}x ({telemetry.frequencyHz} Hz)
                    </span>
                  </div>
                  <input
                    id="slider-flap-speed"
                    type="range"
                    min="0"
                    max="3"
                    step="0.05"
                    value={state.flapSpeed}
                    onChange={(e) =>
                      onChange({
                        flapSpeed: parseFloat(e.target.value),
                        isPlaying: true,
                      })
                    }
                    className="mt-2 h-1.5 w-full cursor-pointer accent-[#E61E2A]"
                  />
                </div>

                {/* 2. Morph / Chassis Plate Expansion */}
                <div className="flex flex-col justify-between border border-white/10 bg-[#12161F] p-2.5">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <label
                      htmlFor="slider-morph-expansion"
                      className="font-medium text-slate-200"
                    >
                      Armor Morph
                    </label>
                    <span
                      className="font-semibold text-[#FF4D58] tabular-nums"
                      data-testid="readout-morph"
                    >
                      {Math.round(state.morphExpansion * 100)}%
                    </span>
                  </div>
                  <input
                    id="slider-morph-expansion"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={state.morphExpansion}
                    onChange={(e) =>
                      onChange({ morphExpansion: parseFloat(e.target.value) })
                    }
                    className="mt-2 h-1.5 w-full cursor-pointer accent-[#E61E2A]"
                  />
                </div>

                {/* 3. Direct Y-Axis Yaw Rotation Slider */}
                <div className="flex flex-col justify-between border border-white/10 bg-[#12161F] p-2.5">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <label
                      htmlFor="slider-yaw-quick"
                      className="font-medium text-slate-200"
                    >
                      Rotate Yaw (Y)
                    </label>
                    <span
                      className="font-semibold text-white tabular-nums"
                      data-testid="readout-yaw"
                    >
                      {Math.round(state.rotationYDeg)}°
                    </span>
                  </div>
                  <input
                    id="slider-yaw-quick"
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={state.rotationYDeg}
                    onChange={(e) =>
                      onChange({
                        rotationYDeg: parseFloat(e.target.value),
                        autoRotate: false,
                      })
                    }
                    className="mt-2 h-1.5 w-full cursor-pointer accent-[#E61E2A]"
                  />
                </div>

                {/* 4. Direct X-Axis Pitch Rotation Slider */}
                <div className="flex flex-col justify-between border border-white/10 bg-[#12161F] p-2.5">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <label
                      htmlFor="slider-pitch-quick"
                      className="font-medium text-slate-200"
                    >
                      Rotate Pitch (X)
                    </label>
                    <span
                      className="font-semibold text-white tabular-nums"
                      data-testid="readout-pitch"
                    >
                      {Math.round(state.rotationXDeg)}°
                    </span>
                  </div>
                  <input
                    id="slider-pitch-quick"
                    type="range"
                    min="-85"
                    max="85"
                    step="1"
                    value={state.rotationXDeg}
                    onChange={(e) =>
                      onChange({
                        rotationXDeg: parseFloat(e.target.value),
                        autoRotate: false,
                      })
                    }
                    className="mt-2 h-1.5 w-full cursor-pointer accent-[#E61E2A]"
                  />
                </div>
              </div>
            )}

            {/* Tab 2: Full 3-Axis Rotation (Pitch, Yaw, Roll) + Camera View Presets */}
            {activeTab === 'rotation' && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col justify-between border border-white/10 bg-[#12161F] p-2.5">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <label htmlFor="slider-rot-x" className="text-slate-200">
                      Pitch Axis (X)
                    </label>
                    <span className="font-semibold text-white tabular-nums">
                      {Math.round(state.rotationXDeg)}°
                    </span>
                  </div>
                  <input
                    id="slider-rot-x"
                    type="range"
                    min="-85"
                    max="85"
                    step="1"
                    value={state.rotationXDeg}
                    onChange={(e) =>
                      onChange({
                        rotationXDeg: parseFloat(e.target.value),
                        autoRotate: false,
                      })
                    }
                    className="mt-2 h-1.5 w-full cursor-pointer accent-[#E61E2A]"
                  />
                </div>

                <div className="flex flex-col justify-between border border-white/10 bg-[#12161F] p-2.5">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <label htmlFor="slider-rot-y" className="text-slate-200">
                      Yaw Axis (Y)
                    </label>
                    <span className="font-semibold text-white tabular-nums">
                      {Math.round(state.rotationYDeg)}°
                    </span>
                  </div>
                  <input
                    id="slider-rot-y"
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={state.rotationYDeg}
                    onChange={(e) =>
                      onChange({
                        rotationYDeg: parseFloat(e.target.value),
                        autoRotate: false,
                      })
                    }
                    className="mt-2 h-1.5 w-full cursor-pointer accent-[#E61E2A]"
                  />
                </div>

                <div className="flex flex-col justify-between border border-white/10 bg-[#12161F] p-2.5">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <label htmlFor="slider-rot-z" className="text-slate-200">
                      Roll Axis (Z)
                    </label>
                    <span className="font-semibold text-white tabular-nums">
                      {Math.round(state.rotationZDeg)}°
                    </span>
                  </div>
                  <input
                    id="slider-rot-z"
                    type="range"
                    min="-85"
                    max="85"
                    step="1"
                    value={state.rotationZDeg}
                    onChange={(e) =>
                      onChange({
                        rotationZDeg: parseFloat(e.target.value),
                        autoRotate: false,
                      })
                    }
                    className="mt-2 h-1.5 w-full cursor-pointer accent-[#E61E2A]"
                  />
                </div>

                {/* Camera Angle Presets */}
                <div className="flex flex-col justify-between border border-white/10 bg-[#12161F] p-2">
                  <span className="mb-1.5 font-mono text-[11px] text-slate-400">
                    Camera Views
                  </span>
                  <div className="grid grid-cols-2 gap-1">
                    {(Object.keys(CAMERA_PRESETS) as CameraPresetId[]).map(
                      (id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => applyCameraPreset(id)}
                          className={`px-2 py-1 font-mono text-[11px] font-medium whitespace-nowrap transition-colors ${
                            state.cameraPreset === id
                              ? 'bg-[#E61E2A] text-white'
                              : 'bg-[#1A202C] text-slate-300 hover:bg-[#252D3D] hover:text-white'
                          }`}
                        >
                          {CAMERA_PRESETS[id].label}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Shader Modes, Flight Presets, and Stroke Amplitude */}
            {activeTab === 'shaders' && (
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                {/* Custom GLSL Shader Pipeline Selector */}
                <div className="border border-white/10 bg-[#12161F] p-2.5">
                  <span className="mb-2 block font-mono text-[11px] text-slate-400">
                    Shader Pipeline Mode
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SHADER_MODES.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onChange({ shaderMode: m.id })}
                        className={`px-2.5 py-1.5 font-mono text-[11px] font-medium whitespace-nowrap transition-colors ${
                          state.shaderMode === m.id
                            ? 'bg-[#E61E2A] text-white'
                            : 'bg-[#1A202C] text-slate-300 hover:bg-[#252D3D] hover:text-white'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Biomimetic Flight Protocol Presets */}
                <div className="border border-white/10 bg-[#12161F] p-2.5">
                  <span className="mb-2 block font-mono text-[11px] text-slate-400">
                    Kinetic Flight Presets
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.keys(FLIGHT_PRESETS) as FlightPresetId[]).map(
                      (id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => applyFlightPreset(id)}
                          className="bg-[#1A202C] px-2.5 py-1.5 font-mono text-[11px] font-medium whitespace-nowrap text-slate-200 transition-colors hover:bg-[#E61E2A] hover:text-white"
                        >
                          {FLIGHT_PRESETS[id].label}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Wing Stroke Amplitude & Phase Lag */}
                <div className="flex flex-col justify-between border border-white/10 bg-[#12161F] p-2.5">
                  <div>
                    <div className="flex items-center justify-between font-mono text-xs">
                      <label
                        htmlFor="slider-wing-amplitude"
                        className="text-slate-200"
                      >
                        Wing Stroke Span
                      </label>
                      <span className="font-semibold text-white tabular-nums">
                        {Math.round(state.wingAmplitude * 100)}% (
                        {telemetry.strokeAngleDeg}°)
                      </span>
                    </div>
                    <input
                      id="slider-wing-amplitude"
                      type="range"
                      min="0.25"
                      max="1.5"
                      step="0.05"
                      value={state.wingAmplitude}
                      onChange={(e) =>
                        onChange({
                          wingAmplitude: parseFloat(e.target.value),
                        })
                      }
                      className="mt-1.5 h-1.5 w-full cursor-pointer accent-[#E61E2A]"
                    />
                  </div>

                  <div className="mt-2">
                    <div className="flex items-center justify-between font-mono text-xs">
                      <label
                        htmlFor="slider-phase-lag"
                        className="text-slate-200"
                      >
                        Hindwing Phase Lag
                      </label>
                      <span className="font-semibold text-white tabular-nums">
                        {state.phaseLag.toFixed(2)} rad
                      </span>
                    </div>
                    <input
                      id="slider-phase-lag"
                      type="range"
                      min="0"
                      max="1.2"
                      step="0.04"
                      value={state.phaseLag}
                      onChange={(e) =>
                        onChange({
                          phaseLag: parseFloat(e.target.value),
                        })
                      }
                      className="mt-1.5 h-1.5 w-full cursor-pointer accent-[#E61E2A]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}

export { DEFAULT_CONTROL_STATE };
