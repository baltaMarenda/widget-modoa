import type { FeatureContext } from '../core/types';
import { announce } from './announcer';

/**
 * Control cíclico: UN botón que rota entre sus estados en cada pulsación.
 *
 * Es un patrón distinto al de los grupos de opciones del resto del panel
 * (`role="menuitemradio"`), donde todos los estados están a la vista. Acá el
 * botón ocupa media columna y muestra solo el estado actual, que es lo que
 * permite meter seis controles más sin que el panel se vuelva una lista
 * interminable.
 *
 * Lo que ese ahorro cuesta en accesibilidad, y cómo se paga:
 *
 * - No se puede saltar directo a un estado: hay que pasar por los del medio.
 *   Se acota teniendo pocos estados (cuatro como máximo, contando el apagado)
 *   y cerrando siempre el ciclo en "apagado", así nunca hay que dar la vuelta
 *   entera para desactivar.
 * - El nombre accesible del botón cambia al presionarlo y el lector de
 *   pantalla no lo relee solo. Por eso cada cambio pasa por la región viva
 *   (ver ui/announcer.ts).
 *
 * Se devuelve el `<button>` pelado, sin envoltorio: el panel es un
 * `role="menu"` y un `role="menuitem"` tiene que ser hijo directo de él. Un
 * `<div>` sin rol en el medio rompe esa relación en el árbol de accesibilidad.
 */
export interface CycleUI<T extends string> {
  element: HTMLButtonElement;
  /** Refleja el estado en el botón. Idempotente; la llama `apply`. */
  sync(value: T): void;
}

export interface CycleOptions<T extends string> {
  /** Markup del ícono (de ui/icons.ts). */
  icon: string;
  /** Nombre visible de la feature. */
  label: string;
  /**
   * Estados en el orden en que rota el botón. `steps[0]` es el estado apagado:
   * de él sale el ciclo y a él vuelve.
   */
  steps: readonly T[];
  /** Texto visible del estado. */
  text: (value: T) => string;
  onChange: (value: T) => void;
}

export function createCycleUI<T extends string>(
  ctx: FeatureContext,
  options: CycleOptions<T>,
): CycleUI<T> {
  const { icon, label, steps, text, onChange } = options;
  const off = steps[0]!;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'opt opt--cycle';
  button.setAttribute('role', 'menuitem');

  const iconSlot = document.createElement('span');
  iconSlot.className = 'opt__icon';
  iconSlot.setAttribute('aria-hidden', 'true');
  iconSlot.innerHTML = icon;

  const name = document.createElement('span');
  name.className = 'opt__name';
  name.textContent = label;

  const value = document.createElement('span');
  value.className = 'opt__value';

  button.append(iconSlot, name, value);

  function paint(current: T): void {
    const valueText = text(current);
    value.textContent = valueText;
    // El estado no se codifica solo con color: el texto de abajo dice siempre
    // en qué estado está. WCAG 2.1 SC 1.4.1 "Use of Color".
    button.setAttribute('data-active', String(current !== off));
    button.setAttribute(
      'aria-label',
      `${label}: ${valueText}. ${ctx.t('cycle.hint')}`,
    );
  }

  button.addEventListener('click', () => {
    // Un valor que no está en `steps` (dataset pisado desde afuera) se trata
    // como "antes del principio": el ciclo arranca por el primer estado real.
    const current = steps.indexOf(button.dataset['value'] as T);
    const next = steps[current < 0 ? 1 % steps.length : (current + 1) % steps.length]!;
    button.dataset['value'] = next;
    onChange(next);
    announce(`${label}: ${text(next)}`);
  });

  return {
    element: button,
    sync(current) {
      // El índice del ciclo se lee del dataset y no de una variable capturada
      // para que un cambio de estado que venga de otro lado —un reset, otra
      // pestaña— deje el botón en el punto correcto del ciclo.
      button.dataset['value'] = current;
      paint(current);
    },
  };
}
