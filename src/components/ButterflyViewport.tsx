import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  advancePhase,
  ButterflyControlState,
  CAMERA_PRESETS,
  CameraPresetId,
  computeWingKinematics,
  dampValue,
  WingKinematicsFrame,
  wrapYawDeg,
} from '../kinematics/butterflyKinematics';
import { createButterflyTextures } from '../three/proceduralTextures';
import {
  ButterflyShaderUniforms,
  createNaniteParticleSystem,
  shaderModeToNumber,
} from '../three/shaders';
import { buildMechanicalButterfly } from '../three/buildMechanicalButterfly';

interface ButterflyViewportProps {
  controlState: ButterflyControlState;
  onTelemetryUpdate: (telemetry: WingKinematicsFrame['telemetry']) => void;
  onAutoYawSync?: (yawDeg: number) => void;
}

export function ButterflyViewport({
  controlState,
  onTelemetryUpdate,
  onAutoYawSync,
}: ButterflyViewportProps) {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<ButterflyControlState>(controlState);
  const telemetryCbRef = useRef(onTelemetryUpdate);
  const autoYawCbRef = useRef(onAutoYawSync);
  const prevPresetRef = useRef<CameraPresetId>(controlState.cameraPreset);
  const cameraTransitionActiveRef = useRef<boolean>(false);

  // Sync latest React props into mutable refs without re-mounting WebGL
  useEffect(() => {
    if (prevPresetRef.current !== controlState.cameraPreset) {
      prevPresetRef.current = controlState.cameraPreset;
      cameraTransitionActiveRef.current = true;
    }
    stateRef.current = controlState;
  }, [controlState]);

  useEffect(() => {
    telemetryCbRef.current = onTelemetryUpdate;
    autoYawCbRef.current = onAutoYawSync;
  }, [onTelemetryUpdate, onAutoYawSync]);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // 1. Detect software WebGL (SwiftShader / llvmpipe) from GPU renderer string
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Renderer with transparent alpha and preserveDrawingBuffer so software-WebGL afterDraw pauses preserve the frame
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.setAttribute('data-testid', 'butterfly-3d-canvas');
    container.appendChild(renderer.domElement);

    // 3. Scene & Studio Environment Map (RoomEnvironment + PMREMGenerator)
    const scene = new THREE.Scene();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    // 4. Camera & OrbitControls
    const isPortrait = width < height || width < 640;
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    const initialPreset = CAMERA_PRESETS[stateRef.current.cameraPreset];
    const camDistMult = isPortrait ? 1.32 : 1.0;
    camera.position.set(
      initialPreset.position[0],
      initialPreset.position[1],
      initialPreset.position[2] * camDistMult
    );

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...initialPreset.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 2.6;
    controls.maxDistance = 13.5;
    controls.maxPolarAngle = Math.PI * 0.88;
    controls.minPolarAngle = Math.PI * 0.12;
    controls.update();

    const onControlStart = () => {
      cameraTransitionActiveRef.current = false;
    };
    controls.addEventListener('start', onControlStart);

    // 5. Neutral Studio Lighting Rig matching the exact color tone of the reference poster
    const hemiLight = new THREE.HemisphereLight(0xf0f2f5, 0x101114, 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.95);
    keyLight.position.set(4.2, 6.4, 5.2);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 18;
      const d = 4.2;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdce0e6, 1.1);
    fillLight.position.set(-5.5, 3.2, 4.2);
    scene.add(fillLight);

    const bodySpecLight = new THREE.DirectionalLight(0xffffff, 1.35);
    bodySpecLight.position.set(0.3, 5.2, 4.4);
    scene.add(bodySpecLight);

    const rimLight = new THREE.DirectionalLight(0xc8cdd6, 0.95);
    rimLight.position.set(0, -4.5, -4.0);
    scene.add(rimLight);

    // Opposite-Side (Ventral) Studio Lighting Rig
    const backKeyLight = new THREE.DirectionalLight(0xf2f4f8, 1.7);
    backKeyLight.position.set(3.2, 5.0, -5.5);
    scene.add(backKeyLight);

    const backFillLight = new THREE.DirectionalLight(0xdce0e8, 1.15);
    backFillLight.position.set(-4.5, -2.5, -4.5);
    scene.add(backFillLight);

    // 6. Procedural Textures, Custom Shaders, and 0621-RN Mechanical Butterfly Model
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const textures = createButterflyTextures(maxAnisotropy);

    const sharedUniforms: ButterflyShaderUniforms = {
      uTime: { value: 0 },
      uMorphFactor: { value: stateRef.current.morphExpansion },
      uFlapIntensity: { value: stateRef.current.flapSpeed },
      uShaderMode: { value: shaderModeToNumber(stateRef.current.shaderMode) },
      uPlasmaPulse: { value: 1.0 },
    };

    const butterflyRig = buildMechanicalButterfly(textures, sharedUniforms);
    // Position butterfly so upper wings frame "THE MORPHING MACHINE" and lower wings frame "0621-RN"
    butterflyRig.root.position.set(0, 0.22, 0);
    scene.add(butterflyRig.root);

    // Add GPU Nanite Particle System around the butterfly
    const naniteParticles = createNaniteParticleSystem(sharedUniforms);
    scene.add(naniteParticles);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 7. Resize Handler (immediately re-renders so resizing never leaves a cleared buffer)
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    };
    window.addEventListener('resize', handleResize);

    // 8. Animation Loop with Software-WebGL `afterDraw` Pacing
    let frameId = 0;
    let isDisposed = false;
    let lastTimeMs = performance.now();
    let elapsedTime = 0;
    let currentPhase = 0.35; // Initial aesthetic wing pose matching poster
    let lastTelemetryPushMs = 0;

    // Damped transform state
    let dampedRotX = THREE.MathUtils.degToRad(stateRef.current.rotationXDeg);
    let dampedRotY = THREE.MathUtils.degToRad(stateRef.current.rotationYDeg);
    let dampedRotZ = THREE.MathUtils.degToRad(stateRef.current.rotationZDeg);
    let dampedMorph = stateRef.current.morphExpansion;
    let autoYawAccumulatorDeg = stateRef.current.rotationYDeg;

    function afterDraw(cb: () => void) {
      if (isDisposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (isDisposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (isDisposed) return;

      const nowMs = performance.now();
      const dt = Math.min((nowMs - lastTimeMs) / 1000, 0.1);
      lastTimeMs = nowMs;
      elapsedTime += dt;

      const st = stateRef.current;

      // Advance wingbeat phase
      currentPhase = advancePhase(currentPhase, dt, st.flapSpeed, st.isPlaying);

      // Smoothly damp morph expansion
      dampedMorph = dampValue(dampedMorph, st.morphExpansion, 10, dt);

      // Compute full wing + thorax + abdomen kinematics
      const kinFrame = computeWingKinematics(currentPhase, {
        flapSpeed: st.flapSpeed,
        isPlaying: st.isPlaying,
        morphExpansion: dampedMorph,
        wingAmplitude: st.wingAmplitude,
        phaseLag: st.phaseLag,
      });

      butterflyRig.updateKinematics(kinFrame);

      // Handle chassis X/Y/Z rotation & optional auto-rotation
      if (st.autoRotate) {
        autoYawAccumulatorDeg = wrapYawDeg(
          autoYawAccumulatorDeg + st.autoRotateSpeed * dt
        );
      } else {
        autoYawAccumulatorDeg = st.rotationYDeg;
      }

      const targetRotX = THREE.MathUtils.degToRad(st.rotationXDeg);
      const targetRotY = THREE.MathUtils.degToRad(autoYawAccumulatorDeg);
      const targetRotZ = THREE.MathUtils.degToRad(st.rotationZDeg);

      dampedRotX = dampValue(dampedRotX, targetRotX, 11, dt);
      dampedRotY = dampValue(dampedRotY, targetRotY, 11, dt);
      dampedRotZ = dampValue(dampedRotZ, targetRotZ, 11, dt);

      butterflyRig.root.rotation.set(dampedRotX, dampedRotY, dampedRotZ);

      // Smooth camera preset transition if triggered
      if (cameraTransitionActiveRef.current) {
        const preset = CAMERA_PRESETS[st.cameraPreset];
        camera.position.x = dampValue(camera.position.x, preset.position[0], 7, dt);
        camera.position.y = dampValue(camera.position.y, preset.position[1], 7, dt);
        camera.position.z = dampValue(camera.position.z, preset.position[2], 7, dt);
        controls.target.x = dampValue(controls.target.x, preset.target[0], 7, dt);
        controls.target.y = dampValue(controls.target.y, preset.target[1], 7, dt);
        controls.target.z = dampValue(controls.target.z, preset.target[2], 7, dt);

        const dist =
          Math.abs(camera.position.x - preset.position[0]) +
          Math.abs(camera.position.y - preset.position[1]) +
          Math.abs(camera.position.z - preset.position[2]);
        if (dist < 0.02) {
          cameraTransitionActiveRef.current = false;
        }
      }

      controls.update();

      // Update shader uniforms
      sharedUniforms.uTime.value = elapsedTime;
      sharedUniforms.uMorphFactor.value = dampedMorph;
      sharedUniforms.uFlapIntensity.value = st.isPlaying ? st.flapSpeed : 0.0;
      sharedUniforms.uShaderMode.value = shaderModeToNumber(st.shaderMode);
      sharedUniforms.uPlasmaPulse.value = kinFrame.plasmaIntensity;

      renderer.render(scene, camera);

      // Smooth 30Hz React telemetry HUD updates
      if (nowMs - lastTelemetryPushMs > 32) {
        lastTelemetryPushMs = nowMs;
        telemetryCbRef.current(kinFrame.telemetry);
        if (st.autoRotate && autoYawCbRef.current) {
          autoYawCbRef.current(Math.round(autoYawAccumulatorDeg));
        }
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('start', onControlStart);
      controls.dispose();
      butterflyRig.dispose();
      textures.dispose();
      envTexture.dispose();
      naniteParticles.geometry.dispose();
      (naniteParticles.material as THREE.Material).dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={canvasMountRef}
      className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing touch-none"
      aria-label="Interactive 3D Mechanical Butterfly 0621-RN Viewport"
    />
  );
}
