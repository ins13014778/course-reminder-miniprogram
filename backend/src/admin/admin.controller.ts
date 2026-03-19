import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminPublic } from './admin-public.decorator';
import { AdminRoles } from './admin-roles.decorator';
import { AdminPermissions } from './admin-permissions.decorator';

@UseGuards(AdminAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @AdminPublic()
  @Post('login')
  login(@Body() payload: { email?: string; password?: string }, @Req() request: any) {
    return this.adminService.login({ ...payload, request });
  }

  @Get('overview')
  getOverview() {
    return this.adminService.getOverview();
  }

  @Get('profile')
  getCurrentAdminProfile(@Req() request: any) {
    return this.adminService.getCurrentAdminProfile(request.admin);
  }

  @Get('users')
  @AdminPermissions('user.view')
  getUsers(@Query('keyword') keyword?: string) {
    return this.adminService.getUsers(keyword);
  }

  @Get('users/:id/detail')
  @AdminPermissions('user.view')
  getUserDetail(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getUserDetail(id);
  }

  @Patch('users/:id/permissions')
  @AdminPermissions('user.ban')
  updateUserPermissions(@Req() request: any, @Param('id', ParseIntPipe) id: number, @Body() payload: any) {
    return this.adminService.updateUserPermissions(id, payload, request.admin);
  }

  @Post('users/batch-permissions')
  @AdminPermissions('user.ban')
  batchUpdateUserPermissions(@Req() request: any, @Body() payload: any) {
    return this.adminService.batchUpdateUserPermissions(payload, request.admin);
  }

  @Get('courses')
  @AdminPermissions('course.view')
  getCourses(@Query('keyword') keyword?: string, @Query('weekday') weekday?: string) {
    return this.adminService.getCourses(keyword, weekday ? Number(weekday) : undefined);
  }

  @Delete('courses/:id')
  @AdminPermissions('course.manage')
  deleteCourse(@Req() request: any, @Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteCourse(id, request.admin);
  }

  @Get('template-courses')
  @AdminPermissions('course.view')
  getTemplateCourses(@Query('templateKey') templateKey?: string) {
    return this.adminService.getTemplateCourses(templateKey);
  }

  @Get('share-keys')
  @AdminPermissions('share.view')
  getShareKeys() {
    return this.adminService.getShareKeys();
  }

  @Patch('share-keys/:id/status')
  @AdminPermissions('share.manage')
  updateShareKeyStatus(@Req() request: any, @Param('id', ParseIntPipe) id: number, @Body() payload: any) {
    return this.adminService.updateShareKeyStatus(id, payload, request.admin);
  }

  @Patch('share-keys/batch-status')
  @AdminPermissions('share.manage')
  batchUpdateShareKeyStatus(@Req() request: any, @Body() payload: any) {
    return this.adminService.batchUpdateShareKeyStatus(payload, request.admin);
  }

  @Get('subscriptions')
  @AdminPermissions('subscription.view')
  getSubscriptions() {
    return this.adminService.getSubscriptions();
  }

  @Get('notes')
  @AdminPermissions('note.view')
  getNotes(@Query('keyword') keyword?: string) {
    return this.adminService.getNotes(keyword);
  }

  @Patch('notes/:id/moderation')
  @AdminPermissions('note.moderate')
  moderateNote(@Req() request: any, @Param('id', ParseIntPipe) id: number, @Body() payload: any) {
    return this.adminService.moderateNote(id, payload, request.admin);
  }

  @Patch('notes/batch-moderation')
  @AdminPermissions('note.moderate')
  batchModerateNotes(@Req() request: any, @Body() payload: any) {
    return this.adminService.batchModerateNotes(payload, request.admin);
  }

  @Get('note-shares')
  @AdminPermissions('note_share.view')
  getNoteShares(@Query('keyword') keyword?: string) {
    return this.adminService.getNoteShares(keyword);
  }

  @Patch('note-shares/:id/status')
  @AdminPermissions('note_share.manage')
  updateNoteShareStatus(@Req() request: any, @Param('id', ParseIntPipe) id: number, @Body() payload: any) {
    return this.adminService.updateNoteShareStatus(id, payload, request.admin);
  }

  @Patch('note-shares/batch-status')
  @AdminPermissions('note_share.manage')
  batchUpdateNoteShareStatus(@Req() request: any, @Body() payload: any) {
    return this.adminService.batchUpdateNoteShareStatus(payload, request.admin);
  }

  @Get('reports')
  @AdminPermissions('report.view')
  getReports(@Query('keyword') keyword?: string, @Query('status') status?: string) {
    return this.adminService.getReports(keyword, status);
  }

  @Patch('reports/:id/review')
  @AdminPermissions('report.review')
  reviewReport(@Req() request: any, @Param('id', ParseIntPipe) id: number, @Body() payload: any) {
    return this.adminService.reviewReport(id, payload, request.admin);
  }

  @Patch('reports/batch-review')
  @AdminPermissions('report.review')
  batchReviewReports(@Req() request: any, @Body() payload: any) {
    return this.adminService.batchReviewReports(payload, request.admin);
  }

  @Get('appeals')
  @AdminPermissions('appeal.view')
  getAppeals(
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
    @Query('appealType') appealType?: string,
  ) {
    return this.adminService.getAppeals(keyword, status, appealType);
  }

  @Patch('appeals/:id/review')
  @AdminPermissions('appeal.review')
  reviewAppeal(@Req() request: any, @Param('id', ParseIntPipe) id: number, @Body() payload: any) {
    return this.adminService.reviewAppeal(id, payload, request.admin);
  }

  @Get('feedback')
  @AdminPermissions('feedback.view')
  getFeedback(
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    return this.adminService.getFeedback(keyword, status, category);
  }

  @Patch('feedback/:id/review')
  @AdminPermissions('feedback.review')
  reviewFeedback(@Req() request: any, @Param('id', ParseIntPipe) id: number, @Body() payload: any) {
    return this.adminService.reviewFeedback(id, payload, request.admin);
  }

  @Get('reminder-logs')
  @AdminPermissions('reminder_log.view')
  getReminderLogs(@Query('keyword') keyword?: string, @Query('status') status?: string) {
    return this.adminService.getReminderLogs(keyword, status);
  }

  @Get('reminder-logs/summary')
  @AdminPermissions('reminder_log.view')
  getReminderLogSummary() {
    return this.adminService.getReminderLogSummary();
  }

  @Post('reminder-logs/retry')
  @AdminPermissions('reminder_log.view')
  retryReminderLogs(@Req() request: any, @Body() payload: any) {
    return this.adminService.retryReminderLogs(payload, request.admin);
  }

  @Post('high-risk-actions/challenge')
  createHighRiskChallenge(@Req() request: any, @Body() payload: any) {
    return this.adminService.createHighRiskChallenge(payload, request.admin);
  }

  @AdminPermissions('audit.view')
  @Get('audit-logs')
  getAuditLogs(@Query('keyword') keyword?: string, @Query('action') action?: string) {
    return this.adminService.getAuditLogs(keyword, action);
  }

  @AdminPermissions('admin.manage')
  @Get('admin-accounts')
  getAdminAccounts() {
    return this.adminService.getAdminAccounts();
  }

  @AdminPermissions('admin.manage')
  @Post('admin-accounts')
  createAdminAccount(@Req() request: any, @Body() payload: any) {
    return this.adminService.createAdminAccount(request.admin, payload);
  }

  @AdminPermissions('admin.manage')
  @Patch('admin-accounts/:id')
  updateAdminAccount(@Req() request: any, @Param('id', ParseIntPipe) id: number, @Body() payload: any) {
    return this.adminService.updateAdminAccount(request.admin, id, payload);
  }
}
