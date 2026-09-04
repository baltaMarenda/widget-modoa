import type { Feature, FeatureContext, WidgetState } from '../../core/types';
import { setHostCss } from '../../core/host-css';
import { resetIconSpacing, textScope } from '../../core/text-css';
import {
  FONT_FILE_NAME,
  OPEN_DYSLEXIC_FAMILY,
} from './font-meta';

/** Bandera en el <html> del host. Prender/apagar es solo tocar este atributo. */
export const DYSLEXIA_ATTR = 'data-modoa-dyslexia';

/*
 * Valores de espaciado: WCAG 2.1, Success Criterion 1.4.12 "Text Spacing"
 * (nivel AA). https://www.w3.org/WAI/WCAG21/Understanding/text-spacing.html
 *
 * El criterio define el espaciado que un sitio accesible debe tolerar sin
 * perder contenido ni funcionalidad. Usarlo como valor objetivo tiene una
 * ventaja concreta sobre inventar números: es exactamente lo que un sitio bien
 * hecho ya está obligado a soportar.
 */
const LINE_HEIGHT = 1.5; // >= 1.5 veces el tamaño de fuente
const LETTER_SPACING = '0.12em'; // >= 0.12 veces
const WORD_SPACING = '0.16em'; // >= 0.16 veces
const PARAGRAPH_SPACING = '2em'; // >= 2 veces

/**
 * Las reglas NO declaran @font-face: la fuente se registra por JS con la API
 * FontFace cuando termina de bajar. Así el espaciado se aplica al instante
 * aunque la descarga falle o tarde.
 *
 * El espaciado que fija esta feature es el del paquete de la fuente, no una
 * elección explícita de la persona. Por eso en core/host-css.ts la sección
 * `dyslexia` va ANTES que `text-spacing` y `line-spacing`: si además se usa
 * alguno de esos dos controles, gana el control.
 */
function buildCss(): string {
  const [scope, target] = textScope(DYSLEXIA_ATTR);

  return `
${scope},
${target} {
  font-family: '${OPEN_DYSLEXIC_FAMILY}', system-ui, sans-serif !important;
  line-height: ${LINE_HEIGHT} !important;
  letter-spacing: ${LETTER_SPACING} !important;
  word-spacing: ${WORD_SPACING} !important;
}

${scope} p,
${scope} li,
${scope} blockquote {
  margin-bottom: ${PARAGRAPH_SPACING} !important;
}

${resetIconSpacing(scope)}
`;
}

export function createDyslexiaFontFeature(): Feature {
  let options: HTMLButtonElement[] = [];
  /** Promesa de la descarga. Se guarda para no volver a pedirla nunca. */
  let fontRequest: Promise<void> | null = null;
  /** La FontFace registrada, para poder darla de baja en el teardown. */
  let loadedFace: FontFace | null = null;
  /**
   * Se incrementa en cada teardown. Una descarga que estaba en vuelo cuando se
   * reseteó no debe registrar su fuente al llegar tarde.
   */
  let generation = 0;

  function syncOptions(on: boolean): void {
    for (const [index, button] of options.entries()) {
      button.setAttribute('aria-checked', String((index === 1) === on));
    }
  }

  /**
   * Descarga y registra la fuente. Se dispara la PRIMERA vez que alguien prende
   * la feature — nunca en la carga de la página.
   *
   * Esto es lo que mantiene el core del widget liviano para el 100 % de los
   * visitantes que no usan esta opción: los ~32 KB del .woff2 son un archivo
   * aparte, no bytes del bundle.
   */
  function loadFont(config: FeatureContext['config']): Promise<void> {
    if (fontRequest) return fontRequest;

    if (typeof FontFace === 'undefined' || !document.fonts) {
      // Navegador sin CSS Font Loading API. El espaciado igual se aplica.
      fontRequest = Promise.resolve();
      return fontRequest;
    }

    const requestGeneration = generation;
    const url = new URL(FONT_FILE_NAME, config.assetBase).href;
    const face = new FontFace(
      OPEN_DYSLEXIC_FAMILY,
      `url(${url}) format('woff2')`,
      { style: 'normal', weight: '400', display: 'swap' },
    );

    fontRequest = face
      .load()
      .then((loaded) => {
        // Hubo un teardown mientras bajaba: no ensuciamos el documento.
        if (requestGeneration !== generation) return;
        document.fonts.add(loaded);
        loadedFace = loaded;
      })
      .catch((error: unknown) => {
        /*
         * Si falla, el texto se queda con la pila de respaldo y el espaciado
         * —que es la mitad del beneficio de esta feature— sigue aplicado.
         * Causa más probable en un sitio de tercero: falta el header
         * Access-Control-Allow-Origin en el .woff2. Las fuentes siempre se
         * piden en modo CORS, incluso desde el mismo host que sirve el JS.
         */
        console.warn(
          `[modoa-a11y] No se pudo cargar la fuente desde ${url}. ` +
            'Se aplica solo el espaciado. Revisá que el .woff2 esté publicado ' +
            'junto al widget.js y que responda con Access-Control-Allow-Origin.',
          error,
        );
      });

    return fontRequest;
  }

  return {
    id: 'dyslexia-font',

    apply(state: Readonly<WidgetState>, ctx: FeatureContext) {
      if (state.dyslexiaFont) {
        setHostCss('dyslexia', buildCss());
        // No se espera la descarga: el espaciado entra ya, la fuente entra
        // cuando llega. `font-display: swap` hace la transición.
        void loadFont(ctx.config);
        document.documentElement.setAttribute(DYSLEXIA_ATTR, '');
      } else {
        document.documentElement.removeAttribute(DYSLEXIA_ATTR);
      }
      syncOptions(state.dyslexiaFont);
    },

    teardown() {
      // Invalida cualquier descarga en vuelo antes de tocar nada más.
      generation += 1;
      if (loadedFace && document.fonts) {
        document.fonts.delete(loadedFace);
      }
      loadedFace = null;
      // Se vuelve a pedir en la próxima activación; sale de la caché HTTP.
      fontRequest = null;

      document.documentElement.removeAttribute(DYSLEXIA_ATTR);
      setHostCss('dyslexia', null);
    },

    render(ctx: FeatureContext) {
      const label = ctx.t('dyslexia.label');
      const labelId = 'modoa-dyslexia-label';

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

      options = (['off', 'on'] as const).map((key, index) => {
        const text = ctx.t(`dyslexia.${key}`);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'opt';
        button.setAttribute('role', 'menuitemradio');
        button.setAttribute('aria-checked', 'false');
        button.setAttribute('aria-label', `${label}: ${text}`);
        button.textContent = text;
        button.addEventListener('click', () => {
          ctx.setState({ dyslexiaFont: index === 1 });
        });
        return button;
      });

      const hint = document.createElement('p');
      hint.className = 'feat__hint';
      hint.textContent = ctx.t('dyslexia.hint');

      list.append(...options);
      group.append(title, list, hint);

      syncOptions(ctx.getState().dyslexiaFont);

      return group;
    },
  };
}

export const dyslexiaFontFeature = createDyslexiaFontFeature();
