/**
 * Vectoriza el logo del botón flotante a un SVG inline.
 *
 *   npm run logo                    (usa assets/logo-source.png)
 *   npm run logo -- <otro.png>
 *
 * Escribe src/ui/logo.ts, que está commiteado. No corre en el build.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ VECTORIZAR EN VEZ DE EMBEBER EL PNG
 *
 * El PNG original pesa 110 KB: casi cuatro veces el bundle entero. Y el botón
 * flotante es lo único que el widget muestra siempre, así que no se puede
 * cargar diferido — un asset aparte significaría un botón vacío durante el
 * round-trip.
 *
 * El arte es plano y de dos colores, o sea el caso ideal para trazar: se separa
 * en dos máscaras por color, se vectoriza cada una y se recombinan en un SVG
 * con dos paths. Queda en el orden de 1-2 KB y nítido a cualquier tamaño.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import potrace from 'potrace';

/** Por defecto usa el PNG guardado en el repo, para que sea reproducible. */
const source = process.argv[2] ?? 'assets/logo-source.png';

const OUTPUT = 'src/ui/logo.ts';

/** Los dos colores del arte, tomados del propio PNG. */
const COLORS = {
  navy: '#12233f',
  blue: '#4a90d2',
};

const work = mkdtempSync(join(tmpdir(), 'modoa-logo-'));

/**
 * Separa el PNG en dos bitmaps en blanco y negro, uno por color.
 *
 * Dos decisiones que costaron un par de intentos:
 *
 * 1. **El navy es la silueta completa**, no "los píxeles oscuros". Los círculos
 *    celestes se dibujan encima. Separar las dos capas por color dejaba una
 *    costura de un píxel entre ambas.
 *
 * 2. **La máscara celeste pasa por una apertura morfológica.** El degradado de
 *    antialiasing entre el navy y el fondo blanco pasa literalmente por el
 *    celeste, así que ninguna métrica de distancia distingue un relleno celeste
 *    real de un borde del navy: quedaba un halo de líneas finas contorneando
 *    todo el dibujo, y el path se iba a 35 KB. La apertura (erosionar y volver
 *    a dilatar) borra lo más fino que el kernel y deja solo las zonas macizas.
 */
function splitMasks() {
  const hex = (h) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const script = `
from PIL import Image, ImageFilter
NAVY = ${JSON.stringify(hex(COLORS.navy))}
BLUE = ${JSON.stringify(hex(COLORS.blue))}
WHITE = (255, 255, 255)

im = Image.open(${JSON.stringify(source)}).convert('RGBA')
# Componer sobre blanco: así el antialiasing degrada hacia el fondo real y no
# hacia el negro que trae el canal alfa.
flat = Image.new('RGB', im.size, WHITE)
flat.paste(im, mask=im.split()[3])

w, h = im.size
navy = Image.new('L', (w, h), 255)
blue = Image.new('L', (w, h), 255)
pn, pb = navy.load(), blue.load()
src = flat.load()

def dist2(c, ref):
    return sum((a - b) ** 2 for a, b in zip(c, ref))

for y in range(h):
    for x in range(w):
        c = src[x, y]
        dn, db, dw = dist2(c, NAVY), dist2(c, BLUE), dist2(c, WHITE)
        nearest = min(dn, db, dw)
        if nearest == dw:
            continue          # fondo
        pn[x, y] = 0          # silueta completa
        if nearest == db:
            pb[x, y] = 0      # candidato a celeste

blue = blue.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))

navy.save(${JSON.stringify(join(work, 'navy.png'))})
blue.save(${JSON.stringify(join(work, 'blue.png'))})
print(w, h)
`;
  const out = execFileSync('python3', ['-c', script], { encoding: 'utf8' });
  const [w, h] = out.trim().split(/\s+/).map(Number);
  return { width: w, height: h };
}

/** Traza un bitmap y devuelve solo el atributo `d` del path resultante. */
function trace(file) {
  return new Promise((resolve, reject) => {
    potrace.trace(
      file,
      {
        threshold: 128,
        turdSize: 4, // descarta motas sueltas del antialiasing
        optCurve: true,
        optTolerance: 0.35,
      },
      (err, svg) => {
        if (err) return reject(err);
        const match = svg.match(/ d="([^"]+)"/);
        resolve(match ? match[1] : '');
      },
    );
  });
}

const { width, height } = splitMasks();
const navyPath = await trace(join(work, 'navy.png'));
const bluePath = await trace(join(work, 'blue.png'));
rmSync(work, { recursive: true, force: true });

/*
 * OJO: el binario clásico de potrace emite las coordenadas en décimas y con el
 * eje Y invertido, y compensa con un `translate(0,h) scale(0.1,-0.1)`. El
 * paquete npm NO hace eso: devuelve el path directamente en coordenadas de
 * imagen. Agregarle el transform del binario encoge el dibujo 10 veces y lo
 * da vuelta.
 */
const svg = [
  `<svg viewBox="0 0 ${width} ${height}" aria-hidden="true" focusable="false">`,
  `<path fill="${COLORS.navy}" d="${navyPath}"/>`,
  `<path fill="${COLORS.blue}" d="${bluePath}"/>`,
  `</svg>`,
].join('');

const module = `/**
 * Logo del botón flotante, vectorizado.
 *
 * GENERADO por tools/build-logo.mjs (\`npm run logo -- <png>\`). No editar a mano.
 *
 * Es decorativo: la etiqueta accesible vive en el aria-label del botón que lo
 * contiene, por eso va con aria-hidden.
 */
export const LOGO_MODOA = \`${svg}\`;
`;

writeFileSync(OUTPUT, module, 'utf8');

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log(`PNG original : ${kb(readFileSync(source).length)}`);
console.log(`SVG trazado  : ${kb(svg.length)}`);
console.log(`  path navy  : ${navyPath.length} caracteres`);
console.log(`  path azul  : ${bluePath.length} caracteres`);
console.log(`Escrito en   : ${OUTPUT}`);
