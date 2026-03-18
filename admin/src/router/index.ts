import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/overview' },
  { path: '/overview', component: () => import('../views/Overview.vue') },
  { path: '/users', component: () => import('../views/Users.vue') },
  { path: '/courses', component: () => import('../views/Courses.vue') },
  { path: '/template-courses', component: () => import('../views/TemplateCourses.vue') },
  { path: '/shares', component: () => import('../views/ShareCenter.vue') },
  { path: '/subscriptions', component: () => import('../views/Subscriptions.vue') },
  { path: '/notes', component: () => import('../views/Notes.vue') },
  { path: '/announcements', component: () => import('../views/Announcements.vue') },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
