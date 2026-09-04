import type {
  Feature,
  FeatureContext,
  SaturationLevel,
  WidgetState,
} from '../../core/types';
import { setHostFilter } from '../../core/host-filter';
import { createCycleUI, type CycleUI } from '../../ui/cycle';
import { ICON_SATURATION } from '../../ui/icons';

/**
 * El ciclo: baja, alta y nula. `'none'` es saturación nula —escala de grises—,
 * un estado activo; el apagado es `'off'`.
 */
const STEPS: readonly SaturationLevel[] = ['off', 'low', 'high', 'none'];

const VALID = new Set<string>(STEPS);

function clampLevel(value: string): SaturationLevel {
  return VALID.has(value) ? (value as SaturationLevel) : 'off';
}

/**
 * Los tres niveles, como función `saturate()` de CSS.
 *
 * Por qué la saturación no rompe el contraste, que es lo primero que hay que
 * verificar antes de meter mano en los colores de un sitio: la matriz de
 * `saturate()` está construida sobre los coeficientes de luminancia (0.213 R,
 * 0.715 G, 0.072 B), los mismos que usa la fórmula de relación de contraste de
 * WCAG. Mueve el croma dejando la luminancia donde estaba, así que un par
 * texto/fondo que cumplía SC 1.4.3 lo sigue cumpliendo en los tres niveles.
 *
 * `high` se queda en 1.75 y no más arriba por un motivo distinto: pasado ese
 * punto los colores empiezan a recortarse contra los límites de sRGB, y ahí sí
 * dos tonos distintos pueden terminar en el mismo color saturado — se perdería
 * información en lugar de resaltarla.
 */
const FILTERS: Record<Exclude<SaturationLevel, 'off'>, string> = {
  low: 'saturate(0.5)',
  high: 'saturate(1.75)',
  none: 'saturate(0)',
};

export function createSaturationFeature(): Feature {
  let ui: CycleUI<SaturationLevel> | null = null;

  return {
    id: 'saturation',

    /*
     * No escribe `filter` directo sobre el <body>: lo registra como capa en
     * core/host-filter.ts, que la compone con la daltonización y el contraste
     * invertido. `filter` es una sola propiedad y las tres features la quieren.
     */
    apply(state: Readonly<WidgetState>) {
      const level = clampLevel(state.saturation);
      setHostFilter('saturation', level === 'off' ? null : FILTERS[level]);
      ui?.sync(level);
    },

    teardown() {
      setHostFilter('saturation', null);
    },

    render(ctx: FeatureContext) {
      ui = createCycleUI<SaturationLevel>(ctx, {
        icon: ICON_SATURATION,
        label: ctx.t('saturation.label'),
        steps: STEPS,
        text: (value) => ctx.t(`saturation.${value}`),
        onChange: (value) => ctx.setState({ saturation: value }),
      });

      ui.sync(clampLevel(ctx.getState().saturation));
      return ui.element;
    },
  };
}

export const saturationFeature = createSaturationFeature();
