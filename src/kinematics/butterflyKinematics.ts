/**
 * Pure kinematic, aerodynamic, and rotation math for the 0621-RN Mechanical Butterfly.
 * Decoupled from Three.js DOM rendering for deterministic testing and zero-GC frame updates.
 */

export type FlightPresetId = 'hover' | 'cruise' | 'hypermorph' | 'glide';
export type CameraPresetId = 'poster' | 'isometric' | 'dorsal' | 'profile';
export type ShaderModeId = 'ceramic' | 'synapse' | 'thermal' | 'wireframe';

export interface ButterflyControlState {
  flapSpeed: number; // 0.0 to 3.0 multiplier (1.0 = 1.35 Hz base biomimetic cycle)
  isPlaying: boolean;
  morphExpansion: number; // 0.0 to 1.0 (armor plate separation)
  rotationXDeg: number; // Pitch (-90 to +90)
  rotationYDeg: number; // Yaw (-180 to +180)
  rotationZDeg: number; // Roll (-90 to +90)
  autoRotate: boolean;
  autoRotateSpeed: number; // deg/sec
  wingAmplitude: number; // 0.2 to 1.5 multiplier
  phaseLag: number; // Forewing-to-hindwing phase offset in radians (default ~0.48)
  shaderMode: ShaderModeId;
  cameraPreset: CameraPresetId;
  showPosterOverlay: boolean;
  dockCollapsed: boolean;
}

export interface WingKinematicsFrame {
  /** Normalized cycle progress 0..1 */
  cycleProgress: number;
  /** Forewing flap angle around Z/hinge axis in radians (positive = upstroke, negative = downstroke) */
  forewingFlapRad: number;
  /** Hindwing flap angle around Z/hinge axis in radians */
  hindwingFlapRad: number;
  /** Forewing feathering pitch angle around X axis in radians */
  forewingPitchRad: number;
  /** Hindwing feathering pitch angle around X axis in radians */
  hindwingPitchRad: number;
  /** Forewing sweep angle in wing plane (Y axis) in radians */
  forewingSweepRad: number;
  /** Armor sub-plate radial slide offset (0..1 normalized) */
  armorPlateSlide: number;
  /** Armor sub-plate tilt angle in radians */
  armorPlateTiltRad: number;
  /** Hydraulic piston extension normalized 0..1 */
  pistonExtension: number;
  /** Thorax vertical recoil offset in scene units */
  thoraxBobY: number;
  /** Thorax pitch oscillation in radians */
  thoraxPitchRad: number;
  /** Abdomen segment curl angle in radians */
  abdomenCurlRad: number;
  /** Antennae harmonic sway in radians */
  antennaSwayRad: number;
  /** Internal thoracic turbine/gear rotation angle in radians */
  gearRotationRad: number;
  /** Leading/trailing edge aero-flap deflection in radians */
  aeroFlapDeflectionRad: number;
  /** Tail caliper pincer spread angle in radians */
  tailCaliperSpreadRad: number;
  /** Bionic mandible micro-articulation in radians */
  mandibleFlexRad: number;
  /** Plasma core pulse intensity (0.5..1.5) */
  plasmaIntensity: number;
  /** Real-time calculated telemetry */
  telemetry: {
    frequencyHz: number;
    strokeAngleDeg: number;
    wingtipVelocityMs: number;
    plasmaOutputMw: number;
    synapseSyncPct: number;
    currentStrokeAngleDeg: number;
    kinematicPhaseRad: number;
    normalizedFlap: number;
    isPlaying: boolean;
  };
}

export const DEFAULT_CONTROL_STATE: ButterflyControlState = {
  flapSpeed: 1.0,
  isPlaying: true,
  morphExpansion: 0.06,
  rotationXDeg: 0,
  rotationYDeg: 0,
  rotationZDeg: 0,
  autoRotate: false,
  autoRotateSpeed: 18,
  wingAmplitude: 1.0,
  phaseLag: 0.52,
  shaderMode: 'ceramic',
  cameraPreset: 'poster',
  showPosterOverlay: true,
  dockCollapsed: false,
};

export const FLIGHT_PRESETS: Record<
  FlightPresetId,
  {
    label: string;
    flapSpeed: number;
    wingAmplitude: number;
    morphExpansion: number;
    phaseLag: number;
  }
> = {
  hover: {
    label: 'Hover Protocol',
    flapSpeed: 1.0,
    wingAmplitude: 1.0,
    morphExpansion: 0.06,
    phaseLag: 0.52,
  },
  cruise: {
    label: 'Tactical Cruise',
    flapSpeed: 1.65,
    wingAmplitude: 1.15,
    morphExpansion: 0.35,
    phaseLag: 0.64,
  },
  hypermorph: {
    label: 'Hyper-Morph Override',
    flapSpeed: 2.4,
    wingAmplitude: 1.3,
    morphExpansion: 0.82,
    phaseLag: 0.78,
  },
  glide: {
    label: 'Stealth Glide',
    flapSpeed: 0.25,
    wingAmplitude: 0.45,
    morphExpansion: 0.02,
    phaseLag: 0.3,
  },
};

export const CAMERA_PRESETS: Record<
  CameraPresetId,
  {
    label: string;
    position: [number, number, number];
    target: [number, number, number];
    rotationDeg: [number, number, number];
  }
> = {
  poster: {
    label: 'Poster Ortho',
    position: [0, 0.15, 8.35],
    target: [0, 0.05, 0],
    rotationDeg: [0, 0, 0],
  },
  isometric: {
    label: 'Isometric Tactical',
    position: [4.2, 2.3, 6.4],
    target: [0, 0.08, 0],
    rotationDeg: [-16, 28, -5],
  },
  dorsal: {
    label: 'Core Close-Up',
    position: [0, -0.02, 3.25],
    target: [0, -0.06, 0.08],
    rotationDeg: [4, 0, 0],
  },
  profile: {
    label: 'Side Aero Profile',
    position: [6.8, 0.6, 2.4],
    target: [0, 0.1, 0],
    rotationDeg: [5, -62, 0],
  },
};

const BASE_FREQUENCY_HZ = 1.25;
const TWO_PI = Math.PI * 2;

/**
 * Advances the wingbeat phase cleanly without discontinuities when speed changes.
 */
export function advancePhase(
  currentPhaseRad: number,
  deltaSeconds: number,
  flapSpeed: number,
  isPlaying: boolean
): number {
  if (!isPlaying || flapSpeed <= 0 || deltaSeconds <= 0) {
    return currentPhaseRad;
  }
  const clampedDelta = Math.min(deltaSeconds, 0.1);
  const angularVelocity = flapSpeed * BASE_FREQUENCY_HZ * TWO_PI;
  return (currentPhaseRad + angularVelocity * clampedDelta) % (TWO_PI * 1000);
}

/**
 * Frame-rate independent exponential damping.
 */
export function dampValue(
  current: number,
  target: number,
  lambda: number,
  deltaSeconds: number
): number {
  if (deltaSeconds <= 0) return current;
  const t = 1 - Math.exp(-lambda * Math.min(deltaSeconds, 0.1));
  return current + (target - current) * t;
}

/**
 * Clamps rotation degrees into a valid range.
 */
export function clampAngleDeg(deg: number, min: number, max: number): number {
  if (Number.isNaN(deg)) return 0;
  return Math.max(min, Math.min(max, deg));
}

/**
 * Wraps yaw angle into [-180, 180] degrees.
 */
export function wrapYawDeg(deg: number): number {
  if (Number.isNaN(deg)) return 0;
  let wrapped = ((deg + 180) % 360 + 360) % 360 - 180;
  if (wrapped === -180 && deg > 0) wrapped = 180;
  return Math.round(wrapped * 10) / 10;
}

/**
 * Computes the complete kinematic pose of the mechanical butterfly at a given phase.
 */
export function computeWingKinematics(
  phaseRad: number,
  state: Pick<
    ButterflyControlState,
    'flapSpeed' | 'isPlaying' | 'morphExpansion' | 'wingAmplitude' | 'phaseLag'
  >
): WingKinematicsFrame {
  const amp = Math.max(0, Math.min(1.6, state.wingAmplitude));
  const morph = Math.max(0, Math.min(1, state.morphExpansion));
  const effectiveSpeed = state.isPlaying ? Math.max(0, state.flapSpeed) : 0;

  // Asymmetric biomimetic stroke wave: sharp downstroke, smooth feathered recovery
  const primaryWave = Math.sin(phaseRad) - 0.18 * Math.sin(2 * phaseRad);
  const hindPhase = phaseRad - state.phaseLag;
  const secondaryWave = Math.sin(hindPhase) - 0.15 * Math.sin(2 * hindPhase);

  // Max flap amplitude (~38 deg upstroke, ~32 deg downstroke at amp=1.0)
  const baseMaxFlapRad = 0.56 * amp;
  const forewingFlapRad = primaryWave * baseMaxFlapRad;
  const hindwingFlapRad = secondaryWave * (baseMaxFlapRad * 0.88);

  // Feathering pitch (wings twist along leading edge during stroke velocity peaks)
  const strokeVelocity = Math.cos(phaseRad);
  const hindVelocity = Math.cos(hindPhase);
  const forewingPitchRad = strokeVelocity * 0.19 * amp;
  const hindwingPitchRad = hindVelocity * 0.22 * amp;

  // Subtle forward/aft wing sweep in the dorsal plane
  const forewingSweepRad = Math.cos(phaseRad) * 0.045 * amp + morph * 0.06;

  // Kinetic armor plate morphing: combines user's manual morphExpansion with dynamic peak-stroke flex
  const dynamicFlex = Math.pow(Math.abs(Math.sin(phaseRad * 0.5)), 1.5) * 0.14 * amp * Math.min(1, effectiveSpeed);
  const armorPlateSlide = Math.min(1, morph * 0.86 + dynamicFlex);
  const armorPlateTiltRad = armorPlateSlide * 0.22 + Math.sin(phaseRad) * 0.04 * morph;

  // Hydraulic piston extension tracks wing elevation + morph expansion
  const pistonExtension = Math.max(
    0,
    Math.min(1, 0.5 + primaryWave * 0.35 + morph * 0.15)
  );

  // Counter-recoil of central thorax & segmented abdomen
  const thoraxBobY = -Math.sin(phaseRad) * 0.08 * amp;
  const thoraxPitchRad = Math.cos(phaseRad) * 0.055 * amp;
  const abdomenCurlRad = Math.sin(phaseRad - 0.85) * 0.11 * amp + morph * 0.08;
  const antennaSwayRad =
    Math.sin(phaseRad * 2.0 + 0.4) * 0.045 * (0.4 + effectiveSpeed * 0.6);

  // Mechanical sub-assemblies: escapement gears, aero-slat flaps, tail calipers, and mandibles
  const gearRotationRad = phaseRad * 2.5 + morph * Math.PI * 1.2;
  const aeroFlapDeflectionRad =
    -strokeVelocity * 0.28 * amp + morph * 0.32;
  const tailCaliperSpreadRad =
    0.08 + Math.abs(Math.sin(phaseRad)) * 0.14 * amp + morph * 0.28;
  const mandibleFlexRad =
    0.05 + Math.sin(phaseRad * 2.0) * 0.04 + morph * 0.12;

  // Plasma core pulse
  const plasmaIntensity =
    0.85 +
    0.25 * Math.sin(phaseRad * 2.0) +
    0.35 * morph +
    0.15 * Math.min(2, effectiveSpeed);

  // Real-time telemetry metrics
  const frequencyHz = Number((effectiveSpeed * BASE_FREQUENCY_HZ).toFixed(2));
  const strokeAngleDeg = Number(
    ((baseMaxFlapRad * 2 * 180) / Math.PI).toFixed(1)
  );
  // Wingtip radius is 0.7m (1.4m wingspan in poster spec)
  const wingtipVelocityMs = Number(
    (0.7 * frequencyHz * TWO_PI * baseMaxFlapRad).toFixed(2)
  );
  const plasmaOutputMw = Number(
    (14.2 + effectiveSpeed * 8.4 + morph * 11.6).toFixed(1)
  );
  const synapseSyncPct = Number(
    Math.min(
      99.9,
      94.2 + morph * 5.2 + (effectiveSpeed > 0 ? 0.5 : 0)
    ).toFixed(1)
  );
  const currentStrokeAngleDeg = Number(
    ((forewingFlapRad * 180) / Math.PI).toFixed(1)
  );
  const kinematicPhaseRad = Number(phaseRad.toFixed(4));
  const normalizedFlap = Number(primaryWave.toFixed(3));
  const isPlaying = state.isPlaying && effectiveSpeed > 0;

  const cycleProgress = (((phaseRad % TWO_PI) + TWO_PI) % TWO_PI) / TWO_PI;

  return {
    cycleProgress,
    forewingFlapRad,
    hindwingFlapRad,
    forewingPitchRad,
    hindwingPitchRad,
    forewingSweepRad,
    armorPlateSlide,
    armorPlateTiltRad,
    pistonExtension,
    thoraxBobY,
    thoraxPitchRad,
    abdomenCurlRad,
    antennaSwayRad,
    gearRotationRad,
    aeroFlapDeflectionRad,
    tailCaliperSpreadRad,
    mandibleFlexRad,
    plasmaIntensity,
    telemetry: {
      frequencyHz,
      strokeAngleDeg,
      wingtipVelocityMs,
      plasmaOutputMw,
      synapseSyncPct,
      currentStrokeAngleDeg,
      kinematicPhaseRad,
      normalizedFlap,
      isPlaying,
    },
  };
}
