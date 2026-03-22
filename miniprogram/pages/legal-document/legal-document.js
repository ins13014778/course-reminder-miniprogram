const { fetchContentPage } = require('../../utils/content-page');

const NAV_TITLE_MAP = {
  user_agreement: '用户服务协议',
  privacy_policy: '隐私政策',
};

Page({
  data: {
    loading: true,
    pageKey: 'user_agreement',
    title: '',
    subtitle: '',
    content: '',
    footer: '',
  },

  onLoad(options = {}) {
    const pageKey = options.key === 'privacy_policy' ? 'privacy_policy' : 'user_agreement';
    this.setData({ pageKey });
    wx.setNavigationBarTitle({
      title: NAV_TITLE_MAP[pageKey] || '协议说明',
    });
    this.loadContent();
  },

  async loadContent() {
    this.setData({ loading: true });

    try {
      const page = await fetchContentPage(this.data.pageKey);
      const extra = page.extra || {};
      this.setData({
        title: page.title,
        subtitle: page.subtitle,
        content: page.content,
        footer: extra.footer || '',
        loading: false,
      });
    } catch (error) {
      console.error('[legal-document] load failed', error);
      this.setData({ loading: false });
      wx.showToast({ title: '页面加载失败', icon: 'none' });
    }
  },
});
