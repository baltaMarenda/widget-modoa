import { ICON_SPEAK, ICON_STOP } from '../../ui/icons';

const MARGIN = 8;

export interface Bubble {
  readonly element: HTMLButtonElement;
  show(rect: DOMRect): void;
  hide(): void;
  isVisible(): boolean;
  /** Reubica sin cambiar visibilidad. Para scroll y resize. */
  reposition(rect: DOMRect): void;
  setSpeaking(speaking: boolean): void;
}

export interface BubbleLabels {
  read: string;
  readAria: string;
  stop: string;
  stopAria: string;
}

/**
 * El botón contextual "Leer".
 *
 * Vive en el MISMO Shadow DOM que el panel, como hermano de `.root`. El host
 * del widget es `position: fixed; inset: 0`, así que su origen coincide con el
 * del viewport: las coordenadas de getBoundingClientRect() se usan tal cual en
 * un `position: absolute`, sin conversiones ni compensación de scroll.
 */
export function createBubble(
  shadow: ShadowRoot,
  labels: BubbleLabels,
  onActivate: () => void,
): Bubble {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tts-bubble';
  button.hidden = true;
  button.tabIndex = 0;

  const icon = document.createElement('span');
  icon.className = 'tts-bubble__icon';
  icon.setAttribute('aria-hidden', 'true');

  const text = document.createElement('span');
  text.className = 'tts-bubble__text';

  button.append(icon, text);

  // Sin esto, el mousedown sobre el botón colapsa la selección del documento
  // y para cuando llega el click ya no hay texto que leer.
  button.addEventListener('mousedown', (event) => event.preventDefault());
  button.addEventListener('click', onActivate);

  shadow.appendChild(button);

  function setSpeaking(speaking: boolean): void {
    icon.innerHTML = speaking ? ICON_STOP : ICON_SPEAK;
    text.textContent = speaking ? labels.stop : labels.read;
    button.setAttribute(
      'aria-label',
      speaking ? labels.stopAria : labels.readAria,
    );
  }

  /** Debajo de la selección; arriba si no entra. Siempre dentro del viewport. */
  function place(rect: DOMRect): void {
    const width = button.offsetWidth;
    const height = button.offsetHeight;

    let top = rect.bottom + MARGIN;
    if (top + height + MARGIN > window.innerHeight) {
      top = rect.top - height - MARGIN;
    }
    top = Math.max(MARGIN, Math.min(top, window.innerHeight - height - MARGIN));

    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - width - MARGIN));

    button.style.left = `${Math.round(left)}px`;
    button.style.top = `${Math.round(top)}px`;
  }

  setSpeaking(false);

  return {
    element: button,
    show(rect) {
      // Se muestra primero para poder medirlo, después se posiciona.
      button.hidden = false;
      place(rect);
    },
    hide() {
      button.hidden = true;
    },
    isVisible: () => !button.hidden,
    reposition(rect) {
      if (!button.hidden) place(rect);
    },
    setSpeaking,
  };
}
