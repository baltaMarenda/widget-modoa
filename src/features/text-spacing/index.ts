import type {
  Feature,
  FeatureContext,
  TextSpacingLevel,
  WidgetState,
} from '../../core/types';
import { setHostCss } from '../../core/host-css';
import { resetIconSpacing, textScope } from '../../core/text-css';
import { createCycleUI, type CycleUI } from '../../ui/cycle';
import { ICON_TEXT_SPACING } from '../../ui/icons';

export const TEXT_SPACING_ATTR = 'data-modoa-text-spacing';

const STEPS: readonly TextSpacingLevel[] = ['off', 'light', 'moderate', 'heavy'];

const VALID = new Set<string>(STEPS);

function clampLevel(value: string): TextSpacingLevel {
  return VALID.has(value) ? (value as TextSpacingLevel) : 'off';
}

/**
 * Los tres escalones de espaciado.
 *
 * `moderate` no es un número inventado: es exactamente lo que pide WCAG 2.1 SC
 * 1.4.12 "Text Spacing" (nivel AA) — interletrado 0.12em, interpalabra 0.16em
 * y 2em entre párrafos.
 * https://www.w3.org/WAI/WCAG21/Understanding/text-spacing.html
 *
 * Tomarlo como escalón del medio tiene una ventaja concreta sobre elegir
 * valores a ojo: un sitio bien hecho ya está obligado a soportarlo sin perder
 * contenido ni funcionalidad. `light` queda abajo para quien solo quiere un
 * poco de aire, y `heavy` arriba para quien necesita más de lo que el criterio
 * exige.
 *
 * El interlineado NO está acá aunque el criterio también lo cubra: tiene su
 * propio control (features/line-spacing). Repetirlo en los dos sería dejar dos
 * botones peleando por la misma propiedad.
 */
interface Spacing {
  letter: string;
  word: string;
  paragraph: string;
}

const LEVELS: Record<Exclude<TextSpacingLevel, 'off'>, Spacing> = {
  light: { letter: '0.06em', word: '0.1em', paragraph: '1.5em' },
  moderate: { letter: '0.12em', word: '0.16em', paragraph: '2em' },
  heavy: { letter: '0.2em', word: '0.3em', paragraph: '2.5em' },
};

function levelCss(level: Exclude<TextSpacingLevel, 'off'>): string {
  const spacing = LEVELS[level];
  const [root, descendants] = textScope(TEXT_SPACING_ATTR, level);

  return `
${root},
${descendants} {
  letter-spacing: ${spacing.letter} !important;
  word-spacing: ${spacing.word} !important;
}

${root} p,
${root} li,
${root} blockquote,
${root} dd {
  margin-bottom: ${spacing.paragraph} !important;
}

${resetIconSpacing(root)}`;
}

const CSS = (['light', 'moderate', 'heavy'] as const).map(levelCss).join('\n');

export function createTextSpacingFeature(): Feature {
  let ui: CycleUI<TextSpacingLevel> | null = null;

  return {
    id: 'text-spacing',

    apply(state: Readonly<WidgetState>) {
      const level = clampLevel(state.textSpacing);
      const root = document.documentElement;

      if (level === 'off') {
        root.removeAttribute(TEXT_SPACING_ATTR);
        setHostCss('text-spacing', null);
      } else {
        setHostCss('text-spacing', CSS);
        root.setAttribute(TEXT_SPACING_ATTR, level);
      }

      ui?.sync(level);
    },

    teardown() {
      document.documentElement.removeAttribute(TEXT_SPACING_ATTR);
      setHostCss('text-spacing', null);
    },

    render(ctx: FeatureContext) {
      ui = createCycleUI<TextSpacingLevel>(ctx, {
        icon: ICON_TEXT_SPACING,
        label: ctx.t('textSpacing.label'),
        steps: STEPS,
        text: (value) => ctx.t(`textSpacing.${value}`),
        onChange: (value) => ctx.setState({ textSpacing: value }),
      });

      ui.sync(clampLevel(ctx.getState().textSpacing));
      return ui.element;
    },
  };
}

export const textSpacingFeature = createTextSpacingFeature();
