import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// In `npm run dev`, serve api/tutor.js the way Vercel does in production.
const localApi = () => ({
  name: 'local-api',
  configureServer(server) {
    server.middlewares.use('/api/tutor', async (req, res) => {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      const { default: handler } = await server.ssrLoadModule('/api/tutor.js');
      req.body = raw ? JSON.parse(raw) : {};
      res.status = (code) => { res.statusCode = code; return res; };
      res.json = (data) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); };
      await handler(req, res);
    });
  },
});

export default defineConfig({ plugins: [react(), tailwindcss(), localApi()] });
