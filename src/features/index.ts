import type { Feature } from '../core/types';
import { animationsFeature } from './animations';
import { bigCursorFeature } from './big-cursor';
import { colorblindFeature } from './colorblind';
import { contrastFeature } from './contrast';
import { dyslexiaFontFeature } from './dyslexia-font';
import { fontSizeFeature } from './font-size';
import { hideImagesFeature } from './hide-images';
import { highlightLinksFeature } from './highlight-links';
import { lineSpacingFeature } from './line-spacing';
import { profilesFeature } from './profiles';
import { readingMaskFeature } from './reading-mask';
import { resetFeature } from './reset';
import { saturationFeature } from './saturation';
import { smartContrastFeature } from './smart-contrast';
import { textAlignFeature } from './text-align';
import { textSpacingFeature } from './text-spacing';
import { translateFeature } from './translate';
import { ttsFeature } from './tts';

/**
 * Registro de features. El orden acá es el orden en el que aparecen en el menú
 * y también el orden en el que corre `apply` (ver main.ts).
 *
 * El panel es una grilla de dos columnas: los bloques con varias opciones a la
 * vista ocupan el ancho completo y los controles cíclicos —un botón que rota
 * entre sus estados— ocupan media columna. Por eso los cíclicos van de a pares:
 * cada par completa una fila, y el orden agrupa lo que se toca junto.
 *
 *   traducción                       (desplegable, fila entera)
 *   perfiles de accesibilidad        (desplegable, fila entera)
 *   tamaño de página                 (fila entera)
 *   interlineado  ·  espaciado       (texto)
 *   alineación    ·  foco            (lectura)
 *   fuente para dislexia             (fila entera)
 *   contraste     ·  contraste int.  (color)
 *   saturación    ·  animaciones     (color y movimiento)
 *   ocultar imág. ·  resaltar enl.   (simplificar la página)
 *   cursor grande                    (fila entera: es el cíclico impar)
 *   filtro de daltonismo             (fila entera)
 *   lectura por voz                  (fila entera)
 *
 * Tres posiciones no son negociables:
 *
 * - `translateFeature` va PRIMERA. Es la única opción que le sirve a alguien
 *   que no puede leer el resto del panel: dejarla más abajo la escondería
 *   detrás de quince rótulos escritos en el idioma que esa persona no entiende.
 * - `profilesFeature` va SEGUNDA, y por el mismo motivo va arriba de los
 *   controles sueltos: es la puerta de entrada para quien no sabe qué control
 *   necesita, y abajo de quince opciones no la encontraría nadie.
 * - `smartContrastFeature` va INMEDIATAMENTE DESPUÉS de `contrastFeature`.
 *   Mide los colores computados del sitio, así que necesita correr con la hoja
 *   de contraste ya inyectada.
 *
 * `resetFeature` va última a propósito: es una acción destructiva y no conviene
 * tenerla pegada a los toggles que el usuario está manipulando.
 */
export const features: Feature[] = [
  translateFeature,
  profilesFeature,
  fontSizeFeature,
  lineSpacingFeature,
  textSpacingFeature,
  textAlignFeature,
  readingMaskFeature,
  dyslexiaFontFeature,
  contrastFeature,
  smartContrastFeature,
  saturationFeature,
  animationsFeature,
  hideImagesFeature,
  highlightLinksFeature,
  bigCursorFeature,
  colorblindFeature,
  ttsFeature,
  resetFeature,
];
