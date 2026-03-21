import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { AdminAuditService } from '../admin/admin-audit.service';
import { ContentPagesService } from './content-pages.service';
import { AdminAuthGuard } from '../admin/admin-auth.guard';
import { AdminPermissions } from '../admin/admin-permissions.decorator';
import { buildAdminAuditProfile } from '../admin/admin-audit.util';

@Controller()
export class ContentPagesController {
  constructor(
    private readonly contentPagesService: ContentPagesService,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  @UseGuards(AdminAuthGuard)
  @AdminPermissions('content.manage')
  @Get('admin/content-pages')
  getAdminList() {
    return this.contentPagesService.getAdminList();
  }

  @UseGuards(AdminAuthGuard)
  @AdminPermissions('content.manage')
  @Get('admin/content-pages/:key')
  getAdminDetail(@Param('key') key: string) {
    return this.contentPagesService.getAdminDetail(key);
  }

  @UseGuards(AdminAuthGuard)
  @AdminPermissions('content.manage')
  @Patch('admin/content-pages/:key')
  async saveAdminDetail(@Req() request: any, @Param('key') key: string, @Body() payload: any) {
    const result = await this.contentPagesService.saveAdminDetail(key, payload);
    await this.adminAuditService.log({
      ...buildAdminAuditProfile(request.admin),
      action: 'content_page.save',
      targetType: 'content_page',
      targetId: key,
      summary: `保存内容页：${key}`,
      detail: {
        key,
        title: result?.title,
        status: result?.status,
      },
    });
    return result;
  }

  @Get('content-pages/:key')
  getPublishedDetail(@Param('key') key: string) {
    return this.contentPagesService.getPublishedDetail(key);
  }
}
