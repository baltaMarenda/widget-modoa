import type { Feature, FeatureContext, WidgetState } from '../../core/types';
import { setHostCss } from '../../core/host-css';
import { ICON_SELECTORS } from '../../core/text-css';
import { createCycleUI, type CycleUI } from '../../ui/cycle';
import { ICON_HIDE_IMAGES } from '../../ui/icons';

/**
 * Oculta las imágenes de la página y deja el contenido en texto.
 *
 * Saca del medio los estímulos visuales que compiten con la lectura: fotos,
 * banners, ilustraciones. Ayuda a quien tiene déficit de atención, dificultades
 * cognitivas o sensibilidad a estímulos, y simplifica la navegación en páginas
 * muy cargadas de gráficos.
 *
 * Decisiones:
 *
 * - `opacity: 0` y no `display: none` ni `visibility: hidden`. Las dos últimas
 *   sacan la imagen del árbol de accesibilidad y su `alt` deja de llegar al
 *   lector de pantalla; `display: none` además colapsa el hueco y desarma
 *   grillas y carruseles que dependen del tamaño de la imagen. Con la opacidad
 *   el layout queda intacto y apagar la feature no produce ningún salto.
 * - Las imágenes DENTRO de un enlace o un botón no se tocan. Ahí la imagen ES
 *   el control —el logo que lleva al inicio, el ícono de un botón sin texto—
 *   y esconderla deja un área clickeable invisible.
 * - Los íconos (por clase, ver core/text-css.ts) tampoco: son interfaz, no
 *   contenido, y sin ellos se pierde la orientación.
 *
 * Límite conocido: las imágenes de FONDO (`background-image`) se dejan como
 * están. Muchos sitios ponen texto claro sobre una foto de fondo, y sacarla
 * deja ese texto blanco sobre blanco: se escondería justo lo que se quiere
 * leer. Para limpiar también los fondos está el contraste Oscuro o Claro, que
 * los reemplaza por un color sólido verificado.
 */

/** Bandera en el <html> del host. */
export const HIDE_IMAGES_ATTR = 'data-modoa-hide-images';

const SCOPE = `html[${HIDE_IMAGES_ATTR}] body`;

const TARGETS = ['img', 'picture', 'input[type="image"]', 'svg[role="img"]'];

const EXCLUSIONS = [
  'a *',
  'button *',
  '[role="button"] *',
  '[role="link"] *',
  ...ICON_SELECTORS,
]
  .map((selector) => `:not(${selector})`)
  .join('');

const CSS = `
${TARGETS.map((target) => `${SCOPE} ${target}${EXCLUSIONS}`).join(',\n')} {
  opacity: 0 !important;
}`;

type HideImagesState = 'off' | 'on';

const STEPS: readonly HideImagesState[] = ['off', 'on'];

export function createHideImagesFeature(): Feature {
  let ui: CycleUI<HideImagesState> | null = null;

  function clear(): void {
    document.documentElement.removeAttribute(HIDE_IMAGES_ATTR);
    setHostCss('hide-images', null);
  }

  return {
    id: 'hide-images',

    apply(state: Readonly<WidgetState>) {
      if (state.hideImages) {
        setHostCss('hide-images', CSS);
        document.documentElement.setAttribute(HIDE_IMAGES_ATTR, '');
      } else {
        clear();
      }

      ui?.sync(state.hideImages ? 'on' : 'off');
    },

    teardown: clear,

    render(ctx: FeatureContext) {
      ui = createCycleUI<HideImagesState>(ctx, {
        icon: ICON_HIDE_IMAGES,
        label: ctx.t('hideImages.label'),
        steps: STEPS,
        text: (value) => ctx.t(`hideImages.${value}`),
        onChange: (value) => ctx.setState({ hideImages: value === 'on' }),
      });

      ui.sync(ctx.getState().hideImages ? 'on' : 'off');
      return ui.element;
    },
  };
}

export const hideImagesFeature = createHideImagesFeature();
