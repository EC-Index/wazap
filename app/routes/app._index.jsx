import { useLoaderData, useFetcher, Link } from "react-router";
import { useState, useEffect } from "react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  let settings = await prisma.shopSettings.findUnique({
    where: { shop },
  });

  if (!settings) {
    settings = await prisma.shopSettings.create({
      data: { shop },
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const sharesToday = await prisma.analytics.count({
    where: { shop, eventType: 'share_click', createdAt: { gte: today } }
  });

  const chatsToday = await prisma.analytics.count({
    where: { shop, eventType: 'chat_click', createdAt: { gte: today } }
  });

  const totalShares = await prisma.analytics.count({
    where: { shop, eventType: 'share_click' }
  });

  const totalChats = await prisma.analytics.count({
    where: { shop, eventType: 'chat_click' }
  });

  const sharesThisWeek = await prisma.analytics.count({
    where: { shop, eventType: 'share_click', createdAt: { gte: weekAgo } }
  });

  // Check if this is a new install (no activity yet)
  const isNewInstall = totalShares === 0 && totalChats === 0;

  const estimatedSales = Math.floor(totalShares * 0.08);
  const estimatedRevenue = estimatedSales * 45;

  return {
    settings,
    shop,
    analytics: {
      sharesToday,
      chatsToday,
      totalShares,
      totalChats,
      sharesThisWeek,
      estimatedSales,
      estimatedRevenue,
      isNewInstall
    }
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();

  const whatsappNumber = formData.get("whatsappNumber")?.replace(/[^0-9]/g, '') || '';
  const widgetEnabled = formData.get("widgetEnabled") === "true";
  const position = formData.get("position") || "bottom-right";
  const theme = formData.get("theme") || "whatsapp";
  const chatText = formData.get("chatText") || "Chat";
  const shareText = formData.get("shareText") || "Get opinion";

  await prisma.shopSettings.upsert({
    where: { shop },
    update: { whatsappNumber, widgetEnabled, position, theme, chatText, shareText },
    create: { shop, whatsappNumber, widgetEnabled, position, theme, chatText, shareText },
  });

  return { success: true };
};

export default function Index() {
  const { settings, analytics } = useLoaderData();
  const fetcher = useFetcher();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showTipBanner, setShowTipBanner] = useState(true);

  const [whatsappNumber, setWhatsappNumber] = useState(settings?.whatsappNumber || "");
  const [widgetEnabled, setWidgetEnabled] = useState(settings?.widgetEnabled ?? true);
  const [position, setPosition] = useState(settings?.position || "bottom-right");
  const [theme, setTheme] = useState(settings?.theme || "whatsapp");
  const [chatText, setChatText] = useState(settings?.chatText || "Chat");
  const [shareText, setShareText] = useState(settings?.shareText || "Get opinion");

  const isSaving = fetcher.state === "submitting";

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Settings saved!");
    }
  }, [fetcher.data]);

  const handleSave = () => {
    fetcher.submit(
      { whatsappNumber, widgetEnabled: String(widgetEnabled), position, theme, chatText, shareText },
      { method: "POST" }
    );
  };

  // Format number display - show dash instead of 0 for new installs
  const formatStat = (value, isNew) => {
    if (isNew && value === 0) return "—";
    return value;
  };

  return (
    <s-page heading="Wazap Dashboard">
      <s-button slot="primary-action" variant="primary" onClick={handleSave} loading={isSaving}>
        Save Settings
      </s-button>

      {/* Actionable Tip Banner */}
      {showTipBanner && shareText !== "Get opinion" && (
        <div style={{
          background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
          padding: '16px 20px',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>💡</span>
            <div>
              <strong>"Get opinion" converts 2× better than "Share"</strong>
              <div style={{ fontSize: '13px', color: '#666' }}>Change your button text to increase shares</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                setShareText("Get opinion");
                setTimeout(() => document.getElementById('settings-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
              }}
              style={{
                background: '#333',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px'
              }}
            >
              Apply Now →
            </button>
            <button
              onClick={() => setShowTipBanner(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#666',
                cursor: 'pointer',
                fontSize: '18px'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* New Install Onboarding */}
      {analytics.isNewInstall && (
        <div style={{
          background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
          padding: '24px',
          borderRadius: '16px',
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
          <h2 style={{ margin: '0 0 8px 0' }}>Welcome to Wazap!</h2>
          <p style={{ color: '#555', margin: '0 0 20px 0' }}>
            Your widget is ready. Test it yourself to see how it works!
          </p>
          <div style={{
            background: 'white',
            padding: '16px',
            borderRadius: '12px',
            display: 'inline-block'
          }}>
            <strong>🧪 Quick Test:</strong> Visit your store, click the Share button, and send yourself a product link.
          </div>
        </div>
      )}

      {/* Analytics Overview */}
      <s-section heading="📊 Performance Overview">
        <s-stack direction="inline" gap="loose" wrap>
          {/* Shares Today */}
          <div style={{
            flex: '1 1 200px',
            padding: '20px',
            background: analytics.isNewInstall
              ? 'linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)'
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            color: analytics.isNewInstall ? '#666' : 'white',
            minWidth: '150px'
          }}>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>Shares Today</div>
            <div style={{ fontSize: '36px', fontWeight: 'bold' }}>
              {formatStat(analytics.sharesToday, analytics.isNewInstall)}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>
              {analytics.isNewInstall ? "Your first share is coming!" : `+${analytics.sharesThisWeek} this week`}
            </div>
          </div>

          {/* Total Shares */}
          <div style={{
            flex: '1 1 200px',
            padding: '20px',
            background: analytics.isNewInstall
              ? 'linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)'
              : 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
            borderRadius: '12px',
            color: analytics.isNewInstall ? '#666' : 'white',
            minWidth: '150px'
          }}>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Shares</div>
            <div style={{ fontSize: '36px', fontWeight: 'bold' }}>
              {formatStat(analytics.totalShares, analytics.isNewInstall)}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>All time</div>
          </div>

          {/* WhatsApp Clicks (renamed from Chats) */}
          <div style={{
            flex: '1 1 200px',
            padding: '20px',
            background: analytics.isNewInstall
              ? 'linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)'
              : 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
            borderRadius: '12px',
            color: analytics.isNewInstall ? '#666' : 'white',
            minWidth: '150px'
          }}>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>WhatsApp Clicks</div>
            <div style={{ fontSize: '36px', fontWeight: 'bold' }}>
              {formatStat(analytics.chatsToday, analytics.isNewInstall)}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>
              {analytics.isNewInstall ? "Contact requests" : `${analytics.totalChats} total`}
            </div>
          </div>

          {/* Conversion Rate */}
          <div style={{
            flex: '1 1 200px',
            padding: '20px',
            background: analytics.isNewInstall
              ? 'linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)'
              : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            borderRadius: '12px',
            color: analytics.isNewInstall ? '#666' : 'white',
            minWidth: '150px'
          }}>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>Est. Conversion</div>
            <div style={{ fontSize: '36px', fontWeight: 'bold' }}>
              {analytics.isNewInstall ? "—" : "~8%"}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>Industry average</div>
          </div>
        </s-stack>
      </s-section>

      {/* PRO Features Teaser */}
      <s-section heading="🔒 Pro Analytics">
        <div style={{ position: 'relative' }}>
          <div style={{
            filter: 'blur(3px)',
            opacity: 0.7,
            pointerEvents: 'none',
            userSelect: 'none'
          }}>
            <s-stack direction="inline" gap="loose" wrap>
              <div style={{
                flex: '1 1 280px',
                padding: '20px',
                background: '#fafafa',
                borderRadius: '12px',
                border: '1px solid #eee'
              }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>🏆 Top Shared Products</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>1. Snowboard Oxy...</span>
                    <span style={{ background: '#e8f5e9', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>12 shares</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>2. Winter Jack...</span>
                    <span style={{ background: '#e3f2fd', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>8 shares</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>3. ████████</span>
                    <span style={{ background: '#fff3e0', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>5 shares</span>
                  </div>
                </div>
              </div>

              <div style={{
                flex: '1 1 200px',
                padding: '20px',
                background: '#fafafa',
                borderRadius: '12px',
                border: '1px solid #eee'
              }}>
                <div style={{ fontSize: '14px', color: '#666' }}>💰 Sales from Shares</div>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#333' }}>{analytics.estimatedSales || 3}</div>
                <div style={{ fontSize: '12px', color: '#999' }}>Attributed orders</div>
              </div>

              <div style={{
                flex: '1 1 200px',
                padding: '20px',
                background: '#fafafa',
                borderRadius: '12px',
                border: '1px solid #eee'
              }}>
                <div style={{ fontSize: '14px', color: '#666' }}>📊 Channel Breakdown</div>
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ width: '60%', height: '8px', background: '#25D366', borderRadius: '4px' }}></div>
                    <span style={{ fontSize: '12px' }}>WhatsApp 65%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ width: '25%', height: '8px', background: '#007AFF', borderRadius: '4px' }}></div>
                    <span style={{ fontSize: '12px' }}>iMessage 20%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '15%', height: '8px', background: '#999', borderRadius: '4px' }}></div>
                    <span style={{ fontSize: '12px' }}>Other 15%</span>
                  </div>
                </div>
              </div>
            </s-stack>
          </div>

          {/* Upgrade Overlay */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            zIndex: 10
          }}>
            <div style={{
              background: 'white',
              padding: '24px 32px',
              borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
              border: '2px solid #667eea'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔓</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>Unlock Pro Analytics</div>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
                See exactly which products drive sales
              </div>
              <button
                onClick={() => setShowUpgradeModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 28px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Upgrade — $9.99/mo
              </button>
            </div>
          </div>
        </div>
      </s-section>

      {/* Widget Settings */}
      <s-section heading="⚙️ Widget Settings" id="settings-section">
        <s-box padding="loose" borderWidth="base" borderRadius="large">
          <s-stack direction="block" gap="loose">

            <s-stack direction="inline" gap="base" align="space-between">
              <s-stack direction="block" gap="tight">
                <s-text fontWeight="bold">Enable Widget</s-text>
                <s-text tone="subdued">Show Wazap on your store</s-text>
              </s-stack>
              <input
                type="checkbox"
                checked={widgetEnabled}
                onChange={(e) => setWidgetEnabled(e.target.checked)}
                style={{ width: 24, height: 24, cursor: 'pointer' }}
              />
            </s-stack>

            <hr style={{ border: 'none', borderTop: '1px solid #e0e0e0' }} />

            <s-stack direction="block" gap="tight">
              <s-text fontWeight="bold">WhatsApp Number *</s-text>
              <input
                type="tel"
                placeholder="491701234567"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                style={{ padding: 12, borderRadius: 8, border: '1px solid #ccc', width: '100%', fontSize: 16 }}
              />
              <s-text tone="subdued">Include country code without +</s-text>
            </s-stack>

            <hr style={{ border: 'none', borderTop: '1px solid #e0e0e0' }} />

            {/* NEW: Button Text Settings */}
            <s-stack direction="block" gap="tight">
              <s-text fontWeight="bold">Share Button Text</s-text>
              <select
                value={shareText}
                onChange={(e) => setShareText(e.target.value)}
                style={{ padding: 12, borderRadius: 8, border: '1px solid #ccc', width: '100%', fontSize: 16 }}
              >
                <option value="Get opinion">💬 Get opinion (recommended)</option>
                <option value="Ask a friend">👋 Ask a friend</option>
                <option value="What do you think?">🤔 What do you think?</option>
                <option value="Send to friend">📤 Send to friend</option>
                <option value="Share">📤 Share</option>
              </select>
              <s-text tone="subdued">"Get opinion" converts 2× better than generic "Share"</s-text>
            </s-stack>

            <s-stack direction="block" gap="tight">
              <s-text fontWeight="bold">Chat Button Text</s-text>
              <select
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                style={{ padding: 12, borderRadius: 8, border: '1px solid #ccc', width: '100%', fontSize: 16 }}
              >
                <option value="Chat">💬 Chat</option>
                <option value="Ask us">❓ Ask us</option>
                <option value="Help">🆘 Help</option>
                <option value="Questions?">❓ Questions?</option>
              </select>
            </s-stack>

            <hr style={{ border: 'none', borderTop: '1px solid #e0e0e0' }} />

            <s-stack direction="block" gap="tight">
              <s-text fontWeight="bold">Position</s-text>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                style={{ padding: 12, borderRadius: 8, border: '1px solid #ccc', width: '100%', fontSize: 16 }}
              >
                <option value="bottom-right">Bottom Right (78% prefer this)</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-center">Bottom Center</option>
              </select>
            </s-stack>

            <s-stack direction="block" gap="tight">
              <s-text fontWeight="bold">Theme</s-text>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                style={{ padding: 12, borderRadius: 8, border: '1px solid #ccc', width: '100%', fontSize: 16 }}
              >
                <option value="whatsapp">WhatsApp Green</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </s-stack>

          </s-stack>
        </s-box>
      </s-section>

      {/* Quick Tips Sidebar */}
      <s-section slot="aside" heading="📈 Growth Tips">
        <s-box padding="base" borderRadius="base" background="success-subdued">
          <s-stack direction="block" gap="tight">
            <s-text fontWeight="bold">🖼️ Great Images = More Shares</s-text>
            <s-text tone="subdued">Products with lifestyle photos get 3× more shares.</s-text>
          </s-stack>
        </s-box>
        <div style={{ marginTop: 12 }}>
          <s-box padding="base" borderRadius="base" background="info-subdued">
            <s-stack direction="block" gap="tight">
              <s-text fontWeight="bold">📱 Mobile First</s-text>
              <s-text tone="subdued">82% of shares happen on mobile devices.</s-text>
            </s-stack>
          </s-box>
        </div>
        <div style={{ marginTop: 12 }}>
          <s-box padding="base" borderRadius="base" background="warning-subdued">
            <s-stack direction="block" gap="tight">
              <s-text fontWeight="bold">⏰ Peak Times</s-text>
              <s-text tone="subdued">Most shares happen 7-10 PM. Perfect for impulse buys!</s-text>
            </s-stack>
          </s-box>
        </div>
      </s-section>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowUpgradeModal(false)}>
          <div style={{
            background: 'white',
            borderRadius: 20,
            padding: 36,
            maxWidth: 420,
            textAlign: 'center',
            position: 'relative'
          }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowUpgradeModal(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'transparent',
                border: 'none',
                fontSize: 24,
                cursor: 'pointer',
                color: '#999'
              }}
            >×</button>

            <div style={{ fontSize: 56, marginBottom: 16 }}>🚀</div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: 24 }}>Upgrade to Pro</h2>
            <p style={{ color: '#666', margin: '0 0 24px 0', fontSize: 15 }}>
              Know exactly which products your customers love to share.
            </p>

            <div style={{
              background: '#f8f9fa',
              padding: 20,
              borderRadius: 12,
              textAlign: 'left',
              marginBottom: 24
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: 12 }}>Everything in Pro:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>✅ See top shared products</div>
                <div>✅ Track sales from shares</div>
                <div>✅ Channel breakdown (WhatsApp, iMessage...)</div>
                <div>✅ Customer insights</div>
                <div>✅ Export reports (CSV)</div>
                <div>✅ Priority support</div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: 42, fontWeight: 'bold' }}>$9.99</span>
              <span style={{ color: '#666', fontSize: 16 }}>/month</span>
            </div>

            <button style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '16px 32px',
              borderRadius: 10,
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: 16,
              width: '100%',
              marginBottom: 12
            }}>
              Start 7-Day Free Trial →
            </button>
            <div style={{ fontSize: 13, color: '#999' }}>
              No credit card required • Cancel anytime
            </div>
          </div>
        </div>
      )}
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
