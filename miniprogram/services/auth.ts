import { request } from '../utils/request';

export const authService = {
  async login(code: string) {
    return request('/auth/wechat-login', {
      method: 'POST',
      data: { code },
    });
  },
};
