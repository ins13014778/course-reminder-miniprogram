import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AdminAuditService {
  constructor(private readonly dataSource: DataSource) {}

  async log(payload: {
    adminEmail?: string | null;
    adminName?: string | null;
    adminRole?: string | null;
    action: string;
    targetType?: string | null;
    targetId?: string | number | null;
    summary?: string | null;
    detail?: any;
    ipAddress?: string | null;
  }) {
    try {
      await this.dataSource.query(
        `INSERT INTO admin_audit_logs
          (admin_email, admin_name, admin_role, action, target_type, target_id, summary, detail_json, ip_address, _openid)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '')`,
        [
          payload.adminEmail || null,
          payload.adminName || null,
          payload.adminRole || null,
          payload.action,
          payload.targetType || null,
          payload.targetId == null ? null : String(payload.targetId),
          payload.summary || null,
          payload.detail ? JSON.stringify(payload.detail) : null,
          payload.ipAddress || null,
        ],
      );
    } catch (error) {
      console.warn('[AdminAuditService] log failed', error?.message || error);
    }
  }
}
