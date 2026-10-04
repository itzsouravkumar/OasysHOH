(() => {
  let saved;
  try { saved = localStorage.getItem('oasys-theme'); } catch (_) {}
  document.documentElement.dataset.theme = saved === 'dark' ? 'dark' : 'light';
  document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('theme-toggle');
    const label = document.getElementById('theme-label');
    function sync() {
      const dark = document.documentElement.dataset.theme === 'dark';
      label.textContent = dark ? 'DARK' : 'LIGHT';
      button.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
      button.setAttribute('aria-pressed', String(dark));
    }
    button.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('oasys-theme', next); } catch (_) {}
      sync();
    });
    sync();
  });
})();
