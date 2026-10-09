import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

function vercelApiPlugin() {
  return {
    name: 'vercel-api-middleware',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url?.startsWith('/api/pluggy/')) {
          return next();
        }

        try {
          const urlObj = new URL(req.url, 'http://localhost');
          const pathname = urlObj.pathname;
          
          let handlerModule: any = null;
          if (pathname === '/api/pluggy/connect-token') {
            handlerModule = await import('./api/pluggy/connect-token.ts');
          } else if (pathname === '/api/pluggy/items') {
            handlerModule = await import('./api/pluggy/items.ts');
          } else if (pathname === '/api/pluggy/item-details') {
            handlerModule = await import('./api/pluggy/item-details.ts');
          } else if (pathname === '/api/pluggy/delete-item') {
            handlerModule = await import('./api/pluggy/delete-item.ts');
          }

          if (!handlerModule || !handlerModule.default) {
            return next();
          }

          const handler = handlerModule.default;

          let body = '';
          req.on('data', (chunk: any) => {
            body += chunk;
          });
          req.on('end', async () => {
            if (body) {
              try {
                req.body = JSON.parse(body);
              } catch {
                req.body = body;
              }
            } else {
              req.body = {};
            }
            req.query = Object.fromEntries(urlObj.searchParams.entries());

            res.status = (code: number) => {
              res.statusCode = code;
              return res;
            };
            res.json = (data: any) => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
              return res;
            };

            await handler(req, res);
          });
        } catch (err: any) {
          console.error('API middleware error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message || 'Erro no servidor local.' }));
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), vercelApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || '.', '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
