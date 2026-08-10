import { clearState, loadState, saveState } from './storage';
import { DEFAULT_STATE, type WidgetState } from './types';

type Listener = (state: Readonly<WidgetState>) => void;

export interface Store {
  get(): Readonly<WidgetState>;
  set(patch: Partial<WidgetState>): void;
  /** Vuelve a los valores por defecto y borra la entrada de localStorage. */
  reset(): void;
  /** Devuelve la función para desuscribirse. */
  subscribe(listener: Listener): () => void;
}

export function createStore(clientId: string): Store {
  let state: WidgetState = loadState(clientId);
  const listeners = new Set<Listener>();

  function emit(): void {
    const snapshot = Object.freeze({ ...state });
    for (const listener of listeners) {
      try {
        listener(snapshot);
      } catch (error) {
        // Una feature rota no debe impedir que las demás se actualicen.
        console.error('[modoa-a11y] Error en listener de estado:', error);
      }
    }
  }

  return {
    get: () => state,
    set(patch) {
      const next = { ...state, ...patch };
      const changed = (Object.keys(next) as (keyof WidgetState)[]).some(
        (key) => next[key] !== state[key],
      );
      if (!changed) return;

      state = next;
      saveState(clientId, state);
      emit();
    },
    reset() {
      state = { ...DEFAULT_STATE };
      clearState(clientId);
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
