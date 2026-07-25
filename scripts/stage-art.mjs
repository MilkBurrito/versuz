// Stage game art from the raw asset packs into versuz/public/ with normalized
// names, and generate the enemy/environment manifests. Copy + rename ONLY —
// pixels are never edited. Asserts frame math against PNG headers.
// Re-run with: node scripts/stage-art.mjs
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, "..");
const assetRoot = resolve(appRoot, ".."); // .../UpWord/Versuz
const HEROES_SRC = join(assetRoot, "Character Sprites", "Heroes");
const ENEMIES_SRC = join(assetRoot, "Character Sprites", "Enemies");
const ENV_SRC = join(assetRoot, "Environments");
const PUB = join(appRoot, "public");

let failures = 0;
function fail(msg) {
  console.error("✗ " + msg);
  failures++;
}

function pngSize(file) {
  const buf = readFileSync(file);
  if (buf.readUInt32BE(12) !== 0x49484452) throw new Error(`Not a PNG IHDR: ${file}`);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function naturalSort(a, b) {
  return a.localeCompare(b, undefined, { numeric: true });
}

// ---------------------------------------------------------------------------
// HEROES — 288×128 frame folders → public/sprites/heroes/<id>/<anim>/<n>.png
// ---------------------------------------------------------------------------
const HEROES = [
  {
    id: "fire-knight", pack: "Elementals_fire_knight_FREE_v1.1", base: "png/fire_knight",
    portrait: "fire_knight.png",
    anims: { idle: ["01_idle", 8], run: ["02_run", 8], atk1: ["05_1_atk", 11], atk2: ["06_2_atk", 19], atk3: ["07_3_atk", 28], sp_atk: ["08_sp_atk", 18], hit: ["10_take_hit", 6], death: ["11_death", 13] },
  },
  {
    id: "water-priestess", pack: "Elementals_water_priestess_FREE_v1.1", base: "png",
    portrait: "water_priestess.png",
    anims: { idle: ["01_idle", 8], run: ["02_walk", 10], atk1: ["07_1_atk", 7], atk2: ["08_2_atk", 21], atk3: ["09_3_atk", 27], sp_atk: ["10_sp_atk", 32], hit: ["13_take_hit", 7], death: ["14_death", 16] },
  },
  {
    id: "crystal-mauler", pack: "Elementals_Crystal_Mauler_Free_v1.0", base: "animations/PNG",
    portrait: "crystal_mauler.png",
    anims: { idle: ["idle", 8], run: ["run", 8], atk1: ["1_atk", 7], atk2: ["2_atk", 7], atk3: ["3_atk", 17], sp_atk: ["sp_atk", 15], hit: ["take_hit", 6], death: ["death", 15] },
  },
  {
    id: "leaf-ranger", pack: "Elementals_Leaf_ranger_Free_v1.0", base: "animations/PNG",
    portrait: "leaf_ranger.png",
    anims: { idle: ["idle", 12], run: ["run", 10], atk1: ["1_atk", 10], atk2: ["2_atk", 15], atk3: ["3_atk", 12], sp_atk: ["sp_atk", 17], hit: ["take_hit", 6], death: ["death", 19] },
  },
  {
    id: "metal-bladekeeper", pack: "Elementals_metal_bladekeeper_FREE_v1.1", base: "PNG animations",
    portrait: "metal_bladekeeper.png",
    anims: { idle: ["01_idle", 8], run: ["02_run", 8], atk1: ["07_1_atk", 6], atk2: ["08_2_atk", 8], atk3: ["09_3_atk", 18], sp_atk: ["10_sp_atk", 11], hit: ["12_take_hit", 6], death: ["13_death", 12] },
  },
];

const heroManifest = {};
for (const hero of HEROES) {
  const packDir = join(HEROES_SRC, hero.pack);
  // portrait → public/icons/heroes/<id>.png
  const portraitSrc = join(packDir, hero.portrait);
  const { w: pw, h: ph } = pngSize(portraitSrc);
  if (pw !== 64 || ph !== 64) fail(`${hero.id} portrait is ${pw}x${ph}, expected 64x64`);
  mkdirSync(join(PUB, "icons", "heroes"), { recursive: true });
  cpSync(portraitSrc, join(PUB, "icons", "heroes", `${hero.id}.png`));

  heroManifest[hero.id] = {};
  for (const [anim, [srcDir, expected]] of Object.entries(hero.anims)) {
    const src = join(packDir, hero.base, srcDir);
    const frames = readdirSync(src).filter((f) => f.endsWith(".png")).sort(naturalSort);
    if (frames.length !== expected)
      fail(`${hero.id}/${anim}: ${frames.length} frames, expected ${expected}`);
    const dst = join(PUB, "sprites", "heroes", hero.id, anim);
    mkdirSync(dst, { recursive: true });
    frames.forEach((f, i) => {
      const { w, h } = pngSize(join(src, f));
      if (w !== 288 || h !== 128) fail(`${hero.id}/${anim}/${f}: ${w}x${h}, expected 288x128`);
      cpSync(join(src, f), join(dst, `${i + 1}.png`));
    });
    heroManifest[hero.id][anim] = frames.length;
  }
  console.log(`✓ hero ${hero.id}: ${Object.keys(hero.anims).length} anims`);
}

// ---------------------------------------------------------------------------
// ENEMIES — strips → public/sprites/enemies/<id>/<anim>.png + manifest
// anims are role-named: idle / attack / hurt / death (missing → idle fallback)
// ---------------------------------------------------------------------------
const T1 = "L1-L2 - Small enemies";
const T2 = "L3-L6 - Medium enemies";
const T3 = "L7 - Bosses";

const ENEMIES = [
  // --- tier 1 (small) ---
  { id: "orc", tier: 1, displayH: 130, name: "Orc", anims: { idle: [`${T1}/Orc/Orc/Orc-Idle.png`, 6], attack: [`${T1}/Orc/Orc/Orc-Attack01.png`, 6], hurt: [`${T1}/Orc/Orc/Orc-Hurt.png`, 4], death: [`${T1}/Orc/Orc/Orc-Death.png`, 4] } },
  { id: "blood-monster", tier: 1, displayH: 130, name: "Blood Monster", anims: { idle: [`${T1}/Blood Monster_A/Blood Monster_A/Blood Monster_A_Idle.png`, 6], attack: [`${T1}/Blood Monster_A/Blood Monster_A/Blood Monster_A_Attack01.png`, 8], hurt: [`${T1}/Blood Monster_A/Blood Monster_A/Blood Monster_A_Hurt.png`, 4], death: [`${T1}/Blood Monster_A/Blood Monster_A/Blood Monster_A_Death.png`, 4] } },
  { id: "demon-imp", tier: 1, displayH: 130, name: "Imp", anims: { idle: [`${T1}/Demon_A/Demon_A/Demon_A_Idle.png`, 6], attack: [`${T1}/Demon_A/Demon_A/Demon_A_Attack01.png`, 7], hurt: [`${T1}/Demon_A/Demon_A/Demon_A_Hurt.png`, 4], death: [`${T1}/Demon_A/Demon_A/Demon_A_Death.png`, 4] } },
  { id: "fire-skull", tier: 1, displayH: 120, name: "Fire Skull", anims: { idle: [`${T1}/Fire-Skull-Files/Spritesheets/fire-skull.png`, 8] } },
  { id: "lizzard", tier: 1, displayH: 74, name: "Lizzard", anims: { idle: [`${T1}/Grotto-escape-2-lizzard/spritesheets/idle.png`, 4], attack: [`${T1}/Grotto-escape-2-lizzard/spritesheets/tongue.png`, 5], hurt: [`${T1}/Grotto-escape-2-lizzard/spritesheets/hurt.png`, 3] } },
  { id: "snake", tier: 1, displayH: 64, name: "Serpent", anims: { idle: [`${T1}/Grotto-escape-2-snake/spritesheets/idle.png`, 4], attack: [`${T1}/Grotto-escape-2-snake/spritesheets/shoot.png`, 4], hurt: [`${T1}/Grotto-escape-2-snake/spritesheets/hurt.png`, 3] } },
  { id: "crow", tier: 1, displayH: 92, name: "Crow", anims: { idle: [`${T1}/crow/Spritesheets/crow-idle.png`, 3], attack: [`${T1}/crow/Spritesheets/crow-fly.png`, 2] } },
  { id: "reaper", tier: 1, displayH: 118, name: "Reaper", anims: { idle: [`${T1}/death/Spritesheets/death-walk.png`, 6], attack: [`${T1}/death/Spritesheets/death-lamp-rise.png`, 11] } },
  { id: "ghost", tier: 1, displayH: 110, name: "Ghost", anims: { idle: [`${T1}/enemy-ghost/Spritesheets/particles.png`, 6] } },
  { id: "flying-eye", tier: 1, displayH: 92, name: "Flying Eye", anims: { idle: [`${T1}/flying-eye-demon/Spritesheet.png`, 8] } },
  { id: "meerman", tier: 1, displayH: 72, name: "Meerman", anims: { idle: [`${T1}/meerman/Spritesheet.png`, 2] } },
  // --- tier 2 (medium) ---
  { id: "phantom", tier: 2, displayH: 140, name: "Phantom", anims: { idle: [`${T2}/Ghost-Files/Spritesheets/ghost-Idle.png`, 7], attack: [`${T2}/Ghost-Files/Spritesheets/ghost-Shriek.png`, 4], death: [`${T2}/Ghost-Files/Spritesheets/ghost-Vanish.png`, 7] } },
  { id: "hell-beast", tier: 2, displayH: 200, name: "Hell Beast", anims: { idle: [`${T2}/Hell-Beast-Files/Idle/Spritesheet.png`, 6], attack: [`${T2}/Hell-Beast-Files/Breath/Spritesheet.png`, 4] } },
  { id: "hell-hound", tier: 2, displayH: 105, name: "Hell Hound", anims: { idle: [`${T2}/Hell-Hound-Files/Spritesheets/hell-hound-idle.png`, 11], attack: [`${T2}/Hell-Hound-Files/Spritesheets/hell-hound-run.png`, 5] } },
  { id: "nightmare", tier: 2, displayH: 150, name: "Nightmare", anims: { idle: [`${T2}/Nightmare-Files/Spritesheets/idle.png`, 4], attack: [`${T2}/Nightmare-Files/Spritesheets/run.png`, 3] } },
  { id: "slime", tier: 2, displayH: 110, name: "Slime", anims: { idle: [`${T2}/Slime/slime-sheet.png`, 4] } },
  { id: "werewolf", tier: 2, displayH: 140, name: "Werewolf", anims: { idle: [`${T2}/WereWolf/Spritesheets/werewolf-idle.png`, 5], attack: [`${T2}/WereWolf/Spritesheets/werewolf-run.png`, 6] } },
  { id: "mutant-toad", tier: 2, displayH: 128, name: "Mutant Toad", anims: { idle: [`${T2}/mutant-toad/Spritesheets/mutant-toad-idle.png`, 4], attack: [`${T2}/mutant-toad/Spritesheets/mutant-toad-attack.png`, 3] } },
  // --- tier 3 (bosses) ---
  { id: "centaur", tier: 3, displayH: 200, name: "Centaur", anims: { idle: [`${T3}/Centaur/centaur.png`, 4] } },
  { id: "dragon", tier: 3, displayH: 150, name: "Dragon", anims: { idle: [`${T3}/Grotto-escape-2-boss-dragon/spritesheets/idle.png`, 6], attack: [`${T3}/Grotto-escape-2-boss-dragon/spritesheets/breath.png`, 7] } },
  { id: "ogre", tier: 3, displayH: 175, name: "Ogre", anims: { idle: [`${T3}/Ogre/Spritesheets/ogre-idle.png`, 4], attack: [`${T3}/Ogre/Spritesheets/ogre-attack.png`, 7] } },
  { id: "treant", tier: 3, displayH: 175, name: "Treant", anims: { idle: [`${T3}/Treant/Treant.png`, 4] } },
  { id: "vampire", tier: 3, displayH: 195, name: "Vampire", anims: { idle: [`${T3}/Vampire/vampire.png`, 4] } },
  { id: "wizard", tier: 3, displayH: 200, name: "Wizard", anims: { idle: [`${T3}/Wizard/wizard-sheet.png`, 6] } },
  { id: "arch-demon", tier: 3, displayH: 220, name: "Arch Demon", anims: { idle: [`${T3}/demon-Files/Spritesheets/demon-idle.png`, 6], attack: [`${T3}/demon-Files/Spritesheets/demon-attack-no-breath.png`, 6] } },
];

const enemyManifest = [];
for (const e of ENEMIES) {
  const dst = join(PUB, "sprites", "enemies", e.id);
  mkdirSync(dst, { recursive: true });
  const anims = {};
  for (const [role, [srcRel, frames]] of Object.entries(e.anims)) {
    const src = join(ENEMIES_SRC, srcRel);
    if (!existsSync(src)) {
      fail(`${e.id}/${role}: missing ${srcRel}`);
      continue;
    }
    const { w, h } = pngSize(src);
    if (w % frames !== 0)
      fail(`${e.id}/${role}: width ${w} not divisible by ${frames} frames (${srcRel})`);
    cpSync(src, join(dst, `${role}.png`));
    anims[role] = { file: `${role}.png`, frames, frameW: w / frames, frameH: h };
  }
  enemyManifest.push({ id: e.id, name: e.name, tier: e.tier, displayH: e.displayH, anims });
  console.log(`✓ enemy ${e.id} (t${e.tier}): ${Object.keys(anims).join(", ")}`);
}

writeFileSync(
  join(appRoot, "src", "config", "enemies.generated.ts"),
  `// AUTO-GENERATED by scripts/stage-art.mjs — do not edit by hand.
// Strip metadata measured from the PNG headers at staging time.

export interface EnemyAnimMeta {
  file: string;
  frames: number;
  frameW: number;
  frameH: number;
}

export interface EnemyMeta {
  id: string;
  name: string;
  /** 1 = small (verse L1-2) · 2 = medium (L3-6) · 3 = boss (L7 + campaign bosses) */
  tier: 1 | 2 | 3;
  /** Rendered height in the match scene (art density varies wildly per pack). */
  displayH: number;
  anims: Partial<Record<"idle" | "attack" | "hurt" | "death", EnemyAnimMeta>>;
}

export const ENEMY_META: EnemyMeta[] = ${JSON.stringify(enemyManifest, null, 2)};
`,
);

// ---------------------------------------------------------------------------
// ENVIRONMENTS — parallax layers (back → front) → public/environments/<id>/<n>.png
// ---------------------------------------------------------------------------
const HOME_ENV = "Home screen Environments";
const MATCH_ENV = "Match Environments";
const ENVIRONMENTS = [
  { id: "forest-glow", layers: [
    `${HOME_ENV}/parallax_forest_pack web/v1/layers/parallax-forest-back-trees.png`,
    `${HOME_ENV}/parallax_forest_pack web/v1/layers/parallax-forest-lights.png`,
    `${HOME_ENV}/parallax_forest_pack web/v1/layers/parallax-forest-middle-trees.png`,
    `${HOME_ENV}/parallax_forest_pack web/v1/layers/parallax-forest-front-trees.png`,
  ] },
  { id: "forest-deep", layers: [
    `${HOME_ENV}/parallax_forest_pack web/v2/layers/back.png`,
    `${HOME_ENV}/parallax_forest_pack web/v2/layers/middle.png`,
    `${HOME_ENV}/parallax_forest_pack web/v2/layers/front.png`,
  ] },
  { id: "forest-road", layers: [
    `${HOME_ENV}/forest-road-background/PNG/back.png`,
    `${HOME_ENV}/forest-road-background/PNG/middle.png`,
    `${HOME_ENV}/forest-road-background/PNG/front.png`,
  ] },
  { id: "mist-forest", layers: [
    `${MATCH_ENV}/mist-forest-background/layers/mist-forest-background-back.png`,
    `${MATCH_ENV}/mist-forest-background/layers/mist-forest-background-back-trees.png`,
    `${MATCH_ENV}/mist-forest-background/layers/mist-forest-background-tree.png`,
    `${MATCH_ENV}/mist-forest-background/layers/mist-forest-background-rocks.png`,
  ] },
  { id: "rocky-pass", layers: [
    `${MATCH_ENV}/Rocky Pass Files/PNG/back.png`,
    `${MATCH_ENV}/Rocky Pass Files/PNG/middle.png`,
    `${MATCH_ENV}/Rocky Pass Files/PNG/near.png`,
  ] },
  { id: "junk-wastelands", layers: [
    `${MATCH_ENV}/Junk Wastelands Files/layers/back.png`,
    `${MATCH_ENV}/Junk Wastelands Files/layers/middle.png`,
    `${MATCH_ENV}/Junk Wastelands Files/layers/near.png`,
  ] },
  { id: "underwater", layers: [
    `${MATCH_ENV}/Underwater Fantasy/PNG/layers/far.png`,
    `${MATCH_ENV}/Underwater Fantasy/PNG/layers/sand.png`,
    `${MATCH_ENV}/Underwater Fantasy/PNG/layers/foregound-merged.png`,
  ] },
  { id: "lava", layers: [
    `${MATCH_ENV}/lava-background/PNG/background.png`,
    `${MATCH_ENV}/lava-background/PNG/middle-rocks.png`,
  ] },
  // gothic-castle removed 2026-07-24 (Alex: the dark castle broke immersion).
];

const envManifest = [];
for (const env of ENVIRONMENTS) {
  const dst = join(PUB, "environments", env.id);
  mkdirSync(dst, { recursive: true });
  const layers = [];
  env.layers.forEach((rel, i) => {
    const src = join(ENV_SRC, rel);
    if (!existsSync(src)) {
      fail(`env ${env.id}: missing ${rel}`);
      return;
    }
    const { w, h } = pngSize(src);
    cpSync(src, join(dst, `${i + 1}.png`));
    layers.push({ src: `/environments/${env.id}/${i + 1}.png`, w, h });
  });
  envManifest.push({ id: env.id, layers });
  console.log(`✓ env ${env.id}: ${layers.length} layers`);
}

writeFileSync(
  join(appRoot, "src", "config", "environments.generated.ts"),
  `// AUTO-GENERATED by scripts/stage-art.mjs — do not edit by hand.
// Parallax layers in back → front order, with native pixel sizes.

export interface EnvLayer {
  src: string;
  w: number;
  h: number;
}

export interface EnvMeta {
  id: string;
  layers: EnvLayer[];
}

export const ENVIRONMENTS: EnvMeta[] = ${JSON.stringify(envManifest, null, 2)};
`,
);

// ---------------------------------------------------------------------------
// Cleanup superseded sprite folders (replaced by heroes/ and enemies/)
// ---------------------------------------------------------------------------
for (const old of ["sprites/characters", "sprites/soldier", "sprites/orc", "sprites/blood-monster", "sprites/demon"]) {
  const p = join(PUB, old);
  if (existsSync(p)) {
    rmSync(p, { recursive: true });
    console.log(`- removed superseded ${old}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} assertion failure(s) — fix the tables above.`);
  process.exit(1);
}
console.log("\nAll assets staged + manifests written.");
