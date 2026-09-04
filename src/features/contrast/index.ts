import type {
  ContrastMode,
  Feature,
  FeatureContext,
  WidgetState,
} from '../../core/types';
import { setHostCss } from '../../core/host-css';
import { setHostFilter } from '../../core/host-filter';
import { createCycleUI, type CycleUI } from '../../ui/cycle';
import { ICON_CONTRAST } from '../../ui/icons';

/** Bandera en el <html> del host: cambiar de modo es tocar este atributo. */
export const CONTRAST_ATTR = 'data-modoa-contrast';

/** El ciclo del botón. Arranca y termina en apagado. */
const STEPS: readonly ContrastMode[] = ['off', 'invert', 'dark', 'light'];

const VALID = new Set<string>(STEPS);

function clampMode(value: string): ContrastMode {
  return VALID.has(value) ? (value as ContrastMode) : 'off';
}

/**
 * La inversión no es `invert(1)` a secas.
 *
 * Invertir y nada más da vuelta también el tono: el cielo azul sale naranja y
 * la piel, celeste. `hue-rotate(180deg)` devuelve cada tono a su lugar y deja
 * solo la vuelta de luminosidad, que es lo que se busca — claro sobre oscuro
 * sin repintar la paleta del sitio.
 *
 * La relación de contraste sobrevive intacta: invertir es simétrico respecto
 * de la fórmula de WCAG, así que un par que cumplía 4.5:1 sigue cumpliéndolo.
 */
const INVERT_FILTER = 'invert(1) hue-rotate(180deg)';

/**
 * Paletas de los dos modos de contraste forzado.
 *
 * Los valores no son de gusto: son los pares con más relación de contraste que
 * se pueden armar manteniendo los enlaces distinguibles del texto corrido.
 * Contra su fondo — WCAG 2.1 SC 1.4.3 pide 4.5:1 para texto normal:
 *
 *   oscuro  texto #ffffff / #000000 → 21:1   enlace #ffff00 → 19.6:1
 *           visitado #66ccff → 11.6:1
 *   claro   texto #000000 / #ffffff → 21:1   enlace #0000cc → 11.2:1
 *           visitado #6b00a8 → 9.6:1
 */
interface Theme {
  bg: string;
  fg: string;
  link: string;
  visited: string;
}

const THEMES: Record<'dark' | 'light', Theme> = {
  dark: { bg: '#000000', fg: '#ffffff', link: '#ffff00', visited: '#66ccff' },
  light: { bg: '#ffffff', fg: '#000000', link: '#0000cc', visited: '#6b00a8' },
};

/**
 * Reglas de un modo de contraste forzado.
 *
 * Se pisa `background-image` además del color: un degradado o una foto de
 * fondo que sobreviva deja el texto forzado sobre un fondo que no se eligió, y
 * ahí la relación de contraste calculada arriba no significa nada.
 *
 * Las imágenes de contenido (<img>, <video>) NO se tocan: son información, no
 * decoración. Solo se les saca el fondo forzado, que se traslucía a través de
 * los PNG con transparencia.
 */
function themeCss(mode: 'dark' | 'light'): string {
  const theme = THEMES[mode];
  const root = `html[${CONTRAST_ATTR}="${mode}"] body`;

  return `
${root},
${root} * {
  background-color: ${theme.bg} !important;
  background-image: none !important;
  color: ${theme.fg} !important;
  border-color: ${theme.fg} !important;
  box-shadow: none !important;
  text-shadow: none !important;
}

${root} img,
${root} video,
${root} canvas,
${root} picture,
${root} embed,
${root} object {
  background-color: transparent !important;
}

${root} a,
${root} a * {
  color: ${theme.link} !important;
}

${root} a:visited,
${root} a:visited * {
  color: ${theme.visited} !important;
}

/* Un control tiene que seguir leyéndose como control cuando todo es del mismo
   color: el borde explícito es lo único que lo separa del fondo. */
${root} input,
${root} select,
${root} textarea,
${root} button,
${root} [role="button"] {
  border: 1px solid ${theme.fg} !important;
}

/* SC 2.4.7 "Focus Visible": el anillo del sitio puede haber quedado del mismo
   color que el fondo forzado. Se redibuja con el color de enlace, que ya está
   verificado contra ambos fondos. */
${root} :focus-visible {
  outline: 3px solid ${theme.link} !important;
  outline-offset: 2px !important;
}

${root} ::selection {
  background-color: ${theme.link} !important;
  color: ${theme.bg} !important;
}`;
}

/**
 * En modo invertido el <body> entero ya viene invertido por el filtro, así que
 * las imágenes y los videos salen en negativo. Se los invierte de vuelta: el
 * filtro de un descendiente se compone sobre el del ancestro y las dos
 * inversiones se cancelan.
 */
const INVERT_CSS = `
html[${CONTRAST_ATTR}="invert"] body img,
html[${CONTRAST_ATTR}="invert"] body video,
html[${CONTRAST_ATTR}="invert"] body iframe,
html[${CONTRAST_ATTR}="invert"] body canvas,
html[${CONTRAST_ATTR}="invert"] body picture,
html[${CONTRAST_ATTR}="invert"] body embed,
html[${CONTRAST_ATTR}="invert"] body object {
  filter: ${INVERT_FILTER} !important;
}`;

/** Las tres variantes conviven en la hoja; las discrimina el valor del atributo. */
const CSS = [INVERT_CSS, themeCss('dark'), themeCss('light')].join('\n');

export function createContrastFeature(): Feature {
  let ui: CycleUI<ContrastMode> | null = null;

  return {
    id: 'contrast',

    /*
     * Sin `setup`: el CSS se inyecta recién cuando alguien elige un modo. Un
     * sitio donde nadie usa la feature nunca recibe estas reglas, y el teardown
     * puede sacarlas sabiendo que la próxima activación las vuelve a poner.
     */
    apply(state: Readonly<WidgetState>) {
      const mode = clampMode(state.contrast);
      const root = document.documentElement;

      if (mode === 'off') {
        root.removeAttribute(CONTRAST_ATTR);
        setHostCss('contrast', null);
        setHostFilter('contrast', null);
      } else {
        setHostCss('contrast', CSS);
        root.setAttribute(CONTRAST_ATTR, mode);
        // La inversión es lo único que va por filtro; los otros dos modos son
        // CSS puro. El filtro lo compone core/host-filter.ts junto con la
        // saturación y la daltonización.
        setHostFilter('contrast', mode === 'invert' ? INVERT_FILTER : null);
      }

      ui?.sync(mode);
    },

    teardown() {
      document.documentElement.removeAttribute(CONTRAST_ATTR);
      setHostCss('contrast', null);
      setHostFilter('contrast', null);
    },

    render(ctx: FeatureContext) {
      ui = createCycleUI<ContrastMode>(ctx, {
        icon: ICON_CONTRAST,
        label: ctx.t('contrast.label'),
        steps: STEPS,
        text: (value) => ctx.t(`contrast.${value}`),
        onChange: (value) => ctx.setState({ contrast: value }),
      });

      // `apply` ya corrió antes de que existiera la UI (main.ts monta las
      // features antes que el panel), así que sincronizamos el estado inicial.
      ui.sync(clampMode(ctx.getState().contrast));
      return ui.element;
    },
  };
}

export const contrastFeature = createContrastFeature();
