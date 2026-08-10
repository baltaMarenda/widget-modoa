import type {
  Lang,
  ScaleStrategyId,
  WidgetConfig,
  WidgetPosition,
} from './types';

const LANGS: readonly Lang[] = ['es', 'en'];
const POSITIONS: readonly WidgetPosition[] = [
  'bottom-right',
  'bottom-left',
  'top-right',
  'top-left',
];
const SCALE_STRATEGIES: readonly ScaleStrategyId[] = ['font-size', 'transform'];

/**
 * Localiza el <script> que cargó el widget.
 *
 * `document.currentScript` funciona con `defer` (script clásico), pero es null
 * con `type="module"` o `async`, así que caemos a buscar por data-client-id.
 */
function findScriptTag(): HTMLScriptElement | null {
  const current = document.currentScript;
  if (current instanceof HTMLScriptElement) return current;

  const tagged = document.querySelector<HTMLScriptElement>(
    'script[data-client-id]',
  );
  return tagged ?? null;
}

function pick<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  const normalized = (value ?? '').trim().toLowerCase();
  return (allowed as readonly string[]).includes(normalized)
    ? (normalized as T)
    : fallback;
}

/**
 * Base desde la que se resuelven los assets sueltos (hoy solo la fuente).
 *
 * Se deduce del `src` del propio <script>: si el cliente carga
 * `https://cdn.tu-dominio.com/widget.js`, los assets salen de
 * `https://cdn.tu-dominio.com/`. Es lo que permite que el widget siga siendo
 * "pegá una línea" sin pedirle al cliente que configure rutas.
 *
 * `data-asset-base` lo pisa, para quien sirva el JS y los assets desde hosts
 * distintos.
 */
function resolveAssetBase(
  script: HTMLScriptElement | null,
  override: string | undefined,
): string {
  const explicit = (override ?? '').trim();
  if (explicit) {
    // Barra final para que `new URL(archivo, base)` no se coma el último tramo,
    // y absoluta porque una base relativa no sirve como segundo argumento.
    const withSlash = explicit.endsWith('/') ? explicit : `${explicit}/`;
    try {
      return new URL(withSlash, window.location.href).href;
    } catch {
      /* override inservible: seguimos con la deducción normal */
    }
  }

  const src = script?.src;
  if (src) {
    try {
      return new URL('./', src).href;
    } catch {
      /* src inservible: caemos al origen de la página */
    }
  }

  return new URL('./', window.location.href).href;
}

export function readConfig(): WidgetConfig {
  const script = findScriptTag();
  const data = script?.dataset ?? ({} as DOMStringMap);

  const clientId = (data['clientId'] ?? '').trim();

  if (!clientId) {
    console.warn(
      '[modoa-a11y] Falta data-client-id en el <script>. ' +
        'Se usa "default" y las preferencias se guardan en ese namespace.',
    );
  }

  return {
    clientId: clientId || 'default',
    lang: pick(data['lang'], LANGS, 'es'),
    position: pick(data['position'], POSITIONS, 'bottom-right'),
    scaleStrategy: pick(data['scaleStrategy'], SCALE_STRATEGIES, 'font-size'),
    speechLang: (data['speechLang'] ?? '').trim() || null,
    assetBase: resolveAssetBase(script, data['assetBase']),
  };
}
