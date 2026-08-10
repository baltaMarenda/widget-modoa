import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const DIST_URL = '/dist/widget.js';
const FONT_DIR = 'src/features/dyslexia-font';

/**
 * Copia el .woff2 de OpenDyslexic a dist/ como archivo suelto.
 *
 * La fuente NO va embebida en el bundle: son ~32 KB que solo tienen que bajar
 * cuando alguien prende la feature. El widget la pide en runtime resolviendo la
 * URL contra la ubicación de su propio <script>.
 *
 * El nombre lleva hash de contenido y lo genera tools/build-font.mjs, que
 * escribe el mismo valor en font-meta.ts para que runtime y archivo no se
 * desincronicen.
 */
function emitFontAsset(): Plugin {
  return {
    name: 'modoa:emit-font-asset',
    buildStart() {
      const dir = resolve(process.cwd(), FONT_DIR);
      const fonts = readdirSync(dir).filter((name) => name.endsWith('.woff2'));

      if (fonts.length !== 1) {
        this.error(
          `Se esperaba exactamente un .woff2 en ${FONT_DIR}, hay ${fonts.length}. ` +
            'Corré `npm run font`.',
        );
      }

      const fileName = fonts[0]!;
      this.emitFile({
        type: 'asset',
        fileName,
        source: readFileSync(resolve(dir, fileName)),
      });
    },
  };
}

/**
 * Sirve dist/widget.js crudo, tal cual salió del build.
 *
 * Sin esto, el dev server de Vite trata a dist/widget.js como un módulo fuente:
 * lo transforma y lo cachea. La demo en modo `?dist` terminaba validando una
 * copia procesada y desactualizada en lugar del artefacto que reciben los
 * clientes — exactamente lo que ese modo existe para evitar.
 */
function serveRawBundle(): Plugin {
  return {
    name: 'modoa:serve-raw-bundle',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if ((req.url ?? '').split('?')[0] !== DIST_URL) return next();
        try {
          const file = readFileSync(resolve(process.cwd(), 'dist/widget.js'));
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store, must-revalidate');
          res.end(file);
        } catch {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          res.end('console.error("[modoa-a11y] Falta dist/widget.js. Corré: npm run build");');
        }
      });
    },
  };
}

export default defineConfig({
  // El root es la raíz del repo para que `demo/` y `dist/` sean servibles en dev.
  publicDir: false,
  plugins: [serveRawBundle(), emitFontAsset()],
  server: {
    open: '/demo/index.html',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2019',
    minify: 'esbuild',
    // Todo el CSS del widget se importa con `?inline` y viaja dentro del JS.
    cssCodeSplit: false,
    lib: {
      entry: 'src/main.ts',
      formats: ['iife'],
      name: 'ModoaA11yWidget',
      fileName: () => 'widget.js',
    },
    rollupOptions: {
      output: {
        // Un único archivo, sin chunks ni assets sueltos.
        inlineDynamicImports: true,
        assetFileNames: 'widget.[ext]',
      },
    },
  },
});
