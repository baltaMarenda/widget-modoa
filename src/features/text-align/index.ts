import type {
  Feature,
  FeatureContext,
  TextAlignMode,
  WidgetState,
} from '../../core/types';
import { setHostCss } from '../../core/host-css';
import { createCycleUI, type CycleUI } from '../../ui/cycle';
import { ICON_TEXT_ALIGN } from '../../ui/icons';

export const TEXT_ALIGN_ATTR = 'data-modoa-text-align';

const STEPS: readonly TextAlignMode[] = ['off', 'left', 'right', 'center'];

const VALID = new Set<string>(STEPS);

function clampMode(value: string): TextAlignMode {
  return VALID.has(value) ? (value as TextAlignMode) : 'off';
}

/**
 * Alineación forzada de todo el texto del sitio.
 *
 * Se usan valores físicos (`left`/`right`) y no lógicos (`start`/`end`) porque
 * el control es explícito: quien elige "izquierda" quiere el texto a la
 * izquierda, no "al principio de la línea según la dirección del documento".
 * En un sitio en árabe o hebreo eso es justamente lo que hace falta para poder
 * pedir lo contrario a lo que el sitio hace por defecto.
 *
 * Va sobre el subárbol entero: `text-align` se hereda, pero cualquier sitio
 * real lo redeclara en decenas de selectores propios y sin !important sobre
 * todos ellos la alineación quedaría a medias.
 *
 * Sin exclusiones de fuentes de ícono, a diferencia del resto de las features
 * tipográficas: acá no se cambia la métrica del glifo, solo dónde se apoya la
 * caja que lo contiene.
 */
function modeCss(mode: Exclude<TextAlignMode, 'off'>): string {
  const root = `html[${TEXT_ALIGN_ATTR}="${mode}"] body`;

  return `
${root},
${root} * {
  text-align: ${mode} !important;
}`;
}

const CSS = (['left', 'right', 'center'] as const).map(modeCss).join('\n');

export function createTextAlignFeature(): Feature {
  let ui: CycleUI<TextAlignMode> | null = null;

  return {
    id: 'text-align',

    apply(state: Readonly<WidgetState>) {
      const mode = clampMode(state.textAlign);
      const root = document.documentElement;

      if (mode === 'off') {
        root.removeAttribute(TEXT_ALIGN_ATTR);
        setHostCss('text-align', null);
      } else {
        setHostCss('text-align', CSS);
        root.setAttribute(TEXT_ALIGN_ATTR, mode);
      }

      ui?.sync(mode);
    },

    teardown() {
      document.documentElement.removeAttribute(TEXT_ALIGN_ATTR);
      setHostCss('text-align', null);
    },

    render(ctx: FeatureContext) {
      ui = createCycleUI<TextAlignMode>(ctx, {
        icon: ICON_TEXT_ALIGN,
        label: ctx.t('textAlign.label'),
        steps: STEPS,
        text: (value) => ctx.t(`textAlign.${value}`),
        onChange: (value) => ctx.setState({ textAlign: value }),
      });

      ui.sync(clampMode(ctx.getState().textAlign));
      return ui.element;
    },
  };
}

export const textAlignFeature = createTextAlignFeature();
