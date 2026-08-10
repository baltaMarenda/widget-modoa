const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function isVisible(el: HTMLElement): boolean {
  return (
    el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0
  );
}

export function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('inert') && isVisible(el),
  );
}

export interface FocusTrap {
  activate(): void;
  deactivate(): void;
}

/**
 * Mantiene el foco dentro de `container` mientras está activo (solo Tab;
 * de Escape se encarga el widget, que también escucha con el foco en el botón).
 *
 * El listener va en el contenedor y no en `document`: así el widget nunca
 * intercepta teclas del sitio anfitrión cuando el menú está cerrado.
 */
export function createFocusTrap(container: HTMLElement): FocusTrap {
  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;

    const items = getFocusable(container);
    if (items.length === 0) {
      // Sin nada tabulable dentro, el foco se queda en el propio contenedor.
      event.preventDefault();
      container.focus();
      return;
    }

    const first = items[0]!;
    const last = items[items.length - 1]!;
    const root = container.getRootNode();
    const active =
      root instanceof ShadowRoot
        ? (root.activeElement as HTMLElement | null)
        : (document.activeElement as HTMLElement | null);

    if (event.shiftKey && (active === first || active === container)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return {
    activate() {
      container.addEventListener('keydown', onKeydown, true);
    },
    deactivate() {
      container.removeEventListener('keydown', onKeydown, true);
    },
  };
}
