import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AdminAuditService } from '../admin/admin-audit.service';
import { AdminAuthGuard } from '../admin/admin-auth.guard';
import { AdminPermissions } from '../admin/admin-permissions.decorator';
import { buildAdminAuditProfile } from '../admin/admin-audit.util';
import { AnnouncementsService } from './announcements.service';

@Controller()
export class AnnouncementsController {
  constructor(
    private readonly announcementsService: AnnouncementsService,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  @Get('announcements/active')
  getActiveAnnouncement() {
    return this.announcementsService.getActiveAnnouncement();
  }

  @Get('admin/announcements/current')
  @UseGuards(AdminAuthGuard)
  @AdminPermissions('announcement.manage')
  getCurrentAnnouncement() {
    return this.announcementsService.getCurrentAnnouncement();
  }

  @Get('admin/announcements')
  @UseGuards(AdminAuthGuard)
  @AdminPermissions('announcement.manage')
  getAnnouncementList(@Query('status') status?: string) {
    return this.announcementsService.getAnnouncementList(status);
  }

  @Post('admin/announcements')
  @UseGuards(AdminAuthGuard)
  @AdminPermissions('announcement.manage')
  async createAnnouncement(@Req() request: any, @Body() payload: any) {
    const result = await this.announcementsService.createAnnouncement(payload);
    await this.adminAuditService.log({
      ...buildAdminAuditProfile(request.admin),
      action: 'announcement.create',
      targetType: 'announcement',
      targetId: result?.id,
      summary: `创建公告：${result?.title || ''}`.trim(),
      detail: { title: result?.title, status: result?.status, isPinned: result?.isPinned },
    });
    return result;
  }

  @Put('admin/announcements/:id')
  @UseGuards(AdminAuthGuard)
  @AdminPermissions('announcement.manage')
  async updateAnnouncement(@Req() request: any, @Param('id', ParseIntPipe) id: number, @Body() payload: any) {
    const result = await this.announcementsService.updateAnnouncement(id, payload);
    await this.adminAuditService.log({
      ...buildAdminAuditProfile(request.admin),
      action: 'announcement.update',
      targetType: 'announcement',
      targetId: id,
      summary: `更新公告：#${id} ${result?.title || ''}`.trim(),
      detail: { title: result?.title, status: result?.status, isPinned: result?.isPinned },
    });
    return result;
  }

  @Put('admin/announcements/current')
  @UseGuards(AdminAuthGuard)
  @AdminPermissions('announcement.manage')
  async saveCurrentAnnouncement(@Req() request: any, @Body() payload: any) {
    const result = await this.announcementsService.saveCurrentAnnouncement(payload);
    await this.adminAuditService.log({
      ...buildAdminAuditProfile(request.admin),
      action: 'announcement.current.save',
      targetType: 'announcement',
      targetId: result?.id,
      summary: `保存当前公告：${result?.title || ''}`.trim(),
      detail: { title: result?.title, status: result?.status, isPinned: result?.isPinned },
    });
    return result;
  }

  @Delete('admin/announcements/:id')
  @UseGuards(AdminAuthGuard)
  @AdminPermissions('announcement.manage')
  async deleteAnnouncement(@Req() request: any, @Param('id', ParseIntPipe) id: number) {
    const result = await this.announcementsService.deleteAnnouncement(id);
    await this.adminAuditService.log({
      ...buildAdminAuditProfile(request.admin),
      action: 'announcement.delete',
      targetType: 'announcement',
      targetId: id,
      summary: `删除公告：#${id}`,
      detail: { id },
    });
    return result;
  }
}
