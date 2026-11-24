import type { InputAction } from './commands';

export const KEY_BINDINGS: Readonly<Record<InputAction, readonly string[]>> = {
  forward: ['KeyW', 'ArrowUp'],
  turnLeft: ['KeyA', 'ArrowLeft'],
  turnRight: ['KeyD', 'ArrowRight'],
  fireFront: ['Space', 'KeyK'],
  fireLeft: ['KeyQ', 'KeyJ'],
  fireRight: ['KeyE', 'KeyL'],
};

export const PAUSE_KEYS: readonly string[] = ['Escape', 'KeyP'];

export const KEY_LABELS: Readonly<Record<string, string>> = {
  KeyW: 'W',
  KeyA: 'A',
  KeyD: 'D',
  KeyK: 'K',
  KeyQ: 'Q',
  KeyJ: 'J',
  KeyE: 'E',
  KeyL: 'L',
  KeyP: 'P',
  ArrowUp: '↑',
  ArrowLeft: '←',
  ArrowRight: '→',
  Space: 'Space',
  Escape: 'Esc',
};

const ACTION_BY_CODE = new Map<string, InputAction>(
  (Object.entries(KEY_BINDINGS) as [InputAction, readonly string[]][]).flatMap(([action, codes]) =>
    codes.map((code) => [code, action] as const),
  ),
);

export function actionForKey(code: string): InputAction | undefined {
  return ACTION_BY_CODE.get(code);
}
