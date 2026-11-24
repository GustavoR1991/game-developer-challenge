import { useState, type PointerEvent } from 'react';
import type { InputAction } from '../../game/input/commands';
import type { UiIconName } from '../uiAssets';
import { uiIcon } from '../uiAssets';

interface TouchControlsProps {
  onAction: (action: InputAction, pressed: boolean) => void;
  disabled: boolean;
  force: boolean;
}

const MOVE: readonly { action: InputAction; icon: UiIconName; label: string }[] = [
  { action: 'forward', icon: 'forward', label: 'Sail forward' },
  { action: 'turnLeft', icon: 'turn_left', label: 'Turn left' },
  { action: 'turnRight', icon: 'turn_right', label: 'Turn right' },
];

const FIRE: readonly { action: InputAction; icon: UiIconName; label: string }[] = [
  { action: 'fireFront', icon: 'fire_front', label: 'Fire front cannon' },
  { action: 'fireLeft', icon: 'fire_left', label: 'Fire left broadside' },
  { action: 'fireRight', icon: 'fire_right', label: 'Fire right broadside' },
];

function HoldButton({
  action,
  icon,
  label,
  onAction,
  disabled,
}: {
  action: InputAction;
  icon: UiIconName;
  label: string;
  onAction: TouchControlsProps['onAction'];
  disabled: boolean;
}) {
  const [pressed, setPressed] = useState(false);
  const release = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setPressed(false);
    onAction(action, false);
  };
  return (
    <button
      type="button"
      className="round-button"
      aria-label={label}
      data-pressed={pressed}
      data-testid={`touch-${action}`}
      disabled={disabled}
      tabIndex={-1}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setPressed(true);
        onAction(action, true);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={() => {
        setPressed(false);
        onAction(action, false);
      }}
    >
      <img src={uiIcon(icon)} alt="" draggable={false} />
    </button>
  );
}

export function TouchControls({ onAction, disabled, force }: TouchControlsProps) {
  return (
    <div
      className="touch-controls"
      data-force={force}
      data-testid="touch-controls"
      aria-label="Touch controls"
    >
      <div className="touch-controls__cluster touch-controls__cluster--move">
        {MOVE.map((button) => (
          <HoldButton key={button.action} {...button} onAction={onAction} disabled={disabled} />
        ))}
      </div>
      <div className="touch-controls__cluster touch-controls__cluster--fire">
        {FIRE.map((button) => (
          <HoldButton key={button.action} {...button} onAction={onAction} disabled={disabled} />
        ))}
      </div>
    </div>
  );
}
