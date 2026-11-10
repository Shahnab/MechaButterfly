/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ButterflyViewport } from './components/ButterflyViewport';
import { PosterBackdrop } from './components/PosterBackdrop';
import {
  ButterflyControlState,
  clampAngleDeg,
  computeWingKinematics,
  DEFAULT_CONTROL_STATE,
  WingKinematicsFrame,
  wrapYawDeg,
} from './kinematics/butterflyKinematics';
import { detectGraphicsCapabilities } from './three/shaders';

export default function App() {
  const [controlState, setControlState] = useState<ButterflyControlState>(
    DEFAULT_CONTROL_STATE
  );

  const initialTelemetry = useMemo(
    () => computeWingKinematics(0.35, DEFAULT_CONTROL_STATE).telemetry,
    []
  );

  const [telemetry, setTelemetry] =
    useState<WingKinematicsFrame['telemetry']>(initialTelemetry);

  const graphicsCaps = useMemo(() => detectGraphicsCapabilities(), []);

  const handleAutoYawSync = useCallback((yawDeg: number) => {
    setControlState((prev) =>
      prev.autoRotate ? { ...prev, rotationYDeg: yawDeg } : prev
    );
  }, []);

  // Keyboard navigation for 3D rotation, speed, pause, and HUD visibility
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      switch (e.key) {
        case ' ':
          e.preventDefault();
          setControlState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
          break;
        case 'h':
        case 'H':
          setControlState((prev) => ({
            ...prev,
            dockCollapsed: !prev.dockCollapsed,
          }));
          break;
        case 'r':
        case 'R':
          setControlState(DEFAULT_CONTROL_STATE);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          setControlState((prev) => ({
            ...prev,
            rotationYDeg: wrapYawDeg(prev.rotationYDeg - 8),
            autoRotate: false,
          }));
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          setControlState((prev) => ({
            ...prev,
            rotationYDeg: wrapYawDeg(prev.rotationYDeg + 8),
            autoRotate: false,
          }));
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          setControlState((prev) => ({
            ...prev,
            rotationXDeg: clampAngleDeg(prev.rotationXDeg - 6, -85, 85),
            autoRotate: false,
          }));
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          setControlState((prev) => ({
            ...prev,
            rotationXDeg: clampAngleDeg(prev.rotationXDeg + 6, -85, 85),
            autoRotate: false,
          }));
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <main
      className="relative h-screen w-screen overflow-hidden bg-[#08090C] select-none"
      data-state={controlState.isPlaying ? 'flapping' : 'paused'}
      data-shader={controlState.shaderMode}
    >
      {/* Poster Background & Foreground Frame Layers */}
      <PosterBackdrop
        visible={controlState.showPosterOverlay}
        telemetry={telemetry}
        rendererLabel={graphicsCaps.rendererLabel}
        controlState={controlState}
      />

      {/* Interactive 3D Mechanical Butterfly Viewport */}
      <ButterflyViewport
        controlState={controlState}
        onTelemetryUpdate={setTelemetry}
        onAutoYawSync={handleAutoYawSync}
      />
    </main>
  );
}
