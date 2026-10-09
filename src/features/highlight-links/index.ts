import type { Feature, FeatureContext, WidgetState } from '../../core/types';
import { setHostCss } from '../../core/host-css';
import { createCycleUI, type CycleUI } from '../../ui/cycle';
import { ICON_HIGHLIGHT_LINKS } from '../../ui/icons';

/**
 * Resalta los enlaces para que se distingan del texto común de un vistazo.
 *
 * Muchos sitios marcan los enlaces solo con color, y eso no le alcanza a quien
 * no distingue ese color, ve poco o se pierde en una página densa. WCAG 2.1
 * SC 1.4.1 "Use of Color" pide justamente que el color no sea la única pista.
 *
 * Se combinan tres señales, para que alguna llegue siempre:
 *
 * - Subrayado grueso: la convención que todo el mundo reconoce como enlace.
 * - Fondo amarillo con texto casi negro: un par FIJO y no el color del sitio,
 *   porque así la relación de contraste está garantizada (~14:1) sobre
 *   cualquier fondo, también con el contraste Oscuro o Claro encendido.
 * - Contorno: delimita el área clickeable aunque el enlace envuelva una
 *   imagen o una tarjeta entera, donde el subrayado no se ve.
 *
 * La sección va en la hoja única detrás de las dos de contraste (ver
 * core/host-css.ts), y el selector `a[href]` le gana en especificidad a las
 * reglas por elemento del contraste inteligente.
 */

/** Bandera en el <html> del host. */
export const HIGHLIGHT_LINKS_ATTR = 'data-modoa-highlight-links';

const SCOPE = `html[${HIGHLIGHT_LINKS_ATTR}] body`;

const LINK_BG = '#ffe14d';
const LINK_FG = '#1a1a1a';

/*
 * `[role="link"]` cubre los enlaces armados con un <span> o un <div>, que son
 * los que más necesitan la ayuda: suelen no tener ningún estilo de enlace.
 */
const LINKS = [`${SCOPE} a[href]`, `${SCOPE} [role="link"]`];

const CSS = `
${LINKS.join(',\n')} {
  background-color: ${LINK_BG} !important;
  color: ${LINK_FG} !important;
  text-decoration-line: underline !important;
  text-decoration-thickness: 2px !important;
  text-underline-offset: 3px !important;
  outline: 2px solid ${LINK_FG} !important;
  outline-offset: 1px !important;
}

${LINKS.map((link) => `${link} *`).join(',\n')} {
  color: ${LINK_FG} !important;
}`;

type HighlightLinksState = 'off' | 'on';

const STEPS: readonly HighlightLinksState[] = ['off', 'on'];

export function createHighlightLinksFeature(): Feature {
  let ui: CycleUI<HighlightLinksState> | null = null;

  function clear(): void {
    document.documentElement.removeAttribute(HIGHLIGHT_LINKS_ATTR);
    setHostCss('highlight-links', null);
  }

  return {
    id: 'highlight-links',

    apply(state: Readonly<WidgetState>) {
      if (state.highlightLinks) {
        setHostCss('highlight-links', CSS);
        document.documentElement.setAttribute(HIGHLIGHT_LINKS_ATTR, '');
      } else {
        clear();
      }

      ui?.sync(state.highlightLinks ? 'on' : 'off');
    },

    teardown: clear,

    render(ctx: FeatureContext) {
      ui = createCycleUI<HighlightLinksState>(ctx, {
        icon: ICON_HIGHLIGHT_LINKS,
        label: ctx.t('highlightLinks.label'),
        steps: STEPS,
        text: (value) => ctx.t(`highlightLinks.${value}`),
        onChange: (value) => ctx.setState({ highlightLinks: value === 'on' }),
      });

      ui.sync(ctx.getState().highlightLinks ? 'on' : 'off');
      return ui.element;
    },
  };
}

export const highlightLinksFeature = createHighlightLinksFeature();
