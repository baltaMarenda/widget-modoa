/**
 * Envoltorio de la API de traducción del navegador.
 *
 * Es el único módulo que conoce la API: si mañana cambia de forma o aparece
 * otra, se toca acá y la feature no se entera.
 *
 * Por qué esta API y no un servicio de traducción: el modelo corre EN EL
 * DISPOSITIVO. El contenido de la página del cliente no sale hacia ningún
 * servidor, el widget no hace ni una petición de red (regla 4 del README) y no
 * hay una clave de API que administrar por sitio. El costo es la
 * disponibilidad: hoy existe en Chromium 138+ y en ningún otro motor, así que
 * la feature se esconde donde no está — el mismo criterio que ya usa la lectura
 * por voz cuando no hay `speechSynthesis`.
 *
 * https://developer.chrome.com/docs/ai/translator-api
 */

export type Availability =
  | 'unavailable'
  | 'downloadable'
  | 'downloading'
  | 'available';

interface DownloadMonitor {
  addEventListener(
    type: 'downloadprogress',
    listener: (event: { loaded: number }) => void,
  ): void;
}

interface TranslatorInstance {
  translate(input: string): Promise<string>;
  destroy?(): void;
}

interface CreateOptions {
  sourceLanguage: string;
  targetLanguage: string;
  monitor?: (monitor: DownloadMonitor) => void;
}

interface TranslatorApi {
  availability(options: {
    sourceLanguage: string;
    targetLanguage: string;
  }): Promise<Availability>;
  create(options: CreateOptions): Promise<TranslatorInstance>;
}

function api(): TranslatorApi | null {
  const candidate = (globalThis as unknown as Record<string, unknown>)[
    'Translator'
  ];
  // `Translator` es una CLASE con métodos estáticos, así que su typeof es
  // 'function' y no 'object'. Se aceptan los dos por si alguna versión la
  // expone como espacio de nombres, y en los dos casos manda la comprobación
  // de que estén los dos métodos que se usan.
  if (
    !candidate ||
    (typeof candidate !== 'object' && typeof candidate !== 'function')
  ) {
    return null;
  }
  const translator = candidate as Partial<TranslatorApi>;
  return typeof translator.availability === 'function' &&
    typeof translator.create === 'function'
    ? (translator as TranslatorApi)
    : null;
}

export function isSupported(): boolean {
  return api() !== null;
}

export async function availability(
  source: string,
  target: string,
): Promise<Availability> {
  const translator = api();
  if (!translator) return 'unavailable';
  try {
    return await translator.availability({
      sourceLanguage: source,
      targetLanguage: target,
    });
  } catch {
    // Un par de idiomas mal formado hace lanzar a la API en lugar de devolver
    // 'unavailable'. Para quien llama es lo mismo.
    return 'unavailable';
  }
}

/**
 * Resultado de `create()`. Se devuelve un resultado y no se deja escapar la
 * excepción porque el motivo del fallo cambia lo que hay que decirle a la
 * persona, y `gesture` en particular tiene arreglo desde el panel.
 */
export type CreateResult =
  | { ok: true; translator: TranslatorInstance }
  | { ok: false; reason: 'unsupported' | 'gesture' | 'failed' };

export async function create(
  source: string,
  target: string,
  onProgress?: (fraction: number) => void,
): Promise<CreateResult> {
  const translator = api();
  if (!translator) return { ok: false, reason: 'unsupported' };

  try {
    const instance = await translator.create({
      sourceLanguage: source,
      targetLanguage: target,
      monitor: onProgress
        ? (monitor) => {
            monitor.addEventListener('downloadprogress', (event) => {
              onProgress(event.loaded);
            });
          }
        : undefined,
    });
    return { ok: true, translator: instance };
  } catch (error) {
    /*
     * La API EXIGE un gesto del usuario cuando el modelo del idioma todavía no
     * está descargado: bajar cientos de megabytes no puede dispararse solo.
     *
     * Por eso `create()` es lo PRIMERO que se llama al elegir un idioma, sin
     * ningún `await` por delante: la activación transitoria que deja el clic
     * dura unos segundos y cualquier ida y vuelta previa se la puede comer.
     * Si igual llega acá, la feature vuelve el control a "sin traducir" para
     * que volver a elegir el idioma sea un gesto nuevo y válido.
     */
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      return { ok: false, reason: 'gesture' };
    }
    console.warn('[modoa-a11y] No se pudo crear el traductor.', error);
    return { ok: false, reason: 'failed' };
  }
}

export type { TranslatorInstance };
