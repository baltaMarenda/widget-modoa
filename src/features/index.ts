import type { Feature } from '../core/types';
import { colorblindFeature } from './colorblind';
import { dyslexiaFontFeature } from './dyslexia-font';
import { fontSizeFeature } from './font-size';
import { resetFeature } from './reset';
import { ttsFeature } from './tts';

/**
 * Registro de features. El orden acá es el orden en el que aparecen en el menú.
 *
 * `resetFeature` va última a propósito: es una acción destructiva y no conviene
 * tenerla pegada a los toggles que el usuario está manipulando.
 */
export const features: Feature[] = [
  fontSizeFeature,
  dyslexiaFontFeature,
  colorblindFeature,
  ttsFeature,
  resetFeature,
];
