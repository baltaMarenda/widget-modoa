import type {
  Feature,
  FeatureContext,
  WidgetConfig,
  WidgetState,
} from '../../core/types';
import { createBubble, type Bubble } from './bubble';
import { createSpeechController, type SpeechController } from './speech';

/**
 * selectionchange dispara en cada movimiento del cursor durante el arrastre.
 * Esperamos a que la selección se asiente antes de mostrar o reubicar nada.
 */
const SETTLE_MS = 180;

/** Atajo de teclado para leer la selección sin pasar por el mouse. */
const SHORTCUT_KEY = 'l';

function resolveSpeechLang(config: WidgetConfig): string {
  // 1. Override explícito del cliente, sin restricción de idiomas.
  const explicit = config.speechLang?.trim();
  if (explicit) return explicit;
  // 2. El idioma que declara el sitio host. Se lee en cada lectura porque una
  //    SPA puede cambiarlo al navegar.
  const documentLang = document.documentElement.lang?.trim();
  if (documentLang) return documentLang;
  // 3. Último recurso: el idioma de la UI del widget.
  return config.lang;
}

/**
 * Rectángulo donde anclar el botón.
 *
 * Se usa el ÚLTIMO rect de la selección, no el bounding box: en una selección
 * de varias líneas el bounding box centraría el botón en el medio del bloque,
 * lejos de donde el usuario terminó de seleccionar.
 */
function selectionRect(selection: Selection): DOMRect | null {
  if (selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  const rects = range.getClientRects();
  const last = rects.length > 0 ? rects[rects.length - 1] : null;
  const rect = last ?? range.getBoundingClientRect();
  // Una selección colapsada o en un nodo sin caja da un rect degenerado.
  if (rect.width === 0 && rect.height === 0) return null;
  return rect as DOMRect;
}

export function createTtsFeature(): Feature {
  const speech: SpeechController = createSpeechController();

  let bubble: Bubble | null = null;
  let options: HTMLButtonElement[] = [];
  let enabled = false;

  /** Texto capturado cuando la selección se asentó. */
  let selectedText = '';
  let settleTimer: number | undefined;
  let repositionFrame: number | undefined;
  let ctxRef: FeatureContext | null = null;

  function syncOptions(on: boolean): void {
    for (const [index, button] of options.entries()) {
      button.setAttribute('aria-checked', String((index === 1) === on));
    }
  }

  function clearBubble(): void {
    selectedText = '';
    bubble?.hide();
  }

  /** Ignora las selecciones hechas dentro de la propia UI del widget. */
  function isOwnSelection(selection: Selection): boolean {
    const node = selection.anchorNode;
    if (!node || !ctxRef) return false;
    return node.getRootNode() === ctxRef.shadow;
  }

  function readSelection(): void {
    const selection = window.getSelection();
    const usable =
      selection && !selection.isCollapsed && !isOwnSelection(selection)
        ? selection
        : null;
    const text = usable ? usable.toString().trim() : '';

    /*
     * Cualquier cambio real en la selección detiene la lectura en curso.
     *
     * Esto resuelve dos cosas de una: la nueva selección cancela el speech
     * anterior antes de arrancar el nuevo, y nunca queda una lectura sonando
     * sin control visible para detenerla (si la burbuja se escondiera al
     * limpiarse la selección, el usuario se quedaría sin botón de "Detener").
     *
     * La comparación contra `selectedText` importa: hay navegadores que
     * disparan selectionchange sin que la selección haya cambiado —
     * al mover el foco, por ejemplo— y ahí no hay que cortar nada.
     */
    if (text !== selectedText && speech.getState() === 'speaking') {
      speech.cancel();
    }

    const rect = usable && text ? selectionRect(usable) : null;
    if (!rect) {
      clearBubble();
      return;
    }

    selectedText = text;
    bubble?.show(rect);
  }

  function onSelectionChange(): void {
    if (!enabled) return;
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(readSelection, SETTLE_MS);
  }

  /** El botón sigue a la selección al hacer scroll o cambiar el tamaño. */
  function onViewportChange(): void {
    if (!enabled || !bubble?.isVisible()) return;
    if (repositionFrame !== undefined) return;
    repositionFrame = window.requestAnimationFrame(() => {
      repositionFrame = undefined;
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      const rect = selectionRect(selection);
      if (rect) bubble?.reposition(rect);
    });
  }

  function toggleSpeech(): void {
    if (!ctxRef) return;
    if (speech.getState() === 'speaking') {
      speech.cancel();
      return;
    }
    if (!selectedText) return;
    speech.speak(selectedText, resolveSpeechLang(ctxRef.config));
  }

  /**
   * Alt+L lee la selección actual.
   *
   * Es el camino sin mouse: quien selecciona con Shift+flechas no puede llegar
   * al botón flotante con Tab de forma razonable — el host del widget es el
   * último hijo de <html>, así que en orden de tabulación queda después de
   * todo el contenido del sitio.
   */
  function onKeydown(event: KeyboardEvent): void {
    if (!enabled) return;
    if (!event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key.toLowerCase() !== SHORTCUT_KEY) return;

    // Con el botón visible ya hay texto capturado; si no, se lee al vuelo
    // (el debounce puede no haber corrido todavía).
    if (!selectedText) readSelection();
    if (!selectedText) return;

    event.preventDefault();
    toggleSpeech();
  }

  function onPageHide(): void {
    speech.cancel();
  }

  return {
    id: 'tts',

    setup(ctx: FeatureContext) {
      ctxRef = ctx;
      if (!speech.supported) return;

      bubble = createBubble(
        ctx.shadow,
        {
          read: ctx.t('tts.read'),
          readAria: ctx.t('tts.readAria'),
          stop: ctx.t('tts.stop'),
          stopAria: ctx.t('tts.stopAria'),
        },
        toggleSpeech,
      );

      speech.subscribe((state) => bubble?.setSpeaking(state === 'speaking'));

      document.addEventListener('selectionchange', onSelectionChange);
      window.addEventListener('scroll', onViewportChange, { passive: true, capture: true });
      window.addEventListener('resize', onViewportChange, { passive: true });
      document.addEventListener('keydown', onKeydown);
      // Cubre navegación real, cierre de pestaña y bfcache.
      window.addEventListener('pagehide', onPageHide);
      // Cubre el back/forward de las SPA.
      window.addEventListener('popstate', onPageHide);
    },

    apply(state: Readonly<WidgetState>) {
      enabled = speech.supported && state.tts;
      syncOptions(enabled);
      if (!enabled) {
        window.clearTimeout(settleTimer);
        speech.cancel();
        clearBubble();
      }
    },

    teardown() {
      window.clearTimeout(settleTimer);
      speech.cancel();
      clearBubble();
      document.removeEventListener('selectionchange', onSelectionChange);
      window.removeEventListener('scroll', onViewportChange, true);
      window.removeEventListener('resize', onViewportChange);
      document.removeEventListener('keydown', onKeydown);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('popstate', onPageHide);
      bubble?.element.remove();
      bubble = null;
    },

    render(ctx: FeatureContext) {
      // Sin soporte del navegador no se ofrece una opción muerta.
      if (!speech.supported) return null;

      const label = ctx.t('tts.label');
      const labelId = 'modoa-tts-label';

      const group = document.createElement('div');
      group.className = 'feat';
      group.setAttribute('role', 'group');
      group.setAttribute('aria-labelledby', labelId);

      const title = document.createElement('span');
      title.className = 'feat__label';
      title.id = labelId;
      title.textContent = label;

      const list = document.createElement('div');
      list.className = 'feat__options';

      options = (['off', 'on'] as const).map((key, index) => {
        const text = ctx.t(`tts.${key}`);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'opt';
        button.setAttribute('role', 'menuitemradio');
        button.setAttribute('aria-checked', 'false');
        button.setAttribute('aria-label', `${label}: ${text}`);
        button.textContent = text;
        button.addEventListener('click', () => {
          ctx.setState({ tts: index === 1 });
        });
        return button;
      });

      const hint = document.createElement('p');
      hint.className = 'feat__hint';
      hint.textContent = ctx.t('tts.hint');

      list.append(...options);
      group.append(title, list, hint);

      syncOptions(ctx.getState().tts);

      return group;
    },
  };
}

export const ttsFeature = createTtsFeature();
