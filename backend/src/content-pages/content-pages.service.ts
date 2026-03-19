import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

type ContentPageKey = 'notification_management' | 'about_us';
type ContentPageStatus = 'draft' | 'published' | 'archived';

type ContentPageDefinition = {
  key: ContentPageKey;
  name: string;
  description: string;
  title: string;
  subtitle: string;
  content: string;
  extraJson: string;
};

@Injectable()
export class ContentPagesService {
  constructor(private readonly dataSource: DataSource) {}

  private readonly definitions: Record<ContentPageKey, ContentPageDefinition> = {
    notification_management: {
      key: 'notification_management',
      name: '通知管理',
      description:
        '用于小程序“我的 > 通知管理”页面，可编辑提醒说明、订阅指引、运营通知与入口按钮。',
      title: '通知管理',
      subtitle: '统一管理提醒说明、订阅指引和通知规则',
      content:
        '在这里你可以查看提醒功能说明、通知接收建议和常见问题。若需调整提醒说明、通知文案或使用指引，管理员可直接在后台编辑。',
      extraJson: JSON.stringify(
        {
          tips: [
            '请先在“提醒设置”中开启课程提醒并完成订阅授权。',
            '如果更换设备或清理缓存，建议重新确认提醒权限。',
            '如未收到提醒，请检查微信通知权限和订阅消息剩余额度。',
          ],
          primaryActionText: '打开提醒设置',
          primaryActionPage: '/pages/settings/settings',
        },
        null,
        2,
      ),
    },
    about_us: {
      key: 'about_us',
      name: '关于我们',
      description:
        '用于小程序“我的 > 关于我们”页面，可编辑产品介绍、联系方式、版权说明和外部链接。',
      title: '关于我们',
      subtitle: '课表提醒产品介绍与联系方式',
      content:
        '课表提醒用于帮助用户管理课程、记录笔记、接收提醒，并提供后台治理能力。你可以在这里介绍团队、产品愿景、联系方式和更新计划。',
      extraJson: JSON.stringify(
        {
          version: '1.0.0',
          contacts: [
            { label: '商务合作', value: '请在后台填写邮箱或微信号' },
            { label: '问题反馈', value: '请在后台填写反馈渠道' },
          ],
          footer: '本页面内容支持后台实时更新。',
        },
        null,
        2,
      ),
    },
  };

  private ensureKey(key: string): ContentPageKey {
    if (!Object.prototype.hasOwnProperty.call(this.definitions, key)) {
      throw new NotFoundException('Content page not found');
    }

    return key as ContentPageKey;
  }

  private fallback(key: ContentPageKey) {
    const definition = this.definitions[key];
    return {
      key,
      name: definition.name,
      description: definition.description,
      title: definition.title,
      subtitle: definition.subtitle,
      content: definition.content,
      status: 'draft',
      extraJson: definition.extraJson,
      createdAt: null,
      updatedAt: null,
    };
  }

  private normalize(row: any) {
    const key = this.ensureKey(row.page_key);
    const definition = this.definitions[key];

    return {
      key,
      name: definition.name,
      description: definition.description,
      title: row.title || definition.title,
      subtitle: row.subtitle || definition.subtitle,
      content: row.content || definition.content,
      status: row.status || 'draft',
      extraJson: row.extra_json || definition.extraJson,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getAdminList() {
    const keys = Object.keys(this.definitions) as ContentPageKey[];
    let rows: any[] = [];

    try {
      rows = await this.dataSource.query(
        `SELECT page_key, title, subtitle, content, status, extra_json, created_at, updated_at
           FROM content_pages
          WHERE page_key IN (?, ?)
          ORDER BY FIELD(page_key, ?, ?)`,
        [keys[0], keys[1], keys[0], keys[1]],
      );
    } catch {
      return keys.map((key) => this.fallback(key));
    }

    const map = new Map<string, any>();
    rows.forEach((row) => {
      map.set(row.page_key, this.normalize(row));
    });

    return keys.map((key) => map.get(key) || this.fallback(key));
  }

  async getAdminDetail(key: string) {
    const pageKey = this.ensureKey(key);

    try {
      const rows = await this.dataSource.query(
        `SELECT page_key, title, subtitle, content, status, extra_json, created_at, updated_at
           FROM content_pages
          WHERE page_key = ?
          LIMIT 1`,
        [pageKey],
      );

      if (!rows.length) {
        return this.fallback(pageKey);
      }

      return this.normalize(rows[0]);
    } catch {
      return this.fallback(pageKey);
    }
  }

  async saveAdminDetail(
    key: string,
    payload: {
      title?: string;
      subtitle?: string;
      content?: string;
      status?: ContentPageStatus;
      extraJson?: string;
    },
  ) {
    const pageKey = this.ensureKey(key);
    const definition = this.definitions[pageKey];
    const title = String(payload?.title || '').trim() || definition.title;
    const subtitle = String(payload?.subtitle || '').trim() || definition.subtitle;
    const content = String(payload?.content || '').trim() || definition.content;
    const status = payload?.status || 'draft';
    const extraJson = String(payload?.extraJson || '').trim() || definition.extraJson;

    if (!['draft', 'published', 'archived'].includes(status)) {
      throw new BadRequestException('Invalid content page status');
    }

    try {
      JSON.parse(extraJson);
    } catch {
      throw new BadRequestException('extraJson must be valid JSON');
    }

    const existing = await this.dataSource.query(
      'SELECT id FROM content_pages WHERE page_key = ? LIMIT 1',
      [pageKey],
    );

    if (existing.length) {
      await this.dataSource.query(
        `UPDATE content_pages
            SET title = ?, subtitle = ?, content = ?, status = ?, extra_json = ?, updated_at = CURRENT_TIMESTAMP
          WHERE page_key = ?`,
        [title, subtitle, content, status, extraJson, pageKey],
      );
    } else {
      await this.dataSource.query(
        `INSERT INTO content_pages
          (page_key, title, subtitle, content, status, extra_json, _openid)
         VALUES (?, ?, ?, ?, ?, ?, '')`,
        [pageKey, title, subtitle, content, status, extraJson],
      );
    }

    return this.getAdminDetail(pageKey);
  }

  async getPublishedDetail(key: string) {
    const pageKey = this.ensureKey(key);

    try {
      const rows = await this.dataSource.query(
        `SELECT page_key, title, subtitle, content, status, extra_json, created_at, updated_at
           FROM content_pages
          WHERE page_key = ? AND status = 'published'
          LIMIT 1`,
        [pageKey],
      );

      if (!rows.length) {
        const fallback = this.fallback(pageKey);
        return {
          ...fallback,
          status: 'published',
        };
      }

      return this.normalize(rows[0]);
    } catch {
      const fallback = this.fallback(pageKey);
      return {
        ...fallback,
        status: 'published',
      };
    }
  }
}
