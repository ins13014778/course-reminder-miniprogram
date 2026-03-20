import { createRouter, createWebHistory } from 'vue-router'
import { getToken, hasAdminPermission, hasAdminRole } from '../utils/auth'

const routes = [
  { path: '/', redirect: '/overview' },
  { path: '/login', component: () => import('../views/Login.vue'), meta: { public: true } },
  { path: '/overview', component: () => import('../views/Overview.vue') },
  { path: '/users', component: () => import('../views/Users.vue'), meta: { permissions: ['user.view'] } },
  { path: '/courses', component: () => import('../views/Courses.vue'), meta: { permissions: ['course.view'] } },
  { path: '/template-courses', component: () => import('../views/TemplateCourses.vue') },
  { path: '/shares', component: () => import('../views/ShareCenter.vue'), meta: { permissions: ['share.view'] } },
  { path: '/subscriptions', component: () => import('../views/Subscriptions.vue'), meta: { permissions: ['subscription.view'] } },
  { path: '/reminder-logs', component: () => import('../views/ReminderLogs.vue'), meta: { permissions: ['reminder_log.view'] } },
  { path: '/notes', component: () => import('../views/Notes.vue'), meta: { permissions: ['note.view'] } },
  { path: '/note-shares', component: () => import('../views/NoteShares.vue'), meta: { permissions: ['note_share.view'] } },
  { path: '/reports', component: () => import('../views/Reports.vue'), meta: { permissions: ['report.view'] } },
  { path: '/appeals', component: () => import('../views/Appeals.vue'), meta: { permissions: ['appeal.view'] } },
  { path: '/feedback', component: () => import('../views/Feedback.vue'), meta: { permissions: ['feedback.view'] } },
  { path: '/announcements', component: () => import('../views/Announcements.vue'), meta: { permissions: ['announcement.manage'] } },
  { path: '/content-pages', component: () => import('../views/ContentPages.vue'), meta: { permissions: ['content.manage'] } },
  { path: '/system-settings', component: () => import('../views/SystemSettings.vue'), meta: { permissions: ['system.manage'] } },
  { path: '/audit-logs', component: () => import('../views/AuditLogs.vue'), meta: { permissions: ['audit.view'] } },
  { path: '/admin-accounts', component: () => import('../views/AdminAccounts.vue'), meta: { permissions: ['admin.manage'] } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  if (to.meta.public) {
    if (to.path === '/login' && getToken()) {
      return '/overview'
    }
    return true
  }

  if (!getToken()) {
    return {
      path: '/login',
      query: to.fullPath ? { redirect: to.fullPath } : undefined,
    }
  }

  if (!hasAdminRole((to.meta.roles as string[]) || undefined)) {
    return '/overview'
  }

  if (!hasAdminPermission((to.meta.permissions as string[]) || undefined)) {
    return '/overview'
  }

  return true
})

export default router
