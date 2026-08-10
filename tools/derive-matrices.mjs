/**
 * Deriva las matrices de corrección (daltonización) que usa el widget.
 *
 *   npm run matrices
 *
 * No se ejecuta en el build: es la fuente de verdad de dónde salen los números
 * que están hardcodeados en src/features/colorblind/matrices.ts. Si alguna vez
 * hay que tocar la severidad o la redistribución de error, se cambia acá, se
 * corre, y se pega la salida.
 *
 * ---------------------------------------------------------------------------
 * FUENTES
 *
 * [1] Machado, G. M., Oliveira, M. M., Fradinho, L. A. F. (2009).
 *     "A Physiologically-based Model for Simulation of Color Vision Deficiency".
 *     IEEE Transactions on Visualization and Computer Graphics, 15(6), 1291-1298.
 *     https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html
 *
 *     De ahí salen las matrices de SIMULACIÓN a severidad 1.0 (dicromacia
 *     completa). Operan sobre RGB LINEAL, no sobre sRGB con gamma.
 *
 * [2] Fidaner, O., Lin, P., Ozguven, N. "Analysis of Color Blindness".
 *     Stanford University. El algoritmo clásico de daltonización: simular,
 *     calcular el error, redistribuirlo a los canales que la persona sí ve.
 *
 * ---------------------------------------------------------------------------
 * IMPORTANTE: el paper [1] publica matrices de SIMULACIÓN, no de corrección.
 * No existen matrices de corrección "publicadas" de Machado et al. La matriz
 * de redistribución de error E es una heurística, no física — viene de [2].
 * Por eso la derivación vive acá, explícita y reproducible, en vez de aparecer
 * como una constante mágica en el código.
 */

/* Simulación a severidad 1.0, de [1]. Filas = R,G,B de salida. */
const SIMULATION = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

/**
 * Redistribución de error. Heurística, no física.
 *
 * Protan/deutan: el error vive en el eje rojo-verde y se vuelca a verde y azul,
 * que son los canales discriminables. Es la matriz clásica de [2].
 *
 * Tritan: el error vive en el eje azul-amarillo. La matriz de [2] no aplica —
 * volcaría el error a un canal que la persona tampoco distingue bien. La
 * reflejamos para mandar el error del azul hacia rojo y verde. Es una
 * adaptación nuestra, no un valor publicado.
 */
const ERROR_SHIFT = {
  protanopia: [
    [0, 0, 0],
    [0.7, 1, 0],
    [0.7, 0, 1],
  ],
  deuteranopia: [
    [0, 0, 0],
    [0.7, 1, 0],
    [0.7, 0, 1],
  ],
  tritanopia: [
    [1, 0, 0.7],
    [0, 1, 0.7],
    [0, 0, 0],
  ],
};

const IDENTITY = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

const multiply = (a, b) =>
  a.map((row, i) =>
    b[0].map((_, j) => row.reduce((sum, v, k) => sum + v * b[k][j], 0)),
  );

const subtract = (a, b) => a.map((row, i) => row.map((v, j) => v - b[i][j]));
const add = (a, b) => a.map((row, i) => row.map((v, j) => v + b[i][j]));

/**
 * corregido = original + E · (original - S · original)
 *           = [I + E · (I - S)] · original
 *
 * Toda la cadena es lineal, así que colapsa en UNA matriz 3x3.
 */
function correctionMatrix(type) {
  const S = SIMULATION[type];
  const E = ERROR_SHIFT[type];
  return add(IDENTITY, multiply(E, subtract(IDENTITY, S)));
}

/**
 * Acromatopsia: no es corrección, no hay color que redistribuir. Es luminancia
 * relativa Rec.709 / sRGB (IEC 61966-2-1), definida sobre RGB lineal — que es
 * justo el espacio en el que corre el filtro.
 */
const LUMINANCE = [
  [0.2126, 0.7152, 0.0722],
  [0.2126, 0.7152, 0.0722],
  [0.2126, 0.7152, 0.0722],
];

const fmt = (n) => {
  const r = Number(n.toFixed(6));
  return (Object.is(r, -0) ? 0 : r).toString();
};

/** 3x3 -> las 20 componentes que pide feColorMatrix type="matrix". */
function toFeColorMatrix(m) {
  return [
    [...m[0], 0, 0],
    [...m[1], 0, 0],
    [...m[2], 0, 0],
    [0, 0, 0, 1, 0],
  ];
}

const results = {
  protanopia: correctionMatrix('protanopia'),
  deuteranopia: correctionMatrix('deuteranopia'),
  tritanopia: correctionMatrix('tritanopia'),
  achromatopsia: LUMINANCE,
};

console.log('// Generado por tools/derive-matrices.mjs — no editar a mano.\n');
for (const [type, m] of Object.entries(results)) {
  const rows = toFeColorMatrix(m);
  console.log(`  ${type}: [`);
  for (const row of rows) {
    console.log(`    ${row.map(fmt).join(', ')},`);
  }
  console.log('  ],');
}

console.log('\n// --- verificación: a dónde va el blanco puro (1,1,1) ---');
for (const [type, m] of Object.entries(results)) {
  const white = m.map((row) => row.reduce((s, v) => s + v, 0));
  console.log(`// ${type.padEnd(14)} ${white.map((v) => v.toFixed(4)).join(', ')}`);
}
