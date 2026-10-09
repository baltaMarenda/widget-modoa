import type { WidgetState } from '../../core/types';

/**
 * Perfiles de accesibilidad: combinaciones de opciones que resuelven una
 * necesidad concreta, para no obligar a recorrer quince controles.
 *
 * No hay perfiles de discapacidad motora ni de ceguera a propósito: lo que esas
 * dos necesitan —navegación por teclado completa, estructura semántica correcta
 * para el lector de pantalla— no es algo que un widget pueda activar desde
 * afuera. Prometerlo con un botón sería peor que no ofrecerlo.
 */
export type ProfileId =
  | 'colorblind'
  | 'dyslexia'
  | 'lowVision'
  | 'cognitive'
  | 'epilepsy'
  | 'adhd';

/** El orden del desplegable. */
export const PROFILE_IDS: readonly ProfileId[] = [
  'colorblind',
  'dyslexia',
  'lowVision',
  'cognitive',
  'epilepsy',
  'adhd',
];

/**
 * Qué enciende cada perfil. Todo lo que no figura queda en su valor por
 * defecto: elegir un perfil parte SIEMPRE de cero (ver features/profiles).
 *
 * `fontSizeStep` es índice de FONT_SIZE_FACTORS (features/font-size):
 * 1 = 115 %, 2 = 130 %.
 */
export const PRESETS: Record<ProfileId, Partial<WidgetState>> = {
  /*
   * Daltonismo. No se enciende ningún filtro de daltonización porque el filtro
   * correcto depende del tipo —protanopía, deuteranopía, tritanopía— y elegir
   * uno al azar empeora la visión de los otros dos. Lo que sí sirve para los
   * tres: más saturación, que separa tonos que estaban cerca, y contraste
   * medido, que garantiza la legibilidad sin depender del color.
   */
  colorblind: {
    smartContrast: true,
    saturation: 'high',
  },

  dyslexia: {
    dyslexiaFont: true,
    pauseAnimations: true,
    textSpacing: 'light',
    lineSpacing: '1.5',
  },

  lowVision: {
    pauseAnimations: true,
    bigCursor: 'large',
    fontSizeStep: 2,
    saturation: 'high',
    textSpacing: 'moderate',
    lineSpacing: '1.75',
  },

  cognitive: {
    fontSizeStep: 1,
    readingMask: true,
  },

  /*
   * Epilepsia fotosensible. Pausar el movimiento es lo que evita el disparador
   * (WCAG 2.1 SC 2.3.1 "Three Flashes or Below Threshold"); bajar la saturación
   * atenúa los contrastes cromáticos saturados, que son el otro factor de
   * riesgo conocido — sobre todo el rojo.
   */
  epilepsy: {
    pauseAnimations: true,
    saturation: 'low',
  },

  adhd: {
    pauseAnimations: true,
    readingMask: true,
    saturation: 'low',
  },
};
