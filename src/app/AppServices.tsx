import { createContext, useContext } from 'react';
import type { PlayerProfile } from '../storage/profileStorage';
import type { NetworkControl } from './networkControl';

export interface AppServices {
  networkControl: NetworkControl;
  profile: PlayerProfile;
  setProfile: (profile: PlayerProfile) => void;
}

export const AppServicesContext = createContext<AppServices | null>(null);

export function useAppServices(): AppServices {
  const services = useContext(AppServicesContext);
  if (!services) throw new Error('useAppServices must be used inside AppServicesContext');
  return services;
}
