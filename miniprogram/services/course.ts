import { request } from '../utils/request';

export const courseService = {
  async getCourses() {
    return request('/courses', { method: 'GET' });
  },

  async createCourse(data: any) {
    return request('/courses', { method: 'POST', data });
  },

  async updateCourse(id: number, data: any) {
    return request(`/courses/${id}`, { method: 'PUT', data });
  },

  async deleteCourse(id: number) {
    return request(`/courses/${id}`, { method: 'DELETE' });
  },
};
