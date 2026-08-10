import type { Lang } from './types';

type Dict = Record<string, string>;

const es: Dict = {
  'button.label': 'Abrir menú de accesibilidad',
  'button.labelClose': 'Cerrar menú de accesibilidad',
  'menu.title': 'Accesibilidad',
  'menu.label': 'Opciones de accesibilidad',
  'menu.close': 'Cerrar',
  'menu.empty': 'Todavía no hay opciones disponibles.',
  'fontSize.label': 'Tamaño de página',
  'colorblind.label': 'Filtro de color',
  'colorblind.none': 'Ninguno',
  'colorblind.protanopia': 'Protanopía',
  'colorblind.deuteranopia': 'Deuteranopía',
  'colorblind.tritanopia': 'Tritanopía',
  'colorblind.achromatopsia': 'Acromatopsia',
  'tts.label': 'Lectura por voz',
  'tts.off': 'Desactivada',
  'tts.on': 'Activada',
  'tts.hint': 'Seleccioná texto en la página y tocá "Leer", o usá Alt + L.',
  'tts.read': 'Leer',
  'tts.readAria': 'Leer en voz alta el texto seleccionado. Atajo: Alt más L.',
  'tts.stop': 'Detener',
  'tts.stopAria': 'Detener la lectura en voz alta.',
  'dyslexia.label': 'Fuente para dislexia',
  'dyslexia.off': 'Desactivada',
  'dyslexia.on': 'Activada',
  'dyslexia.hint': 'OpenDyslexic con mayor interletrado, interpalabra e interlineado.',
  'reset.label': 'Restablecer todo',
  'reset.aria': 'Restablecer todas las opciones de accesibilidad a sus valores por defecto.',
};

const en: Dict = {
  'button.label': 'Open accessibility menu',
  'button.labelClose': 'Close accessibility menu',
  'menu.title': 'Accessibility',
  'menu.label': 'Accessibility options',
  'menu.close': 'Close',
  'menu.empty': 'No options available yet.',
  'fontSize.label': 'Page size',
  'colorblind.label': 'Color filter',
  'colorblind.none': 'None',
  'colorblind.protanopia': 'Protanopia',
  'colorblind.deuteranopia': 'Deuteranopia',
  'colorblind.tritanopia': 'Tritanopia',
  'colorblind.achromatopsia': 'Achromatopsia',
  'tts.label': 'Read aloud',
  'tts.off': 'Off',
  'tts.on': 'On',
  'tts.hint': 'Select text on the page and press "Read", or use Alt + L.',
  'tts.read': 'Read',
  'tts.readAria': 'Read the selected text aloud. Shortcut: Alt plus L.',
  'tts.stop': 'Stop',
  'tts.stopAria': 'Stop reading aloud.',
  'dyslexia.label': 'Dyslexia font',
  'dyslexia.off': 'Off',
  'dyslexia.on': 'On',
  'dyslexia.hint': 'OpenDyslexic with increased letter, word and line spacing.',
  'reset.label': 'Reset all',
  'reset.aria': 'Reset all accessibility options to their default values.',
};

const DICTS: Record<Lang, Dict> = { es, en };

export function createTranslator(lang: Lang): (key: string) => string {
  const dict = DICTS[lang];
  return (key) => dict[key] ?? es[key] ?? key;
}
