Page({
  data: {
    remindMinutes: 10,
  },

  onLoad() {
    const minutes = wx.getStorageSync('remindMinutes') || 10;
    this.setData({ remindMinutes: minutes });
  },

  onMinutesChange(e: any) {
    this.setData({ remindMinutes: e.detail.value });
  },

  onSave() {
    wx.setStorageSync('remindMinutes', this.data.remindMinutes);
    wx.showToast({ title: '保存成功', icon: 'success' });
  },
});
