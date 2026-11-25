import { assetUrl } from '../../../utils/assetUrl';

export function AppFooter({ variant = 'page' }: { variant?: 'page' | 'game' }) {
  return (
    <footer className={`app-footer app-footer--${variant}`}>
      <img
        src={assetUrl('assets/images/logo_jungle_gaming.svg')}
        alt="Jungle Gaming"
        width={120}
        height={60}
      />
    </footer>
  );
}
