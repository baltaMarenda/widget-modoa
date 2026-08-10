import { readConfig } from './core/config';
import { createTranslator } from './core/i18n';
import { attachHost, createHost, HOST_TAG } from './core/mount';
import { createStore } from './core/state';
import type { Feature, FeatureContext, WidgetState } from './core/types';
import { features } from './features';
import { createWidgetUI } from './ui/widget';

/**
 * IMPORTANTE: `readConfig()` se ejecuta en el top level a propósito.
 * `document.currentScript` solo es válido durante la ejecución síncrona del
 * script; si esperáramos a DOMContentLoaded ya sería null.
 */
const config = readConfig();

/** Una feature rota no puede tumbar a las demás ni al widget entero. */
function safely(feature: Feature, etapa: string, run: () => void): void {
  try {
    run();
  } catch (error) {
    console.error(`[modoa-a11y] Error en "${feature.id}" (${etapa}):`, error);
  }
}

function init(): void {
  if (document.querySelector(HOST_TAG)) {
    console.warn('[modoa-a11y] El widget ya está cargado en esta página.');
    return;
  }

  const store = createStore(config.clientId);
  const { host, shadow } = createHost(config);

  const ctx: FeatureContext = {
    config,
    host,
    shadow,
    getState: () => store.get(),
    setState: (patch) => store.set(patch),
    reset: () => resetAll(),
    t: createTranslator(config.lang),
  };

  function setupAll(): void {
    for (const feature of features) {
      safely(feature, 'setup', () => feature.setup?.(ctx));
    }
  }

  function applyAll(state: Readonly<WidgetState>): void {
    for (const feature of features) {
      safely(feature, 'apply', () => feature.apply(state, ctx));
    }
  }

  function teardownAll(): void {
    for (const feature of features) {
      safely(feature, 'teardown', () => feature.teardown?.(ctx));
    }
  }

  /**
   * Reinicio completo, en este orden por una razón:
   *
   * 1. `teardownAll()` saca del documento host TODO lo que el widget inyectó
   *    —el <svg> de filtros, el <style> de la fuente, el wrapper de escalado—
   *    y corta lo que esté en curso, como una lectura por voz.
   * 2. `setupAll()` deja las features listas para volver a usarse. Ninguna
   *    inyecta nada en el documento host en esta etapa: las que necesitan
   *    nodos los crean bajo demanda al activarse. Por eso después de un reset
   *    el DOM del host queda igual que antes de cargar el widget.
   * 3. `store.reset()` borra localStorage y notifica, lo que dispara
   *    `applyAll()` con los valores por defecto y sincroniza el panel.
   */
  function resetAll(): void {
    teardownAll();
    setupAll();
    store.reset();
  }

  setupAll();
  applyAll(store.get());
  store.subscribe(applyAll);

  const ui = createWidgetUI(ctx);
  attachHost(host);

  // Handle de depuración. No es API pública ni tiene garantías de estabilidad.
  (window as unknown as Record<string, unknown>)['__modoaA11y'] = {
    config,
    store,
    ui,
    reset: resetAll,
  };
}

/**
 * Las features tocan el <body> del host (la estrategia de escalado con
 * transform lo envuelve), así que no arrancamos hasta que exista. El snippet
 * usa `defer`, pero un cliente puede pegarlo en el <head> sin él.
 */
if (document.body) {
  init();
} else {
  document.addEventListener('DOMContentLoaded', init, { once: true });
}
