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
