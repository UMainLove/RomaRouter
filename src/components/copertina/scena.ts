/*
 * Scena 3D della copertina: carica il GLB esportato da Blender (scripts/copertina/colosseo.py)
 * e lo riproduce. Tutto il movimento (lupa, percorso, panoramica) e' gia' nel file; qui si
 * aggiungono luce, nebbia, materiali, l'inquadratura adattata allo schermo e lo zoom che
 * accompagna la panoramica. Si carica solo con import() dinamico, alla prima visita.
 */
import {
  ACESFilmicToneMapping,
  AnimationMixer,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  LoopOnce,
  LoopRepeat,
  MathUtils,
  Mesh,
  MeshLambertMaterial,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  BackSide,
  BufferAttribute,
  CircleGeometry,
  PCFShadowMap,
  type PerspectiveCamera,
  PMREMGenerator,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { type GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FETTA_FINALE, FETTA_INIZIALE, T_FERMA } from "./costanti";

/** Durata della clip esportata da Blender. */
const DURATA_CLIP = 4.6;

// Inquadratura di riferimento (quella del poster): 16:10, 52 gradi in verticale.
const ASPETTO_RIF = 1.6;
const FOV_RIF = 52;

// Lo zoom che accompagna la panoramica: la lupa resta intorno al 12% dell'altezza.
const ALTEZZA_LUPA = 1.4;
const QUOTA_SCHERMO_LUPA = 0.12;
const ZOOM_MINIMO = 0.62;
const ATTACCO_PANORAMICA = 0.75;
const PERIODO_GALOPPO = 0.39;

// Colori (sRGB)
const COLORE_CIELO = "#efe9df";
const COLORE_ZENIT = "#f8f5ef";
const TRAVERTINO = "#ece3d4";
const SUOLO = "#dbd4c8";
const LUCE_SOLE = "#fff0db";

/** Sole radente da ovest (azimut -160, altezza 26 gradi in Blender), in assi glTF. */
const DIREZIONE_SOLE = new Vector3(-0.8446, 0.4384, 0.3074).normalize();
const CENTRO_OMBRE = new Vector3(8, 0, 76);

export type Scena = {
  /** Disegna il fotogramma al tempo t (secondi della clip). */
  disegna(t: number): void;
  ridimensiona(): void;
  distruggi(): void;
};

type Opzioni = {
  suProgresso?: (frazione: number) => void;
  /** Peso stimato del file, se il server non manda Content-Length (es. compressione al volo). */
  pesoStimato?: number;
};

function smootherstep(x: number) {
  const c = MathUtils.clamp(x, 0, 1);
  return c * c * c * (c * (6 * c - 15) + 10);
}

/** AO cotta nei colori dei vertici: scurisce solo la luce ambiente, il sole resta pieno. */
function materialeConAO(colore: string, forza: number) {
  const m = new MeshLambertMaterial({ color: new Color(colore), vertexColors: true, flatShading: true });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.forzaAO = { value: forza };
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float forzaAO;")
      .replace("#include <color_fragment>", "")
      .replace(
        "#include <aomap_fragment>",
        "float occlusione = mix(1.0, pow(vColor.r, 0.85), forzaAO);\nreflectedLight.indirectDiffuse *= occlusione;\nreflectedLight.directDiffuse *= mix(1.0, occlusione, 0.25);",
      );
  };
  return m;
}

export async function creaScena(canvas: HTMLCanvasElement, url: string, opzioni: Opzioni = {}): Promise<Scena> {
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.shadowMap.autoUpdate = true;
  renderer.setClearColor(new Color(COLORE_CIELO), 1);

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await new Promise<GLTF>((ok, ko) => {
    loader.load(
      url,
      ok,
      (e) => {
        const totale = e.total || opzioni.pesoStimato || 0;
        if (totale > 0) opzioni.suProgresso?.(Math.min(0.98, e.loaded / totale));
      },
      ko,
    );
  });

  const scena = new Scene();
  scena.add(gltf.scene);
  scena.fog = new Fog(new Color(COLORE_CIELO), 60, 280);

  const pmrem = new PMREMGenerator(renderer);
  const ambiente = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const cielo = new HemisphereLight(new Color("#eef0f3"), new Color("#b9a891"), 0.9);
  scena.add(cielo);
  const sole = new DirectionalLight(new Color(LUCE_SOLE), 3.1);
  sole.position.copy(CENTRO_OMBRE).addScaledVector(DIREZIONE_SOLE, 220);
  sole.target.position.copy(CENTRO_OMBRE);
  sole.castShadow = true;
  sole.shadow.mapSize.set(2048, 2048);
  const ombra = sole.shadow.camera;
  ombra.left = -75;
  ombra.right = 75;
  ombra.top = 60;
  ombra.bottom = -60;
  ombra.near = 60;
  ombra.far = 420;
  sole.shadow.bias = -0.0005;
  sole.shadow.normalBias = 0.12;
  scena.add(sole, sole.target);

  const architettura = materialeConAO(TRAVERTINO, 0.92);
  const terreno = materialeConAO(SUOLO, 0.9);
  // oltre la striscia cotta in Blender il suolo prosegue fino a sparire nella nebbia
  const piano = new Mesh(new CircleGeometry(2200, 48), new MeshLambertMaterial({ color: new Color(SUOLO) }));
  piano.rotation.x = -Math.PI / 2;
  piano.position.y = -0.12;
  piano.receiveShadow = true;
  scena.add(piano);

  // cielo: cupola con la stessa tinta della nebbia all'orizzonte, cosi' il suolo vi sfuma senza linea
  const cupola = new SphereGeometry(2600, 32, 16);
  const pos = cupola.getAttribute("position");
  const colori = new Float32Array(pos.count * 3);
  const orizzonte = new Color(COLORE_CIELO);
  const zenit = new Color(COLORE_ZENIT);
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    const h = MathUtils.clamp(pos.getY(i) / 2600, 0, 1);
    c.copy(orizzonte).lerp(zenit, Math.pow(h, 0.6));
    colori.set([c.r, c.g, c.b], i * 3);
  }
  cupola.setAttribute("color", new BufferAttribute(colori, 3));
  // niente tone mapping: la nebbia in three.js si mescola dopo, quindi cielo e nebbia combaciano
  const cielo3d = new Mesh(
    cupola,
    new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false, depthWrite: false, toneMapped: false }),
  );
  scena.add(cielo3d);
  gltf.scene.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    o.castShadow = true;
    o.receiveShadow = true;
    // il file non ha normali (piu' leggero): servono solo allo scostamento delle ombre
    if (!o.geometry.getAttribute("normal")) o.geometry.computeVertexNormals();
    if (o.name === "Colosseo") o.material = architettura;
    else if (o.name === "Suolo") {
      o.material = terreno;
      o.castShadow = false;
    } else {
      // la lupa: bronzo con riflessi della stanza neutra
      const m = o.material as MeshStandardMaterial;
      m.envMap = ambiente;
      m.envMapIntensity = 1.1;
      m.color = new Color("#9a6a35");
      m.metalness = 0.8;
      m.roughness = 0.36;
      m.flatShading = true;
      o.frustumCulled = false;
    }
  });
  const lupa: Object3D | undefined = gltf.scene.getObjectByName("Lupa_Percorso");

  const camera = gltf.cameras[0] as PerspectiveCamera;
  camera.near = 0.3;
  camera.far = 3000;

  const mixer = new AnimationMixer(gltf.scene);
  for (const clip of gltf.animations) {
    const azione = mixer.clipAction(clip);
    if (clip.name === "Corsa") {
      azione.setLoop(LoopRepeat, Infinity);
      azione.timeScale = clip.duration / PERIODO_GALOPPO;
    } else {
      azione.setLoop(LoopOnce, 1);
      azione.clampWhenFinished = true;
    }
    azione.play();
  }

  const posCamera = new Vector3();
  const posLupa = new Vector3();
  let larghezza = 0;
  let altezza = 0;

  function ridimensiona() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    if (w === larghezza && h === altezza) return;
    larghezza = w;
    altezza = h;
    renderer.setSize(w, h, false);
  }

  /** Inquadratura come background-size: cover sul poster di riferimento. */
  function inquadra(fovRif: number, fetta: number) {
    const a = larghezza / Math.max(1, altezza);
    if (a >= ASPETTO_RIF) {
      camera.clearViewOffset();
      camera.aspect = a;
      const t = Math.tan(MathUtils.degToRad(fovRif / 2)) * (ASPETTO_RIF / a);
      camera.fov = MathUtils.radToDeg(2 * Math.atan(t));
    } else {
      // fetta verticale del fotogramma di riferimento, come background-position: fetta% 50%
      camera.aspect = ASPETTO_RIF;
      camera.fov = fovRif;
      const pieno = ASPETTO_RIF * altezza;
      camera.setViewOffset(pieno, altezza, fetta * (pieno - larghezza), 0, larghezza, altezza);
    }
    camera.updateProjectionMatrix();
  }

  function disegna(t: number) {
    ridimensiona();
    mixer.setTime(MathUtils.clamp(t, 0, DURATA_CLIP));
    gltf.scene.updateMatrixWorld(true);
    // la panoramica entra piano (stessa curva usata in Blender) e porta con se' lo zoom
    const w = smootherstep((t - T_FERMA) / ATTACCO_PANORAMICA);
    let fov = FOV_RIF;
    if (w > 0 && lupa) {
      camera.getWorldPosition(posCamera);
      lupa.getWorldPosition(posLupa);
      const d = posCamera.distanceTo(posLupa);
      const segui = MathUtils.radToDeg(2 * Math.atan(ALTEZZA_LUPA / (2 * QUOTA_SCHERMO_LUPA * d)));
      fov = MathUtils.lerp(FOV_RIF, MathUtils.clamp(segui, FOV_RIF * ZOOM_MINIMO, FOV_RIF), w);
    }
    inquadra(fov, MathUtils.lerp(FETTA_INIZIALE, FETTA_FINALE, w));
    renderer.render(scena, camera);
  }

  function distruggi() {
    mixer.stopAllAction();
    gltf.scene.traverse((o) => {
      if (o instanceof Mesh) {
        o.geometry.dispose();
        const m = o.material;
        (Array.isArray(m) ? m : [m]).forEach((x) => x.dispose());
      }
    });
    architettura.dispose();
    terreno.dispose();
    piano.geometry.dispose();
    (piano.material as MeshLambertMaterial).dispose();
    cupola.dispose();
    (cielo3d.material as MeshBasicMaterial).dispose();
    ambiente.dispose();
    renderer.dispose();
  }

  // prima di dichiararsi pronta compila gli shader (anche quelli delle ombre) con un disegno a
  // vuoto, a tela ancora trasparente: il primo fotogramma visibile non si ferma
  disegna(0);
  opzioni.suProgresso?.(1);
  return { disegna, ridimensiona, distruggi };
}
