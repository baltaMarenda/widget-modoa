import type { WidgetConfig } from './types';
import styles from '../ui/styles.css?inline';

export const HOST_TAG = 'modoa-a11y-widget';

/**
 * Crea el elemento host y su Shadow DOM.
 *
 * El posicionamiento va en estilos inline con `!important`: es la única
 * declaración que gana contra cualquier CSS del sitio host, incluido su propio
 * `!important`. Todo lo demás vive dentro del shadow, aislado.
 */
export function createHost(config: WidgetConfig): {
  host: HTMLElement;
  shadow: ShadowRoot;
} {
  const host = document.createElement(HOST_TAG);
  host.setAttribute('data-position', config.position);
  host.setAttribute('lang', config.lang);

  const inline: Record<string, string> = {
    position: 'fixed',
    inset: '0',
    margin: '0',
    padding: '0',
    border: '0',
    // Por encima de cualquier overlay razonable del sitio host.
    'z-index': '2147483000',
    // El host no captura clicks: solo lo hacen el botón y el panel.
    'pointer-events': 'none',
    // Aísla del contexto de apilamiento y del layout del host.
    contain: 'layout style',
    visibility: 'visible',
    display: 'block',
    opacity: '1',
    transform: 'none',
    filter: 'none',
  };
  for (const [prop, value] of Object.entries(inline)) {
    host.style.setProperty(prop, value, 'important');
  }

  const shadow = host.attachShadow({ mode: 'open' });

  const sheet = document.createElement('style');
  sheet.textContent = styles;
  shadow.appendChild(sheet);

  return { host, shadow };
}

/**
 * Inserta el host como hijo de <html>, deliberadamente FUERA del <body>.
 *
 * La feature de daltonización aplica `filter` al <body>. `filter` no se hereda:
 * pinta todo el subárbol y ningún descendiente puede excluirse. Con el widget
 * adentro del body, el menú quedaría filtrado junto con el sitio.
 *
 * Efecto colateral bienvenido: sobrevive a los sitios que hacen
 * `document.body.innerHTML = ...`.
 */
export function attachHost(host: HTMLElement): void {
  document.documentElement.appendChild(host);
}
