import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

type SettingType = 'boolean' | 'number' | 'text' | 'textarea' | 'date';
type SettingGroupKey = 'schedule' | 'reminder' | 'feature' | 'moderation' | 'integration';

type SettingDefinition = {
  key: string;
  groupKey: SettingGroupKey;
  label: string;
  description: string;
  type: SettingType;
  defaultValue: string | number | boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
};

type SettingGroupDefinition = {
  key: SettingGroupKey;
  label: string;
  description: string;
};

@Injectable()
export class SystemSettingsService {
  constructor(private readonly dataSource: DataSource) {}

  private readonly groups: SettingGroupDefinition[] = [
    {
      key: 'schedule',
      label: '学期与课表规则',
      description: '管理学期开始时间、默认周数和课程时间规则的基础参数。',
    },
    {
      key: 'reminder',
      label: '提醒与订阅',
      description: '管理提醒提前量、周末策略和提醒重试的默认配置。',
    },
    {
      key: 'feature',
      label: '功能开关',
      description: '集中控制笔记分享、申诉、留言反馈等高频业务功能的可用状态。',
    },
    {
      key: 'moderation',
      label: '审核与风控',
      description: '为后续自动审核、敏感词检测和内容治理预留统一配置入口。',
    },
    {
      key: 'integration',
      label: '第三方服务与集成',
      description: '管理 OCR 服务地址、订阅消息模板等部署时经常要改的参数。',
    },
  ];

  private readonly definitions: SettingDefinition[] = [
    {
      key: 'semester.startDate',
      groupKey: 'schedule',
      label: '学期开始日期',
      description: '用于课表周次计算和提醒日期推算的起点日期。',
      type: 'date',
      defaultValue: process.env.SEMESTER_START_DATE || '2026-03-16',
    },
    {
      key: 'schedule.maxWeeks',
      groupKey: 'schedule',
      label: '默认学期周数',
      description: '新增课表或模板课表时，可作为默认周数参考值。',
      type: 'number',
      defaultValue: 20,
      min: 1,
      max: 40,
      step: 1,
    },
    {
      key: 'reminder.defaultAdvanceMinutes',
      groupKey: 'reminder',
      label: '默认提前提醒（分钟）',
      description: '新用户或新订阅项目的默认提醒提前时间。',
      type: 'number',
      defaultValue: 15,
      min: 0,
      max: 180,
      step: 5,
    },
    {
      key: 'reminder.weekendEnabled',
      groupKey: 'reminder',
      label: '允许周末课程提醒',
      description: '控制全局是否允许周六、周日课程提醒。',
      type: 'boolean',
      defaultValue: false,
    },
    {
      key: 'reminder.retryEnabled',
      groupKey: 'reminder',
      label: '启用提醒失败重试',
      description: '控制提醒失败后是否允许后台手动重试或后续自动重试策略。',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'feature.noteShareEnabled',
      groupKey: 'feature',
      label: '允许笔记分享',
      description: '全局控制用户是否可以创建笔记分享链接。',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'feature.appealEnabled',
      groupKey: 'feature',
      label: '允许申诉',
      description: '全局控制用户是否可以提交账号或内容申诉。',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'feature.feedbackEnabled',
      groupKey: 'feature',
      label: '允许留言反馈',
      description: '全局控制用户是否可以在小程序中提交意见与建议。',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'moderation.sensitiveWordsEnabled',
      groupKey: 'moderation',
      label: '启用敏感词检测',
      description: '作为后续自动审核引擎的基础开关，先统一沉淀到配置中心。',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'moderation.autoReviewEnabled',
      groupKey: 'moderation',
      label: '启用自动审核',
      description: '预留给后续机审流程的全局开关，当前可先作为运营配置项保存。',
      type: 'boolean',
      defaultValue: false,
    },
    {
      key: 'integration.ocrEnabled',
      groupKey: 'integration',
      label: '启用 OCR 识别',
      description: '控制课程导入或图片识别相关能力是否开启。',
      type: 'boolean',
      defaultValue: !!process.env.OCR_API_URL,
    },
    {
      key: 'integration.ocrApiUrl',
      groupKey: 'integration',
      label: 'OCR 服务地址',
      description: '统一保存 OCR 服务地址，便于后续由后端或小程序统一读取。',
      type: 'text',
      defaultValue: process.env.OCR_API_URL || '',
      placeholder: 'https://example.com/ocr',
    },
    {
      key: 'integration.wechatSubscribeTemplateId',
      groupKey: 'integration',
      label: '微信订阅消息模板 ID',
      description: '统一保存小程序订阅消息模板 ID，便于部署和迁移时维护。',
      type: 'text',
      defaultValue: process.env.WECHAT_SUBSCRIBE_TEMPLATE_ID || '',
      placeholder: '请填写订阅消息模板 ID',
    },
    {
      key: 'integration.operatorNotes',
      groupKey: 'integration',
      label: '运维备注',
      description: '给后续维护者留一段部署说明、第三方服务说明或注意事项。',
      type: 'textarea',
      defaultValue: '',
      placeholder: '可记录部署说明、第三方服务配置说明、注意事项等',
    },
  ];

  private readonly definitionMap = new Map(this.definitions.map((item) => [item.key, item]));

  private async ensureTableReady() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        setting_key VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
        setting_value LONGTEXT COLLATE utf8mb4_unicode_ci NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        _openid VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
        PRIMARY KEY (id),
        UNIQUE KEY uniq_system_settings_key (setting_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  private normalizeBoolean(value: unknown, fallback: boolean) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
      if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    }
    return fallback;
  }

  private normalizeNumber(value: unknown, fallback: number, definition: SettingDefinition) {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) {
      return fallback;
    }

    const min = typeof definition.min === 'number' ? definition.min : nextValue;
    const max = typeof definition.max === 'number' ? definition.max : nextValue;
    return Math.min(max, Math.max(min, nextValue));
  }

  private normalizeText(value: unknown, fallback: string) {
    if (value === null || typeof value === 'undefined') {
      return fallback;
    }
    return String(value);
  }

  private normalizeDate(value: unknown, fallback: string) {
    const text = String(value || '').trim();
    if (!text) return fallback;
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : fallback;
  }

  private serializeValue(definition: SettingDefinition, value: unknown) {
    if (definition.type === 'boolean') {
      return this.normalizeBoolean(value, Boolean(definition.defaultValue)) ? 'true' : 'false';
    }

    if (definition.type === 'number') {
      return String(this.normalizeNumber(value, Number(definition.defaultValue || 0), definition));
    }

    if (definition.type === 'date') {
      return this.normalizeDate(value, String(definition.defaultValue || ''));
    }

    return this.normalizeText(value, String(definition.defaultValue || '')).trim();
  }

  private parseValue(definition: SettingDefinition, storedValue: unknown) {
    if (definition.type === 'boolean') {
      return this.normalizeBoolean(storedValue, Boolean(definition.defaultValue));
    }

    if (definition.type === 'number') {
      return this.normalizeNumber(storedValue, Number(definition.defaultValue || 0), definition);
    }

    if (definition.type === 'date') {
      return this.normalizeDate(storedValue, String(definition.defaultValue || ''));
    }

    return this.normalizeText(storedValue, String(definition.defaultValue || ''));
  }

  private buildGroups(rows: any[]) {
    const rowMap = new Map<string, any>();
    rows.forEach((row) => rowMap.set(String(row.setting_key), row));

    return this.groups.map((group) => ({
      key: group.key,
      label: group.label,
      description: group.description,
      items: this.definitions
        .filter((definition) => definition.groupKey === group.key)
        .map((definition) => {
          const row = rowMap.get(definition.key);
          return {
            key: definition.key,
            label: definition.label,
            description: definition.description,
            type: definition.type,
            value: this.parseValue(definition, row?.setting_value),
            defaultValue: definition.defaultValue,
            placeholder: definition.placeholder || '',
            min: definition.min ?? null,
            max: definition.max ?? null,
            step: definition.step ?? null,
            updatedAt: row?.updated_at || null,
          };
        }),
    }));
  }

  async getAdminSettings() {
    await this.ensureTableReady();

    const rows = await this.dataSource.query(
      `SELECT setting_key, setting_value, updated_at
         FROM system_settings
        WHERE setting_key IN (${this.definitions.map(() => '?').join(', ')})
        ORDER BY setting_key ASC`,
      this.definitions.map((item) => item.key),
    );

    return {
      groups: this.buildGroups(rows),
    };
  }

  async saveAdminSettings(settings: Record<string, unknown>) {
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      throw new BadRequestException('settings must be an object');
    }

    await this.ensureTableReady();

    const changedKeys: string[] = [];

    for (const [key, rawValue] of Object.entries(settings)) {
      const definition = this.definitionMap.get(key);
      if (!definition) continue;

      const serializedValue = this.serializeValue(definition, rawValue);
      await this.dataSource.query(
        `INSERT INTO system_settings (setting_key, setting_value, _openid)
         VALUES (?, ?, '')
         ON DUPLICATE KEY UPDATE
           setting_value = VALUES(setting_value),
           updated_at = CURRENT_TIMESTAMP`,
        [key, serializedValue],
      );
      changedKeys.push(key);
    }

    return {
      changedKeys,
      ...(await this.getAdminSettings()),
    };
  }
}
