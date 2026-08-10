/**
 * Dos estrategias intercambiables para escalar el documento host.
 *
 * `font-size` es la primaria y la correcta: el contenido reflowea de verdad,
 * no hay overflow horizontal y nada rompe el posicionamiento. Solo funciona en
 * sitios cuyas medidas dependen del font-size raíz (rem/em/unidades relativas).
 *
 * `transform` es el plan B para sitios con px fijos por todos lados, donde
 * escalar la raíz no mueve nada. Escala visualmente y compensa el ancho para no
 * generar scroll horizontal, pero tiene costos reales — ver el comentario de
 * createTransformStrategy antes de habilitarla en un cliente.
 */

/** Marca en el <html>/<body> del host para que el reset y el QA la encuentren. */
import { removeInlineProperty } from '../../core/dom';

export const SCALE_ATTR = 'data-modoa-scale';

export interface ScaleStrategy {
  readonly id: 'font-size' | 'transform';
  /** factor 1 = sin escalar. Debe ser idempotente. */
  apply(factor: number): void;
  /** Deja el documento host exactamente como estaba. */
  reset(): void;
}

/* -------------------------------------------------------------------------- */

export function createFontSizeStrategy(): ScaleStrategy {
  const root = document.documentElement;
  let baseline: number | null = null;

  /** Se mide una sola vez y siempre antes de tocar nada. */
  function getBaseline(): number {
    if (baseline === null) {
      const measured = parseFloat(window.getComputedStyle(root).fontSize);
      baseline = Number.isFinite(measured) && measured > 0 ? measured : 16;
    }
    return baseline;
  }

  function reset(): void {
    removeInlineProperty(root, 'font-size');
    root.removeAttribute(SCALE_ATTR);
  }

  return {
    id: 'font-size',
    apply(factor) {
      const base = getBaseline();
      if (factor === 1) {
        reset();
        return;
      }
      // !important para ganarle a un `html { font-size: 16px }` del sitio host.
      root.style.setProperty(
        'font-size',
        `${(base * factor).toFixed(3)}px`,
        'important',
      );
      root.setAttribute(SCALE_ATTR, factor.toString());
    },
    reset,
  };
}

/* -------------------------------------------------------------------------- */

export const WRAPPER_ID = 'modoa-scale-wrapper';

/**
 * Escala visualmente el contenido del <body> con transform.
 *
 * Envuelve los hijos del body en un wrapper propio, excluyendo el host del
 * widget: así el botón y el menú no se escalan junto con la página.
 *
 * Limitaciones conocidas, a validar por sitio en QA antes de habilitarla:
 * - El wrapper crea un containing block: los `position: fixed` del sitio host
 *   (headers pegajosos, modales) pasan a posicionarse respecto del wrapper.
 * - Mover nodos recarga los <iframe> que haya en el body.
 * - No hay reflow real: el texto no se reacomoda, solo se agranda.
 */
export function createTransformStrategy(widgetHost: HTMLElement): ScaleStrategy {
  function findWrapper(): HTMLElement | null {
    return document.getElementById(WRAPPER_ID);
  }

  /**
   * Nodos que son del widget y nunca deben entrar al wrapper.
   *
   * Normalmente viven colgados de <html>, fuera del <body>. Pero si el sitio
   * host carga el widget con un script dinámico (que corre como `async`, con
   * el parser todavía abierto), el parser puede reubicarlos dentro del <body>.
   * Si eso pasa, el wrapper se los llevaría puestos y se escalarían junto con
   * la página.
   */
  function isWidgetOwned(node: Node): boolean {
    if (node === widgetHost) return true;
    if (!(node instanceof Element)) return false;
    return (
      node.id.startsWith('modoa-') ||
      node.tagName.toLowerCase().startsWith('modoa-')
    );
  }

  function ensureWrapper(): HTMLElement {
    const existing = findWrapper();
    if (existing) return existing;

    const wrapper = document.createElement('div');
    wrapper.id = WRAPPER_ID;
    wrapper.style.setProperty('transform-origin', '0 0', 'important');

    // Snapshot antes de mover: la lista viva cambiaría bajo nuestros pies.
    const children = Array.from(document.body.childNodes).filter(
      (node) => !isWidgetOwned(node),
    );
    document.body.appendChild(wrapper);
    wrapper.append(...children);
    return wrapper;
  }

  function unwrap(): void {
    const wrapper = findWrapper();
    if (!wrapper) return;
    const children = Array.from(wrapper.childNodes);
    document.body.insertBefore(
      children.reduce((frag, node) => {
        frag.appendChild(node);
        return frag;
      }, document.createDocumentFragment()),
      wrapper,
    );
    wrapper.remove();
    document.body.removeAttribute(SCALE_ATTR);
  }

  return {
    id: 'transform',
    apply(factor) {
      if (factor === 1) {
        unwrap();
        return;
      }
      const wrapper = ensureWrapper();
      wrapper.style.setProperty('transform', `scale(${factor})`, 'important');
      // Compensa el ancho para que el contenido escalado siga entrando en el
      // viewport en lugar de provocar scroll horizontal.
      wrapper.style.setProperty('width', `${(100 / factor).toFixed(4)}%`, 'important');
      document.body.setAttribute(SCALE_ATTR, factor.toString());
    },
    reset: unwrap,
  };
}
