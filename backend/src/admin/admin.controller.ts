import { Controller, Delete, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
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

  @Get('subscriptions')
  getSubscriptions() {
    return this.adminService.getSubscriptions();
  }

  @Get('notes')
  getNotes(@Query('keyword') keyword?: string) {
    return this.adminService.getNotes(keyword);
  }
}
