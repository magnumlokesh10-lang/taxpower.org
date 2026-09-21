/**
 * taxpower compliance platform interface interactions controller
 * includes: layout slider engine, dynamic navigation background transitions & mobile hamburger system
 */

function initTaxPowerSite() {
  if (window.taxPowerSiteInitialized) return;
  window.taxPowerSiteInitialized = true;

  // module 00: reusable animated site background
  let siteBackground = document.querySelector('[data-site-background]');
  let squaresContainer = document.querySelector('[data-site-background-squares]');
  const backgroundReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (!siteBackground) {
    siteBackground = document.querySelector('.global-site-bg');
  }

  if (siteBackground) {
    siteBackground.classList.add('site-grid-background');
    siteBackground.setAttribute('data-site-background', '');
    siteBackground.setAttribute('aria-hidden', 'true');
  }

  if (siteBackground && !siteBackground.querySelector('.grid-blueprint')) {
    const gridBlueprint = document.createElement('div');
    gridBlueprint.className = 'grid-blueprint';
    siteBackground.appendChild(gridBlueprint);
  }

  if (siteBackground && !squaresContainer) {
    squaresContainer = siteBackground.querySelector('.grid-squares-layer');
  }

  if (siteBackground && !squaresContainer) {
    squaresContainer = document.createElement('div');
    squaresContainer.className = 'grid-squares-layer';
    squaresContainer.setAttribute('data-site-background-squares', '');
    siteBackground.appendChild(squaresContainer);
  }

  if (!siteBackground && document.body) {
    siteBackground = document.createElement('div');
    siteBackground.className = 'global-site-bg site-grid-background';
    siteBackground.setAttribute('data-site-background', '');
    siteBackground.setAttribute('aria-hidden', 'true');

    const gridBlueprint = document.createElement('div');
    gridBlueprint.className = 'grid-blueprint';
    squaresContainer = document.createElement('div');
    squaresContainer.className = 'grid-squares-layer';
    squaresContainer.setAttribute('data-site-background-squares', '');

    siteBackground.append(gridBlueprint, squaresContainer);
    document.body.prepend(siteBackground);
  }

  if (siteBackground && squaresContainer) {
    const squareSize = 44;
    const allSquares = [];
    let flashTimer = null;
    let mouseMoveFrame = null;

    function triggerNextRandomFlash() {
      if (!allSquares.length) return;

      const availableSquares = allSquares.filter((squareData) => !squareData.hasFlashed);

      // Original logic: jab saare squares flash ho jaayein, saare reset karke ek cycle complete karo
      if (availableSquares.length === 0) {
        allSquares.forEach(sq => sq.hasFlashed = false);
        return;
      }

      const selectedSquare = availableSquares[Math.floor(Math.random() * availableSquares.length)];
      selectedSquare.hasFlashed = true;

      const flashColors = ['indigo-flash', 'teal-flash', 'honey-flash', 'sky-flash'];
      const designColorType = flashColors[Math.floor(Math.random() * flashColors.length)];
      selectedSquare.element.classList.remove('indigo-flash', 'teal-flash', 'honey-flash', 'sky-flash');
      void selectedSquare.element.offsetWidth; // force reflow to restart animation cleanly
      selectedSquare.element.classList.add(designColorType);
      selectedSquare.element.addEventListener('animationend', () => {
        selectedSquare.element.classList.remove(designColorType);
        selectedSquare.hasFlashed = false;
      }, { once: true });
    }

    function buildBackgroundSquares() {
      squaresContainer.innerHTML = '';
      allSquares.length = 0;

      // offsetWidth/Height 0 ho sakta hai agar layout abhi paint nahi hua — fallback to viewport
      const gridWidth = squaresContainer.offsetWidth || window.innerWidth;
      const gridHeight = squaresContainer.offsetHeight || window.innerHeight;
      const columns = Math.ceil(gridWidth / squareSize);
      const rows = Math.ceil(gridHeight / squareSize);
      const totalBoxes = columns * rows;

      for (let i = 0; i < totalBoxes; i++) {
        const square = document.createElement('div');
        square.classList.add('dynamic-square');
        squaresContainer.appendChild(square);
        allSquares.push({
          element: square,
          hasFlashed: false
        });
      }
    }

    function startBackgroundFlash() {
      if (!flashTimer && !backgroundReducedMotion.matches) {
        flashTimer = setInterval(triggerNextRandomFlash, 220);
      }
    }

    function stopBackgroundFlash() {
      if (flashTimer) {
        clearInterval(flashTimer);
        flashTimer = null;
      }
    }

    window.addEventListener('mousemove', (event) => {
      const rect = siteBackground.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (mouseMoveFrame) return;

      mouseMoveFrame = requestAnimationFrame(() => {
        siteBackground.style.setProperty('--site-mouse-x', `${x}px`);
        siteBackground.style.setProperty('--site-mouse-y', `${y}px`);
        mouseMoveFrame = null;
      });
    });

    window.addEventListener('resize', () => {
      buildBackgroundSquares();
    });

    // Double rAF: layout fully paint hone ke baad squares build karo (original demo mein sync tha)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        buildBackgroundSquares();
        startBackgroundFlash();

        if (!backgroundReducedMotion.matches) {
          for (let i = 0; i < 15; i++) {
            setTimeout(triggerNextRandomFlash, i * 150);
          }
        }
      });
    });

    backgroundReducedMotion.addEventListener('change', () => {
      stopBackgroundFlash();
      startBackgroundFlash();
    });
  }

  // module 01: accessible slider management
  let activeIndex = 0;
  const sliderTrack = document.getElementById('sliderTrack');
  const slides = Array.from(document.querySelectorAll('.hero-slide-item'));
  const totalSlides = slides.length;
  const dotsContainer = document.getElementById('dotsContainer');
  const pauseBtn = document.getElementById('sliderPauseBtn');
  const sliderViewport = document.querySelector('.slider-viewport');
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const autoSlideDuration = 7000;
  let isUserPaused = reducedMotionQuery.matches;

  if (pauseBtn) {
    pauseBtn.setAttribute('aria-label', isUserPaused ? 'Resume auto-rotation' : 'Pause auto-rotation');
    pauseBtn.classList.toggle('is-paused', isUserPaused);
  }

  // dynamic pagination dots generation dynamically
  if (dotsContainer) {
    for (let i = 0; i < totalSlides; i++) {
      const dotElement = document.createElement('button');
      dotElement.type = 'button';
      dotElement.classList.add('dot');
      dotElement.style.setProperty('--progress-duration', `${autoSlideDuration}ms`);
      dotElement.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dotElement.setAttribute('aria-current', i === 0 ? 'true' : 'false');
      if (i === 0) dotElement.classList.add('active-dot');
      dotElement.addEventListener('click', () => jumpToSlide(i));
      dotsContainer.appendChild(dotElement);
    }
  }

  const dotsList = Array.from(document.querySelectorAll('.dot'));
  let autoSlideTimer = null;

  // Auto slide run karne ka helper function
  function startAutoSlide() {
    if (totalSlides > 1 && !autoSlideTimer && !isUserPaused && !reducedMotionQuery.matches) {
      sliderViewport?.classList.remove('is-autoplay-paused');
      autoSlideTimer = setInterval(() => changeSlide(1), autoSlideDuration);
    }
  }

  // Auto slide pause karne ka helper function
  function stopAutoSlide() {
    if (autoSlideTimer) {
      clearInterval(autoSlideTimer);
      autoSlideTimer = null;
    }
    sliderViewport?.classList.add('is-autoplay-paused');
  }

  // function to process slide layout translate recalculations
  function updateSliderView() {
    if (!sliderTrack) return;
    sliderTrack.style.transform = `translateX(-${activeIndex * 100}%)`;

    dotsList.forEach((dot, idx) => {
      dot.classList.remove('active-dot');
      dot.setAttribute('aria-current', String(idx === activeIndex));
      if (idx === activeIndex) dot.classList.add('active-dot');
    });

    slides.forEach((slide, idx) => {
      const isActive = idx === activeIndex;
      slide.setAttribute('aria-hidden', String(!isActive));
      slide.toggleAttribute('inert', !isActive);
    });

  }

  // function to advance slide increments via control parameters
  function changeSlide(direction) {
    stopAutoSlide();
    activeIndex = (activeIndex + direction + totalSlides) % totalSlides;
    updateSliderView();
    startAutoSlide();
  }

  // direct jump action via dot selectors points
  function jumpToSlide(index) {
    stopAutoSlide();
    activeIndex = index;
    updateSliderView();
    startAutoSlide();
  }

  // connecting interface hardware event listeners triggers
  pauseBtn?.addEventListener('click', () => {
    isUserPaused = !isUserPaused;
    pauseBtn.setAttribute('aria-pressed', String(isUserPaused));
    pauseBtn.setAttribute('aria-label', isUserPaused ? 'Resume auto-rotation' : 'Pause auto-rotation');
    pauseBtn.classList.toggle('is-paused', isUserPaused);
    stopAutoSlide();
    startAutoSlide();
  });

  sliderViewport?.addEventListener('focusin', stopAutoSlide);
  sliderViewport?.addEventListener('focusout', (event) => {
    if (!sliderViewport.contains(event.relatedTarget)) startAutoSlide();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAutoSlide();
    else startAutoSlide();
  });

  updateSliderView();
  startAutoSlide();

  // module 01b: trusted company logo marquee hover focus
  const companyLogoMarquee = document.querySelector('.company-logo-marquee');
  const companyLogoCards = Array.from(document.querySelectorAll('.company-logo-card'));

  if (companyLogoMarquee && companyLogoCards.length) {
    function clearLogoFocus() {
      companyLogoMarquee.classList.remove('is-logo-hovered');
      companyLogoCards.forEach((card) => {
        card.classList.remove('is-active-logo');
      });
    }

    companyLogoCards.forEach((card) => {
      card.addEventListener('mouseenter', () => {
        companyLogoMarquee.classList.add('is-logo-hovered');
        companyLogoCards.forEach((logoCard) => {
          logoCard.classList.toggle('is-active-logo', logoCard === card);
        });
      });
    });

    companyLogoMarquee.addEventListener('mouseleave', clearLogoFocus);
    companyLogoMarquee.addEventListener('blur', clearLogoFocus, true);
  }


  // module 02: premium navbar smooth sliding tracker background
  const navbarLogo = document.querySelector('[data-logo-home-link]');
  const navLinksContainer = document.getElementById('navLinksContainer');
  const navSlidingBg = document.getElementById('navSlideBg');
  const navItems = document.querySelectorAll('.nav-item');
  const navDropdowns = document.querySelectorAll('.nav-dropdown');
  let currentActiveTab = document.querySelector('.nav-item.h-current');
  let hasPositionedNavIndicator = false;
  let hasInitializedScrollSpy = false;

  // Programmatic navigation lock state
  let isNavClickScrolling = false;
  let navClickTargetItem = null;
  let navScrollEndTimer = null;
  let navScrollSafetyTimer = null;
  const mobileBreakpoint = 1100;

  // Click guard: prevents mouseleave from snapping slider back immediately after a click
  let navClickJustHappened = false;
  let navClickGuardTimer = null;
  let navClickStartTime = 0;

  const sectionToNavPageMap = {
    home: 'index.html',
    taxpowergst: 'taxpowergst.html',
    'gst-return': 'taxpowergst.html',
    'gst-einvoice': 'taxpowergst.html',
    taxpowertds: 'taxpowertds.html',
    pricing: 'pricing.html',
    'pricing-banner': 'pricing.html',
    downloads: 'downloads.html',
    'downloads-banner': 'downloads.html',
    aboutus: 'aboutus.html',
    support: 'support.html',
    'demo-enquiry': 'support.html'
  };

  // positions dynamic indicator block behind chosen targets element bounds
  function moveIndicator(element, shouldAnimate = true) {
    if (!navSlidingBg || !element || window.innerWidth <= mobileBreakpoint) return;

    if (!shouldAnimate) {
      navSlidingBg.classList.add('is-positioning-instantly');
    }

    const containerRect = navLinksContainer.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    // calculating offsets relative to wrapper boundaries coordinates
    const leftOffset = elementRect.left - containerRect.left;
    const topOffset = elementRect.top - containerRect.top;
    const elementWidth = elementRect.width;
    const elementHeight = elementRect.height;

    // assigning structural dimension values directly inline smoothly
    navSlidingBg.style.left = `${leftOffset}px`;
    navSlidingBg.style.top = `${topOffset}px`;
    navSlidingBg.style.width = `${elementWidth}px`;
    navSlidingBg.style.height = `${elementHeight}px`;
    navSlidingBg.style.opacity = '1';

    if (!shouldAnimate) {
      navSlidingBg.getBoundingClientRect();
      navSlidingBg.classList.remove('is-positioning-instantly');
    }
  }

  function setActiveNavItem(targetItem, shouldAnimate = true) {
    if (!targetItem) return;

    navItems.forEach((item) => {
      const isActive = item === targetItem;
      item.classList.toggle('h-current', isActive);
      if (isActive) {
        item.setAttribute('aria-current', 'page');
      } else {
        item.removeAttribute('aria-current');
      }
    });

    currentActiveTab = targetItem;
    moveIndicator(currentActiveTab, shouldAnimate);
  }

  function getCurrentPageName() {
    const pageName = window.location.pathname.split('/').pop();
    return pageName || 'index.html';
  }

  function getNavItemForCurrentLocation(hashValue = window.location.hash) {
    const rawHash = (hashValue || '').trim();
    const sectionId = rawHash.replace(/^#/, '');

    // 1. Direct href match among navItems
    if (rawHash) {
      for (const item of navItems) {
        const href = item.getAttribute('href') || '';
        if (href.endsWith(rawHash) || href === rawHash) {
          return item;
        }
      }
    }

    // 2. Map via sectionToNavPageMap
    const mappedPage = sectionToNavPageMap[sectionId] || getCurrentPageName();
    const matchedByPage = document.querySelector(`.nav-item[data-nav-page="${mappedPage}"]`);
    if (matchedByPage) return matchedByPage;

    // 3. Fallback to current page or home
    return document.querySelector(`.nav-item[data-nav-page="${getCurrentPageName()}"]`) ||
           document.querySelector('.nav-item[data-nav-page="index.html"]');
  }

  function setActiveNavFromLocation(hashValue) {
    const shouldAnimate = hasPositionedNavIndicator;
    setActiveNavItem(getNavItemForCurrentLocation(hashValue), shouldAnimate);
    hasPositionedNavIndicator = true;
  }

  function isIndexPage() {
    const pageName = getCurrentPageName();
    return pageName === 'index.html' || pageName === '' || pageName === '/';
  }

  function getSamePageSectionHash(linkElement) {
    const href = linkElement.getAttribute('href');
    if (!href || href === '#') return '';

    if (href.startsWith('#')) {
      return href;
    }

    try {
      const linkUrl = new URL(href, window.location.href);
      const currentUrl = new URL(window.location.href);
      const isSameOrigin = linkUrl.origin === currentUrl.origin;
      const isIndexTarget = linkUrl.pathname.endsWith('/index.html') || linkUrl.pathname === '/' || linkUrl.pathname === currentUrl.pathname;

      if (isSameOrigin && isIndexTarget && linkUrl.hash && isIndexPage()) {
        return linkUrl.hash;
      }
    } catch (e) {
      return '';
    }

    return '';
  }

  function focusDemoFullNameField(options = {}) {
    const form = document.getElementById('demoEnquiryForm');
    if (!form) return false;

    const modal = document.getElementById('demoEnquiryModal');
    if (modal) {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      modal.style.display = '';
    }

    const fullNameInput = document.getElementById('demoFullName') || form.querySelector('input[name="name"]');
    if (!fullNameInput) return false;

    const shouldPreventScroll = options.preventScroll ?? false;
    try {
      fullNameInput.focus({ preventScroll: shouldPreventScroll });
      const len = fullNameInput.value ? fullNameInput.value.length : 0;
      if (typeof fullNameInput.setSelectionRange === 'function') {
        fullNameInput.setSelectionRange(len, len);
      }
    } catch (e) {
      fullNameInput.focus();
    }
    return true;
  }

  function applyDemoContext(triggerElement) {
    if (!triggerElement || !(triggerElement instanceof Element)) return;

    const purpose = triggerElement.getAttribute('data-demo-purpose');
    const productStr = triggerElement.getAttribute('data-demo-product');

    // NOTE: Purpose of enquiry aur Product checkboxes ki auto-selection
    // abhi intentionally disable (commented out) ki gayi hai.
    // Jab bhi "Get Started" ya "Request Trial License" click hota tha,
    // to data-demo-purpose se purpose field auto-select hota tha (e.g. "Free Trial / Demo")
    // aur data-demo-product se matching product checkboxes auto-check hote the.
    // Code preserve kiya gaya hai — enable karne ke liye niche ke comment blocks hatao.

    /* --- Purpose of Enquiry Auto-Selection (disabled) ---
    if (purpose) {
      const hiddenSelect = document.getElementById('purposeSelectHidden');
      const triggerText = document.getElementById('purposeTriggerText');
      const dropdown = document.getElementById('purposeDropdown');
      const options = dropdown?.querySelectorAll('.purpose-option');

      if (hiddenSelect && triggerText && dropdown) {
        hiddenSelect.value = purpose;
        triggerText.textContent = purpose;
        dropdown.classList.add('has-value');

        options?.forEach((opt) => {
          const val = opt.dataset.value || opt.textContent.trim();
          const isSelected = val.toLowerCase() === purpose.toLowerCase();
          opt.classList.toggle('is-selected', isSelected);
          opt.setAttribute('aria-selected', String(isSelected));
          if (isSelected) {
            const optIcon = opt.querySelector('.purpose-option-icon')?.innerHTML;
            const triggerIcon = dropdown.querySelector('.purpose-trigger-icon');
            if (optIcon && triggerIcon) {
              triggerIcon.innerHTML = optIcon;
            }
          }
        });
        setPurposeFieldError(false);
      }
    }
    --- End Purpose Auto-Selection --- */

    // Product Checkboxes Auto-Selection — ENABLED
    // "Get Started" / "Request Trial License" pe click karne par data-demo-product se
    // matching product checkboxes automatically check ho jaate hain.
    if (productStr) {
      const form = document.getElementById('demoEnquiryForm');
      if (form) {
        const targetProducts = productStr.split(',').map((p) => p.trim().toLowerCase());
        const checkboxes = form.querySelectorAll('input[name="product"]');
        checkboxes.forEach((cb) => {
          const cbVal = cb.value.toLowerCase();
          const isMatch = targetProducts.some((tp) => cbVal.includes(tp) || tp.includes(cbVal));
          cb.checked = isMatch;
        });
        setProductFieldError(false);
        updateSubmitEnabled();
      }
    }

    // Suppress unused variable warning for purpose (still disabled above)
    void purpose;
  }

  function isDemoOrTrialTrigger(element) {
    if (!element || !(element instanceof Element)) return null;
    const trigger = element.closest('a, button, [role="button"]');
    if (!trigger) return null;

    const href = trigger.getAttribute('href') || '';
    if (href.endsWith('#demo-enquiry') || href.includes('#demo-enquiry')) return trigger;
    if (trigger.hasAttribute('data-demo-form-open')) return trigger;
    if (trigger.hasAttribute('data-demo-purpose') || trigger.hasAttribute('data-demo-product')) return trigger;

    const text = (trigger.textContent || '').trim().toLowerCase();
    if (
      text.includes('get started') ||
      text.includes('request trial license') ||
      text.includes('trial license') ||
      text.includes('live demo')
    ) {
      return trigger;
    }
    return null;
  }

  function handlePendingDemoHashOrContext() {
    if (window.location.hash !== '#demo-enquiry') return;

    try {
      const savedContext = sessionStorage.getItem('taxpower_demo_context');
      if (savedContext) {
        const parsed = JSON.parse(savedContext);
        const dummyTrigger = document.createElement('div');
        if (parsed.purpose) dummyTrigger.setAttribute('data-demo-purpose', parsed.purpose);
        if (parsed.product) dummyTrigger.setAttribute('data-demo-product', parsed.product);
        applyDemoContext(dummyTrigger);
        sessionStorage.removeItem('taxpower_demo_context');
      }
    } catch (e) {}

    const targetSection = document.getElementById('demo-enquiry') || document.getElementById('demoEnquiryModal');
    if (targetSection) {
      const targetTop = getSectionScrollTop(targetSection);
      window.scrollTo({ top: targetTop, behavior: 'smooth' });
    }

    focusDemoFullNameField({ preventScroll: true });
    setTimeout(() => focusDemoFullNameField({ preventScroll: false }), 350);
    setTimeout(() => focusDemoFullNameField({ preventScroll: false }), 850);
  }

  function finishNavClickScroll() {
    if (!isNavClickScrolling) return;
    isNavClickScrolling = false;

    if (navScrollEndTimer) {
      clearTimeout(navScrollEndTimer);
      navScrollEndTimer = null;
    }
    if (navScrollSafetyTimer) {
      clearTimeout(navScrollSafetyTimer);
      navScrollSafetyTimer = null;
    }

    if (navClickTargetItem) {
      setActiveNavItem(navClickTargetItem, true);
      navClickTargetItem = null;
    } else if (currentActiveTab) {
      moveIndicator(currentActiveTab, true);
    }

    if (window.location.hash === '#demo-enquiry') {
      focusDemoFullNameField({ preventScroll: false });
    }
  }

  function cancelNavClickScrollOnUserAction() {
    // Only cancel if at least 400ms have passed since the user clicked,
    // so trackpad or inertial wheel ticks don't prematurely abort the programmatic scroll!
    if (isNavClickScrolling && (Date.now() - navClickStartTime > 400)) {
      finishNavClickScroll();
    }
  }

  window.addEventListener('wheel', cancelNavClickScrollOnUserAction, { passive: true });
  window.addEventListener('touchstart', cancelNavClickScrollOnUserAction, { passive: true });

  function getHeaderOffset() {
    const headerEl = document.querySelector('.header');
    const headerHeight = headerEl ? headerEl.offsetHeight : 64;
    return headerHeight + 16;
  }

  function getSectionScrollTop(targetElement) {
    if (!targetElement) return 0;
    if (targetElement.id === 'home' || targetElement.tagName === 'BODY' || targetElement.tagName === 'HTML') {
      return 0;
    }

    let effectiveElement = targetElement;
    if (targetElement.id === 'pricing' || targetElement.id === 'pricing-banner') {
      effectiveElement = document.getElementById('pricing-banner') || targetElement;
    } else if (targetElement.id === 'downloads' || targetElement.id === 'downloads-banner') {
      effectiveElement = document.getElementById('downloads-banner') || targetElement;
    }

    const elementRect = effectiveElement.getBoundingClientRect();
    const absoluteTop = elementRect.top + window.scrollY;
    const offset = getHeaderOffset();
    return Math.max(0, Math.round(absoluteTop - offset));
  }

  function handleSamePageNavClick(event, linkElement, activeItem) {
    const sectionHash = getSamePageSectionHash(linkElement);
    if (!sectionHash) return false;

    let targetSection = document.querySelector(sectionHash);
    if (!targetSection) {
      if (sectionHash === '#gst-return' || sectionHash === '#gst-einvoice') {
        targetSection = document.getElementById('taxpowergst');
      } else if (sectionHash === '#pricing-banner') {
        targetSection = document.getElementById('pricing');
      } else if (sectionHash === '#downloads-banner') {
        targetSection = document.getElementById('downloads');
      }
    }

    if (!targetSection) {
      const onSectionsLoaded = () => {
        document.removeEventListener('taxpower:sections-loaded', onSectionsLoaded);
        handleSamePageNavClick(event, linkElement, activeItem);
      };
      document.addEventListener('taxpower:sections-loaded', onSectionsLoaded);
      return true;
    }

    event.preventDefault();
    resetDemoTriggerState();

    // Immediately move slider directly to the clicked tab
    setActiveNavItem(activeItem, true);

    // Firmly lock ScrollSpy during smooth programmatic scroll
    isNavClickScrolling = true;
    navClickTargetItem = activeItem;
    navClickStartTime = Date.now();

    if (typeof showHeader === 'function') {
      showHeader();
    }

    if (history.pushState) {
      history.pushState(null, '', sectionHash);
    }

    if (sectionHash === '#demo-enquiry') {
      applyDemoContext(linkElement);
      focusDemoFullNameField({ preventScroll: true });
      setTimeout(() => focusDemoFullNameField({ preventScroll: false }), 350);
      setTimeout(() => focusDemoFullNameField({ preventScroll: false }), 850);
    }

    const targetTop = getSectionScrollTop(targetSection);
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const clampedTargetTop = Math.min(targetTop, maxScroll);
    const currentScroll = Math.round(window.scrollY);

    if (navScrollEndTimer) clearTimeout(navScrollEndTimer);
    if (navScrollSafetyTimer) clearTimeout(navScrollSafetyTimer);

    if (Math.abs(currentScroll - clampedTargetTop) <= 4) {
      finishNavClickScroll();
      return true;
    }

    navScrollSafetyTimer = setTimeout(finishNavClickScroll, 1600);

    const onScrollCheck = () => {
      if (!isNavClickScrolling) {
        window.removeEventListener('scroll', onScrollCheck);
        return;
      }
      const current = Math.round(window.scrollY);
      if (Math.abs(current - clampedTargetTop) <= 6) {
        window.removeEventListener('scroll', onScrollCheck);
        finishNavClickScroll();
        return;
      }
      if (navScrollEndTimer) clearTimeout(navScrollEndTimer);
      navScrollEndTimer = setTimeout(() => {
        if (Date.now() - navClickStartTime > 450) {
          window.removeEventListener('scroll', onScrollCheck);
          finishNavClickScroll();
        }
      }, 250);
    };

    const onScrollEnd = () => {
      window.removeEventListener('scrollend', onScrollEnd);
      window.removeEventListener('scroll', onScrollCheck);
      finishNavClickScroll();
    };

    if ('onscrollend' in window) {
      window.addEventListener('scrollend', onScrollEnd, { once: true });
    }
    window.addEventListener('scroll', onScrollCheck, { passive: true });

    window.scrollTo({ top: clampedTargetTop, behavior: 'smooth' });
    return true;
  }

  navbarLogo?.addEventListener('click', (event) => {
    const homeNavItem = getNavItemForCurrentLocation('#home') || document.querySelector('.nav-item[data-nav-page="index.html"]');
    if (handleSamePageNavClick(event, navbarLogo, homeNavItem)) {
      return;
    }
  });

  function getActiveSectionFromScrollPosition() {
    const sectionIds = ['home', 'taxpowergst', 'taxpowertds', 'pricing', 'downloads', 'aboutus', 'support'];
    const headerOffset = getHeaderOffset();
    const maxScrollY = document.documentElement.scrollHeight - window.innerHeight;

    if (window.scrollY <= 60) {
      return 'home';
    }

    if (window.scrollY >= maxScrollY - 30) {
      return 'support';
    }

    let activeSectionId = 'home';

    for (const sectionId of sectionIds) {
      const section = document.getElementById(sectionId);
      if (!section) continue;

      const rect = section.getBoundingClientRect();
      if (rect.top <= headerOffset + 30) {
        activeSectionId = sectionId;
      }
    }

    return activeSectionId;
  }

  function initSectionScrollSpy() {
    if (!isIndexPage()) return;
    if (hasInitializedScrollSpy) return;

    const sectionIds = ['home', 'taxpowergst', 'taxpowertds', 'pricing', 'downloads', 'aboutus', 'support'];
    const sections = sectionIds
      .map((sectionId) => document.getElementById(sectionId))
      .filter(Boolean);

    if (sections.length < sectionIds.length) return;
    hasInitializedScrollSpy = true;

    const updateActiveSectionFromScroll = () => {
      if (isNavClickScrolling) return;

      const activeSectionId = getActiveSectionFromScrollPosition();
      if (!activeSectionId) return;

      const targetItem = getNavItemForCurrentLocation(`#${activeSectionId}`);
      if (targetItem && targetItem !== currentActiveTab) {
        setActiveNavItem(targetItem);
      }
    };

    updateActiveSectionFromScroll();
    window.addEventListener('scroll', updateActiveSectionFromScroll, { passive: true });
    window.addEventListener('resize', updateActiveSectionFromScroll);
  }

  // Helper: set click guard so mouseleave doesn't snap slider back right after click
  function setNavClickGuard() {
    navClickJustHappened = true;
    if (navClickGuardTimer) clearTimeout(navClickGuardTimer);
    navClickGuardTimer = setTimeout(() => {
      navClickJustHappened = false;
      navClickGuardTimer = null;
    }, 300);
  }

  // loop layout triggers bindings over links groups array elements
  navItems.forEach((item) => {
    item.addEventListener('mouseenter', () => {
      moveIndicator(item);
    });

    item.addEventListener('mouseleave', (event) => {
      // Ignore mouseleave briefly after a click or while click-scrolling
      if (navClickJustHappened || isNavClickScrolling) {
        if (currentActiveTab) moveIndicator(currentActiveTab);
        return;
      }

      const parentDropdown = item.closest('.nav-dropdown');
      if (parentDropdown && parentDropdown.contains(event.relatedTarget)) {
        return;
      }

      const activeTabFallback = document.querySelector('.nav-item.h-current') || currentActiveTab;
      if (activeTabFallback) {
        moveIndicator(activeTabFallback);
      } else {
        if (navSlidingBg) navSlidingBg.style.opacity = '0';
      }
    });

    item.addEventListener('click', (event) => {
      setNavClickGuard();
      const parentDropdown = item.closest('.nav-dropdown');
      if (parentDropdown && window.innerWidth <= 1180 && !parentDropdown.classList.contains('is-open')) {
        event.preventDefault();
        navDropdowns.forEach((dropdown) => dropdown.classList.toggle('is-open', dropdown === parentDropdown));
        return;
      }
      if (handleSamePageNavClick(event, item, item)) return;
      navDropdowns.forEach((dropdown) => dropdown.classList.remove('is-open'));
      setActiveNavItem(item);
    });
  });

  navDropdowns.forEach((dropdown) => {
    const dropdownToggle = dropdown.querySelector('.nav-dropdown-toggle');
    const dropdownLinks = dropdown.querySelectorAll('.nav-dropdown-link');

    dropdown.addEventListener('mouseenter', () => {
      moveIndicator(dropdownToggle);
    });

    dropdown.addEventListener('mouseleave', () => {
      // Ignore mouseleave briefly after a click or while click-scrolling
      if (navClickJustHappened || isNavClickScrolling) {
        if (currentActiveTab) moveIndicator(currentActiveTab);
        return;
      }

      const activeTabFallback = document.querySelector('.nav-item.h-current') || currentActiveTab;
      if (activeTabFallback) {
        moveIndicator(activeTabFallback);
      } else if (navSlidingBg) {
        navSlidingBg.style.opacity = '0';
      }
    });

    dropdownLinks.forEach((dropdownLink) => {
      dropdownLink.addEventListener('click', (event) => {
        setNavClickGuard();
        dropdown.classList.remove('is-open');
        if (handleSamePageNavClick(event, dropdownLink, dropdownToggle)) return;
        setActiveNavItem(dropdownToggle);
      });
    });
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.nav-dropdown')) {
      navDropdowns.forEach((dropdown) => dropdown.classList.remove('is-open'));
    }
  });

  // Global handler for other in-page hash links (e.g. hero CTA buttons)
  document.addEventListener('click', (event) => {
    const demoTrigger = isDemoOrTrialTrigger(event.target);
    if (demoTrigger) {
      const purpose = demoTrigger.getAttribute('data-demo-purpose');
      const product = demoTrigger.getAttribute('data-demo-product');
      if (purpose || product) {
        try {
          sessionStorage.setItem('taxpower_demo_context', JSON.stringify({ purpose, product }));
        } catch (e) {}
      }
    }

    const anchor = event.target.closest('a[href^="#"], a[href*="index.html#"]');
    if (!anchor) {
      if (demoTrigger) {
        const form = document.getElementById('demoEnquiryForm');
        if (form) {
          event.preventDefault();
          applyDemoContext(demoTrigger);
          const targetSection = document.getElementById('demo-enquiry') || document.getElementById('demoEnquiryModal');
          if (targetSection) {
            const targetTop = getSectionScrollTop(targetSection);
            window.scrollTo({ top: targetTop, behavior: 'smooth' });
          }
          focusDemoFullNameField({ preventScroll: true });
          setTimeout(() => focusDemoFullNameField({ preventScroll: false }), 400);
          setTimeout(() => focusDemoFullNameField({ preventScroll: false }), 850);
        }
      }
      return;
    }

    if (anchor.closest('.navbar') || anchor.hasAttribute('data-logo-home-link')) return;

    const hash = getSamePageSectionHash(anchor);
    if (!hash) return;

    const targetItem = getNavItemForCurrentLocation(hash);
    if (targetItem) {
      handleSamePageNavClick(event, anchor, targetItem);
    } else if (hash === '#demo-enquiry') {
      event.preventDefault();
      applyDemoContext(anchor);
      const targetSection = document.getElementById('demo-enquiry') || document.getElementById('demoEnquiryModal');
      if (targetSection) {
        const targetTop = getSectionScrollTop(targetSection);
        window.scrollTo({ top: targetTop, behavior: 'smooth' });
      }
      focusDemoFullNameField({ preventScroll: true });
      setTimeout(() => focusDemoFullNameField({ preventScroll: false }), 400);
      setTimeout(() => focusDemoFullNameField({ preventScroll: false }), 850);
    }
  });

  window.addEventListener('hashchange', () => {
    resetDemoTriggerState();
    setActiveNavFromLocation(window.location.hash);
    if (window.location.hash === '#demo-enquiry') {
      handlePendingDemoHashOrContext();
    }
  });

  requestAnimationFrame(() => {
    setActiveNavFromLocation(window.location.hash);
    initSectionScrollSpy();
    if (window.location.hash === '#demo-enquiry') {
      handlePendingDemoHashOrContext();
    }
  });

  document.addEventListener('taxpower:sections-loaded', () => {
    initSectionScrollSpy();
    setActiveNavFromLocation(window.location.hash);
    if (window.location.hash === '#demo-enquiry') {
      handlePendingDemoHashOrContext();
    }
  });

  // module 02b: live demo enquiry modal
  // Note: DOM elements are queried dynamically because the form is loaded asynchronously
  let gstStateInput = null;
  let gstStateCombobox = null;
  let gstStateDropdown = null;
  let gstStateItems = [];
  let activeGstStateIndex = -1;
  let visibleGstStateItems = [];
  let gstStateInitialized = false;
  let lastDemoTrigger = null;

  function setDemoStatus(message, isError = false) {
    const statusEl = document.getElementById('demoFormStatus');
    if (!statusEl) return;

    statusEl.textContent = message;
    statusEl.classList.toggle('is-error', isError);
  }

  function checkDropdownPosition(container, triggerElement) {
    if (!container || !triggerElement) return;
    const demoDialog = document.querySelector('.demo-form-dialog');
    const dialogRect = demoDialog ? demoDialog.getBoundingClientRect() : { bottom: window.innerHeight, top: 0 };
    const triggerRect = triggerElement.getBoundingClientRect();
    const spaceBelow = dialogRect.bottom - triggerRect.bottom;
    const spaceAbove = triggerRect.top - dialogRect.top;

    if (spaceBelow < 240 && spaceAbove > spaceBelow) {
      container.classList.add('opens-upward');
    } else {
      container.classList.remove('opens-upward');
    }
  }

  function closeGstStateDropdown() {
    gstStateCombobox?.classList.remove('is-open', 'opens-upward');
    gstStateInput?.setAttribute('aria-expanded', 'false');
    gstStateInput?.removeAttribute('aria-activedescendant');
    activeGstStateIndex = -1;
  }

  function selectGstState(item) {
    if (!gstStateInput || !item) return;

    gstStateInput.value = item.value;
    closeGstStateDropdown();
    setDemoStatus('');
  }

  function updateGstActiveOption(nextIndex) {
    if (!gstStateDropdown || !visibleGstStateItems.length) return;

    activeGstStateIndex = (nextIndex + visibleGstStateItems.length) % visibleGstStateItems.length;
    const optionButtons = Array.from(gstStateDropdown.querySelectorAll('.gst-state-option'));

    optionButtons.forEach((optionButton, index) => {
      const isActive = index === activeGstStateIndex;
      optionButton.classList.toggle('is-active', isActive);
      optionButton.setAttribute('aria-selected', String(isActive));
      if (isActive) {
        gstStateInput?.setAttribute('aria-activedescendant', optionButton.id);
        optionButton.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function renderGstStateOptions(searchValue = '') {
    if (!gstStateCombobox || !gstStateDropdown || !gstStateInput) return;

    const normalizedSearch = searchValue.trim().toLowerCase();
    visibleGstStateItems = gstStateItems.filter((item) => {
      return !normalizedSearch
        || item.code.includes(normalizedSearch)
        || item.name.toLowerCase().includes(normalizedSearch)
        || item.value.toLowerCase().includes(normalizedSearch);
    });

    gstStateDropdown.innerHTML = '';

    if (!visibleGstStateItems.length) {
      const emptyState = document.createElement('div');
      emptyState.className = 'gst-state-empty';
      emptyState.textContent = 'No matching GST state code';
      gstStateDropdown.appendChild(emptyState);
      gstStateCombobox.classList.add('is-open');
      gstStateInput.setAttribute('aria-expanded', 'true');
      activeGstStateIndex = -1;
      return;
    }

    visibleGstStateItems.forEach((item, index) => {
      const optionButton = document.createElement('button');
      optionButton.type = 'button';
      optionButton.className = 'gst-state-option';
      optionButton.id = `gstStateOption${index}`;
      optionButton.setAttribute('role', 'option');
      optionButton.setAttribute('aria-selected', 'false');
      optionButton.innerHTML = `<span class="gst-state-code">${item.code}</span><span class="gst-state-name">${item.name}</span>`;
      optionButton.addEventListener('mousedown', (event) => event.preventDefault());
      optionButton.addEventListener('click', () => selectGstState(item));
      gstStateDropdown.appendChild(optionButton);
    });

    checkDropdownPosition(gstStateCombobox, gstStateInput);
    gstStateCombobox.classList.add('is-open');
    gstStateInput.setAttribute('aria-expanded', 'true');
    updateGstActiveOption(0);
  }

  function initGstStateCombobox() {
    const form = document.getElementById('demoEnquiryForm');
    const input = form?.querySelector('[name="state"]');
    const combobox = document.querySelector('[data-gst-state-combobox]');
    const dropdown = document.getElementById('gstStateDropdown');
    const gstStateOptions = Array.from(document.querySelectorAll('#gstStateCodes option')).map((option) => option.value);

    if (!input || !combobox || !dropdown || !gstStateOptions.length) return;

    gstStateInput = input;
    gstStateCombobox = combobox;
    gstStateDropdown = dropdown;
    gstStateItems = gstStateOptions.map((value) => {
      const [code, ...nameParts] = value.split(' - ');
      return {
        code,
        name: nameParts.join(' - '),
        value
      };
    });

    if (gstStateInitialized) return;
    gstStateInitialized = true;

    gstStateInput.addEventListener('focus', () => {
      renderGstStateOptions(gstStateInput.value);
    });

    gstStateInput.addEventListener('input', () => {
      renderGstStateOptions(gstStateInput.value);
    });

    gstStateInput.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (!gstStateCombobox.classList.contains('is-open')) {
          renderGstStateOptions(gstStateInput.value);
          return;
        }
        updateGstActiveOption(activeGstStateIndex + 1);
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        updateGstActiveOption(activeGstStateIndex - 1);
      }

      if (event.key === 'Enter') {
        const selectedItem = visibleGstStateItems[activeGstStateIndex] || visibleGstStateItems[0];
        if (selectedItem) {
          event.preventDefault();
          selectGstState(selectedItem);
        }
      }

      if (event.key === 'Tab') {
        const selectedItem = visibleGstStateItems[activeGstStateIndex] || visibleGstStateItems[0];
        if (gstStateCombobox.classList.contains('is-open') && selectedItem) {
          selectGstState(selectedItem);
        }
      }
    });

    document.addEventListener('click', (event) => {
      if (!gstStateCombobox.contains(event.target)) {
        closeGstStateDropdown();
      }
    });
  }

  initGstStateCombobox();
  document.addEventListener('taxpower:sections-loaded', initGstStateCombobox);

  // product checkbox and purpose dropdown error handlers
  function setProductFieldError(isError) {
    const fieldset = document.getElementById('productFieldset');
    if (!fieldset) return;
    fieldset.classList.toggle('has-error', isError);
  }

  function setPurposeFieldError(isError) {
    const field = document.querySelector('[data-purpose-dropdown]')?.closest('.form-field');
    if (!field) return;
    field.classList.toggle('has-error', isError);
  }

  function updateSubmitEnabled() {
    const form = document.getElementById('demoEnquiryForm');
    if (!form) return;
    const any = form.querySelectorAll('input[name="product"]:checked').length > 0;
    if (any) {
      setProductFieldError(false);
    }
  }

  document.addEventListener('change', (event) => {
    if (event.target.matches('#demoEnquiryForm input[name="product"]')) {
      const form = document.getElementById('demoEnquiryForm');
      if (form && form.querySelectorAll('input[name="product"]:checked').length) {
        setDemoStatus('');
        setProductFieldError(false);
      }
      updateSubmitEnabled();
    }
  });

  document.addEventListener('click', (event) => {
    if (event.target.closest('#demoEnquiryForm .product-card-option')) {
      setTimeout(() => {
        const form = document.getElementById('demoEnquiryForm');
        if (form && form.querySelectorAll('input[name="product"]:checked').length) {
          setDemoStatus('');
          setProductFieldError(false);
        }
        updateSubmitEnabled();
      }, 0);
    }
  });

  function getVisibleDemoTrigger() {
    const triggers = Array.from(document.querySelectorAll('[data-demo-form-open]'));
    const visibleTrigger = triggers.find((trigger) => {
      if (!(trigger instanceof Element)) return false;
      const style = window.getComputedStyle(trigger);
      if (style.display === 'none') return false;
      return trigger.getClientRects().length > 0;
    });

    return visibleTrigger || triggers[0] || null;
  }

  function setDemoTriggerState(triggerElement, isOpen) {
    const buttons = triggerElement instanceof Element
      ? [triggerElement]
      : Array.from(document.querySelectorAll('[data-demo-form-open]'));

    if (!buttons.length) return;

    buttons.forEach((button) => {
      button.classList.toggle('is-demo-opened', isOpen);
    });
  }

  function resetDemoTriggerState() {
    if (lastDemoTrigger) {
      setDemoTriggerState(lastDemoTrigger, false);
    }
    document.querySelectorAll('[data-demo-form-open]').forEach((button) => {
      button.classList.remove('is-demo-opened');
    });
  }

  function activateDemoTriggerStateFromForm(targetElement) {
    if (!(targetElement instanceof Element)) return;

    const form = document.getElementById('demoEnquiryForm');
    if (!form) return;

    const isInsideForm = targetElement.closest('#demoEnquiryForm') || form.contains(targetElement);
    if (!isInsideForm) return;

    if (targetElement.closest('[data-demo-form-close]')) return;

    const trigger = getVisibleDemoTrigger() || lastDemoTrigger;
    if (!trigger) return;

    lastDemoTrigger = trigger;
    setDemoTriggerState(trigger, true);
  }

  function bindDemoFormInteractionState() {
    const form = document.getElementById('demoEnquiryForm');
    if (!form || form.dataset.demoFormStateBound === 'true') return;
    form.dataset.demoFormStateBound = 'true';

    const activateFromFieldInteraction = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-demo-form-close]')) return;
      if (!form.contains(target)) return;
      const trigger = getVisibleDemoTrigger() || lastDemoTrigger;
      if (!trigger) return;
      lastDemoTrigger = trigger;
      setDemoTriggerState(trigger, true);
    };

    const formFields = form.querySelectorAll('input, select, textarea, button, .purpose-trigger, .product-card-option');
    formFields.forEach((field) => {
      field.addEventListener('focus', activateFromFieldInteraction, true);
      field.addEventListener('pointerdown', activateFromFieldInteraction, true);
      field.addEventListener('click', activateFromFieldInteraction, true);
      field.addEventListener('input', activateFromFieldInteraction, true);
    });
  }

  function focusDemoFormFromHash() {
    handlePendingDemoHashOrContext();
  }

  function openDemoForm(triggerElement) {
    const modal = document.getElementById('demoEnquiryModal');
    if (!modal) return;

    lastDemoTrigger = triggerElement || document.activeElement;
    setDemoTriggerState(lastDemoTrigger, true);
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');

    // Only lock body scroll for floating overlay modals, not embedded page sections
    if (!modal.classList.contains('embedded')) {
      document.body.classList.add('demo-form-open');
    }
    setDemoStatus('');

    applyDemoContext(triggerElement);
    focusDemoFullNameField({ preventScroll: true });

    const demoDialog = modal.querySelector('.demo-form-dialog');
    if (demoDialog) {
      demoDialog.scrollTop = 0;
    }

    if (modal.classList.contains('embedded')) {
      const targetElement = document.getElementById('demo-enquiry') || modal;
      const targetTop = getSectionScrollTop(targetElement);
      window.scrollTo({ top: targetTop, behavior: 'smooth' });
      setTimeout(() => focusDemoFullNameField({ preventScroll: false }), 400);
      setTimeout(() => focusDemoFullNameField({ preventScroll: false }), 850);
    }
  }


  function closeDemoFormImmediate() {
    const modal = document.getElementById('demoEnquiryModal');
    if (!modal) return;

    document.body.classList.remove('demo-form-open');
    // if form is embedded on the page, hide it visually; otherwise close modal normally
    if (modal.classList.contains('embedded')) {
      modal.style.display = 'none';
    } else {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }

    closeGstStateDropdown();
    resetDemoTriggerState();
    lastDemoTrigger?.focus?.();
  }

  document.querySelectorAll('[data-demo-slider]').forEach((slider) => {
    const thumb = slider.querySelector('.demo_btn');
    let isDragging = false;
    let dragStartX = 0;
    let didDrag = false;

    const setSliderProgress = (progress) => {
      const clampedProgress = Math.max(0, Math.min(progress, 1));
      const sliderRect = slider.getBoundingClientRect();
      const minLeft = 16;
      const maxLeft = Math.max(minLeft, sliderRect.width - 32);
      const thumbLeft = minLeft + ((maxLeft - minLeft) * clampedProgress);
      const textShift = 33 * clampedProgress;

      slider.style.setProperty('--demo-slide-progress', clampedProgress.toFixed(3));
      slider.style.setProperty('--demo-thumb-left', `${thumbLeft.toFixed(1)}px`);
      slider.style.setProperty('--demo-text-shift', `${textShift.toFixed(1)}px`);
      slider.classList.toggle('is-complete', clampedProgress >= 0.92);
      return clampedProgress;
    };

    const getProgressFromPointer = (event) => {
      const sliderRect = slider.getBoundingClientRect();
      const thumbWidth = thumb?.getBoundingClientRect().width || 18;
      const minLeft = 16;
      const maxLeft = Math.max(minLeft, sliderRect.width - 32);
      const requestedLeft = event.clientX - sliderRect.left - (thumbWidth / 2);

      return (requestedLeft - minLeft) / (maxLeft - minLeft);
    };

    const resetSlider = () => {
      isDragging = false;
      slider.classList.remove('is-dragging', 'is-complete');
      setSliderProgress(0);
    };

    thumb?.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      isDragging = true;
      didDrag = false;
      dragStartX = event.clientX;
      slider.classList.add('is-dragging');
      thumb.setPointerCapture?.(event.pointerId);
      setSliderProgress(getProgressFromPointer(event));
    });

    thumb?.addEventListener('pointermove', (event) => {
      if (!isDragging) return;
      didDrag = didDrag || Math.abs(event.clientX - dragStartX) > 5;
      setSliderProgress(getProgressFromPointer(event));
    });

    thumb?.addEventListener('pointerup', (event) => {
      if (!isDragging) return;

      const progress = setSliderProgress(getProgressFromPointer(event));
      thumb.releasePointerCapture?.(event.pointerId);

      if (!didDrag) {
        didDrag = true;
        resetSlider();
        openDemoForm(slider);
        return;
      }

      if (progress >= 0.92) {
        slider.classList.remove('is-dragging');
        slider.classList.add('is-complete');
        openDemoForm(slider);
        window.setTimeout(resetSlider, 300);
        return;
      }

      resetSlider();
    });

    thumb?.addEventListener('pointercancel', resetSlider);

    slider.addEventListener('click', (event) => {
      event.preventDefault();

      if (didDrag) {
        didDrag = false;
        return;
      }

      openDemoForm(slider);
    });

    slider.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;

      event.preventDefault();
      openDemoForm(slider);
    });
  });

  document.addEventListener('pointerdown', (event) => {
    if (event.target && event.target.closest && event.target.closest('#demoEnquiryForm')) {
      activateDemoTriggerStateFromForm(event.target);
    }
  }, { passive: true });

  document.addEventListener('focusin', (event) => {
    activateDemoTriggerStateFromForm(event.target);
  });

  document.addEventListener('click', (event) => {
    const demoOpenButton = event.target.closest('[data-demo-form-open]');
    if (demoOpenButton) {
      const modal = document.getElementById('demoEnquiryModal');
      if (modal) {
        event.preventDefault();
        openDemoForm(demoOpenButton);
      }
      return;
    }

    activateDemoTriggerStateFromForm(event.target);
  });

  bindDemoFormInteractionState();
  focusDemoFormFromHash();
  window.addEventListener('hashchange', focusDemoFormFromHash);

  document.addEventListener('click', (event) => {
    const closeBtn = event.target.closest('[data-demo-form-close]');
    if (closeBtn) {
      if (closeBtn.classList && closeBtn.classList.contains('demo-form-close')) {
        closeBtn.classList.add('is-animating');
        setTimeout(() => {
          closeDemoFormImmediate();
          closeBtn.classList.remove('is-animating');
        }, 220);
      } else {
        closeDemoFormImmediate();
      }
    }
  });

  document.addEventListener('keydown', (event) => {
    const modal = document.getElementById('demoEnquiryModal');
    if (event.key === 'Escape' && modal?.classList.contains('is-open')) {
      closeDemoFormImmediate();
    }
  });

  document.addEventListener('pointerdown', (event) => {
    const handle = event.target.closest('.demo-submit-kicker-badge .demo-kicker-icon');
    if (!handle || event.button !== 0) return;

    const button = handle.closest('.demo-submit-kicker-badge');
    const form = button?.closest('#demoEnquiryForm');
    if (!button || !form) return;

    event.preventDefault();
    const buttonRect = button.getBoundingClientRect();
    const handleRect = handle.getBoundingClientRect();
    const startOffset = handleRect.left - buttonRect.left;
    const rightPadding = 19;
    const maxMove = Math.max(buttonRect.width - handleRect.width - startOffset - rightPadding, 0);
    const submitThreshold = Math.round(maxMove * 0.7);

    let currentDelta = 0;
    let dragging = true;

    handle.classList.add('is-dragging');
    button.classList.add('is-dragging');
    button.classList.remove('is-ready-to-submit');
    button.dataset.slideComplete = 'false';

    const resetDrag = () => {
      currentDelta = 0;
      dragging = false;
      handle.style.transform = '';
      handle.classList.remove('is-dragging');
      button.classList.remove('is-dragging');
      button.classList.remove('is-ready-to-submit');
      button.dataset.slideComplete = 'false';
      const text = button.querySelector('.submit-btn-text');
      if (text) text.style.transform = '';
    };

    const finishDrag = () => {
      dragging = false;
      handle.classList.remove('is-dragging');
      if (currentDelta >= submitThreshold) {
        if (!validateDemoEnquiryForm(form)) {
          resetDrag();
          return;
        }
        handle.style.transform = `translateX(${maxMove}px)`;
        text = button.querySelector('.submit-btn-text');
        if (text) text.style.transform = 'translateX(-30px)';
        button.dataset.slideComplete = 'true';
        button.dataset.slideTriggered = 'true';
        button.classList.add('is-submit-complete');
        button.classList.remove('is-ready-to-submit');
        setTimeout(() => form.requestSubmit(), 180);
      } else {
        resetDrag();
      }
    };

    const onPointerMove = (moveEvent) => {
      if (!dragging) return;
      currentDelta = Math.min(Math.max(moveEvent.clientX - event.clientX, 0), maxMove);
      handle.style.transform = `translateX(${currentDelta}px)`;
      const text = button.querySelector('.submit-btn-text');
      if (text) {
        const textShift = Math.min(currentDelta, 30);
        text.style.transform = `translateX(-${textShift}px)`;
      }
      button.classList.toggle('is-ready-to-submit', currentDelta >= submitThreshold);
    };

    const onPointerEnd = () => {
      if (!dragging) return;
      finishDrag();
      cleanup();
    };

    const cleanup = () => {
      dragging = false;
      handle.releasePointerCapture(event.pointerId);
      handle.removeEventListener('pointermove', onPointerMove);
      handle.removeEventListener('pointerup', onPointerEnd);
      handle.removeEventListener('pointercancel', onPointerEnd);
      button.classList.remove('is-dragging');
    };

    handle.setPointerCapture(event.pointerId);
    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', onPointerEnd);
    handle.addEventListener('pointercancel', onPointerEnd);
  });

  const setSubmitCompletedState = (button) => {
    if (!button) return;
    const icon = button.querySelector('.demo-kicker-icon');
    const text = button.querySelector('.submit-btn-text');

    button.classList.add('is-submit-complete');
    button.classList.remove('is-ready-to-submit', 'is-dragging');
    button.dataset.slideComplete = 'true';
    button.dataset.slideTriggered = 'true';

    if (icon) {
      icon.style.transform = 'translateX(105px)';
      icon.classList.remove('is-dragging');
    }

    if (text) {
      text.style.transform = 'translateX(-33px)';
      text.textContent = 'Submitted';
    }
  };

  const resetSubmitDragState = (button) => {
    if (!button) return;
    button.dataset.slideComplete = 'false';
    button.dataset.slideTriggered = 'false';
    button.classList.remove('is-ready-to-submit', 'is-dragging', 'is-submit-complete');
    const icon = button.querySelector('.demo-kicker-icon');
    if (icon) {
      icon.style.removeProperty('transform');
      icon.classList.remove('is-dragging');
    }
    const text = button.querySelector('.submit-btn-text');
    if (text) {
      text.style.removeProperty('transform');
      text.textContent = 'Submit';
    }
  };

  const validateDemoEnquiryForm = (form) => {
    const fullName = form.querySelector('[name="name"]');
    const companyName = form.querySelector('[name="company"]');
    const mobileNumber = form.querySelector('[name="mobile"]');
    const emailInput = form.querySelector('[name="email"]');
    const cityInput = form.querySelector('[name="city"]');
    const stateInput = form.querySelector('[name="state"]');
    const selectedProducts = form.querySelectorAll('input[name="product"]:checked');
    const purposeValue = document.getElementById('purposeSelectHidden')?.value || '';
    const gstStateOptions = Array.from(document.querySelectorAll('#gstStateCodes option')).map((option) => option.value);

    if (!fullName?.checkValidity()) {
      fullName?.focus();
      fullName?.reportValidity();
      return false;
    }

    if (!companyName?.checkValidity()) {
      companyName?.focus();
      companyName?.reportValidity();
      return false;
    }

    if (!mobileNumber?.checkValidity()) {
      mobileNumber?.focus();
      mobileNumber?.reportValidity();
      return false;
    }

    if (!emailInput?.checkValidity()) {
      emailInput?.focus();
      emailInput?.reportValidity();
      return false;
    }

    if (!cityInput?.checkValidity()) {
      cityInput?.focus();
      cityInput?.reportValidity();
      return false;
    }

    if (!stateInput?.value?.trim() || !gstStateOptions.includes(stateInput.value.trim())) {
      setDemoStatus('Please choose a valid GST state code from the list.', true);
      stateInput?.focus();
      return false;
    }

    if (!selectedProducts.length) {
      setProductFieldError(true);
      setDemoStatus('Please select at least one product.', true);
      form.querySelector('input[name="product"]')?.focus();
      return false;
    }

    if (!purposeValue) {
      setPurposeFieldError(true);
      setDemoStatus('Please select purpose of enquiry.', true);
      document.getElementById('purposeTrigger')?.focus();
      return false;
    }

    setProductFieldError(false);
    setPurposeFieldError(false);
    return true;
  };

  document.addEventListener('click', (event) => {
    const button = event.target.closest('.demo-submit-kicker-badge');
    if (!button || !button.closest('#demoEnquiryForm')) return;

    // Agar drag se already trigger ho chuka hai to skip
    if (button.dataset.slideTriggered === 'true') {
      event.preventDefault();
      button.dataset.slideTriggered = 'false';
      return;
    }

    // Single click se bhi submit ho ??? drag ki zaroorat nahi
    if (button.dataset.slideComplete !== 'true') {
      event.preventDefault();
      const form = button.closest('#demoEnquiryForm');
      if (!form) return;
      if (!validateDemoEnquiryForm(form)) return;

      button.classList.add('is-ready-to-submit');
      const icon = button.querySelector('.demo-kicker-icon');
      const text = button.querySelector('.submit-btn-text');

      if (icon) icon.style.transform = 'translateX(20px)';
      if (text) text.style.transform = 'translateX(-30px)';

      button.dataset.slideComplete = 'true';
      button.dataset.slideTriggered = 'true';
      setTimeout(() => {
        setSubmitCompletedState(button);
        form.requestSubmit();
      }, 180);
    }
  });

  // The submit handler logic is now entirely handled by the capture-phase listener below,
  // which works reliably with event delegation and handles form submission.

  // capture-phase submit listener to reliably prevent Enter-key or other submits
  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!form || form.id !== 'demoEnquiryForm') return;
    const submitBtn = form.querySelector('.demo-submit-kicker-badge');

    // Agar Enter key ya kisi aur method se submit ho raha hai
    // to validation check karo
    if (submitBtn?.dataset.slideComplete !== 'true') {
      event.preventDefault();
      if (!validateDemoEnquiryForm(form)) {
        resetSubmitDragState(submitBtn);
        return;
      }
      // Validation pass ho gayi ??? submit allow karo
      submitBtn.dataset.slideComplete = 'true';
    }

    const selectedProducts = form.querySelectorAll('input[name="product"]:checked');
    const purposeValue = document.getElementById('purposeSelectHidden')?.value || '';
    const stateInput = form.querySelector('[name="state"]');
    const stateValue = stateInput?.value.trim();
    const gstStateOptions = Array.from(document.querySelectorAll('#gstStateCodes option')).map((option) => option.value);

    if (!selectedProducts.length) {
      event.preventDefault();
      resetSubmitDragState(submitBtn);
      setProductFieldError(true);
      setDemoStatus('Please select at least one product.', true);
      form.querySelector('input[name="product"]')?.focus();
      return;
    }
    if (!purposeValue) {
      event.preventDefault();
      resetSubmitDragState(submitBtn);
      setPurposeFieldError(true);
      setDemoStatus('Please select purpose of enquiry.', true);
      document.getElementById('purposeTrigger')?.focus();
      return;
    }
    if (stateValue && !gstStateOptions.includes(stateValue)) {
      event.preventDefault();
      resetSubmitDragState(submitBtn);
      setDemoStatus('Please choose a valid GST state code from the list.', true);
      stateInput?.focus();
      return;
    }

    event.preventDefault();

    if (typeof window.sendDemoEnquiryToBackend === 'function') {
      setDemoStatus('Sending your enquiry...');
      window.sendDemoEnquiryToBackend(form);
    }

    setDemoStatus('Thank you! TaxPower team will contact you shortly.');
    if (submitBtn) {
      setSubmitCompletedState(submitBtn);
    }

    setTimeout(() => {
      form.reset();
      updateSubmitEnabled();
      closeGstStateDropdown();
      setProductFieldError(false);
      setPurposeFieldError(false);

      const purposeDropdownEl = document.getElementById('purposeDropdown');
      const purposeTriggerTextEl = document.getElementById('purposeTriggerText');
      const purposeHiddenSelect = document.getElementById('purposeSelectHidden');
      if (purposeDropdownEl && purposeTriggerTextEl) {
        purposeTriggerTextEl.textContent = 'Select purpose of enquiry';
        purposeDropdownEl.classList.remove('has-value', 'is-open');
        purposeDropdownEl.querySelectorAll('.purpose-option').forEach(o => {
          o.classList.remove('is-selected');
          o.setAttribute('aria-selected', 'false');
        });
        const triggerIconEl = purposeDropdownEl.querySelector('.purpose-trigger-icon');
        if (triggerIconEl) {
          triggerIconEl.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
        }
      }
      if (purposeHiddenSelect) purposeHiddenSelect.value = '';

      if (submitBtn) {
        resetSubmitDragState(submitBtn);
      }

      resetDemoTriggerState();
      setDemoStatus('');
    }, 10000);
  }, true);

  // module 02c: custom purpose dropdown interaction
  function initPurposeDropdown() {
    const dropdown = document.getElementById('purposeDropdown');
    const trigger = document.getElementById('purposeTrigger');
    const triggerIcon = trigger?.querySelector('.purpose-trigger-icon');
    const triggerText = document.getElementById('purposeTriggerText');
    const optionsList = document.getElementById('purposeOptionsList');
    const hiddenSelect = document.getElementById('purposeSelectHidden');
    if (!dropdown || !trigger || !triggerText || !optionsList || !hiddenSelect) return;
    const defaultTriggerIconHTML = triggerIcon?.innerHTML || '';
    if (dropdown.dataset.purposeDropdownInitialized === 'true') return;
    dropdown.dataset.purposeDropdownInitialized = 'true';

    function openPurposeDropdown() {
      checkDropdownPosition(dropdown, trigger);
      dropdown.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
    }

    function closePurposeDropdown() {
      dropdown.classList.remove('is-open', 'opens-upward');
      trigger.setAttribute('aria-expanded', 'false');
    }

    // Auto-open when focus arrives via Tab key (but NOT via mouse click, handled by click listener)
    trigger.addEventListener('focus', (e) => {
      // e.relatedTarget is null if focused by mouse click ??? skip in that case
      // We check if focus came from keyboard by checking relatedTarget
      if (e.relatedTarget !== null && !dropdown.contains(e.relatedTarget)) {
        if (!dropdown.classList.contains('is-open')) {
          openPurposeDropdown();
        }
      }
    });

    // Close when focus leaves the whole dropdown area
    dropdown.addEventListener('focusout', (e) => {
      if (!dropdown.contains(e.relatedTarget)) {
        setTimeout(() => {
          if (!dropdown.contains(document.activeElement)) {
            closePurposeDropdown();
          }
        }, 50);
      }
    });

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropdown.classList.contains('is-open') ? closePurposeDropdown() : openPurposeDropdown();
    });

    trigger.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });

    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        dropdown.classList.contains('is-open') ? closePurposeDropdown() : openPurposeDropdown();
      }
      if (e.key === 'Escape') closePurposeDropdown();
      // ArrowDown opens and moves focus to first option
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!dropdown.classList.contains('is-open')) openPurposeDropdown();
        const first = optionsList.querySelector('.purpose-option');
        if (first) first.focus();
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!dropdown.classList.contains('is-open')) openPurposeDropdown();
        const allOpts = optionsList.querySelectorAll('.purpose-option');
        if (allOpts.length) allOpts[allOpts.length - 1].focus();
      }
    });

    optionsList.querySelectorAll('.purpose-option').forEach((option) => {
      option.tabIndex = 0;

      option.addEventListener('click', () => {
        const value = option.dataset.value || option.textContent.trim();
        const selectedIcon = option.querySelector('.purpose-option-icon')?.innerHTML || defaultTriggerIconHTML;
        hiddenSelect.value = value;
        triggerText.textContent = value;
        if (triggerIcon) {
          triggerIcon.innerHTML = selectedIcon;
        }

        optionsList.querySelectorAll('.purpose-option').forEach((o) => {
          o.classList.remove('is-selected');
          o.setAttribute('aria-selected', 'false');
        });

        option.classList.add('is-selected');
        option.setAttribute('aria-selected', 'true');
        dropdown.classList.add('has-value');
        closePurposeDropdown();
        trigger.focus();
        setPurposeFieldError(false);
        setDemoStatus('');
      });

      option.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          option.click();
        }
        if (e.key === 'Escape') {
          closePurposeDropdown();
          trigger.focus();
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = option.nextElementSibling;
          if (next) next.focus();
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = option.previousElementSibling;
          if (prev) prev.focus(); else trigger.focus();
        }
      });
    });

    document.addEventListener('click', (event) => {
      if (!dropdown.contains(event.target)) {
        closePurposeDropdown();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closePurposeDropdown();
    });
  }

  initPurposeDropdown();
  document.addEventListener('taxpower:sections-loaded', initPurposeDropdown);


  // module 03: interactive responsive mobile hamburger trigger module
  const header = document.querySelector('.header');
  const headerRevealHint = document.getElementById('headerRevealHint');
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const navbarMenu = document.getElementById('navbarMenu');
  const headerRevealDelay = 2000;
  let headerRevealTimer = null;
  let lastScrollY = window.scrollY;
  let isNavbarPinned = false;


  function hideHeader() {
    if (!isNavbarPinned && !navbarMenu?.classList.contains('active')) {
      header?.classList.add('navbar-scroll-hidden');
    }
  }

  function resetHeaderInactivityTimer() {
    if (headerRevealTimer) {
      clearTimeout(headerRevealTimer);
    }

    if (!isNavbarPinned) {
      headerRevealTimer = setTimeout(() => {
        if (window.scrollY > 80 && !navbarMenu?.classList.contains('active')) {
          header?.classList.remove('navbar-scroll-hidden');
        }
      }, headerRevealDelay);
    }
  }

  function showHeader() {
    header?.classList.remove('navbar-scroll-hidden');
    resetHeaderInactivityTimer();
  }

  function updateHeaderVisibility() {
    if (!header) return;

    if (isNavbarPinned || isNavClickScrolling) {
      header.classList.remove('navbar-scroll-hidden');
      lastScrollY = window.scrollY;
      return;
    }

    const currentScrollY = window.scrollY;
    const isMenuOpen = navbarMenu?.classList.contains('active');
    const isScrollingUp = currentScrollY < lastScrollY;
    const shouldShowHeader = currentScrollY <= 80 || isScrollingUp || isMenuOpen;

    if (shouldShowHeader) {
      header.classList.remove('navbar-scroll-hidden');
    } else {
      header.classList.add('navbar-scroll-hidden');
    }
    lastScrollY = currentScrollY;
    resetHeaderInactivityTimer();
  }

  window.addEventListener('scroll', updateHeaderVisibility, { passive: true });
  headerRevealHint?.addEventListener('focus', showHeader);
  headerRevealHint?.addEventListener('mouseleave', () => {
    if (!isNavbarPinned) {
      window.setTimeout(hideHeader, 220);
    }
  });
  const pinHeaderFromRevealIcon = () => {
    isNavbarPinned = true;
    header?.classList.add('navbar-stay-visible');
    header?.classList.remove('navbar-scroll-hidden');
    headerRevealHint.setAttribute('aria-label', 'Header pinned');
    headerRevealHint.setAttribute('title', 'Header pinned');
    resetHeaderInactivityTimer();
  };

  headerRevealHint?.addEventListener('pointerdown', pinHeaderFromRevealIcon);
  headerRevealHint?.addEventListener('click', pinHeaderFromRevealIcon);

  if (hamburgerBtn && navbarMenu) {
    const setMobileMenuState = (isOpen) => {
      hamburgerBtn.classList.toggle('active', isOpen);
      navbarMenu.classList.toggle('active', isOpen);
      hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
      hamburgerBtn.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
      document.body.classList.toggle('nav-menu-open', isOpen && window.innerWidth <= mobileBreakpoint);
      header?.classList.remove('navbar-scroll-hidden');
      resetHeaderInactivityTimer();
    };

    hamburgerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = !navbarMenu.classList.contains('active');
      setMobileMenuState(isOpen);
    });

    // close navigation drawer drop tray dynamically when any anchor point link is selected
    navbarMenu.querySelectorAll('a').forEach(item => {
      item.addEventListener('click', () => {
        setMobileMenuState(false);
      });
    });

    // close menu if user clicks outside
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= mobileBreakpoint && navbarMenu.classList.contains('active')) {
        if (!navbarMenu.contains(e.target) && !hamburgerBtn.contains(e.target)) {
          setMobileMenuState(false);
        }
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && navbarMenu.classList.contains('active')) {
        setMobileMenuState(false);
        hamburgerBtn.focus();
      }
    });
  }

  window.addEventListener('resize', () => {
    if (window.innerWidth > mobileBreakpoint) {
      hamburgerBtn?.classList.remove('active');
      navbarMenu?.classList.remove('active');
      hamburgerBtn?.setAttribute('aria-expanded', 'false');
      hamburgerBtn?.setAttribute('aria-label', 'Open navigation menu');
      document.body.classList.remove('nav-menu-open');
      header?.classList.remove('navbar-scroll-hidden');
      resetHeaderInactivityTimer();
      moveIndicator(document.querySelector('.nav-item.h-current'));
    }
  });

  resetHeaderInactivityTimer();
}

function bootTaxPowerSite() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootTaxPowerSite, { once: true });
    return;
  }

  if (window.taxPowerNavigationLoaded || !document.querySelector('[data-nav-slot]')) {
    initTaxPowerSite();
    return;
  }

  document.addEventListener('taxpower:navigation-loaded', initTaxPowerSite, { once: true });
}

bootTaxPowerSite();

