import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  getOverview() {
    return this.adminService.getOverview();
  }

  @Get('users')
  getUsers(@Query('keyword') keyword?: string) {
    return this.adminService.getUsers(keyword);
  }

  @Get('users/:id/detail')
  getUserDetail(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getUserDetail(id);
  }

  @Patch('users/:id/permissions')
  updateUserPermissions(@Param('id', ParseIntPipe) id: number, @Body() payload: any) {
    return this.adminService.updateUserPermissions(id, payload);
  }

  @Get('courses')
  getCourses(@Query('keyword') keyword?: string, @Query('weekday') weekday?: string) {
    return this.adminService.getCourses(keyword, weekday ? Number(weekday) : undefined);
  }

  @Delete('courses/:id')
  deleteCourse(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteCourse(id);
  }

  @Get('template-courses')
  getTemplateCourses(@Query('templateKey') templateKey?: string) {
    return this.adminService.getTemplateCourses(templateKey);
  }

  @Get('share-keys')
  getShareKeys() {
    return this.adminService.getShareKeys();
  }

  @Patch('share-keys/:id/status')
  updateShareKeyStatus(@Param('id', ParseIntPipe) id: number, @Body() payload: any) {
    return this.adminService.updateShareKeyStatus(id, payload);
  }

  @Get('subscriptions')
  getSubscriptions() {
    return this.adminService.getSubscriptions();
  }

  @Get('notes')
  getNotes(@Query('keyword') keyword?: string) {
    return this.adminService.getNotes(keyword);
  }

  @Patch('notes/:id/moderation')
  moderateNote(@Param('id', ParseIntPipe) id: number, @Body() payload: any) {
    return this.adminService.moderateNote(id, payload);
  }
}
