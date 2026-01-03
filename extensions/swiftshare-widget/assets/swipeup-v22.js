/**
 * Whatify v1 - Share the Vibe
 * Mobile: Floating buttons unten rechts
 * Desktop: Floating bar unten rechts
 */
(function() {
  'use strict';

  let productData = null;

  function isMobile() {
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
      shareButtonText: container.dataset.shareButtonText || 'Share',
      position: container.dataset.position || 'bottom-right',
      theme: container.dataset.theme || 'whatsapp'
    };
  }

  function trackEvent(eventType) {
    console.log('[Whatify]', eventType, {
      product: productData?.productTitle || '',
      url: window.location.href,
      timestamp: Date.now()
    });
  }

  function triggerShare() {
    const data = productData;
    if (!data) return;
    
    const priceElement = document.querySelector('.price__regular .price-item, .product__price, [data-product-price], .price, .money');
    const price = priceElement ? priceElement.textContent.trim() : '';
    
    let shareText = data.productTitle 
      ? `${data.productTitle}${price ? ' - ' + price : ''} - Was meinst du? ${data.productUrl}?ref=whatify`
      : `Check this out! ${window.location.href}?ref=whatify`;
    
    const shareData = {
      title: data.productTitle || data.storeName,
      text: shareText,
      url: data.productUrl + '?ref=whatify'
    };
    
    if (navigator.share) {
      navigator.share(shareData)
        .then(() => trackEvent('share_completed'))
        .catch(err => {
          if (err.name !== 'AbortError') {
            fallbackShare(shareText);
          }
        });
    } else {
      fallbackShare(shareText);
    }
  }

  function fallbackShare(text) {
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    trackEvent('share_fallback');
  }

  function openWhatsApp() {
    const data = productData;
    if (!data || !data.whatsapp) return;
    
    const msg = data.productTitle 
      ? `Hi! Frage zu ${data.productTitle} - ${data.productUrl}`
      : `Hi! Ich habe eine Frage.`;
    
    window.open('https://wa.me/' + data.whatsapp + '?text=' + encodeURIComponent(msg), '_blank');
    trackEvent('whatsapp_opened');
  }

  function createMobileButtons() {
    const container = document.getElementById('swiftshare-widget');
    if (!container) return;
    
    // Make container visible
    container.style.display = 'block';
    
    container.innerHTML = `
      <div class="whatify-mobile">
        <button class="whatify-btn whatify-btn--share" aria-label="Share">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
        <button class="whatify-btn whatify-btn--whatsapp" aria-label="WhatsApp">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </button>
      </div>
    `;
    
    // Styles
    const wrapper = container.querySelector('.whatify-mobile');
    wrapper.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 15px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;
    
    // Button styles
    const buttons = container.querySelectorAll('.whatify-btn');
    buttons.forEach(btn => {
      btn.style.cssText = `
        width: 52px;
        height: 52px;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
        transition: transform 0.2s ease;
        -webkit-tap-highlight-color: transparent;
      `;
      
      btn.querySelector('svg').style.cssText = `
        width: 24px;
        height: 24px;
      `;
    });
    
    // Share button (dark)
    const shareBtn = container.querySelector('.whatify-btn--share');
    shareBtn.style.background = 'rgba(0, 0, 0, 0.85)';
    shareBtn.querySelector('svg').style.color = 'white';
    shareBtn.addEventListener('click', () => {
      trackEvent('share_clicked');
      triggerShare();
    });
    
    // WhatsApp button (green)
    const waBtn = container.querySelector('.whatify-btn--whatsapp');
    waBtn.style.background = '#25D366';
    waBtn.querySelector('svg').style.color = 'white';
    waBtn.addEventListener('click', () => {
      trackEvent('whatsapp_clicked');
      openWhatsApp();
    });
    
    // Tap feedback
    buttons.forEach(btn => {
      btn.addEventListener('touchstart', () => btn.style.transform = 'scale(0.92)');
      btn.addEventListener('touchend', () => btn.style.transform = 'scale(1)');
    });
    
    // Safe area for iPhone
    if (CSS.supports('padding-bottom: env(safe-area-inset-bottom)')) {
      wrapper.style.bottom = 'calc(20px + env(safe-area-inset-bottom))';
    }
  }

  function createDesktopBar() {
    const container = document.getElementById('swiftshare-widget');
    if (!container) return;
    
    // Make container visible
    container.style.display = 'block';
    
    const data = productData;
    
    container.innerHTML = `
      <div class="whatify-desktop">
        <button class="whatify-desktop__btn whatify-desktop__btn--share">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          <span>${data.shareButtonText}</span>
        </button>
        <button class="whatify-desktop__btn whatify-desktop__btn--whatsapp">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <span>${data.chatText}</span>
        </button>
      </div>
    `;
    
    // Wrapper styles
    const wrapper = container.querySelector('.whatify-desktop');
    wrapper.style.cssText = `
      position: fixed;
      bottom: 30px;
      right: 20px;
      z-index: 9999;
      display: flex;
      gap: 8px;
      padding: 8px;
      border-radius: 50px;
      background: rgba(255, 255, 255, 0.95);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    // Button styles
    const buttons = container.querySelectorAll('.whatify-desktop__btn');
    buttons.forEach(btn => {
      btn.style.cssText = `
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 12px 20px;
        border: none;
        border-radius: 50px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: transform 0.2s ease;
      `;
      
      btn.querySelector('svg').style.cssText = `
        width: 20px;
        height: 20px;
      `;
      
      btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.05)');
      btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
    });
    
    // Share button (light)
    const shareBtn = container.querySelector('.whatify-desktop__btn--share');
    shareBtn.style.background = '#f0f0f0';
    shareBtn.style.color = '#333';
    shareBtn.addEventListener('click', () => {
      trackEvent('share_clicked');
      triggerShare();
    });
    
    // WhatsApp button (green)
    const waBtn = container.querySelector('.whatify-desktop__btn--whatsapp');
    waBtn.style.background = '#25D366';
    waBtn.style.color = 'white';
    waBtn.addEventListener('click', () => {
      trackEvent('whatsapp_clicked');
      openWhatsApp();
    });
  }

  function hideOnCartClick() {
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
        text.includes('view cart') ||
        text.includes('checkout') ||
        text.includes('zur kasse')
      ) {
        const widget = document.getElementById('swiftshare-widget');
        if (widget) widget.style.display = 'none';
      }
    });
  }

  function init() {
    productData = getProductData();
    
    if (!productData || !productData.whatsapp) {
      console.log('[Whatify] No WhatsApp number configured');
      return;
    }
    
    console.log('[Whatify] Initializing v1...', {
      isMobile: isMobile(),
      hasProduct: !!productData.productTitle
    });
    
    if (isMobile()) {
      createMobileButtons();
    } else {
      createDesktopBar();
    }
    
    hideOnCartClick();
    
    // Handle resize
    let lastMobile = isMobile();
    window.addEventListener('resize', () => {
      const nowMobile = isMobile();
      if (nowMobile !== lastMobile) {
        lastMobile = nowMobile;
        if (nowMobile) {
          createMobileButtons();
        } else {
          createDesktopBar();
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', init);
  
})();
