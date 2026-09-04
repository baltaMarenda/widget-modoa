import type { Feature, FeatureContext, WidgetState } from '../../core/types';
import { createCycleUI, type CycleUI } from '../../ui/cycle';
import { ICON_FOCUS } from '../../ui/icons';
import { createReadingMask, type ReadingMask } from './mask';

/**
 * Máscara de lectura: oscurece la página salvo una banda a la altura del
 * cursor (o del foco del teclado).
 *
 * Ayuda a sostener la atención en el renglón que se está leyendo, que es lo
 * que se les complica a las personas con déficit de atención o con dislexia
 * frente a una pantalla llena de texto.
 *
 * Es un interruptor de dos estados, pero se dibuja con el mismo control cíclico
 * que el resto para que la fila de botones se lea pareja: "presionar cambia".
 */
type MaskState = 'off' | 'on';

const STEPS: readonly MaskState[] = ['off', 'on'];

export function createReadingMaskFeature(): Feature {
  let mask: ReadingMask | null = null;
  let ui: CycleUI<MaskState> | null = null;

  return {
    id: 'reading-mask',

    setup(ctx: FeatureContext) {
      // Solo se arma el controlador; los nodos entran al shadow recién cuando
      // alguien prende la feature.
      mask = createReadingMask(ctx.shadow, ctx.host);
    },

    apply(state: Readonly<WidgetState>) {
      if (state.readingMask) {
        mask?.enable();
      } else {
        mask?.disable();
      }
      ui?.sync(state.readingMask ? 'on' : 'off');
    },

    teardown() {
      mask?.destroy();
    },

    render(ctx: FeatureContext) {
      ui = createCycleUI<MaskState>(ctx, {
        icon: ICON_FOCUS,
        label: ctx.t('readingMask.label'),
        steps: STEPS,
        text: (value) => ctx.t(`readingMask.${value}`),
        onChange: (value) => ctx.setState({ readingMask: value === 'on' }),
      });

      ui.sync(ctx.getState().readingMask ? 'on' : 'off');
      return ui.element;
    },
  };
}

export const readingMaskFeature = createReadingMaskFeature();
