import { useEffect, useRef } from 'react';
import { useAppServices } from '../../app/AppServices';
import { navigate } from '../../app/router';
import { NetworkScenarioPanel } from '../components/menu/NetworkScenarioPanel';
import { OptionsForm } from '../components/menu/OptionsForm';

export function OptionsScreen() {
  const { networkControl } = useAppServices();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    document.title = 'Options · Pirate Battle';
    headingRef.current?.focus();
  }, []);

  return (
    <main className="screen" data-testid="options-screen">
      <section className="panel panel--options" aria-labelledby="options-title">
        <h1 id="options-title" ref={headingRef} tabIndex={-1} className="panel__title">
          Options
        </h1>
        <OptionsForm backLabel="Main Menu" onBack={() => navigate('menu')} />
        <NetworkScenarioPanel control={networkControl} />
      </section>
    </main>
  );
}
