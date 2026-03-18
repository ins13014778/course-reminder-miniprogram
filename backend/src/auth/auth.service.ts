import { ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { User } from '../common/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  private isBanActive(status?: string | null, bannedUntil?: Date | string | null) {
    if (status !== 'banned') {
      return false;
    }

    if (!bannedUntil) {
      return true;
    }

    const banDate = new Date(bannedUntil);
    if (Number.isNaN(banDate.getTime())) {
      return true;
    }

    return banDate.getTime() > Date.now();
  }

  private formatBanMessage(user: User) {
    const reason = user.accountBanReason ? `，原因：${user.accountBanReason}` : '';
    if (!user.accountBannedUntil) {
      return `账号已被永久封禁${reason}`;
    }

    const until = new Date(user.accountBannedUntil);
    const text = Number.isNaN(until.getTime()) ? String(user.accountBannedUntil) : until.toLocaleString('zh-CN');
    return `账号已被封禁至 ${text}${reason}`;
  }

  private async ensureAccountAvailable(user: User) {
    if (this.isBanActive(user.accountStatus, user.accountBannedUntil)) {
      throw new ForbiddenException(this.formatBanMessage(user));
    }

    if (user.accountStatus === 'banned' && user.accountBannedUntil) {
      await this.userRepository.update(user.id, {
        accountStatus: 'active',
        accountBanReason: null,
        accountBannedUntil: null,
      });
      user.accountStatus = 'active';
      user.accountBanReason = null;
      user.accountBannedUntil = null;
    }
  }

  async wechatLogin(code: string) {
    const { openid } = await this.getWechatOpenId(code);

    let user = await this.userRepository.findOne({ where: { openid } });

    if (!user) {
      user = this.userRepository.create({ openid });
      user = await this.userRepository.save(user);
    }

    await this.ensureAccountAvailable(user);

    const token = this.jwtService.sign({ userId: user.id, openid: user.openid });

    return { token, user };
  }

  private async getWechatOpenId(code: string) {
    const appid = process.env.WECHAT_APPID;
    const secret = process.env.WECHAT_SECRET;

    if (!appid || !secret) {
      return {
        openid: `mock_openid_${Date.now()}`,
        session_key: 'mock_session_key',
      };
    }

    const url =
      `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}` +
      `&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
    const response = await axios.get(url);

    if (response.data.errcode) {
      throw new Error(`微信登录失败: ${response.data.errmsg}`);
    }

    return {
      openid: response.data.openid,
      session_key: response.data.session_key,
    };
  }

  async validateUser(userId: number) {
    return this.userRepository.findOne({ where: { id: userId } });
  }
}
