import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class MessageSenderService {
  private readonly logger = new Logger(MessageSenderService.name);
  private accessToken = '';
  private accessTokenExpiredAt = 0;

  async sendReminder(openid: string, payload: { courseName: string; startTime: string; location: string; remark: string; page?: string }) {
    const templateId = process.env.WECHAT_SUBSCRIBE_TEMPLATE_ID;
    if (!templateId) {
      throw new Error('WECHAT_SUBSCRIBE_TEMPLATE_ID is not configured');
    }

    return this.sendWechatSubscribeMessage(openid, templateId, {
      page: payload.page || 'pages/index/index',
      data: {
        thing1: { value: '上课提醒' },
        time2: { value: payload.startTime },
        thing3: { value: payload.courseName.slice(0, 20) },
        thing4: { value: (payload.location || '待定教室').slice(0, 20) },
        thing5: { value: (payload.remark || '请按时到课').slice(0, 20) },
      },
    });
  }

  async getAccessToken() {
    if (this.accessToken && Date.now() < this.accessTokenExpiredAt) {
      return this.accessToken;
    }

    const appid = process.env.WECHAT_APPID;
    const secret = process.env.WECHAT_SECRET;
    if (!appid || !secret) {
      throw new Error('WECHAT_APPID or WECHAT_SECRET is not configured');
    }

    const response = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
      params: {
        grant_type: 'client_credential',
        appid,
        secret,
      },
    });

    if (response.data.errcode) {
      throw new Error(`Failed to get access_token: ${response.data.errmsg}`);
    }

    this.accessToken = response.data.access_token;
    this.accessTokenExpiredAt = Date.now() + Math.max(0, (Number(response.data.expires_in) - 120) * 1000);
    return this.accessToken;
  }

  async sendWechatSubscribeMessage(openid: string, templateId: string, payload: any) {
    const accessToken = await this.getAccessToken();
    const response = await axios.post(
      `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`,
      {
        touser: openid,
        template_id: templateId,
        page: payload.page,
        data: payload.data,
      },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );

    if (response.data.errcode && response.data.errcode !== 0) {
      throw new Error(`Subscribe message send failed: ${response.data.errmsg}`);
    }

    this.logger.log(`订阅消息发送成功: ${openid} ${templateId}`);
    return response.data;
  }
}
