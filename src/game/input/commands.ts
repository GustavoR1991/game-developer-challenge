export interface InputCommands {
  forward: boolean;
  turnLeft: boolean;
  turnRight: boolean;
  fireFront: boolean;
  fireLeft: boolean;
  fireRight: boolean;
}

export type InputAction = keyof InputCommands;

export const INPUT_ACTIONS: readonly InputAction[] = [
  'forward',
  'turnLeft',
  'turnRight',
  'fireFront',
  'fireLeft',
  'fireRight',
];

export function createEmptyCommands(): InputCommands {
  return {
    forward: false,
    turnLeft: false,
    turnRight: false,
    fireFront: false,
    fireLeft: false,
    fireRight: false,
  };
}
