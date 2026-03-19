CREATE TABLE IF NOT EXISTS content_pages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  page_key VARCHAR(64) NOT NULL,
  title VARCHAR(120) NOT NULL,
  subtitle VARCHAR(255) DEFAULT NULL,
  content TEXT NOT NULL,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  extra_json LONGTEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  _openid VARCHAR(64) DEFAULT '' NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_content_pages_key (page_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO content_pages (page_key, title, subtitle, content, status, extra_json, _openid)
VALUES
  (
    'notification_management',
    '通知管理',
    '统一管理提醒说明、订阅指引和通知规则',
    '在这里你可以查看提醒功能说明、通知接收建议和常见问题。若需调整提醒说明、通知文案或使用指引，管理员可直接在后台编辑。',
    'published',
    '{\n  "tips": [\n    "请先在“提醒设置”中开启课程提醒并完成订阅授权。",\n    "如果更换设备或清理缓存，建议重新确认提醒权限。",\n    "如未收到提醒，请检查微信通知权限和订阅消息剩余额度。"\n  ],\n  "primaryActionText": "打开提醒设置",\n  "primaryActionPage": "/pages/settings/settings"\n}',
    ''
  ),
  (
    'about_us',
    '关于我们',
    '课表提醒产品介绍与联系方式',
    '课表提醒用于帮助用户管理课程、记录笔记、接收提醒，并提供后台治理能力。你可以在这里介绍团队、产品愿景、联系方式和更新计划。',
    'published',
    '{\n  "version": "1.0.0",\n  "contacts": [\n    { "label": "商务合作", "value": "请在后台填写邮箱或微信号" },\n    { "label": "问题反馈", "value": "请在后台填写反馈渠道" }\n  ],\n  "footer": "本页面内容支持后台实时更新。"\n}',
    ''
  )
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  subtitle = VALUES(subtitle),
  content = VALUES(content),
  status = VALUES(status),
  extra_json = VALUES(extra_json),
  updated_at = CURRENT_TIMESTAMP;
