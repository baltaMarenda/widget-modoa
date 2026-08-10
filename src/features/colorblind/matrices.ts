import type { ColorblindMode } from '../../core/types';

/**
 * Matrices 4x5 para <feColorMatrix type="matrix">, en el orden que espera el
 * atributo `values`: 4 filas (R,G,B,A) x 5 columnas (R,G,B,A,offset).
 *
 * Los valores salen de `tools/derive-matrices.mjs` (`npm run matrices`), que
 * documenta las fuentes y hace la derivación. No editarlos a mano: cambiar el
 * script y volver a correrlo.
 *
 * Las tres primeras son matrices de CORRECCIÓN (daltonización), no de
 * simulación: buscan que una persona con esa dicromacia distinga colores que
 * de otro modo colapsan, no mostrar cómo los ve.
 *
 * OJO: están derivadas en RGB LINEAL. El filtro se declara con
 * color-interpolation-filters="linearRGB" justamente por eso.
 */
export const COLORBLIND_MATRICES: Record<
  Exclude<ColorblindMode, 'none'>,
  readonly number[]
> = {
  protanopia: [
    1, 0, 0, 0, 0,
    0.478897, 0.476911, 0.044192, 0, 0,
    0.597282, -0.688692, 1.09141, 0, 0,
    0, 0, 0, 1, 0,
  ],
  deuteranopia: [
    1, 0, 0, 0, 0,
    0.16279, 0.725047, 0.112165, 0, 0,
    0.454695, -0.645392, 1.190697, 0, 0,
    0, 0, 0, 1, 0,
  ],
  tritanopia: [
    0.741159, -0.407208, 0.666049, 0, 0,
    0.075098, 0.585234, 0.339668, 0, 0,
    0, 0, 1, 0, 0,
    0, 0, 0, 1, 0,
  ],
  // Acromatopsia no es corrección: no hay color que redistribuir. Es
  // luminancia relativa Rec.709, que preserva el contraste perceptual mucho
  // mejor que un promedio plano de los tres canales.
  achromatopsia: [
    0.2126, 0.7152, 0.0722, 0, 0,
    0.2126, 0.7152, 0.0722, 0, 0,
    0.2126, 0.7152, 0.0722, 0, 0,
    0, 0, 0, 1, 0,
  ],
};

export const COLORBLIND_MODES = Object.keys(
  COLORBLIND_MATRICES,
) as Exclude<ColorblindMode, 'none'>[];
