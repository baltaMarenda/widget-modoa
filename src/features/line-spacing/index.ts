import type {
  Feature,
  FeatureContext,
  LineSpacingLevel,
  WidgetState,
} from '../../core/types';
import { setHostCss } from '../../core/host-css';
import { textScope } from '../../core/text-css';
import { createCycleUI, type CycleUI } from '../../ui/cycle';
import { ICON_LINE_SPACING } from '../../ui/icons';

export const LINE_SPACING_ATTR = 'data-modoa-line-spacing';

/**
 * Los multiplicadores son los valores del propio enumerado: `'1.5'` es a la vez
 * la clave del ciclo, el valor del atributo en el <html> y el `line-height`
 * que se escribe. Un solo dato, sin tabla de traducción que se desincronice.
 *
 * El piso es 1.5 porque es lo que pide WCAG 2.1 SC 1.4.12 para el interlineado
 * dentro de un párrafo; de ahí para arriba es margen para quien lo necesita.
 */
const STEPS: readonly LineSpacingLevel[] = ['off', '1.5', '1.75', '2'];

const VALID = new Set<string>(STEPS);

function clampLevel(value: string): LineSpacingLevel {
  return VALID.has(value) ? (value as LineSpacingLevel) : 'off';
}

/**
 * `line-height` se hereda, así que alcanzaría con ponerlo en el <body>… salvo
 * que cualquier sitio real lo redeclara en decenas de selectores propios. Por
 * eso va sobre el subárbol entero con !important.
 *
 * Se excluyen los elementos de fuentes de ícono: un glifo con más interlineado
 * del que su caja espera se sale de la línea de base de su texto.
 */
function levelCss(level: Exclude<LineSpacingLevel, 'off'>): string {
  const [root, descendants] = textScope(LINE_SPACING_ATTR, level);

  return `
${root},
${descendants} {
  line-height: ${level} !important;
}`;
}

const CSS = (['1.5', '1.75', '2'] as const).map(levelCss).join('\n');

export function createLineSpacingFeature(): Feature {
  let ui: CycleUI<LineSpacingLevel> | null = null;

  return {
    id: 'line-spacing',

    apply(state: Readonly<WidgetState>) {
      const level = clampLevel(state.lineSpacing);
      const root = document.documentElement;

      if (level === 'off') {
        root.removeAttribute(LINE_SPACING_ATTR);
        setHostCss('line-spacing', null);
      } else {
        setHostCss('line-spacing', CSS);
        root.setAttribute(LINE_SPACING_ATTR, level);
      }

      ui?.sync(level);
    },

    teardown() {
      document.documentElement.removeAttribute(LINE_SPACING_ATTR);
      setHostCss('line-spacing', null);
    },

    render(ctx: FeatureContext) {
      ui = createCycleUI<LineSpacingLevel>(ctx, {
        icon: ICON_LINE_SPACING,
        label: ctx.t('lineSpacing.label'),
        steps: STEPS,
        text: (value) => ctx.t(`lineSpacing.${value}`),
        onChange: (value) => ctx.setState({ lineSpacing: value }),
      });

      ui.sync(clampLevel(ctx.getState().lineSpacing));
      return ui.element;
    },
  };
}

export const lineSpacingFeature = createLineSpacingFeature();
