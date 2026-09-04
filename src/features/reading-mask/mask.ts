/**
 * La máscara de lectura: dos paneles oscuros que dejan una banda clara a la
 * altura del cursor.
 *
 * Vive en el MISMO Shadow DOM que el panel, como hermano de `.root` —igual que
 * la burbuja de lectura por voz. El host del widget es
 * `position: fixed; inset: 0`, así que su origen coincide con el del viewport:
 * las coordenadas de `clientY` se usan tal cual en un `position: absolute`, sin
 * conversiones ni compensación de scroll.
 *
 * Que esté en el shadow y no en el documento host tiene dos consecuencias
 * buenas: el sitio no puede pisar sus estilos, y la máscara no se ve afectada
 * por los filtros que el widget aplica al <body> (invertido, daltonización).
 */

/**
 * Alto de la banda: proporción del viewport, acotada a un rango usable.
 *
 * La banda tiene que dar para unos pocos renglones y no mucho más. Si abarca
 * medio viewport deja de aislar nada: la vista se vuelve a dispersar dentro de
 * la propia banda y la feature no hace su trabajo. El 12 % son ~115 px en una
 * pantalla de escritorio, unas cuatro líneas de texto corrido.
 *
 * El techo importa tanto como la proporción: en un monitor alto el 12 % se
 * dispararía, así que queda clavado en 128 px. El piso cubre el caso opuesto —
 * un viewport bajo o una ventana a media altura— donde una banda proporcional
 * sería más angosta que un renglón.
 */
const BAND_RATIO = 0.12;
const BAND_MIN = 64;
const BAND_MAX = 128;

export interface ReadingMask {
  enable(): void;
  disable(): void;
  /** Saca los nodos del shadow. Para el teardown. */
  destroy(): void;
}

export function createReadingMask(
  shadow: ShadowRoot,
  host: HTMLElement,
): ReadingMask {
  let top: HTMLElement | null = null;
  let bottom: HTMLElement | null = null;
  let enabled = false;
  let frame = 0;

  /** Última altura conocida del foco de lectura, en coordenadas de viewport. */
  let centerY = -1;

  function bandHeight(): number {
    const ideal = window.innerHeight * BAND_RATIO;
    return Math.min(
      Math.max(Math.min(ideal, BAND_MAX), BAND_MIN),
      window.innerHeight,
    );
  }

  function place(): void {
    if (!top || !bottom) return;

    const height = bandHeight();
    // Primera pintada sin que nadie haya movido el cursor: la banda arranca al
    // medio de la pantalla, que es donde la vista ya está.
    if (centerY < 0) centerY = window.innerHeight / 2;

    const limit = Math.max(0, window.innerHeight - height);
    const start = Math.min(Math.max(centerY - height / 2, 0), limit);

    top.style.height = `${Math.round(start)}px`;
    bottom.style.top = `${Math.round(start + height)}px`;
  }

  /**
   * `pointermove` dispara decenas de veces por segundo. Sin esto, cada
   * movimiento del mouse escribiría estilos y forzaría un repintado; agrupando
   * en un frame, se pinta como mucho una vez por refresco de pantalla.
   */
  function schedule(): void {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      place();
    });
  }

  function onPointerMove(event: PointerEvent): void {
    centerY = event.clientY;
    schedule();
  }

  /**
   * La banda también sigue al foco del teclado.
   *
   * Sin esto la feature sería inservible sin mouse: quien navega con Tab
   * dejaría la banda clavada donde quedó el cursor mientras el foco se mueve
   * por debajo de la parte oscurecida — justo lo contrario de lo que se busca.
   *
   * Se ignora el foco que entra al propio widget: los eventos que salen del
   * Shadow DOM se re-apuntan al elemento host, que ocupa el viewport entero, y
   * su centro mandaría la banda al medio de la pantalla cada vez que se abre
   * el panel.
   */
  function onFocusIn(event: FocusEvent): void {
    const target = event.target;
    if (target === host || !(target instanceof Element)) return;

    const rect = target.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    // Un elemento más alto que la banda se sigue por su borde superior: es
    // donde empieza su texto.
    centerY = rect.top + Math.min(rect.height, bandHeight()) / 2;
    schedule();
  }

  function onResize(): void {
    schedule();
  }

  function ensureElements(): void {
    if (top && bottom) return;

    top = document.createElement('div');
    top.className = 'mask mask--top';

    bottom = document.createElement('div');
    bottom.className = 'mask mask--bottom';

    // Decorativas: no aportan contenido y no deben aparecer en el árbol de
    // accesibilidad ni interceptar clicks (el CSS les pone pointer-events:none).
    for (const element of [top, bottom]) {
      element.setAttribute('aria-hidden', 'true');
      shadow.appendChild(element);
    }
  }

  function enable(): void {
    if (enabled) return;
    enabled = true;

    ensureElements();
    place();

    document.addEventListener('pointermove', onPointerMove, { passive: true });
    // En captura: un sitio que frena la propagación del foco en su propio
    // contenedor no debe dejar la banda desincronizada.
    document.addEventListener('focusin', onFocusIn, true);
    window.addEventListener('resize', onResize, { passive: true });
  }

  function disable(): void {
    if (!enabled) return;
    enabled = false;

    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('focusin', onFocusIn, true);
    window.removeEventListener('resize', onResize);

    if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }

    top?.remove();
    bottom?.remove();
    top = null;
    bottom = null;
  }

  return {
    enable,
    disable,
    destroy() {
      disable();
      // La próxima activación vuelve a arrancar centrada, no donde había
      // quedado el cursor en una sesión anterior.
      centerY = -1;
    },
  };
}
