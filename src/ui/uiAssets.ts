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
  return assetUrl(`assets/ui/${density()}/controls/icon_${name}.png`);
}

export function hudIcon(name: HudIconName): string {
  return assetUrl(`assets/ui/${density()}/hud/icon_${name}.png`);
}

export function menuImage(name: 'title_pirate_battle'): string {
  return assetUrl(`assets/ui/${density()}/menu/${name}.png`);
}

export const SHIP_ICON = {
  sheet: 'assets/sheets/ships.png',
  x: 408,
  y: 115,
  width: 66,
  height: 113,
  sheetWidth: 1024,
  sheetHeight: 512,
};

export function shipIconStyle(height: number) {
  const scale = height / SHIP_ICON.height;
  return {
    width: SHIP_ICON.width * scale,
    height,
    backgroundImage: `url(${assetUrl(SHIP_ICON.sheet)})`,
    backgroundSize: `${SHIP_ICON.sheetWidth * scale}px ${SHIP_ICON.sheetHeight * scale}px`,
    backgroundPosition: `-${SHIP_ICON.x * scale}px -${SHIP_ICON.y * scale}px`,
  };
}
