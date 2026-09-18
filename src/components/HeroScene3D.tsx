import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

type HeroScene3DProps = {
  className?: string;
  scrollRootSelector?: string;
};

const MODEL_URL = '/quaternius_cc0-suv-1402.glb';
const PAINT_EVENT = 'xanox-paint';
export const HERO_READY_EVENT = 'xanox-hero-ready';

let pendingHeroPaint: string | null = '#e8c12a';

export function applyHeroPaint(hex: string) {
  pendingHeroPaint = hex;
  window.dispatchEvent(new CustomEvent(PAINT_EVENT, { detail: hex }));
}

function notifyHeroReady() {
  window.dispatchEvent(new Event(HERO_READY_EVENT));
}

gsap.registerPlugin(ScrollTrigger);

function makeNightRoadTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  // Wet asphalt base
  const base = ctx.createLinearGradient(0, 0, 256, 0);
  base.addColorStop(0, '#0c1016');
  base.addColorStop(0.5, '#161c26');
  base.addColorStop(1, '#0c1016');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 512);
  // Speckle + wet patches
  for (let i = 0; i < 1100; i++) {
    const g = 22 + Math.random() * 36;
    ctx.fillStyle = `rgba(${g},${g + 2},${g + 8},${0.18 + Math.random() * 0.25})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 512, 1 + Math.random() * 2, 1 + Math.random() * 3);
  }
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(180,200,230,${0.04 + Math.random() * 0.06})`;
    ctx.fillRect(30 + Math.random() * 196, Math.random() * 512, 8 + Math.random() * 40, 2 + Math.random() * 10);
  }
  // Glowing center dashes
  for (let y = 0; y < 512; y += 64) {
    ctx.fillStyle = 'rgba(214,171,103,0.35)';
    ctx.fillRect(112, y + 6, 32, 42);
    ctx.fillStyle = '#efd09b';
    ctx.fillRect(118, y + 12, 20, 30);
  }
  ctx.fillStyle = 'rgba(239,208,155,0.7)';
  ctx.fillRect(16, 0, 5, 512);
  ctx.fillRect(235, 0, 5, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 6);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeDayRoadTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  // Keep road black in daylight — dark asphalt, not grey/white
  const base = ctx.createLinearGradient(0, 0, 256, 0);
  base.addColorStop(0, '#101318');
  base.addColorStop(0.5, '#1a1f26');
  base.addColorStop(1, '#101318');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 900; i++) {
    const g = 28 + Math.random() * 28;
    ctx.fillStyle = `rgba(${g},${g + 2},${g + 4},${0.2 + Math.random() * 0.25})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 512, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  // Soft yellow dashes (not bright white)
  for (let y = 0; y < 512; y += 64) {
    ctx.fillStyle = '#c9a84a';
    ctx.fillRect(118, y + 12, 20, 30);
  }
  ctx.fillStyle = 'rgba(210, 190, 140, 0.55)';
  ctx.fillRect(18, 0, 5, 512);
  ctx.fillRect(233, 0, 5, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 6);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeMountain(
  width: number,
  height: number,
  depth: number,
  color: number,
) {
  const geo = new THREE.ConeGeometry(width, height, 5, 1);
  // Flatten base a bit for ridge feel
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) < -height * 0.35) {
      pos.setY(i, -height * 0.45 + Math.random() * 0.15);
    } else {
      pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * width * 0.12);
      pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * depth * 0.08);
    }
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    metalness: 0.05,
    roughness: 0.95,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.scale.z = depth / width;
  return mesh;
}

/**
 * Night mountain-road drive — car comes forward, then settles small on the left
 * so the filter desk can enter from the right.
 */
export function HeroScene3D({ className = '', scrollRootSelector = '#top' }: HeroScene3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 900px)').matches;
    const scrollState = { progress: 0, smooth: 0 };
    let sceneVisible = true;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070a12, 0.032);
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 120);
    camera.position.set(-0.85, 1.55, 6.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 1.25));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.08).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.35;

    // Lighting (switched by theme)
    const ambient = new THREE.AmbientLight(0x1a2233, 0.35);
    scene.add(ambient);
    const hemi = new THREE.HemisphereLight(0x3a4a6a, 0x0a0c12, 0.4);
    scene.add(hemi);

    const sunMoonDir = new THREE.DirectionalLight(0xb8c8e8, 0.65);
    sunMoonDir.position.set(-6, 10, -4);
    scene.add(sunMoonDir);

    const carHomeX = 3.05;

    const carKey = new THREE.DirectionalLight(0xf2f6ff, 1.15);
    carKey.position.set(2.2, 4.2, 7.5);
    scene.add(carKey);
    const carKeyTarget = new THREE.Object3D();
    carKeyTarget.position.set(carHomeX, 0.7, 0.2);
    scene.add(carKeyTarget);
    carKey.target = carKeyTarget;

    // Soft fill from text side
    const carFill = new THREE.DirectionalLight(0x7a8eb0, 0.35);
    carFill.position.set(-5, 2.5, 3);
    scene.add(carFill);
    carFill.target = carKeyTarget;

    // Rim light — car silhouette pops against mountains
    const carRim = new THREE.DirectionalLight(0xa8c0ef, 0.85);
    carRim.position.set(1, 2.8, -5);
    scene.add(carRim);
    carRim.target = carKeyTarget;

    const stage = new THREE.Group();
    scene.add(stage);

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0b0e14,
      metalness: 0.1,
      roughness: 1,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(48, 60), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(2, -0.04, -8);
    stage.add(ground);

    // Road — day + night textures ready
    const nightRoadTex = makeNightRoadTexture();
    const dayRoadTex = makeDayRoadTexture();
    const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy?.() ?? 8);
    nightRoadTex.anisotropy = maxAniso;
    dayRoadTex.anisotropy = maxAniso;
    const roadMat = new THREE.MeshStandardMaterial({
      map: nightRoadTex,
      metalness: 0.18,
      roughness: 0.72,
      envMapIntensity: 0.45,
    });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 28), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(carHomeX, 0.01, -2);
    stage.add(road);

    // Soft contact shadow
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sctx = shadowCanvas.getContext('2d')!;
    const grad = sctx.createRadialGradient(128, 128, 8, 128, 128, 120);
    grad.addColorStop(0, 'rgba(0,0,0,0.65)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.25)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 256, 256);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.1, 2),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.75, depthWrite: false }),
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(carHomeX, 0.025, 0.2);
    stage.add(contactShadow);

    // Mountains stay OFF the road — clear lane for the car around x≈3
    const mountainGroup = new THREE.Group();
    stage.add(mountainGroup);
    const mountainMeshes: THREE.Mesh[] = [];
    const nightMountainColors = [0x121820, 0x161c28, 0x0e131c, 0x1a2230, 0x10151e];
    const dayMountainColors = [0xd8d0c2, 0xcfc6b6, 0xe2dacb, 0xc4bbab, 0xddd4c4];

    const placePeak = (x: number, z: number, w: number, h: number, d: number, color: number) => {
      const m = makeMountain(w, h, d, color);
      m.position.set(x, h * 0.42, z);
      mountainGroup.add(m);
      mountainMeshes.push(m);
    };

    const leftPeaks = isMobile ? 4 : 8;
    for (let i = 0; i < leftPeaks; i++) {
      const z = 2 - i * (isMobile ? 7.2 : 4.5);
      placePeak(
        -4.5 - Math.random() * 3,
        z,
        2.0 + Math.random() * 1.8,
        3.2 + Math.random() * 4,
        1.8 + Math.random() * 1.5,
        nightMountainColors[i % nightMountainColors.length],
      );
    }

    const rightPeaks = isMobile ? 4 : 9;
    for (let i = 0; i < rightPeaks; i++) {
      const z = 2 - i * (isMobile ? 7 : 4.2);
      placePeak(
        8.5 + Math.random() * 3.5,
        z,
        2.0 + Math.random() * 2,
        3.0 + Math.random() * 4,
        1.8 + Math.random() * 1.5,
        nightMountainColors[(i + 2) % nightMountainColors.length],
      );
    }

    const farPeaks = isMobile ? 4 : 10;
    for (let i = 0; i < farPeaks; i++) {
      placePeak(
        -6 + i * (isMobile ? 4.4 : 2.2) + Math.random(),
        -16 - Math.random() * 8,
        3.5 + Math.random() * 3,
        6 + Math.random() * 5,
        2.5 + Math.random() * 2,
        0x0c1018,
      );
    }

    const midPeaks = isMobile ? 3 : 7;
    for (let i = 0; i < midPeaks; i++) {
      placePeak(
        -2 + i * (isMobile ? 3.4 : 2.0),
        -11 - Math.random() * 2,
        2.2 + Math.random() * 1.4,
        3.8 + Math.random() * 2.5,
        1.8 + Math.random() * 1,
        nightMountainColors[i % nightMountainColors.length],
      );
    }

    // Stars
    const starCount = reduced || isMobile ? 60 : 180;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.3) * 40;
      starPos[i * 3 + 1] = 4 + Math.random() * 18;
      starPos[i * 3 + 2] = -8 - Math.random() * 30;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        color: 0xdde6ff,
        size: 0.045,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    scene.add(stars);

    // Bright moon — BEHIND the mountain ridge (center-ish sky)
    const moonGroup = new THREE.Group();
    moonGroup.position.set(2.2, 3.4, -14.5);
    scene.add(moonGroup);

    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xf4f7ff,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });
    const moonMesh = new THREE.Mesh(new THREE.CircleGeometry(1.15, 48), moonMat);
    moonGroup.add(moonMesh);

    const moonHalo = new THREE.Mesh(
      new THREE.CircleGeometry(2.1, 48),
      new THREE.MeshBasicMaterial({
        color: 0xc5d4f0,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    moonHalo.position.z = -0.05;
    moonGroup.add(moonHalo);

    const moonAura = new THREE.Mesh(
      new THREE.CircleGeometry(3.6, 48),
      new THREE.MeshBasicMaterial({
        color: 0x6a82b0,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    moonAura.position.z = -0.1;
    moonGroup.add(moonAura);

    const moonFill = new THREE.PointLight(0xc8d6f0, 3.2, 50);
    moonFill.position.set(2.2, 4.2, -12);
    scene.add(moonFill);

    // Dust / particles
    const dustCount = reduced || isMobile ? 24 : 70;
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = 1 + (Math.random() - 0.2) * 8;
      dustPos[i * 3 + 1] = 0.3 + Math.random() * 2.5;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 16;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dust = new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({
        color: 0xc9b896,
        size: 0.025,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
    );
    scene.add(dust);

    const moonHaloMat = moonHalo.material as THREE.MeshBasicMaterial;
    const moonAuraMat = moonAura.material as THREE.MeshBasicMaterial;
    const starMat = stars.material as THREE.PointsMaterial;
    const dustMat = dust.material as THREE.PointsMaterial;

    const isDarkTheme = () => document.documentElement.classList.contains('dark');
    let themeDark = isDarkTheme();

    const carPivot = new THREE.Group();
    // Car stays in front on the road (as before)
    carPivot.position.set(carHomeX, 0, 0.2);
    stage.add(carPivot);
    let laneBaseX = carHomeX;

    // Headlights live ON the car — soft spots aim forward onto the road, not under the chassis
    const makeBeamGlow = () => {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 256;
      const g = c.getContext('2d')!;
      const rg = g.createRadialGradient(64, 40, 4, 64, 80, 70);
      rg.addColorStop(0, 'rgba(255,220,140,0.55)');
      rg.addColorStop(0.35, 'rgba(255,190,90,0.22)');
      rg.addColorStop(1, 'rgba(255,160,60,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, 128, 256);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      return new THREE.Mesh(
        new THREE.PlaneGeometry(1.15, 2.4),
        new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          opacity: 0.7,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        }),
      );
    };

    const headL = new THREE.SpotLight(0xffd89a, 1.8, 7.5, 0.42, 0.72, 1.4);
    const headR = new THREE.SpotLight(0xffd89a, 1.8, 7.5, 0.42, 0.72, 1.4);
    const roadWash = new THREE.SpotLight(0xffc878, 1.1, 9, 0.55, 0.8, 1.2);
    // Local bumper positions (tuned after model load)
    let headLocal = { x: 0.62, y: 0.55, z: 1.35 };
    headL.position.set(-headLocal.x, headLocal.y, headLocal.z);
    headR.position.set(headLocal.x, headLocal.y, headLocal.z);
    roadWash.position.set(0, 0.62, headLocal.z * 0.85);
    const headLTarget = new THREE.Object3D();
    const headRTarget = new THREE.Object3D();
    const washTarget = new THREE.Object3D();
    headLTarget.position.set(-0.35, 0.02, headLocal.z + 3.2);
    headRTarget.position.set(0.35, 0.02, headLocal.z + 3.2);
    washTarget.position.set(0, 0.02, headLocal.z + 3.8);
    carPivot.add(headL, headR, roadWash, headLTarget, headRTarget, washTarget);
    headL.target = headLTarget;
    headR.target = headRTarget;
    roadWash.target = washTarget;

    const beamL = makeBeamGlow();
    const beamR = makeBeamGlow();
    beamL.rotation.x = -Math.PI / 2;
    beamR.rotation.x = -Math.PI / 2;
    beamL.position.set(-0.45, 0.035, headLocal.z + 1.1);
    beamR.position.set(0.45, 0.035, headLocal.z + 1.1);
    carPivot.add(beamL, beamR);
    const beamLMat = beamL.material as THREE.MeshBasicMaterial;
    const beamRMat = beamR.material as THREE.MeshBasicMaterial;

    const applyTheme = (dark: boolean) => {
      themeDark = dark;
      if (dark) {
        scene.fog = new THREE.FogExp2(0x0c0d10, 0.024);
        renderer.toneMappingExposure = 1.14;
        scene.environmentIntensity = 0.5;
        ambient.color.setHex(0x1c2230);
        ambient.intensity = 0.26;
        hemi.color.setHex(0x3a4658);
        hemi.groundColor.setHex(0x0c0d10);
        hemi.intensity = 0.28;
        sunMoonDir.color.setHex(0xd4af6a);
        sunMoonDir.intensity = 0.32;
        sunMoonDir.position.set(-6, 10, -4);
        carKey.color.setHex(0xf6f2ea);
        carKey.intensity = 1.32;
        carKey.position.set(2.4, 3.8, 7.2);
        carFill.color.setHex(0x8a9bb0);
        carFill.intensity = 0.36;
        carRim.color.setHex(0xd4af6a);
        carRim.intensity = 0.85;
        groundMat.color.setHex(0x0c0d10);
        roadMat.map = nightRoadTex;
        roadMat.color.setHex(0xffffff);
        roadMat.metalness = 0.18;
        roadMat.roughness = 0.72;
        roadMat.envMapIntensity = 0.4;
        roadMat.needsUpdate = true;
        headL.intensity = 1.9;
        headR.intensity = 1.9;
        roadWash.intensity = 1.15;
        headL.visible = true;
        headR.visible = true;
        roadWash.visible = true;
        beamL.visible = true;
        beamR.visible = true;
        beamLMat.opacity = 0.65;
        beamRMat.opacity = 0.65;
        stars.visible = true;
        starMat.opacity = 0.9;
        moonMesh.scale.setScalar(1);
        moonHalo.scale.setScalar(1);
        moonAura.scale.setScalar(1);
        moonMat.color.setHex(0xf2eee6);
        moonHaloMat.color.setHex(0xd4af6a);
        moonHaloMat.opacity = 0.18;
        moonAuraMat.color.setHex(0x8a7348);
        moonAuraMat.opacity = 0.1;
        moonFill.color.setHex(0xefe6d4);
        moonFill.intensity = 3.1;
        dustMat.color.setHex(0xd4af6a);
        dustMat.opacity = 0.16;
        mountainMeshes.forEach((m, i) => {
          (m.material as THREE.MeshStandardMaterial).color.setHex(
            i >= mountainMeshes.length - 10 ? 0x0c1018 : nightMountainColors[i % nightMountainColors.length],
          );
        });
      } else {
        // Day: cream showroom — readable type, no muddy green wash
        scene.fog = new THREE.FogExp2(0xefe8db, 0.022);
        renderer.toneMappingExposure = 1.05;
        scene.environmentIntensity = 0.72;
        ambient.color.setHex(0xf4efe6);
        ambient.intensity = 0.62;
        hemi.color.setHex(0xfff6e8);
        hemi.groundColor.setHex(0xcfc6b6);
        hemi.intensity = 0.7;
        sunMoonDir.color.setHex(0xffe6b8);
        sunMoonDir.intensity = 1.05;
        sunMoonDir.position.set(4, 16, 6);
        carKey.color.setHex(0xfff4e0);
        carKey.intensity = 0.9;
        carKey.position.set(3.2, 7.2, 6);
        carFill.color.setHex(0xd9cbb4);
        carFill.intensity = 0.32;
        carRim.color.setHex(0xf0e6d4);
        carRim.intensity = 0.28;
        groundMat.color.setHex(0xddd4c4);
        roadMat.map = dayRoadTex;
        roadMat.color.setHex(0xf4efe6);
        roadMat.metalness = 0.06;
        roadMat.roughness = 0.9;
        roadMat.envMapIntensity = 0.22;
        roadMat.needsUpdate = true;
        headL.intensity = 0;
        headR.intensity = 0;
        roadWash.intensity = 0;
        headL.visible = false;
        headR.visible = false;
        roadWash.visible = false;
        beamL.visible = false;
        beamR.visible = false;
        stars.visible = false;
        moonMesh.scale.setScalar(1.05);
        moonHalo.scale.setScalar(1.1);
        moonAura.scale.setScalar(1.12);
        moonMat.color.setHex(0xffe7b0);
        moonHaloMat.color.setHex(0xf5d082);
        moonHaloMat.opacity = 0.18;
        moonAuraMat.color.setHex(0xe2b152);
        moonAuraMat.opacity = 0.08;
        moonFill.color.setHex(0xffe0a0);
        moonFill.intensity = 1.6;
        dustMat.color.setHex(0xd4c7ae);
        dustMat.opacity = 0.05;
        mountainMeshes.forEach((m, i) => {
          (m.material as THREE.MeshStandardMaterial).color.setHex(
            i >= mountainMeshes.length - 10 ? 0xcfc6b6 : dayMountainColors[i % dayMountainColors.length],
          );
        });
      }
    };

    applyTheme(isDarkTheme());
    const themeObserver = new MutationObserver(() => applyTheme(isDarkTheme()));
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });


    const wheels: THREE.Object3D[] = [];
    let carModel: THREE.Object3D | null = null;
    let modelBaseY = 0;
    let modelScale = 1;

    const polishedCache = new Map<THREE.Material, THREE.Material>();
    const bodyMats = new Set<THREE.MeshPhysicalMaterial>();
    const polishMaterial = (mat: THREE.Material): THREE.Material => {
      const cached = polishedCache.get(mat);
      if (cached) return cached;
      const src = mat as THREE.MeshStandardMaterial;
      if (!src.isMeshStandardMaterial) {
        polishedCache.set(mat, mat);
        return mat;
      }
      const name = (src.name || '').toLowerCase();
      const hex = src.color?.getHex() ?? 0xffffff;
      const physical = new THREE.MeshPhysicalMaterial({
        color: src.color?.clone() ?? new THREE.Color(0xffffff),
        map: src.map,
        normalMap: src.normalMap,
        roughnessMap: src.roughnessMap,
        metalnessMap: src.metalnessMap,
        emissive: src.emissive?.clone() ?? new THREE.Color(0x000000),
        emissiveMap: src.emissiveMap,
        transparent: src.transparent,
        opacity: src.opacity,
        side: THREE.FrontSide,
        envMapIntensity: 0.9,
      });
      if (hex > 0x888888 || name.includes('body') || name.includes('paint') || name.includes('car')) {
        physical.metalness = 0.22;
        physical.roughness = 0.18;
        physical.clearcoat = 1;
        physical.clearcoatRoughness = 0.08;
        physical.envMapIntensity = 1.25;
        physical.userData.isBody = true;
      } else if (name.includes('glass') || name.includes('window') || name.includes('wind')) {
        physical.color.setHex(0x101820);
        physical.metalness = 0.9;
        physical.roughness = 0.06;
        physical.transparent = true;
        physical.opacity = 0.55;
      } else if (name.includes('cylinder') || name.includes('wheel') || name.includes('tire')) {
        physical.color.setHex(0x141414);
        physical.metalness = 0.05;
        physical.roughness = 0.88;
      } else {
        physical.metalness = Math.max(src.metalness ?? 0, 0.2);
        physical.roughness = Math.min(src.roughness ?? 1, 0.42);
        physical.clearcoat = 0.4;
      }
      polishedCache.set(mat, physical);
      return physical;
    };

    let onPaint: EventListener | null = null;
    const loader = new GLTFLoader();
    loader.load(
      MODEL_URL,
      (gltf) => {
        if (disposed) return;
        const model = gltf.scene;
        model.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (!mesh.isMesh) return;
          if (mesh.geometry) {
            mesh.geometry = mesh.geometry.clone();
            mesh.geometry.computeVertexNormals();
            mesh.geometry.computeBoundingBox();
          }
          const n = mesh.name.toLowerCase();
          const bb = mesh.geometry.boundingBox;
          const lowY = bb ? (bb.min.y + bb.max.y) * 0.5 < 0.55 : false;
          if (n.includes('cylinder') || n.includes('wheel') || n.includes('tire') || n.includes('tyre') || lowY && n.startsWith('cylinder')) {
            wheels.push(mesh);
          }
          if (Array.isArray(mesh.material)) mesh.material = mesh.material.map(polishMaterial);
          else if (mesh.material) mesh.material = polishMaterial(mesh.material);

          // Warm / orange parts = headlamp glass → emissive glow
          const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
          const isWheel = wheels.includes(mesh);
          mats.forEach((mat) => {
            const m = mat as THREE.MeshPhysicalMaterial;
            if (!m.color) return;
            const { r, g, b } = m.color;
            const warm = r > 0.55 && g > 0.25 && g < 0.75 && b < 0.35;
            if (warm || n.includes('light') || n.includes('lamp') || n.includes('head')) {
              m.emissive = new THREE.Color(0xffb45a);
              m.emissiveIntensity = 1.8;
              m.toneMapped = false;
              m.userData.isBody = false;
            }
            if (
              isWheel
              || n.includes('glass')
              || n.includes('window')
              || n.includes('interior')
              || n.includes('seat')
            ) {
              m.userData.isBody = false;
            }
            if (m.userData.isBody) bodyMats.add(m);
          });
        });

        if (bodyMats.size === 0) {
          model.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (!mesh.isMesh || wheels.includes(mesh)) return;
            const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
            mats.forEach((mat) => {
              const m = mat as THREE.MeshPhysicalMaterial;
              if (!m.color || m.emissiveIntensity > 0.4) return;
              const hex = m.color.getHex();
              if (hex > 0x666666) {
                m.userData.isBody = true;
                bodyMats.add(m);
              }
            });
          });
        }

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        modelScale = 2.95 / maxDim;
        model.scale.setScalar(modelScale);
        modelBaseY = -box.min.y * modelScale;
        model.position.set(-center.x * modelScale, modelBaseY, -center.z * modelScale);
        model.rotation.y = 0;
        carPivot.add(model);
        carModel = model;

        const paintCar = (hex: string) => {
          const next = new THREE.Color(hex);
          bodyMats.forEach((mat) => {
            gsap.killTweensOf(mat.color);
            gsap.to(mat.color, { r: next.r, g: next.g, b: next.b, duration: 0.7, ease: 'power2.out' });
          });
        };
        onPaint = (event: Event) => {
          const hex = (event as CustomEvent<string>).detail;
          if (typeof hex === 'string') paintCar(hex);
        };
        window.addEventListener(PAINT_EVENT, onPaint);
        if (pendingHeroPaint) paintCar(pendingHeroPaint);

        // Place headlights at the car's front bumper (toward camera = +Z)
        const fitted = new THREE.Box3().setFromObject(model);
        const frontZ = fitted.max.z - 0.06;
        const lampY = Math.min(fitted.min.y + size.y * modelScale * 0.28, fitted.max.y * 0.45);
        const lampX = size.x * modelScale * 0.28;
        headLocal = { x: lampX, y: Math.max(0.42, lampY), z: frontZ };
        headL.position.set(-headLocal.x, headLocal.y, headLocal.z);
        headR.position.set(headLocal.x, headLocal.y, headLocal.z);
        roadWash.position.set(0, headLocal.y * 0.9, headLocal.z - 0.15);
        headLTarget.position.set(-0.28, 0.02, headLocal.z + 3.4);
        headRTarget.position.set(0.28, 0.02, headLocal.z + 3.4);
        washTarget.position.set(0, 0.02, headLocal.z + 4.0);
        beamL.position.set(-lampX * 0.75, 0.03, headLocal.z + 1.15);
        beamR.position.set(lampX * 0.75, 0.03, headLocal.z + 1.15);

        if (!reduced) {
          gsap.fromTo(
            model.scale,
            { x: modelScale * 0.9, y: modelScale * 0.9, z: modelScale * 0.9 },
            { x: modelScale, y: modelScale, z: modelScale, duration: 1.4, ease: 'power2.out' },
          );
        }
        requestAnimationFrame(() => notifyHeroReady());
      },
      undefined,
      (err) => {
        console.error('Failed to load hero SUV', err);
        notifyHeroReady();
      },
    );

    const pointer = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    const onPointer = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      target.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      target.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    const setSize = () => {
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      const aspect = w / Math.max(h, 1);
      laneBaseX = aspect > 1.15 ? 3.05 + (aspect - 1.15) * 0.4 : 2.55;
      carPivot.position.x = laneBaseX;
    };
    setSize();
    const resizeObserver = new ResizeObserver(setSize);
    resizeObserver.observe(mount);

    camera.position.z = 7.2;
    if (!reduced) gsap.to(camera.position, { z: 6.2, duration: 1.7, ease: 'power2.out' });
    else camera.position.z = 6.2;

    let scrollTrigger: ScrollTrigger | undefined;
    if (!reduced) {
      scrollTrigger = ScrollTrigger.create({
        trigger: scrollRootSelector,
        start: 'top top',
        endTrigger: '#find',
        end: 'top 72%',
        scrub: 0.45,
        onUpdate: (self) => {
          scrollState.progress = self.progress;
        },
      });
    } else {
      scrollState.progress = 0;
    }

    let raf = 0;
    let lastFov = camera.fov;
    const clock = new THREE.Clock();
    const WHEEL_RADIUS = 0.38;
    const ROAD_UV_PER_UNIT = 6 / 28;
    let lastHeroDriveCss = -1;
    let wheelSpin = 0;
    let roadTravel = 0;
    const lookTarget = new THREE.Vector3();
    const motion = {
      approach: 0,
      arrive: 0,
      laneX: 3.05,
      driveZ: 0.2,
      camZ: 6.2,
      camX: -0.85,
      scale: 1,
    };

    const damp = (current: number, target: number, lambda: number, dt: number) =>
      current + (target - current) * (1 - Math.exp(-lambda * dt));

    function animate() {
      raf = 0;
      if (disposed || !sceneVisible || document.hidden) return;

      const dt = Math.min(clock.getDelta(), 0.048);
      const t = clock.elapsedTime;

      // One speed both ways — no reverse lag that stops then snaps
      scrollState.smooth = damp(scrollState.smooth, scrollState.progress, 2.4, dt);
      const p = scrollState.smooth;
      const targetApproach = Math.pow(Math.min(1, Math.max(0, p / 0.85)), 1.2) * 0.7;
      motion.approach = damp(motion.approach, targetApproach, 2.1, dt);
      motion.arrive = damp(motion.arrive, 0, 2.1, dt);
      const approach = motion.approach;

      pointer.x = damp(pointer.x, target.x, 2.4, dt);
      pointer.y = damp(pointer.y, target.y, 2.4, dt);

      const rollSpeed = reduced ? 0 : 0.72 + approach * 0.35;
      roadTravel += rollSpeed * dt;
      wheelSpin += (rollSpeed / WHEEL_RADIUS) * dt;

      const targetLaneX = laneBaseX - approach * 0.28;
      const targetDriveZ = 0.2 + approach * 0.38;
      motion.laneX = damp(motion.laneX, targetLaneX, 2.1, dt);
      motion.driveZ = damp(motion.driveZ, targetDriveZ, 2.1, dt);
      const laneX = motion.laneX;
      const driveZ = motion.driveZ;
      const bob = Math.sin(t * 1.55) * 0.01 + Math.sin(t * 2.4) * 0.004;

      carPivot.position.set(laneX, bob, driveZ);
      carPivot.rotation.set(
        -0.008 + Math.sin(t * 1.5) * 0.0025,
        pointer.x * 0.01,
        Math.sin(t * 1.1) * 0.002,
      );

      if (themeDark) {
        const pulse = 1 + Math.sin(t * 2.2) * 0.035;
        headL.intensity = 1.85 * pulse;
        headR.intensity = 1.85 * pulse;
        roadWash.intensity = 1.1 * pulse;
        beamLMat.opacity = 0.52 + Math.sin(t * 2.2) * 0.05;
        beamRMat.opacity = beamLMat.opacity;
      }

      carKeyTarget.position.set(laneX, 0.7 + bob, driveZ);

      const uv = (roadTravel * ROAD_UV_PER_UNIT) % 1;
      nightRoadTex.offset.y = -uv;
      dayRoadTex.offset.y = -uv;
      road.position.set(laneBaseX, 0.01, -2);
      mountainGroup.position.set(0, 0, 0);

      if (carModel) {
        const targetScale = modelScale * (1 + approach * 0.06);
        motion.scale = damp(motion.scale, targetScale, 2.1, dt);
        carModel.scale.setScalar(motion.scale);
        carModel.position.y = modelBaseY;
      }

      contactShadow.position.x = laneX;
      contactShadow.position.z = driveZ + 0.04;
      contactShadow.scale.setScalar(1 + approach * 0.08);
      (contactShadow.material as THREE.MeshBasicMaterial).opacity = themeDark ? 0.82 : 0.42;

      wheels.forEach((w) => {
        w.rotation.x = -wheelSpin;
      });

      moonGroup.quaternion.copy(camera.quaternion);
      if (themeDark) {
        moonGroup.position.set(1.6 + pointer.x * 0.04, 3.6 + pointer.y * 0.035, -15);
        moonFill.position.set(1.6, 4.2, -12.5);
        starMat.opacity = 0.75 + Math.sin(t * 1.1) * 0.08;
      } else {
        moonGroup.position.set(2.4 + pointer.x * 0.035, 5.2 + pointer.y * 0.028, -14);
        moonFill.position.set(2.2, 5.6, -11);
      }

      stars.rotation.y = t * 0.002;
      dust.position.z = Math.sin(t * 0.35) * 1.2;

      const targetCamZ = 6.35 - approach * 1.65;
      const targetCamX = -0.85 + pointer.x * 0.08 + approach * 0.18;
      motion.camZ = damp(motion.camZ, targetCamZ, 2.1, dt);
      motion.camX = damp(motion.camX, targetCamX, 2.1, dt);

      const nextFov = 35.2 + approach * 2.2;
      if (Math.abs(nextFov - lastFov) > 0.04) {
        lastFov = nextFov;
        camera.fov = nextFov;
        camera.updateProjectionMatrix();
      }
      camera.position.x = motion.camX;
      camera.position.y = 1.52 + pointer.y * 0.05 + bob * 0.22 - approach * 0.04;
      camera.position.z = motion.camZ;
      lookTarget.set(laneX - 0.06, 0.5 + bob * 0.3, driveZ - 1.55);
      camera.lookAt(lookTarget);

      const driveCss = Math.round(p * 40) / 40;
      if (driveCss !== lastHeroDriveCss) {
        lastHeroDriveCss = driveCss;
        document.documentElement.style.setProperty('--hero-drive', String(driveCss));
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    }

    const stopLoop = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    const startLoop = () => {
      if (disposed || raf) return;
      clock.getDelta();
      raf = requestAnimationFrame(animate);
    };

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        sceneVisible = entry.isIntersecting && entry.intersectionRatio > 0.02;
        if (sceneVisible && !document.hidden) startLoop();
        else stopLoop();
      },
      { threshold: [0, 0.02, 0.15] },
    );
    visibilityObserver.observe(mount);

    const onVisibility = () => {
      if (document.hidden) stopLoop();
      else if (sceneVisible) startLoop();
    };
    document.addEventListener('visibilitychange', onVisibility);

    startLoop();

    return () => {
      disposed = true;
      themeObserver.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      stopLoop();
      scrollTrigger?.kill();
      window.removeEventListener('pointermove', onPointer);
      if (onPaint) window.removeEventListener(PAINT_EVENT, onPaint);
      bodyMats.forEach((mat) => gsap.killTweensOf(mat.color));
      resizeObserver.disconnect();
      gsap.killTweensOf(camera.position);
      if (carModel) {
        gsap.killTweensOf(carModel.scale);
        carModel.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry?.dispose();
          const mat = mesh.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat?.dispose();
        });
      }
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      road.geometry.dispose();
      roadMat.dispose();
      nightRoadTex.dispose();
      dayRoadTex.dispose();
      contactShadow.geometry.dispose();
      (contactShadow.material as THREE.Material).dispose();
      shadowTex.dispose();
      mountainMeshes.forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
      starGeo.dispose();
      (stars.material as THREE.Material).dispose();
      moonMesh.geometry.dispose();
      moonMat.dispose();
      moonHalo.geometry.dispose();
      (moonHalo.material as THREE.Material).dispose();
      moonAura.geometry.dispose();
      (moonAura.material as THREE.Material).dispose();
      dustGeo.dispose();
      (dust.material as THREE.Material).dispose();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [scrollRootSelector]);

  return <div ref={mountRef} className={`hero-scene3d ${className}`} aria-hidden="true" />;
}
