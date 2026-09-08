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

/*
 * Iconos de los controles cíclicos. Son de trazo, no de relleno: el estilo
 * (`.opt--cycle svg`) les pone `fill: none; stroke: currentColor`, así que el
 * ícono cambia de color solo cuando el botón pasa a estado activo. Lo que
 * necesite relleno lo declara inline, como la media luna del contraste.
 */

/** Círculo con media luna llena. */
export const ICON_CONTRAST = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <circle cx="12" cy="12" r="9"></circle>
  <path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none"></path>
</svg>`;

/** Dos topes verticales con una flecha doble en el medio: interletrado. */
export const ICON_TEXT_SPACING = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M4 5v14M20 5v14"></path>
  <path d="M8 12h8"></path>
  <path d="M10.5 9.5 8 12l2.5 2.5M13.5 9.5 16 12l-2.5 2.5"></path>
</svg>`;

/** Marco con una banda destacada al medio: la máscara de lectura. */
export const ICON_FOCUS = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <rect x="3" y="4" width="18" height="16" rx="2"></rect>
  <path d="M3 10h18M3 14h18"></path>
  <path d="M6 12h6"></path>
</svg>`;

/** Renglones con una flecha doble vertical al costado: interlineado. */
export const ICON_LINE_SPACING = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M10 5h11M10 12h11M10 19h11"></path>
  <path d="M4.5 6v12"></path>
  <path d="M2.5 8 4.5 6l2 2M2.5 16l2 2 2-2"></path>
</svg>`;

/** Renglones desparejos: alineación. */
export const ICON_TEXT_ALIGN = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M4 5h16M4 10h10M4 15h16M4 20h7"></path>
</svg>`;

/** Gota con la mitad llena: saturación. */
export const ICON_SATURATION = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M12 3.2c3.6 3.9 6 7 6 10.1a6 6 0 0 1-12 0c0-3.1 2.4-6.2 6-10.1z"></path>
  <path d="M12 3.2c3.6 3.9 6 7 6 10.1a6 6 0 0 1-6 6z" fill="currentColor" stroke="none"></path>
</svg>`;

/** Media luna dentro de un círculo, con un destello: contraste inteligente. */
export const ICON_SMART_CONTRAST = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <circle cx="11" cy="13" r="8"></circle>
  <path d="M11 5a8 8 0 0 0 0 16z" fill="currentColor" stroke="none"></path>
  <path d="M19 2.5v4M17 4.5h4"></path>
</svg>`;

/** Triángulo de reproducción junto a dos barras de pausa: animaciones. */
export const ICON_ANIMATIONS = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M4 5.5v13l9-6.5-9-6.5z"></path>
  <path d="M17 6v12M21 6v12"></path>
</svg>`;

/** Puntero de flecha con líneas de tamaño: cursor grande. */
export const ICON_CURSOR = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M5 3l10.5 8.5-4.6.9 2.6 5.4-2.2 1-2.6-5.4-3.7 3V3z"></path>
  <path d="M19 4v5M16.5 6.5h5"></path>
</svg>`;

/** Globo con meridianos: traducción. */
export const ICON_TRANSLATE = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <circle cx="12" cy="12" r="9"></circle>
  <path d="M3 12h18"></path>
  <path d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"></path>
</svg>`;

/** Silueta de persona dentro de un marco: perfiles. */
export const ICON_PROFILE = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <circle cx="12" cy="8.5" r="3.5"></circle>
  <path d="M5 20a7 7 0 0 1 14 0"></path>
</svg>`;

/** Chevron hacia abajo: estado plegado de un desplegable. */
export const ICON_CHEVRON = `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M6 9.5l6 6 6-6"></path>
</svg>`;
