# Widget de accesibilidad — Modoa

Widget de accesibilidad web embebible y standalone. Se instala con una línea de
código en cualquier sitio, sin dependencias, sin backend y sin tocar el CSS ni el
JS del sitio anfitrión.

- **Un solo archivo JS** `dist/widget.js` (IIFE, auto-ejecutable, **27.9 kB /
  9.6 kB gzip**). La fuente para dislexia es el único asset aparte, y baja
  únicamente si el usuario prende esa opción.
- **Cero dependencias en runtime.** Nada de React, Vue ni librerías de UI.
- **Aislado en Shadow DOM.** Los estilos del sitio no afectan al widget, ni los
  del widget al sitio.
- **Accesible por teclado.** Focus trap, Escape, roles ARIA y foco visible.

---

## Instalación (para clientes)

Pegá esta línea antes del cierre de `</body>` (o en el `<head>`, da igual: usa
`defer`):

```html
<script
  src="https://cdn.tu-dominio.com/widget.js"
  data-client-id="acme-sa"
  defer></script>
```

Eso es todo. Al cargar la página aparece un botón flotante en la esquina
inferior derecha.

**Al publicar, subí los dos archivos de `dist/` a la misma ruta**: además de
`widget.js` va el `.woff2` de la fuente para dislexia, que el widget resuelve
solo a partir de dónde esté el script. Ver
[requisito de despliegue](#️-requisito-de-despliegue).

### Opciones de configuración

Todo se configura con atributos `data-*` en el propio `<script>`.

| Atributo              | Requerido | Valores                                                | Por defecto    |
| --------------------- | --------- | ------------------------------------------------------ | -------------- |
| `data-client-id`      | Sí        | Identificador del cliente (texto libre)                | `default`      |
| `data-lang`           | No        | `es`, `en`                                             | `es`           |
| `data-position`       | No        | `bottom-right`, `bottom-left`, `top-right`, `top-left` | `bottom-right` |
| `data-scale-strategy` | No        | `font-size`, `transform`                               | `font-size`    |
| `data-speech-lang`    | No        | Cualquier BCP-47 (`es-AR`, `pt-BR`, …)                 | `<html lang>`  |
| `data-asset-base`     | No        | URL de la carpeta con los assets                       | ruta del `src` |

`data-client-id` define el namespace de las preferencias en `localStorage`
(clave `modoa-a11y:<client-id>`). Si dos sitios distintos comparten dominio,
usar client-ids distintos evita que se pisen las preferencias.

> La configuración remota por cliente (colores, features habilitadas, logo)
> queda para fase 2. Por ahora todo vive en los atributos `data-*`.

---

## Features

| Feature                     | Alcance          | Estado     |
| --------------------------- | ---------------- | ---------- |
| Botón flotante + menú       | Shadow DOM       | ✅ Listo   |
| Aumento de tamaño de página | Documento host   | ✅ Listo   |
| Daltonización (Machado)     | Documento host   | ✅ Listo   |
| Lectura por voz (TTS)       | Selección        | ✅ Listo   |
| Fuente para dislexia        | Documento host   | ✅ Listo   |
| Reset de preferencias       | —                | ✅ Listo   |

---

## Reset

“Restablecer todo” hace un reinicio completo, no solo un apagado visual.
`ctx.reset()` corre tres pasos, en este orden:

1. **`teardownAll()`** — saca del documento host todo lo que el widget inyectó
   (el `<svg>` de filtros, el `<style>` de la fuente, el wrapper de escalado),
   da de baja la `FontFace` registrada, invalida cualquier descarga en vuelo y
   cancela la lectura por voz en curso.
2. **`setupAll()`** — deja las features listas para volver a usarse. Ninguna
   inyecta nada en el documento host en esta etapa.
3. **`store.reset()`** — borra la entrada de localStorage y notifica, lo que
   dispara `applyAll()` con los valores por defecto y sincroniza el panel.

La orquestación vive en `main.ts`, que es quien tiene el registro de features y
el store; el bloque `reset/` solo dibuja el botón y llama a `ctx.reset()`.

### Lo que hizo falta cambiar para que el reset sea reversible

Un `teardown()` que borra nodos deja rota la reactivación si esos nodos se
crean en `setup()`. Dos features pasaron a **inyección diferida**: crean sus
nodos en `apply()`, la primera vez que hacen falta.

- **Daltonización**: el `<svg>` de filtros se inyecta al elegir un filtro. Si
  se creara en `setup()`, después de un reset el `filter: url(#id)` apuntaría a
  un nodo inexistente.
- **Fuente para dislexia**: ya era diferida por peso; ahora además el
  `teardown()` la da de baja de `document.fonts` y resetea la promesa de
  descarga, con un contador de generación para que una descarga que llegue
  tarde no registre la fuente después del reset.

Beneficio colateral: un sitio donde nadie usa esas features nunca recibe esos
nodos en su DOM.

### Verificación

Con las cuatro features activas a la vez (150 % con estrategia `transform` +
deuteranopía + fuente dislexia + una lectura por voz sonando), se aprieta
reset y se compara el DOM del host campo por campo contra una firma tomada
antes de activar nada: **cero diferencias**.

| | Activado | Tras reset |
| --- | --- | --- |
| Secciones / párrafos / ítems | 10 / 21 / 20 | 10 / 21 / 20 |
| `#modoa-colorblind-filters` | 1 (con 4 `<filter>`) | 0 |
| `#modoa-scale-wrapper` | 1 | 0 |
| `#modoa-dyslexia-style` | 1 | 0 |
| `FontFace` registradas | 1 | 0 |
| Atributos en `<html>` | `lang`, `data-modoa-dyslexia` | `lang` |
| Atributos en `<body>` | `data-modoa-colorblind`, `data-modoa-scale`, `style` | ninguno |
| `speechSynthesis` | hablando | detenido |
| localStorage | con datos | `null` |
| Opciones marcadas en el panel | 3, 1, 2, 1 | 0, 0, 0, 0 |

El atributo `style` vacío que quedaba en el `<body>` era residuo real:
`style.removeProperty()` deja un `style=""` colgado. Lo limpia
`removeInlineProperty()` en `core/dom.ts`.

**Ciclo completo sin degradación:** tras 3 activaciones y 2 resets sigue
habiendo exactamente 1 `<svg>` de filtros con 4 IDs únicos, 1 wrapper, 1
`<style>`, 1 `FontFace`, 1 burbuja de TTS y 1 panel. El atajo Alt + L sigue
arrancando y sosteniendo la lectura — con un `keydown` duplicado haría
speak→cancel y quedaría en silencio.

---

## Fuente para dislexia

Toggle on/off. Aplica OpenDyslexic Regular al documento host junto con los
ajustes de espaciado, que en la práctica ayudan tanto o más que la tipografía
sola.

### La fuente NO viaja en el bundle

`dist/` tiene dos archivos y solo uno baja siempre:

| Archivo | Peso | Cuándo se descarga |
| --- | --- | --- |
| `widget.js` | **27.9 KB** (9.6 KB gzip) | Siempre |
| `opendyslexic-<hash>.woff2` | 32.7 KB | **Solo al prender la feature** |

Los 27.9 KB son el número que importa: es lo que paga cualquier visitante de
cualquier sitio cliente. Los 32.7 KB de la fuente los paga únicamente quien
activa la opción, una vez, y quedan en la caché del navegador.

El subset latino que publica `@fontsource` trae 1586 caracteres, 1927 glifos y
tablas `COLR`/`CPAL` (variante en color) que este widget no usa nunca.
`tools/build-font.mjs` (`npm run font`) lo recorta a 355 caracteres —
ASCII + Latin-1 + Latin Extended-A + puntuación tipográfica— y descarta
`COLR`, `CPAL` y `DSIG`: de 112.6 KB a 31.9 KB, **71.6 % menos**.

**Solo Regular.** Sumar Bold costaría +32.7 KB de descarga, a cambio de que
`<strong>` y los títulos dejen de usar la negrita sintética del navegador. Las
letras de OpenDyslexic ya son pesadas de por sí y la síntesis se banca bien. Si
en QA con un cliente se ve mal, agregarlo es una línea en el script.

La familia se declara como `ModoaOpenDyslexic`, no `OpenDyslexic`, para no
chocar con un sitio host que ya tenga su propio `@font-face` con ese nombre.

### Cómo funciona la carga diferida

1. El `.woff2` se emite a `dist/` como archivo suelto (plugin `emitFontAsset`
   en `vite.config.ts`), con hash de contenido en el nombre para que
   actualizarlo invalide la caché solo. `tools/build-font.mjs` escribe ese mismo
   nombre en `font-meta.ts`, así el runtime y el archivo no se desincronizan.
2. En runtime, la URL se resuelve contra `assetBase`, que sale del `src` del
   propio `<script>`: si el cliente carga
   `https://cdn.tu-dominio.com/widget.js`, la fuente sale de
   `https://cdn.tu-dominio.com/opendyslexic-<hash>.woff2`. Sin configuración.
3. La descarga arranca la **primera vez que alguien prende la opción**, con la
   API `FontFace`. La promesa se cachea, así que apagar y prender no vuelve a
   pedir nada.
4. Las reglas CSS **no declaran `@font-face`**: la familia se registra por JS
   cuando la descarga termina. Por eso el espaciado se aplica al instante y la
   tipografía entra después, con `font-display: swap`.

> ### ⚠️ Requisito de despliegue
>
> **Hay que publicar los dos archivos de `dist/`, juntos y en la misma ruta.**
> Antes alcanzaba con subir `widget.js`; ahora no.
>
> Y el `.woff2` tiene que responder con **`Access-Control-Allow-Origin`**. Las
> fuentes se piden siempre en modo CORS, incluso desde el mismo host que sirve
> el JS. Sin ese header la fuente no carga en ningún sitio de tercero.
>
> Si falla, el widget no se rompe: aplica solo el espaciado, deja el texto con
> la pila de respaldo y avisa por consola con la URL que intentó y la causa
> probable. Verificado apuntando a una ruta inexistente: `letter-spacing`,
> `word-spacing` y `line-height` se aplican igual.

`data-asset-base` pisa la deducción, para quien sirva el JS y los assets desde
hosts distintos.

Licencia: SIL Open Font License 1.1 — copia completa en
[`src/features/dyslexia-font/LICENSE-OpenDyslexic.txt`](src/features/dyslexia-font/LICENSE-OpenDyslexic.txt).
Fuente: [OpenDyslexic](https://opendyslexic.org), de Abbie Gonzalez.

### Valores de espaciado

De **WCAG 2.1, Success Criterion 1.4.12 “Text Spacing”** (nivel AA):

| Propiedad | Valor |
| --- | --- |
| `line-height` | 1.5 |
| `letter-spacing` | 0.12em |
| `word-spacing` | 0.16em |
| Separación entre párrafos | 2em |

La ventaja de usar el criterio como valor objetivo, en vez de inventar números,
es que **es exactamente lo que un sitio accesible ya está obligado a tolerar**
sin perder contenido ni funcionalidad. En `em`, así que componen bien con la
feature de tamaño: al 150 %, `letter-spacing` computa 2.88 px (0.12 × 24 px) en
lugar de quedarse fijo.

### El selector, y por qué no es `*` a secas

```css
html[data-modoa-dyslexia] body,
html[data-modoa-dyslexia] body *:not([class*="icon" i]):not([class*="fa-" i])… {
  font-family: 'ModoaOpenDyslexic', system-ui, sans-serif !important;
  …
}
```

`!important` es inevitable: hay que ganarle a lo que el sitio host ya declare.
Lo que sí se puede elegir es **a qué no aplicárselo**.

Las fuentes de íconos (Font Awesome, Material Icons, Glyphicons) dibujan glifos
en el área de uso privado de Unicode. Pisarles el `font-family` convierte todos
los íconos del sitio en cuadraditos vacíos — es la forma más rápida de que un
cliente pida dar de baja el widget. Se excluyen por clase, que es donde esas
librerías declaran su fuente.

Excluirlos del selector no alcanza: `letter-spacing` y `word-spacing` **se
heredan**, así que llegan igual desde el ancestro que sí matcheó y desalinean
el ícono respecto de su texto. Hay una regla aparte que se los devuelve a
`normal`.

**El widget queda afuera gratis:** su host es hijo de `<html>`, no de `<body>`,
así que `html body *` no lo alcanza. Verificado con las tres features activas a
la vez (150 % + deuteranopía + dislexia): el host queda en OpenDyslexic 24 px
con `letter-spacing: 2.88px`, y el panel del widget en system-ui 16 px con
`letter-spacing: normal` y `filter: none`.

### Defecto conocido de la fuente

En OpenDyslexic, el glifo **`ó` minúscula** tiene el acento corrido a la
derecha en lugar de arriba de la vocal. Está en la fuente original de upstream,
no lo introduce el subseteo: verificado midiendo la caja de tinta contra la
fuente completa sin subsetear (crece 19 px en las dos por igual, mientras que
`á` crece 0 en las dos). Es el único carácter afectado de todo el set — `Ó`
mayúscula, `á`, `é`, `í`, `ú`, `ñ`, `ü` y `ç` están bien.

---

## Lectura por voz

Opt-in: arranca apagada y se activa desde el menú. Con la feature activa, al
seleccionar texto aparece un botón flotante “Leer” cerca del final de la
selección.

### Dónde vive el botón flotante

En el **mismo Shadow DOM** que el panel, como hermano de `.root`, no en un
shadow root propio.

El host del widget ya es `position: fixed; inset: 0` colgado de `<html>`, así
que su origen coincide con el del viewport: las coordenadas de
`getBoundingClientRect()` se usan tal cual en un `position: absolute`, sin
conversiones ni compensación de scroll.

El tradeoff contra un shadow root propio: ese daría aislamiento y contexto de
apilamiento independientes, pero duplicaría la hoja de estilos en el bundle y
obligaría a resolver de nuevo dos cosas que el host actual ya resuelve —
escapar del `filter` que la daltonización aplica al `<body>`, y quedar fuera
del wrapper de la estrategia de escalado. Verificado: con acromatopsia activa y
la página al 150 %, el botón mantiene `filter: none` y sus 14 px.

### Regla de cancelación

**Cualquier cambio real en la selección detiene la lectura en curso.** El botón
siempre se refiere a la selección actual.

Esto se aparta un poco de la especificación original, que pedía solo que el
botón desapareciera al limpiarse la selección. Tal cual, eso dejaba un agujero:
si el usuario hacía click en cualquier lado mientras se estaba leyendo, el botón
desaparecía y quedaba una lectura sonando **sin ningún control para detenerla**.
Unificar la regla lo cierra sin agregar estado.

La comparación es contra el texto anterior, no contra el evento: hay navegadores
que disparan `selectionchange` sin que la selección haya cambiado (al mover el
foco, por ejemplo) y ahí no hay que cortar nada.

### Detalles que no son obvios

- **Debounce de 180 ms.** `selectionchange` dispara en cada movimiento del
  cursor durante el arrastre.
- **Se ancla al último rect de la selección**, no al bounding box: en una
  selección de varias líneas el bounding box centraría el botón en el medio del
  bloque, lejos de donde terminó el arrastre.
- **`preventDefault` en el `mousedown` del botón.** Sin eso, el mousedown
  colapsa la selección del documento y para cuando llega el `click` ya no hay
  texto que leer.
- **`cancel()` antes de cada `speak()`.** `speak()` encola, no reemplaza: sin el
  cancel se acumulan utterances.
- **`getVoices()` devuelve `[]` en la primera llamada** en varios navegadores.
  Se cachea y se reintenta con el evento `voiceschanged`.
- **Sin voz para el idioma pedido no se asigna voz**, y el navegador usa la
  suya. Preferible a no leer nada. La búsqueda es: coincidencia exacta
  (`es-AR`), después misma lengua y otra región (`es-ES`).
- **`speak()` se llama sincrónicamente** dentro del handler del gesto. Safari e
  iOS exigen eso; cualquier `await` intermedio rompe la lectura.

### Idioma de la voz

Se resuelve en cada lectura, en este orden:

1. `data-speech-lang` del script tag, si está.
2. `document.documentElement.lang` del sitio host.
3. `data-lang` (el idioma de la UI del widget).

Es un atributo aparte de `data-lang` a propósito: `data-lang` solo admite los
idiomas que tienen traducción de la interfaz, mientras que la voz puede ser de
cualquier idioma que tenga instalado el navegador.

### Acceso por teclado

El botón es focusable (`tabindex="0"`), pero para quien selecciona con
Shift+flechas llegar ahí con Tab no es razonable: el host del widget es el
último hijo de `<html>`, así que en orden de tabulación queda después de todo el
contenido del sitio.

Por eso hay un atajo: **Alt + L** lee la selección actual, y vuelve a
presionarse para detener. Está anunciado en el `aria-label` del botón y en el
texto de ayuda del menú.

### Limpieza

Se cancela la lectura en `pagehide` (navegación real, cierre de pestaña,
bfcache), en `popstate` (back/forward de SPA) y en el `teardown` de la feature.
Las SPA que navegan solo con `pushState` no emiten ningún evento observable; ese
caso queda cubierto por el cambio de selección.

---

## Daltonización: de dónde salen las matrices

`npm run matrices` regenera los números. La derivación completa, con fuentes,
está en [`tools/derive-matrices.mjs`](tools/derive-matrices.mjs); el resultado
está pegado en `src/features/colorblind/matrices.ts`.

### Fuentes

- **Simulación**: Machado, G. M., Oliveira, M. M., Fradinho, L. A. F. (2009).
  *A Physiologically-based Model for Simulation of Color Vision Deficiency*.
  IEEE Transactions on Visualization and Computer Graphics, 15(6), 1291–1298.
  Se usan las matrices a **severidad 1.0** (dicromacia completa).
- **Redistribución de error**: Fidaner, O., Lin, P., Ozguven, N.
  *Analysis of Color Blindness*, Stanford University. Es el algoritmo clásico
  de daltonización.
- **Acromatopsia**: luminancia relativa Rec.709 / sRGB (IEC 61966-2-1),
  coeficientes `0.2126 / 0.7152 / 0.0722`.

### Una aclaración que importa

**Machado et al. publica matrices de simulación, no de corrección.** No existen
"matrices de corrección publicadas" de ese paper. Lo que hace el widget es
componer las dos cosas:

```
corregido = original + E · (original − S · original)
          = [I + E · (I − S)] · original
```

donde `S` es la simulación de Machado y `E` la redistribución de error. Como
toda la cadena es lineal, colapsa en **una sola matriz 3×3** — no hay pipeline
de dos pasos en runtime.

`E` es una **heurística, no física**. Para protanopía y deuteranopía es la
matriz clásica de la fuente [2]. Para tritanopía esa matriz no aplica (volcaría
el error a un canal que la persona tampoco discrimina), así que la reflejamos
para mandar el error del azul hacia rojo y verde: **eso es una adaptación
nuestra, no un valor publicado**. Si en QA con usuarios reales la tritanopía no
convence, ese es el número a tocar.

**Acromatopsia no es corrección.** No hay color que redistribuir: es una
conversión a grises por luminancia perceptual. Va en el mismo menú porque es la
misma clase de ayuda, pero conceptualmente es otra cosa.

### Detalles de implementación

- Las matrices están derivadas en **RGB lineal**, así que los `<filter>` llevan
  `color-interpolation-filters="linearRGB"` explícito. No se confía en el
  default: el sitio host podría tener una regla global que lo cambie.
- Control de sanidad de la derivación: blanco puro `(1,1,1)` mapea a blanco
  puro en las cuatro matrices (las filas suman 1). Una corrección que tiña los
  neutros está mal.
- Los 4 `<filter>` viven en un `<svg>` con IDs predecibles
  (`modoa-filter-protanopia`, etc.) colgado de `<html>`. Tiene que estar en el
  documento host, no en el Shadow DOM: `filter: url(#id)` resuelve el ID contra
  el documento del elemento filtrado.
- La referencia se arma como `url(<href-sin-hash>#id)` y no como `url(#id)` a
  secas, porque un `<base href>` en el sitio host rompe las referencias de solo
  fragmento. Se recalcula en cada aplicación por las SPA que cambian la URL.

### Por qué el filtro va al `<body>` y no al `<html>`

`filter` no es una propiedad heredada: es un efecto de render que pinta el
subárbol completo, y **ningún descendiente puede excluirse**. Aplicado al
`<html>`, el propio widget quedaría filtrado.

Por eso el host del widget se monta como hijo de `<html>`, fuera del `<body>`
(ver `core/mount.ts`), y el filtro va al `<body>`: el sitio queda adentro, el
widget afuera. Efecto colateral bienvenido: el widget sobrevive a los sitios
que hacen `document.body.innerHTML = ...`.

**Limitación conocida:** aplicar `filter` al `<body>` lo convierte en containing
block de sus descendientes `position: fixed`. En sitios con header pegajoso o
modales, eso puede alterar el posicionamiento mientras el filtro está activo.
Es inherente a los filtros CSS. Si algún cliente lo sufre, la salida sería
montar el widget en el top layer (`popover`), que escapa a los filtros de los
ancestros.

---

## Estrategias de escalado (`data-scale-strategy`)

El aumento de tamaño ofrece 4 pasos discretos — 100 / 115 / 130 / 150 % — y dos
formas de aplicarlos. La estrategia se elige **por sitio cliente**, validándola
a mano en QA. No hay detección automática todavía.

### `font-size` (por defecto)

Escala el `font-size` del `<html>` del sitio host con `!important`, tomando como
base el valor computado antes de tocar nada.

Es la correcta y debería ser la respuesta en la enorme mayoría de los sitios:
el contenido **reflowea de verdad**, no genera scroll horizontal y no rompe
`position: fixed` ni ningún posicionamiento.

Solo afecta lo que esté declarado en unidades relativas (`rem`, `em`, `%`,
`ch`). Un sitio con `font-size: 14px` hardcodeado en cada regla no se mueve.

### `transform` (fallback)

Para sitios con px fijos por todos lados, donde la estrategia primaria no mueve
nada. Envuelve los hijos del `<body>` en un `div#modoa-scale-wrapper` y le
aplica `transform: scale()`, compensando el ancho (`width: 100/factor %`) para
que el contenido escalado siga entrando en el viewport sin scroll horizontal.

**El host del widget queda deliberadamente fuera del wrapper**, así el botón y
el menú no se escalan junto con la página.

Antes de habilitarla en un cliente hay que verificar estas cuatro cosas en el
sitio real, porque son limitaciones inherentes al enfoque:

1. El wrapper crea un containing block: los `position: fixed` del sitio
   (headers pegajosos, modales, cookie banners) pasan a posicionarse respecto
   del wrapper en lugar del viewport.
2. Mover nodos **recarga los `<iframe>`** que haya en el `<body>`.
3. No hay reflow: el texto se agranda pero no se reacomoda. A 150 % en pantallas
   angostas puede quedar apretado.
4. Lo que el sitio agregue al `<body>` *después* de que el wrapper exista
   (modales lazy, chats de soporte) queda afuera y no se escala.

### Cómo se prueban las dos

En la demo, con el parámetro `?strategy=transform`. La sección
“Sitio mal comportado (px fijos)” tiene una tarjeta con ancho, alto y
`font-size` en px al lado de un párrafo que hereda del `<html>`: con la
estrategia primaria solo escala el segundo, con `transform` escalan los dos.

---

## Despliegue

El widget son dos archivos estáticos. En Render va como **Static Site**, no como
Web Service: los web services del plan gratuito se duermen a los 15 minutos sin
tráfico y tardan ~30 s en despertar, lo que para un widget embebido en sitios de
terceros significa que el botón no aparece.

Hay un [`render.yaml`](render.yaml) con todo configurado (New → Blueprint). Si
se crea el sitio a mano, la configuración es:

- **Build Command:** `npm ci --include=dev && npm run build`
  (`--include=dev` es necesario: vite y typescript son devDependencies y Render
  puede correr el install con `NODE_ENV=production`)
- **Publish Directory:** `dist`
- **Headers:** hay que cargarlos a mano en Settings → Headers

| Request Path | Header Name | Header Value |
| --- | --- | --- |
| `/*` | `Access-Control-Allow-Origin` | `*` |
| `/*` | `X-Content-Type-Options` | `nosniff` |
| `/widget.js` | `Cache-Control` | `public, max-age=300, must-revalidate` |
| `/opendyslexic-<hash>.woff2` | `Cache-Control` | `public, max-age=31536000, immutable` |

El primero es el que importa: sin él la fuente para dislexia no carga en ningún
sitio cliente. Los demás son optimización.

`widget.js` revalida seguido porque cambia de contenido sin cambiar de nombre;
la fuente lleva hash y se puede cachear para siempre. **Si se regenera la fuente
con `npm run font`, el hash cambia y hay que actualizar esa ruta.**

### Verificación post-deploy

```bash
curl -sI https://<tu-sitio>.onrender.com/opendyslexic-<hash>.woff2 \
  | grep -i 'access-control\|cache-control'
```

Tiene que aparecer `access-control-allow-origin: *`. Si no está, el widget no se
rompe —aplica solo el espaciado y avisa por consola— pero se pierde media
feature.

---

## Desarrollo

Requiere Node 20+.

```bash
npm install
npm run dev        # abre demo/index.html en http://localhost:5173
npm run build      # typecheck + bundle en dist/widget.js
npm run typecheck  # solo tsc --noEmit
npm run matrices   # regenera las matrices de daltonización
npm run font       # regenera la fuente OpenDyslexic subseteada y embebida
npm run logo       # revectoriza el logo del botón desde assets/logo-source.png
```

`matrices`, `font` y `logo` **no corren en el build**: su salida está commiteada
en `src/`. Se vuelven a correr solo si hay que cambiar los parámetros de
derivación, el subconjunto de caracteres o el arte del botón.

### El logo del botón

`src/ui/logo.ts` es el logo vectorizado, generado por `tools/build-logo.mjs` a
partir de `assets/logo-source.png`.

Va **inline en el bundle** y no como asset diferido: el botón flotante es lo
único que el widget muestra siempre, así que un archivo aparte significaría un
botón vacío durante el round-trip.

El PNG original pesa 107.8 KB — casi cuatro veces el bundle. Como el arte es
plano y de dos colores, se traza a SVG: **5.7 KB**, y nítido a cualquier tamaño.
Dos cosas que el script resuelve y no son obvias:

- **La máscara del color claro necesita una apertura morfológica.** El degradado
  de antialiasing entre el navy y el fondo pasa literalmente por el celeste, así
  que ninguna métrica de distancia distingue un relleno real de un borde. Sin la
  apertura quedaba un halo de líneas finas contorneando todo y el path se iba a
  35 KB.
- **El paquete npm `potrace` no emite el transform del binario clásico.** El
  binario devuelve coordenadas en décimas con el eje Y invertido y compensa con
  `translate(0,h) scale(0.1,-0.1)`; el paquete devuelve coordenadas de imagen
  directas. Agregarle ese transform encoge el dibujo 10 veces.

El botón usa fondo blanco fijo en vez de seguir el tema: el logo es arte de
marca pensado para fondo claro, y en modo oscuro el navy sobre oscuro sería
ilegible. El borde sutil evita que el círculo blanco desaparezca en un sitio
host de fondo blanco.

### La página de demo

`demo/index.html` es un banco de pruebas con texto corrido, una paleta pensada
para validar la daltonización (pares rojo/verde y azul/amarillo), SVG inline,
imágenes con gradientes, tablas y un formulario. Sirve para validar cada feature
sin depender de la landing real.

Carga el widget de dos formas:

- **`/demo/index.html`** — carga `/src/main.ts` directo del dev server (con HMR).
- **`/demo/index.html?dist`** — carga `/dist/widget.js`, el bundle real que
  reciben los clientes. Correr `npm run build` antes.
- **`?strategy=transform`** — combinable con lo anterior; equivale a definir
  `data-scale-strategy="transform"` en el snippet del cliente.

Siempre validar una feature en ambos modos antes de darla por terminada: el
bundle de producción pasa por minificación y por el path de `document.currentScript`
distinto al de dev.

### Estructura

```
src/
  main.ts              Entry point. Lee la config y monta el widget.
  core/
    config.ts          Parseo de los atributos data-* del <script>.
    dom.ts             Utilidades de limpieza del DOM del host.
    i18n.ts            Diccionarios es/en.
    mount.ts           Elemento host + Shadow DOM + inyección de estilos.
    state.ts           Store con suscripción, persiste en cada cambio.
    storage.ts         localStorage namespaced y a prueba de excepciones.
    types.ts           WidgetState, WidgetConfig y el contrato Feature.
  features/
    index.ts           Registro de features (define el orden del menú).
    colorblind/        Matrices de corrección + filtros SVG.
    font-size/         Pasos discretos + las dos estrategias de escalado.
    tts/               speechSynthesis + botón contextual de selección.
    dyslexia-font/     Carga diferida de OpenDyslexic + espaciado WCAG.
                       Incluye el .woff2 subseteado y su font-meta.ts.
    reset/             Limpieza de todas las preferencias.
  ui/
    widget.ts          Botón flotante, panel, focus trap, ARIA.
    focus-trap.ts      Ciclo de Tab dentro del panel.
    icons.ts           SVG inline (decorativos, aria-hidden).
    logo.ts            Logo del botón, vectorizado. Generado.
    styles.css         CSS del Shadow DOM. Se inyecta con `?inline`.
demo/index.html        Banco de pruebas.
tools/
  derive-matrices.mjs  Derivación de las matrices de daltonización.
  build-font.mjs       Subseteo de OpenDyslexic y su metadata.
  build-logo.mjs       Vectorización del logo del botón.
assets/
  logo-source.png      Arte original del botón (no se publica).
dist/
  widget.js            Bundle IIFE. Lo único que baja siempre.
  opendyslexic-*.woff2 Asset suelto, bajo demanda.
```

> **Sobre `?dist`:** el dev server sirve `dist/widget.js` crudo mediante un
> plugin propio (`serveRawBundle` en `vite.config.ts`). Sin él, Vite trata al
> bundle como módulo fuente, lo transforma y lo cachea — y la demo termina
> validando una copia procesada y vieja en lugar del artefacto real. Si alguna
> vez el modo `?dist` se comporta distinto al build, eso es lo primero a mirar.

### Cómo agregar una feature

Cada feature implementa el contrato `Feature` de `src/core/types.ts`:

```ts
export const miFeature: Feature = {
  id: 'mi-feature',
  setup(ctx) {},                    // al montar y después de cada reset
  apply(state, ctx) {},             // al montar y en cada cambio de estado
  teardown(ctx) {},                 // deja el documento host como estaba
  render(ctx) { return el; },       // su UI dentro del menú (Shadow DOM)
};
```

Después se agrega al array de `src/features/index.ts`. El orden en ese array es
el orden en el que aparece en el menú.

Reglas que no se negocian al escribir una feature:

1. **`apply` es idempotente.** Se llama en cada cambio de estado, no solo cuando
   cambió *tu* campo.
2. **Los efectos sobre el host se marcan.** Todo lo que la feature inyecte en el
   documento anfitrión (nodos, atributos, `<style>`) lleva un prefijo `modoa-`
   para que `teardown` y el reset lo puedan encontrar y limpiar.
   Corolario: **si `teardown()` borra un nodo, `apply()` —y no `setup()`— tiene
   que ser quien lo cree**, o el reset deja la feature rota para la próxima
   activación. `setup()` es solo para estado en memoria y listeners.
3. **Medidas en `px` dentro del Shadow DOM, nunca `rem`.** La feature de tamaño
   de página escala el `font-size` del `<html>` del host; si la UI del widget
   usara `rem`, se escalaría a sí misma.
4. **Nada de red.** Fuentes, iconos y estilos van empaquetados en el bundle.

### Decisiones de diseño

- **El host se posiciona con estilos inline `!important`.** Es la única
  declaración que le gana a cualquier CSS del sitio anfitrión, incluido su propio
  `!important`. Cubre el viewport con `pointer-events: none`; solo el botón y el
  panel capturan clicks.
- **`readConfig()` corre en el top level de `main.ts`.**
  `document.currentScript` solo es válido durante la ejecución síncrona del
  script; si esperáramos a `DOMContentLoaded` ya sería `null`. Hay un fallback
  que busca `script[data-client-id]` para el caso de `type="module"`.
- **`.root` usa `all: initial`.** Corta la herencia de propiedades del documento
  host (font, color, line-height, text-transform) que sí atraviesan el borde del
  Shadow DOM.
- **`localStorage` nunca tumba el widget.** En Safari privado o con cookies
  bloqueadas lanza excepción; se degrada a estado en memoria.
- **Shadow DOM `open`.** Facilita depurar desde la consola del cliente. El
  aislamiento de estilos es idéntico al de `closed`.

### Handle de depuración

En dev hay un `window.__modoaA11y` con `{ config, store, ui }`. No es API pública
ni tiene garantías de estabilidad; sirve para inspeccionar desde la consola:

```js
__modoaA11y.ui.open();
__modoaA11y.store.get();
```
