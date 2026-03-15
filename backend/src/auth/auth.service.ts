import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../common/entities/user.entity';
import axios from 'axios';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async wechatLogin(code: string) {
    // 调用微信 API 获取 openid
    const { openid, session_key } = await this.getWechatOpenId(code);

    let user = await this.userRepository.findOne({ where: { openid } });

    if (!user) {
      user = this.userRepository.create({ openid });
      await this.userRepository.save(user);
    }

    const token = this.jwtService.sign({ userId: user.id, openid: user.openid });

    return { token, user };
  }

  private async getWechatOpenId(code: string) {
    const appid = process.env.WECHAT_APPID;
    const secret = process.env.WECHAT_SECRET;

    if (!appid || !secret) {
      // 开发环境：返回 mock 数据
      return {
        openid: `mock_openid_${Date.now()}`,
        session_key: 'mock_session_key',
      };
    }

    // 生产环境：调用微信 API
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;
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
