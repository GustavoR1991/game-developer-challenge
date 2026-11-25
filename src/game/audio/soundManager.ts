import { sound } from '@pixi/sound';
import { assetUrl } from '../../utils/assetUrl';
import type { GameEvent } from '../simulation/types';
import { isMuted } from './soundSettings';

export const SOUND_FILES = {
  cannonFront: 'cannon_fire_1',
  cannonFrontAlt: 'cannon_fire_2',
  cannonEnemy: 'cannon_fire_3',
  broadside: 'cannon_broadside',
  splash: 'cannonball_water_hit_1',
  splashAlt: 'cannonball_water_hit_2',
  woodHit: 'ship_wood_hit_1',
  woodHitAlt: 'ship_wood_hit_2',
  explosion: 'ship_explosion_1',
  explosionAlt: 'ship_explosion_2',
  collision: 'ship_collision',
  sinking: 'ship_sinking',
  score: 'score_point',
  start: 'game_start',
  over: 'game_over',
  complete: 'game_complete',
  pause: 'game_pause',
  resume: 'game_resume',
  lowHealth: 'health_low',
  timeWarning: 'time_warning',
  click: 'ui_click',
} as const;

export type SoundName = keyof typeof SOUND_FILES;

const VOLUMES: Partial<Record<SoundName, number>> = {
  cannonEnemy: 0.35,
  splash: 0.3,
  splashAlt: 0.3,
  woodHit: 0.5,
  woodHitAlt: 0.5,
  click: 0.4,
};

const MIN_INTERVAL_MS = 60;
const lastPlayed = new Map<SoundName, number>();
let registered = false;
let alternate = false;

function register(): void {
  if (registered) return;
  registered = true;
  try {
    for (const [name, file] of Object.entries(SOUND_FILES)) {
      if (sound.exists(name)) continue;
      sound.add(name, { url: assetUrl(`assets/sounds/${file}.wav`), preload: true });
    }
  } catch {
    registered = false;
  }
}

export function preloadSounds(): void {
  register();
}

export function playSound(name: SoundName): void {
  if (isMuted()) return;
  const now = performance.now();
  const previous = lastPlayed.get(name) ?? -Infinity;
  if (now - previous < MIN_INTERVAL_MS) return;
  lastPlayed.set(name, now);
  register();
  try {
    void Promise.resolve(sound.play(name, { volume: VOLUMES[name] ?? 0.6 })).catch(() => undefined);
  } catch {
    return;
  }
}

function pickAlternate(first: SoundName, second: SoundName): SoundName {
  alternate = !alternate;
  return alternate ? first : second;
}

export function playGameEvents(events: readonly GameEvent[]): void {
  for (const event of events) {
    switch (event.type) {
      case 'shotFired':
        if (event.owner === 'enemy') playSound('cannonEnemy');
        else if (event.weapon === 'front') playSound(pickAlternate('cannonFront', 'cannonFrontAlt'));
        else playSound('broadside');
        break;
      case 'projectileImpact':
        if (event.surface === 'ship') playSound(pickAlternate('woodHit', 'woodHitAlt'));
        else playSound(pickAlternate('splash', 'splashAlt'));
        break;
      case 'shipDestroyed':
        playSound(event.kind === 'player' ? 'sinking' : pickAlternate('explosion', 'explosionAlt'));
        break;
      case 'shipsCollided':
        playSound('collision');
        break;
      case 'scoreChanged':
        playSound('score');
        break;
      case 'matchEnded':
        playSound(event.reason === 'time_up' ? 'complete' : 'over');
        break;
      default:
        break;
    }
  }
}

export function stopAllSounds(): void {
  try {
    sound.stopAll();
  } catch {
    return;
  }
}
