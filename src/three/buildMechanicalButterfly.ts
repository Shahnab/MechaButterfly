import * as THREE from 'three';
import { ButterflyTextureSet } from './proceduralTextures';
import {
  attachArmorShaderExtension,
  ButterflyShaderUniforms,
  createPlasmaShaderMaterial,
} from './shaders';
import { WingKinematicsFrame } from '../kinematics/butterflyKinematics';

export interface ArticulatedWingRig {
  side: -1 | 1;
  rootGroup: THREE.Group;
  forewingGroup: THREE.Group;
  hindwingGroup: THREE.Group;
  forePlates: {
    group: THREE.Group;
    basePos: THREE.Vector3;
    slideDir: THREE.Vector3;
    inPlaneRotSign: number;
  }[];
  hindPlates: {
    group: THREE.Group;
    basePos: THREE.Vector3;
    slideDir: THREE.Vector3;
    inPlaneRotSign: number;
  }[];
  wingGears: { mesh: THREE.Mesh; speedRatio: number }[];
  aeroFlaps: THREE.Group[];
  pistonRod: THREE.Mesh;
  secondaryPistonRod: THREE.Mesh;
  hindTailSpur: THREE.Group;
  vPistonRod?: THREE.Mesh;
  vSecPistonRod?: THREE.Mesh;
  vHindTailSpur?: THREE.Group;
}

export interface MechanicalButterflyRig {
  root: THREE.Group;
  thoraxGroup: THREE.Group;
  headGroup: THREE.Group;
  antennaLeft: THREE.Group;
  antennaRight: THREE.Group;
  mandibleLeft: THREE.Mesh;
  mandibleRight: THREE.Mesh;
  thoraxGears: { mesh: THREE.Mesh; speedRatio: number }[];
  thoraxLinkages: { group: THREE.Group; side: -1 | 1; baseRotZ: number }[];
  abdomenSegments: THREE.Group[];
  tailCaliperLeft: THREE.Group;
  tailCaliperRight: THREE.Group;
  leftWing: ArticulatedWingRig;
  rightWing: ArticulatedWingRig;
  plasmaCoreMesh: THREE.Mesh;
  plasmaPointLight: THREE.PointLight;
  updateKinematics: (frame: WingKinematicsFrame) => void;
  dispose: () => void;
}

/**
 * Helper to create a beveled extruded BufferGeometry from 2D polygon points
 * with non-mirrored planar UVs (so D-42 and barcodes never read backwards)
 * and proper counter-clockwise winding for either side (-1 or +1).
 */
function createPanelGeometry(
  points: [number, number][],
  depth = 0.036,
  bevelSize = 0.012,
  bevelThickness = 0.012,
  side: -1 | 1 = 1
): THREE.ExtrudeGeometry {
  const ordered =
    side === 1
      ? points
      : [...points].reverse().map(([x, y]) => [-x, y] as [number, number]);

  const shape = new THREE.Shape();
  shape.moveTo(ordered[0][0], ordered[0][1]);
  for (let i = 1; i < ordered.length; i++) {
    shape.lineTo(ordered[i][0], ordered[i][1]);
  }
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize,
    bevelThickness,
  });

  // Normalize UVs to [0, 1] across the bounding box (forward-reading on both sides)
  geom.computeBoundingBox();
  const bb = geom.boundingBox!;
  const sizeX = Math.max(0.001, bb.max.x - bb.min.x);
  const sizeY = Math.max(0.001, bb.max.y - bb.min.y);
  const uvAttr = geom.attributes.uv;
  const posAttr = geom.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const u = (posAttr.getX(i) - bb.min.x) / sizeX;
    const v = (posAttr.getY(i) - bb.min.y) / sizeY;
    uvAttr.setXY(i, u, v);
  }
  uvAttr.needsUpdate = true;
  geom.computeVertexNormals();
  return geom;
}

/**
 * Generates an outward-facing extruded panel geometry specifically for the ventral (rear -Z) side,
 * with beveled top cap facing -Z and proper counter-clockwise winding.
 */
function createVentralPanelGeometry(
  points: [number, number][],
  depth = 0.036,
  bevelSize = 0.012,
  bevelThickness = 0.012,
  side: -1 | 1 = 1
): THREE.ExtrudeGeometry {
  const geom = createPanelGeometry(points, depth, bevelSize, bevelThickness, side);
  geom.scale(1, 1, -1);
  const index = geom.index;
  if (index) {
    const arr = index.array;
    for (let i = 0; i < arr.length; i += 3) {
      const tmp = arr[i];
      arr[i] = arr[i + 1];
      arr[i + 1] = tmp;
    }
    index.needsUpdate = true;
  }
  geom.computeVertexNormals();
  return geom;
}

/**
 * Generates a precision toothed mechanical escapement gear / turbine wheel BufferGeometry.
 */
function createMechanicalGearGeometry(
  outerRadius: number,
  innerRadius: number,
  teeth: number,
  depth = 0.032
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  const rootRadius = outerRadius * 0.82;

  for (let i = 0; i < teeth; i++) {
    const a0 = i * step;
    const a1 = a0 + step * 0.22;
    const a2 = a0 + step * 0.45;
    const a3 = a0 + step * 0.72;
    const a4 = a0 + step * 0.92;

    const p0x = Math.cos(a0) * rootRadius;
    const p0y = Math.sin(a0) * rootRadius;
    if (i === 0) shape.moveTo(p0x, p0y);
    else shape.lineTo(p0x, p0y);

    shape.lineTo(Math.cos(a1) * outerRadius, Math.sin(a1) * outerRadius);
    shape.lineTo(Math.cos(a2) * outerRadius, Math.sin(a2) * outerRadius);
    shape.lineTo(Math.cos(a3) * rootRadius, Math.sin(a3) * rootRadius);
    shape.lineTo(Math.cos(a4) * rootRadius, Math.sin(a4) * rootRadius);
  }
  shape.closePath();

  if (innerRadius > 0.005) {
    const hole = new THREE.Path();
    hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.004,
    bevelThickness: 0.004,
  });
  geom.center();
  geom.computeVertexNormals();
  return geom;
}

/**
 * Builds the complete hyper-detailed multi-part 3D 0621-RN Mechanical Butterfly rig
 * matching the exact rugged look, color tone, panel geometry, and mechanical density
 * of the reference image.
 */
export function buildMechanicalButterfly(
  textures: ButterflyTextureSet,
  sharedUniforms: ButterflyShaderUniforms
): MechanicalButterflyRig {
  const disposables: (THREE.BufferGeometry | THREE.Material)[] = [];
  const track = <T extends THREE.BufferGeometry | THREE.Material>(item: T): T => {
    disposables.push(item);
    return item;
  };

  // --- Shared PBR Materials with Custom GLSL Shader Extensions ---
  // 1A. Clean Rugged Matte-Satin White Ceramic Armor Material (tuned so flat faces don't blow out)
  const ceramicMaterial = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xeaebef,
      map: textures.ceramicAlbedoMap,
      bumpMap: textures.ceramicBumpMap,
      bumpScale: 0.009,
      roughness: 0.42,
      metalness: 0.02,
      clearcoat: 0.14,
      clearcoatRoughness: 0.35,
      envMapIntensity: 0.55,
      side: THREE.DoubleSide,
    })
  );
  attachArmorShaderExtension(ceramicMaterial, sharedUniforms, false);

  // 1B. Dedicated Lower-Forewing Ceramic Material (with vertical slot gauge, barcode & D-42 stencil)
  const ceramicLowerForewingMaterial = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xeaebef,
      map: textures.ceramicLowerForewingMap,
      bumpMap: textures.ceramicBumpMap,
      bumpScale: 0.009,
      roughness: 0.42,
      metalness: 0.02,
      clearcoat: 0.14,
      clearcoatRoughness: 0.35,
      envMapIntensity: 0.55,
      side: THREE.DoubleSide,
    })
  );
  attachArmorShaderExtension(ceramicLowerForewingMaterial, sharedUniforms, false);

  // 2A. Forewing Outer Perimeter Brushed Grey-Titanium Armor Frame (#454950 rugged slate-titanium)
  const titaniumRimMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x464a52,
      bumpMap: textures.titaniumBumpMap,
      bumpScale: 0.012,
      roughness: 0.44,
      metalness: 0.46,
      clearcoat: 0.22,
      clearcoatRoughness: 0.3,
      envMapIntensity: 0.78,
      side: THREE.DoubleSide,
    })
  );
  attachArmorShaderExtension(titaniumRimMat, sharedUniforms, true);

  // 2B. Lighter Brushed Silver-Titanium Wingtip Arch Cap (#7E838C)
  const titaniumTipArchMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x7c818a,
      bumpMap: textures.titaniumBumpMap,
      bumpScale: 0.008,
      roughness: 0.32,
      metalness: 0.65,
      clearcoat: 0.35,
      clearcoatRoughness: 0.22,
      envMapIntensity: 0.98,
      side: THREE.DoubleSide,
    })
  );
  attachArmorShaderExtension(titaniumTipArchMat, sharedUniforms, true);

  // 2C. Hindwing Scalloped Dark Gunmetal / Matte Charcoal Stealth Frame (#15171B - non-reflective matte carbon)
  const darkGunmetalHindMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x15171b,
      bumpMap: textures.carbonBumpMap,
      bumpScale: 0.015,
      roughness: 0.58,
      metalness: 0.26,
      clearcoat: 0.15,
      clearcoatRoughness: 0.36,
      envMapIntensity: 0.52,
      side: THREE.DoubleSide,
    })
  );
  attachArmorShaderExtension(darkGunmetalHindMat, sharedUniforms, true);

  // 3. Liquid Black-Chrome Biomechanical Exoskeleton Material (high-contrast obsidian mirror)
  const blackChromeMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x0b0c0f,
      bumpMap: textures.carbonBumpMap,
      bumpScale: 0.002,
      roughness: 0.1,
      metalness: 0.94,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      envMapIntensity: 2.1,
      side: THREE.DoubleSide,
    })
  );

  // 4. Deep Shadow Carbon-Weave Inner Recess Material (true dark carbon recess behind plates)
  const obsidianCarbonMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x090b0e,
      bumpMap: textures.carbonBumpMap,
      bumpScale: 0.016,
      roughness: 0.7,
      metalness: 0.2,
      envMapIntensity: 0.38,
      side: THREE.DoubleSide,
    })
  );

  // 5. Mirror-Polished Silver-Chrome Mechanical Linkages, Domes, Pistons, Rivets & Stingers
  const chromeMetalMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xdce0e8,
      roughness: 0.12,
      metalness: 0.94,
      clearcoat: 0.9,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.85,
      side: THREE.DoubleSide,
    })
  );

  // 6. Dark Smoked Steel / Gunmetal Actuator Trim Material
  const darkTitaniumMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x22252c,
      roughness: 0.28,
      metalness: 0.78,
      clearcoat: 0.55,
      clearcoatRoughness: 0.18,
      envMapIntensity: 1.25,
      side: THREE.DoubleSide,
    })
  );

  // 7. Rich Anodized Scarlet-Crimson Material (#B81D1B) matching Reactor Core, Eyes & Hindwing Vents
  const crimsonLacquerMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xb41c1a,
      emissive: 0x2c0303,
      emissiveIntensity: 0.18,
      roughness: 0.3,
      metalness: 0.12,
      clearcoat: 0.55,
      clearcoatRoughness: 0.16,
      envMapIntensity: 0.65,
      side: THREE.DoubleSide,
    })
  );

  // Anodized Luminous Scarlet Vent Material for Ventral Plasma Outlets
  const ventralCrimsonMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xc2201e,
      emissive: 0x880e0e,
      emissiveIntensity: 0.55,
      roughness: 0.22,
      metalness: 0.2,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide,
    })
  );

  // 8. Custom GLSL Synthetic Plasma Core & Vent Shader Material
  const plasmaShaderMat = track(createPlasmaShaderMaterial(sharedUniforms));
  plasmaShaderMat.side = THREE.DoubleSide;

  // 9. Tactical Emissive LED & Strobe Materials for Blinking Lights
  const strobeLedMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xff281e,
      emissiveIntensity: 4.2,
      roughness: 0.15,
      metalness: 0.1,
    })
  );

  const rubyPilotMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xff3333,
      emissive: 0xff1616,
      emissiveIntensity: 2.5,
      roughness: 0.15,
      metalness: 0.1,
    })
  );

  const whitePilotMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xeef5ff,
      emissiveIntensity: 3.0,
      roughness: 0.15,
      metalness: 0.1,
    })
  );

  const greenPilotMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x33ff66,
      emissive: 0x11ee44,
      emissiveIntensity: 2.8,
      roughness: 0.15,
      metalness: 0.1,
    })
  );

  const wishboneLedMeshes: { mesh: THREE.Mesh; side: number; index: number }[] = [];
  const sternalLedMeshes: THREE.Mesh[] = [];
  const navStrobeMeshes: { mesh: THREE.Mesh; isLeft: boolean }[] = [];
  let ventralBeaconMesh: THREE.Mesh | null = null;

  const root = new THREE.Group();
  root.name = 'MechanicalButterfly_0621_RN';

  // ============================================================================
  // 1. HYPER-DETAILED BIOMECHANICAL BODY: HEAD, NECK, THORAX, RIBCAGE & ABDOMEN
  // ============================================================================
  const thoraxGroup = new THREE.Group();
  root.add(thoraxGroup);

  const thoraxGears: { mesh: THREE.Mesh; speedRatio: number }[] = [];
  const thoraxLinkages: { group: THREE.Group; side: -1 | 1; baseRotZ: number }[] = [];

  // --- 1A. Deep Sculpted Thoracic Inner Spine & Corrugated Cervical Neck Arch ---
  const thoraxSpineGeom = track(
    createPanelGeometry(
      [
        [-0.14, 0.42],
        [0.14, 0.42],
        [0.24, 0.22],
        [0.25, 0.02],
        [0.18, -0.22],
        [0.11, -0.38],
        [-0.11, -0.38],
        [-0.18, -0.22],
        [-0.25, 0.02],
        [-0.24, 0.22],
      ],
      0.18,
      0.024,
      0.024
    )
  );
  const thoraxMesh = new THREE.Mesh(thoraxSpineGeom, obsidianCarbonMat);
  thoraxMesh.position.set(0, 0.04, -0.14);
  thoraxGroup.add(thoraxMesh);

  // --- Ventral (Opposite Side) Sculpted Vertebral Spine & Reactor Heat Exhaust Column ---
  // Replaces the flat back surface with segmented mecha vertebrae, heat sink slats, and twin hydraulic shock rams
  const vertebraSteps = [
    { y: 0.32, w: 0.16, h: 0.052, z: -0.155, isChrome: true },
    { y: 0.25, w: 0.175, h: 0.055, z: -0.162, isChrome: false },
    { y: 0.18, w: 0.185, h: 0.058, z: -0.168, isChrome: true },
    { y: 0.10, w: 0.19, h: 0.06, z: -0.17, isChrome: false },
    { y: 0.02, w: 0.185, h: 0.058, z: -0.168, isChrome: true },
    { y: -0.06, w: 0.175, h: 0.055, z: -0.164, isChrome: false },
    { y: -0.14, w: 0.155, h: 0.052, z: -0.158, isChrome: true },
    { y: -0.22, w: 0.135, h: 0.05, z: -0.152, isChrome: false },
    { y: -0.30, w: 0.115, h: 0.046, z: -0.146, isChrome: true },
  ];

  vertebraSteps.forEach((v) => {
    const vGeom = track(
      createPanelGeometry(
        [
          [-v.w * 0.5, v.h * 0.45],
          [v.w * 0.5, v.h * 0.45],
          [v.w * 0.42, -v.h * 0.45],
          [-v.w * 0.42, -v.h * 0.45],
        ],
        0.042,
        0.007,
        0.007
      )
    );
    const vMesh = new THREE.Mesh(
      vGeom,
      v.isChrome ? blackChromeMat : darkTitaniumMat
    );
    vMesh.position.set(0, v.y, v.z);
    vMesh.rotation.y = Math.PI;
    thoraxGroup.add(vMesh);

    // Spinal Central Chrome Intervertebral Bead
    const vBeadGeom = track(new THREE.CylinderGeometry(0.016, 0.016, 0.028, 10));
    vBeadGeom.rotateX(Math.PI / 2);
    const vBead = new THREE.Mesh(vBeadGeom, chromeMetalMat);
    vBead.position.set(0, v.y, v.z - 0.024);
    thoraxGroup.add(vBead);
  });

  // Ventral Scarlet-Crimson Reactor Heat Exhaust Matrix (mirroring the front core at y = 0.04..0.22, z = -0.165)
  const ventralReactorGeom = track(
    createPanelGeometry(
      [
        [-0.075, 0.12],
        [0.075, 0.12],
        [0.09, -0.06],
        [-0.09, -0.06],
      ],
      0.038,
      0.009,
      0.009
    )
  );
  const ventralReactorMesh = new THREE.Mesh(ventralReactorGeom, crimsonLacquerMat);
  ventralReactorMesh.position.set(0, 0.11, -0.165);
  ventralReactorMesh.rotation.y = Math.PI;
  thoraxGroup.add(ventralReactorMesh);

  // Horizontal Heat Sink Slats over Ventral Reactor
  const heatSlatGeom = track(new THREE.BoxGeometry(0.155, 0.012, 0.028));
  for (let sIdx = -2; sIdx <= 2; sIdx++) {
    const slat = new THREE.Mesh(heatSlatGeom, darkTitaniumMat);
    slat.position.set(0, 0.11 + sIdx * 0.034, -0.18);
    thoraxGroup.add(slat);
  }

  // Ventral Strobe Beacon Diode (blinks synchronously with dorsal beacon)
  const ventralBeaconGeom = track(new THREE.SphereGeometry(0.016, 12, 10));
  ventralBeaconMesh = new THREE.Mesh(ventralBeaconGeom, strobeLedMat);
  ventralBeaconMesh.position.set(0, 0.23, -0.178);
  thoraxGroup.add(ventralBeaconMesh);

  // Twin High-Pressure Ventral Hydraulic Shock Absorbers (flanking the spine)
  const ventralPistonCylGeom = track(
    new THREE.CylinderGeometry(0.018, 0.018, 0.44, 12)
  );
  const ventralPistonRodGeom = track(
    new THREE.CylinderGeometry(0.011, 0.011, 0.48, 10)
  );
  for (const side of [-1, 1] as const) {
    const cyl = new THREE.Mesh(ventralPistonCylGeom, blackChromeMat);
    cyl.position.set(side * 0.115, 0.04, -0.165);
    thoraxGroup.add(cyl);

    const rod = new THREE.Mesh(ventralPistonRodGeom, chromeMetalMat);
    rod.position.set(side * 0.115, 0.02, -0.172);
    thoraxGroup.add(rod);

    // Collar brackets connecting cylinder to spinal column
    for (const py of [0.18, -0.12]) {
      const bGeom = track(new THREE.BoxGeometry(0.045, 0.022, 0.034));
      const bMesh = new THREE.Mesh(bGeom, darkTitaniumMat);
      bMesh.position.set(side * 0.095, py, -0.16);
      thoraxGroup.add(bMesh);
    }

    // Ventral Wishbone Rib Arches (wrapping around to rear)
    const ventralRibCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.08, 0.14, -0.155),
      new THREE.Vector3(side * 0.18, 0.08, -0.165),
      new THREE.Vector3(side * 0.24, -0.04, -0.145),
      new THREE.Vector3(side * 0.16, -0.16, -0.13),
      new THREE.Vector3(side * 0.07, -0.22, -0.145),
    ]);
    const ventralRibGeom = track(
      new THREE.TubeGeometry(ventralRibCurve, 20, 0.018, 10, false)
    );
    thoraxGroup.add(new THREE.Mesh(ventralRibGeom, blackChromeMat));
  }

  // Curved Black-Chrome Cervical Collar Cylinder with Organic Corrugated Ribs (y = 0.36..0.44)
  const neckCylGeom = track(
    new THREE.CylinderGeometry(0.068, 0.076, 0.24, 18)
  );
  neckCylGeom.rotateZ(Math.PI / 2);
  neckCylGeom.scale(1.0, 0.85, 1.0);
  const neckCylMesh = new THREE.Mesh(neckCylGeom, blackChromeMat);
  neckCylMesh.position.set(0, 0.405, 0.115);
  thoraxGroup.add(neckCylMesh);

  const neckRibRingGeom = track(
    new THREE.TorusGeometry(0.064, 0.0065, 10, 20, Math.PI * 1.15)
  );
  for (let g = -6; g <= 6; g++) {
    const ribRing = new THREE.Mesh(
      neckRibRingGeom,
      g % 3 === 0 ? darkTitaniumMat : blackChromeMat
    );
    const gx = g * 0.017;
    const scaleR = 1.0 - Math.abs(g) * 0.025;
    ribRing.position.set(gx, 0.405, 0.118);
    ribRing.rotation.y = Math.PI / 2;
    ribRing.rotation.x = -0.35;
    ribRing.scale.set(scaleR, scaleR, 1.0);
    thoraxGroup.add(ribRing);
  }

  // Prominent Sculpted Prothoracic Dorsal Hood & Specular Chrome Arch (crowns the red reactor core)
  const dorsalHoodGeom = track(new THREE.SphereGeometry(0.112, 24, 20));
  dorsalHoodGeom.scale(1.38, 0.76, 0.94);
  const dorsalHoodMesh = new THREE.Mesh(dorsalHoodGeom, blackChromeMat);
  dorsalHoodMesh.position.set(0, 0.295, 0.13);
  thoraxGroup.add(dorsalHoodMesh);

  const crownCapGeom = track(new THREE.SphereGeometry(0.084, 20, 16));
  crownCapGeom.scale(1.34, 0.54, 0.84);
  const crownCapMesh = new THREE.Mesh(crownCapGeom, chromeMetalMat);
  crownCapMesh.position.set(0, 0.318, 0.168);
  crownCapMesh.rotation.x = -0.26;
  thoraxGroup.add(crownCapMesh);

  // Sculpted 3D Curved Black-Chrome Shoulder Carapace Shells
  const shoulderShellGeom = track(new THREE.SphereGeometry(0.095, 18, 16));
  shoulderShellGeom.scale(1.35, 0.92, 0.72);
  for (const side of [-1, 1] as const) {
    const shell1 = new THREE.Mesh(shoulderShellGeom, blackChromeMat);
    shell1.position.set(side * 0.175, 0.31, 0.105);
    shell1.rotation.z = -side * 0.45;
    shell1.rotation.y = side * 0.32;
    thoraxGroup.add(shell1);

    const shell2 = new THREE.Mesh(shoulderShellGeom, darkTitaniumMat);
    shell2.position.set(side * 0.22, 0.19, 0.085);
    shell2.rotation.z = -side * 0.22;
    shell2.rotation.y = side * 0.4;
    shell2.scale.set(1.1, 0.85, 0.68);
    thoraxGroup.add(shell2);
  }

  // --- 1B. Central Convex Scarlet-Crimson Reactor Core & Horseshoe Cowl ---
  const plasmaCoreGeom = track(
    createPanelGeometry(
      [
        [-0.06, 0.17],
        [0.06, 0.17],
        [0.062, 0.0],
        [-0.062, 0.0],
      ],
      0.055,
      0.012,
      0.012
    )
  );
  const plasmaCoreMesh = new THREE.Mesh(plasmaCoreGeom, plasmaShaderMat);
  plasmaCoreMesh.position.set(0, 0.0, 0.075);
  thoraxGroup.add(plasmaCoreMesh);

  // Unified Convex Anodized Scarlet-Crimson Reactor Block (#C2201E)
  const reactorBlockGeom = track(
    createPanelGeometry(
      [
        [-0.05, 0.168],
        [0.05, 0.168],
        [0.056, 0.088],
        [0.05, 0.008],
        [-0.05, 0.008],
        [-0.056, 0.088],
      ],
      0.082,
      0.02,
      0.024
    )
  );
  const reactorBlockMesh = new THREE.Mesh(reactorBlockGeom, crimsonLacquerMat);
  reactorBlockMesh.position.set(0, 0.0, 0.145);
  reactorBlockMesh.rotation.x = 0.14;
  thoraxGroup.add(reactorBlockMesh);

  // Upper Beveled Black-Chrome Brow Bar framing the Red Reactor Block
  const upperBrowGeom = track(new THREE.BoxGeometry(0.162, 0.028, 0.068));
  const upperBrowMesh = new THREE.Mesh(upperBrowGeom, blackChromeMat);
  upperBrowMesh.position.set(0, 0.202, 0.212);
  upperBrowMesh.rotation.x = 0.28;
  thoraxGroup.add(upperBrowMesh);

  const upperChromeTrimGeom = track(new THREE.BoxGeometry(0.145, 0.011, 0.074));
  const upperChromeTrim = new THREE.Mesh(upperChromeTrimGeom, chromeMetalMat);
  upperChromeTrim.position.set(0, 0.216, 0.215);
  thoraxGroup.add(upperChromeTrim);

  // Central Thoracic Strobe Diode & Beacon Light (matching user image_bf6d6200.png directly above the red reactor block)
  const beaconDiodeGeom = track(new THREE.SphereGeometry(0.016, 12, 10));
  const beaconDiodeMesh = new THREE.Mesh(beaconDiodeGeom, strobeLedMat);
  beaconDiodeMesh.position.set(0, 0.208, 0.246);
  thoraxGroup.add(beaconDiodeMesh);

  const beaconLight = new THREE.PointLight(0xff2211, 1.6, 1.4, 2.0);
  beaconLight.position.set(0, 0.218, 0.268);
  thoraxGroup.add(beaconLight);

  // Twin Vertical Silver-Chrome C-Rails + Outer Black-Chrome Horseshoe Cowls flanking the Red Core
  for (const side of [-1, 1] as const) {
    const railCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.076, 0.195, 0.192),
      new THREE.Vector3(side * 0.088, 0.088, 0.232),
      new THREE.Vector3(side * 0.074, -0.015, 0.188),
    ]);
    const railGeom = track(new THREE.TubeGeometry(railCurve, 16, 0.012, 10, false));
    const railMesh = new THREE.Mesh(railGeom, chromeMetalMat);
    thoraxGroup.add(railMesh);

    const outerCowlCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.095, 0.225, 0.155),
      new THREE.Vector3(side * 0.13, 0.088, 0.208),
      new THREE.Vector3(side * 0.104, -0.055, 0.168),
    ]);
    const outerCowlGeom = track(
      new THREE.TubeGeometry(outerCowlCurve, 18, 0.026, 12, false)
    );
    const outerCowlMesh = new THREE.Mesh(outerCowlGeom, blackChromeMat);
    thoraxGroup.add(outerCowlMesh);
  }

  // Subtle crimson PointLight
  const plasmaPointLight = new THREE.PointLight(0xd92321, 0.55, 2.2, 2.0);
  plasmaPointLight.position.set(0, 0.09, 0.36);
  thoraxGroup.add(plasmaPointLight);

  // Deep Obsidian & Black-Chrome Stepped Sternal Channel beneath the Red Core (y = -0.03 to -0.32)
  const sternalSteps: [number, number, number, number][] = [
    [0.152, 0.048, -0.035, 0.185],
    [0.13, 0.05, -0.095, 0.172],
    [0.112, 0.05, -0.155, 0.158],
    [0.096, 0.048, -0.215, 0.145],
    [0.084, 0.046, -0.275, 0.135],
  ];
  sternalSteps.forEach(([w, h, sy, sz], idx) => {
    const stepGeom = track(
      createPanelGeometry(
        [
          [-w * 0.5, h * 0.45],
          [w * 0.5, h * 0.45],
          [w * 0.44, -h * 0.45],
          [-w * 0.44, -h * 0.45],
        ],
        0.045,
        0.007,
        0.007
      )
    );
    const stepMesh = new THREE.Mesh(
      stepGeom,
      idx % 2 === 0 ? blackChromeMat : obsidianCarbonMat
    );
    stepMesh.position.set(0, sy, sz);
    stepMesh.rotation.x = 0.24;
    thoraxGroup.add(stepMesh);
  });

  // Sequential Sternal Spine Micro-LEDs
  const sternalLedGeom = track(new THREE.SphereGeometry(0.007, 8, 8));
  sternalSteps.forEach(([w, h, sy, sz], idx) => {
    const sLedMat = track(rubyPilotMat.clone());
    const sLed = new THREE.Mesh(sternalLedGeom, sLedMat);
    sLed.position.set(0, sy, sz + 0.026);
    thoraxGroup.add(sLed);
    sternalLedMeshes.push(sLed);
  });

  // --- 1C. Hyper-Dense Lateral Wing-Root 4-Bar Linkage Matrix & Open-Work Ribcage ---
  const mainGearGeom = track(
    createMechanicalGearGeometry(0.115, 0.042, 14, 0.024)
  );
  const subGearGeom = track(
    createMechanicalGearGeometry(0.082, 0.028, 12, 0.022)
  );
  const knuckleSphereGeom = track(new THREE.SphereGeometry(0.044, 16, 16));
  const microKnuckleGeom = track(new THREE.SphereGeometry(0.028, 14, 14));
  const collarRingGeom = track(new THREE.TorusGeometry(0.034, 0.007, 8, 16));
  const pistonBarrelGeom = track(
    new THREE.CylinderGeometry(0.026, 0.024, 0.26, 12)
  );
  const pistonShaftGeom = track(
    new THREE.CylinderGeometry(0.014, 0.014, 0.3, 10)
  );

  for (const side of [-1, 1] as const) {
    const upperGear = new THREE.Mesh(mainGearGeom, darkTitaniumMat);
    upperGear.position.set(side * 0.14, 0.17, 0.035);
    thoraxGroup.add(upperGear);
    thoraxGears.push({ mesh: upperGear, speedRatio: side * 1.0 });

    const lowerGear = new THREE.Mesh(subGearGeom, darkTitaniumMat);
    lowerGear.position.set(side * 0.12, -0.09, 0.045);
    thoraxGroup.add(lowerGear);
    thoraxGears.push({ mesh: lowerGear, speedRatio: -side * 1.6 });

    const linkageGroup = new THREE.Group();
    linkageGroup.position.set(side * 0.08, 0.1, 0.115);
    thoraxGroup.add(linkageGroup);
    thoraxLinkages.push({ group: linkageGroup, side, baseRotZ: 0 });

    const upperWishboneCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.22, 0.02),
      new THREE.Vector3(side * 0.04, 0.18, 0.065),
      new THREE.Vector3(side * 0.08, 0.21, 0.048),
      new THREE.Vector3(side * 0.11, 0.25, 0.015),
    ]);
    const upperWishboneGeom = track(
      new THREE.TubeGeometry(upperWishboneCurve, 18, 0.02, 10, false)
    );
    linkageGroup.add(new THREE.Mesh(upperWishboneGeom, blackChromeMat));

    const upperClevisCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.02, 0.14, 0.038),
      new THREE.Vector3(side * 0.06, 0.16, 0.065),
      new THREE.Vector3(side * 0.1, 0.18, 0.038),
    ]);
    const upperClevisGeom = track(
      new THREE.TubeGeometry(upperClevisCurve, 14, 0.015, 10, false)
    );
    linkageGroup.add(new THREE.Mesh(upperClevisGeom, darkTitaniumMat));

    const midUpperCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.07, 0.04),
      new THREE.Vector3(side * 0.05, 0.09, 0.075),
      new THREE.Vector3(side * 0.09, 0.06, 0.055),
      new THREE.Vector3(side * 0.12, 0.08, 0.015),
    ]);
    const midUpperGeom = track(
      new THREE.TubeGeometry(midUpperCurve, 18, 0.022, 10, false)
    );
    linkageGroup.add(new THREE.Mesh(midUpperGeom, blackChromeMat));

    const chromeRamCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.01, 0.02, 0.06),
      new THREE.Vector3(side * 0.06, 0.03, 0.08),
      new THREE.Vector3(side * 0.11, 0.01, 0.045),
    ]);
    const chromeRamGeom = track(
      new THREE.TubeGeometry(chromeRamCurve, 14, 0.012, 8, false)
    );
    linkageGroup.add(new THREE.Mesh(chromeRamGeom, chromeMetalMat));

    const midLowerCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.04, 0.035),
      new THREE.Vector3(side * 0.05, -0.01, 0.068),
      new THREE.Vector3(side * 0.1, -0.05, 0.055),
      new THREE.Vector3(side * 0.12, -0.03, 0.025),
    ]);
    const midLowerGeom = track(
      new THREE.TubeGeometry(midLowerCurve, 18, 0.021, 10, false)
    );
    linkageGroup.add(new THREE.Mesh(midLowerGeom, blackChromeMat));

    const lowerForkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.01, -0.12, 0.03),
      new THREE.Vector3(side * 0.06, -0.1, 0.06),
      new THREE.Vector3(side * 0.11, -0.14, 0.04),
    ]);
    const lowerForkGeom = track(
      new THREE.TubeGeometry(lowerForkCurve, 14, 0.018, 10, false)
    );
    linkageGroup.add(new THREE.Mesh(lowerForkGeom, darkTitaniumMat));

    const knuckleCoords: [number, number, number, boolean][] = [
      [0.05, 0.18, 0.065, false],
      [0.09, 0.21, 0.048, true],
      [0.06, 0.08, 0.075, false],
      [0.11, 0.05, 0.055, true],
      [0.05, -0.03, 0.068, false],
      [0.1, -0.05, 0.055, false],
      [0.07, -0.13, 0.052, true],
      [0.11, -0.12, 0.042, false],
    ];
    for (const [kx, ky, kz, isChrome] of knuckleCoords) {
      const kSphere = new THREE.Mesh(
        isChrome ? microKnuckleGeom : knuckleSphereGeom,
        isChrome ? chromeMetalMat : blackChromeMat
      );
      kSphere.position.set(side * kx, ky, kz);
      linkageGroup.add(kSphere);

      const kRing = new THREE.Mesh(
        collarRingGeom,
        isChrome ? blackChromeMat : darkTitaniumMat
      );
      kRing.position.set(side * kx, ky, kz + 0.008);
      kRing.rotation.y = side * 0.45;
      kRing.rotation.x = 0.3;
      linkageGroup.add(kRing);
    }

    // Wishbone Linkage Pilot LEDs (matching knuckle ball-joints in image_bf6d6200.png)
    const wishboneLedGeom = track(new THREE.SphereGeometry(0.01, 8, 8));
    const wishboneLedCoords: [number, number, number, boolean][] = [
      [0.05, 0.18, 0.085, false],
      [0.09, 0.21, 0.068, true],
      [0.06, 0.08, 0.095, false],
      [0.11, 0.05, 0.075, true],
      [0.07, -0.13, 0.07, false],
    ];
    wishboneLedCoords.forEach(([kx, ky, kz, isRuby], idx) => {
      const wMat = track((isRuby ? rubyPilotMat : whitePilotMat).clone());
      const wLed = new THREE.Mesh(wishboneLedGeom, wMat);
      wLed.position.set(side * kx, ky, kz);
      linkageGroup.add(wLed);
      wishboneLedMeshes.push({ mesh: wLed, side, index: idx });
    });

    const damperBarrel = new THREE.Mesh(pistonBarrelGeom, blackChromeMat);
    damperBarrel.position.set(side * 0.11, -0.02, 0.095);
    damperBarrel.rotation.z = side * 0.52;
    thoraxGroup.add(damperBarrel);

    const damperShaft = new THREE.Mesh(pistonShaftGeom, chromeMetalMat);
    damperShaft.position.set(side * 0.13, 0.02, 0.1);
    damperShaft.rotation.z = side * 0.52;
    thoraxGroup.add(damperShaft);

    const sternalWallCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.085, -0.02, 0.185),
      new THREE.Vector3(side * 0.076, -0.16, 0.172),
      new THREE.Vector3(side * 0.065, -0.32, 0.155),
    ]);
    const sternalWallGeom = track(
      new THREE.TubeGeometry(sternalWallCurve, 16, 0.02, 10, false)
    );
    thoraxGroup.add(new THREE.Mesh(sternalWallGeom, blackChromeMat));

    const ribArch1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.075, -0.07, 0.165),
      new THREE.Vector3(side * 0.13, -0.11, 0.175),
      new THREE.Vector3(side * 0.14, -0.22, 0.15),
      new THREE.Vector3(side * 0.1, -0.26, 0.145),
      new THREE.Vector3(side * 0.065, -0.22, 0.16),
    ]);
    const ribGeom1 = track(new THREE.TubeGeometry(ribArch1, 22, 0.02, 10, false));
    thoraxGroup.add(new THREE.Mesh(ribGeom1, blackChromeMat));

    const ribArch2 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.068, -0.18, 0.155),
      new THREE.Vector3(side * 0.12, -0.24, 0.165),
      new THREE.Vector3(side * 0.13, -0.35, 0.14),
      new THREE.Vector3(side * 0.09, -0.37, 0.14),
      new THREE.Vector3(side * 0.058, -0.31, 0.155),
    ]);
    const ribGeom2 = track(new THREE.TubeGeometry(ribArch2, 22, 0.018, 10, false));
    thoraxGroup.add(new THREE.Mesh(ribGeom2, blackChromeMat));

    const ribArch3 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.06, -0.29, 0.145),
      new THREE.Vector3(side * 0.11, -0.35, 0.15),
      new THREE.Vector3(side * 0.1, -0.44, 0.13),
      new THREE.Vector3(side * 0.065, -0.42, 0.135),
    ]);
    const ribGeom3 = track(new THREE.TubeGeometry(ribArch3, 18, 0.015, 10, false));
    thoraxGroup.add(new THREE.Mesh(ribGeom3, darkTitaniumMat));

    const innerRibTube = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.09, -0.06, 0.145),
      new THREE.Vector3(side * 0.12, -0.21, 0.162),
      new THREE.Vector3(side * 0.11, -0.38, 0.135),
      new THREE.Vector3(side * 0.07, -0.46, 0.125),
    ]);
    const innerRibGeom = track(
      new THREE.TubeGeometry(innerRibTube, 18, 0.011, 8, false)
    );
    thoraxGroup.add(new THREE.Mesh(innerRibGeom, chromeMetalMat));
  }

  // --- 1D. Bionic Head, Compound Crimson Optical Pods & Bent-Elbow Antennae ---
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.495, 0.075);
  thoraxGroup.add(headGroup);

  const craniumGeom = track(new THREE.OctahedronGeometry(0.142, 2));
  craniumGeom.scale(1.22, 0.82, 0.92);
  const craniumMesh = new THREE.Mesh(craniumGeom, blackChromeMat);
  headGroup.add(craniumMesh);

  const frontalBulbGeom = track(new THREE.SphereGeometry(0.052, 18, 18));
  frontalBulbGeom.scale(1.08, 0.92, 1.05);
  const frontalBulbMesh = new THREE.Mesh(frontalBulbGeom, blackChromeMat);
  frontalBulbMesh.position.set(0, 0.005, 0.118);
  headGroup.add(frontalBulbMesh);

  const browNoduleGeom = track(new THREE.SphereGeometry(0.032, 16, 16));
  for (const side of [-1, 1] as const) {
    const nodule = new THREE.Mesh(browNoduleGeom, chromeMetalMat);
    nodule.position.set(side * 0.042, 0.052, 0.11);
    headGroup.add(nodule);
  }

  const eyeCupGeom = track(new THREE.SphereGeometry(0.068, 18, 18));
  eyeCupGeom.scale(0.92, 1.24, 0.95);
  const eyeDomeGeom = track(new THREE.SphereGeometry(0.058, 20, 20));
  eyeDomeGeom.scale(0.84, 1.26, 1.04);

  for (const side of [-1, 1] as const) {
    const eyeCup = new THREE.Mesh(eyeCupGeom, blackChromeMat);
    eyeCup.position.set(side * 0.112, 0.008, 0.065);
    eyeCup.rotation.z = -side * 0.14;
    headGroup.add(eyeCup);

    const eyeDome = new THREE.Mesh(eyeDomeGeom, crimsonLacquerMat);
    eyeDome.position.set(side * 0.124, 0.01, 0.088);
    eyeDome.rotation.z = -side * 0.14;
    headGroup.add(eyeDome);

    const templeBracketGeom = track(new THREE.BoxGeometry(0.022, 0.085, 0.045));
    const templeBracket = new THREE.Mesh(templeBracketGeom, darkTitaniumMat);
    templeBracket.position.set(side * 0.168, 0.015, 0.062);
    templeBracket.rotation.z = -side * 0.18;
    headGroup.add(templeBracket);
  }

  const mandibleGeomL = track(
    createPanelGeometry(
      [
        [0.018, 0.015],
        [0.075, 0.045],
        [0.058, 0.14],
        [0.018, 0.11],
      ],
      0.022,
      0.005,
      0.005,
      -1
    )
  );
  const mandibleGeomR = track(
    createPanelGeometry(
      [
        [0.018, 0.015],
        [0.075, 0.045],
        [0.058, 0.14],
        [0.018, 0.11],
      ],
      0.022,
      0.005,
      0.005,
      1
    )
  );
  const mandibleLeft = new THREE.Mesh(mandibleGeomL, chromeMetalMat);
  const mandibleRight = new THREE.Mesh(mandibleGeomR, chromeMetalMat);
  mandibleLeft.position.set(-0.025, -0.02, 0.075);
  mandibleRight.position.set(0.025, -0.02, 0.075);
  headGroup.add(mandibleLeft, mandibleRight);

  // Twin Bent-Elbow Metallic Antennae with Socket Collars & Knuckle Rings
  const createAntenna = (side: -1 | 1): THREE.Group => {
    const antGroup = new THREE.Group();
    antGroup.position.set(side * 0.054, 0.078, 0.08);

    const socketGeom = track(new THREE.CylinderGeometry(0.024, 0.032, 0.065, 12));
    const socketMesh = new THREE.Mesh(socketGeom, blackChromeMat);
    socketMesh.rotation.z = -side * 0.18;
    antGroup.add(socketMesh);

    const baseRingGeom = track(new THREE.TorusGeometry(0.024, 0.005, 8, 14));
    const baseRing = new THREE.Mesh(baseRingGeom, chromeMetalMat);
    baseRing.position.set(side * 0.006, 0.03, 0);
    baseRing.rotation.x = Math.PI / 2;
    antGroup.add(baseRing);

    const lowerCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.02, 0),
      new THREE.Vector3(side * 0.022, 0.11, 0.012),
      new THREE.Vector3(side * 0.042, 0.195, 0.022),
    ]);
    const lowerShaftGeom = track(
      new THREE.TubeGeometry(lowerCurve, 12, 0.014, 10, false)
    );
    antGroup.add(new THREE.Mesh(lowerShaftGeom, darkTitaniumMat));

    const elbowSphereGeom = track(new THREE.SphereGeometry(0.022, 12, 12));
    const elbowMesh = new THREE.Mesh(elbowSphereGeom, chromeMetalMat);
    elbowMesh.position.set(side * 0.042, 0.195, 0.022);
    antGroup.add(elbowMesh);

    const upperCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.042, 0.195, 0.022),
      new THREE.Vector3(side * 0.21, 0.36, 0.045),
      new THREE.Vector3(side * 0.4, 0.56, 0.07),
      new THREE.Vector3(side * 0.56, 0.78, 0.09),
    ]);
    const upperShaftGeom = track(
      new THREE.TubeGeometry(upperCurve, 20, 0.011, 8, false)
    );
    antGroup.add(new THREE.Mesh(upperShaftGeom, chromeMetalMat));

    const segRingGeom = track(new THREE.TorusGeometry(0.015, 0.004, 6, 12));
    for (const frac of [0.2, 0.45, 0.7, 0.9]) {
      const pt = upperCurve.getPoint(frac);
      const ring = new THREE.Mesh(segRingGeom, blackChromeMat);
      ring.position.copy(pt);
      ring.rotation.x = Math.PI / 2;
      ring.rotation.y = side * 0.6;
      antGroup.add(ring);
    }

    const tipGeom = track(new THREE.SphereGeometry(0.028, 14, 14));
    tipGeom.scale(1.15, 0.95, 1.0);
    const tipMesh = new THREE.Mesh(tipGeom, chromeMetalMat);
    tipMesh.position.set(side * 0.56, 0.78, 0.09);
    antGroup.add(tipMesh);

    return antGroup;
  };

  const antennaLeft = createAntenna(-1);
  const antennaRight = createAntenna(1);
  headGroup.add(antennaLeft, antennaRight);

  // --- 1E. 9-Segment Stepped Ladder Abdomen, Longitudinal Rails & Twin Needle Stingers ---
  const abdomenSegments: THREE.Group[] = [];
  let parentAbdomenNode: THREE.Object3D = thoraxGroup;
  const segCount = 9;
  let tailCaliperLeft!: THREE.Group;
  let tailCaliperRight!: THREE.Group;

  for (let i = 0; i < segCount; i++) {
    const segGroup = new THREE.Group();
    const t = i / (segCount - 1);
    segGroup.position.set(0, i === 0 ? -0.33 : -0.068, i === 0 ? 0.0 : -0.003);

    const segWidth = THREE.MathUtils.lerp(0.118, 0.066, t);
    const segHeight = 0.056;
    const segDepth = THREE.MathUtils.lerp(0.18, 0.095, t);

    const coreCylGeom = track(
      new THREE.CylinderGeometry(
        segWidth * 0.78,
        segWidth * 0.72,
        segHeight * 1.22,
        14
      )
    );
    coreCylGeom.scale(1.0, 1.0, segDepth / segWidth);
    const coreCylMesh = new THREE.Mesh(coreCylGeom, obsidianCarbonMat);
    segGroup.add(coreCylMesh);

    if (i < segCount - 1) {
      const ladderBarGeom = track(
        createPanelGeometry(
          [
            [-segWidth * 0.74, segHeight * 0.36],
            [segWidth * 0.74, segHeight * 0.36],
            [segWidth * 0.78, -segHeight * 0.36],
            [-segWidth * 0.78, -segHeight * 0.36],
          ],
          0.038,
          0.006,
          0.006
        )
      );
      const ladderBarMesh = new THREE.Mesh(
        ladderBarGeom,
        i % 2 === 0 ? blackChromeMat : darkTitaniumMat
      );
      ladderBarMesh.position.set(0, 0, segDepth * 0.44);
      ladderBarMesh.rotation.x = 0.16;
      segGroup.add(ladderBarMesh);

      // Ventral Ladder Armor Bar on Opposite Side (-Z)
      const ventralLadderBar = new THREE.Mesh(
        ladderBarGeom,
        i % 2 === 0 ? blackChromeMat : darkTitaniumMat
      );
      ventralLadderBar.position.set(0, 0, -segDepth * 0.44);
      ventralLadderBar.rotation.y = Math.PI;
      ventralLadderBar.rotation.x = -0.16;
      segGroup.add(ventralLadderBar);

      const louverPinGeom = track(
        new THREE.BoxGeometry(segWidth * 1.15, 0.011, 0.022)
      );
      const louverPin = new THREE.Mesh(louverPinGeom, darkTitaniumMat);
      louverPin.position.set(0, segHeight * 0.48, segDepth * 0.41);
      segGroup.add(louverPin);

      const vLouverPin = new THREE.Mesh(louverPinGeom, darkTitaniumMat);
      vLouverPin.position.set(0, segHeight * 0.48, -segDepth * 0.41);
      segGroup.add(vLouverPin);
    } else {
      const tailShieldGeom = track(
        createPanelGeometry(
          [
            [-segWidth * 0.88, segHeight * 0.5],
            [segWidth * 0.88, segHeight * 0.5],
            [segWidth * 0.95, -segHeight * 0.45],
            [0, -segHeight * 1.45],
            [-segWidth * 0.95, -segHeight * 0.45],
          ],
          0.044,
          0.008,
          0.008
        )
      );
      const tailShieldMesh = new THREE.Mesh(tailShieldGeom, blackChromeMat);
      tailShieldMesh.position.set(0, -0.02, segDepth * 0.42);
      segGroup.add(tailShieldMesh);

      const vTailShieldMesh = new THREE.Mesh(tailShieldGeom, blackChromeMat);
      vTailShieldMesh.position.set(0, -0.02, -segDepth * 0.42);
      vTailShieldMesh.rotation.y = Math.PI;
      segGroup.add(vTailShieldMesh);
    }

    for (const side of [-1, 1] as const) {
      const sideRailGeom = track(
        new THREE.CylinderGeometry(0.016, 0.015, segHeight * 1.18, 10)
      );
      const sideRail = new THREE.Mesh(sideRailGeom, blackChromeMat);
      sideRail.position.set(side * segWidth * 0.88, 0, segDepth * 0.38);
      segGroup.add(sideRail);

      // Ventral Side Rail
      const vSideRail = new THREE.Mesh(sideRailGeom, blackChromeMat);
      vSideRail.position.set(side * segWidth * 0.88, 0, -segDepth * 0.38);
      segGroup.add(vSideRail);

      const knuckleBeadGeom = track(new THREE.SphereGeometry(0.018, 10, 10));
      const knuckleBead = new THREE.Mesh(
        knuckleBeadGeom,
        i % 2 === 0 ? chromeMetalMat : blackChromeMat
      );
      knuckleBead.position.set(
        side * segWidth * 0.96,
        0,
        segDepth * 0.42
      );
      segGroup.add(knuckleBead);

      const vKnuckleBead = new THREE.Mesh(
        knuckleBeadGeom,
        i % 2 === 0 ? chromeMetalMat : blackChromeMat
      );
      vKnuckleBead.position.set(
        side * segWidth * 0.96,
        0,
        -segDepth * 0.42
      );
      segGroup.add(vKnuckleBead);
    }

    if (i === segCount - 1) {
      const buildStingerSide = (side: -1 | 1): THREE.Group => {
        const stingerGrp = new THREE.Group();
        stingerGrp.position.set(side * 0.021, -0.065, 0.025);

        const upperBlockGeom = track(new THREE.BoxGeometry(0.032, 0.052, 0.036));
        const upperBlock = new THREE.Mesh(upperBlockGeom, chromeMetalMat);
        upperBlock.position.set(0, -0.025, 0);
        stingerGrp.add(upperBlock);

        const seamCollarGeom = track(new THREE.BoxGeometry(0.035, 0.012, 0.038));
        const seamCollar = new THREE.Mesh(seamCollarGeom, obsidianCarbonMat);
        seamCollar.position.set(0, -0.055, 0);
        stingerGrp.add(seamCollar);

        const lowerBlockGeom = track(new THREE.BoxGeometry(0.03, 0.048, 0.034));
        const lowerBlock = new THREE.Mesh(lowerBlockGeom, chromeMetalMat);
        lowerBlock.position.set(0, -0.084, 0);
        stingerGrp.add(lowerBlock);

        const barbGeom = track(
          createPanelGeometry(
            [
              [0.004, -0.07],
              [0.032, -0.095],
              [0.016, -0.17],
              [0.004, -0.14],
            ],
            0.016,
            0.003,
            0.003,
            side
          )
        );
        const barbMesh = new THREE.Mesh(barbGeom, darkTitaniumMat);
        barbMesh.position.set(0, 0, -0.008);
        stingerGrp.add(barbMesh);

        const needleGeom = track(
          createPanelGeometry(
            [
              [0.002, -0.095],
              [0.018, -0.105],
              [0.013, -0.24],
              [0.005, -0.39],
              [0.001, -0.39],
            ],
            0.02,
            0.004,
            0.004,
            side
          )
        );
        const needleMesh = new THREE.Mesh(needleGeom, chromeMetalMat);
        needleMesh.position.set(-side * 0.01, 0, -0.01);
        stingerGrp.add(needleMesh);

        return stingerGrp;
      };

      tailCaliperLeft = buildStingerSide(-1);
      tailCaliperRight = buildStingerSide(1);
      segGroup.add(tailCaliperLeft, tailCaliperRight);
    }

    parentAbdomenNode.add(segGroup);
    abdomenSegments.push(segGroup);
    parentAbdomenNode = segGroup;
  }

  // ============================================================================
  // 2. RUGGED SYMMETRIC LEFT & RIGHT WING ASSEMBLIES (EXACT REFERENCE GEOMETRY)
  // ============================================================================

  const boltGeom = track(new THREE.CylinderGeometry(0.018, 0.018, 0.075, 8));
  boltGeom.rotateX(Math.PI / 2);

  // Prominent 3D Silver Dome / Countersunk Fastener Studs on White Ceramic Plates
  const countersunkScrewGeom = track(
    new THREE.CylinderGeometry(0.025, 0.016, 0.068, 16)
  );
  countersunkScrewGeom.rotateX(Math.PI / 2);

  // Ventral Screws with head facing outward towards -Z
  const ventralScrewGeom = track(
    new THREE.CylinderGeometry(0.025, 0.016, 0.068, 16)
  );
  ventralScrewGeom.rotateX(-Math.PI / 2);

  const hingeBarrelGeom = track(
    new THREE.CylinderGeometry(0.018, 0.018, 0.14, 10)
  );

  const wingPinionGearGeom = track(
    createMechanicalGearGeometry(0.11, 0.04, 12, 0.024)
  );

  const foreBoltCoords: [number, number][] = [
    [1.86, 1.62], [2.18, 1.84], [2.48, 1.98], [2.68, 2.02],
    [2.78, 1.82], [2.72, 1.58], [2.6, 1.3], [2.48, 0.98],
    [2.4, 0.68], [2.34, 0.38], [2.26, 0.12], [2.04, -0.04],
    [1.76, -0.1], [1.44, -0.08],
  ];

  const hindBoltCoords: [number, number][] = [
    [0.86, -0.34], [1.14, -0.52], [1.42, -0.78], [1.56, -0.98],
    [1.44, -1.28], [1.3, -1.62], [1.08, -1.94], [0.84, -2.18],
  ];

  const createWingSide = (side: -1 | 1): ArticulatedWingRig => {
    const rootGroup = new THREE.Group();
    const wingGears: { mesh: THREE.Mesh; speedRatio: number }[] = [];

    // 1A. Full Forewing Dark Carbon-Weave Base Chassis (continuous sweeping curved aerodynamic silhouette)
    const foreCarbonBedGeom = track(
      createPanelGeometry(
        [
          [0.22, 0.22],
          [0.46, 0.44],
          [0.76, 0.72],
          [1.1, 1.02],
          [1.48, 1.32],
          [1.86, 1.6],
          [2.22, 1.84],
          [2.48, 1.98],
          [2.65, 2.05],
          [2.74, 2.02],
          [2.8, 1.94],
          [2.82, 1.82],
          [2.78, 1.68],
          [2.7, 1.54],
          [2.61, 1.36],
          [2.52, 1.16],
          [2.45, 0.94],
          [2.39, 0.72],
          [2.35, 0.5],
          [2.33, 0.32],
          [2.28, 0.14],
          [2.16, -0.02],
          [1.96, -0.12],
          [1.7, -0.12],
          [1.38, -0.08],
          [1.02, -0.03],
          [0.68, 0.03],
          [0.38, 0.08],
          [0.22, 0.16],
        ],
        0.028,
        0.008,
        0.008,
        side
      )
    );

    // 1B. Swept S-Curved Outer-Margin Brushed Grey-Titanium Rim Exoskeleton (#52565E)
    // Leaves the recessed outer-margin mechanical bay (x = 1.92..2.32, y = 0.04..1.10) open & deep!
    const foreOuterRimGeom = track(
      createPanelGeometry(
        [
          [2.48, 1.98],
          [2.65, 2.05],
          [2.74, 2.02],
          [2.8, 1.94],
          [2.82, 1.82],
          [2.78, 1.68],
          [2.7, 1.54],
          [2.61, 1.36],
          [2.52, 1.16],
          [2.45, 0.94],
          [2.39, 0.72],
          [2.35, 0.5],
          [2.33, 0.32],
          [2.28, 0.14],
          [2.16, -0.02],
          [1.96, -0.12],
          [1.7, -0.12],
          [1.78, -0.01],
          [2.02, 0.06],
          [2.15, 0.22],
          [2.22, 0.48],
          [2.28, 0.78],
          [2.36, 1.1],
          [2.44, 1.4],
          [2.52, 1.68],
          [2.54, 1.88],
        ],
        0.042,
        0.012,
        0.012,
        side
      )
    );

    // 1C. Upper-Leading Brushed Grey-Titanium Rim Spar (sweeps along the costal convex arc)
    const foreLeadingRimGeom = track(
      createPanelGeometry(
        [
          [1.08, 1.0],
          [1.44, 1.3],
          [1.84, 1.58],
          [2.22, 1.84],
          [2.48, 1.98],
          [2.56, 1.84],
          [2.32, 1.7],
          [1.96, 1.45],
          [1.58, 1.2],
          [1.18, 0.92],
        ],
        0.042,
        0.01,
        0.01,
        side
      )
    );

    // 1D. Sculpted Brushed Silver-Titanium Wingtip Apex Hood Canopy Cap
    const foreWingtipArchGeom = track(
      createPanelGeometry(
        [
          [2.36, 1.88],
          [2.52, 2.0],
          [2.68, 2.05],
          [2.78, 1.96],
          [2.76, 1.68],
          [2.6, 1.56],
          [2.55, 1.78],
          [2.42, 1.78],
        ],
        0.048,
        0.012,
        0.012,
        side
      )
    );

    // 1E. Forewing Inner Costal Leading-Edge Black-Chrome & Carbon Spar
    const foreCostalSparGeom = track(
      createPanelGeometry(
        [
          [0.22, 0.22],
          [0.48, 0.46],
          [0.78, 0.74],
          [1.16, 1.06],
          [1.26, 0.96],
          [0.86, 0.64],
          [0.54, 0.38],
          [0.26, 0.15],
        ],
        0.044,
        0.01,
        0.01,
        side
      )
    );

    // 2. Forewing White Ceramic Plate 1: Upper-Outer Wingtip Teardrop / Scalloped Shroud
    const forePlate1Geom = track(
      createPanelGeometry(
        [
          [1.96, 1.56],
          [2.18, 1.72],
          [2.38, 1.84],
          [2.5, 1.8],
          [2.52, 1.66],
          [2.46, 1.48],
          [2.36, 1.42],
          [2.3, 1.5],
          [2.18, 1.52],
          [2.06, 1.46],
        ],
        0.048,
        0.01,
        0.01,
        side
      )
    );

    // 3. Forewing White Ceramic Plate 2: Main Upper Swept Convex Shield Armor Plate
    const forePlate2Geom = track(
      createPanelGeometry(
        [
          [0.36, 0.24],
          [0.66, 0.52],
          [1.02, 0.82],
          [1.42, 1.14],
          [1.8, 1.42],
          [1.96, 1.48],
          [2.16, 1.38],
          [2.24, 1.28],
          [2.22, 1.16],
          [2.12, 1.08],
          [1.66, 0.78],
          [1.2, 0.48],
          [0.72, 0.24],
          [0.44, 0.15],
        ],
        0.048,
        0.012,
        0.012,
        side
      )
    );

    // 4. Forewing White Ceramic Plate 3: Lower Swept Technical Plate (with D-42 & Barcode)
    const forePlate3Geom = track(
      createPanelGeometry(
        [
          [0.54, 0.12],
          [1.04, 0.42],
          [1.54, 0.7],
          [2.04, 0.98],
          [2.02, 0.72],
          [1.94, 0.44],
          [1.84, 0.18],
          [1.76, 0.04],
          [1.5, -0.06],
          [1.18, -0.04],
          [0.82, -0.01],
          [0.54, 0.04],
        ],
        0.048,
        0.012,
        0.012,
        side
      )
    );

    // 5. Forewing White Ceramic Plate 4: Inner Wing-Root Humeral Lobe
    const forePlate4Geom = track(
      createPanelGeometry(
        [
          [0.18, 0.06],
          [0.32, 0.14],
          [0.42, 0.08],
          [0.36, -0.02],
          [0.2, -0.01],
        ],
        0.05,
        0.009,
        0.009,
        side
      )
    );

    // Dedicated Ventral Forewing Panel Geometries (Outward-facing beveled caps towards -Z)
    const forePlate1VentralGeom = track(
      createVentralPanelGeometry(
        [
          [1.96, 1.56],
          [2.18, 1.72],
          [2.38, 1.84],
          [2.5, 1.8],
          [2.52, 1.66],
          [2.46, 1.48],
          [2.36, 1.42],
          [2.3, 1.5],
          [2.18, 1.52],
          [2.06, 1.46],
        ],
        0.034,
        0.008,
        0.008,
        side
      )
    );

    const forePlate2VentralGeom = track(
      createVentralPanelGeometry(
        [
          [0.36, 0.24],
          [0.66, 0.52],
          [1.02, 0.82],
          [1.42, 1.14],
          [1.8, 1.42],
          [1.96, 1.48],
          [2.16, 1.38],
          [2.24, 1.28],
          [2.22, 1.16],
          [2.12, 1.08],
          [1.66, 0.78],
          [1.2, 0.48],
          [0.72, 0.24],
          [0.44, 0.15],
        ],
        0.036,
        0.008,
        0.008,
        side
      )
    );

    const forePlate3VentralGeom = track(
      createVentralPanelGeometry(
        [
          [0.54, 0.12],
          [1.04, 0.42],
          [1.54, 0.7],
          [2.04, 0.98],
          [2.02, 0.72],
          [1.94, 0.44],
          [1.84, 0.18],
          [1.76, 0.04],
          [1.5, -0.06],
          [1.18, -0.04],
          [0.82, -0.01],
          [0.54, 0.04],
        ],
        0.036,
        0.008,
        0.008,
        side
      )
    );

    const forePlate4VentralGeom = track(
      createVentralPanelGeometry(
        [
          [0.18, 0.06],
          [0.32, 0.14],
          [0.42, 0.08],
          [0.36, -0.02],
          [0.2, -0.01],
        ],
        0.036,
        0.008,
        0.008,
        side
      )
    );

    const foreOuterRimVentralGeom = track(
      createVentralPanelGeometry(
        [
          [2.48, 1.98],
          [2.65, 2.05],
          [2.74, 2.02],
          [2.8, 1.94],
          [2.82, 1.82],
          [2.78, 1.68],
          [2.7, 1.54],
          [2.61, 1.36],
          [2.52, 1.16],
          [2.45, 0.94],
          [2.39, 0.72],
          [2.35, 0.5],
          [2.33, 0.32],
          [2.28, 0.14],
          [2.16, -0.02],
          [1.96, -0.12],
          [1.7, -0.12],
          [1.78, -0.01],
          [2.02, 0.06],
          [2.15, 0.22],
          [2.22, 0.48],
          [2.28, 0.78],
          [2.36, 1.1],
          [2.44, 1.4],
          [2.52, 1.68],
          [2.54, 1.88],
        ],
        0.034,
        0.008,
        0.008,
        side
      )
    );

    const foreLeadingRimVentralGeom = track(
      createVentralPanelGeometry(
        [
          [1.08, 1.0],
          [1.44, 1.3],
          [1.84, 1.58],
          [2.22, 1.84],
          [2.48, 1.98],
          [2.56, 1.84],
          [2.32, 1.7],
          [1.96, 1.45],
          [1.58, 1.2],
          [1.18, 0.92],
        ],
        0.034,
        0.008,
        0.008,
        side
      )
    );

    // --- Assemble Forewing Hierarchy ---
    const forewingGroup = new THREE.Group();
    forewingGroup.position.set(side * 0.21, 0.16, 0.02);
    rootGroup.add(forewingGroup);

    const foreBedMesh = new THREE.Mesh(foreCarbonBedGeom, obsidianCarbonMat);
    foreBedMesh.position.z = -0.014;
    forewingGroup.add(foreBedMesh);

    const foreOuterRimMesh = new THREE.Mesh(foreOuterRimGeom, titaniumRimMat);
    foreOuterRimMesh.position.z = -0.008;
    forewingGroup.add(foreOuterRimMesh);

    // Ventral Titanium Outer Rim & Leading Spar on Opposite Side (-Z)
    const foreOuterRimMeshVentral = new THREE.Mesh(
      foreOuterRimVentralGeom,
      titaniumRimMat
    );
    foreOuterRimMeshVentral.position.z = -0.016;
    forewingGroup.add(foreOuterRimMeshVentral);

    const foreLeadingRimMesh = new THREE.Mesh(
      foreLeadingRimGeom,
      titaniumRimMat
    );
    foreLeadingRimMesh.position.z = -0.008;
    forewingGroup.add(foreLeadingRimMesh);

    const foreLeadingRimMeshVentral = new THREE.Mesh(
      foreLeadingRimVentralGeom,
      titaniumRimMat
    );
    foreLeadingRimMeshVentral.position.z = -0.016;
    forewingGroup.add(foreLeadingRimMeshVentral);

    const foreTipArchMesh = new THREE.Mesh(
      foreWingtipArchGeom,
      titaniumTipArchMat
    );
    foreTipArchMesh.position.z = 0.004;
    forewingGroup.add(foreTipArchMesh);

    // Wingtip Aeronautical Navigation Strobe (Port Red / Starboard Green)
    const navStrobeGeom = track(new THREE.SphereGeometry(0.024, 10, 8));
    const navMat = track((side < 0 ? rubyPilotMat : greenPilotMat).clone());
    const navMesh = new THREE.Mesh(navStrobeGeom, navMat);
    navMesh.position.set(side * 2.68, 1.76, 0.03);
    forewingGroup.add(navMesh);
    navStrobeMeshes.push({ mesh: navMesh, isLeft: side < 0 });

    const foreCostalSparMesh = new THREE.Mesh(
      foreCostalSparGeom,
      blackChromeMat
    );
    foreCostalSparMesh.position.z = 0.004;
    forewingGroup.add(foreCostalSparMesh);

    // Segment Seam Grooves across the Grey-Titanium Outer Rim
    const rimSeamBarGeom = track(new THREE.BoxGeometry(0.24, 0.012, 0.048));
    const rimSeamCoords: [number, number, number][] = [
      [2.56, 1.48, -0.32],
      [2.44, 1.04, -0.28],
      [2.36, 0.6, -0.32],
      [2.22, 0.18, -0.55],
      [1.98, -0.04, -0.72],
    ];
    for (const [sx, sy, srot] of rimSeamCoords) {
      const seamBar = new THREE.Mesh(rimSeamBarGeom, obsidianCarbonMat);
      seamBar.position.set(side * sx, sy, 0.01);
      seamBar.rotation.z = side * srot;
      forewingGroup.add(seamBar);
    }

    // Exposed Outer-Margin Mechanical Bay (between lower white plate and grey-titanium outer rim)
    const outerBayPipeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 2.18, 1.04, 0.004),
      new THREE.Vector3(side * 2.12, 0.64, 0.016),
      new THREE.Vector3(side * 2.02, 0.28, 0.016),
      new THREE.Vector3(side * 1.82, 0.02, 0.006),
    ]);
    const outerBayPipeGeom = track(
      new THREE.TubeGeometry(outerBayPipeCurve, 18, 0.024, 10, false)
    );
    forewingGroup.add(new THREE.Mesh(outerBayPipeGeom, blackChromeMat));

    const outerBayRodCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 2.12, 0.92, 0.02),
      new THREE.Vector3(side * 2.05, 0.54, 0.024),
      new THREE.Vector3(side * 1.94, 0.18, 0.02),
    ]);
    const outerBayRodGeom = track(
      new THREE.TubeGeometry(outerBayRodCurve, 14, 0.011, 8, false)
    );
    forewingGroup.add(new THREE.Mesh(outerBayRodGeom, chromeMetalMat));

    const outerBayKnuckleGeom = track(new THREE.SphereGeometry(0.028, 12, 10));
    const outerBaySleeveGeom = track(
      new THREE.CylinderGeometry(0.018, 0.018, 0.095, 10)
    );
    const outerBayKnucklePts: [number, number, number][] = [
      [2.12, 0.84, -0.24],
      [2.05, 0.54, -0.28],
      [1.96, 0.24, -0.36],
    ];
    for (const [kx, ky, krot] of outerBayKnucklePts) {
      const knuckle = new THREE.Mesh(outerBayKnuckleGeom, blackChromeMat);
      knuckle.position.set(side * kx, ky, 0.02);
      forewingGroup.add(knuckle);

      const sleeve = new THREE.Mesh(outerBaySleeveGeom, titaniumRimMat);
      sleeve.position.set(side * (kx - 0.03), ky - 0.02, 0.018);
      sleeve.rotation.z = side * krot;
      forewingGroup.add(sleeve);
    }

    // Diagonal Mechanical Seam Trench Hardware (between upper and lower white forewing plates)
    const diagTrenchBarCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.46, 0.12, 0.008),
      new THREE.Vector3(side * 1.06, 0.44, 0.016),
      new THREE.Vector3(side * 1.66, 0.78, 0.016),
      new THREE.Vector3(side * 2.12, 1.06, 0.01),
    ]);
    const diagTrenchBarGeom = track(
      new THREE.TubeGeometry(diagTrenchBarCurve, 20, 0.02, 10, false)
    );
    forewingGroup.add(new THREE.Mesh(diagTrenchBarGeom, blackChromeMat));

    const diagChromeShaftCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.52, 0.15, 0.022),
      new THREE.Vector3(side * 1.35, 0.61, 0.026),
      new THREE.Vector3(side * 2.1, 1.04, 0.02),
    ]);
    const diagChromeShaftGeom = track(
      new THREE.TubeGeometry(diagChromeShaftCurve, 16, 0.01, 8, false)
    );
    forewingGroup.add(new THREE.Mesh(diagChromeShaftGeom, chromeMetalMat));

    // Exposed Hinge Barrels & Black-Chrome Clamps along the Diagonal Forewing Trench & Upper Notch
    const seamHingeCoords: [number, number, number][] = [
      [0.72, 0.24, -0.96],
      [1.08, 0.44, -0.96],
      [1.44, 0.64, -0.96],
      [1.78, 0.84, -0.96],
      [2.02, 0.98, -0.96],
      [2.08, 1.38, -0.82],
    ];
    for (const [hx, hy, rotZ] of seamHingeCoords) {
      const barrel = new THREE.Mesh(hingeBarrelGeom, chromeMetalMat);
      barrel.position.set(side * hx, hy, 0.022);
      barrel.rotation.z = side * rotZ;
      forewingGroup.add(barrel);
    }

    // Internal Wing Root & Mid-Span Escapement Gears (recessed in dark titanium)
    const wingGearCoords: [number, number, number][] = [
      [0.52, 0.16, 1.2],
      [1.22, 0.48, -1.4],
      [1.72, 0.78, 1.6],
      [2.12, 0.68, -1.8],
    ];
    for (const [gx, gy, ratio] of wingGearCoords) {
      const wg = new THREE.Mesh(wingPinionGearGeom, darkTitaniumMat);
      wg.position.set(side * gx, gy, -0.004);
      forewingGroup.add(wg);
      wingGears.push({ mesh: wg, speedRatio: side * ratio });
    }

    // 3 Articulated Outer-Margin Aero-Flap Louvers
    const aeroFlaps: THREE.Group[] = [];
    const flapGeom = track(new THREE.BoxGeometry(0.08, 0.24, 0.028));
    const flapLocations: [number, number, number][] = [
      [2.54, 1.34, -0.32],
      [2.44, 0.94, -0.28],
      [2.36, 0.48, -0.36],
    ];
    for (const [fx, fy, frot] of flapLocations) {
      const flapGroup = new THREE.Group();
      flapGroup.position.set(side * fx, fy, 0.012);
      flapGroup.rotation.z = side * frot;
      const flapMesh = new THREE.Mesh(flapGeom, darkTitaniumMat);
      flapGroup.add(flapMesh);
      forewingGroup.add(flapGroup);
      aeroFlaps.push(flapGroup);
    }

    // Instanced Perimeter Hex Bolts on Forewing Grey-Titanium Frame
    const foreBolts = new THREE.InstancedMesh(
      boltGeom,
      chromeMetalMat,
      foreBoltCoords.length
    );
    const dummy = new THREE.Object3D();
    foreBoltCoords.forEach(([bx, by], idx) => {
      dummy.position.set(side * bx, by, 0.018);
      dummy.updateMatrix();
      foreBolts.setMatrixAt(idx, dummy.matrix);
    });
    foreBolts.instanceMatrix.needsUpdate = true;
    foreBolts.computeBoundingSphere();
    forewingGroup.add(foreBolts);

    // 4 Articulated White Ceramic Sub-Plates on Forewing Front Face
    const forePlateConfigs = [
      {
        geom: forePlate1Geom,
        mat: ceramicMaterial,
        slideDir: new THREE.Vector3(side * 0.14, 0.2, 0.045),
        inPlaneRotSign: side * 0.07,
        screws: [
          [2.14, 1.58],
          [2.4, 1.72],
        ] as [number, number][],
      },
      {
        geom: forePlate2Geom,
        mat: ceramicMaterial,
        slideDir: new THREE.Vector3(side * 0.2, 0.1, 0.06),
        inPlaneRotSign: -side * 0.05,
        screws: [
          [0.48, 0.22],
          [1.16, 0.58],
          [1.76, 1.26],
          [2.08, 1.18],
        ] as [number, number][],
      },
      {
        geom: forePlate3Geom,
        mat: ceramicLowerForewingMaterial,
        slideDir: new THREE.Vector3(side * 0.16, -0.14, 0.055),
        inPlaneRotSign: -side * 0.09,
        screws: [
          [0.88, 0.22],
          [1.78, 0.74],
          [1.68, 0.18],
        ] as [number, number][],
      },
      {
        geom: forePlate4Geom,
        mat: ceramicMaterial,
        slideDir: new THREE.Vector3(side * 0.05, 0.05, 0.035),
        inPlaneRotSign: side * 0.05,
        screws: [[0.28, 0.05]] as [number, number][],
      },
    ];

    const latchGeom = track(new THREE.BoxGeometry(0.095, 0.036, 0.068));

    const forePlates = forePlateConfigs.map((cfg, idx) => {
      const grp = new THREE.Group();
      const basePos = new THREE.Vector3(0, 0, 0.012 + idx * 0.002);
      grp.position.copy(basePos);
      const mesh = new THREE.Mesh(cfg.geom, cfg.mat);
      grp.add(mesh);

      for (const [sx, sy] of cfg.screws) {
        const screw = new THREE.Mesh(countersunkScrewGeom, chromeMetalMat);
        screw.position.set(side * sx, sy, 0.028);
        grp.add(screw);
      }

      if (idx === 1) {
        for (const [lx, ly] of [
          [0.98, 0.54],
          [1.44, 0.88],
          [1.82, 1.22],
        ] as [number, number][]) {
          const latch = new THREE.Mesh(latchGeom, blackChromeMat);
          latch.position.set(side * lx, ly, 0.028);
          latch.rotation.z = side * 0.52;
          grp.add(latch);
        }
      }

      forewingGroup.add(grp);
      return {
        group: grp,
        basePos,
        slideDir: cfg.slideDir,
        inPlaneRotSign: cfg.inPlaneRotSign,
      };
    });

    // Ventral White Ceramic Armor Plates on Opposite Side (-Z)
    const forePlateConfigsVentral = [
      {
        geom: forePlate1VentralGeom,
        mat: ceramicMaterial,
        slideDir: new THREE.Vector3(side * 0.14, 0.2, -0.045),
        inPlaneRotSign: side * 0.07,
        screws: [
          [2.14, 1.58],
          [2.4, 1.72],
        ] as [number, number][],
        zPos: -0.02,
      },
      {
        geom: forePlate2VentralGeom,
        mat: ceramicMaterial,
        slideDir: new THREE.Vector3(side * 0.2, 0.1, -0.06),
        inPlaneRotSign: -side * 0.05,
        screws: [
          [0.48, 0.22],
          [1.16, 0.58],
          [1.76, 1.26],
          [2.08, 1.18],
        ] as [number, number][],
        zPos: -0.022,
      },
      {
        geom: forePlate3VentralGeom,
        mat: ceramicLowerForewingMaterial,
        slideDir: new THREE.Vector3(side * 0.16, -0.14, -0.055),
        inPlaneRotSign: -side * 0.09,
        screws: [
          [0.88, 0.22],
          [1.78, 0.74],
          [1.68, 0.18],
        ] as [number, number][],
        zPos: -0.021,
      },
      {
        geom: forePlate4VentralGeom,
        mat: ceramicMaterial,
        slideDir: new THREE.Vector3(side * 0.05, 0.05, -0.035),
        inPlaneRotSign: side * 0.05,
        screws: [[0.28, 0.05]] as [number, number][],
        zPos: -0.019,
      },
    ];

    for (const cfg of forePlateConfigsVentral) {
      const vGrp = new THREE.Group();
      const basePos = new THREE.Vector3(0, 0, cfg.zPos);
      vGrp.position.copy(basePos);
      const vMesh = new THREE.Mesh(cfg.geom, cfg.mat);
      vGrp.add(vMesh);

      for (const [sx, sy] of cfg.screws) {
        const vScrew = new THREE.Mesh(ventralScrewGeom, chromeMetalMat);
        vScrew.position.set(side * sx, sy, -0.034);
        vGrp.add(vScrew);
      }

      forewingGroup.add(vGrp);
      forePlates.push({
        group: vGrp,
        basePos,
        slideDir: cfg.slideDir,
        inPlaneRotSign: cfg.inPlaneRotSign,
      });
    }

    // Dual Telescoping Hydraulic Piston Rods linking Thorax to Forewing Root
    const pistonGeom = track(
      new THREE.CylinderGeometry(0.024, 0.028, 0.54, 12)
    );
    const pistonRod = new THREE.Mesh(pistonGeom, chromeMetalMat);
    pistonRod.position.set(side * 0.36, 0.14, 0.032);
    pistonRod.rotation.z = -side * 1.15;
    forewingGroup.add(pistonRod);

    const secPistonGeom = track(
      new THREE.CylinderGeometry(0.018, 0.022, 0.44, 10)
    );
    const secondaryPistonRod = new THREE.Mesh(secPistonGeom, blackChromeMat);
    secondaryPistonRod.position.set(side * 0.32, 0.03, 0.038);
    secondaryPistonRod.rotation.z = -side * 1.42;
    forewingGroup.add(secondaryPistonRod);

    // Ventral Telescoping Hydraulic Piston Rods on Opposite Side (-Z)
    const vPistonRod = new THREE.Mesh(pistonGeom, chromeMetalMat);
    vPistonRod.position.set(side * 0.36, 0.14, -0.024);
    vPistonRod.rotation.z = -side * 1.15;
    forewingGroup.add(vPistonRod);

    const vSecPistonRod = new THREE.Mesh(secPistonGeom, blackChromeMat);
    vSecPistonRod.position.set(side * 0.32, 0.03, -0.028);
    vSecPistonRod.rotation.z = -side * 1.42;
    forewingGroup.add(vSecPistonRod);

    // ==========================================================================
    // HINDWING ASSEMBLY (EXACT SCALLOPED STEALTH FRAME, 3 WHITE PLATES & RED VENTS)
    // ==========================================================================
    const hindFrameGeom = track(
      createPanelGeometry(
        [
          [0.12, -0.02],
          [0.64, -0.18],
          [1.08, -0.42],
          [1.42, -0.68],
          [1.64, -0.96],
          [1.58, -1.08],
          [1.46, -1.16],
          [1.38, -1.48],
          [1.2, -1.86],
          [0.92, -2.26],
          [0.74, -2.38],
          [0.62, -2.22],
          [0.44, -1.62],
          [0.22, -0.88],
          [0.12, -0.26],
        ],
        0.032,
        0.012,
        0.012,
        side
      )
    );

    // Woven Carbon-Fiber Protrusion Pad on Outer Hindwing Corner (x = 1.38..1.64, y = -0.78..-1.12)
    const hindCarbonCornerGeom = track(
      createPanelGeometry(
        [
          [1.36, -0.72],
          [1.63, -0.95],
          [1.57, -1.08],
          [1.42, -1.14],
          [1.32, -0.96],
        ],
        0.042,
        0.008,
        0.008,
        side
      )
    );

    // Hindwing White Ceramic Plate 1: Middle-Outer Triangular Plate (x = 0.62..1.08, y = -0.46..-1.18)
    const hindPlate1Geom = track(
      createPanelGeometry(
        [
          [0.64, -0.46],
          [0.92, -0.58],
          [1.08, -0.88],
          [0.92, -1.16],
          [0.78, -0.94],
          [0.62, -0.58],
        ],
        0.048,
        0.011,
        0.011,
        side
      )
    );

    // Hindwing White Ceramic Plate 2: Long Inner Longitudinal Blade (x = 0.32..0.78, y = -0.28..-1.68)
    const hindPlate2Geom = track(
      createPanelGeometry(
        [
          [0.36, -0.28],
          [0.56, -0.46],
          [0.74, -0.88],
          [0.78, -1.18],
          [0.64, -1.66],
          [0.54, -1.68],
          [0.42, -1.14],
          [0.28, -0.46],
        ],
        0.048,
        0.012,
        0.012,
        side
      )
    );

    // Hindwing White Ceramic Plate 3: Upper-Inner Wing-Root Notched Collar Lobe (x = 0.16..0.58, y = -0.01..-0.38)
    const hindPlate3Geom = track(
      createPanelGeometry(
        [
          [0.18, -0.01],
          [0.46, -0.06],
          [0.58, -0.18],
          [0.44, -0.34],
          [0.24, -0.28],
          [0.16, -0.16],
          [0.22, -0.08],
        ],
        0.05,
        0.01,
        0.01,
        side
      )
    );

    // Upper Diagonal Scarlet-Red Slot Vent on Outer Hindwing (sleek tapered diagonal blade)
    const hindPlasmaVent1Geom = track(
      createPanelGeometry(
        [
          [0.96, -0.45],
          [1.36, -0.8],
          [1.32, -0.88],
          [0.92, -0.53],
        ],
        0.046,
        0.006,
        0.006,
        side
      )
    );

    // Secondary Thin Parallel Scarlet-Red Slit beside Upper Vent
    const hindPlasmaSlitGeom = track(
      createPanelGeometry(
        [
          [1.14, -0.74],
          [1.36, -0.94],
          [1.33, -0.98],
          [1.11, -0.78],
        ],
        0.044,
        0.004,
        0.004,
        side
      )
    );

    // Lower Vertical Scarlet-Red Capsule Vent on Outer Hindwing (x = 1.18..1.28, y = -1.04..-1.40)
    const hindPlasmaVent2Geom = track(
      createPanelGeometry(
        [
          [1.18, -1.04],
          [1.27, -1.06],
          [1.26, -1.4],
          [1.17, -1.38],
        ],
        0.048,
        0.008,
        0.008,
        side
      )
    );

    const hindwingGroup = new THREE.Group();
    hindwingGroup.position.set(side * 0.17, -0.08, -0.02);
    rootGroup.add(hindwingGroup);

    const hindFrameMesh = new THREE.Mesh(hindFrameGeom, darkGunmetalHindMat);
    hindFrameMesh.position.z = -0.013;
    hindwingGroup.add(hindFrameMesh);

    // Dedicated Ventral Hindwing Geometries with outward facing beveled caps towards -Z
    const hindPlate1VentralGeom = track(
      createVentralPanelGeometry(
        [
          [0.64, -0.46],
          [0.92, -0.58],
          [1.08, -0.88],
          [0.92, -1.16],
          [0.78, -0.94],
          [0.62, -0.58],
        ],
        0.036,
        0.009,
        0.009,
        side
      )
    );

    const hindPlate2VentralGeom = track(
      createVentralPanelGeometry(
        [
          [0.36, -0.28],
          [0.56, -0.46],
          [0.74, -0.88],
          [0.78, -1.18],
          [0.64, -1.66],
          [0.54, -1.68],
          [0.42, -1.14],
          [0.28, -0.46],
        ],
        0.036,
        0.009,
        0.009,
        side
      )
    );

    const hindPlate3VentralGeom = track(
      createVentralPanelGeometry(
        [
          [0.18, -0.01],
          [0.46, -0.06],
          [0.58, -0.18],
          [0.44, -0.34],
          [0.24, -0.28],
          [0.16, -0.16],
          [0.22, -0.08],
        ],
        0.038,
        0.008,
        0.008,
        side
      )
    );

    const hindPlasmaVent1VentralGeom = track(
      createVentralPanelGeometry(
        [
          [0.96, -0.45],
          [1.36, -0.8],
          [1.32, -0.88],
          [0.92, -0.53],
        ],
        0.032,
        0.006,
        0.006,
        side
      )
    );

    const hindPlasmaSlitVentralGeom = track(
      createVentralPanelGeometry(
        [
          [1.14, -0.74],
          [1.36, -0.94],
          [1.33, -0.98],
          [1.11, -0.78],
        ],
        0.03,
        0.004,
        0.004,
        side
      )
    );

    const hindPlasmaVent2VentralGeom = track(
      createVentralPanelGeometry(
        [
          [1.18, -1.04],
          [1.27, -1.06],
          [1.26, -1.4],
          [1.17, -1.38],
        ],
        0.034,
        0.007,
        0.007,
        side
      )
    );

    const hindCarbonCornerMesh = new THREE.Mesh(
      hindCarbonCornerGeom,
      obsidianCarbonMat
    );
    hindCarbonCornerMesh.position.z = -0.01;
    hindwingGroup.add(hindCarbonCornerMesh);

    const hindCarbonCornerVentralGeom = track(
      createVentralPanelGeometry(
        [
          [1.36, -0.72],
          [1.63, -0.95],
          [1.57, -1.08],
          [1.42, -1.14],
          [1.32, -0.96],
        ],
        0.034,
        0.008,
        0.008,
        side
      )
    );
    const hindCarbonCornerMeshVentral = new THREE.Mesh(
      hindCarbonCornerVentralGeom,
      obsidianCarbonMat
    );
    hindCarbonCornerMeshVentral.position.z = -0.016;
    hindwingGroup.add(hindCarbonCornerMeshVentral);

    // Sculpted Black-Chrome Outer Hindwing Structural Ribs & Bezel Surrounds
    const outerHindArchCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.72, -0.22, 0.012),
      new THREE.Vector3(side * 1.12, -0.44, 0.02),
      new THREE.Vector3(side * 1.44, -0.76, 0.018),
      new THREE.Vector3(side * 1.38, -1.18, 0.016),
      new THREE.Vector3(side * 1.12, -1.78, 0.012),
      new THREE.Vector3(side * 0.76, -2.32, 0.008),
    ]);
    const outerHindArchGeom = track(
      new THREE.TubeGeometry(outerHindArchCurve, 26, 0.024, 10, false)
    );
    hindwingGroup.add(new THREE.Mesh(outerHindArchGeom, blackChromeMat));

    // Seam Trench Linkages between HindPlate1 and HindPlate2
    const hindSeamCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.56, -0.42, 0.014),
      new THREE.Vector3(side * 0.72, -0.76, 0.02),
      new THREE.Vector3(side * 0.88, -1.22, 0.016),
      new THREE.Vector3(side * 0.74, -1.96, 0.012),
    ]);
    const hindSeamGeom = track(
      new THREE.TubeGeometry(hindSeamCurve, 20, 0.02, 10, false)
    );
    hindwingGroup.add(new THREE.Mesh(hindSeamGeom, blackChromeMat));

    // --- Inner Hindwing Multi-Track Mechanical Actuator Column (flanks the abdomen on left & right) ---
    const innerColumnSpineCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.14, -0.18, 0.04),
      new THREE.Vector3(side * 0.19, -0.48, 0.055),
      new THREE.Vector3(side * 0.28, -0.86, 0.045),
      new THREE.Vector3(side * 0.41, -1.32, 0.03),
      new THREE.Vector3(side * 0.58, -1.78, 0.018),
      new THREE.Vector3(side * 0.68, -2.26, 0.01),
    ]);
    const innerColumnSpineGeom = track(
      new THREE.TubeGeometry(innerColumnSpineCurve, 26, 0.026, 12, false)
    );
    hindwingGroup.add(new THREE.Mesh(innerColumnSpineGeom, blackChromeMat));

    const innerParallelRailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.08, -0.22, 0.048),
      new THREE.Vector3(side * 0.12, -0.52, 0.062),
      new THREE.Vector3(side * 0.2, -0.92, 0.052),
      new THREE.Vector3(side * 0.33, -1.38, 0.038),
      new THREE.Vector3(side * 0.48, -1.86, 0.024),
      new THREE.Vector3(side * 0.6, -2.3, 0.012),
    ]);
    const innerParallelRailGeom = track(
      new THREE.TubeGeometry(innerParallelRailCurve, 26, 0.02, 10, false)
    );
    hindwingGroup.add(new THREE.Mesh(innerParallelRailGeom, darkTitaniumMat));

    const innerChromeRodCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.11, -0.2, 0.065),
      new THREE.Vector3(side * 0.15, -0.5, 0.075),
      new THREE.Vector3(side * 0.24, -0.9, 0.065),
      new THREE.Vector3(side * 0.37, -1.36, 0.048),
      new THREE.Vector3(side * 0.54, -1.92, 0.03),
    ]);
    const innerChromeRodGeom = track(
      new THREE.TubeGeometry(innerChromeRodCurve, 22, 0.011, 8, false)
    );
    hindwingGroup.add(new THREE.Mesh(innerChromeRodGeom, chromeMetalMat));

    const colSleeveGeom = track(
      new THREE.CylinderGeometry(0.036, 0.032, 0.11, 12)
    );
    const crossBridgeGeom = track(new THREE.BoxGeometry(0.085, 0.028, 0.042));
    for (const frac of [0.08, 0.2, 0.32, 0.44, 0.56, 0.68, 0.8, 0.92]) {
      const ptOuter = innerColumnSpineCurve.getPoint(frac);
      const ptInner = innerParallelRailCurve.getPoint(frac);

      const sleeve = new THREE.Mesh(colSleeveGeom, blackChromeMat);
      sleeve.position.copy(ptOuter);
      sleeve.rotation.z = side * 0.26;
      hindwingGroup.add(sleeve);

      const knuckle = new THREE.Mesh(microKnuckleGeom, blackChromeMat);
      knuckle.position.copy(ptInner);
      hindwingGroup.add(knuckle);

      const crossBridge = new THREE.Mesh(crossBridgeGeom, darkTitaniumMat);
      crossBridge.position.set(
        (ptOuter.x + ptInner.x) * 0.5,
        (ptOuter.y + ptInner.y) * 0.5,
        ptOuter.z + 0.012
      );
      crossBridge.rotation.z = side * 0.35;
      hindwingGroup.add(crossBridge);

      const ring = new THREE.Mesh(collarRingGeom, chromeMetalMat);
      ring.position.set(ptOuter.x, ptOuter.y + 0.038, ptOuter.z + 0.012);
      ring.rotation.x = Math.PI / 2;
      ring.rotation.y = side * 0.26;
      hindwingGroup.add(ring);
    }

    // Recessed Scarlet-Crimson Hindwing Vents (#C2201E)
    const vent1 = new THREE.Mesh(hindPlasmaVent1Geom, crimsonLacquerMat);
    vent1.position.z = 0.008;
    const ventSlit = new THREE.Mesh(hindPlasmaSlitGeom, crimsonLacquerMat);
    ventSlit.position.z = 0.008;
    const vent2 = new THREE.Mesh(hindPlasmaVent2Geom, crimsonLacquerMat);
    vent2.position.z = 0.008;
    hindwingGroup.add(vent1, ventSlit, vent2);

    // Ventral Scarlet-Crimson Hindwing Vents on Opposite Side (-Z)
    const vent1Ventral = new THREE.Mesh(
      hindPlasmaVent1VentralGeom,
      ventralCrimsonMat
    );
    vent1Ventral.position.z = -0.016;
    const ventSlitVentral = new THREE.Mesh(
      hindPlasmaSlitVentralGeom,
      ventralCrimsonMat
    );
    ventSlitVentral.position.z = -0.016;
    const vent2Ventral = new THREE.Mesh(
      hindPlasmaVent2VentralGeom,
      ventralCrimsonMat
    );
    vent2Ventral.position.z = -0.016;
    hindwingGroup.add(vent1Ventral, ventSlitVentral, vent2Ventral);

    // Ventral Sculpted Outer Hindwing Structural Ribs & Bezel Surrounds
    const outerHindArchVentralCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.72, -0.22, -0.018),
      new THREE.Vector3(side * 1.12, -0.44, -0.022),
      new THREE.Vector3(side * 1.44, -0.76, -0.022),
      new THREE.Vector3(side * 1.38, -1.18, -0.02),
      new THREE.Vector3(side * 1.12, -1.78, -0.018),
      new THREE.Vector3(side * 0.76, -2.32, -0.014),
    ]);
    const outerHindArchVentralGeom = track(
      new THREE.TubeGeometry(outerHindArchVentralCurve, 26, 0.022, 10, false)
    );
    hindwingGroup.add(new THREE.Mesh(outerHindArchVentralGeom, blackChromeMat));

    const hindSeamVentralCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.56, -0.42, -0.018),
      new THREE.Vector3(side * 0.72, -0.76, -0.022),
      new THREE.Vector3(side * 0.88, -1.22, -0.02),
      new THREE.Vector3(side * 0.74, -1.96, -0.016),
    ]);
    const hindSeamVentralGeom = track(
      new THREE.TubeGeometry(hindSeamVentralCurve, 20, 0.018, 10, false)
    );
    hindwingGroup.add(new THREE.Mesh(hindSeamVentralGeom, blackChromeMat));

    // External Silver Hinge Clips on Scalloped Hindwing Outer Margin
    const outerClipGeom = track(new THREE.BoxGeometry(0.032, 0.095, 0.045));
    for (const [cx, cy, crot] of [
      [1.48, -0.78, 0.62],
      [1.52, -1.16, -0.45],
      [1.22, -1.82, -0.35],
    ] as [number, number, number][]) {
      const clip = new THREE.Mesh(outerClipGeom, chromeMetalMat);
      clip.position.set(side * cx, cy, 0.01);
      clip.rotation.z = side * crot;
      hindwingGroup.add(clip);
    }

    // Internal Hindwing Gear recessed inside dark seam
    const hindGear = new THREE.Mesh(wingPinionGearGeom, darkTitaniumMat);
    hindGear.position.set(side * 0.84, -0.42, -0.008);
    hindwingGroup.add(hindGear);
    wingGears.push({ mesh: hindGear, speedRatio: -side * 1.35 });

    // Articulated Trailing Scissor-Linkage & Twin Mechanical Tail Spur Assembly
    const hindTailSpur = new THREE.Group();
    hindTailSpur.position.set(side * 0.78, -1.82, 0.012);
    hindwingGroup.add(hindTailSpur);

    const strutGeom = track(new THREE.CylinderGeometry(0.018, 0.012, 0.68, 10));
    const strut1 = new THREE.Mesh(strutGeom, blackChromeMat);
    strut1.position.set(side * 0.08, -0.18, 0.0);
    strut1.rotation.z = -side * 0.28;
    const strut2 = new THREE.Mesh(strutGeom, chromeMetalMat);
    strut2.position.set(side * -0.06, -0.14, 0.01);
    strut2.rotation.z = -side * 0.18;
    hindTailSpur.add(strut1, strut2);

    // Ventral Articulated Trailing Twin Mechanical Tail Spur Assembly on Opposite Side (-Z)
    const vHindTailSpur = new THREE.Group();
    vHindTailSpur.position.set(side * 0.78, -1.82, -0.022);
    hindwingGroup.add(vHindTailSpur);

    const vStrut1 = new THREE.Mesh(strutGeom, blackChromeMat);
    vStrut1.position.set(side * 0.08, -0.18, 0.0);
    vStrut1.rotation.z = -side * 0.28;
    const vStrut2 = new THREE.Mesh(strutGeom, chromeMetalMat);
    vStrut2.position.set(side * -0.06, -0.14, -0.008);
    vStrut2.rotation.z = -side * 0.18;
    vHindTailSpur.add(vStrut1, vStrut2);

    const hindBolts = new THREE.InstancedMesh(
      boltGeom,
      chromeMetalMat,
      hindBoltCoords.length
    );
    hindBoltCoords.forEach(([bx, by], idx) => {
      dummy.position.set(side * bx, by, 0.016);
      dummy.updateMatrix();
      hindBolts.setMatrixAt(idx, dummy.matrix);
    });
    hindBolts.instanceMatrix.needsUpdate = true;
    hindBolts.computeBoundingSphere();
    hindwingGroup.add(hindBolts);

    const hindPlateConfigs = [
      {
        geom: hindPlate1Geom,
        slideDir: new THREE.Vector3(side * 0.16, -0.08, 0.045),
        inPlaneRotSign: -side * 0.07,
        screws: [
          [0.76, -0.66],
          [0.84, -0.82],
        ] as [number, number][],
      },
      {
        geom: hindPlate2Geom,
        slideDir: new THREE.Vector3(side * 0.12, -0.2, 0.055),
        inPlaneRotSign: -side * 0.11,
        screws: [
          [0.44, -0.58],
          [0.48, -0.96],
          [0.52, -1.24],
        ] as [number, number][],
      },
      {
        geom: hindPlate3Geom,
        slideDir: new THREE.Vector3(side * 0.05, -0.05, 0.035),
        inPlaneRotSign: side * 0.05,
        screws: [[0.34, -0.16]] as [number, number][],
      },
    ];

    const hindPlates = hindPlateConfigs.map((cfg, idx) => {
      const grp = new THREE.Group();
      const basePos = new THREE.Vector3(0, 0, 0.012 + idx * 0.002);
      grp.position.copy(basePos);
      const mesh = new THREE.Mesh(cfg.geom, ceramicMaterial);
      grp.add(mesh);

      for (const [sx, sy] of cfg.screws) {
        const screw = new THREE.Mesh(countersunkScrewGeom, chromeMetalMat);
        screw.position.set(side * sx, sy, 0.028);
        grp.add(screw);
      }

      hindwingGroup.add(grp);
      return {
        group: grp,
        basePos,
        slideDir: cfg.slideDir,
        inPlaneRotSign: cfg.inPlaneRotSign,
      };
    });

    // Ventral Hindwing White Ceramic Armor Plates on Opposite Side (-Z)
    const hindPlateConfigsVentral = [
      {
        geom: hindPlate1VentralGeom,
        slideDir: new THREE.Vector3(side * 0.16, -0.08, -0.045),
        inPlaneRotSign: -side * 0.07,
        screws: [
          [0.76, -0.66],
          [0.84, -0.82],
        ] as [number, number][],
        zPos: -0.018,
      },
      {
        geom: hindPlate2VentralGeom,
        slideDir: new THREE.Vector3(side * 0.12, -0.2, -0.055),
        inPlaneRotSign: -side * 0.11,
        screws: [
          [0.44, -0.58],
          [0.48, -0.96],
          [0.52, -1.24],
        ] as [number, number][],
        zPos: -0.02,
      },
      {
        geom: hindPlate3VentralGeom,
        slideDir: new THREE.Vector3(side * 0.05, -0.05, -0.035),
        inPlaneRotSign: side * 0.05,
        screws: [[0.34, -0.16]] as [number, number][],
        zPos: -0.018,
      },
    ];

    for (const cfg of hindPlateConfigsVentral) {
      const vGrp = new THREE.Group();
      const basePos = new THREE.Vector3(0, 0, cfg.zPos);
      vGrp.position.copy(basePos);
      const vMesh = new THREE.Mesh(cfg.geom, ceramicMaterial);
      vGrp.add(vMesh);

      for (const [sx, sy] of cfg.screws) {
        const vScrew = new THREE.Mesh(ventralScrewGeom, chromeMetalMat);
        vScrew.position.set(side * sx, sy, -0.034);
        vGrp.add(vScrew);
      }

      hindwingGroup.add(vGrp);
      hindPlates.push({
        group: vGrp,
        basePos,
        slideDir: cfg.slideDir,
        inPlaneRotSign: cfg.inPlaneRotSign,
      });
    }

    return {
      side,
      rootGroup,
      forewingGroup,
      hindwingGroup,
      forePlates,
      hindPlates,
      wingGears,
      aeroFlaps,
      pistonRod,
      secondaryPistonRod,
      hindTailSpur,
      vPistonRod,
      vSecPistonRod,
      vHindTailSpur,
    };
  };

  const leftWing = createWingSide(-1);
  const rightWing = createWingSide(1);
  root.add(leftWing.rootGroup, rightWing.rootGroup);

  const applyWingRigPose = (
    wing: ArticulatedWingRig,
    frame: WingKinematicsFrame
  ) => {
    const s = wing.side;
    wing.forewingGroup.rotation.set(
      frame.forewingPitchRad,
      -s * frame.forewingFlapRad,
      s * frame.forewingSweepRad
    );

    wing.hindwingGroup.rotation.set(
      frame.hindwingPitchRad,
      -s * frame.hindwingFlapRad,
      -s * frame.forewingSweepRad * 0.65
    );

    // Articulate white ceramic plates strictly in +Z and in-plane Z rotation so they never clip behind the frame
    for (let i = 0; i < wing.forePlates.length; i++) {
      const p = wing.forePlates[i];
      const layerFactor = 0.72 + i * 0.22;
      const slide = frame.armorPlateSlide * layerFactor;
      p.group.position.set(
        p.basePos.x + p.slideDir.x * slide,
        p.basePos.y + p.slideDir.y * slide,
        p.basePos.z + p.slideDir.z * slide
      );
      p.group.rotation.set(0, 0, frame.armorPlateSlide * p.inPlaneRotSign);
    }

    for (let i = 0; i < wing.hindPlates.length; i++) {
      const p = wing.hindPlates[i];
      const layerFactor = 0.75 + i * 0.25;
      const slide = frame.armorPlateSlide * layerFactor;
      p.group.position.set(
        p.basePos.x + p.slideDir.x * slide,
        p.basePos.y + p.slideDir.y * slide,
        p.basePos.z + p.slideDir.z * slide
      );
      p.group.rotation.set(0, 0, frame.armorPlateSlide * p.inPlaneRotSign);
    }

    // Spin internal wing escapement pinion gears
    for (let i = 0; i < wing.wingGears.length; i++) {
      const wg = wing.wingGears[i];
      wg.mesh.rotation.z = frame.gearRotationRad * wg.speedRatio;
    }

    // Articulate outer-margin aero-flaps
    for (let i = 0; i < wing.aeroFlaps.length; i++) {
      wing.aeroFlaps[i].rotation.y =
        s * frame.aeroFlapDeflectionRad * (0.8 + i * 0.2);
    }

    // Telescoping pistons & hindwing tail-spur micro-articulation
    wing.pistonRod.scale.y = 0.84 + frame.pistonExtension * 0.36;
    wing.secondaryPistonRod.scale.y = 1.16 - frame.pistonExtension * 0.32;
    wing.hindTailSpur.rotation.z =
      s *
      (frame.armorPlateSlide * 0.14 + Math.sin(frame.hindwingFlapRad) * 0.06);

    if (wing.vPistonRod) {
      wing.vPistonRod.scale.y = 0.84 + frame.pistonExtension * 0.36;
    }
    if (wing.vSecPistonRod) {
      wing.vSecPistonRod.scale.y = 1.16 - frame.pistonExtension * 0.32;
    }
    if (wing.vHindTailSpur) {
      wing.vHindTailSpur.rotation.z =
        s *
        (frame.armorPlateSlide * 0.14 + Math.sin(frame.hindwingFlapRad) * 0.06);
    }
  };

  const updateKinematics = (frame: WingKinematicsFrame) => {
    thoraxGroup.position.y = frame.thoraxBobY;
    thoraxGroup.rotation.x = frame.thoraxPitchRad;

    for (let i = 0; i < thoraxGears.length; i++) {
      const g = thoraxGears[i];
      g.mesh.rotation.z = frame.gearRotationRad * g.speedRatio;
    }

    for (let i = 0; i < thoraxLinkages.length; i++) {
      const lk = thoraxLinkages[i];
      lk.group.rotation.z =
        lk.baseRotZ +
        lk.side * (frame.forewingFlapRad * 0.08 + frame.armorPlateSlide * 0.03);
      lk.group.position.x =
        lk.side * (0.08 + frame.armorPlateSlide * 0.008);
    }

    mandibleLeft.rotation.z = frame.mandibleFlexRad;
    mandibleRight.rotation.z = -frame.mandibleFlexRad;

    antennaLeft.rotation.z = frame.antennaSwayRad;
    antennaRight.rotation.z = -frame.antennaSwayRad;
    antennaLeft.rotation.x = Math.abs(frame.antennaSwayRad) * 0.6;
    antennaRight.rotation.x = Math.abs(frame.antennaSwayRad) * 0.6;

    for (let i = 0; i < abdomenSegments.length; i++) {
      abdomenSegments[i].rotation.x = frame.abdomenCurlRad * (0.26 + i * 0.09);
    }
    if (tailCaliperLeft && tailCaliperRight) {
      tailCaliperLeft.rotation.z = -frame.tailCaliperSpreadRad * 0.35;
      tailCaliperRight.rotation.z = frame.tailCaliperSpreadRad * 0.35;
    }

    plasmaPointLight.intensity = 0.55 * frame.plasmaIntensity;

    // Animate Tactical Blinking & Strobe Lights
    const nowSec = performance.now() * 0.001;

    // 1. Central Thorax Strobe Beacon: sharp tactical double-pulse strobe flash (image_bf6d6200.png)
    const beaconPhase = (nowSec * 1.5) % 1.0;
    const isBeaconFlash = beaconPhase < 0.07 || (beaconPhase > 0.14 && beaconPhase < 0.21);
    (beaconDiodeMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = isBeaconFlash ? 5.5 : 0.2;
    if (ventralBeaconMesh) {
      (ventralBeaconMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = isBeaconFlash ? 5.5 : 0.2;
    }
    beaconLight.intensity = isBeaconFlash ? 2.8 : 0.06;

    // 2. Wishbone Knuckle Pilot LEDs: alternating left/right twinkle & pulse
    for (let i = 0; i < wishboneLedMeshes.length; i++) {
      const { mesh, side, index } = wishboneLedMeshes[i];
      const blinkCycle = Math.sin(nowSec * 7.0 + side * 1.6 + index * 1.3);
      const isLit = blinkCycle > 0.15;
      (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = isLit ? 3.6 : 0.2;
    }

    // 3. Abdomen Ladder Chaser: sequential scanning indicator lights
    const activeStep = Math.floor((nowSec * 5.2) % sternalLedMeshes.length);
    for (let i = 0; i < sternalLedMeshes.length; i++) {
      const isStepLit = i === activeStep;
      (sternalLedMeshes[i].material as THREE.MeshStandardMaterial).emissiveIntensity = isStepLit ? 4.0 : 0.25;
    }

    // 4. Wingtip Aeronautical Nav Strobes: rhythmic aviation beacon
    const wingtipPhase = (nowSec * 1.1) % 1.0;
    const isWingtipFlash = wingtipPhase < 0.08;
    for (let i = 0; i < navStrobeMeshes.length; i++) {
      (navStrobeMeshes[i].mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = isWingtipFlash ? 4.5 : 0.2;
    }

    applyWingRigPose(leftWing, frame);
    applyWingRigPose(rightWing, frame);
  };

  return {
    root,
    thoraxGroup,
    headGroup,
    antennaLeft,
    antennaRight,
    mandibleLeft,
    mandibleRight,
    thoraxGears,
    thoraxLinkages,
    abdomenSegments,
    tailCaliperLeft,
    tailCaliperRight,
    leftWing,
    rightWing,
    plasmaCoreMesh,
    plasmaPointLight,
    updateKinematics,
    dispose: () => {
      for (const item of disposables) {
        item.dispose();
      }
    },
  };
}
