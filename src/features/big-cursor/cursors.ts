/**
 * Punteros grandes, dibujados como SVG y embebidos como data URI.
 *
 * Van embebidos y no como archivo suelto por la regla 4 del README ("nada de
 * red"): son unos cientos de bytes cada uno y tienen que estar disponibles en
 * el instante en que la persona activa la feature, sin una petición que pueda
 * fallar y dejarla sin cursor.
 *
 * Los tres se dibujan en un lienzo de 32x32 y se escalan al tamaño pedido, así
 * que el punto activo (el pixel exacto que "hace clic") se declara una sola vez
 * en unidades del lienzo y se convierte al vuelo.
 *
 * Relleno blanco con borde negro: es la combinación que se ve tanto sobre un
 * fondo claro como sobre uno oscuro. Un puntero de un solo color desaparece en
 * la mitad de los sitios.
 */

interface CursorArt {
  /** Contenido del <svg>, en un viewBox de 32x32. */
  body: string;
  /** Punto activo, en unidades del viewBox. */
  hotspot: [number, number];
}

const OUTLINE = 'fill="#ffffff" stroke="#000000" stroke-linejoin="round"';

const ARROW: CursorArt = {
  body: `<path d="M5 2 L5 25.5 L11.2 19.6 L15 28.4 L19.2 26.4 L15.4 17.9 L23.6 17.6 Z" ${OUTLINE} stroke-width="1.8"/>`,
  hotspot: [5, 2],
};

const POINTER: CursorArt = {
  body:
    `<path d="M13 27.5 C8.5 25.5 6.5 21.5 6.5 18 L6.5 14 C6.5 12.6 7.6 11.5 9 11.5 ` +
    `C10.4 11.5 11.5 12.6 11.5 14 L11.5 7.5 C11.5 6.1 12.6 5 14 5 C15.4 5 16.5 6.1 16.5 7.5 ` +
    `L16.5 11.5 C16.5 10.1 17.6 9 19 9 C20.4 9 21.5 10.1 21.5 11.5 L21.5 13 ` +
    `C21.5 11.6 22.6 10.5 24 10.5 C25.4 10.5 26.5 11.6 26.5 13 L26.5 19.5 ` +
    `C26.5 25 22.5 29 17.5 29 Z" ${OUTLINE} stroke-width="1.8"/>`,
  hotspot: [14, 5],
};

const TEXT: CursorArt = {
  body:
    `<path d="M11 4 H21 M11 28 H21 M16 4 V28" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>` +
    `<path d="M11 4 H21 M11 28 H21 M16 4 V28" fill="none" stroke="#000000" stroke-width="2.4" stroke-linecap="round"/>`,
  hotspot: [16, 16],
};

/** Tamaño en px de cada nivel. Los navegadores descartan cursores >128px. */
export const CURSOR_SIZES = { large: 48, xlarge: 64 } as const;

function dataUri(art: CursorArt, size: number): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 32 32">${art.body}</svg>`;
  // encodeURIComponent y no base64: pesa menos y se puede leer en el inspector.
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/**
 * Valor completo de `cursor` para un rol, con el keyword nativo de respaldo.
 *
 * El respaldo no es decorativo: si el navegador descarta la imagen —tamaño
 * fuera de rango, un sistema que no soporta cursores personalizados— sin él la
 * declaración entera queda inválida y el sitio se quedaría sin cursor.
 */
export function cursorValue(
  role: 'default' | 'pointer' | 'text',
  size: number,
): string {
  const art = role === 'pointer' ? POINTER : role === 'text' ? TEXT : ARROW;
  const scale = size / 32;
  const x = Math.round(art.hotspot[0] * scale);
  const y = Math.round(art.hotspot[1] * scale);
  const fallback = role === 'default' ? 'auto' : role;
  return `${dataUri(art, size)} ${x} ${y}, ${fallback}`;
}
