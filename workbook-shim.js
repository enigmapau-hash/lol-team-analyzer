(() => {
  const WORKBOOK_REMOTE =
    'https://raw.githubusercontent.com/enigmapau-hash/lol-team-analyzer/main/Draft%20Pool.xlsx';
  const WORKBOOK_LOCAL = 'Draft%20Pool.xlsx';
  const TIMEOUT_MS = 15000;

  if (typeof window.fetch !== 'function') return;

  const originalFetch = window.fetch.bind(window);

  function toUrlString(resource) {
    if (typeof resource === 'string') return resource;
    if (resource && typeof resource.url === 'string') return resource.url;
    return String(resource || '');
  }

  function timeoutPromise(resourceLabel, ms) {
    return new Promise((_, reject) => {
      window.setTimeout(() => {
        reject(new Error(`Fetch timeout: ${resourceLabel}`));
      }, ms);
    });
  }

  window.fetch = function fetchWithWorkbookFallback(resource, init) {
    const url = toUrlString(resource);
    const normalized = url.replace(/\s+/g, '%20');

    if (normalized === WORKBOOK_REMOTE || normalized.endsWith('/Draft%20Pool.xlsx')) {
      return originalFetch(WORKBOOK_LOCAL, init);
    }

    if (normalized === WORKBOOK_LOCAL || normalized.endsWith('/Draft Pool.xlsx')) {
      return originalFetch(WORKBOOK_LOCAL, init);
    }

    return Promise.race([
      originalFetch(resource, init),
      timeoutPromise(url || 'unknown resource', TIMEOUT_MS),
    ]);
  };
})();
