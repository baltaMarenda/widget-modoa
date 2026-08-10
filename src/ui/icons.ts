/**
 * Iconos inline. Son decorativos: la etiqueta accesible vive siempre en el
 * aria-label del botón que los contiene, por eso van con aria-hidden.
 */

/** Cruz para el botón de cerrar. */
export const ICON_CLOSE = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M6 6l12 12M18 6L6 18"></path>
</svg>`;

/** Parlante con ondas, para el botón contextual de lectura. */
export const ICON_SPEAK = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M4 9v6h3.5L12 19V5L7.5 9H4z"></path>
  <path d="M15.5 8.3a4.5 4.5 0 0 1 0 7.4v-1.9a2.8 2.8 0 0 0 0-3.6V8.3z"></path>
  <path d="M17.6 5.6a7.6 7.6 0 0 1 0 12.8v-1.8a6 6 0 0 0 0-9.2V5.6z"></path>
</svg>`;

/** Flecha circular de reinicio. */
export const ICON_RESET = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M12 5V2L7.5 6.5 12 11V8a5 5 0 1 1-5 5H5a7 7 0 1 0 7-8z"></path>
</svg>`;

/** Cuadrado de detener. */
export const ICON_STOP = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <rect x="6" y="6" width="12" height="12" rx="2"></rect>
</svg>`;
