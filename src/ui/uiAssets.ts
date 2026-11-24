import { assetUrl } from '../utils/assetUrl';

export type UiIconName =
  | 'close'
  | 'fire_front'
  | 'fire_left'
  | 'fire_right'
  | 'forward'
  | 'home'
  | 'minus'
  | 'pause'
  | 'play'
  | 'plus'
  | 'restart'
  | 'settings'
  | 'turn_left'
  | 'turn_right';

export type HudIconName = 'heart' | 'score' | 'time';

function density(): 'default' | 'retina' {
  return typeof window !== 'undefined' && window.devicePixelRatio >= 1.5 ? 'retina' : 'default';
}

export function uiIcon(name: UiIconName): string {
  return assetUrl(`assets/png/${density()}/ui/controls/icon_${name}.png`);
}

export function hudIcon(name: HudIconName): string {
  return assetUrl(`assets/png/${density()}/ui/hud/icon_${name}.png`);
}

export function menuImage(name: 'title_pirate_battle'): string {
  return assetUrl(`assets/png/${density()}/ui/menu/${name}.png`);
}
