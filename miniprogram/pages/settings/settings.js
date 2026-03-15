Page({
  data: {
    remindEnabled: true,
    remindOptions: [5, 10, 15, 20, 30, 45, 60],
    remindMinutesIndex: 2,
    remindMinutes: 15,
    remindWeekends: false
  },

  onLoad() {
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
      remindWeekends: savedWeekends === '' ? false : !!savedWeekends
    });
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

  onSave() {
    wx.setStorageSync('remindEnabled', this.data.remindEnabled);
    wx.setStorageSync('remindMinutes', this.data.remindMinutes);
    wx.setStorageSync('remindWeekends', this.data.remindWeekends);
    wx.showToast({ title: '设置已保存', icon: 'success' });
  }
});
