/**
 * SwipeUp v2.2 - Swipe UP to Share
 * Combined Share + WhatsApp Button auf Produktbild
 */
(function() {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    SWIPE_THRESHOLD: 60,
    SWIPE_MAX_TIME: 400,
    
    IMAGE_SELECTORS: [
      '.product__media img.image-magnify-none',
      '.product__media.media img',
      '.media--transparent img',
      '.product__media-item img',
      '.media--image img',
      '.product__media img',
      '.product-single__photo img',
      '.product-featured-media img',
      '[data-product-media-type="image"] img',
      '.product__main-photos img',
      '.product-gallery img',
      '.product-image-main img',
      '.product__photo img',
      '.product-single__media img',
      '.product img[srcset]',
      '[data-product-image]',
      '.product__media-wrapper img',
      '.product-media-container img',
      '[class*="product"] [class*="media"] img'
    ],
    
    HINT_SHOWN_KEY: 'swipeup_hint_shown_v2'
  };

  // ============================================
  // STATE
  // ============================================
  let state = {
    touchStartX: 0,
    touchStartY: 0,
    touchStartTime: 0,
    isSwiping: false,
    targetImage: null,
    imageContainer: null,
    productData: null,
    isMobile: false,
    swipeEnabled: true,
    swipeInitiatedTracked: false
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  
  function isTouchDevice() {
    return ('ontouchstart' in window) || 
           (navigator.maxTouchPoints > 0) || 
           (navigator.msMaxTouchPoints > 0);
  }

  function isMobileViewport() {
    return window.innerWidth <= 768;
  }

  function getProductData() {
    const container = document.getElementById('swiftshare-widget');
    if (!container) return null;
    
    return {
      whatsapp: container.dataset.whatsapp || '',
      storeName: container.dataset.storeName || '',
      productTitle: container.dataset.productTitle || '',
      productUrl: container.dataset.productUrl || window.location.href,
      chatText: container.dataset.chatText || 'Chat',
      shareText: container.dataset.shareText || '',
      shareButtonText: container.dataset.shareButtonText || 'Share',
      position: container.dataset.position || 'bottom-right',
      theme: container.dataset.theme || 'whatsapp'
    };
  }

  function getFirstProductImage() {
    for (const selector of CONFIG.IMAGE_SELECTORS) {
      const img = document.querySelector(selector);
      if (img && img.src && img.offsetParent !== null && img.offsetHeight > 100) {
        console.log('[SwipeUp] Found image with selector:', selector);
        return img;
      }
    }
    
    let largestImg = null;
    let largestArea = 0;
    document.querySelectorAll('img').forEach(img => {
      const area = img.offsetWidth * img.offsetHeight;
      if (area > largestArea && img.offsetHeight > 200) {
        largestArea = area;
        largestImg = img;
      }
    });
    
    if (largestImg) {
      console.log('[SwipeUp] Using largest image as fallback');
      return largestImg;
    }
    
    return null;
  }

  // ============================================
  // ANALYTICS
  // ============================================
  
  function trackEvent(eventType, extra = {}) {
    const data = {
      event: eventType,
      product: state.productData?.productTitle || '',
      url: window.location.href,
      timestamp: Date.now(),
      ...extra
    };
    
    console.log('[SwipeUp]', eventType, data);
  }

  // ============================================
  // COMBINED BUTTON (Share + WhatsApp)
  // ============================================
  
  function createCombinedButton(targetImage) {
    const existing = document.querySelector('.swipeup-buttons');
    if (existing) existing.remove();
    
    let container = targetImage.parentElement;
    for (let i = 0; i < 5 && container; i++) {
      const classes = container.className || '';
      if (classes.includes('product__media') || 
          classes.includes('media') || 
          classes.includes('product-image') ||
          classes.includes('gallery')) {
        break;
      }
      if (container.parentElement) {
        container = container.parentElement;
      }
    }
    
    if (!container) {
      console.log('[SwipeUp] No container found');
      return null;
    }
    
    console.log('[SwipeUp] Adding buttons to container:', container.className);
    state.imageContainer = container;
    
    const containerStyle = window.getComputedStyle(container);
    if (containerStyle.position === 'static') {
      container.style.position = 'relative';
    }
    
    // Create button container
    const buttons = document.createElement('div');
    buttons.className = 'swipeup-buttons';
    buttons.innerHTML = `
      <button class="swipeup-btn swipeup-btn--share" aria-label="Share">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 19V5M5 12l7-7 7 7"/>
        </svg>
      </button>
      <button class="swipeup-btn swipeup-btn--whatsapp" aria-label="WhatsApp">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </button>
    `;
    
    // Inline styles for button container
    buttons.style.cssText = `
      position: absolute !important;
      bottom: 16px !important;
      right: 16px !important;
      z-index: 9999 !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 8px !important;
      opacity: 0;
      transform: translateX(10px);
      transition: opacity 0.3s ease, transform 0.3s ease;
    `;
    
    // Style buttons
    const allBtns = buttons.querySelectorAll('.swipeup-btn');
    allBtns.forEach(btn => {
      btn.style.cssText = `
        width: 48px;
        height: 48px;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        -webkit-tap-highlight-color: transparent;
      `;
      
      const svg = btn.querySelector('svg');
      svg.style.cssText = `
        width: 22px;
        height: 22px;
      `;
    });
    
    // Share button style (dark with white icon)
    const shareBtn = buttons.querySelector('.swipeup-btn--share');
    shareBtn.style.background = 'rgba(0, 0, 0, 0.75)';
    shareBtn.style.backdropFilter = 'blur(8px)';
    shareBtn.style.webkitBackdropFilter = 'blur(8px)';
    shareBtn.querySelector('svg').style.color = 'white';
    
    // WhatsApp button style (green)
    const waBtn = buttons.querySelector('.swipeup-btn--whatsapp');
    waBtn.style.background = '#25D366';
    waBtn.querySelector('svg').style.color = 'white';
    
    container.appendChild(buttons);
    
    // Animate in
    setTimeout(() => {
      buttons.style.opacity = '1';
      buttons.style.transform = 'translateX(0)';
    }, 100);
    
    // Add bounce animation to share arrow
    const shareArrow = shareBtn.querySelector('svg');
    let bounceFrame = 0;
    function bounceArrow() {
      bounceFrame++;
      const offset = Math.sin(bounceFrame * 0.05) * 3;
      shareArrow.style.transform = `translateY(${offset}px)`;
      requestAnimationFrame(bounceArrow);
    }
    bounceArrow();
    
    // Share button click
    shareBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      trackEvent('share_icon_tapped');
      triggerShare();
    });
    
    // WhatsApp button click
    waBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      trackEvent('whatsapp_tapped');
      openWhatsApp();
    });
    
    // Tap feedback
    allBtns.forEach(btn => {
      btn.addEventListener('touchstart', () => {
        btn.style.transform = 'scale(0.92)';
      });
      btn.addEventListener('touchend', () => {
        btn.style.transform = 'scale(1)';
      });
    });
    
    console.log('[SwipeUp] Buttons created successfully');
    return buttons;
  }

  // ============================================
  // SWIPE OVERLAY
  // ============================================
  
  function showSwipeOverlay(progress) {
    let overlay = document.querySelector('.swipeup-overlay');
    
    if (!overlay && state.imageContainer) {
      overlay = document.createElement('div');
      overlay.className = 'swipeup-overlay';
      overlay.innerHTML = `
        <div class="swipeup-overlay__content">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          <span>Release to share</span>
        </div>
      `;
      
      overlay.style.cssText = `
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        background: linear-gradient(180deg, rgba(37, 211, 102, 0.95) 0%, rgba(18, 140, 126, 0.95) 100%) !important;
        opacity: 0;
        transition: opacity 0.15s ease;
        z-index: 9998 !important;
        pointer-events: none;
      `;
      
      const content = overlay.querySelector('.swipeup-overlay__content');
      content.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        color: white;
        transform: scale(0.85) translateY(20px);
        transition: transform 0.2s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;
      
      const overlayIcon = content.querySelector('svg');
      overlayIcon.style.cssText = `width: 56px; height: 56px; opacity: 0.95;`;
      
      const overlayText = content.querySelector('span');
      overlayText.style.cssText = `font-size: 18px; font-weight: 700; letter-spacing: 0.5px;`;
      
      state.imageContainer.appendChild(overlay);
    }
    
    if (overlay) {
      overlay.style.opacity = Math.min(progress, 1);
      const content = overlay.querySelector('.swipeup-overlay__content');
      if (progress >= 1) {
        content.style.transform = 'scale(1) translateY(0)';
      } else {
        content.style.transform = 'scale(0.85) translateY(20px)';
      }
    }
  }

  function hideSwipeOverlay() {
    const overlay = document.querySelector('.swipeup-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 200);
    }
  }

  // ============================================
  // SWIPE HANDLING
  // ============================================
  
  function initSwipe() {
    if (!state.isMobile || !state.swipeEnabled) {
      console.log('[SwipeUp] Swipe disabled - isMobile:', state.isMobile);
      return;
    }
    
    const targetImage = getFirstProductImage();
    if (!targetImage) {
      console.log('[SwipeUp] No product image found');
      return;
    }
    
    console.log('[SwipeUp] Swipe UP enabled');
    state.targetImage = targetImage;
    
    const buttons = createCombinedButton(targetImage);
    if (!buttons) {
      console.log('[SwipeUp] Failed to create buttons');
      return;
    }
    
    targetImage.style.touchAction = 'pan-x';
    targetImage.classList.add('swipeup-swipeable');
    
    const touchTarget = state.imageContainer || targetImage;
    touchTarget.addEventListener('touchstart', handleTouchStart, { passive: true });
    touchTarget.addEventListener('touchmove', handleTouchMove, { passive: false });
    touchTarget.addEventListener('touchend', handleTouchEnd, { passive: true });
  }

  function handleTouchStart(e) {
    const touch = e.touches[0];
    state.touchStartX = touch.clientX;
    state.touchStartY = touch.clientY;
    state.touchStartTime = Date.now();
    state.isSwiping = false;
    state.swipeInitiatedTracked = false;
  }

  function handleTouchMove(e) {
    if (!state.targetImage) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - state.touchStartX;
    const deltaY = state.touchStartY - touch.clientY;
    
    if (deltaY > 15 && Math.abs(deltaY) > Math.abs(deltaX)) {
      state.isSwiping = true;
      e.preventDefault();
      
      const progress = deltaY / CONFIG.SWIPE_THRESHOLD;
      const translateY = Math.min(deltaY * 0.3, 30);
      state.targetImage.style.transform = `translateY(-${translateY}px) scale(${1 - progress * 0.02})`;
      state.targetImage.style.transition = 'none';
      
      showSwipeOverlay(progress);
      
      if (deltaY > 20 && !state.swipeInitiatedTracked) {
        trackEvent('swipe_initiated');
        state.swipeInitiatedTracked = true;
      }
    }
  }

  function handleTouchEnd(e) {
    if (!state.targetImage) return;
    
    const deltaY = state.touchStartY - e.changedTouches[0].clientY;
    const deltaTime = Date.now() - state.touchStartTime;
    
    state.targetImage.style.transform = '';
    state.targetImage.style.transition = 'transform 0.3s ease';
    
    hideSwipeOverlay();
    
    const isValidSwipe = state.isSwiping && 
                         deltaY >= CONFIG.SWIPE_THRESHOLD && 
                         deltaTime <= CONFIG.SWIPE_MAX_TIME;
    
    if (isValidSwipe) {
      console.log('[SwipeUp] Swipe UP completed!');
      trackEvent('swipe_completed');
      triggerShare();
    } else if (state.isSwiping) {
      trackEvent('swipe_cancelled', { deltaY, deltaTime });
    }
    
    state.isSwiping = false;
  }

  // ============================================
  // SHARE & WHATSAPP
  // ============================================
  
  function triggerShare() {
    const data = state.productData;
    if (!data) return;
    
    const priceElement = document.querySelector('.price__regular .price-item, .product__price, [data-product-price], .price, .money');
    const price = priceElement ? priceElement.textContent.trim() : '';
    
    let shareText = data.productTitle 
      ? `${data.productTitle}${price ? ' - ' + price : ''} - Was meinst du? ${data.productUrl}?ref=swipeup`
      : `Check this out! ${window.location.href}?ref=swipeup`;
    
    const shareData = {
      title: data.productTitle || data.storeName,
      text: shareText,
      url: data.productUrl + '?ref=swipeup'
    };
    
    if (navigator.share) {
      navigator.share(shareData)
        .then(() => trackEvent('share_completed', { method: 'native' }))
        .catch(err => {
          if (err.name !== 'AbortError') {
            fallbackToWhatsApp(shareText);
          }
        });
    } else {
      fallbackToWhatsApp(shareText);
    }
  }

  function openWhatsApp() {
    const data = state.productData;
    if (!data || !data.whatsapp) {
      console.warn('[SwipeUp] No WhatsApp number');
      return;
    }
    
    const msg = data.productTitle 
      ? `Hi! Frage zu ${data.productTitle} - ${data.productUrl}`
      : `Hi! Ich habe eine Frage.`;
    
    window.open('https://wa.me/' + data.whatsapp + '?text=' + encodeURIComponent(msg), '_blank');
    trackEvent('whatsapp_opened');
  }

  function fallbackToWhatsApp(text) {
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    trackEvent('share_completed', { method: 'whatsapp_fallback' });
  }

  // ============================================
  // HIDE ON CART
  // ============================================
  
  function setupCartHide() {
    document.addEventListener('click', function(e) {
      const target = e.target.closest('button, a, [type="submit"]');
      if (!target) return;

      const text = (target.textContent || '').toLowerCase();
      const name = (target.name || '').toLowerCase();
      const className = (target.className || '').toLowerCase();
      
      if (
        name === 'add' ||
        className.includes('add-to-cart') ||
        className.includes('cart') ||
        className.includes('checkout') ||
        text.includes('add to cart') ||
        text.includes('in den warenkorb') ||
        text.includes('warenkorb') ||
        text.includes('view cart') ||
        text.includes('checkout') ||
        text.includes('zur kasse')
      ) {
        const buttons = document.querySelector('.swipeup-buttons');
        if (buttons) buttons.style.display = 'none';
      }
    });
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  
  function init() {
    const existing = document.querySelector('.swipeup-buttons');
    if (existing) existing.remove();
    
    // Hide the old floating widget completely
    const oldWidget = document.getElementById('swiftshare-widget');
    if (oldWidget) oldWidget.style.display = 'none';
    
    state.isMobile = isTouchDevice() && isMobileViewport();
    state.productData = getProductData();
    
    console.log('[SwipeUp] Initializing v2.2...', {
      isMobile: state.isMobile,
      hasProduct: !!state.productData?.productTitle,
      viewport: window.innerWidth + 'x' + window.innerHeight
    });
    
    if (state.isMobile && state.productData?.productTitle) {
      setTimeout(initSwipe, 500);
      setupCartHide();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', init);
  
})();
