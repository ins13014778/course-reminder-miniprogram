const { isDefaultScheduleEnabled, setDefaultScheduleEnabled } = require('../../utils/default-schedule');
const { hasLoginSession } = require('../../utils/auth');
const { callDbQuery, resolveCurrentUserId } = require('../../utils/cloud-db');

function createShareKey() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let key = '';

  for (let index = 0; index < 10; index += 1) {
    key += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }

  return key;
}

Page({
  data: {
    remindEnabled: true,
    remindOptions: [5, 10, 15, 20, 30, 45, 60],
    remindMinutesIndex: 2,
    remindMinutes: 15,
    remindWeekends: false,
    defaultTemplateEnabled: false,
    shareKey: '',
    shareKeyReady: false,
    shareKeyLoading: false
  },

  onLoad() {
    this.loadSettings();
  },

  onShow() {
    this.loadSettings();
  },

  loadSettings() {
    const savedEnabled = wx.getStorageSync('remindEnabled');
    const savedMinutes = wx.getStorageSync('remindMinutes');
    const savedWeekends = wx.getStorageSync('remindWeekends');
    const remindOptions = this.data.remindOptions;
    const remindMinutes = typeof savedMinutes === 'number' ? savedMinutes : 15;
    const remindMinutesIndex = Math.max(remindOptions.indexOf(remindMinutes), 0);

    this.setData({
      remindEnabled: savedEnabled !== '' ? !!savedEnabled : true,
      remindMinutes,
      remindMinutesIndex,
      remindWeekends: savedWeekends === '' ? false : !!savedWeekends,
      defaultTemplateEnabled: isDefaultScheduleEnabled()
    });

    this.loadShareKey();
  },

  async loadShareKey() {
    if (!hasLoginSession()) {
      this.setData({
        shareKey: '',
        shareKeyReady: false,
        shareKeyLoading: false
      });
      return;
    }

    this.setData({ shareKeyLoading: true });

    try {
      const userId = await resolveCurrentUserId();
      const rows = await callDbQuery(
        'SELECT share_key, is_active FROM schedule_share_keys WHERE user_id = ? LIMIT 1',
        [userId]
      );
      const row = rows[0];

      this.setData({
        shareKey: row && row.is_active ? row.share_key : '',
        shareKeyReady: !!(row && row.is_active),
        shareKeyLoading: false
      });
    } catch (error) {
      this.setData({
        shareKey: '',
        shareKeyReady: false,
        shareKeyLoading: false
      });
    }
  },

  onToggleEnabled(e) {
    this.setData({ remindEnabled: !!e.detail.value });
  },

  onMinutesChange(e) {
    const index = Number(e.detail.value) || 0;
    this.setData({
      remindMinutesIndex: index,
      remindMinutes: this.data.remindOptions[index]
    });
  },

  onToggleWeekends(e) {
    this.setData({ remindWeekends: !!e.detail.value });
  },

  onToggleDefaultTemplate(e) {
    this.setData({ defaultTemplateEnabled: !!e.detail.value });
  },

  async onGenerateShareKey() {
    if (!hasLoginSession()) {
      wx.showModal({
        title: '需要登录',
        content: '生成课表分享密钥前需要先登录账号。',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/login/login' });
          }
        }
      });
      return;
    }

    this.setData({ shareKeyLoading: true });

    try {
      const userId = await resolveCurrentUserId();

      let latestKey = '';
      let saved = false;

      for (let attempt = 0; attempt < 5; attempt += 1) {
        latestKey = createShareKey();

        try {
          await callDbQuery(
            `INSERT INTO schedule_share_keys (user_id, share_key, is_active)
             VALUES (?, ?, 1)
             ON DUPLICATE KEY UPDATE share_key = VALUES(share_key), is_active = 1, updated_at = CURRENT_TIMESTAMP`,
            [userId, latestKey]
          );
          saved = true;
          break;
        } catch (error) {
          if ((error.message || '').indexOf('Duplicate entry') === -1) {
            throw error;
          }
        }
      }

      if (!saved) {
        throw new Error('密钥生成过于频繁，请稍后再试');
      }

      this.setData({
        shareKey: latestKey,
        shareKeyReady: true,
        shareKeyLoading: false
      });
      wx.showToast({ title: '分享密钥已生成', icon: 'success' });
    } catch (error) {
      this.setData({ shareKeyLoading: false });
      wx.showToast({
        title: error && error.message ? error.message : '生成失败',
        icon: 'none'
      });
    }
  },

  onCopyShareKey() {
    if (!this.data.shareKey) {
      wx.showToast({ title: '请先生成密钥', icon: 'none' });
      return;
    }

    wx.setClipboardData({
      data: this.data.shareKey,
      success: () => {
        wx.showToast({ title: '密钥已复制', icon: 'success' });
      }
    });
  },

  onSave() {
    wx.setStorageSync('remindEnabled', this.data.remindEnabled);
    wx.setStorageSync('remindMinutes', this.data.remindMinutes);
    wx.setStorageSync('remindWeekends', this.data.remindWeekends);
    setDefaultScheduleEnabled(this.data.defaultTemplateEnabled);
    wx.showToast({ title: '设置已保存', icon: 'success' });
  }
});
