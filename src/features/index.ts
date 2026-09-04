import type { Feature } from '../core/types';
import { colorblindFeature } from './colorblind';
import { contrastFeature } from './contrast';
import { dyslexiaFontFeature } from './dyslexia-font';
import { fontSizeFeature } from './font-size';
import { lineSpacingFeature } from './line-spacing';
import { readingMaskFeature } from './reading-mask';
import { resetFeature } from './reset';
import { saturationFeature } from './saturation';
import { textAlignFeature } from './text-align';
import { textSpacingFeature } from './text-spacing';
import { ttsFeature } from './tts';

/**
 * Registro de features. El orden acá es el orden en el que aparecen en el menú.
 *
 * El panel es una grilla de dos columnas: los bloques con varias opciones a la
 * vista ocupan el ancho completo y los controles cíclicos —un botón que rota
 * entre sus estados— ocupan media columna. Por eso los cíclicos van de a pares:
 * cada par completa una fila, y el orden agrupa lo que se toca junto.
 *
 *   tamaño de página                 (fila entera)
 *   interlineado  ·  espaciado       (texto)
 *   alineación    ·  foco            (lectura)
 *   fuente para dislexia             (fila entera)
 *   contraste     ·  saturación      (color)
 *   filtro de daltonismo             (fila entera)
 *   lectura por voz                  (fila entera)
 *
 * `resetFeature` va última a propósito: es una acción destructiva y no conviene
 * tenerla pegada a los toggles que el usuario está manipulando.
 */
export const features: Feature[] = [
  fontSizeFeature,
  lineSpacingFeature,
  textSpacingFeature,
  textAlignFeature,
  readingMaskFeature,
  dyslexiaFontFeature,
  contrastFeature,
  saturationFeature,
  colorblindFeature,
  ttsFeature,
  resetFeature,
];
