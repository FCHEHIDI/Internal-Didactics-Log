(function () {
  'use strict';

  const explicitBase = String(window.IDL_API_BASE_URL || '').trim();
  const configBase = String(window.IDL_API_CONFIG?.apiBaseUrl || '').trim();
  const host = String(window.location.hostname || '').toLowerCase();
  const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  window.IDL_API_BASE_URL = explicitBase || configBase || (isLocalHost
    ? ''
    : 'https://internal-didactics-log-api-737409422048.europe-west1.run.app');

  window.idlApiUrl = function (path) {
    const normalizedPath = String(path || '').startsWith('/') ? String(path || '') : '/' + String(path || '');
    if (!window.IDL_API_BASE_URL) {
      return normalizedPath;
    }

    return window.IDL_API_BASE_URL.replace(/\/+$/, '') + normalizedPath;
  };
})();
