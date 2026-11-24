import type { ComponentPropsWithRef } from 'react';
import { uiIcon, type UiIconName } from '../uiAssets';

interface RoundIconButtonProps extends ComponentPropsWithRef<'button'> {
  icon: UiIconName;
  label: string;
  size?: 'regular' | 'small';
}

export function RoundIconButton({
  icon,
  label,
  size = 'regular',
  className,
  type = 'button',
  ...props
}: RoundIconButtonProps) {
  const classes = ['round-button', size === 'small' ? 'round-button--small' : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={classes} aria-label={label} title={label} {...props}>
      <img src={uiIcon(icon)} alt="" draggable={false} />
    </button>
  );
}
