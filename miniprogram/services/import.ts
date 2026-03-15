import { request } from '../utils/request';

export const importService = {
  async uploadSchedule(filePath: string) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: 'https://your-api-domain.com/import/upload',
        filePath,
        name: 'file',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token')}`,
        },
        success: (res) => resolve(JSON.parse(res.data)),
        fail: reject,
      });
    });
  },

  async getTask(taskId: number) {
    return request(`/import/task/${taskId}`, { method: 'GET' });
  },
};
