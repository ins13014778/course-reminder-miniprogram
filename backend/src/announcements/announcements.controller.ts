import { Body, Controller, Get, Put } from '@nestjs/common';
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

  @Put('admin/announcements/current')
  saveCurrentAnnouncement(@Body() payload: any) {
    return this.announcementsService.saveCurrentAnnouncement(payload);
  }
}
