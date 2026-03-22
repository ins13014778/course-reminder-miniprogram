import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

type ContentPageKey =
  | 'notification_management'
  | 'about_us'
  | 'user_agreement'
  | 'privacy_policy';
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
    user_agreement: {
      key: 'user_agreement',
      name: '用户服务协议',
      description:
        '用于小程序登录页、设置页、个人中心页展示《用户服务协议》，用户在登录或继续使用服务前应可查看完整内容。',
      title: '用户服务协议',
      subtitle: '请在使用课表提醒服务前认真阅读本协议内容',
      content: `欢迎你使用“课表提醒”小程序服务。为保障你的合法权益，请在使用前认真阅读并理解本协议。

一、服务内容
1. 本小程序为用户提供课表导入、课程查看、上课提醒、笔记记录、申诉反馈、公告通知等功能。
2. 部分功能需要你登录后方可使用，包括但不限于保存个人资料、同步课表、接收提醒、发布或分享内容、提交反馈与申诉。

二、账号与使用规范
1. 你应当通过微信账号进行登录，并确保提交的信息真实、合法、有效。
2. 你不得利用本服务从事违法违规、侵害他人权益、干扰平台正常运行的行为。
3. 你不得发布、上传、传播违法、侵权、低俗、欺诈、骚扰或其他违反平台规则的内容。

三、用户信息与授权
1. 当你登录时，我们会在你授权同意后获取你主动提供的微信头像、昵称等信息，用于创建账号、展示个人主页和识别登录状态。
2. 当你填写学校、专业、年级、个性签名、上传头像、导入课表、填写反馈或申诉时，我们将按照功能需要保存你主动提交的信息。
3. 当你开启订阅提醒时，我们会保存提醒设置、订阅状态等信息，用于按你的设置发送课程提醒。

四、内容管理
1. 你在小程序中发布、提交或上传的内容，应保证拥有合法权利，不得侵犯任何第三方合法权益。
2. 若你发布的内容涉嫌违规，平台有权根据管理规则采取删除、下架、限制功能、封禁等处理措施。

五、服务变更、中断与终止
1. 在法律法规允许范围内，我们可根据产品运营情况对服务内容进行调整、升级或维护。
2. 若你存在违法违规、违反本协议或平台规则的行为，我们有权视情节对账号或相关功能进行限制。

六、免责声明
1. 我们会尽力保障服务稳定，但不对因不可抗力、网络故障、系统维护、第三方服务异常等造成的服务中断承担责任。
2. 因你自身原因导致的信息泄露、设备丢失、误操作等风险，由你自行承担。

七、协议更新
1. 当本协议发生更新时，我们会通过页面公告、协议页面更新等合理方式进行展示。
2. 你继续使用本服务，即视为你已阅读并同意更新后的协议内容。

八、联系方式
如你对本协议有任何疑问、意见或建议，可通过“小程序内反馈入口”或“关于我们”页面展示的联系方式与我们联系。`,
      extraJson: JSON.stringify(
        {
          documentType: 'agreement',
          showUpdatedAt: true,
        },
        null,
        2,
      ),
    },
    privacy_policy: {
      key: 'privacy_policy',
      name: '隐私政策',
      description:
        '用于小程序登录页、设置页、个人中心页展示《隐私政策》，明确说明用户信息的收集目的、方式、范围和用途。',
      title: '隐私政策',
      subtitle: '我们如何收集、使用、存储和保护你的个人信息',
      content: `我们非常重视你的个人信息和隐私保护。请你在使用“课表提醒”服务前，认真阅读并充分理解本隐私政策。

一、我们收集的信息
1. 登录信息：在你点击微信登录并明确同意后，我们会获取你授权提供的微信昵称、头像，以及用于识别账号身份的 openid。
2. 资料信息：当你主动完善个人资料时，我们会收集你填写的学校、专业、年级、个性签名、头像等信息。
3. 课表与提醒信息：当你导入、编辑或同步课表时，我们会保存课程名称、上课时间、地点、教师等课表信息；当你开启课程提醒时，我们会保存提醒时间、提醒开关、订阅状态等信息。
4. 内容与反馈信息：当你提交笔记、举报、申诉、留言反馈或其他运营联系信息时，我们会保存你主动提交的内容以及必要的处理记录。
5. 设备与日志信息：为保障服务安全与稳定，我们可能记录必要的操作日志、接口调用记录、异常排查信息。

二、我们如何使用你的信息
1. 用于完成账号登录、身份识别和账号状态校验。
2. 用于保存和展示你的个人资料、课表数据、提醒配置和你主动发布或提交的内容。
3. 用于向你提供课程提醒、公告通知、申诉处理、反馈回复等服务。
4. 用于保障系统运行安全，识别异常行为，处理违规内容和平台治理。

三、我们如何存储你的信息
1. 你的信息将存储于腾讯云开发 CloudBase、微信云能力及本项目后端服务对应的数据库或存储服务中。
2. 我们仅在实现产品功能、履行法定义务和处理纠纷所必需的期限内保存你的信息。
3. 超出保存期限后，我们会在法律法规允许的范围内进行删除或匿名化处理。

四、我们如何共享、转让和公开披露你的信息
1. 除法律法规另有规定，或为实现核心功能所必需的技术服务外，我们不会向无关第三方出售你的个人信息。
2. 在实现登录、云存储、订阅消息等能力时，相关信息可能由微信、小程序平台能力、腾讯云开发 CloudBase 等服务提供方在其职责范围内处理。
3. 若发生合并、分立、重组等情形，我们会依法要求接收方继续保护你的个人信息。

五、你的权利
1. 你有权查看、修改你主动填写的个人资料和课表信息。
2. 你可以通过关闭提醒、停止使用服务、提交反馈等方式管理你的个人信息使用范围。
3. 如你认为相关信息存在错误，或你希望删除、撤回部分授权，可通过小程序内反馈入口或申诉/反馈页面联系我们处理。

六、未成年人保护
若你是未成年人，应在监护人同意并指导下阅读和使用本服务。

七、政策更新
当隐私政策发生更新时，我们会通过页面展示等方式告知你。更新后的政策生效后，如你继续使用服务，即视为你已知悉并同意更新内容。`,
      extraJson: JSON.stringify(
        {
          documentType: 'privacy',
          showUpdatedAt: true,
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
          WHERE page_key IN (${keys.map(() => '?').join(', ')})
          ORDER BY FIELD(page_key, ${keys.map(() => '?').join(', ')})`,
        [...keys, ...keys],
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
