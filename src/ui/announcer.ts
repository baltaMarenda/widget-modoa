/**
 * Región viva del panel, para anunciar cambios de estado a un lector de
 * pantalla.
 *
 * Los controles cíclicos son un botón que cambia lo que hace cada vez que se
 * presiona. Un lector de pantalla lee el nombre accesible cuando el botón
 * recibe el foco, pero NO lo vuelve a leer porque el nombre haya cambiado: sin
 * esto, la persona presiona y no se entera de a qué estado pasó.
 *
 * WCAG 2.1, SC 4.1.3 "Status Messages" (nivel AA).
 * https://www.w3.org/WAI/WCAG21/Understanding/status-messages.html
 */

/** Milisegundos entre vaciar y volver a escribir. Ver `announce`. */
const REWRITE_DELAY = 60;

let region: HTMLElement | null = null;
let pending: ReturnType<typeof setTimeout> | null = null;

/**
 * La región tiene que existir en el DOM ANTES de que le entre texto: si se
 * crea y se llena en el mismo tick, el lector de pantalla no la registró como
 * viva todavía y no anuncia nada. Por eso se crea al armar el panel y no en el
 * primer anuncio.
 */
export function createAnnouncer(shadow: ShadowRoot): HTMLElement {
  const element = document.createElement('div');
  element.className = 'sr-only';
  element.setAttribute('role', 'status');
  element.setAttribute('aria-live', 'polite');
  element.setAttribute('aria-atomic', 'true');
  region = element;
  shadow.appendChild(element);
  return element;
}

/**
 * Anuncia un mensaje.
 *
 * Se vacía primero y se escribe en un tick posterior porque un ciclo puede
 * volver al mismo valor de antes (apagado → ... → apagado): reasignar el mismo
 * texto no cuenta como mutación y el lector se queda callado.
 */
export function announce(message: string): void {
  if (!region) return;
  if (pending) clearTimeout(pending);

  region.textContent = '';
  pending = setTimeout(() => {
    pending = null;
    if (region) region.textContent = message;
  }, REWRITE_DELAY);
}

/** Para el teardown del panel: corta un anuncio en vuelo y suelta la región. */
export function destroyAnnouncer(): void {
  if (pending) clearTimeout(pending);
  pending = null;
  region?.remove();
  region = null;
}
