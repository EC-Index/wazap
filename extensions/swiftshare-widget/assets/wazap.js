/**
 * Wazap v2 - The WhatsApp Shopify Connector
 * Features: Chat, Share, Multiple Agents, Business Hours, Analytics
 * Mobile: Floating buttons bottom right
 * Desktop: Floating bar bottom right
 */
(function() {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================
  let productData = null;
  let config = {
    agents: [],
    businessHours: null,
    analyticsEnabled: false
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  
  function isMobile() {
    return window.innerWidth <= 768;
  }

  function getProductData() {
    const container = document.getElementById('wazap-widget');
    if (!container) return null;
    
    // Parse agents JSON
    let agents = [];
    try {
      const agentsData = container.dataset.agents;
      if (agentsData) {
        agents = JSON.parse(agentsData);
      }
    } catch (e) {
      console.log('[Wazap] No agents configured');
    }
    
    // Parse business hours
    let businessHours = null;
    try {
      const hoursData = container.dataset.businessHours;
      if (hoursData) {
        businessHours = JSON.parse(hoursData);
      }
    } catch (e) {
      console.log('[Wazap] No business hours configured');
    }
    
    config.agents = agents;
    config.businessHours = businessHours;
    config.analyticsEnabled = container.dataset.analytics === 'true';
    
    return {
      whatsapp: container.dataset.whatsapp || '',
      storeName: container.dataset.storeName || '',
      productTitle: container.dataset.productTitle || '',
      productUrl: container.dataset.productUrl || window.location.href,
      chatText: container.dataset.chatText || 'Chat',
      shareButtonText: container.dataset.shareButtonText || 'Share',
      position: container.dataset.position || 'bottom-right',
      theme: container.dataset.theme || 'whatsapp',
      offlineMessage: container.dataset.offlineMessage || 'We are currently offline. Leave a message!',
      agents: agents,
      businessHours: businessHours
    };
  }

  // ============================================
  // BUSINESS HOURS CHECK
  // ============================================
  
  function isWithinBusinessHours() {
    if (!config.businessHours) return true;
    
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes;
    
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todaySchedule = config.businessHours[dayNames[day]];
    
    if (!todaySchedule || !todaySchedule.enabled) {
      return false;
    }
    
    const [startHour, startMin] = todaySchedule.start.split(':').map(Number);
    const [endHour, endMin] = todaySchedule.end.split(':').map(Number);
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    return currentTime >= startTime && currentTime <= endTime;
  }

  function getNextOpenTime() {
    if (!config.businessHours) return null;
    
    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    // Check next 7 days
    for (let i = 0; i < 7; i++) {
      const checkDay = (now.getDay() + i) % 7;
      const schedule = config.businessHours[dayNames[checkDay]];
      
      if (schedule && schedule.enabled) {
        if (i === 0) {
          // Today - check if opening time is still ahead
          const [startHour] = schedule.start.split(':').map(Number);
          if (now.getHours() < startHour) {
            return `Today at ${schedule.start}`;
          }
        } else {
          return `${dayNames[checkDay].charAt(0).toUpperCase() + dayNames[checkDay].slice(1)} at ${schedule.start}`;
        }
      }
    }
    return null;
  }

  // ============================================
  // GOOGLE ANALYTICS TRACKING
  // ============================================
  
  function trackEvent(eventType, eventData = {}) {
    const data = {
      product: productData?.productTitle || '',
      url: window.location.href,
      timestamp: Date.now(),
      ...eventData
    };
    
    console.log('[Wazap]', eventType, data);
    
    // Google Analytics 4
    if (config.analyticsEnabled && typeof gtag === 'function') {
      gtag('event', eventType, {
        event_category: 'Wazap',
        event_label: data.product,
        value: 1,
        ...eventData
      });
    }
    
    // Google Analytics Universal (legacy)
    if (config.analyticsEnabled && typeof ga === 'function') {
      ga('send', 'event', 'Wazap', eventType, data.product);
    }
    
    // Facebook Pixel
    if (typeof fbq === 'function') {
      if (eventType === 'share_completed') {
        fbq('track', 'Share', { content_name: data.product });
      } else if (eventType === 'whatsapp_opened') {
        fbq('track', 'Contact', { content_name: data.product });
      }
    }
  }

  // ============================================
  // SHARE FUNCTIONALITY
  // ============================================
  
  function triggerShare() {
    const data = productData;
    if (!data) return;
    
    const priceElement = document.querySelector('.price__regular .price-item, .product__price, [data-product-price], .price, .money');
    const price = priceElement ? priceElement.textContent.trim() : '';
    
    let shareText = data.productTitle 
      ? `${data.productTitle}${price ? ' - ' + price : ''} - What do you think? ${data.productUrl}?ref=wazap`
      : `Check this out! ${window.location.href}?ref=wazap`;
    
    const shareData = {
      title: data.productTitle || data.storeName,
      text: shareText,
      url: data.productUrl + '?ref=wazap'
    };
    
    if (navigator.share) {
      navigator.share(shareData)
        .then(() => trackEvent('share_completed', { method: 'native' }))
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
    trackEvent('share_completed', { method: 'whatsapp_fallback' });
  }

  // ============================================
  // WHATSAPP CHAT
  // ============================================
  
  function openWhatsApp(agent = null) {
    const data = productData;
    const number = agent ? agent.number : data?.whatsapp;
    
    if (!number) return;
    
    const isOnline = isWithinBusinessHours();
    let msg;
    
    if (data.productTitle) {
      msg = `Hi${agent ? ' ' + agent.name : ''}! Question about ${data.productTitle} - ${data.productUrl}`;
    } else {
      msg = `Hi${agent ? ' ' + agent.name : ''}! I have a question.`;
    }
    
    if (!isOnline) {
      msg += `\n\n(Sent outside business hours)`;
    }
    
    window.open('https://wa.me/' + number + '?text=' + encodeURIComponent(msg), '_blank');
    trackEvent('whatsapp_opened', { 
      agent: agent?.name || 'default',
      online: isOnline 
    });
  }

  // ============================================
  // AGENT SELECTOR POPUP
  // ============================================
  
  function showAgentSelector() {
    const agents = config.agents;
    if (!agents || agents.length === 0) {
      openWhatsApp();
      return;
    }
    
    // Remove existing popup
    const existing = document.querySelector('.wazap-agent-popup');
    if (existing) {
      existing.remove();
      return;
    }
    
    const isOnline = isWithinBusinessHours();
    const nextOpen = getNextOpenTime();
    
    const popup = document.createElement('div');
    popup.className = 'wazap-agent-popup';
    popup.innerHTML = `
      <div class="wazap-popup-header">
        <span class="wazap-popup-title">Chat with us</span>
        <span class="wazap-popup-status ${isOnline ? 'online' : 'offline'}">
          ${isOnline ? '● Online' : '○ Offline'}
        </span>
        <button class="wazap-popup-close">×</button>
      </div>
      ${!isOnline && nextOpen ? `<div class="wazap-popup-offline">Back ${nextOpen}</div>` : ''}
      <div class="wazap-agents-list">
        ${agents.map(agent => `
          <button class="wazap-agent" data-number="${agent.number}" data-name="${agent.name}">
            <div class="wazap-agent-avatar">${agent.avatar || agent.name.charAt(0)}</div>
            <div class="wazap-agent-info">
              <span class="wazap-agent-name">${agent.name}</span>
              <span class="wazap-agent-role">${agent.role || 'Support'}</span>
            </div>
            <svg class="wazap-agent-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        `).join('')}
      </div>
    `;
    
    // Styles
    popup.style.cssText = `
      position: fixed;
      bottom: 90px;
      right: 15px;
      width: 300px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 5px 40px rgba(0,0,0,0.2);
      z-index: 10000;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: wazapSlideUp 0.3s ease;
    `;
    
    // Add animation keyframes
    if (!document.querySelector('#wazap-animations')) {
      const style = document.createElement('style');
      style.id = 'wazap-animations';
      style.textContent = `
        @keyframes wazapSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Header styles
    const header = popup.querySelector('.wazap-popup-header');
    header.style.cssText = `
      display: flex;
      align-items: center;
      padding: 16px;
      background: #25D366;
      color: white;
    `;
    
    popup.querySelector('.wazap-popup-title').style.cssText = `
      font-weight: 600;
      font-size: 16px;
      flex: 1;
    `;
    
    const status = popup.querySelector('.wazap-popup-status');
    status.style.cssText = `
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 12px;
      background: ${isOnline ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'};
    `;
    
    popup.querySelector('.wazap-popup-close').style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      margin-left: 8px;
      line-height: 1;
    `;
    
    // Offline message
    const offlineMsg = popup.querySelector('.wazap-popup-offline');
    if (offlineMsg) {
      offlineMsg.style.cssText = `
        padding: 8px 16px;
        background: #fff3cd;
        color: #856404;
        font-size: 13px;
        text-align: center;
      `;
    }
    
    // Agents list
    popup.querySelector('.wazap-agents-list').style.cssText = `
      padding: 8px;
    `;
    
    // Agent buttons
    popup.querySelectorAll('.wazap-agent').forEach(btn => {
      btn.style.cssText = `
        display: flex;
        align-items: center;
        width: 100%;
        padding: 12px;
        border: none;
        background: #f8f9fa;
        border-radius: 12px;
        cursor: pointer;
        margin-bottom: 8px;
        transition: background 0.2s;
      `;
      
      btn.querySelector('.wazap-agent-avatar').style.cssText = `
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: #25D366;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 18px;
        margin-right: 12px;
      `;
      
      btn.querySelector('.wazap-agent-info').style.cssText = `
        flex: 1;
        text-align: left;
      `;
      
      btn.querySelector('.wazap-agent-name').style.cssText = `
        display: block;
        font-weight: 600;
        color: #333;
        font-size: 14px;
      `;
      
      btn.querySelector('.wazap-agent-role').style.cssText = `
        display: block;
        color: #666;
        font-size: 12px;
      `;
      
      btn.querySelector('.wazap-agent-arrow').style.cssText = `
        width: 20px;
        height: 20px;
        color: #999;
      `;
      
      btn.addEventListener('mouseenter', () => btn.style.background = '#e9ecef');
      btn.addEventListener('mouseleave', () => btn.style.background = '#f8f9fa');
      
      btn.addEventListener('click', () => {
        const agent = {
          number: btn.dataset.number,
          name: btn.dataset.name
        };
        openWhatsApp(agent);
        popup.remove();
      });
    });
    
    // Close button
    popup.querySelector('.wazap-popup-close').addEventListener('click', () => popup.remove());
    
    // Click outside to close
    setTimeout(() => {
      document.addEventListener('click', function closePopup(e) {
        if (!popup.contains(e.target) && !e.target.closest('.wazap-btn--whatsapp')) {
          popup.remove();
          document.removeEventListener('click', closePopup);
        }
      });
    }, 100);
    
    document.body.appendChild(popup);
    trackEvent('agent_selector_opened');
  }

  // ============================================
  // MOBILE BUTTONS
  // ============================================
  
  function createMobileButtons() {
    const container = document.getElementById('wazap-widget');
    if (!container) return;
    
    container.style.display = 'block';
    
    const isOnline = isWithinBusinessHours();
    const hasAgents = config.agents && config.agents.length > 0;
    
    container.innerHTML = `
      <div class="wazap-mobile">
        <button class="wazap-btn wazap-btn--share" aria-label="Share">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
        <button class="wazap-btn wazap-btn--whatsapp" aria-label="WhatsApp">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          ${!isOnline ? '<span class="wazap-offline-dot"></span>' : ''}
        </button>
      </div>
    `;
    
    // Styles
    const wrapper = container.querySelector('.wazap-mobile');
    wrapper.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 15px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;
    
    const buttons = container.querySelectorAll('.wazap-btn');
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
        position: relative;
      `;
      
      btn.querySelector('svg').style.cssText = `
        width: 24px;
        height: 24px;
      `;
    });
    
    // Share button
    const shareBtn = container.querySelector('.wazap-btn--share');
    shareBtn.style.background = 'rgba(0, 0, 0, 0.85)';
    shareBtn.querySelector('svg').style.color = 'white';
    shareBtn.addEventListener('click', () => {
      trackEvent('share_clicked');
      triggerShare();
    });
    
    // WhatsApp button
    const waBtn = container.querySelector('.wazap-btn--whatsapp');
    waBtn.style.background = '#25D366';
    waBtn.querySelector('svg').style.color = 'white';
    waBtn.addEventListener('click', () => {
      trackEvent('whatsapp_clicked');
      if (hasAgents) {
        showAgentSelector();
      } else {
        openWhatsApp();
      }
    });
    
    // Offline indicator
    const offlineDot = container.querySelector('.wazap-offline-dot');
    if (offlineDot) {
      offlineDot.style.cssText = `
        position: absolute;
        top: 2px;
        right: 2px;
        width: 12px;
        height: 12px;
        background: #ff9800;
        border-radius: 50%;
        border: 2px solid white;
      `;
    }
    
    // Tap feedback
    buttons.forEach(btn => {
      btn.addEventListener('touchstart', () => btn.style.transform = 'scale(0.92)');
      btn.addEventListener('touchend', () => btn.style.transform = 'scale(1)');
    });
    
    // Safe area
    if (CSS.supports('padding-bottom: env(safe-area-inset-bottom)')) {
      wrapper.style.bottom = 'calc(20px + env(safe-area-inset-bottom))';
    }
  }

  // ============================================
  // DESKTOP BAR
  // ============================================
  
  function createDesktopBar() {
    const container = document.getElementById('wazap-widget');
    if (!container) return;
    
    container.style.display = 'block';
    
    const data = productData;
    const isOnline = isWithinBusinessHours();
    const hasAgents = config.agents && config.agents.length > 0;
    
    container.innerHTML = `
      <div class="wazap-desktop">
        <button class="wazap-desktop__btn wazap-desktop__btn--share">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          <span>${data.shareButtonText}</span>
        </button>
        <button class="wazap-desktop__btn wazap-desktop__btn--whatsapp">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <span>${data.chatText}</span>
          ${!isOnline ? '<span class="wazap-status-dot offline"></span>' : '<span class="wazap-status-dot online"></span>'}
        </button>
      </div>
    `;
    
    // Wrapper
    const wrapper = container.querySelector('.wazap-desktop');
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
    
    // Buttons
    const buttons = container.querySelectorAll('.wazap-desktop__btn');
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
        position: relative;
      `;
      
      btn.querySelector('svg').style.cssText = `
        width: 20px;
        height: 20px;
      `;
      
      btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.05)');
      btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
    });
    
    // Share button
    const shareBtn = container.querySelector('.wazap-desktop__btn--share');
    shareBtn.style.background = '#f0f0f0';
    shareBtn.style.color = '#333';
    shareBtn.addEventListener('click', () => {
      trackEvent('share_clicked');
      triggerShare();
    });
    
    // WhatsApp button
    const waBtn = container.querySelector('.wazap-desktop__btn--whatsapp');
    waBtn.style.background = '#25D366';
    waBtn.style.color = 'white';
    waBtn.addEventListener('click', () => {
      trackEvent('whatsapp_clicked');
      if (hasAgents) {
        showAgentSelector();
      } else {
        openWhatsApp();
      }
    });
    
    // Status dot
    const statusDot = container.querySelector('.wazap-status-dot');
    if (statusDot) {
      statusDot.style.cssText = `
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-left: 4px;
        background: ${isOnline ? '#4ade80' : '#ff9800'};
      `;
    }
  }

  // ============================================
  // ABANDONED CART RECOVERY
  // ============================================
  
  function setupAbandonedCartRecovery() {
    // Check if we're on checkout or have items in cart
    const cartCount = document.querySelector('.cart-count, .cart-item-count, [data-cart-count]');
    
    // Store cart state for recovery
    window.addEventListener('beforeunload', () => {
      if (cartCount && parseInt(cartCount.textContent) > 0) {
        const cartData = {
          timestamp: Date.now(),
          url: window.location.href,
          store: productData?.storeName
        };
        localStorage.setItem('wazap_abandoned_cart', JSON.stringify(cartData));
      }
    });
    
    // Check for abandoned cart on return
    const abandonedCart = localStorage.getItem('wazap_abandoned_cart');
    if (abandonedCart) {
      try {
        const cartData = JSON.parse(abandonedCart);
        const hoursSinceAbandonment = (Date.now() - cartData.timestamp) / (1000 * 60 * 60);
        
        // Show recovery prompt after 1 hour but within 48 hours
        if (hoursSinceAbandonment > 1 && hoursSinceAbandonment < 48) {
          setTimeout(() => showCartRecoveryPrompt(), 3000);
        } else if (hoursSinceAbandonment >= 48) {
          localStorage.removeItem('wazap_abandoned_cart');
        }
      } catch (e) {
        localStorage.removeItem('wazap_abandoned_cart');
      }
    }
  }

  function showCartRecoveryPrompt() {
    // Only show once per session
    if (sessionStorage.getItem('wazap_recovery_shown')) return;
    sessionStorage.setItem('wazap_recovery_shown', 'true');
    
    const prompt = document.createElement('div');
    prompt.className = 'wazap-recovery-prompt';
    prompt.innerHTML = `
      <div class="wazap-recovery-content">
        <button class="wazap-recovery-close">×</button>
        <div class="wazap-recovery-icon">🛒</div>
        <h3>You left something behind!</h3>
        <p>Need help completing your order? Chat with us on WhatsApp!</p>
        <button class="wazap-recovery-btn">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Chat Now
        </button>
      </div>
    `;
    
    prompt.style.cssText = `
      position: fixed;
      bottom: 100px;
      right: 20px;
      z-index: 10001;
      animation: wazapSlideUp 0.4s ease;
    `;
    
    const content = prompt.querySelector('.wazap-recovery-content');
    content.style.cssText = `
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      text-align: center;
      max-width: 280px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      position: relative;
    `;
    
    prompt.querySelector('.wazap-recovery-close').style.cssText = `
      position: absolute;
      top: 8px;
      right: 12px;
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #999;
    `;
    
    prompt.querySelector('.wazap-recovery-icon').style.cssText = `
      font-size: 48px;
      margin-bottom: 12px;
    `;
    
    prompt.querySelector('h3').style.cssText = `
      margin: 0 0 8px;
      font-size: 18px;
      color: #333;
    `;
    
    prompt.querySelector('p').style.cssText = `
      margin: 0 0 16px;
      color: #666;
      font-size: 14px;
    `;
    
    const btn = prompt.querySelector('.wazap-recovery-btn');
    btn.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: #25D366;
      color: white;
      border: none;
      border-radius: 50px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    `;
    
    btn.addEventListener('click', () => {
      trackEvent('cart_recovery_clicked');
      const msg = `Hi! I was looking at some items in my cart and had a question.`;
      window.open('https://wa.me/' + productData.whatsapp + '?text=' + encodeURIComponent(msg), '_blank');
      prompt.remove();
      localStorage.removeItem('wazap_abandoned_cart');
    });
    
    prompt.querySelector('.wazap-recovery-close').addEventListener('click', () => {
      prompt.remove();
      trackEvent('cart_recovery_dismissed');
    });
    
    document.body.appendChild(prompt);
    trackEvent('cart_recovery_shown');
  }

  // ============================================
  // HIDE ON CART ACTIONS
  // ============================================
  
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
        const widget = document.getElementById('wazap-widget');
        if (widget) widget.style.display = 'none';
        
        // Clear abandoned cart flag on successful purchase intent
        if (text.includes('checkout') || text.includes('zur kasse')) {
          localStorage.removeItem('wazap_abandoned_cart');
        }
      }
    });
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  
  function init() {
    productData = getProductData();
    
    if (!productData || !productData.whatsapp) {
      console.log('[Wazap] No WhatsApp number configured');
      return;
    }
    
    console.log('[Wazap] Initializing v2...', {
      isMobile: isMobile(),
      hasProduct: !!productData.productTitle,
      hasAgents: config.agents.length,
      hasBusinessHours: !!config.businessHours,
      isOnline: isWithinBusinessHours()
    });
    
    if (isMobile()) {
      createMobileButtons();
    } else {
      createDesktopBar();
    }
    
    hideOnCartClick();
    setupAbandonedCartRecovery();
    
    // Handle resize
    let lastMobile = isMobile();
    window.addEventListener('resize', () => {
      const nowMobile = isMobile();
      if (nowMobile !== lastMobile) {
        lastMobile = nowMobile;
        // Close any open popups
        const popup = document.querySelector('.wazap-agent-popup');
        if (popup) popup.remove();
        
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
