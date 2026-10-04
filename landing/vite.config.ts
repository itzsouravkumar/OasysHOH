import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
const backend = 'http://127.0.0.1:8787';
const proxy = Object.fromEntries(['/console', '/api', '/static', '/docs'].map(path => [path, backend]));
export default defineConfig({ plugins: [react()], server: { proxy }, preview: { proxy } });
