import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CoursesService } from './courses.service';

@Controller('courses')
export class CoursesController {
  constructor(private coursesService: CoursesService) {}

  @Post()
  create(@Request() req, @Body() courseData: any) {
    return this.coursesService.create(req.user.userId, courseData);
  }

  @Get()
  findAll(@Request() req) {
    return this.coursesService.findByUser(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coursesService.findById(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() courseData: any) {
    return this.coursesService.update(+id, courseData);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.coursesService.delete(+id);
  }
}
