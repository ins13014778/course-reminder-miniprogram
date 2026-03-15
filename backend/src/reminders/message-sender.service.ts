import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MessageSenderService {
  private readonly logger = new Logger(MessageSenderService.name);

  async sendReminder(userId: number, courseInfo: any) {
    // Mock 发送逻辑，后续替换为微信订阅消息
    this.logger.log(`发送提醒给用户 ${userId}: ${courseInfo.courseName}`);

    // TODO: 接入微信订阅消息
    return { success: true };
  }

  // 预留微信订阅消息接口
  async sendWechatSubscribeMessage(openid: string, templateId: string, data: any) {
    throw new Error('Not implemented');
  }
}
