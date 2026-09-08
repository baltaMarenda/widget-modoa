import type {
  Feature,
  FeatureContext,
  TranslateLang,
  WidgetState,
} from '../../core/types';
import { announce } from '../../ui/announcer';
import { createDisclosureUI, type DisclosureUI } from '../../ui/disclosure';
import { ICON_TRANSLATE } from '../../ui/icons';
import { LANGUAGES, languageName } from './languages';
import {
  availability,
  create,
  isSupported,
  type TranslatorInstance,
} from './translator';

/**
 * Traducción de la página al idioma que elija la persona.
 *
 * La barrera de idioma no está en WCAG como criterio —SC 3.1.1 y 3.1.2 solo
 * piden DECLARAR el idioma, no ofrecerlo— pero es una barrera de acceso real, y
 * para quien tiene una discapacidad cognitiva o de lectura leer en su lengua no
 * es una comodidad sino la diferencia entre entender y no entender.
 *
 * La traducción corre en el dispositivo (ver ./translator.ts): el contenido del
 * sitio no sale hacia ningún servidor.
 */

/** Nodos cuyo texto no es prosa y no hay que tocar. */
const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'TEXTAREA',
  'CODE',
  'KBD',
  'SAMP',
  'VAR',
  'PRE',
]);

/**
 * Atributos que se traducen además del texto.
 *
 * `alt` y `aria-label` son NOMBRE ACCESIBLE: es lo único que escucha quien usa
 * un lector de pantalla. En un widget de accesibilidad, traducir el texto
 * visible y dejar el nombre accesible en el idioma original sería traducir la
 * página para quien ve y no para quien escucha.
 */
const ATTRIBUTES = ['alt', 'title', 'placeholder', 'aria-label'] as const;

/** Traducciones en vuelo a la vez. Alcanza para no serializar y no ahogar. */
const CONCURRENCY = 8;

/** Rebote del observer de contenido dinámico. */
const DEBOUNCE_MS = 400;

/** `es-AR` y `es` son el mismo modelo: la API quiere el subtag base. */
function baseLang(tag: string): string {
  return tag.trim().toLowerCase().split('-')[0] ?? '';
}

function isSkipped(element: Element | null): boolean {
  if (!element) return true;
  if (SKIP_TAGS.has(element.tagName)) return true;
  // `translate="no"` y `.notranslate` son la señal estándar de HTML para
  // "no traducir esto": nombres propios, código, marcas.
  return element.closest('[translate="no"], .notranslate') !== null;
}

export function createTranslateFeature(): Feature {
  let ui: DisclosureUI<TranslateLang> | null = null;
  let ctxRef: FeatureContext | null = null;

  /** Idioma efectivamente aplicado al documento. */
  let applied: TranslateLang = 'off';
  /** Idioma de origen y `lang` original del <html>, para poder volver atrás. */
  let sourceLang = '';
  let originalDocLang: string | null = null;

  const textOriginals = new Map<Text, string>();
  const attrOriginals = new Map<Element, Map<string, string>>();
  /** Caché por texto de origen: los rótulos repetidos se traducen una vez. */
  const cache = new Map<string, string>();

  let instance: TranslatorInstance | null = null;
  let observer: MutationObserver | null = null;
  let debounce: number | undefined;
  /**
   * Se incrementa en cada cambio de idioma y en el teardown. Una traducción en
   * vuelo que llega tarde no debe escribir sobre un documento que ya cambió.
   */
  let generation = 0;

  function hint(key: string | null, ...args: string[]): void {
    if (!ctxRef || !ui) return;
    if (key === null) {
      ui.setHint(null);
      return;
    }
    let message = ctxRef.t(key);
    for (const [index, value] of args.entries()) {
      message = message.split(`{${index}}`).join(value);
    }
    ui.setHint(message);
  }

  /* ------------------------------------------------------------ recorrido */

  function collectTextNodes(root: Node): Text[] {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!(node.nodeValue ?? '').trim()) return NodeFilter.FILTER_REJECT;
        if (isSkipped(node.parentElement)) return NodeFilter.FILTER_REJECT;
        // Ya traducido en una pasada anterior: su original está guardado.
        if (textOriginals.has(node as Text)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const nodes: Text[] = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      nodes.push(node as Text);
    }
    return nodes;
  }

  interface AttrTarget {
    element: Element;
    attribute: string;
    value: string;
  }

  function collectAttributes(root: ParentNode): AttrTarget[] {
    const selector = ATTRIBUTES.map((name) => `[${name}]`).join(',');
    const elements = Array.from(root.querySelectorAll(selector));
    if (root instanceof Element && root.matches(selector)) elements.push(root);

    const targets: AttrTarget[] = [];
    for (const element of elements) {
      if (isSkipped(element)) continue;
      const done = attrOriginals.get(element);
      for (const attribute of ATTRIBUTES) {
        if (done?.has(attribute)) continue;
        const value = element.getAttribute(attribute);
        if (!value || !value.trim()) continue;
        targets.push({ element, attribute, value });
      }
    }
    return targets;
  }

  /* ---------------------------------------------------------- traducción */

  async function translate(text: string): Promise<string | null> {
    const cached = cache.get(text);
    if (cached !== undefined) return cached;
    if (!instance) return null;

    try {
      const result = await instance.translate(text);
      cache.set(text, result);
      return result;
    } catch {
      // Un fragmento que falla no puede tumbar la traducción entera: se deja
      // ese texto en el idioma original y se sigue con el resto.
      return null;
    }
  }

  /** Ejecuta `worker` sobre `items` con como mucho CONCURRENCY en vuelo. */
  async function pool<T>(
    items: readonly T[],
    worker: (item: T) => Promise<void>,
  ): Promise<void> {
    let cursor = 0;
    const runners = Array.from(
      { length: Math.min(CONCURRENCY, items.length) },
      async () => {
        while (cursor < items.length) {
          const item = items[cursor]!;
          cursor += 1;
          await worker(item);
        }
      },
    );
    await Promise.all(runners);
  }

  async function translateSubtree(root: Node, forGeneration: number): Promise<void> {
    const nodes = collectTextNodes(root);
    const attributes =
      root instanceof Element || root instanceof DocumentFragment
        ? collectAttributes(root as ParentNode)
        : [];

    await pool(nodes, async (node) => {
      if (forGeneration !== generation) return;
      const original = node.nodeValue ?? '';
      const result = await translate(original.trim());
      if (forGeneration !== generation || result === null) return;
      // El nodo puede haberse desconectado mientras se traducía.
      if (!node.isConnected) return;
      textOriginals.set(node, original);
      /*
       * Se conserva el espacio de alrededor: es el que separa las palabras de
       * los elementos vecinos en línea (`<b>hola</b> mundo`). Se recorta a
       * mano y no con `replace()` porque el texto traducido puede contener
       * `$&` o `$1`, que `replace()` interpretaría como patrones.
       */
      const trimmed = original.trim();
      const start = original.indexOf(trimmed);
      node.nodeValue =
        original.slice(0, start) +
        result +
        original.slice(start + trimmed.length);
    });

    await pool(attributes, async (target) => {
      if (forGeneration !== generation) return;
      const result = await translate(target.value);
      if (forGeneration !== generation || result === null) return;
      if (!target.element.isConnected) return;

      let saved = attrOriginals.get(target.element);
      if (!saved) {
        saved = new Map<string, string>();
        attrOriginals.set(target.element, saved);
      }
      saved.set(target.attribute, target.value);
      target.element.setAttribute(target.attribute, result);
    });
  }

  /* ------------------------------------------------------------ observer */

  function startObserver(): void {
    if (observer || !document.body) return;
    /*
     * Solo `childList`: lo que escribe esta feature son `characterData` y
     * atributos, así que el observer no puede dispararse por su propio trabajo.
     */
    observer = new MutationObserver((records) => {
      const added: Node[] = [];
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
          if (node instanceof Element || node instanceof Text) added.push(node);
        }
      }
      if (added.length === 0) return;

      window.clearTimeout(debounce);
      debounce = window.setTimeout(() => {
        const forGeneration = generation;
        for (const node of added) {
          if (!node.isConnected) continue;
          void translateSubtree(node, forGeneration);
        }
      }, DEBOUNCE_MS);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function stopObserver(): void {
    window.clearTimeout(debounce);
    observer?.disconnect();
    observer = null;
  }

  /* -------------------------------------------------------- restauración */

  function restore(): void {
    generation += 1;
    stopObserver();

    for (const [node, original] of textOriginals) {
      if (node.isConnected) node.nodeValue = original;
    }
    textOriginals.clear();

    for (const [element, attributes] of attrOriginals) {
      if (!element.isConnected) continue;
      for (const [attribute, value] of attributes) {
        element.setAttribute(attribute, value);
      }
    }
    attrOriginals.clear();

    cache.clear();
    instance?.destroy?.();
    instance = null;

    if (originalDocLang !== null) {
      if (originalDocLang === '') document.documentElement.removeAttribute('lang');
      else document.documentElement.lang = originalDocLang;
      originalDocLang = null;
    }

    applied = 'off';
  }

  async function translatePage(
    target: Exclude<TranslateLang, 'off'>,
    ctx: FeatureContext,
  ): Promise<void> {
    restore();
    const forGeneration = generation;

    // El idioma de origen se resuelve igual que el de la lectura por voz: lo
    // que declara el sitio, y el idioma de la UI como último recurso.
    sourceLang =
      baseLang(document.documentElement.lang || '') || baseLang(ctx.config.lang);

    if (sourceLang === target) {
      hint('translate.same');
      applied = target;
      return;
    }

    hint('translate.working');

    /*
     * `create()` va PRIMERO, sin ningún `await` por delante.
     *
     * La API exige un gesto del usuario para bajar el modelo de un idioma que
     * todavía no está en el dispositivo, y la activación que deja el clic dura
     * unos segundos: consultar antes la disponibilidad podía costar justo esa
     * activación. Si hace falta, la disponibilidad se consulta DESPUÉS, que no
     * pide gesto, y sirve para dar el motivo exacto del fallo.
     */
    const created = await create(sourceLang, target, (fraction) => {
      if (forGeneration !== generation) return;
      // El modelo se baja la primera vez que se usa ese par de idiomas. Puede
      // tardar: sin aviso parecería que el widget no hizo nada.
      hint('translate.downloading', String(Math.round(fraction * 100)));
    });

    if (forGeneration !== generation) return;

    if (!created.ok) {
      const key =
        created.reason === 'gesture'
          ? 'translate.gesture'
          : (await availability(sourceLang, target)) === 'unavailable'
            ? 'translate.unavailable'
            : 'translate.error';

      if (forGeneration !== generation) return;
      hint(key);
      announce(ctx.t(key));
      /*
       * El estado vuelve a "sin traducir": el panel no puede quedar marcando
       * un idioma que no se aplicó. Además es lo que hace reintentable el caso
       * del gesto — con el estado en el idioma fallido, volver a elegirlo no
       * sería un cambio de estado y no pasaría nada.
       */
      ctx.setState({ translateLang: 'off' });
      return;
    }

    instance = created.translator;
    originalDocLang = document.documentElement.getAttribute('lang') ?? '';
    applied = target;

    await translateSubtree(document.body, forGeneration);
    if (forGeneration !== generation) return;

    /*
     * El <html lang> pasa al idioma nuevo: es lo que hace que un lector de
     * pantalla cambie de voz (SC 3.1.1 "Language of Page") y, de paso, que la
     * lectura por voz del propio widget lea con la voz correcta — la resuelve
     * leyendo de acá (ver features/tts/index.ts).
     */
    document.documentElement.lang = target;

    hint(null);
    announce(`${ctx.t('translate.label')}: ${languageName(target) ?? target}`);
    startObserver();
  }

  return {
    id: 'translate',

    apply(state: Readonly<WidgetState>, ctx: FeatureContext) {
      ctxRef = ctx;
      if (!isSupported()) return;

      const target = state.translateLang;

      if (target === 'off') {
        if (applied !== 'off') restore();
      } else if (target !== applied) {
        void translatePage(target, ctx);
      }

      ui?.sync(target);
    },

    teardown() {
      restore();
    },

    render(ctx: FeatureContext) {
      ctxRef = ctx;
      // Sin la API del navegador no se ofrece una opción muerta.
      if (!isSupported()) return null;

      ui = createDisclosureUI<TranslateLang>({
        icon: ICON_TRANSLATE,
        label: ctx.t('translate.label'),
        options: [
          { value: 'off', text: ctx.t('translate.off'), wide: true },
          ...LANGUAGES.map((language) => ({
            value: language.code as TranslateLang,
            text: language.name,
          })),
        ],
        summary: (value) =>
          value === 'off' ? ctx.t('translate.off') : languageName(value) ?? value,
        onSelect: (value) => ctx.setState({ translateLang: value }),
      });

      ui.sync(ctx.getState().translateLang);
      return ui.element;
    },
  };
}

export const translateFeature = createTranslateFeature();
