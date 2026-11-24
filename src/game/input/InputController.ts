import { createEmptyCommands, INPUT_ACTIONS, type InputAction, type InputCommands } from './commands';
import { actionForKey, PAUSE_KEYS } from './keyBindings';

export interface InputControllerOptions {
  target: Window;
  onPauseRequested: () => void;
}

export class InputController {
  private readonly target: Window;
  private readonly onPauseRequested: () => void;
  private readonly keyboard = createEmptyCommands();
  private readonly touch = createEmptyCommands();
  private readonly merged = createEmptyCommands();
  private enabled = false;
  private attached = false;

  constructor(options: InputControllerOptions) {
    this.target = options.target;
    this.onPauseRequested = options.onPauseRequested;
  }

  attach(): void {
    if (this.attached) return;
    this.target.addEventListener('keydown', this.handleKeyDown);
    this.target.addEventListener('keyup', this.handleKeyUp);
    this.attached = true;
  }

  detach(): void {
    if (!this.attached) return;
    this.target.removeEventListener('keydown', this.handleKeyDown);
    this.target.removeEventListener('keyup', this.handleKeyUp);
    this.attached = false;
    this.reset();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.reset();
  }

  setTouchAction(action: InputAction, pressed: boolean): void {
    if (!this.enabled && pressed) return;
    this.touch[action] = pressed;
  }

  reset(): void {
    for (const action of INPUT_ACTIONS) {
      this.keyboard[action] = false;
      this.touch[action] = false;
      this.merged[action] = false;
    }
  }

  read(): InputCommands {
    for (const action of INPUT_ACTIONS) {
      this.merged[action] = this.enabled && (this.keyboard[action] || this.touch[action]);
    }
    return this.merged;
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled || event.ctrlKey || event.metaKey || event.altKey) return;
    if (isEditableTarget(event.target)) return;

    if (PAUSE_KEYS.includes(event.code)) {
      event.preventDefault();
      if (!event.repeat) this.onPauseRequested();
      return;
    }

    const action = actionForKey(event.code);
    if (!action) return;
    event.preventDefault();
    this.keyboard[action] = true;
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    const action = actionForKey(event.code);
    if (!action) return;
    if (this.enabled) event.preventDefault();
    this.keyboard[action] = false;
  };
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
