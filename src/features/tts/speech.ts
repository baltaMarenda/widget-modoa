/** Envoltorio sobre window.speechSynthesis. Nada de DOM acá. */

export type SpeechState = 'idle' | 'speaking';

export interface SpeechController {
  readonly supported: boolean;
  speak(text: string, lang: string): void;
  cancel(): void;
  getState(): SpeechState;
  subscribe(listener: (state: SpeechState) => void): () => void;
}

/**
 * getVoices() devuelve [] en la primera llamada en varios navegadores: la lista
 * se puebla async y avisa por 'voiceschanged'. Cacheamos y nos resuscribimos.
 */
function createVoiceRegistry(synth: SpeechSynthesis) {
  let voices: SpeechSynthesisVoice[] = [];

  const refresh = (): void => {
    const list = synth.getVoices();
    if (list.length > 0) voices = list;
  };

  refresh();
  // 'voiceschanged' puede dispararse más de una vez (p. ej. al instalar voces).
  synth.addEventListener('voiceschanged', refresh);

  return {
    /**
     * Busca la mejor voz para el idioma pedido. Devuelve null si no hay
     * ninguna: en ese caso NO se asigna voz y el navegador usa la suya por
     * defecto, que es preferible a no leer nada.
     */
    pick(lang: string): SpeechSynthesisVoice | null {
      if (voices.length === 0) refresh();
      if (voices.length === 0) return null;

      const wanted = lang.toLowerCase().replace('_', '-');
      const primary = wanted.split('-')[0] ?? wanted;

      // 1. Coincidencia exacta (es-AR con es-AR).
      const exact = voices.find((v) => v.lang.toLowerCase().replace('_', '-') === wanted);
      if (exact) return exact;

      // 2. Misma lengua, otra región (es-AR se conforma con es-ES).
      const sameLanguage = voices.find(
        (v) => (v.lang.toLowerCase().split(/[-_]/)[0] ?? '') === primary,
      );
      return sameLanguage ?? null;
    },
  };
}

export function createSpeechController(): SpeechController {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;

  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
    return {
      supported: false,
      speak: () => {},
      cancel: () => {},
      getState: () => 'idle',
      subscribe: () => () => {},
    };
  }

  const voiceRegistry = createVoiceRegistry(synth);
  const listeners = new Set<(state: SpeechState) => void>();
  let state: SpeechState = 'idle';
  /** Referencia a la utterance en curso para ignorar eventos de las viejas. */
  let current: SpeechSynthesisUtterance | null = null;

  function setState(next: SpeechState): void {
    if (state === next) return;
    state = next;
    for (const listener of listeners) listener(state);
  }

  return {
    supported: true,

    speak(text, lang) {
      const clean = text.trim();
      if (!clean) return;

      // Siempre cancelar antes de hablar. Es lo que evita que se acumulen
      // utterances en la cola cuando el usuario selecciona varias veces
      // seguidas: speak() encola, no reemplaza.
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = lang;
      const voice = voiceRegistry.pick(lang);
      // Sin voz para ese idioma, se deja sin asignar: el navegador elige.
      if (voice) utterance.voice = voice;

      const finish = (): void => {
        if (current !== utterance) return; // evento de una utterance vieja
        current = null;
        setState('idle');
      };

      utterance.addEventListener('start', () => {
        if (current === utterance) setState('speaking');
      });
      utterance.addEventListener('end', finish);
      // 'error' incluye el caso 'canceled'/'interrupted' de un cancel().
      utterance.addEventListener('error', finish);

      current = utterance;
      // Optimista: algunos navegadores tardan en disparar 'start' y el botón
      // quedaría diciendo "Leer" mientras ya está leyendo.
      setState('speaking');
      synth.speak(utterance);
    },

    cancel() {
      current = null;
      synth.cancel();
      setState('idle');
    },

    getState: () => state,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
