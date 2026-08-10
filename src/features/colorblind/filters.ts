import type { ColorblindMode } from '../../core/types';
import { COLORBLIND_MATRICES, COLORBLIND_MODES } from './matrices';

const SVG_NS = 'http://www.w3.org/2000/svg';

export const FILTER_HOST_ID = 'modoa-colorblind-filters';
export const FILTER_ATTR = 'data-modoa-colorblind';

export function filterId(mode: Exclude<ColorblindMode, 'none'>): string {
  return `modoa-filter-${mode}`;
}

/**
 * Inyecta el <svg> con los 4 <filter> en el documento host.
 *
 * Tiene que vivir en el documento anfitrión y no en el Shadow DOM: `filter:
 * url(#id)` resuelve el ID contra el documento donde está el elemento filtrado.
 * Un filtro definido dentro del shadow es invisible para el <body> del host.
 */
export function injectFilters(): SVGSVGElement {
  const existing = document.getElementById(FILTER_HOST_ID);
  if (existing) return existing as unknown as SVGSVGElement;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.id = FILTER_HOST_ID;
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.style.cssText =
    'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';

  for (const mode of COLORBLIND_MODES) {
    const filter = document.createElementNS(SVG_NS, 'filter');
    filter.id = filterId(mode);
    // Las matrices están derivadas en RGB lineal. Lo declaramos explícito y no
    // confiamos en el default: el sitio host podría tener una regla global
    // `color-interpolation-filters: sRGB` que cambiaría el resultado.
    filter.setAttribute('color-interpolation-filters', 'linearRGB');

    const matrix = document.createElementNS(SVG_NS, 'feColorMatrix');
    matrix.setAttribute('type', 'matrix');
    matrix.setAttribute('values', COLORBLIND_MATRICES[mode].join(' '));

    filter.appendChild(matrix);
    svg.appendChild(filter);
  }

  // Va colgado de <html>, no del <body>, por dos razones:
  // 1. El <body> es justamente lo que filtramos; las definiciones no tienen
  //    por qué vivir adentro de lo que transforman.
  // 2. La estrategia de escalado con transform envuelve los hijos del <body>:
  //    desde acá el SVG no se lo lleva puesto. La resolución del ID es a nivel
  //    documento, así que el filtro se encuentra igual.
  document.documentElement.appendChild(svg);
  return svg;
}

export function removeFilters(): void {
  document.getElementById(FILTER_HOST_ID)?.remove();
}

/**
 * Referencia absoluta al filtro en lugar de `url(#id)` a secas.
 *
 * Un `<base href>` en el sitio host hace que las referencias de solo fragmento
 * se resuelvan contra la URL base y el filtro no se encuentre. Se recalcula en
 * cada aplicación porque en una SPA la URL cambia sin recargar.
 */
export function filterUrl(mode: Exclude<ColorblindMode, 'none'>): string {
  const base = window.location.href.split('#')[0] ?? '';
  return `url(${base}#${filterId(mode)})`;
}
