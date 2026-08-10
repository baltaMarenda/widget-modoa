import type { Feature, FeatureContext } from '../../core/types';
import { ICON_RESET } from '../../ui/icons';

/**
 * Botón de reinicio.
 *
 * No tiene estado propio ni toca el documento host: delega en `ctx.reset()`,
 * que orquesta el teardown de todas las features, la limpieza de localStorage
 * y la vuelta a los valores por defecto. La orquestación vive en main.ts, que
 * es quien conoce el registro de features y el store.
 */
export function createResetFeature(): Feature {
  return {
    id: 'reset',

    // Nada que aplicar: el botón es una acción, no una preferencia.
    apply() {},

    render(ctx: FeatureContext) {
      const group = document.createElement('div');
      group.className = 'feat feat--action';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'opt opt--reset';
      button.setAttribute('role', 'menuitem');
      button.setAttribute('aria-label', ctx.t('reset.aria'));

      const icon = document.createElement('span');
      icon.className = 'opt__icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = ICON_RESET;

      const text = document.createElement('span');
      text.textContent = ctx.t('reset.label');

      button.append(icon, text);
      button.addEventListener('click', () => {
        ctx.reset();
        // El foco se queda en el botón, que sigue existiendo tras el reinicio.
        button.focus();
      });

      group.appendChild(button);
      return group;
    },
  };
}

export const resetFeature = createResetFeature();
