/**
 * Quita una propiedad inline y, si el elemento se queda sin ninguna, borra el
 * atributo `style` entero.
 *
 * `style.removeProperty()` deja un `style=""` colgado. En un sitio que no tenía
 * atributo style, ese vacío es residuo nuestro: el teardown tiene que devolver
 * el DOM del host exactamente como estaba, no "igual pero con un atributo de
 * más".
 */
export function removeInlineProperty(
  element: HTMLElement,
  property: string,
): void {
  element.style.removeProperty(property);
  if (element.style.length === 0) {
    element.removeAttribute('style');
  }
}
