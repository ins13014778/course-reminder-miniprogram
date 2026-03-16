import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/users' },
  { path: '/users', component: () => import('../views/Users.vue') },
  { path: '/courses', component: () => import('../views/Courses.vue') },
  { path: '/imports', component: () => import('../views/Imports.vue') },
  { path: '/reminders', component: () => import('../views/Reminders.vue') },
  { path: '/announcements', component: () => import('../views/Announcements.vue') },
]

export default createRouter({
  history: createWebHistory(),
  routes
})
