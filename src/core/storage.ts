import { DEFAULT_STATE, type WidgetState } from './types';

const PREFIX = 'modoa-a11y';

export function storageKey(clientId: string): string {
  return `${PREFIX}:${clientId}`;
}

/**
 * localStorage puede lanzar (modo privado de Safari, cookies bloqueadas,
 * iframes cross-origin). Nunca debe tumbar el widget: degradamos a memoria.
 */
function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* sin persistencia: el estado vive solo en memoria */
  }
}

function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

/**
 * Descarta claves desconocidas y valores del tipo equivocado, y acota los
 * enumerados. localStorage es editable por el usuario y por cualquier script
 * del sitio host: nada de lo que salga de ahí se asume válido.
 */
function sanitize(raw: unknown): WidgetState {
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_STATE };
  const input = raw as Record<string, unknown>;
  const out = { ...DEFAULT_STATE };

  for (const key of Object.keys(DEFAULT_STATE) as (keyof WidgetState)[]) {
    const value = input[key];
    if (typeof value === typeof DEFAULT_STATE[key]) {
      (out as Record<string, unknown>)[key] = value;
    }
  }

  if (!VALID_COLORBLIND.includes(out.colorblind)) {
    out.colorblind = DEFAULT_STATE.colorblind;
  }
  if (!VALID_FONT_SIZE_STEPS.includes(out.fontSizeStep)) {
    out.fontSizeStep = DEFAULT_STATE.fontSizeStep;
  }
  return out;
}

const VALID_COLORBLIND: readonly WidgetState['colorblind'][] = [
  'none',
  'protanopia',
  'deuteranopia',
  'tritanopia',
  'achromatopsia',
];

const VALID_FONT_SIZE_STEPS: readonly WidgetState['fontSizeStep'][] = [
  0, 1, 2, 3,
];

export function loadState(clientId: string): WidgetState {
  const raw = safeGet(storageKey(clientId));
  if (!raw) return { ...DEFAULT_STATE };
  try {
    return sanitize(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveState(clientId: string, state: WidgetState): void {
  safeSet(storageKey(clientId), JSON.stringify(state));
}

export function clearState(clientId: string): void {
  safeRemove(storageKey(clientId));
}
