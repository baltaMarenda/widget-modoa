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
 * Valores admitidos de cada clave enumerada.
 *
 * Está declarado como tabla y no como una tanda de `if` para que agregar una
 * feature con estado enumerado sea agregar una línea acá: olvidarse de validar
 * un enumerado nuevo es silencioso —el valor basura llega hasta el CSS— y una
 * tabla lo hace evidente.
 *
 * Los booleanos y `tts` no figuran: alcanza con la comprobación de tipo.
 */
const VALID_VALUES: {
  [K in keyof WidgetState]?: readonly WidgetState[K][];
} = {
  colorblind: [
    'none',
    'protanopia',
    'deuteranopia',
    'tritanopia',
    'achromatopsia',
  ],
  fontSizeStep: [0, 1, 2, 3],
  contrast: ['off', 'invert', 'dark', 'light'],
  textSpacing: ['off', 'light', 'moderate', 'heavy'],
  lineSpacing: ['off', '1.5', '1.75', '2'],
  textAlign: ['off', 'left', 'right', 'center'],
  saturation: ['off', 'low', 'high', 'none'],
  bigCursor: ['off', 'large', 'xlarge'],
  translateLang: [
    'off',
    'es',
    'en',
    'pt',
    'fr',
    'it',
    'de',
    'zh',
    'ja',
    'ko',
    'ru',
    'ar',
    'hi',
  ],
};

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
    if (typeof value !== typeof DEFAULT_STATE[key]) continue;

    const allowed = VALID_VALUES[key] as readonly unknown[] | undefined;
    if (allowed && !allowed.includes(value)) continue;

    (out as Record<string, unknown>)[key] = value;
  }

  return out;
}

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
