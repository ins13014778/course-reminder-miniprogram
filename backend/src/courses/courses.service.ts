import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from '../common/entities/course.entity';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
  ) {}

  async create(userId: number, courseData: Partial<Course>) {
    const course = this.courseRepository.create({ ...courseData, userId });
    return this.courseRepository.save(course);
  }

  async findByUser(userId: number) {
    return this.courseRepository.find({ where: { userId } });
  }

  async findById(id: number) {
    return this.courseRepository.findOne({ where: { id } });
  }

  async update(id: number, courseData: Partial<Course>) {
    await this.courseRepository.update(id, courseData);
    return this.findById(id);
  }

  async delete(id: number) {
    await this.courseRepository.delete(id);
  }
}
