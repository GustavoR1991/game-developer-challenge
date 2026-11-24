import { playSound } from './soundManager';

export function playUiSound(kind: 'click'): void {
  if (kind === 'click') playSound('click');
}
