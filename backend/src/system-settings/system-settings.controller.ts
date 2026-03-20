import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { AdminAuditService } from '../admin/admin-audit.service';
import { buildAdminAuditProfile } from '../admin/admin-audit.util';
import { AdminAuthGuard } from '../admin/admin-auth.guard';
import { AdminPermissions } from '../admin/admin-permissions.decorator';
import { SystemSettingsService } from './system-settings.service';

@Controller()
export class SystemSettingsController {
  constructor(
    private readonly systemSettingsService: SystemSettingsService,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  @UseGuards(AdminAuthGuard)
  @AdminPermissions('system.manage')
  @Get('admin/system-settings')
  getAdminSettings() {
    return this.systemSettingsService.getAdminSettings();
  }

  @UseGuards(AdminAuthGuard)
  @AdminPermissions('system.manage')
  @Patch('admin/system-settings')
  async saveAdminSettings(@Req() request: any, @Body() payload: { settings?: Record<string, unknown> }) {
    const result = await this.systemSettingsService.saveAdminSettings(payload?.settings || {});
    await this.adminAuditService.log({
      ...buildAdminAuditProfile(request.admin),
      action: 'system_settings.save',
      targetType: 'system_settings',
      targetId: 'global',
      summary: '保存系统配置',
      detail: { keys: result.changedKeys || [] },
    });
    return result;
  }
}
