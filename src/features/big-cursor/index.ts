import type {
  BigCursorLevel,
  Feature,
  FeatureContext,
  WidgetState,
} from '../../core/types';
import { setHostCss } from '../../core/host-css';
import { createCycleUI, type CycleUI } from '../../ui/cycle';
import { ICON_CURSOR } from '../../ui/icons';
import { CURSOR_SIZES, cursorValue } from './cursors';

/**
 * Cursor grande.
 *
 * El puntero del sistema mide unos 20 px y es un objetivo difícil de seguir con
 * baja visión, con nistagmo o con cualquier dificultad de seguimiento visual:
 * se pierde de vista y hay que barrer la pantalla para encontrarlo. Agrandarlo
 * no cambia el sitio en nada más.
 *
 * El atributo se escribe en dos lugares: en el <html> del sitio, para el CSS
 * que se inyecta en el host, y en el elemento host del widget, para que el
 * puntero también sea grande sobre el propio panel — si adentro del menú
 * volviera al tamaño normal, la feature fallaría justo donde se la activa.
 */

/** Bandera, en el <html> del host y en el host del widget. */
export const CURSOR_ATTR = 'data-modoa-cursor';

const STEPS: readonly BigCursorLevel[] = ['off', 'large', 'xlarge'];

const VALID = new Set<string>(STEPS);

function clampLevel(value: string): BigCursorLevel {
  return VALID.has(value) ? (value as BigCursorLevel) : 'off';
}

/** Elementos que el sitio dibuja con manito. */
const POINTER_SELECTORS = [
  'a[href]',
  'button',
  '[role="button"]',
  '[role="link"]',
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="reset"]',
  'input[type="checkbox"]',
  'input[type="radio"]',
  'select',
  'summary',
  'label[for]',
].join(',\n');

/** Elementos donde el cursor es una barra de inserción. */
const TEXT_SELECTORS = [
  'input:not([type])',
  'input[type="text"]',
  'input[type="search"]',
  'input[type="email"]',
  'input[type="url"]',
  'input[type="tel"]',
  'input[type="number"]',
  'input[type="password"]',
  'textarea',
  '[contenteditable="true"]',
].join(',\n');

function levelCss(level: Exclude<BigCursorLevel, 'off'>): string {
  const size = CURSOR_SIZES[level];
  const scope = `html[${CURSOR_ATTR}="${level}"] body`;

  const withScope = (selectors: string): string =>
    selectors
      .split(',\n')
      .map((selector) => `${scope} ${selector}`)
      .join(',\n');

  return `
${scope},
${scope} * {
  cursor: ${cursorValue('default', size)} !important;
}

${withScope(POINTER_SELECTORS)} {
  cursor: ${cursorValue('pointer', size)} !important;
}

${withScope(TEXT_SELECTORS)} {
  cursor: ${cursorValue('text', size)} !important;
}`;
}

/** Los dos niveles conviven en la hoja; los discrimina el valor del atributo. */
const CSS = [levelCss('large'), levelCss('xlarge')].join('\n');

/**
 * La misma feature, del lado de adentro del Shadow DOM.
 *
 * Sin esto el puntero volvería al tamaño normal justo encima del panel — el
 * único lugar donde la persona puede comprobar que la activó. La hoja se genera
 * acá y no en ui/styles.css para no tener los mismos data URI en dos archivos.
 *
 * `.root` cubre el panel y el botón por herencia; los `<button>` la pisan con
 * la variante de manito, y la burbuja de lectura es hermana de `.root`, no
 * descendiente, así que se nombra aparte.
 */
function shadowCss(level: Exclude<BigCursorLevel, 'off'>): string {
  const size = CURSOR_SIZES[level];
  const host = `:host([${CURSOR_ATTR}="${level}"])`;

  return `
${host} .root {
  cursor: ${cursorValue('default', size)} !important;
}

${host} button,
${host} .tts-bubble {
  cursor: ${cursorValue('pointer', size)} !important;
}`;
}

const SHADOW_CSS = [shadowCss('large'), shadowCss('xlarge')].join('\n');

const SHADOW_STYLE_ID = 'modoa-cursor-style';

export function createBigCursorFeature(): Feature {
  let ui: CycleUI<BigCursorLevel> | null = null;

  /**
   * La hoja del shadow se crea en `apply` y no en `setup` porque `teardown` la
   * borra: si naciera en `setup`, tras un reset la feature quedaría sin sus
   * reglas hasta la próxima recarga (regla 2 del README).
   */
  function ensureShadowStyle(shadow: ShadowRoot): void {
    if (shadow.getElementById(SHADOW_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = SHADOW_STYLE_ID;
    style.textContent = SHADOW_CSS;
    shadow.appendChild(style);
  }

  function removeShadowStyle(shadow: ShadowRoot): void {
    shadow.getElementById(SHADOW_STYLE_ID)?.remove();
  }

  return {
    id: 'big-cursor',

    apply(state: Readonly<WidgetState>, ctx: FeatureContext) {
      const level = clampLevel(state.bigCursor);
      const root = document.documentElement;

      if (level === 'off') {
        root.removeAttribute(CURSOR_ATTR);
        ctx.host.removeAttribute(CURSOR_ATTR);
        setHostCss('big-cursor', null);
        removeShadowStyle(ctx.shadow);
      } else {
        setHostCss('big-cursor', CSS);
        root.setAttribute(CURSOR_ATTR, level);
        // El mismo atributo en el host del widget: lo leen las reglas
        // `:host([data-modoa-cursor="…"])` de la hoja del shadow.
        ctx.host.setAttribute(CURSOR_ATTR, level);
        ensureShadowStyle(ctx.shadow);
      }

      ui?.sync(level);
    },

    teardown(ctx: FeatureContext) {
      document.documentElement.removeAttribute(CURSOR_ATTR);
      ctx.host.removeAttribute(CURSOR_ATTR);
      setHostCss('big-cursor', null);
      removeShadowStyle(ctx.shadow);
    },

    render(ctx: FeatureContext) {
      ui = createCycleUI<BigCursorLevel>(ctx, {
        icon: ICON_CURSOR,
        label: ctx.t('bigCursor.label'),
        steps: STEPS,
        text: (value) => ctx.t(`bigCursor.${value}`),
        onChange: (value) => ctx.setState({ bigCursor: value }),
      });

      // Es el cíclico impar de la grilla: ocupa la fila entera en vez de dejar
      // media columna vacía. Ver el comentario de orden en features/index.ts.
      ui.element.classList.add('opt--wide');

      ui.sync(clampLevel(ctx.getState().bigCursor));
      return ui.element;
    },
  };
}

export const bigCursorFeature = createBigCursorFeature();
