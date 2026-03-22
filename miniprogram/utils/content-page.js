const { callDbQuery } = require('./cloud-db');

const DEFAULT_PAGES = {
  notification_management: {
    title: '通知管理',
    subtitle: '统一管理提醒说明、订阅指引和通知规则',
    content:
      '在这里你可以查看提醒功能说明、通知接收建议和常见问题。若需调整提醒说明、通知文案或使用指引，管理员可直接在后台编辑。',
    extra: {
      tips: [
        '请先在“提醒设置”中开启课程提醒并完成订阅授权。',
        '如果更换设备或清理缓存，建议重新确认提醒权限。',
        '如未收到提醒，请检查微信通知权限和订阅消息剩余额度。',
      ],
      primaryActionText: '打开提醒设置',
      primaryActionPage: '/pages/settings/settings',
    },
  },
  about_us: {
    title: '关于我们',
    subtitle: '课表提醒产品介绍与联系方式',
    content:
      '课表提醒用于帮助用户管理课程、记录笔记、接收提醒，并提供后台治理能力。你可以在这里介绍团队、产品愿景、联系方式和更新计划。',
    extra: {
      version: '1.0.0',
      contacts: [
        { label: '商务合作', value: '请在后台填写邮箱或微信号' },
        { label: '问题反馈', value: '请在后台填写反馈渠道' },
      ],
      footer: '本页面内容支持后台实时更新。',
    },
  },
  user_agreement: {
    title: '用户服务协议',
    subtitle: '请在使用服务前认真阅读本协议内容',
    content:
      '欢迎你使用“课表提醒”小程序服务。本服务用于提供课表导入、课程查看、提醒通知、笔记记录、反馈申诉等功能。登录、保存资料、同步课表、接收提醒等能力，需要你在阅读并同意相关协议后使用。\n\n我们会在你授权后获取你主动提供的微信昵称、头像等信息，用于创建账号与展示资料；当你填写学校、专业、年级、个性签名、上传头像、导入课表、提交反馈或申诉时，我们会按功能需要保存你主动提交的信息。\n\n你应遵守法律法规及平台规则，不得利用本服务从事违法违规活动，不得发布侵权、骚扰、欺诈、低俗或其他违规内容。若存在违规情形，平台有权采取删除、限制、封禁等处理措施。\n\n如协议内容发生更新，我们会通过页面展示等方式进行告知。你继续使用服务，即视为你已阅读并同意更新后的协议。',
    extra: {
      documentType: 'agreement',
      footer: '如有疑问，请通过“留言反馈”或“关于我们”中的联系方式与我们联系。',
    },
  },
  privacy_policy: {
    title: '隐私政策',
    subtitle: '我们如何收集、使用、存储和保护你的个人信息',
    content:
      '我们重视你的个人信息保护。在你点击微信登录并明确同意后，我们会获取你授权提供的微信昵称、头像及用于识别账号身份的 openid；当你主动填写学校、专业、年级、个性签名、上传头像、导入课表、开启提醒、提交反馈或申诉时，我们会按功能需要保存相关信息。\n\n上述信息将用于账号登录识别、课表同步、提醒通知、资料展示、违规治理、申诉反馈处理及系统安全保障。你的信息将存储在腾讯云开发 CloudBase、微信云能力及本项目后端服务所使用的数据库或存储服务中，并仅在实现功能和履行法定义务所必需的期限内保存。\n\n除法律法规另有规定，或为实现登录、云存储、订阅消息等核心功能所必需外，我们不会向无关第三方出售你的个人信息。你有权查看、更正你主动填写的信息，并可通过小程序内反馈入口联系我们处理相关请求。',
    extra: {
      documentType: 'privacy',
      footer: '继续使用本服务前，请确保你已阅读并理解本隐私政策。',
    },
  },
};

function safeParseExtra(extraJson, fallbackExtra) {
  if (!extraJson) {
    return fallbackExtra;
  }

  try {
    const parsed = JSON.parse(extraJson);
    return parsed && typeof parsed === 'object' ? parsed : fallbackExtra;
  } catch (error) {
    console.warn('[content-page] parse extra_json failed', error);
    return fallbackExtra;
  }
}

async function fetchContentPage(pageKey) {
  const fallback = DEFAULT_PAGES[pageKey];
  if (!fallback) {
    throw new Error(`Unknown content page: ${pageKey}`);
  }

  try {
    const rows = await callDbQuery(
      `SELECT title, subtitle, content, extra_json
         FROM content_pages
        WHERE page_key = ? AND status = 'published'
        LIMIT 1`,
      [pageKey],
    );
    const row = rows[0];

    if (!row) {
      return { ...fallback, extra: fallback.extra };
    }

    return {
      title: row.title || fallback.title,
      subtitle: row.subtitle || fallback.subtitle,
      content: row.content || fallback.content,
      extra: safeParseExtra(row.extra_json, fallback.extra),
    };
  } catch (error) {
    console.warn('[content-page] load failed', error);
    return { ...fallback, extra: fallback.extra };
  }
}

module.exports = {
  fetchContentPage,
};
