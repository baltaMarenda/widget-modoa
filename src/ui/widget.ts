import type { FeatureContext } from '../core/types';
import { features } from '../features';
import { createFocusTrap } from './focus-trap';
import { ICON_CLOSE } from './icons';
import { LOGO_MODOA } from './logo';

const PANEL_ID = 'modoa-panel';
const TITLE_ID = 'modoa-panel-title';

export interface WidgetUI {
  open(): void;
  close(): void;
  toggle(): void;
  destroy(): void;
}

export function createWidgetUI(ctx: FeatureContext): WidgetUI {
  const { shadow, t } = ctx;

  const root = document.createElement('div');
  root.className = 'root';

  // ------------------------------------------------------------------ panel
  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.id = PANEL_ID;
  panel.tabIndex = -1;
  panel.hidden = true;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const head = document.createElement('div');
  head.className = 'panel__head';

  const title = document.createElement('h2');
  title.className = 'panel__title';
  title.id = TITLE_ID;
  title.textContent = t('menu.title');

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'panel__close';
  closeBtn.setAttribute('aria-label', t('menu.close'));
  closeBtn.innerHTML = ICON_CLOSE;

  head.append(title, closeBtn);

  const body = document.createElement('div');
  body.className = 'panel__body';
  body.setAttribute('role', 'menu');
  body.setAttribute('aria-label', t('menu.label'));

  // Cada feature aporta su propio bloque de UI. Mientras no haya ninguna
  // registrada, mostramos el placeholder.
  const rendered = features
    .map((feature) => feature.render?.(ctx))
    .filter((el): el is HTMLElement => el instanceof HTMLElement);

  if (rendered.length > 0) {
    body.append(...rendered);
  } else {
    const empty = document.createElement('p');
    empty.className = 'panel__empty';
    empty.setAttribute('role', 'none');
    empty.textContent = t('menu.empty');
    body.appendChild(empty);
  }

  panel.append(head, body);

  // -------------------------------------------------------------------- fab
  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'fab';
  fab.setAttribute('aria-label', t('button.label'));
  fab.setAttribute('aria-expanded', 'false');
  fab.setAttribute('aria-haspopup', 'true');
  fab.setAttribute('aria-controls', PANEL_ID);
  fab.innerHTML = LOGO_MODOA;

  root.append(panel, fab);
  shadow.appendChild(root);

  // ----------------------------------------------------------- interacción
  const trap = createFocusTrap(panel);
  let isOpen = false;

  function onDocumentPointerDown(event: Event): void {
    // composedPath atraviesa el Shadow DOM: si el widget está en el camino,
    // el click fue nuestro.
    if (event.composedPath().includes(root)) return;
    close();
  }

  function onRootKeydown(event: KeyboardEvent): void {
    if (!isOpen || event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    close();
    fab.focus();
  }

  function open(): void {
    if (isOpen) return;
    isOpen = true;
    panel.hidden = false;
    fab.setAttribute('aria-expanded', 'true');
    fab.setAttribute('aria-label', t('button.labelClose'));
    trap.activate();
    // El panel recibe el foco: el lector de pantalla anuncia el título y a
    // partir de ahí Tab recorre solo las opciones.
    panel.focus();
    document.addEventListener('pointerdown', onDocumentPointerDown, true);
  }

  function close(): void {
    if (!isOpen) return;
    isOpen = false;
    panel.hidden = true;
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-label', t('button.label'));
    trap.deactivate();
    document.removeEventListener('pointerdown', onDocumentPointerDown, true);
  }

  function toggle(): void {
    if (isOpen) {
      close();
      fab.focus();
    } else {
      open();
    }
  }

  fab.addEventListener('click', toggle);
  closeBtn.addEventListener('click', () => {
    close();
    fab.focus();
  });
  root.addEventListener('keydown', onRootKeydown);

  return {
    open,
    close,
    toggle,
    destroy() {
      close();
      root.removeEventListener('keydown', onRootKeydown);
      root.remove();
    },
  };
}
