# Widget de accesibilidad — Modoa

Widget de accesibilidad web embebible y standalone. Se instala con una línea de
código en cualquier sitio, sin dependencias, sin backend y sin tocar el CSS ni el
JS del sitio anfitrión.

- **Un solo archivo JS** `dist/widget.js` (IIFE, auto-ejecutable, **70.4 kB /
  23.9 kB gzip**). La fuente para dislexia es el único asset aparte, y baja
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

| Feature                      | Alcance        | Control      | Estado   |
| ---------------------------- | -------------- | ------------ | -------- |
| Botón flotante + menú        | Shadow DOM     | —            | ✅ Listo |
| Traducción de la página      | Documento host | Desplegable  | ✅ Listo |
| Perfiles de accesibilidad    | Estado         | Desplegable  | ✅ Listo |
| Aumento de tamaño de página  | Documento host | Opciones     | ✅ Listo |
| Espaciado de líneas          | Documento host | Cíclico      | ✅ Listo |
| Espaciado de texto           | Documento host | Cíclico      | ✅ Listo |
| Alineación                   | Documento host | Cíclico      | ✅ Listo |
| Foco (máscara de lectura)    | Shadow DOM     | Cíclico      | ✅ Listo |
| Fuente para dislexia         | Documento host | Opciones     | ✅ Listo |
| Contraste                    | Documento host | Cíclico      | ✅ Listo |
| Contraste inteligente        | Documento host | Cíclico      | ✅ Listo |
| Saturación                   | Documento host | Cíclico      | ✅ Listo |
| Pausar animaciones           | Documento host | Cíclico      | ✅ Listo |
| Cursor grande                | Host + shadow  | Cíclico      | ✅ Listo |
| Daltonización (Machado)      | Documento host | Opciones     | ✅ Listo |
| Lectura por voz (TTS)        | Selección      | —            | ✅ Listo |
| Reset de preferencias        | —              | —            | ✅ Listo |

**Control cíclico** = un solo botón que rota entre sus estados en cada
pulsación, y vuelve siempre a "apagado" al cerrar la vuelta. Ocupa media
columna de la grilla del panel, contra la fila entera que necesita un grupo con
todas las opciones a la vista. Es lo que permite tener diecisiete features sin
que el menú sea una lista interminable.

El costo de ese ahorro es real y se paga en dos lugares:

- No se puede saltar directo a un estado. Se acota con ciclos cortos (cuatro
  estados como máximo, contando el apagado) y cerrando siempre en "apagado":
  nunca hay que dar la vuelta entera para desactivar.
- El nombre accesible del botón cambia al presionarlo y ningún lector de
  pantalla lo relee por eso solo. Por eso el panel tiene una región viva
  (`role="status"`, `aria-live="polite"`, en `ui/announcer.ts`) que anuncia cada
  cambio — WCAG 2.1 SC 4.1.3 "Status Messages".

Y el estado actual va siempre escrito con todas las letras debajo del nombre de
la feature, no solo marcado con el color de fondo: SC 1.4.1 "Use of Color".

**Desplegable** = una cabecera que pliega y despliega su lista de opciones
(`ui/disclosure.ts`). Es para las listas que no entran en un ciclo de cuatro
estados ni pueden estar siempre a la vista: los seis perfiles y los doce
idiomas. Lo que cuesta —las opciones no están en el árbol hasta que alguien
abre— se paga con `aria-expanded` en la cabecera y con el valor actual escrito
ahí mismo, para no tener que abrir solo para saber qué está puesto. Escape
adentro del desplegable cierra el desplegable y **no** el panel entero: cerrar
todo de un saque obligaría a volver a abrir el menú y navegar hasta acá de nuevo.

---

## Perfiles de accesibilidad

El resto del menú son quince controles, cada uno con su nombre técnico. Quien
sabe que necesita "interlineado 1.75 y saturación alta" los encuentra; quien
solo sabe que ve poco, no. Un perfil traduce la necesidad a la combinación:

| Perfil          | Qué enciende                                                                                        |
| --------------- | --------------------------------------------------------------------------------------------------- |
| **Daltonismo**  | Contraste inteligente · saturación alta                                                              |
| **Dislexia**    | Fuente para dislexia · animaciones pausadas · espaciado ligero · interlineado 1.5×                   |
| **Visión baja** | Animaciones pausadas · cursor grande · página al 130 % · saturación alta · espaciado moderado · 1.75× |
| **Cognitivo**   | Página al 115 % · foco                                                                               |
| **Epilepsia**   | Animaciones pausadas · saturación baja                                                               |
| **TDAH**        | Animaciones pausadas · foco · saturación baja                                                        |

No hay perfiles de discapacidad motora ni de ceguera **a propósito**: lo que esas
dos necesitan —navegación por teclado completa, estructura semántica correcta
para el lector de pantalla— no es algo que un widget pueda activar desde afuera.
Prometerlo con un botón sería peor que no ofrecerlo.

Dos decisiones definen cómo se comportan:

1. **El perfil parte de cero.** Elegirlo restablece todo a los valores por
   defecto y aplica exactamente lo suyo. Así "Dislexia" se ve siempre igual, sin
   importar qué hubiera activado antes. Un perfil que se sumara a lo que ya
   estaba daría un resultado distinto cada vez, imposible de reproducir o de
   explicar en soporte. Volver a elegir el perfil activo lo apaga.
2. **El perfil activo se deduce del estado, no se guarda.** No hay campo
   `profile` en `WidgetState`: `apply` busca el preset que coincida exactamente
   con el estado actual. Si la persona toca cualquier control a mano, deja de
   coincidir y ningún perfil queda marcado. Guardarlo aparte permitiría que el
   panel dijera "Dislexia" sobre un estado que ya no es el de dislexia.

Por qué el perfil de **daltonismo no enciende ningún filtro de daltonización**:
el filtro correcto depende del tipo —protanopía, deuteranopía, tritanopía— y
elegir uno al azar empeora la visión de los otros dos. Lo que sirve para los
tres es más saturación, que separa tonos que estaban cerca, y contraste medido,
que garantiza la legibilidad sin depender del color.

---

## Los tres controles de color, y por qué comparten un módulo

Contraste (en modo invertido), saturación y daltonización quieren pintar el
mismo `<body>` con `filter`. `filter` es **una sola propiedad**: la última que
escriba gana y borra a las otras. Elegir dos de las tres tiene que funcionar, y
sin coordinación no funciona.

`core/host-filter.ts` es el único dueño de esa propiedad. Cada feature registra
su capa y el módulo compone la cadena en un orden fijo, que no es cosmético
porque los filtros se aplican en secuencia sobre el resultado del anterior:

```
saturate(0.5) url(#modoa-filter-deuteranopia) invert(1) hue-rotate(180deg)
└─ saturación ─┘└──── daltonización ─────────┘└──────── contraste ────────┘
```

1. **Saturación** primero, sobre los colores originales del sitio.
2. **Daltonización** después: la simulación tiene que correr sobre lo que la
   persona realmente va a ver, no sobre colores que después se modifican.
3. **Contraste** (la inversión) al final, sobre la imagen ya compuesta.

El `<body>` queda con un `data-modoa-filter` que lista las capas activas en ese
mismo orden, para poder verificarlo de un vistazo en QA.

### Por qué la saturación no rompe el contraste

La matriz de `saturate()` está construida sobre los coeficientes de luminancia
(0.213 R, 0.715 G, 0.072 B) — los mismos que usa la fórmula de relación de
contraste de WCAG. Mueve el croma dejando la luminancia donde estaba, así que un
par texto/fondo que cumplía SC 1.4.3 lo sigue cumpliendo en los tres niveles.

`high` se queda en `1.75` por otro motivo: más arriba los colores empiezan a
recortarse contra los límites de sRGB y dos tonos distintos pueden terminar en
el mismo color saturado. Se perdería información en lugar de resaltarla.

### Los tres modos de contraste

**Invertido** no es `invert(1)` a secas. Invertir y nada más da vuelta también
el tono: el cielo azul sale naranja y la piel, celeste. `hue-rotate(180deg)`
devuelve cada tono a su lugar y deja solo la vuelta de luminosidad. La relación
de contraste sobrevive intacta —invertir es simétrico respecto de la fórmula de
WCAG— así que un par que cumplía 4.5:1 lo sigue cumpliendo.

Las imágenes, videos e `<iframe>` se invierten de vuelta con una regla propia:
el `filter` de un descendiente se compone sobre el del ancestro y las dos
inversiones se cancelan.

**Oscuro** y **claro** son CSS puro, sin filtro. Los colores no son de gusto:
son los pares con más relación de contraste que se pueden armar manteniendo los
enlaces distinguibles del texto corrido.

| Modo   | Texto             | Enlace            | Visitado          |
| ------ | ----------------- | ----------------- | ----------------- |
| Oscuro | `#ffffff` — 21:1  | `#ffff00` — 19.6:1| `#66ccff` — 11.6:1|
| Claro  | `#000000` — 21:1  | `#0000cc` — 11.2:1| `#6b00a8` — 9.6:1 |

Los dos pisan `background-image` además del color de fondo. No es una decisión
cómoda —se lleva puestos degradados y sprites CSS— pero es necesaria: una foto
de fondo que sobreviva deja el texto forzado sobre un fondo que no se eligió, y
ahí los números de esa tabla no significan nada. Las imágenes de **contenido**
(`<img>`, `<video>`) no se tocan: son información, no decoración.

Además redibujan el anillo de foco con el color de enlace (SC 2.4.7: el anillo
del sitio puede haber quedado del mismo color que el fondo forzado) y le ponen
borde explícito a los controles de formulario, que si no se funden con el fondo.

---

## Contraste inteligente

Los tres modos de contraste de arriba imponen una paleta a toda la página.
Cumplen, pero borran el diseño del sitio. El contraste inteligente hace lo
contrario: **mide** el contraste real de cada texto contra su fondo real y
corrige solo lo que no llega al mínimo de WCAG (SC 1.4.3), moviendo la
luminosidad del texto y **conservando su tono**. Un enlace azul de marca sigue
siendo azul, más claro o más oscuro; no se convierte en el amarillo de la paleta
de alto contraste.

`features/smart-contrast/contrast-math.ts` no tiene DOM y es donde vive el
estándar: luminancia relativa, relación de contraste, composición de alfa y la
corrección. `index.ts` es lo que lo conecta con la página.

### Cómo mide

1. Recorre los elementos del `<body>` que dibujan **texto propio** (un nodo de
   texto no vacío entre sus hijos directos), hasta un tope de 4000 — un DOM
   patológico no puede congelar el hilo principal.
2. **Fondo efectivo**: sube por los ancestros componiendo alfas hasta el primer
   fondo opaco. Si en el camino aparece un `background-image` —una foto o un
   degradado— el elemento **se saltea**: ahí no hay un color único contra el que
   medir, y elegir uno a ojo daría una corrección que puede empeorar la
   legibilidad en media caja. Para esos casos están los modos forzados.
3. **Objetivo**: 4.5:1, o 3:1 si el texto es grande (≥24 px, o ≥18.66 px en
   negrita). Es la definición literal de SC 1.4.3.
4. **Corrección**: búsqueda binaria sobre la L de HSL, conservando H y S, hasta
   el primer valor que cumpla — el más cercano al color original que alcanza.

Un detalle que es fácil hacer mal: la dirección —hacia el blanco o hacia el
negro— se decide comparando cuánto contrasta cada extremo contra el fondo, **no**
por un umbral de luminosidad. El punto donde el blanco y el negro empatan no es
el gris del medio sino una luminancia relativa de ~0.179, porque la fórmula de
WCAG no es simétrica. Con el umbral ingenuo en 0.5, todos los fondos de
luminancia intermedia se corrigen para el lado equivocado.

### Cómo se aplica

Una regla por **color corregido**, no por elemento: en una página real los
colores distintos son unas pocas decenas aunque los textos sean miles. Los
elementos que comparten corrección comparten marca:

```css
html[data-modoa-smart-contrast] body [data-modoa-sc="3"] { color: #197fd6 !important; }
```

El `html … body …` delante del atributo no es decorativo: sube la especificidad
a 0-3-1 para ganarle al CSS del sitio, que suele apuntar con clases.

Se recalcula en **cada** cambio de estado (subir el tamaño de página mueve el
umbral de "texto grande"; los modos de contraste cambian los colores a medir) y
con un `MutationObserver` para el contenido que llega después. El observer mira
solo `childList`: como lo único que escribe la feature son atributos, no puede
dispararse por su propio trabajo.

### Cómo convive con las otras features de color

- Con contraste **Oscuro** o **Claro** activo, los colores computados ya son los
  de la paleta forzada (21:1). No encuentra nada que corregir y no emite ninguna
  regla: se apaga sola, no hace falta excluirla a mano.
- Con contraste **Invertido** o con **saturación**, el `filter` del `<body>` es
  un efecto de render posterior y los colores computados no cambian. No importa:
  invertir es simétrico respecto de la fórmula de WCAG y `saturate()` conserva la
  luminancia, así que la relación calculada sobrevive a las dos.

Por eso `smartContrastFeature` va **inmediatamente después** de `contrastFeature`
en `features/index.ts`: ese array es también el orden de `apply`, y hace falta
medir con la hoja de contraste ya inyectada.

---

## Pausar animaciones

**WCAG 2.1 SC 2.2.2 "Pause, Stop, Hide"** (nivel A) pide un control para detener
todo lo que se mueva más de cinco segundos sin que la persona lo haya pedido.
Fuera del criterio, es lo primero que necesita quien tiene epilepsia
fotosensible, déficit de atención o mareo inducido por movimiento — por eso los
tres perfiles correspondientes lo encienden.

Se congelan las animaciones CSS, las transiciones y el scroll suave, y se pausa
el `<video>`/`<audio>` que esté sonando.

`animation-play-state: paused` y **no** `animation: none`: anular la animación
devuelve cada elemento a su estado inicial, así que un carrusel que dejaba
visible la tercera diapositiva vuelve a la primera, y una entrada animada que
terminaba en `opacity: 1` se queda invisible para siempre. Pausar escondería
contenido, que es exactamente lo contrario de lo que se busca.

Del media se lleva la cuenta de **cuál pausó la feature**, para que al reanudar
vuelva a sonar solo lo que estaba sonando: un video que la persona ya había
pausado tiene que seguir pausado.

**Límite conocido:** un GIF animado no se pausa. Hacerlo exige decodificarlo y
repintar el primer cuadro en un `<canvas>` que reemplace al `<img>`, y eso ya no
es un cambio reversible sobre el DOM del sitio.

---

## Cursor grande

El puntero del sistema mide unos 20 px y es un objetivo difícil de seguir con
baja visión, con nistagmo o con cualquier dificultad de seguimiento visual.

Los tres punteros —flecha, mano y barra de inserción— se dibujan como SVG en un
lienzo de 32×32 y se embeben como data URI (regla 4: nada de red). Relleno
blanco con borde negro, que es la única combinación que se ve tanto sobre fondo
claro como sobre oscuro. Dos tamaños: 48 px y 64 px; los navegadores descartan
los cursores de más de 128 px.

Cada declaración cierra con el keyword nativo de respaldo:

```css
cursor: url("data:image/svg+xml,…") 21 8, pointer !important;
```

El respaldo no es decorativo: si el navegador descarta la imagen —tamaño fuera
de rango, un sistema sin cursores personalizados— sin él la declaración entera
queda inválida y el sitio se quedaría sin cursor.

El atributo `data-modoa-cursor` se escribe en **dos** lugares: en el `<html>` del
sitio, para el CSS del host, y en el elemento host del widget, donde lo leen las
reglas `:host([data-modoa-cursor="…"])` de una hoja que la feature inyecta en el
shadow. Si adentro del menú el puntero volviera al tamaño normal, la feature
fallaría justo en el único lugar donde se comprueba que funcionó.

---

## Traducción de la página

La barrera de idioma no está en WCAG como criterio —SC 3.1.1 y 3.1.2 solo piden
**declarar** el idioma, no ofrecerlo— pero es una barrera de acceso real, y para
quien tiene una discapacidad cognitiva o de lectura leer en su lengua no es una
comodidad sino la diferencia entre entender y no entender.

### Por qué la API del navegador y no un servicio

El modelo corre **en el dispositivo** (`Translator`, Chromium 138+). El contenido
de la página del cliente no sale hacia ningún servidor, el widget no hace ni una
petición de red y no hay una clave de API que administrar por sitio. El costo es
la disponibilidad: hoy no existe en otros motores, así que `render()` devuelve
`null` y el bloque **no se pinta** — el mismo criterio que ya usa la lectura por
voz cuando no hay `speechSynthesis`. Ofrecer una opción muerta es peor que no
ofrecerla.

Todo lo que sabe de la API vive en `features/translate/translator.ts`; si cambia
de forma o aparece otra, se toca ahí y la feature no se entera.

### El gesto del usuario

`Translator.create()` **exige un gesto** cuando el modelo del idioma todavía no
está en el dispositivo: bajar cientos de megabytes no puede dispararse solo.
Dos consecuencias en el código:

- `create()` es lo **primero** que se llama al elegir un idioma, sin ningún
  `await` por delante. La activación transitoria que deja el clic dura unos
  segundos y consultar antes la disponibilidad podía costar justo esa activación.
  La disponibilidad se consulta **después**, solo si hubo error, para dar el
  motivo exacto.
- Si aun así falta el gesto, el estado **vuelve a "sin traducir"** y el panel
  pide volver a elegir el idioma. No es cosmético: con el estado en el idioma
  fallido, volver a tocarlo no sería un cambio de estado y no pasaría nada.

### Qué se traduce y qué no

- Los nodos de texto del `<body>`, salteando `script`, `style`, `code`, `pre` y
  compañía, y **todo subárbol con `translate="no"` o `.notranslate`** — la señal
  estándar de HTML para nombres propios, código y marcas.
- Los atributos `alt`, `title`, `placeholder` y `aria-label`. Los dos primeros y
  el último son **nombre accesible**: es lo único que escucha quien usa un lector
  de pantalla. En un widget de accesibilidad, traducir el texto visible y dejar
  el nombre accesible en el idioma original sería traducir la página para quien
  ve y no para quien escucha.
- El contenido que llega después, vía `MutationObserver` con rebote.

Del texto original se guarda todo en un `Map`, que es lo que permite volver
intacto a "Sin traducir" y en el teardown. El espacio de alrededor de cada nodo
se conserva a mano y no con `replace()`, porque el texto traducido puede contener
`$&` o `$1` y `replace()` los interpretaría como patrones.

Mientras está activa, el `<html lang>` pasa al idioma nuevo: es lo que hace que
un lector de pantalla cambie de voz (SC 3.1.1) y, de paso, que la lectura por voz
del propio widget lea con la voz correcta, que la resuelve leyendo de ahí. El
valor original se guarda y se restaura.

Los idiomas del desplegable llevan su nombre **en ese idioma** (Deutsch, 日本語):
quien busca esta opción es, por definición, alguien que no lee bien el idioma en
el que está el panel.

Por el mismo motivo el bloque va **primero en el panel**, arriba incluso de los
perfiles: es la única opción que le sirve a alguien que no puede leer el resto
del menú, y más abajo quedaría escondida detrás de quince rótulos escritos en el
idioma que esa persona no entiende.

---

## La hoja de estilos compartida, y por qué el orden importa

Siete features escriben CSS sobre el sitio host y varias pisan las **mismas
propiedades**: la fuente para dislexia fija `line-height`, `letter-spacing` y
`word-spacing`; el espaciado de texto fija los dos últimos; el espaciado de
líneas fija el primero. Todas usan `!important` sobre selectores de
especificidad parecida, así que quién gana lo decide el orden en la hoja.

Con un `<style>` por feature ese orden sería el **orden de activación**: prender
dislexia después del espaciado de líneas daría un resultado distinto que al
revés. Por eso hay una sola hoja (`core/host-css.ts`, un `<style>` con id
`modoa-host-style`) y las secciones se escriben siempre en el mismo orden, sin
importar cuándo se activó cada una:

```
contrast · smart-contrast · text-align · dyslexia · text-spacing · line-spacing · animations · big-cursor
                                         └── menor prioridad ────── mayor ────┘
```

`smart-contrast` va detrás de `contrast` porque las dos escriben `color`: la
corrección medida elemento por elemento le gana a la paleta forzada. (En la
práctica no compiten, por lo que se explicó más arriba.) `animations` y
`big-cursor` van al final y su posición da igual: escriben propiedades
—`animation-play-state`, `cursor`— que no toca nadie más.

La regla detrás de ese orden es "lo explícito le gana a lo que vino de
arrastre". El espaciado de la fuente para dislexia viene incluido en el paquete
de la fuente, no lo pidió nadie; si además se usa uno de los dos controles
dedicados a espaciado, gana el control. En la práctica: con dislexia + líneas 2x
+ espaciado pesado, el texto queda en OpenDyslexic con `line-height: 2` y
`letter-spacing: 0.2em`, no con el 1.5 / 0.12em de la fuente.

Cuando no queda ninguna sección activa el `<style>` se saca del documento: el
teardown tiene que devolver el DOM del host exactamente como estaba.

### Valores de espaciado de texto

`moderate` es exactamente lo que pide **WCAG 2.1 SC 1.4.12 "Text Spacing"**
(nivel AA). Tomarlo como escalón del medio tiene una ventaja concreta sobre
elegir valores a ojo: es lo que un sitio bien hecho ya está obligado a soportar
sin perder contenido ni funcionalidad.

| Nivel      | Interletrado | Interpalabra | Entre párrafos |
| ---------- | ------------ | ------------ | -------------- |
| `light`    | 0.06em       | 0.10em       | 1.5em          |
| `moderate` | **0.12em**   | **0.16em**   | **2em**        |
| `heavy`    | 0.20em       | 0.30em       | 2.5em          |

El interlineado no está en esa tabla aunque el criterio también lo cubra: tiene
su propio control, con el piso en el 1.5 que pide el mismo SC. Repetirlo en los
dos sería dejar dos botones peleando por la misma propiedad.

Las tres features tipográficas comparten las exclusiones de fuentes de ícono de
`core/text-css.ts` — ver [El selector, y por qué no es `*` a secas](#el-selector-y-por-qué-no-es--a-secas).

---

## Foco: la máscara de lectura

Oscurece la página salvo una banda a la altura del cursor, para sostener la
atención en el renglón que se está leyendo.

La banda mide el 12 % del viewport —unas cuatro líneas de texto corrido en una
pantalla de escritorio— acotada a [64, 128] px. El techo importa tanto como la
proporción: una banda que abarque medio viewport deja de aislar nada, porque la
vista se vuelve a dispersar dentro de la propia banda. Vive en el **mismo
Shadow DOM** que el panel, como hermana de `.root` — igual que la burbuja de
lectura por voz. El host es `position: fixed; inset: 0`, así que su origen
coincide con el del viewport y las coordenadas de `clientY` se usan tal cual, sin
compensar scroll. Estar en el shadow también la deja fuera del alcance de los
filtros que el widget aplica al `<body>`: la máscara no se invierte junto con la
página.

La banda va enmarcada con los dos colores del logo —celeste `#4a90d2` arriba,
navy `#12233f` abajo— declarados como `--m-brand-celeste` y `--m-brand-navy` en
`ui/styles.css`. Son los únicos tokens que **no** se redefinen en el bloque de
tema oscuro: son identidad, no paleta de interfaz.

Los bordes se dibujan hacia adentro de cada panel oscuro, no hacia la banda, y
por eso `.mask` lleva `box-sizing: border-box`. El JS le escribe a `.mask--top`
un `height` exacto; con `content-box` el borde se sumaría por fuera de esa
medida, el panel terminaría 6 px más abajo y la banda quedaría corrida y más
angosta que lo calculado.

Tres cosas que no son negociables en esta feature:

- **`pointer-events: none`.** Sin eso la máscara es un panel que se come todos
  los clicks de la página.
- **Sigue también al foco del teclado** (`focusin`, en captura). Sin eso la
  feature es inservible sin mouse: quien navega con Tab dejaría la banda clavada
  mientras el foco se mueve por debajo de la parte oscurecida. Se ignora el foco
  que entra al propio widget, porque los eventos que salen del Shadow DOM se
  re-apuntan al elemento host, que ocupa el viewport entero.
- **`requestAnimationFrame` para reposicionar.** `pointermove` dispara decenas
  de veces por segundo; agrupando en un frame se pinta como mucho una vez por
  refresco de pantalla.

En el modo de alto contraste del sistema lleva `forced-color-adjust: none`: sin
eso el fondo semitransparente se descarta y se pinta un bloque opaco, que taparía
la página en vez de atenuarla. De paso preserva los colores de marca de los
bordes, mismo criterio que el logo del botón.

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
crean en `setup()`. Tres features usan **inyección diferida**: crean sus nodos
en `apply()`, la primera vez que hacen falta.

- **Daltonización**: el `<svg>` de filtros se inyecta al elegir un filtro. Si
  se creara en `setup()`, después de un reset el `filter: url(#id)` apuntaría a
  un nodo inexistente.
- **Fuente para dislexia**: ya era diferida por peso; ahora además el
  `teardown()` la da de baja de `document.fonts` y resetea la promesa de
  descarga, con un contador de generación para que una descarga que llegue
  tarde no registre la fuente después del reset.
- **Cursor grande**: la hoja que inyecta en el shadow para que el puntero
  también sea grande sobre el panel se crea al activar y se saca en el teardown.

La traducción usa el mismo contador de generación que la fuente, y por el mismo
motivo: una traducción en vuelo que llega tarde no debe escribir sobre un
documento que ya se reseteó.

Beneficio colateral: un sitio donde nadie usa esas features nunca recibe esos
nodos en su DOM.

### Verificación

Con **todas** las features activas a la vez (150 % + deuteranopía + fuente
dislexia + los nueve controles cíclicos activos + la página traducida al inglés
+ una lectura por voz sonando), se aprieta reset y se compara el DOM del host
campo por campo contra una firma tomada antes de activar nada: **cero
diferencias**.

| | Activado | Tras reset |
| --- | --- | --- |
| Secciones / párrafos / ítems | 10 / 21 / 20 | 10 / 21 / 20 |
| `#modoa-colorblind-filters` | 1 (con 4 `<filter>`) | 0 |
| `#modoa-scale-wrapper` | 1 | 0 |
| `#modoa-host-style` | 1 (con 8 secciones) | 0 |
| `#modoa-cursor-style` (en el shadow) | 1 | 0 |
| `FontFace` registradas | 1 | 0 |
| Atributos en `<html>` | `lang` + `data-modoa-`: `scale`, `contrast`, `smart-contrast`, `dyslexia`, `line-spacing`, `text-align`, `text-spacing`, `animations`, `cursor` | `lang` (con su valor original) |
| Atributos en `<body>` | `data-modoa-colorblind`, `data-modoa-filter`, `style` | ninguno |
| Elementos con `data-modoa-sc` | los que hubo que corregir | 0 |
| Texto de la página | traducido | el original, nodo por nodo |
| Paneles de la máscara en el shadow | 2 | 0 |
| `speechSynthesis` | hablando | detenido |
| localStorage | con datos | `null` |
| Controles cíclicos activos | 9 | 0 |

El atributo `style` vacío que quedaba en el `<body>` era residuo real:
`style.removeProperty()` deja un `style=""` colgado. Lo limpia
`removeInlineProperty()` en `core/dom.ts`.

**Ciclo completo sin degradación:** tras 3 activaciones y 2 resets sigue
habiendo exactamente 1 `<svg>` de filtros con 4 IDs únicos, 1 wrapper, 1
`<style>` de host con sus secciones en el orden fijo, 1 hoja de cursor en el
shadow, 1 `FontFace`, 2 paneles de máscara, 1 burbuja de TTS, 1 región viva y
1 panel. El atajo Alt + L sigue
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
- La feature **no escribe `body.style.filter`**: registra su capa en
  `core/host-filter.ts`, que la compone con las de saturación y contraste. Ver
  [Los tres controles de color](#los-tres-controles-de-color-y-por-qué-comparten-un-módulo).

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
Es inherente a los filtros CSS, y alcanza por igual a la saturación y al
contraste invertido, que usan la misma propiedad. Si algún cliente lo sufre, la salida sería
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

**1. Los headers.** Ojo con el nombre exacto: un typo hace que el navegador lo
ignore como cualquier header desconocido, sin ningún error visible.

```bash
curl -sI https://<tu-sitio>.onrender.com/opendyslexic-<hash>.woff2 \
  | grep -i 'control-allow\|cache-control'
```

Tiene que decir `access-control-allow-origin: *`. Si no está, el widget no se
rompe —aplica solo el espaciado y avisa por consola— pero se pierde media
feature.

**2. La prueba de origen cruzado.** `demo/produccion.html` carga el widget desde
el CDN real en vez del build local. Servida desde `npm run dev`, el origen es
`localhost` y el widget viene de `onrender.com`: es el único camino que ejercita
CORS de verdad, y ninguna prueba con el bundle local puede reemplazarlo.

```
http://localhost:5180/demo/produccion.html
```

Si la fuente para dislexia cambia la tipografía de esa página, el deploy está
bien.

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

`demo/produccion.html` es aparte: carga el widget desde el CDN de producción,
para verificar un deploy. Ver [Verificación post-deploy](#verificación-post-deploy).

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
    host-css.ts        Hoja única inyectada en el host. Ordena las secciones.
    host-filter.ts     Compone el `filter` del <body> entre sus tres dueños.
    text-css.ts        Exclusiones de fuentes de ícono y scopes compartidos.
  features/
    index.ts           Registro de features (define el orden del menú).
    profiles/          Perfiles de accesibilidad + sus presets.
    colorblind/        Matrices de corrección + filtros SVG.
    contrast/          Invertido (filtro) + oscuro y claro (CSS).
    smart-contrast/    Corrección medida por elemento + la matemática de WCAG.
    saturation/        Baja, alta y nula. Solo filtro.
    animations/        Pausa animaciones, transiciones y media (SC 2.2.2).
    big-cursor/        Punteros grandes en SVG, host y shadow.
    font-size/         Pasos discretos + las dos estrategias de escalado.
    line-spacing/      Interlineado 1.5x / 1.75x / 2x.
    text-spacing/      Interletrado e interpalabra (SC 1.4.12).
    text-align/        Alineación forzada izquierda / derecha / centro.
    reading-mask/      Máscara de lectura que sigue al cursor y al foco.
    translate/         Traducción en el dispositivo + la lista de idiomas.
    tts/               speechSynthesis + botón contextual de selección.
    dyslexia-font/     Carga diferida de OpenDyslexic + espaciado WCAG.
                       Incluye el .woff2 subseteado y su font-meta.ts.
    reset/             Limpieza de todas las preferencias.
  ui/
    widget.ts          Botón flotante, panel, focus trap, ARIA.
    cycle.ts           Control cíclico: un botón que rota entre sus estados.
    disclosure.ts      Desplegable: cabecera plegable con lista de opciones.
    announcer.ts       Región viva del panel (role="status"). SC 4.1.3.
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
4. **Nada de red.** Fuentes, iconos y estilos van empaquetados en el bundle. La
   traducción no es una excepción: el modelo lo administra y lo ejecuta el
   navegador en el dispositivo, el widget no hace ninguna petición y el
   contenido del sitio no sale hacia ningún servidor.
5. **Las propiedades compartidas no se escriben directo.** Si la feature toca el
   `filter` del `<body>`, va por `core/host-filter.ts`; si inyecta CSS en el
   host, va por `core/host-css.ts`. Escribir `body.style.filter` o agregar un
   `<style>` propio le borra el trabajo a otra feature en cuanto alguien use las
   dos a la vez — y las combinaciones que se rompen así no aparecen probando una
   feature por vez.

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
