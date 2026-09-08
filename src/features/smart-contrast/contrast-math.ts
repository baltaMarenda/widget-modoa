/**
 * Matemática de color de WCAG 2.1. Sin DOM: entra y sale texto CSS.
 *
 * Todo lo que hay acá sale de dos definiciones del estándar:
 *
 * - Luminancia relativa: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 * - Relación de contraste: https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 *
 * Los coeficientes (0.2126 R, 0.7152 G, 0.0722 B), el umbral 0.03928 y el
 * +0.05 de la razón son literales del estándar; no se tocan.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
  /** 0..1 */
  a: number;
}

/** Mínimos de SC 1.4.3 "Contrast (Minimum)", nivel AA. */
export const TARGET_NORMAL = 4.5;
export const TARGET_LARGE = 3;

/**
 * "Texto grande" según WCAG: 18pt (24px) o 14pt (18.66px) en negrita.
 * https://www.w3.org/TR/WCAG21/#dfn-large-scale
 */
export function targetRatio(fontSizePx: number, fontWeight: number): number {
  const bold = fontWeight >= 700;
  const large = fontSizePx >= 24 || (bold && fontSizePx >= 18.66);
  return large ? TARGET_LARGE : TARGET_NORMAL;
}

/**
 * Parsea lo que devuelve `getComputedStyle`.
 *
 * Los navegadores serializan SIEMPRE a `rgb(r g b)` o `rgba(r, g, b, a)` —
 * incluso si la hoja declaró `#abc`, `hsl()` o un nombre— así que no hace falta
 * un parser de CSS completo. Se aceptan las dos sintaxis, la vieja con comas y
 * la nueva con espacios y barra, porque conviven según navegador y versión.
 *
 * `transparent` sale como `rgba(0, 0, 0, 0)`: alfa 0, que es lo que se necesita
 * para saber que hay que seguir subiendo por los ancestros.
 */
export function parseColor(css: string): Rgb | null {
  const numbers = css.match(/[\d.]+%?/g);
  if (!numbers || numbers.length < 3) return null;

  const channel = (raw: string): number => {
    const value = Number.parseFloat(raw);
    if (Number.isNaN(value)) return Number.NaN;
    return raw.endsWith('%') ? (value * 255) / 100 : value;
  };

  const r = channel(numbers[0]!);
  const g = channel(numbers[1]!);
  const b = channel(numbers[2]!);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;

  let a = 1;
  if (numbers.length > 3) {
    const raw = numbers[3]!;
    const parsed = Number.parseFloat(raw);
    if (!Number.isNaN(parsed)) a = raw.endsWith('%') ? parsed / 100 : parsed;
  }

  return { r, g, b, a: Math.min(1, Math.max(0, a)) };
}

/** Luminancia relativa, 0 (negro) a 1 (blanco). Ignora el alfa. */
export function luminance(color: Rgb): number {
  const linear = (value: number): number => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * linear(color.r) +
    0.7152 * linear(color.g) +
    0.0722 * linear(color.b)
  );
}

/** Relación de contraste entre dos colores opacos. De 1:1 a 21:1. */
export function ratio(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

/** Compone `top` (con alfa) sobre `bottom` (opaco). */
export function composite(top: Rgb, bottom: Rgb): Rgb {
  const alpha = top.a;
  return {
    r: top.r * alpha + bottom.r * (1 - alpha),
    g: top.g * alpha + bottom.g * (1 - alpha),
    b: top.b * alpha + bottom.b * (1 - alpha),
    a: 1,
  };
}

export function toHex(color: Rgb): string {
  const hex = (value: number): string =>
    Math.round(Math.min(255, Math.max(0, value)))
      .toString(16)
      .padStart(2, '0');
  return `#${hex(color.r)}${hex(color.g)}${hex(color.b)}`;
}

/* --------------------------------------------------------------- HSL --- */

interface Hsl {
  h: number;
  s: number;
  l: number;
}

function toHsl(color: Rgb): Hsl {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) return { h: 0, s: 0, l };

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / delta) % 6;
  else if (max === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  return { h: (((h * 60) % 360) + 360) % 360, s, l };
}

function fromHsl(hsl: Hsl): Rgb {
  const { h, s, l } = hsl;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let rgb: [number, number, number];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];

  return {
    r: (rgb[0] + m) * 255,
    g: (rgb[1] + m) * 255,
    b: (rgb[2] + m) * 255,
    a: 1,
  };
}

const BLACK: Rgb = { r: 0, g: 0, b: 0, a: 1 };
const WHITE: Rgb = { r: 255, g: 255, b: 255, a: 1 };

/** Pasos de la búsqueda binaria. 12 dan una precisión de ~0.02% en L. */
const STEPS = 12;

/**
 * Devuelve un color legible para `fg` sobre `bg`, o `null` si ya cumple.
 *
 * La corrección mueve SOLO la luminosidad (L de HSL) y conserva el tono y la
 * saturación. Es lo que separa a esta feature de los modos de contraste
 * forzado: un enlace azul de marca sigue siendo azul, más claro o más oscuro,
 * en vez de convertirse en el amarillo de la paleta de alto contraste.
 *
 * La dirección —hacia el blanco o hacia el negro— se decide comparando cuánto
 * contrasta cada extremo contra el fondo, y no por un umbral de luminosidad.
 * La diferencia importa: el punto donde el blanco y el negro empatan NO es el
 * gris del medio sino una luminancia relativa de ~0.179, porque la fórmula de
 * WCAG no es simétrica. Con el umbral ingenuo en 0.5, todos los fondos de
 * luminancia intermedia se corregían para el lado equivocado.
 *
 * Si ni el blanco ni el negro puros alcanzan el objetivo —pasa con fondos de
 * luminancia media, donde el máximo posible ronda 5.4:1 y puede quedar corto
 * para 4.5:1— se devuelve el extremo elegido igual: mejorar lo que se pueda es
 * preferible a no tocar nada.
 */
export function fix(fg: Rgb, bg: Rgb, target: number): Rgb | null {
  const flat = fg.a < 1 ? composite(fg, bg) : fg;
  if (ratio(flat, bg) >= target) return null;

  const towardsWhite = ratio(WHITE, bg) > ratio(BLACK, bg);
  const extreme = towardsWhite ? WHITE : BLACK;

  if (ratio(extreme, bg) < target) return extreme;

  const hsl = toHsl(flat);
  let low = towardsWhite ? hsl.l : 0;
  let high = towardsWhite ? 1 : hsl.l;
  let best = extreme;

  for (let step = 0; step < STEPS; step += 1) {
    const mid = (low + high) / 2;
    const candidate = fromHsl({ h: hsl.h, s: hsl.s, l: mid });

    if (ratio(candidate, bg) >= target) {
      // Cumple: se guarda y se sigue buscando más cerca del color original.
      best = candidate;
      if (towardsWhite) high = mid;
      else low = mid;
    } else if (towardsWhite) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return best;
}
