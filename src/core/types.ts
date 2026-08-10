/** Tipos compartidos por el core y las features. */

export type ColorblindMode =
  | 'none'
  | 'protanopia'
  | 'deuteranopia'
  | 'tritanopia'
  | 'achromatopsia';

/** Índice dentro de FONT_SIZE_STEPS (100/115/130/150%). 0 = sin cambios. */
export type FontSizeStep = 0 | 1 | 2 | 3;

/** Todo lo que se persiste en localStorage, namespaced por client-id. */
export interface WidgetState {
  colorblind: ColorblindMode;
  fontSizeStep: FontSizeStep;
  tts: boolean;
  dyslexiaFont: boolean;
}

export const DEFAULT_STATE: WidgetState = {
  colorblind: 'none',
  fontSizeStep: 0,
  tts: false,
  dyslexiaFont: false,
};

export type Lang = 'es' | 'en';

export type WidgetPosition =
  | 'bottom-right'
  | 'bottom-left'
  | 'top-right'
  | 'top-left';

/**
 * Cómo se escala el documento host. Se elige por sitio cliente en QA manual;
 * ver src/features/font-size/strategies.ts.
 */
export type ScaleStrategyId = 'font-size' | 'transform';

/** Config leída de los atributos data-* del <script>. */
export interface WidgetConfig {
  clientId: string;
  lang: Lang;
  position: WidgetPosition;
  scaleStrategy: ScaleStrategyId;
  /**
   * Idioma para la lectura por voz (BCP-47, p. ej. "es-AR", "pt-BR").
   * `null` = deducirlo del <html lang> del sitio host.
   *
   * Es un atributo aparte de `lang` a propósito: `lang` define el idioma de la
   * UI del widget y solo admite los que están traducidos, mientras que la voz
   * puede ser de cualquier idioma que tenga el navegador.
   */
  speechLang: string | null;
  /**
   * URL base (con barra final) desde la que se descargan los assets sueltos.
   * Se deduce del `src` del <script>; `data-asset-base` la pisa.
   */
  assetBase: string;
}

/**
 * Contrato de una feature. Cada carpeta de src/features/ exporta una.
 * `apply` recibe el estado completo y es responsable de reflejarlo en el
 * documento host (o de limpiarse a sí misma cuando la feature está apagada).
 */
export interface Feature {
  /** Identificador estable; se usa como key en el registro. */
  id: string;
  /** Se llama una vez al montar el widget. Puede inyectar nodos en el host. */
  setup?(ctx: FeatureContext): void;
  /** Se llama al montar y en cada cambio de estado. Debe ser idempotente. */
  apply(state: Readonly<WidgetState>, ctx: FeatureContext): void;
  /** Deja el documento host como estaba. Lo usa el botón de reset. */
  teardown?(ctx: FeatureContext): void;
  /**
   * Devuelve la UI de la feature para el menú (Shadow DOM). `null` si la
   * feature no tiene nada que ofrecer en este navegador — no se pinta el bloque
   * en lugar de mostrar una opción muerta.
   */
  render?(ctx: FeatureContext): HTMLElement | null;
}

export interface FeatureContext {
  config: WidgetConfig;
  /** Elemento host del widget en el documento anfitrión. */
  host: HTMLElement;
  /** Raíz del Shadow DOM del widget. */
  shadow: ShadowRoot;
  /** Estado actual (solo lectura). */
  getState(): Readonly<WidgetState>;
  /** Aplica un patch al estado: persiste y re-aplica todas las features. */
  setState(patch: Partial<WidgetState>): void;
  /**
   * Reinicio completo: hace teardown de todas las features, borra la entrada
   * de localStorage y las vuelve a dejar como en una carga limpia.
   * La orquestación vive en main.ts, que es quien tiene el registro y el store.
   */
  reset(): void;
  /** Traduce una key de i18n. */
  t(key: string): string;
}
