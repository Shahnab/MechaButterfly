import * as THREE from 'three';
import { ShaderModeId } from '../kinematics/butterflyKinematics';

export interface ButterflyShaderUniforms {
  uTime: { value: number };
  uMorphFactor: { value: number };
  uFlapIntensity: { value: number };
  uShaderMode: { value: number }; // 0: ceramic, 1: synapse, 2: thermal, 3: wireframe
  uPlasmaPulse: { value: number };
}

export function shaderModeToNumber(mode: ShaderModeId): number {
  switch (mode) {
    case 'ceramic':
      return 0;
    case 'synapse':
      return 1;
    case 'thermal':
      return 2;
    case 'wireframe':
      return 3;
    default:
      return 0;
  }
}

/**
 * Detects whether WebGPU API is exposed by the browser alongside WebGL2.
 */
export function detectGraphicsCapabilities(): {
  hasWebGPU: boolean;
  rendererLabel: string;
} {
  const hasWebGPU =
    typeof navigator !== 'undefined' && 'gpu' in navigator && !!navigator.gpu;
  return {
    hasWebGPU,
    rendererLabel: hasWebGPU
      ? 'WebGPU / GLSL Hybrid Shader Pipeline'
      : 'WebGL2 PBR + Custom GLSL Pipeline',
  };
}

/**
 * Injects custom GLSL vertex displacement & fragment nano-carbon / synapse pulse
 * shader logic into a Three.js MeshPhysicalMaterial via `onBeforeCompile`.
 */
export function attachArmorShaderExtension(
  material: THREE.MeshPhysicalMaterial,
  sharedUniforms: ButterflyShaderUniforms,
  isDarkFrame = false
): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = sharedUniforms.uTime;
    shader.uniforms.uMorphFactor = sharedUniforms.uMorphFactor;
    shader.uniforms.uFlapIntensity = sharedUniforms.uFlapIntensity;
    shader.uniforms.uShaderMode = sharedUniforms.uShaderMode;
    shader.uniforms.uIsDarkFrame = { value: isDarkFrame ? 1.0 : 0.0 };

    shader.vertexShader =
      `
      uniform float uTime;
      uniform float uMorphFactor;
      uniform float uFlapIntensity;
      varying vec3 vLocalPos;
      varying vec3 vWorldPosCustom;
      ` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vLocalPos = position;
        // High-frequency piezo-kinetic micro-ripple along wingtip edge during active flight
        float radialDist = length(position.xy);
        float microRipple = sin(radialDist * 9.0 - uTime * 8.0) * 0.0045 * uFlapIntensity * smoothstep(0.6, 2.4, radialDist);
        transformed.z += microRipple;
        vWorldPosCustom = (modelMatrix * vec4(transformed, 1.0)).xyz;
        `
      );

    shader.fragmentShader =
      `
      uniform float uTime;
      uniform float uMorphFactor;
      uniform float uFlapIntensity;
      uniform float uShaderMode;
      uniform float uIsDarkFrame;
      varying vec3 vLocalPos;
      varying vec3 vWorldPosCustom;

      // Hexagonal nanite grid distance function for Synapse / Thermal modes
      float hexGrid(vec2 p) {
        p *= 18.0;
        vec2 r = vec2(1.0, 1.7320508);
        vec2 h = r * 0.5;
        vec2 a = mod(p, r) - h;
        vec2 b = mod(p - h, r) - h;
        vec2 gv = dot(a, a) < dot(b, b) ? a : b;
        float d = max(abs(gv.x), dot(abs(gv), normalize(r)));
        return smoothstep(0.44, 0.49, d);
      }
      ` +
      shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `
        #include <dithering_fragment>

        float radial = length(vLocalPos.xy);
        float scanWave = sin(radial * 6.5 - uTime * 4.2) * 0.5 + 0.5;
        float sharpPulse = pow(scanWave, 7.0);
        float hex = hexGrid(vLocalPos.xy);

        // Mode 0: Standard Ceramic PBR with subtle crimson edge synapse glow only when morphing > 20%
        if (uShaderMode < 0.5) {
          float activeMorph = smoothstep(0.2, 0.85, uMorphFactor);
          float morphGlow = activeMorph * sharpPulse * hex * 0.35;
          vec3 crimson = vec3(0.82, 0.12, 0.14);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb + crimson * 0.75, morphGlow);
        }
        // Mode 1: Synapse-Linked Neural Mesh Pulse
        else if (uShaderMode < 1.5) {
          vec3 crimson = vec3(0.95, 0.12, 0.18);
          vec3 cyanTrace = vec3(0.75, 0.85, 1.0);
          float circuit = hex * (0.28 + 0.72 * sharpPulse);
          if (uIsDarkFrame > 0.5) {
            gl_FragColor.rgb += crimson * circuit * 0.9;
          } else {
            gl_FragColor.rgb = mix(gl_FragColor.rgb * 0.82, crimson, circuit * 0.65);
            gl_FragColor.rgb += cyanTrace * pow(scanWave, 14.0) * 0.25;
          }
        }
        // Mode 2: Thermal Plasma Signature
        else if (uShaderMode < 2.5) {
          float heat = clamp((radial * 0.38) + sharpPulse * 0.35 + uMorphFactor * 0.25, 0.0, 1.0);
          vec3 coldObsidian = vec3(0.06, 0.08, 0.14);
          vec3 midCrimson = vec3(0.90, 0.11, 0.16);
          vec3 hotAmber = vec3(1.0, 0.68, 0.18);
          vec3 thermalCol = mix(coldObsidian, midCrimson, smoothstep(0.0, 0.6, heat));
          thermalCol = mix(thermalCol, hotAmber, smoothstep(0.55, 1.0, heat));
          gl_FragColor.rgb = mix(gl_FragColor.rgb * 0.25, thermalCol, 0.88);
        }
        // Mode 3: X-Ray Neural Architecture
        else {
          float gridLine = hexGrid(vLocalPos.xy * 1.4);
          vec3 wireCol = mix(vec3(0.85, 0.90, 0.96), vec3(0.95, 0.12, 0.18), sharpPulse);
          gl_FragColor.rgb = mix(vec3(0.04, 0.05, 0.07), wireCol, gridLine * 0.85 + 0.15);
        }
        `
      );
  };
}

/**
 * Creates a custom GLSL ShaderMaterial for the Synthetic Plasma Core (#C82321)
 * and the recessed crimson-scarlet hindwing energy vents matching the reference tone.
 */
export function createPlasmaShaderMaterial(
  sharedUniforms: ButterflyShaderUniforms
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: sharedUniforms.uTime,
      uPlasmaPulse: sharedUniforms.uPlasmaPulse,
      uMorphFactor: sharedUniforms.uMorphFactor,
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uPlasmaPulse;
      uniform float uMorphFactor;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vec3 viewDir = normalize(vViewPosition);
        float ndotv = abs(dot(viewDir, vNormal));
        float fresnel = pow(1.0 - ndotv, 2.0);

        // Subtle internal plasma pulse while preserving deep anodized scarlet-crimson tone
        float wave = sin(vUv.y * 14.0 - uTime * 4.5) * 0.5 + 0.5;
        vec3 darkCrimsonEdge = vec3(0.36, 0.04, 0.04);
        vec3 richScarlet = vec3(0.79, 0.13, 0.12);
        vec3 specHighlight = vec3(0.94, 0.24, 0.22);

        vec3 col = mix(darkCrimsonEdge, richScarlet, 0.55 + 0.45 * ndotv);
        col = mix(col, specHighlight, pow(ndotv, 6.0) * 0.45 + wave * 0.12 * uPlasmaPulse);
        col += vec3(0.75, 0.10, 0.10) * fresnel * (0.25 + uMorphFactor * 0.35);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

/**
 * Creates a GPU-driven particle field representing self-healing carbon-alloy nanites
 * and aerodynamic vortex wake around the mechanical butterfly.
 */
export function createNaniteParticleSystem(
  sharedUniforms: ButterflyShaderUniforms
): THREE.Points {
  const count = 160;
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const phases = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // Distribute around wingspan ellipse
    const angle = (i / count) * Math.PI * 2 * 3.7;
    const radius = 0.8 + ((i * 73) % 100) / 100 * 2.5;
    positions[i * 3] = Math.cos(angle) * radius * 1.15;
    positions[i * 3 + 1] = Math.sin(angle) * radius * 0.95;
    positions[i * 3 + 2] = (((i * 31) % 100) / 100 - 0.5) * 1.2;
    scales[i] = 0.5 + ((i * 19) % 100) / 100 * 1.4;
    phases[i] = (i / count) * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: sharedUniforms.uTime,
      uFlapIntensity: sharedUniforms.uFlapIntensity,
      uMorphFactor: sharedUniforms.uMorphFactor,
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float aScale;
      attribute float aPhase;
      uniform float uTime;
      uniform float uFlapIntensity;
      uniform float uMorphFactor;
      varying float vAlpha;
      varying float vIsCrimson;

      void main() {
        vec3 pos = position;
        float t = uTime * (0.45 + uFlapIntensity * 0.35) + aPhase;
        pos.y += sin(t * 1.7) * 0.14;
        pos.x += cos(t * 1.3) * 0.08;
        pos.z += sin(t * 2.1) * (0.18 + uMorphFactor * 0.25);

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = clamp((aScale * 14.0) / -mvPosition.z, 1.5, 6.0);
        vAlpha = (0.25 + 0.45 * sin(t * 2.0)) * (0.5 + 0.5 * uMorphFactor + 0.25 * uFlapIntensity);
        vIsCrimson = step(0.68, fract(aPhase * 3.17));
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      varying float vIsCrimson;

      void main() {
        vec2 cxy = 2.0 * gl_PointCoord - 1.0;
        float r = dot(cxy, cxy);
        if (r > 1.0) discard;
        float falloff = 1.0 - r;
        vec3 col = mix(vec3(0.78, 0.84, 0.92), vec3(0.95, 0.14, 0.18), vIsCrimson);
        gl_FragColor = vec4(col, falloff * vAlpha);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}
