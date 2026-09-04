/**
 * Piezas compartidas por las features que reescriben la tipografía del sitio
 * host (fuente para dislexia, espaciado de texto, espaciado de líneas).
 */

/**
 * Selectores de elementos que NO deben recibir cambios tipográficos.
 *
 * Las fuentes de íconos (Font Awesome, Material Icons, Glyphicons y compañía)
 * dibujan glifos en el área de uso privado de Unicode. Si les pisamos el
 * font-family, los íconos del sitio se convierten en cuadraditos vacíos — es
 * la forma más rápida de que un cliente pida dar de baja el widget. Y con
 * `letter-spacing` pasa algo más sutil: no rompe el glifo, pero le mete aire a
 * la derecha y lo desalinea de su texto.
 *
 * Se excluye por clase porque los pseudo-elementos ::before/::after heredan el
 * font-family de su elemento originante: excluyendo el elemento, el ícono
 * sobrevive.
 */
export const ICON_SELECTORS = [
  '[class*="icon" i]',
  '[class*="fa-" i]',
  '[class*="glyphicon" i]',
  '[class*="material-" i]',
  '[class*="symbol" i]',
] as const;

/** Cadena de `:not(...)` lista para pegar detrás de un `*`. */
export const ICON_EXCLUSIONS = ICON_SELECTORS.map(
  (selector) => `:not(${selector})`,
).join('');

/**
 * Alcance de una feature: el <body> del host y todo su subárbol, salvo íconos.
 *
 * Se apunta al <html> por atributo y no al <body> porque prender y apagar la
 * feature es entonces tocar un solo atributo, sin recalcular reglas.
 *
 * Devuelve el par `[raíz, descendientes]` para poder usarlos por separado
 * cuando una regla solo aplica a uno de los dos.
 */
export function textScope(attr: string, value?: string): [string, string] {
  const marker = value === undefined ? `[${attr}]` : `[${attr}="${value}"]`;
  const root = `html${marker} body`;
  return [root, `${root} *${ICON_EXCLUSIONS}`];
}

/**
 * Devuelve el espaciado de los íconos a `normal`.
 *
 * Excluirlos del selector no alcanza: `letter-spacing` y `word-spacing` se
 * heredan, así que llegan igual desde el ancestro que sí matcheó.
 */
export function resetIconSpacing(root: string): string {
  return `${ICON_SELECTORS.map((selector) => `${root} ${selector}`).join(',\n')} {
  letter-spacing: normal !important;
  word-spacing: normal !important;
}`;
}
