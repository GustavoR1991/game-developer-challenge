import type { ComponentPropsWithRef } from 'react';
import { playUiSound } from '../../game/audio/uiSounds';

interface GameButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: 'primary' | 'secondary';
  size?: 'regular' | 'small';
}

export function GameButton({
  variant = 'primary',
  size = 'regular',
  className,
  type = 'button',
  onClick,
  ...props
}: GameButtonProps) {
  const classes = [
    'game-button',
    variant === 'secondary' ? 'game-button--secondary' : '',
    size === 'small' ? 'game-button--small' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type={type}
      className={classes}
      onClick={(event) => {
        playUiSound('click');
        onClick?.(event);
      }}
      {...props}
    />
  );
}
