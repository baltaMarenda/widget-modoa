/**
 * Composición del `filter` del <body> del sitio host.
 *
 * Tres features quieren pintar el documento con `filter` —daltonización,
 * saturación y el contraste invertido— y `filter` es UNA sola propiedad: la
 * última que escriba gana y borra a las otras. Este módulo es el único dueño
 * de esa propiedad; cada feature registra su capa y acá se arma la cadena.
 *
 * El orden de la cadena no es cosmético: los filtros se aplican en secuencia
 * sobre el resultado del anterior.
 *
 * 1. `saturation` primero, sobre los colores originales del sitio.
 * 2. `colorblind` después: la simulación tiene que correr sobre lo que la
 *    persona realmente va a ver, no sobre colores que después se modifican.
 * 3. `contrast` (la inversión) al final, sobre la imagen ya compuesta.
 */
import { removeInlineProperty } from './dom';

export type FilterLayer = 'saturation' | 'colorblind' | 'contrast';

const ORDER: readonly FilterLayer[] = ['saturation', 'colorblind', 'contrast'];

/** Marca de QA en el <body>: lista las capas activas, en orden de aplicación. */
export const HOST_FILTER_ATTR = 'data-modoa-filter';

const layers = new Map<FilterLayer, string>();

function activeLayers(): FilterLayer[] {
  return ORDER.filter((layer) => layers.has(layer));
}

function paint(): void {
  const body = document.body;
  if (!body) return;

  const active = activeLayers();

  if (active.length === 0) {
    removeInlineProperty(body, 'filter');
    body.removeAttribute(HOST_FILTER_ATTR);
    return;
  }

  // !important para ganarle a cualquier `filter` que declare el sitio host.
  body.style.setProperty(
    'filter',
    active.map((layer) => layers.get(layer)!).join(' '),
    'important',
  );
  body.setAttribute(HOST_FILTER_ATTR, active.join(' '));
}

/** `value === null` da de baja la capa. Idempotente. */
export function setHostFilter(layer: FilterLayer, value: string | null): void {
  if (value === null) {
    if (!layers.delete(layer)) return;
  } else {
    if (layers.get(layer) === value) return;
    layers.set(layer, value);
  }
  paint();
}

/** Da de baja todas las capas. Lo usa el teardown de cada feature vía su capa. */
export function clearHostFilters(): void {
  if (layers.size === 0) return;
  layers.clear();
  paint();
}
