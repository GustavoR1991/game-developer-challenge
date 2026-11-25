import { KEY_BINDINGS, KEY_LABELS, PAUSE_KEYS } from '../../../game/input/keyBindings';
import type { InputAction } from '../../../game/input/commands';

const GROUPS: readonly { label: string; actions: readonly InputAction[] }[] = [
  { label: 'Sail', actions: ['forward', 'turnLeft', 'turnRight'] },
  { label: 'Fire front / left / right', actions: ['fireFront', 'fireLeft', 'fireRight'] },
];

function primaryKey(action: InputAction): string {
  const code = KEY_BINDINGS[action][0] ?? '';
  return KEY_LABELS[code] ?? code;
}

export function ControlsHelp() {
  return (
    <section className="controls-help" aria-labelledby="controls-title" data-testid="controls-help">
      <h2 id="controls-title" className="sr-only">
        Controls
      </h2>
      <dl>
        {GROUPS.map((group) => (
          <div key={group.label}>
            <dt>{group.label}</dt>
            <dd>
              {group.actions.map((action) => (
                <kbd key={action}>{primaryKey(action)}</kbd>
              ))}
            </dd>
          </div>
        ))}
        <div>
          <dt>Pause</dt>
          <dd>
            <kbd>{KEY_LABELS[PAUSE_KEYS[0] ?? ''] ?? 'Esc'}</kbd>
          </dd>
        </div>
      </dl>
      <p className="controls-help__note">Arrow keys also sail. On touch screens use the on-screen buttons.</p>
    </section>
  );
}
