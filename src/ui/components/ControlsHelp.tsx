import { KEY_BINDINGS, KEY_LABELS, PAUSE_KEYS } from '../../game/input/keyBindings';
import type { InputAction } from '../../game/input/commands';

const ACTION_LABELS: readonly { action: InputAction; label: string }[] = [
  { action: 'forward', label: 'Sail forward' },
  { action: 'turnLeft', label: 'Turn left' },
  { action: 'turnRight', label: 'Turn right' },
  { action: 'fireFront', label: 'Front cannon' },
  { action: 'fireLeft', label: 'Left broadside' },
  { action: 'fireRight', label: 'Right broadside' },
];

function Keys({ codes }: { codes: readonly string[] }) {
  return (
    <>
      {codes.map((code, index) => (
        <span key={code}>
          {index > 0 ? ' / ' : null}
          <kbd>{KEY_LABELS[code] ?? code}</kbd>
        </span>
      ))}
    </>
  );
}

export function ControlsHelp() {
  return (
    <section aria-labelledby="controls-title">
      <h2 id="controls-title" className="sr-only">
        Controls
      </h2>
      <dl className="controls-help" data-testid="controls-help">
        {ACTION_LABELS.map(({ action, label }) => (
          <div key={action} style={{ display: 'contents' }}>
            <dt>{label}</dt>
            <dd>
              <Keys codes={KEY_BINDINGS[action]} />
            </dd>
          </div>
        ))}
        <div style={{ display: 'contents' }}>
          <dt>Pause</dt>
          <dd>
            <Keys codes={PAUSE_KEYS} />
          </dd>
        </div>
      </dl>
      <p className="muted" style={{ fontSize: '0.8rem', marginBottom: 0 }}>
        On touch screens, use the on-screen buttons. Move and fire at the same time.
      </p>
    </section>
  );
}
