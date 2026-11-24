import { isMuted } from './soundSettings';

export function playUiSound(kind: 'click'): void {
  if (isMuted()) return;
  void import('./soundManager').then(({ playSound }) => {
    if (kind === 'click') playSound('click');
  });
}
