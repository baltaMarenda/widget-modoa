import type { Feature, FeatureContext, WidgetState } from '../../core/types';
import { setHostCss } from '../../core/host-css';
import { createCycleUI, type CycleUI } from '../../ui/cycle';
import { ICON_SMART_CONTRAST } from '../../ui/icons';
import {
  composite,
  fix,
  parseColor,
  targetRatio,
  toHex,
  type Rgb,
} from './contrast-math';

/**
 * Contraste inteligente: corrección medida, elemento por elemento.
 *
 * Los tres modos de `features/contrast` imponen una paleta a toda la página.
 * Cumplen, pero borran el diseño del sitio. Esta feature hace lo contrario:
 * mide el contraste REAL de cada texto contra su fondo REAL y corrige solo lo
 * que no llega al mínimo de WCAG (SC 1.4.3), moviendo la luminosidad del texto
 * y conservando su tono. Un enlace azul de marca sigue siendo azul.
 *
 * Cómo convive con las otras features de color:
 *
 * - Con contraste Oscuro o Claro activo, los colores computados ya son los de
 *   la paleta forzada (21:1). Esta feature no encuentra nada que corregir y no
 *   emite ninguna regla: se apaga sola, no hace falta excluirla.
 * - Con contraste Invertido o con saturación, el `filter` del `<body>` es un
 *   efecto de render posterior y los colores computados no cambian. No importa:
 *   invertir es simétrico respecto de la fórmula de WCAG y `saturate()` mueve
 *   el croma dejando la luminancia donde estaba, así que la relación calculada
 *   sobrevive a las dos.
 *
 * Por eso el registro de `features/index.ts` la pone INMEDIATAMENTE DESPUÉS de
 * `contrastFeature`: el orden del array es el orden de `apply`, y hace falta
 * medir con la hoja de contraste ya inyectada.
 */

/** Bandera en el <html> del host. */
export const SMART_CONTRAST_ATTR = 'data-modoa-smart-contrast';

/** Marca por elemento corregido. El valor es el índice del color resuelto. */
export const SMART_CONTRAST_MARK = 'data-modoa-sc';

/**
 * Tope de elementos analizados.
 *
 * Cada uno cuesta al menos un `getComputedStyle`. En una página normal se
 * recorren unos cientos; el tope existe para que un DOM patológico —una tabla
 * generada con decenas de miles de celdas— no congele el hilo principal.
 */
const MAX_ELEMENTS = 4000;

/** Rebote del observer: el contenido dinámico suele llegar de a ráfagas. */
const DEBOUNCE_MS = 250;

/** El fondo del lienzo cuando nadie declaró uno opaco. */
const CANVAS: Rgb = { r: 255, g: 255, b: 255, a: 1 };

const TRANSPARENT: Rgb = { r: 0, g: 0, b: 0, a: 0 };

const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TITLE',
  'TEMPLATE',
  'IFRAME',
  'CANVAS',
  'OBJECT',
  'EMBED',
]);

/** Solo interesan los elementos que dibujan texto propio. */
function hasOwnText(element: Element): boolean {
  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && (node.nodeValue ?? '').trim()) {
      return true;
    }
  }
  return false;
}

/**
 * Fondo efectivo de un elemento: sube por los ancestros componiendo alfas
 * hasta encontrar el primero opaco.
 *
 * Devuelve `null` cuando en el camino aparece un `background-image` — una
 * imagen o un degradado. Ahí no hay un color único contra el que medir, y
 * elegir uno a ojo daría una corrección que puede empeorar la legibilidad en
 * media caja. Un texto así se deja como está: la feature promete no romper el
 * diseño, y para esos casos están los modos de contraste forzado.
 */
function backgroundOf(
  element: Element,
  cache: Map<Element, Rgb | null>,
): Rgb | null {
  const cached = cache.get(element);
  if (cached !== undefined) return cached;

  const style = window.getComputedStyle(element);
  let result: Rgb | null;

  if (style.backgroundImage !== 'none') {
    result = null;
  } else {
    const own = parseColor(style.backgroundColor) ?? TRANSPARENT;
    if (own.a >= 1) {
      result = { ...own, a: 1 };
    } else {
      const parent = element.parentElement;
      const below = parent ? backgroundOf(parent, cache) : CANVAS;
      if (below === null) result = null;
      else result = own.a === 0 ? below : composite(own, below);
    }
  }

  cache.set(element, result);
  return result;
}

export function createSmartContrastFeature(): Feature {
  let ui: CycleUI<'off' | 'on'> | null = null;
  let observer: MutationObserver | null = null;
  let debounce: number | undefined;

  /** Saca las marcas del documento host. */
  function clearMarks(): void {
    const marked = document.querySelectorAll(`[${SMART_CONTRAST_MARK}]`);
    for (const element of Array.from(marked)) {
      element.removeAttribute(SMART_CONTRAST_MARK);
    }
  }

  function recompute(): void {
    if (!document.body) return;

    /*
     * Se limpia ANTES de medir. Si quedaran las marcas y las reglas de la
     * pasada anterior, se estarían midiendo los colores ya corregidos: todo
     * daría por bueno y la corrección se perdería en el siguiente recálculo.
     */
    clearMarks();
    setHostCss('smart-contrast', null);

    const backgrounds = new Map<Element, Rgb | null>();
    /** clave `color|fondo|objetivo` → índice del color corregido. */
    const buckets = new Map<string, number>();
    const fixes: string[] = [];

    const all = document.body.querySelectorAll('*');
    const limit = Math.min(all.length, MAX_ELEMENTS);

    if (all.length > MAX_ELEMENTS) {
      console.warn(
        `[modoa-a11y] Contraste inteligente: la página tiene ${all.length} ` +
          `elementos y se analizan los primeros ${MAX_ELEMENTS}.`,
      );
    }

    for (let index = 0; index < limit; index += 1) {
      const element = all[index]!;
      if (SKIP_TAGS.has(element.tagName)) continue;
      // El texto de un <svg> se pinta con `fill`, no con `color`.
      if (element instanceof SVGElement) continue;
      if (!hasOwnText(element)) continue;

      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') continue;

      const background = backgroundOf(element, backgrounds);
      if (background === null) continue;

      const color = parseColor(style.color);
      // Alfa 0 es texto deliberadamente invisible (técnicas de ocultamiento).
      if (!color || color.a === 0) continue;

      const target = targetRatio(
        Number.parseFloat(style.fontSize) || 16,
        Number.parseInt(style.fontWeight, 10) || 400,
      );

      const key = `${style.color}|${toHex(background)}|${target}`;
      let bucket = buckets.get(key);

      if (bucket === undefined) {
        const corrected = fix(color, background, target);
        if (corrected === null) {
          // Ya cumple: se cachea como "sin corrección" para no recalcularlo.
          buckets.set(key, -1);
          continue;
        }
        bucket = fixes.push(toHex(corrected)) - 1;
        buckets.set(key, bucket);
      } else if (bucket === -1) {
        continue;
      }

      element.setAttribute(SMART_CONTRAST_MARK, String(bucket));
    }

    if (fixes.length === 0) return;

    /*
     * Una regla por COLOR corregido, no por elemento: en una página real los
     * colores distintos son unas pocas decenas aunque los textos sean miles.
     *
     * El `html[…] body` delante del atributo no es decorativo: sube la
     * especificidad a 0-3-1 para ganarle al CSS del sitio, que suele apuntar
     * con clases.
     */
    const css = fixes
      .map(
        (hex, index) =>
          `html[${SMART_CONTRAST_ATTR}] body [${SMART_CONTRAST_MARK}="${index}"] {\n` +
          `  color: ${hex} !important;\n}`,
      )
      .join('\n');

    setHostCss('smart-contrast', css);
  }

  function schedule(): void {
    window.clearTimeout(debounce);
    debounce = window.setTimeout(recompute, DEBOUNCE_MS);
  }

  function startObserver(): void {
    if (observer || !document.body) return;
    /*
     * Solo `childList`: las marcas que escribe esta feature son atributos, así
     * que observando nada más el alta y baja de nodos el observer no puede
     * dispararse por su propio trabajo.
     */
    observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function stopObserver(): void {
    window.clearTimeout(debounce);
    observer?.disconnect();
    observer = null;
  }

  function disable(): void {
    stopObserver();
    document.documentElement.removeAttribute(SMART_CONTRAST_ATTR);
    clearMarks();
    setHostCss('smart-contrast', null);
  }

  return {
    id: 'smart-contrast',

    apply(state: Readonly<WidgetState>) {
      if (state.smartContrast) {
        document.documentElement.setAttribute(SMART_CONTRAST_ATTR, '');
        // Se recalcula en CADA cambio de estado, no solo al encenderse: subir
        // el tamaño de página mueve el umbral de "texto grande" y los modos de
        // contraste cambian los colores que hay que medir.
        recompute();
        startObserver();
      } else {
        disable();
      }

      ui?.sync(state.smartContrast ? 'on' : 'off');
    },

    teardown() {
      disable();
    },

    render(ctx: FeatureContext) {
      ui = createCycleUI<'off' | 'on'>(ctx, {
        icon: ICON_SMART_CONTRAST,
        label: ctx.t('smartContrast.label'),
        steps: ['off', 'on'],
        text: (value) => ctx.t(`smartContrast.${value}`),
        onChange: (value) => ctx.setState({ smartContrast: value === 'on' }),
      });

      ui.sync(ctx.getState().smartContrast ? 'on' : 'off');
      return ui.element;
    },
  };
}

export const smartContrastFeature = createSmartContrastFeature();
