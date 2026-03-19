const { fetchContentPage } = require('../../utils/content-page');

Page({
  data: {
    loading: true,
    title: '',
    subtitle: '',
    content: '',
    contacts: [],
    version: '',
    footer: '',
  },

  onLoad() {
    this.loadContent();
  },

  async loadContent() {
    this.setData({ loading: true });

    try {
      const page = await fetchContentPage('about_us');
      const extra = page.extra || {};

      this.setData({
        title: page.title,
        subtitle: page.subtitle,
        content: page.content,
        contacts: Array.isArray(extra.contacts) ? extra.contacts : [],
        version: extra.version || '',
        footer: extra.footer || '',
        loading: false,
      });
    } catch (error) {
      console.error('[about-us] load failed', error);
      this.setData({ loading: false });
      wx.showToast({ title: '页面加载失败', icon: 'none' });
    }
  },
});
