import { importService } from '../../services/import';

Page({
  data: {
    taskId: null,
    status: 'idle',
  },

  async onChooseImage() {
    const res = await wx.chooseImage({ count: 1 });
    this.uploadImage(res.tempFilePaths[0]);
  },

  async uploadImage(filePath: string) {
    try {
      this.setData({ status: 'uploading' });
      const res: any = await importService.uploadSchedule(filePath);
      this.setData({ taskId: res.id, status: 'processing' });
      this.checkTask(res.id);
    } catch (error) {
      wx.showToast({ title: '上传失败', icon: 'none' });
      this.setData({ status: 'idle' });
    }
  },

  async checkTask(taskId: number) {
    const res: any = await importService.getTask(taskId);
    if (res.status === 'success') {
      this.setData({ status: 'success' });
      wx.showToast({ title: '识别成功', icon: 'success' });
    } else if (res.status === 'failed') {
      this.setData({ status: 'failed' });
      wx.showToast({ title: '识别失败', icon: 'none' });
    } else {
      setTimeout(() => this.checkTask(taskId), 2000);
    }
  },
});
