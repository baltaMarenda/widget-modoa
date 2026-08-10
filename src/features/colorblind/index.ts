import type {
  ColorblindMode,
  Feature,
  FeatureContext,
  WidgetState,
} from '../../core/types';
import { removeInlineProperty } from '../../core/dom';
import {
  FILTER_ATTR,
  filterUrl,
  injectFilters,
  removeFilters,
} from './filters';
import { COLORBLIND_MODES } from './matrices';

/** El orden del menú: "ninguno" primero, después los cuatro filtros. */
const OPTIONS: readonly ColorblindMode[] = ['none', ...COLORBLIND_MODES];

const VALID = new Set<string>(OPTIONS);

function clampMode(value: string): ColorblindMode {
  return VALID.has(value) ? (value as ColorblindMode) : 'none';
}

/**
 * El filtro se aplica al <body>, no al <html>.
 *
 * `filter` no es una propiedad heredada sino un efecto de render: pinta el
 * subárbol entero y ningún descendiente puede excluirse. Si lo aplicáramos al
 * <html>, el propio widget quedaría filtrado. Por eso el host del widget se
 * monta como hijo de <html> (ver core/mount.ts) y el filtro va al <body>: el
 * sitio queda adentro, el widget afuera.
 */
function target(): HTMLElement {
  return document.body;
}

export function createColorblindFeature(): Feature {
  let options: HTMLButtonElement[] = [];

  function syncOptions(mode: ColorblindMode): void {
    for (const [index, button] of options.entries()) {
      button.setAttribute('aria-checked', String(OPTIONS[index] === mode));
    }
  }

  return {
    id: 'colorblind',

    /*
     * No hay setup: el <svg> con los filtros se inyecta recién cuando alguien
     * elige un filtro. Dos razones:
     *
     * 1. Un sitio donde nadie usa la feature nunca recibe los 4 <filter> en su
     *    DOM. Misma lógica que la carga diferida de la fuente.
     * 2. Hace que la feature se auto-repare. `teardown()` borra el <svg>, así
     *    que si la inyección viviera en `setup()`, tras un reset el filtro
     *    apuntaría por `url(#id)` a un nodo que ya no existe.
     */
    apply(state: Readonly<WidgetState>) {
      const mode = clampMode(state.colorblind);
      const body = target();

      if (mode === 'none') {
        removeInlineProperty(body, 'filter');
        body.removeAttribute(FILTER_ATTR);
      } else {
        injectFilters(); // idempotente: si ya está, lo reutiliza
        // !important para ganarle a cualquier `filter` que declare el sitio.
        body.style.setProperty('filter', filterUrl(mode), 'important');
        body.setAttribute(FILTER_ATTR, mode);
      }
      syncOptions(mode);
    },

    teardown() {
      const body = target();
      removeInlineProperty(body, 'filter');
      body.removeAttribute(FILTER_ATTR);
      removeFilters();
    },

    render(ctx: FeatureContext) {
      const label = ctx.t('colorblind.label');
      const labelId = 'modoa-colorblind-label';

      const group = document.createElement('div');
      group.className = 'feat';
      group.setAttribute('role', 'group');
      group.setAttribute('aria-labelledby', labelId);

      const title = document.createElement('span');
      title.className = 'feat__label';
      title.id = labelId;
      title.textContent = label;

      const list = document.createElement('div');
      list.className = 'feat__options feat__options--grid';

      options = OPTIONS.map((mode) => {
        const text = ctx.t(`colorblind.${mode}`);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'opt';
        button.setAttribute('role', 'menuitemradio');
        button.setAttribute('aria-checked', 'false');
        button.setAttribute('aria-label', `${label}: ${text}`);
        if (mode === 'none') button.classList.add('opt--wide');
        button.textContent = text;
        button.addEventListener('click', () => {
          ctx.setState({ colorblind: mode });
        });
        return button;
      });

      list.append(...options);
      group.append(title, list);

      syncOptions(clampMode(ctx.getState().colorblind));

      return group;
    },
  };
}

export const colorblindFeature = createColorblindFeature();
