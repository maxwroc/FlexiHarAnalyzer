import { defineConfig, Plugin } from 'vite'
import preact from '@preact/preset-vite'
import { version } from './package.json'
import fs from 'node:fs'
import path from 'node:path'

function examplesPlugin(): Plugin {
  let examplesDir: string;
  let manifest: { name: string; harFile: string; parsers: { name: string; path: string }[] }[] = [];

  function scanExamples() {
    if (!fs.existsSync(examplesDir)) return [];
    const result: typeof manifest = [];
    const folders = fs.readdirSync(examplesDir, { withFileTypes: true })
      .filter(d => d.isDirectory());

    for (const folder of folders) {
      const folderPath = path.join(examplesDir, folder.name);
      const files = fs.readdirSync(folderPath);

      const harFile = files.find(f => f.endsWith('.har'));
      const parsers = files.filter(f => f.endsWith('.js'));

      if (harFile) {
        result.push({
          name: folder.name,
          harFile: `${folder.name}/${harFile}`,
          parsers: parsers.map(p => ({ name: p, path: `${folder.name}/${p}` })),
        });
      }
    }

    return result;
  }

  return {
    name: 'examples-plugin',

    configResolved(config) {
      examplesDir = path.resolve(config.root, 'examples');
      manifest = scanExamples();
    },

    resolveId(id) {
      if (id === 'virtual:examples') return '\0virtual:examples';
    },

    load(id) {
      if (id !== '\0virtual:examples') return;
      return `export default ${JSON.stringify(manifest)}`;
    },

    configureServer(server) {
      server.middlewares.use(server.config.base + 'examples', (req, res, next) => {
        const reqUrl = (req as any).url as string | undefined;
        if (!reqUrl) return next();
        const decodedUrl = decodeURIComponent(reqUrl.split('?')[0]);
        const filePath = path.resolve(examplesDir, '.' + decodedUrl);

        if (!filePath.startsWith(examplesDir + path.sep)) {
          res.statusCode = 403;
          res.end('Forbidden');
          return;
        }

        try {
          const stat = fs.statSync(filePath);
          if (stat.isFile()) {
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Length', stat.size.toString());
            fs.createReadStream(filePath).pipe(res);
          } else {
            next();
          }
        } catch {
          next();
        }
      });
    },

    generateBundle() {
      for (const example of manifest) {
        const harFullPath = path.join(examplesDir, example.harFile);
        if (fs.existsSync(harFullPath)) {
          this.emitFile({
            type: 'asset',
            fileName: `examples/${example.harFile}`,
            source: fs.readFileSync(harFullPath),
          });
        }
        for (const parser of example.parsers) {
          const parserFullPath = path.join(examplesDir, parser.path);
          if (fs.existsSync(parserFullPath)) {
            this.emitFile({
              type: 'asset',
              fileName: `examples/${parser.path}`,
              source: fs.readFileSync(parserFullPath),
            });
          }
        }
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  base: "/FlexiHarAnalyzer/",
  plugins: [preact(), examplesPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
})
