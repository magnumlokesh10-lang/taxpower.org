(() => {
  const NAV_CACHE_KEY = 'taxpower-navigation-v1';
  const navigationRequest = fetch('nav.html', {
    cache: 'force-cache',
    credentials: 'omit'
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`Unable to load nav.html: ${response.status}`);
    }
    return response.text();
  });

  const commonHeadMarkup = `
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
    <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
    <link class="favicon-node" rel="icon" type="image/png" href="asset/taxpower_icon.png">
    <meta name="author" content="TaxPower">
  `;

  function appendCommonHead() {
    const template = document.createElement('template');
    template.innerHTML = commonHeadMarkup.trim();
    document.head.appendChild(template.content.cloneNode(true));
  }

  function renderNavigation(slot, html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    slot.replaceWith(template.content.cloneNode(true));
    window.taxPowerNavigationLoaded = true;
    document.dispatchEvent(new CustomEvent('taxpower:navigation-loaded'));
  }

  async function loadSharedNavigation() {
    const slot = document.querySelector('[data-nav-slot]');
    if (!slot) return;

    let cachedNavigation = '';
    try {
      cachedNavigation = sessionStorage.getItem(NAV_CACHE_KEY) || '';
    } catch (error) {
      console.warn('Navigation cache is unavailable.', error);
    }

    if (cachedNavigation) {
      renderNavigation(slot, cachedNavigation);
      navigationRequest.then((html) => {
        try {
          sessionStorage.setItem(NAV_CACHE_KEY, html);
        } catch (error) {
          console.warn('Navigation cache could not be refreshed.', error);
        }
      }).catch(console.error);
      return;
    }

    try {
      const html = await navigationRequest;
      try {
        sessionStorage.setItem(NAV_CACHE_KEY, html);
      } catch (error) {
        console.warn('Navigation cache could not be saved.', error);
      }
      renderNavigation(slot, html);
    } catch (error) {
      console.error(error);
      slot.innerHTML = '<p class="nav-load-error">Navigation could not be loaded.</p>';
    }
  }

  appendCommonHead();
  loadSharedNavigation();
})();
