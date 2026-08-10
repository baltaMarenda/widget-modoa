/**
 * Genera el asset de fuente OpenDyslexic subseteado + su módulo de metadatos.
 *
 *   npm run font
 *
 * Escribe dos archivos, ambos commiteados:
 *
 *   src/features/dyslexia-font/opendyslexic-<hash>.woff2  el asset binario
 *   src/features/dyslexia-font/font-meta.ts               nombre, hash, tamaño
 *
 * El .woff2 NO se embebe en el bundle: se copia a dist/ junto al widget.js y se
 * descarga en runtime solo cuando alguien prende la feature. El nombre lleva un
 * hash de contenido para que actualizar la fuente invalide la caché sola, y ese
 * mismo nombre queda en font-meta.ts para que el runtime y el archivo nunca se
 * desincronicen.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ SUBSETEAR
 *
 * El subset "latin" que publica @fontsource trae 1586 caracteres, 1927 glifos
 * y tablas COLR/CPAL (variante en color) que este widget no usa nunca.
 * Acá se recorta a lo que necesita un sitio en español, inglés, portugués,
 * francés, italiano o alemán.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import subsetFont from 'subset-font';

const SOURCE =
  'node_modules/@fontsource/opendyslexic/files/opendyslexic-latin-400-normal.woff2';
const OUT_DIR = 'src/features/dyslexia-font';

/**
 * Conjunto de caracteres a conservar.
 *
 * - ASCII imprimible (U+0020–U+007E).
 * - Latin-1 Supplement (U+00A0–U+00FF): acentos, ñ, ü, ç, ¿, ¡, º, ª.
 * - Latin Extended-A (U+0100–U+017F): europeo central, œ, š, ž.
 * - Puntuación tipográfica usual en web.
 */
function buildCharset() {
  const chars = new Set();
  const addRange = (from, to) => {
    for (let cp = from; cp <= to; cp += 1) chars.add(String.fromCodePoint(cp));
  };

  addRange(0x0020, 0x007e);
  addRange(0x00a0, 0x00ff);
  addRange(0x0100, 0x017f);

  for (const ch of '‐‑‒–—―‘’‚‛“”„‟†‡•…‰‹›⁄€₤₩₪₫₹™©®°±×÷≠≤≥→←↑↓') {
    chars.add(ch);
  }

  return [...chars].join('');
}

const charset = buildCharset();
const original = await readFile(SOURCE);

const subset = await subsetFont(original, charset, {
  targetFormat: 'woff2',
  dropTables: ['COLR', 'CPAL', 'DSIG'],
});

const hash = createHash('sha256').update(subset).digest('hex').slice(0, 8);
const fileName = `opendyslexic-${hash}.woff2`;

// Limpiar versiones anteriores para que no se acumulen en el repo.
for (const entry of await readdir(OUT_DIR)) {
  if (/^opendyslexic-[0-9a-f]{8}\.woff2$/.test(entry) && entry !== fileName) {
    await unlink(join(OUT_DIR, entry));
    console.log(`Eliminado obsoleto      : ${entry}`);
  }
}

await writeFile(join(OUT_DIR, fileName), subset);

const meta = `/**
 * Metadatos del asset de fuente. GENERADO por tools/build-font.mjs
 * (\`npm run font\`). No editar a mano.
 *
 * Fuente: OpenDyslexic (https://opendyslexic.org), vía @fontsource/opendyslexic.
 * Licencia: SIL Open Font License 1.1 — ver LICENSE-OpenDyslexic.txt.
 */

/**
 * Nombre del archivo tal como se emite en dist/. Lleva hash de contenido: si la
 * fuente cambia, cambia el nombre y las cachés se invalidan solas.
 */
export const FONT_FILE_NAME = '${fileName}';

/** Tamaño en bytes, para tenerlo a mano en la documentación. */
export const FONT_BYTES = ${subset.length};

/** Familia declarada en runtime. No se llama "OpenDyslexic" para no chocar
 *  con un sitio host que ya tenga su propio @font-face con ese nombre. */
export const OPEN_DYSLEXIC_FAMILY = 'ModoaOpenDyslexic';
`;

await writeFile(join(OUT_DIR, 'font-meta.ts'), meta, 'utf8');

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log(`Caracteres conservados  : ${[...charset].length}`);
console.log(`woff2 original          : ${kb(original.length)}`);
console.log(`woff2 subseteado        : ${kb(subset.length)}`);
console.log(`Reducción               : ${(100 - (subset.length / original.length) * 100).toFixed(1)}%`);
console.log(`Asset                   : ${OUT_DIR}/${fileName}`);
