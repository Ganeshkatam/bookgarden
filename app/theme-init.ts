/**
 * Inline pre-hydration script to resolve the initial theme before React mounts.
 * This prevents theme flashing while strictly obeying cookie-first privacy rules:
 * 1. Checks consent choice from cookies first, then localStorage fallback.
 * 2. If functional consent has not been explicitly granted (or was rejected),
 *    never reads stored theme preferences and strictly follows OS system preference.
 * 3. If functional consent is active, reads theme from cookie first, then localStorage fallback.
 */
export const themeInitScript = `
  (function() {
    try {
      var consent = null;
      var cookieStr = document.cookie || '';
      var cookies = cookieStr ? cookieStr.split('; ') : [];
      var consentPrefix = 'bookgarden_cookie_consent=';

      for (var i = 0; i < cookies.length; i++) {
        if (cookies[i].indexOf(consentPrefix) === 0) {
          try {
            consent = JSON.parse(decodeURIComponent(cookies[i].substring(consentPrefix.length)));
          } catch(e) {}
          break;
        }
      }

      if (!consent && window.localStorage) {
        try {
          var rawLs = window.localStorage.getItem('bookgarden_cookie_consent');
          if (rawLs) consent = JSON.parse(rawLs);
        } catch(e) {}
      }

      var saved = null;
      // Only read persistent preference if functional storage was explicitly consented
      if (consent && consent.functional === true) {
        var themePrefix = 'theme=';
        var bgThemePrefix = 'bookgarden-theme=';

        for (var j = 0; j < cookies.length; j++) {
          if (cookies[j].indexOf(themePrefix) === 0) {
            saved = decodeURIComponent(cookies[j].substring(themePrefix.length));
            break;
          } else if (cookies[j].indexOf(bgThemePrefix) === 0) {
            saved = decodeURIComponent(cookies[j].substring(bgThemePrefix.length));
            break;
          }
        }

        if (!saved && window.localStorage) {
          try {
            saved = window.localStorage.getItem('theme') || window.localStorage.getItem('bookgarden-theme');
          } catch(e) {}
        }
      }

      var currentTheme = saved || 'system';
      var isDark = currentTheme === 'dark' || (currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {}
  })();
`;
