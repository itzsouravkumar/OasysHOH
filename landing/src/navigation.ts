/** Product pages are served by the broker, not the landing SPA. */
export function productHref(path: string): string {
  if (!path.startsWith('/docs')) return path;
  const { hostname, port } = window.location;
  const localPreview = ['localhost', '127.0.0.1', '[::1]'].includes(hostname) && port !== '8787';
  return `${localPreview ? 'http://127.0.0.1:8787' : ''}${path}`;
}

// Recover old bookmarks when a standalone preview falls back to index.html.
export function recoverProductRoute(): boolean {
  if (!/^\/(docs)(\/|$)/.test(window.location.pathname)) return false;
  const target = productHref(window.location.pathname + window.location.search + window.location.hash);
  if (!target.startsWith('http://127.0.0.1:8787')) return false;
  window.location.replace(target);
  return true;
}
