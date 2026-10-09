import {
  DEFAULT_STATE,
  type Feature,
  type FeatureContext,
  type WidgetState,
} from '../../core/types';
import { createDisclosureUI, type DisclosureUI } from '../../ui/disclosure';
import { ICON_PROFILE } from '../../ui/icons';
import { PRESETS, PROFILE_IDS, type ProfileId } from './presets';

/**
 * Perfiles de accesibilidad: la puerta de entrada del panel.
 *
 * El resto del menú son quince controles, cada uno con su nombre técnico. Quien
 * sabe que necesita "interlineado 1.75 y saturación alta" los encuentra; quien
 * solo sabe que ve poco, no. Un perfil traduce la necesidad a la combinación.
 *
 * Dos decisiones que definen cómo se comporta:
 *
 * 1. **El perfil parte de cero.** Elegirlo restablece TODO a los valores por
 *    defecto y aplica exactamente lo suyo. Así "Dislexia" se ve siempre igual,
 *    sin importar qué había activado antes; un perfil que se sumara a lo que ya
 *    estaba puesto daría un resultado distinto cada vez y sería imposible de
 *    reproducir o de explicar.
 * 2. **El perfil activo se DEDUCE del estado, no se guarda.** No hay un campo
 *    `profile` en WidgetState. `apply` busca el preset que coincida exactamente
 *    con el estado actual; si la persona toca cualquier control a mano, deja de
 *    coincidir y ningún perfil queda marcado. Guardarlo aparte permitiría que
 *    el panel dijera "Dislexia" sobre un estado que ya no es el de dislexia.
 */

type ProfileValue = ProfileId | 'none';

/**
 * ¿El estado actual es exactamente este perfil?
 *
 * Exactamente: las claves del preset con su valor, y TODAS las demás en su
 * valor por defecto. Es la contracara de que el perfil parta de cero.
 */
function matches(
  state: Readonly<WidgetState>,
  preset: Partial<WidgetState>,
): boolean {
  for (const key of Object.keys(DEFAULT_STATE) as (keyof WidgetState)[]) {
    const expected = key in preset ? preset[key] : DEFAULT_STATE[key];
    if (state[key] !== expected) return false;
  }
  return true;
}

function activeProfile(state: Readonly<WidgetState>): ProfileValue {
  return PROFILE_IDS.find((id) => matches(state, PRESETS[id])) ?? 'none';
}

export function createProfilesFeature(): Feature {
  let ui: DisclosureUI<ProfileValue> | null = null;

  return {
    id: 'profiles',

    // No toca el documento host: lo único que hace es escribir estado, y de
    // aplicarlo se encargan las features de siempre. Por eso tampoco necesita
    // `teardown`: no dejó nada que limpiar.
    apply(state: Readonly<WidgetState>) {
      ui?.sync(activeProfile(state));
    },

    render(ctx: FeatureContext) {
      ui = createDisclosureUI<ProfileValue>({
        icon: ICON_PROFILE,
        label: ctx.t('profiles.label'),
        options: [
          { value: 'none', text: ctx.t('profiles.none'), wide: true },
          ...PROFILE_IDS.map((id) => ({
            value: id as ProfileValue,
            text: ctx.t(`profiles.${id}`),
          })),
        ],
        summary: (value) => ctx.t(`profiles.${value}`),
        onSelect: (value) => {
          const current = activeProfile(ctx.getState());
          // Volver a elegir el perfil activo lo apaga: es la única forma de
          // salir sin recorrer los controles uno por uno.
          const next = value === 'none' || value === current ? 'none' : value;
          ctx.setState(
            next === 'none'
              ? { ...DEFAULT_STATE }
              : { ...DEFAULT_STATE, ...PRESETS[next] },
          );
        },
      });

      ui.sync(activeProfile(ctx.getState()));
      return ui.element;
    },
  };
}

export const profilesFeature = createProfilesFeature();
