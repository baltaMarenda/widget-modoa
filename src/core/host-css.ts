/**
 * Hoja de estilos única que el widget inyecta en el documento host.
 *
 * Varias features escriben CSS sobre el sitio y varias pisan las MISMAS
 * propiedades: la fuente para dislexia fija `line-height`, `letter-spacing` y
 * `word-spacing`; el espaciado de texto fija los dos últimos; el espaciado de
 * líneas fija el primero. Todas usan `!important` sobre selectores de
 * especificidad parecida, así que quién gana lo decide el ORDEN EN LA HOJA.
 *
 * Con un `<style>` por feature ese orden sería el orden de activación: prender
 * dislexia después del espaciado de líneas daría un resultado distinto que al
 * revés. Por eso hay una sola hoja y las secciones se escriben siempre en el
 * orden de `ORDER`, sin importar cuándo se activó cada una.
 */

const STYLE_ID = 'modoa-host-style';

export type CssSection =
  | 'contrast'
  | 'smart-contrast'
  | 'text-align'
  | 'dyslexia'
  | 'text-spacing'
  | 'line-spacing'
  | 'animations'
  | 'big-cursor';

/**
 * De menor a mayor prioridad. La regla es "lo que la persona eligió explícito
 * le gana a lo que vino de arrastre":
 *
 * - `dyslexia` trae un espaciado fijo como parte del paquete de la fuente, así
 *   que va antes que los dos controles dedicados a espaciado.
 * - `text-spacing` (interletrado e interpalabra) va antes que `line-spacing`
 *   (interlineado). No se pisan entre sí; el orden solo importa si más
 *   adelante alguno suma una propiedad del otro.
 * - `smart-contrast` va detrás de `contrast` porque las dos escriben `color`:
 *   la corrección medida elemento por elemento le gana a la paleta forzada.
 *   (En la práctica no compiten: con una paleta forzada el contraste ya es
 *   21:1 y la corrección inteligente no emite ninguna regla.)
 * - `animations` y `big-cursor` van al final y su posición da igual: escriben
 *   propiedades —`animation-play-state`, `cursor`— que no toca nadie más.
 */
const ORDER: readonly CssSection[] = [
  'contrast',
  'smart-contrast',
  'text-align',
  'dyslexia',
  'text-spacing',
  'line-spacing',
  'animations',
  'big-cursor',
];

const sections = new Map<CssSection, string>();

let element: HTMLStyleElement | null = null;

function render(): void {
  if (sections.size === 0) {
    element?.remove();
    element = null;
    return;
  }

  // `isConnected` y no una simple comprobación de null: un sitio host que
  // reescribe su <head> se lleva puesto el nodo y hay que volver a colgarlo.
  if (!element?.isConnected) {
    const existing = document.getElementById(STYLE_ID);
    element =
      existing instanceof HTMLStyleElement
        ? existing
        : document.createElement('style');
    element.id = STYLE_ID;
    document.head.appendChild(element);
  }

  element.textContent = ORDER.filter((section) => sections.has(section))
    .map((section) => `/* ${section} */\n${sections.get(section)!}`)
    .join('\n');
}

/**
 * Registra (o da de baja, con `null`) el CSS de una sección.
 *
 * Cuando no queda ninguna sección el `<style>` se saca del documento: el
 * teardown tiene que devolver el DOM del host exactamente como estaba.
 */
export function setHostCss(section: CssSection, css: string | null): void {
  if (css === null) {
    if (!sections.delete(section)) return;
  } else {
    if (sections.get(section) === css) return;
    sections.set(section, css);
  }
  render();
}
