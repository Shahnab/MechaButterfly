import * as THREE from 'three';

export interface ButterflyTextureSet {
  ceramicAlbedoMap: THREE.CanvasTexture;
  ceramicLowerForewingMap: THREE.CanvasTexture;
  ceramicBumpMap: THREE.CanvasTexture;
  carbonBumpMap: THREE.CanvasTexture;
  titaniumBumpMap: THREE.CanvasTexture;
  dispose: () => void;
}

/**
 * Helper to paint the base rugged matte-satin off-white ceramic finish
 * with fine micro-grain, subtle edge bevel vignette, and realistic surface texture.
 */
function paintBaseRuggedCeramic(ctx: CanvasRenderingContext2D, size = 1024) {
  // Base warm-neutral matte off-white (#ECEDF0 to #DCdfe5) matching reference image
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#F0F2F5');
  grad.addColorStop(0.55, '#E6E9EE');
  grad.addColorStop(1, '#D6DAE2');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Subtle perimeter edge ambient occlusion so every extruded ceramic plate has rugged bevel depth
  const edgeGrad = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    size * 0.24,
    size * 0.5,
    size * 0.5,
    size * 0.68
  );
  edgeGrad.addColorStop(0, 'rgba(255,255,255,0)');
  edgeGrad.addColorStop(0.75, 'rgba(18,20,24,0.04)');
  edgeGrad.addColorStop(1, 'rgba(10,12,16,0.22)');
  ctx.fillStyle = edgeGrad;
  ctx.fillRect(0, 0, size, size);

  // Fine tactile powder-coat / bead-blasted ceramic micro-speckling (deterministic PRNG)
  let seed = 1337;
  const nextRand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 5500; i++) {
    const x = nextRand() * size;
    const y = nextRand() * size;
    const r = 0.8 + nextRand() * 1.6;
    const isDark = nextRand() > 0.42;
    ctx.fillStyle = isDark
      ? 'rgba(18, 20, 25, 0.048)'
      : 'rgba(255, 255, 255, 0.065)';
    ctx.fillRect(x, y, r, r);
  }

  // Subtle brushed machining lines
  ctx.strokeStyle = 'rgba(16, 18, 22, 0.022)';
  ctx.lineWidth = 1;
  for (let i = -200; i < size + 200; i += 5) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i + 95);
    ctx.stroke();
  }
}

/**
 * Generates zero-404 procedural high-resolution CanvasTextures for the 0621-RN
 * rugged ceramic armor panels, dedicated lower-forewing D-42/barcode stencil,
 * brushed titanium outer frame, and nano-carbon weave micro-relief bump maps.
 */
export function createButterflyTextures(
  maxAnisotropy: number
): ButterflyTextureSet {
  // 1. Clean Rugged Matte-Satin Ceramic Albedo Map (for upper forewing & hindwing plates)
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = 1024;
  albedoCanvas.height = 1024;
  const ctx = albedoCanvas.getContext('2d')!;
  paintBaseRuggedCeramic(ctx, 1024);

  // Recessed dark micro-pin holes near panel edges (matching the tiny dark pin dots in reference)
  const microPinCoords: [number, number][] = [
    [140, 180], [164, 198], [820, 210], [848, 228],
    [190, 780], [216, 798], [760, 820], [788, 835],
    [480, 130], [510, 880], [240, 480], [760, 520],
  ];
  for (const [px, py] of microPinCoords) {
    ctx.fillStyle = 'rgba(14, 16, 20, 0.28)';
    ctx.beginPath();
    ctx.arc(px, py, 6.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0D0F13';
    ctx.beginPath();
    ctx.arc(px, py, 3.8, 0, Math.PI * 2);
    ctx.fill();
  }

  const ceramicAlbedoMap = new THREE.CanvasTexture(albedoCanvas);
  ceramicAlbedoMap.colorSpace = THREE.SRGBColorSpace;
  ceramicAlbedoMap.wrapS = THREE.ClampToEdgeWrapping;
  ceramicAlbedoMap.wrapT = THREE.ClampToEdgeWrapping;
  ceramicAlbedoMap.anisotropy = maxAnisotropy;

  // 2. Dedicated Lower-Forewing Ceramic Albedo Map (with vertical gauge slot, barcode & D-42 stencil)
  const lowerForeCanvas = document.createElement('canvas');
  lowerForeCanvas.width = 1024;
  lowerForeCanvas.height = 1024;
  const lfCtx = lowerForeCanvas.getContext('2d')!;
  paintBaseRuggedCeramic(lfCtx, 1024);

  for (const [px, py] of microPinCoords) {
    lfCtx.fillStyle = 'rgba(14, 16, 20, 0.28)';
    lfCtx.beginPath();
    lfCtx.arc(px, py, 6.2, 0, Math.PI * 2);
    lfCtx.fill();
    lfCtx.fillStyle = '#0D0F13';
    lfCtx.beginPath();
    lfCtx.arc(px, py, 3.8, 0, Math.PI * 2);
    lfCtx.fill();
  }

  // High-Contrast Lower-Forewing Technical Stencil Block (matches reference image lower-inner quadrant)
  lfCtx.save();
  // Vertical tapered needle slot gauge above barcode
  lfCtx.strokeStyle = '#14171D';
  lfCtx.lineWidth = 4.2;
  lfCtx.beginPath();
  lfCtx.moveTo(438, 610);
  lfCtx.lineTo(422, 705);
  lfCtx.stroke();

  lfCtx.fillStyle = '#0E1015';
  lfCtx.fillRect(415, 714, 13, 7);

  // Crisp jet-black horizontal barcode directly below the vertical gauge mark
  const bx = 365;
  const by = 742;
  const bars = [3, 1, 2, 3, 1, 2, 1, 3, 2, 1, 4, 2, 1, 2, 3, 1, 2, 1, 3];
  let curX = bx;
  lfCtx.fillStyle = '#0E1015';
  for (let i = 0; i < bars.length; i++) {
    const w = bars[i] * 2.5;
    if (i % 2 === 0) {
      lfCtx.fillRect(curX, by, w, 28);
    }
    curX += w + 2.0;
  }

  // Bold "D-42" stencil and micro-spec lines directly beneath the barcode
  lfCtx.fillStyle = '#0E1015';
  lfCtx.font = '800 30px "JetBrains Mono", monospace';
  lfCtx.fillText('D-42', bx, by + 58);

  lfCtx.fillStyle = '#252A34';
  lfCtx.font = '700 11px "JetBrains Mono", monospace';
  lfCtx.fillText('SYS // 0621-RN', bx + 82, by + 44);
  lfCtx.fillText('REV.09 // PRTCL', bx + 82, by + 58);
  lfCtx.restore();

  const ceramicLowerForewingMap = new THREE.CanvasTexture(lowerForeCanvas);
  ceramicLowerForewingMap.colorSpace = THREE.SRGBColorSpace;
  ceramicLowerForewingMap.wrapS = THREE.ClampToEdgeWrapping;
  ceramicLowerForewingMap.wrapT = THREE.ClampToEdgeWrapping;
  ceramicLowerForewingMap.anisotropy = maxAnisotropy;

  // 3. Rugged Ceramic Micro-Pebble & Bevel Bump Map (512x512, Linear NoColorSpace)
  const ceramicBumpCanvas = document.createElement('canvas');
  ceramicBumpCanvas.width = 512;
  ceramicBumpCanvas.height = 512;
  const bCtx = ceramicBumpCanvas.getContext('2d')!;
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 512, 512);

  let bSeed = 4242;
  const nextBRand = () => {
    bSeed = (bSeed * 16807) % 2147483647;
    return (bSeed - 1) / 2147483646;
  };
  for (let i = 0; i < 6500; i++) {
    const x = nextBRand() * 512;
    const y = nextBRand() * 512;
    const v = Math.floor(106 + nextBRand() * 44);
    bCtx.fillStyle = `rgb(${v},${v},${v})`;
    bCtx.fillRect(x, y, 1.5, 1.5);
  }

  for (const [px, py] of microPinCoords) {
    bCtx.fillStyle = '#0C0C0C';
    bCtx.beginPath();
    bCtx.arc(px * 0.5, py * 0.5, 3.2, 0, Math.PI * 2);
    bCtx.fill();
  }

  const ceramicBumpMap = new THREE.CanvasTexture(ceramicBumpCanvas);
  ceramicBumpMap.colorSpace = THREE.NoColorSpace;
  ceramicBumpMap.anisotropy = maxAnisotropy;

  // 4. Rugged Brushed Titanium Bump Map (for the grey-titanium outer forewing frame)
  const titaniumCanvas = document.createElement('canvas');
  titaniumCanvas.width = 256;
  titaniumCanvas.height = 256;
  const tCtx = titaniumCanvas.getContext('2d')!;
  tCtx.fillStyle = '#808080';
  tCtx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 2) {
    const shade = 108 + ((y * 17) % 40);
    tCtx.strokeStyle = `rgb(${shade},${shade},${shade})`;
    tCtx.lineWidth = 1;
    tCtx.beginPath();
    tCtx.moveTo(0, y);
    tCtx.lineTo(256, y + 18);
    tCtx.stroke();
  }

  const titaniumBumpMap = new THREE.CanvasTexture(titaniumCanvas);
  titaniumBumpMap.colorSpace = THREE.NoColorSpace;
  titaniumBumpMap.wrapS = THREE.RepeatWrapping;
  titaniumBumpMap.wrapT = THREE.RepeatWrapping;
  titaniumBumpMap.repeat.set(6, 6);
  titaniumBumpMap.anisotropy = maxAnisotropy;

  // 5. Nano-Carbon Weave Tileable Bump Map (128x128, Linear NoColorSpace)
  const carbonCanvas = document.createElement('canvas');
  carbonCanvas.width = 128;
  carbonCanvas.height = 128;
  const cCtx = carbonCanvas.getContext('2d')!;
  cCtx.fillStyle = '#505050';
  cCtx.fillRect(0, 0, 128, 128);

  const step = 8;
  for (let y = 0; y < 128; y += step) {
    for (let x = 0; x < 128; x += step) {
      const isDiag = (x / step + y / step) % 2 === 0;
      cCtx.fillStyle = isDiag ? '#C6C6C6' : '#282828';
      cCtx.fillRect(x, y, step - 1, step - 1);
      cCtx.fillStyle = isDiag ? '#EFEFEF' : '#101010';
      cCtx.fillRect(x + 1, y + 1, step - 3, step - 3);
    }
  }

  const carbonBumpMap = new THREE.CanvasTexture(carbonCanvas);
  carbonBumpMap.colorSpace = THREE.NoColorSpace;
  carbonBumpMap.wrapS = THREE.RepeatWrapping;
  carbonBumpMap.wrapT = THREE.RepeatWrapping;
  carbonBumpMap.repeat.set(18, 18);
  carbonBumpMap.anisotropy = maxAnisotropy;

  return {
    ceramicAlbedoMap,
    ceramicLowerForewingMap,
    ceramicBumpMap,
    carbonBumpMap,
    titaniumBumpMap,
    dispose: () => {
      ceramicAlbedoMap.dispose();
      ceramicLowerForewingMap.dispose();
      ceramicBumpMap.dispose();
      carbonBumpMap.dispose();
      titaniumBumpMap.dispose();
    },
  };
}
