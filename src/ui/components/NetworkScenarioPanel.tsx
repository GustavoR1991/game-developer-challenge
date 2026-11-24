import { useState, useSyncExternalStore } from 'react';
import type { NetworkControl } from '../../app/networkControl';
import { scenarioStore } from '../../mocks/scenarios/scenarioStore';

interface NetworkScenarioPanelProps {
  control: NetworkControl;
}

export function NetworkScenarioPanel({ control }: NetworkScenarioPanelProps) {
  const settings = useSyncExternalStore(scenarioStore.subscribe, scenarioStore.getSnapshot);
  const [message, setMessage] = useState('');
  const active = control.scenarios.find((scenario) => scenario.id === settings.scenarioId);

  return (
    <details className="network-panel" data-testid="network-panel">
      <summary>Network scenarios (mock API): {active?.label ?? settings.scenarioId}</summary>
      <div className="network-panel__body">
        <label htmlFor="network-scenario">Scenario</label>
        <select
          id="network-scenario"
          value={settings.scenarioId}
          onChange={(event) => {
            control.selectScenario(event.target.value);
            setMessage(`Scenario set to ${event.target.selectedOptions[0]?.text ?? event.target.value}.`);
          }}
        >
          {control.scenarios.map((scenario) => (
            <option key={scenario.id} value={scenario.id}>
              {scenario.label}
            </option>
          ))}
        </select>
        <p className="muted" style={{ margin: 0 }}>
          {active?.description}
        </p>
        <p className="muted" style={{ margin: 0 }}>
          Seed {settings.seed}
          {settings.latencyOverrideMs !== null ? ` · fixed latency ${settings.latencyOverrideMs} ms` : ''}
        </p>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            void control.resetAll().then(() => setMessage('Mock API restored to its initial state.'));
          }}
        >
          Reset mock API data
        </button>
        <p role="status" className="success-text" style={{ margin: 0, minHeight: '1.2em' }}>
          {message}
        </p>
      </div>
    </details>
  );
}
