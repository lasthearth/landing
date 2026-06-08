import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        target: 'es2015',
        outDir: 'dist',
    },
    server: {
        port: 4200,
        allowedHosts: ['lasthearth.ru'],
    },
});
