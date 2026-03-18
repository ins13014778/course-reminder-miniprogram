import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';

@Controller()
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get('announcements/active')
  getActiveAnnouncement() {
    return this.announcementsService.getActiveAnnouncement();
  }

  @Get('admin/announcements/current')
  getCurrentAnnouncement() {
    return this.announcementsService.getCurrentAnnouncement();
  }

  @Get('admin/announcements')
  getAnnouncementList(@Query('status') status?: string) {
    return this.announcementsService.getAnnouncementList(status);
  }

  @Post('admin/announcements')
  createAnnouncement(@Body() payload: any) {
    return this.announcementsService.createAnnouncement(payload);
  }

  @Put('admin/announcements/:id')
  updateAnnouncement(@Param('id', ParseIntPipe) id: number, @Body() payload: any) {
    return this.announcementsService.updateAnnouncement(id, payload);
  }

  @Put('admin/announcements/current')
  saveCurrentAnnouncement(@Body() payload: any) {
    return this.announcementsService.saveCurrentAnnouncement(payload);
  }

  @Delete('admin/announcements/:id')
  deleteAnnouncement(@Param('id', ParseIntPipe) id: number) {
    return this.announcementsService.deleteAnnouncement(id);
  }
}
