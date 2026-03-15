const BASE_URL = 'https://your-api-domain.com';

export const request = (url: string, options: any = {}) => {
  const token = wx.getStorageSync('token');

  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.header,
      },
      success: (res) => resolve(res.data),
      fail: reject,
    });
  });
};
