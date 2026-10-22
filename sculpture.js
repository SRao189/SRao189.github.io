// UNFINISHED FUTURES — Zero-Credit Procedural Digital Sculpture ("Fracture to Framework")
// 12 interlocking tectonic shards (smoked glass + matte gunmetal roughness >= 0.42) partitioning a single
// polyhedral volume around an internal core lattice with acid (#d4ff00) and DAPI violet (#5b3df5) seam edges.
// Displaces strictly along outward face normals (zero tumbling, zero spring overshoot, zero particles)
// before snapping into 4 orthographic portal columns registered to the 4 a/b figure plates.

const SHARD_COUNT = 12;
const PORTAL_COUNT = 4;

const stage = document.querySelector("[data-sculpture-stage]");
const canvas = stage?.querySelector(".sculpture-canvas");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

let currentProgress = 0;
let controller = null;

window.__unfinishedSculpture = {
  setProgress(p) {
    currentProgress = Math.max(0, Math.min(1, Number(p) || 0));
    controller?.setProgress(currentProgress);
  },
  getState() {
    return {
      ready: Boolean(stage?.classList.contains("is-ready")),
      progress: currentProgress,
      shards: SHARD_COUNT,
      portals: PORTAL_COUNT,
    };
  },
};

const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 120));
const desktop3D = matchMedia("(min-width: 900px) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
let started = false;

function maybeStart() {
  if (started || !stage || !canvas || !desktop3D.matches) return;
  idle(() => {
    if (started || !desktop3D.matches) return;
    started = true;
    start().catch(() => stage.classList.add("is-unavailable"));
  });
}

maybeStart();
desktop3D.addEventListener("change", maybeStart);

async function start() {
  const THREE = await import("./assets/vendor/three.module.min.js");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  try {
    controller = build(THREE, renderer);
  } catch (err) {
    renderer.dispose();
    throw err;
  }
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function remap(v, a, b) {
  return clamp01((v - a) / (b - a));
}

// Approximate cubic-bezier(0.22, 1, 0.36, 1) for Fracture phase
function easeFracture(t) {
  return 1 - Math.pow(1 - clamp01(t), 3.2);
}

// Critically damped cubic-bezier(0.2, 0.9, 0.2, 1) for Snap into grid phase (zero spring overshoot)
function easeSnap(t) {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 2.6);
}

function easeOutQuad(t) {
  const x = clamp01(t);
  return 1 - (1 - x) * (1 - x);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function build(THREE, renderer) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  camera.position.set(0, 0.22, 4.35);
  camera.lookAt(0, 0, 0);

  // Bake studio environment reflections (dark obsidian room + chalk rim + violet fill + acid seam strip)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRoom = new THREE.Scene();
  envRoom.background = new THREE.Color(0x0b0c10);
  const addLightPanel = (hex, w, h, pos, rot) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: hex, side: THREE.DoubleSide }),
    );
    m.position.set(...pos);
    m.rotation.set(...rot);
    envRoom.add(m);
  };
  addLightPanel(0xf7f6f2, 7, 2.2, [0, 4.2, 1], [Math.PI / 2.2, 0, 0]);
  addLightPanel(0x5b3df5, 5.5, 3.5, [-4.2, 1.2, -2], [0, Math.PI / 3, 0]);
  addLightPanel(0xd4ff00, 3.8, 1.4, [4.0, 2.0, 1.5], [0, -Math.PI / 2.6, 0]);
  addLightPanel(0x8a94b8, 6, 2.5, [0, -3.8, 0], [-Math.PI / 2, 0, 0]);
  scene.environment = pmrem.fromScene(envRoom, 0.035).texture;
  envRoom.traverse((o) => {
    o.geometry?.dispose();
    o.material?.dispose();
  });
  pmrem.dispose();

  const root = new THREE.Group();
  scene.add(root);

  // Studio lighting
  scene.add(new THREE.HemisphereLight(0xf7f6f2, 0x0b0c10, 0.55));
  const rimLight = new THREE.DirectionalLight(0xf7f6f2, 1.75);
  rimLight.position.set(2.8, 3.8, 3.2);
  scene.add(rimLight);

  const violetRim = new THREE.DirectionalLight(0x5b3df5, 1.35);
  violetRim.position.set(-3.2, -1.8, 2.2);
  scene.add(violetRim);

  const corePointLight = new THREE.PointLight(0xd4ff00, 0.8, 4.5, 1.8);
  corePointLight.position.set(0, 0, 0);
  root.add(corePointLight);

  // Materials: Smoked Glass/Resin + Matte Gunmetal (roughness >= 0.42, no mirror chrome) + Seam Edges
  const smokedGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x151926,
    metalness: 0.16,
    roughness: 0.26,
    transmission: 0.56,
    thickness: 1.25,
    ior: 1.54,
    iridescence: 0.72,
    iridescenceIOR: 1.62,
    iridescenceThicknessRange: [180, 460],
    clearcoat: 0.45,
    clearcoatRoughness: 0.24,
  });

  const gunmetalMat = new THREE.MeshPhysicalMaterial({
    color: 0x262b3d,
    metalness: 0.86,
    roughness: 0.44,
    iridescence: 0.28,
    iridescenceIOR: 1.48,
    iridescenceThicknessRange: [220, 400],
    clearcoat: 0.18,
    clearcoatRoughness: 0.42,
  });

  const seamLineMat = new THREE.LineBasicMaterial({
    color: 0xd4ff00,
    transparent: true,
    opacity: 0.28,
  });

  const coreMat = new THREE.MeshPhysicalMaterial({
    color: 0x5b3df5,
    emissive: 0x4728e0,
    emissiveIntensity: 0.55,
    roughness: 0.2,
    metalness: 0.3,
    clearcoat: 1,
  });

  const latticeMat = new THREE.MeshBasicMaterial({
    color: 0xd4ff00,
    wireframe: true,
    transparent: true,
    opacity: 0.35,
  });

  // Internal computational organism core
  const coreGroup = new THREE.Group();
  const innerOcta = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 1), coreMat);
  const outerLattice = new THREE.Mesh(new THREE.IcosahedronGeometry(0.46, 1), latticeMat);
  const ringGeo = new THREE.TorusGeometry(0.66, 0.007, 12, 72);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xd4ff00,
    transparent: true,
    opacity: 0.22,
  });
  const ringA = new THREE.Mesh(ringGeo, ringMat);
  ringA.rotation.set(Math.PI / 3, 0.4, 0);
  const ringB = new THREE.Mesh(ringGeo, ringMat);
  ringB.rotation.set(-Math.PI / 3.2, -0.5, 0);
  coreGroup.add(innerOcta, outerLattice, ringA, ringB);
  root.add(coreGroup);

  // Build 12 interlocking tectonic shards partitioning a single polyhedral volume (3 shards per figure portal)
  const shardSpecs = [
    { sx: -1, sy: 1, sz: 1, portalIdx: 0, tier: 1 },
    { sx: -1, sy: 0, sz: 1, portalIdx: 0, tier: 0 },
    { sx: -1, sy: -1, sz: 1, portalIdx: 0, tier: -1 },
    { sx: -1, sy: 1, sz: -1, portalIdx: 1, tier: 1 },
    { sx: -1, sy: 0, sz: -1, portalIdx: 1, tier: 0 },
    { sx: -1, sy: -1, sz: -1, portalIdx: 1, tier: -1 },
    { sx: 1, sy: 1, sz: 1, portalIdx: 2, tier: 1 },
    { sx: 1, sy: 0, sz: 1, portalIdx: 2, tier: 0 },
    { sx: 1, sy: -1, sz: 1, portalIdx: 2, tier: -1 },
    { sx: 1, sy: 1, sz: -1, portalIdx: 3, tier: 1 },
    { sx: 1, sy: 0, sz: -1, portalIdx: 3, tier: 0 },
    { sx: 1, sy: -1, sz: -1, portalIdx: 3, tier: -1 },
  ];

  if (shardSpecs.length !== SHARD_COUNT) {
    throw new Error(`Expected ${SHARD_COUNT} shards, got ${shardSpecs.length}`);
  }

  // Create a faceted tectonic wedge geometry
  const wedgeShape = new THREE.Shape();
  wedgeShape.moveTo(0.02, 0.02);
  wedgeShape.lineTo(0.62, 0.05);
  wedgeShape.lineTo(0.48, 0.48);
  wedgeShape.lineTo(0.06, 0.56);
  wedgeShape.closePath();

  const baseShardGeo = new THREE.ExtrudeGeometry(wedgeShape, {
    depth: 0.38,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.03,
    bevelThickness: 0.03,
  });
  baseShardGeo.center();
  const shardEdgesGeo = new THREE.EdgesGeometry(baseShardGeo, 22);

  const shards = shardSpecs.map((spec, idx) => {
    const isGlass = idx % 2 === 0;
    const mesh = new THREE.Mesh(baseShardGeo, isGlass ? smokedGlassMat : gunmetalMat);
    const edges = new THREE.LineSegments(shardEdgesGeo, seamLineMat);
    mesh.add(edges);

    // Outward face normal vector n_i for strict normal-locked displacement (zero chaotic tumbling)
    const normal = new THREE.Vector3(
      spec.sx * 0.85,
      spec.sy === 0 ? (idx % 2 === 0 ? 0.18 : -0.18) : spec.sy * 0.78,
      spec.sz * 0.72,
    ).normalize();

    // Base resting offset in Shot 1 (Specimen): interlocking tectonic monolith
    const basePos = normal.clone().multiplyScalar(0.38);
    const baseRot = new THREE.Euler(
      normal.y * 0.32,
      normal.x * 0.36,
      normal.z * 0.24,
    );

    // Shot 3 (Fracture): strict displacement along outward face normal n_i (no tumbling, no particles)
    const fractureDist = 0.92 + (idx % 3) * 0.08;
    const fracturePos = normal.clone().multiplyScalar(fractureDist);
    const fractureRot = baseRot.clone();

    // Shot 4 (Recomposition): 4 portal columns aligned horizontally inside the stage frame
    const portalX = (-1.5 + spec.portalIdx) * 0.56;
    const recomposePos = new THREE.Vector3(
      portalX,
      spec.tier * 0.34,
      0.06,
    );
    const recomposeRot = new THREE.Euler(
      spec.tier * 0.08,
      0,
      0,
    );

    // Shot 5 (Resolution / Framework): crisp architectural lintel stack registered above the 4 portals
    const frameworkPos = new THREE.Vector3(
      portalX,
      spec.tier * 0.16 - 0.12,
      0,
    );
    const frameworkRot = new THREE.Euler(0, 0, 0);

    root.add(mesh);
    return {
      mesh,
      spec,
      normal,
      basePos,
      baseRot,
      fracturePos,
      fractureRot,
      recomposePos,
      recomposeRot,
      frameworkPos,
      frameworkRot,
    };
  });

  function applyState(p, timeSec = 0) {
    // Scroll mapping per brief:
    // 0.00 - 0.20: Shot 1 Arrival ("Specimen")
    // 0.20 - 0.40: Shot 2 Tension (hairline cracks + seam glow)
    // 0.40 - 0.65: Shot 3 Fracture event (choreographed fragment drift)
    // 0.65 - 0.85: Shot 4 Recomposition (align into 4 project portals)
    // 0.85 - 1.00: Shot 5 Resolution (snap into disciplined framework)
    const pTension = easeOutQuad(remap(p, 0.18, 0.40));
    const pFracture = easeFracture(remap(p, 0.38, 0.65));
    const pRecompose = easeFracture(remap(p, 0.65, 0.85));
    const pSnap = easeSnap(remap(p, 0.85, 1.0));

    // Seam glow and core intensity peak during Tension + Fracture, then settle into structured discipline
    const seamOpacity = lerp(0.22, 0.96, pTension) * (1 - pSnap * 0.35);
    seamLineMat.opacity = seamOpacity;

    coreMat.emissiveIntensity = lerp(0.35, 1.85, pTension) * (1 - pRecompose * 0.45);
    latticeMat.opacity = lerp(0.24, 0.92, pTension) * (1 - pSnap * 0.4);
    ringMat.opacity = lerp(0.15, 0.72, pFracture) * (1 - pSnap * 0.5);
    corePointLight.intensity = lerp(0.6, 2.4, pTension) * (1 - pSnap * 0.5);

    const coreScale = lerp(0.88, 1.18, pFracture) * lerp(1, 0.68, pRecompose);
    coreGroup.scale.setScalar(coreScale);
    coreGroup.position.y = lerp(0, 0.32, pSnap);

    // Position and rotate each tectonic shard across the 5 storyboard shots
    shards.forEach((s) => {
      // Tension widens cleavage seams before full fracture
      const tensionOffset = 1 + pTension * 0.26;
      const sx0 = s.basePos.x * tensionOffset;
      const sy0 = s.basePos.y * tensionOffset;
      const sz0 = s.basePos.z * tensionOffset;

      // Interpolate Specimen/Tension -> Fracture -> Recomposition -> Framework
      const fx = lerp(sx0, s.fracturePos.x, pFracture);
      const fy = lerp(sy0, s.fracturePos.y, pFracture);
      const fz = lerp(sz0, s.fracturePos.z, pFracture);

      const rx = lerp(fx, s.recomposePos.x, pRecompose);
      const ry = lerp(fy, s.recomposePos.y, pRecompose);
      const rz = lerp(fz, s.recomposePos.z, pRecompose);

      const x = lerp(rx, s.frameworkPos.x, pSnap);
      const y = lerp(ry, s.frameworkPos.y, pSnap);
      const z = lerp(rz, s.frameworkPos.z, pSnap);

      s.mesh.position.set(x, y, z);
      const shardScale = lerp(1.0, 0.78, pRecompose);
      s.mesh.scale.setScalar(shardScale);

      const rotX1 = lerp(s.baseRot.x, s.fractureRot.x, pFracture);
      const rotY1 = lerp(s.baseRot.y, s.fractureRot.y, pFracture);
      const rotZ1 = lerp(s.baseRot.z, s.fractureRot.z, pFracture);

      const rotX2 = lerp(rotX1, s.recomposeRot.x, pRecompose);
      const rotY2 = lerp(rotY1, s.recomposeRot.y, pRecompose);
      const rotZ2 = lerp(rotZ1, s.recomposeRot.z, pRecompose);

      s.mesh.rotation.set(
        lerp(rotX2, s.frameworkRot.x, pSnap),
        lerp(rotY2, s.frameworkRot.y, pSnap),
        lerp(rotZ2, s.frameworkRot.z, pSnap),
      );
    });

    // Ambient rotation dampens as fragments lock into orthographic portal framework
    const orthoLock = 1 - pRecompose;
    if (reduceMotion.matches) {
      root.rotation.set(0.14 * orthoLock, -0.32 * orthoLock, 0);
      coreGroup.rotation.set(0.2, 0.35, 0);
    } else {
      const driftY = Math.sin(timeSec * 0.65) * 0.22 + timeSec * 0.18;
      const driftX = Math.cos(timeSec * 0.5) * 0.08 + 0.12;
      root.rotation.y = (driftY % (Math.PI * 2)) * orthoLock;
      root.rotation.x = driftX * orthoLock + pointerTiltX * orthoLock;
      root.rotation.z = pointerTiltY * 0.35 * orthoLock;
      coreGroup.rotation.y = -timeSec * 0.32;
      coreGroup.rotation.x = timeSec * 0.2;
    }
  }

  let rafId = 0;
  let visible = true;
  let pointerTiltX = 0;
  let pointerTiltY = 0;
  let targetTiltX = 0;
  let targetTiltY = 0;
  const startClock = performance.now();

  const render = () => renderer.render(scene, camera);

  function resize() {
    const w = Math.max(1, Math.round(stage.clientWidth));
    const h = Math.max(1, Math.round(stage.clientHeight));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    applyState(currentProgress, (performance.now() - startClock) / 1000);
    render();
  }

  new ResizeObserver(resize).observe(stage);

  const schedule = () => {
    if (!rafId && visible && !document.hidden && desktop3D.matches && currentProgress < 0.85) {
      rafId = requestAnimationFrame(frame);
    }
  };

  function settleStatic() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    applyState(currentProgress, 0);
    render();
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) {
      if (!desktop3D.matches || currentProgress >= 0.85) settleStatic();
      else schedule();
    }
  }).observe(stage);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    } else {
      schedule();
    }
  });

  const onCapabilityChange = () => {
    stage.classList.toggle("is-ready", desktop3D.matches);
    if (!desktop3D.matches) settleStatic();
    else schedule();
  };
  reduceMotion.addEventListener("change", onCapabilityChange);
  desktop3D.addEventListener("change", onCapabilityChange);

  if (matchMedia("(pointer: fine)").matches) {
    stage.addEventListener(
      "pointermove",
      (e) => {
        const rect = stage.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
        const ny = (e.clientY - rect.top) / Math.max(1, rect.height) - 0.5;
        targetTiltX = ny * 0.28;
        targetTiltY = nx * 0.28;
      },
      { passive: true },
    );
  }

  function frame(now) {
    rafId = 0;
    pointerTiltX += (targetTiltX - pointerTiltX) * 0.08;
    pointerTiltY += (targetTiltY - pointerTiltY) * 0.08;
    applyState(currentProgress, (now - startClock) / 1000);
    render();
    schedule();
  }

  resize();
  stage.classList.toggle("is-ready", desktop3D.matches);
  if (!desktop3D.matches || currentProgress >= 0.85) {
    settleStatic();
  } else {
    schedule();
  }

  return {
    setProgress(p) {
      currentProgress = clamp01(p);
      if (!desktop3D.matches || !visible || document.hidden || currentProgress >= 0.85) {
        settleStatic();
      } else {
        schedule();
      }
    },
  };
}
