import type { Feature, FeatureContext, WidgetState } from '../../core/types';
import { setHostCss } from '../../core/host-css';
import { createCycleUI, type CycleUI } from '../../ui/cycle';
import { ICON_ANIMATIONS } from '../../ui/icons';

/**
 * Pausa el movimiento de la página: animaciones CSS, transiciones, scroll
 * suave y el audio o video que se reproduce solo.
 *
 * WCAG 2.1 SC 2.2.2 "Pause, Stop, Hide" (nivel A) pide exactamente esto para
 * todo lo que se mueva más de cinco segundos sin que la persona lo haya pedido.
 * Fuera del criterio, es lo primero que necesita quien tiene epilepsia
 * fotosensible, déficit de atención o mareo inducido por movimiento.
 *
 * Lo que NO alcanza a pausar: un GIF animado. Pausarlo exige decodificarlo y
 * repintar el primer cuadro en un <canvas> que reemplace al <img>, y eso ya no
 * es un cambio reversible sobre el DOM del sitio. Queda como límite conocido.
 */

/** Bandera en el <html> del host. */
export const ANIMATIONS_ATTR = 'data-modoa-animations';

const SCOPE = `html[${ANIMATIONS_ATTR}="paused"] body`;

/**
 * `animation-play-state: paused` y no `animation: none`.
 *
 * Anular la animación devuelve cada elemento a su estado INICIAL: un carrusel
 * que dejaba visible la tercera diapositiva vuelve a la primera, y una entrada
 * animada que terminaba en `opacity: 1` se queda invisible para siempre —
 * pausar escondería contenido, que es lo contrario de lo que se busca.
 * `paused` congela el movimiento donde está y se revierte sin secuelas.
 *
 * `transition-property: none` y no `transition: none` para que ninguna
 * duración residual del sitio vuelva a habilitarlas.
 */
const CSS = `
${SCOPE},
${SCOPE} *,
${SCOPE} *::before,
${SCOPE} *::after {
  animation-play-state: paused !important;
  transition-property: none !important;
}

html[${ANIMATIONS_ATTR}="paused"],
${SCOPE} {
  scroll-behavior: auto !important;
}`;

type AnimationsState = 'off' | 'paused';

const STEPS: readonly AnimationsState[] = ['off', 'paused'];

function mediaElements(root: ParentNode): HTMLMediaElement[] {
  return Array.from(root.querySelectorAll('video, audio'));
}

export function createAnimationsFeature(): Feature {
  let ui: CycleUI<AnimationsState> | null = null;
  let observer: MutationObserver | null = null;

  /**
   * El media que pausó ESTA feature.
   *
   * Se lleva la cuenta para que al reanudar vuelva a sonar solo lo que estaba
   * sonando: un video que el usuario ya había pausado tiene que seguir pausado.
   */
  const pausedByUs = new Set<HTMLMediaElement>();

  function pauseAll(root: ParentNode): void {
    for (const media of mediaElements(root)) {
      if (media.paused) continue;
      media.pause();
      pausedByUs.add(media);
    }
  }

  function resumeAll(): void {
    for (const media of pausedByUs) {
      // Puede haber sido sacado del DOM mientras estaba pausado.
      if (!media.isConnected) continue;
      // `play()` devuelve una promesa que rechaza si el navegador bloquea la
      // reproducción automática. No es un error nuestro y no hay nada que hacer.
      void media.play().catch(() => undefined);
    }
    pausedByUs.clear();
  }

  function startObserver(): void {
    if (observer || !document.body) return;
    // El media que llega después —una SPA que navega, un carrusel que carga en
    // diferido— también tiene que entrar pausado.
    observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
          if (node instanceof HTMLMediaElement) {
            if (!node.paused) {
              node.pause();
              pausedByUs.add(node);
            }
          } else if (node instanceof Element) {
            pauseAll(node);
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function stopObserver(): void {
    observer?.disconnect();
    observer = null;
  }

  return {
    id: 'animations',

    apply(state: Readonly<WidgetState>) {
      if (state.pauseAnimations) {
        setHostCss('animations', CSS);
        document.documentElement.setAttribute(ANIMATIONS_ATTR, 'paused');
        if (document.body) pauseAll(document.body);
        startObserver();
      } else {
        document.documentElement.removeAttribute(ANIMATIONS_ATTR);
        setHostCss('animations', null);
        stopObserver();
        resumeAll();
      }

      ui?.sync(state.pauseAnimations ? 'paused' : 'off');
    },

    teardown() {
      document.documentElement.removeAttribute(ANIMATIONS_ATTR);
      setHostCss('animations', null);
      stopObserver();
      resumeAll();
    },

    render(ctx: FeatureContext) {
      ui = createCycleUI<AnimationsState>(ctx, {
        icon: ICON_ANIMATIONS,
        label: ctx.t('animations.label'),
        steps: STEPS,
        text: (value) => ctx.t(`animations.${value}`),
        onChange: (value) =>
          ctx.setState({ pauseAnimations: value === 'paused' }),
      });

      ui.sync(ctx.getState().pauseAnimations ? 'paused' : 'off');
      return ui.element;
    },
  };
}

export const animationsFeature = createAnimationsFeature();
