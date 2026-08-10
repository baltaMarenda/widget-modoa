import type {
  Feature,
  FeatureContext,
  FontSizeStep,
  WidgetState,
} from '../../core/types';
import {
  createFontSizeStrategy,
  createTransformStrategy,
  type ScaleStrategy,
} from './strategies';

/** Pasos discretos: 100 / 115 / 130 / 150 %. El índice es lo que se persiste. */
export const FONT_SIZE_FACTORS = [1, 1.15, 1.3, 1.5] as const;

const STEPS: readonly FontSizeStep[] = [0, 1, 2, 3];

function toPercent(factor: number): string {
  return `${Math.round(factor * 100)}%`;
}

function clampStep(value: number): FontSizeStep {
  return STEPS.includes(value as FontSizeStep) ? (value as FontSizeStep) : 0;
}

export function createFontSizeFeature(): Feature {
  let strategy: ScaleStrategy | null = null;
  let options: HTMLButtonElement[] = [];

  function syncOptions(step: FontSizeStep): void {
    for (const [index, button] of options.entries()) {
      button.setAttribute('aria-checked', String(index === step));
    }
  }

  return {
    id: 'font-size',

    setup(ctx: FeatureContext) {
      // La estrategia se elige por sitio cliente vía data-scale-strategy.
      strategy =
        ctx.config.scaleStrategy === 'transform'
          ? createTransformStrategy(ctx.host)
          : createFontSizeStrategy();
    },

    apply(state: Readonly<WidgetState>) {
      const step = clampStep(state.fontSizeStep);
      strategy?.apply(FONT_SIZE_FACTORS[step]!);
      syncOptions(step);
    },

    teardown() {
      strategy?.reset();
    },

    render(ctx: FeatureContext) {
      const label = ctx.t('fontSize.label');
      const labelId = 'modoa-font-size-label';

      const group = document.createElement('div');
      group.className = 'feat';
      group.setAttribute('role', 'group');
      group.setAttribute('aria-labelledby', labelId);

      const title = document.createElement('span');
      title.className = 'feat__label';
      title.id = labelId;
      title.textContent = label;

      const list = document.createElement('div');
      list.className = 'feat__options';

      options = FONT_SIZE_FACTORS.map((factor, index) => {
        const percent = toPercent(factor);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'opt';
        button.setAttribute('role', 'menuitemradio');
        button.setAttribute('aria-checked', 'false');
        button.setAttribute('aria-label', `${label}: ${percent}`);
        button.textContent = percent;
        button.addEventListener('click', () => {
          ctx.setState({ fontSizeStep: index as FontSizeStep });
        });
        return button;
      });

      list.append(...options);
      group.append(title, list);

      // `apply` ya corrió antes de que existiera la UI (main.ts monta las
      // features antes que el panel), así que sincronizamos el estado inicial.
      syncOptions(clampStep(ctx.getState().fontSizeStep));

      return group;
    },
  };
}

export const fontSizeFeature = createFontSizeFeature();
