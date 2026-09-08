import { announce } from './announcer';
import { ICON_CHEVRON } from './icons';

/**
 * Desplegable: una cabecera que pliega y despliega una lista de opciones.
 *
 * Es el tercer patrón de UI del panel, además del grupo con todas las opciones
 * a la vista y del control cíclico (`ui/cycle.ts`). Existe para las listas que
 * son demasiado largas para tenerlas siempre desplegadas —los seis perfiles de
 * accesibilidad, los doce idiomas de traducción— y demasiado largas para un
 * ciclo, que tiene un máximo de cuatro estados porque hay que pasar por todos.
 *
 * Lo que cuesta en accesibilidad, y cómo se paga:
 *
 * - Las opciones no están en el árbol hasta que alguien abre. Se compensa con
 *   `aria-expanded` en la cabecera (el lector anuncia "contraído"/"expandido")
 *   y con el valor actual escrito en la propia cabecera, para que no haga falta
 *   abrir solo para saber qué está puesto.
 * - Escape adentro del desplegable cierra el desplegable y no el panel entero:
 *   cerrar todo de un saque obligaría a volver a abrir el menú y a navegar de
 *   nuevo hasta acá.
 *
 * El estado abierto/cerrado vive en memoria y NO se persiste: es una
 * conveniencia de la sesión, no una preferencia de accesibilidad.
 */

export interface DisclosureOption<T extends string> {
  value: T;
  /** Texto visible del botón. */
  text: string;
  /** Ocupa las dos columnas de la grilla interna. */
  wide?: boolean;
}

export interface DisclosureOptions<T extends string> {
  /** Markup del ícono (de ui/icons.ts). */
  icon: string;
  /** Nombre visible de la feature. */
  label: string;
  options: readonly DisclosureOption<T>[];
  /** Resumen del valor actual, para la cabecera. */
  summary: (value: T) => string;
  onSelect: (value: T) => void;
}

export interface DisclosureUI<T extends string> {
  element: HTMLElement;
  /** Refleja el estado en la cabecera y en las opciones. Idempotente. */
  sync(value: T): void;
  /** Línea de estado bajo las opciones. `null` la esconde. */
  setHint(text: string | null): void;
}

/** Los ids tienen que ser únicos dentro del shadow: hay dos desplegables. */
let instances = 0;

export function createDisclosureUI<T extends string>(
  options: DisclosureOptions<T>,
): DisclosureUI<T> {
  const { icon, label, options: items, summary, onSelect } = options;
  const id = `modoa-disclosure-${(instances += 1)}`;
  const labelId = `${id}-label`;
  const panelId = `${id}-panel`;

  const group = document.createElement('div');
  group.className = 'feat feat--disclosure';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-labelledby', labelId);

  // ------------------------------------------------------------- cabecera
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'feat__toggle';
  toggle.setAttribute('role', 'menuitem');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', panelId);

  const iconSlot = document.createElement('span');
  iconSlot.className = 'opt__icon';
  iconSlot.setAttribute('aria-hidden', 'true');
  iconSlot.innerHTML = icon;

  const text = document.createElement('span');
  text.className = 'feat__toggle-text';

  const name = document.createElement('span');
  name.className = 'opt__name';
  name.id = labelId;
  name.textContent = label;

  const value = document.createElement('span');
  value.className = 'opt__value';

  text.append(name, value);

  const chevron = document.createElement('span');
  chevron.className = 'feat__chevron';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.innerHTML = ICON_CHEVRON;

  toggle.append(iconSlot, text, chevron);

  // ------------------------------------------------------------- opciones
  const panel = document.createElement('div');
  panel.className = 'feat__panel';
  panel.id = panelId;
  panel.hidden = true;

  const list = document.createElement('div');
  list.className = 'feat__options feat__options--grid';

  const buttons = items.map((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = item.wide ? 'opt opt--wide' : 'opt';
    button.setAttribute('role', 'menuitemradio');
    button.setAttribute('aria-checked', 'false');
    button.setAttribute('aria-label', `${label}: ${item.text}`);
    button.textContent = item.text;
    button.addEventListener('click', () => {
      onSelect(item.value);
      announce(`${label}: ${item.text}`);
    });
    return button;
  });

  const hint = document.createElement('p');
  hint.className = 'feat__hint';
  hint.hidden = true;

  list.append(...buttons);
  panel.append(list, hint);
  group.append(toggle, panel);

  function setExpanded(open: boolean): void {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  }

  toggle.addEventListener('click', () => {
    setExpanded(panel.hidden);
  });

  // Escape cierra el desplegable, no el panel: por eso se corta la propagación
  // antes de que llegue al handler de `ui/widget.ts`.
  group.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || panel.hidden) return;
    event.preventDefault();
    event.stopPropagation();
    setExpanded(false);
    toggle.focus();
  });

  return {
    element: group,

    sync(current) {
      value.textContent = summary(current);
      for (const [index, button] of buttons.entries()) {
        button.setAttribute(
          'aria-checked',
          String(items[index]!.value === current),
        );
      }
      // El nombre accesible de la cabecera lleva el valor actual: así no hay
      // que desplegar la lista solo para saber qué está seleccionado.
      toggle.setAttribute('aria-label', `${label}: ${summary(current)}`);
    },

    setHint(message) {
      hint.textContent = message ?? '';
      hint.hidden = message === null;
    },
  };
}
