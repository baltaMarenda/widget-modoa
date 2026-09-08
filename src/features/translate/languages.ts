import type { TranslateLang } from '../../core/types';

/**
 * Idiomas ofrecidos, con su nombre escrito EN ESE IDIOMA.
 *
 * No se traducen los nombres al idioma de la UI a propósito: quien busca esta
 * opción es, por definición, alguien que no lee bien el idioma en el que está
 * el panel. "Deutsch" lo encuentra; "Alemán" no necesariamente.
 *
 * La lista es corta y curada, no la lista completa de pares que soporta el
 * navegador: cada idioma que se agrega es un modelo que el navegador puede
 * tener que descargar, y una lista de cien entradas en un desplegable de panel
 * es imposible de recorrer con el teclado.
 */
export interface LanguageOption {
  code: Exclude<TranslateLang, 'off'>;
  name: string;
}

export const LANGUAGES: readonly LanguageOption[] = [
  { code: 'es', name: 'Español' },
  { code: 'en', name: 'English' },
  { code: 'pt', name: 'Português' },
  { code: 'fr', name: 'Français' },
  { code: 'it', name: 'Italiano' },
  { code: 'de', name: 'Deutsch' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'ru', name: 'Русский' },
  { code: 'ar', name: 'العربية' },
  { code: 'hi', name: 'हिन्दी' },
];

export function languageName(code: TranslateLang): string | null {
  return LANGUAGES.find((language) => language.code === code)?.name ?? null;
}
