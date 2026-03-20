<template>
  <RouterView v-if="route.meta.public" />
  <div v-else class="console-shell">
    <aside class="console-sidebar console-sidebar-desktop">
      <div class="brand-card">
        <div class="brand-kicker">Campus Governance Console</div>
        <div class="brand-title">课表提醒后台</div>
        <p class="brand-copy">
          面向真实运营场景的管理台，统一查看用户、课表、笔记、分享、举报、申诉、公告与提醒权限，并直接执行治理动作。
        </p>
      </div>

      <nav class="nav-stack">
        <RouterLink
          v-for="item in visibleNavItems"
          :key="item.path"
          :to="item.path"
          class="nav-link"
          :class="{ active: route.path === item.path }"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="sidebar-status">
        <div class="status-label">当前环境</div>
        <strong>dawdawd15</strong>
        <span>CloudBase / ap-shanghai</span>
      </div>
    </aside>

    <el-drawer
      v-model="mobileNavOpen"
      class="mobile-nav-drawer"
      direction="ltr"
      size="364px"
      :with-header="false"
    >
      <div class="console-sidebar console-sidebar-mobile">
        <div class="brand-card mobile-brand-card">
          <div class="brand-kicker">Mobile Console</div>
          <div class="brand-title brand-title-mobile">课表提醒后台</div>
          <p class="brand-copy">按照 iPhone 14 Pro Max 的 430 宽度重新收口，适合手机单手浏览与切页。</p>
        </div>

        <nav class="nav-stack">
          <RouterLink
            v-for="item in visibleNavItems"
            :key="`mobile-${item.path}`"
            :to="item.path"
            class="nav-link"
            :class="{ active: route.path === item.path }"
            @click="mobileNavOpen = false"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </RouterLink>
        </nav>

        <div class="sidebar-status">
          <div class="status-label">当前账号</div>
          <strong>{{ adminProfile?.roleLabel || '后台管理员' }}</strong>
          <span>{{ adminProfile?.email || '未读取到管理员信息' }}</span>
        </div>
      </div>
    </el-drawer>

    <main class="console-main">
      <div class="console-content-frame">
        <header class="console-header">
          <div class="header-main">
            <button class="mobile-nav-trigger" type="button" @click="mobileNavOpen = true">
              <el-icon><Menu /></el-icon>
            </button>

            <div class="header-copy">
              <div class="page-kicker">Operations Mode</div>
              <h1>{{ currentTitle }}</h1>
            </div>
          </div>

          <div class="header-actions">
            <div class="header-badge">{{ adminProfile?.roleLabel || '后台管理员' }}</div>
            <el-button plain @click="logout">
              {{ adminProfile?.email || '退出登录' }}
            </el-button>
          </div>
        </header>

        <div class="console-route-view">
          <RouterView />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import {
  Bell,
  Collection,
  DataAnalysis,
  Document,
  Memo,
  Menu,
  Notebook,
  Setting,
  Share,
  User,
  WarningFilled,
} from '@element-plus/icons-vue'
import { authApi } from './api'
import { clearAdminSession, getAdminProfile, hasAdminPermission, hasAdminRole, setAdminProfile } from './utils/auth'

const route = useRoute()
const router = useRouter()
const mobileNavOpen = ref(false)

const navItems = [
  { path: '/overview', label: '总览', icon: DataAnalysis },
  { path: '/users', label: '用户治理', icon: User, permissions: ['user.view'] },
  { path: '/courses', label: '课表巡检', icon: Collection, permissions: ['course.view'] },
  { path: '/template-courses', label: '模板课表', icon: Notebook },
  { path: '/shares', label: '课表分享', icon: Share, permissions: ['share.view'] },
  { path: '/subscriptions', label: '订阅提醒', icon: Bell, permissions: ['subscription.view'] },
  { path: '/reminder-logs', label: '提醒日志', icon: Bell, permissions: ['reminder_log.view'] },
  { path: '/notes', label: '笔记审核', icon: Memo, permissions: ['note.view'] },
  { path: '/note-shares', label: '笔记分享', icon: Share, permissions: ['note_share.view'] },
  { path: '/reports', label: '内容举报', icon: WarningFilled, permissions: ['report.view'] },
  { path: '/appeals', label: '用户申诉', icon: Memo, permissions: ['appeal.view'] },
  { path: '/feedback', label: '留言反馈', icon: Memo, permissions: ['feedback.view'] },
  { path: '/announcements', label: '公告运营', icon: Document, permissions: ['announcement.manage'] },
  { path: '/content-pages', label: '页面配置', icon: Document, permissions: ['content.manage'] },
  { path: '/audit-logs', label: '审计日志', icon: Document, permissions: ['audit.view'] },
  { path: '/admin-accounts', label: '管理员', icon: User, permissions: ['admin.manage'] },
]

const titleMap: Record<string, string> = {
  '/overview': '后台总览',
  '/users': '用户与权限治理',
  '/courses': '用户课表巡检',
  '/template-courses': '模板课表资产',
  '/shares': '课表分享密钥控制',
  '/subscriptions': '订阅提醒状态',
  '/reminder-logs': '提醒发送日志',
  '/notes': '笔记内容审核',
  '/note-shares': '笔记分享管理',
  '/reports': '内容举报审核',
  '/appeals': '用户申诉处理',
  '/feedback': '用户留言反馈',
  '/announcements': '公告发布管理',
  '/content-pages': '页面内容配置',
  '/audit-logs': '后台审计日志',
  '/admin-accounts': '管理员账号权限',
}

const visibleNavItems = computed(() =>
  navItems.filter((item) => hasAdminRole(item.roles) && hasAdminPermission(item.permissions)),
)
const currentTitle = computed(() => titleMap[route.path] || '课表提醒后台')
const adminProfile = computed(() => getAdminProfile())

function logout() {
  clearAdminSession()
  router.replace('/login')
}

async function refreshAdminProfile() {
  if (route.meta.public) return

  try {
    const res = await authApi.getProfile()
    setAdminProfile(res.data)
  } catch {
    clearAdminSession()
    router.replace('/login')
  }
}

watch(
  () => route.path,
  () => {
    mobileNavOpen.value = false
  },
)

onMounted(refreshAdminProfile)
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&family=Source+Serif+4:wght@600;700&display=swap');

:root {
  --bg-main: #f3eee3;
  --bg-soft: rgba(251, 248, 241, 0.84);
  --line-soft: rgba(146, 98, 71, 0.18);
  --ink-main: #21352b;
  --ink-soft: #667166;
  --accent: #926247;
  --danger: #c84d3a;
  --success: #2f6b4f;
  --mobile-frame-width: 430px;
}

* {
  box-sizing: border-box;
}

html,
body,
#app {
  min-height: 100%;
}

body {
  margin: 0;
  background:
    radial-gradient(circle at top left, rgba(146, 98, 71, 0.14), transparent 24%),
    radial-gradient(circle at bottom right, rgba(33, 53, 43, 0.08), transparent 28%),
    var(--bg-main);
  color: var(--ink-main);
  font-family: 'Noto Sans SC', sans-serif;
}

a {
  color: inherit;
  text-decoration: none;
}

.console-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 292px minmax(0, 1fr);
}

.console-sidebar {
  display: flex;
  flex-direction: column;
  gap: 22px;
  background: linear-gradient(180deg, rgba(251, 248, 241, 0.94), rgba(243, 236, 225, 0.88));
}

.console-sidebar-desktop {
  position: sticky;
  top: 0;
  height: 100vh;
  padding: 24px 20px;
  overflow-y: auto;
  border-right: 1px solid var(--line-soft);
}

.console-sidebar-mobile {
  min-height: 100%;
  padding: 16px 14px calc(18px + env(safe-area-inset-bottom, 0px));
  overflow-y: auto;
}

.brand-card,
.sidebar-status,
.surface-card {
  border: 1px solid var(--line-soft);
  background: var(--bg-soft);
  box-shadow: 0 18px 46px rgba(88, 69, 47, 0.07);
  backdrop-filter: blur(12px);
}

.brand-card {
  border-radius: 28px;
  padding: 22px 20px;
}

.mobile-brand-card {
  border-radius: 24px;
}

.brand-kicker,
.page-kicker,
.section-kicker {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent);
}

.brand-title {
  margin-top: 12px;
  font-family: 'Source Serif 4', serif;
  font-size: 40px;
  line-height: 0.95;
  letter-spacing: 0.02em;
}

.brand-title-mobile {
  font-size: 30px;
}

.brand-copy {
  margin: 14px 0 0;
  color: var(--ink-soft);
  line-height: 1.8;
  font-size: 13px;
}

.nav-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid transparent;
  color: var(--ink-main);
  font-weight: 500;
  transition: transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
}

.nav-link:hover,
.nav-link.active {
  transform: translateX(4px);
  border-color: var(--line-soft);
  background: rgba(255, 252, 246, 0.94);
}

.sidebar-status {
  margin-top: auto;
  border-radius: 24px;
  padding: 18px;
}

.status-label {
  font-size: 12px;
  color: var(--ink-soft);
}

.sidebar-status strong {
  display: block;
  margin-top: 8px;
  font-size: 22px;
  font-family: 'Source Serif 4', serif;
}

.sidebar-status span {
  display: block;
  margin-top: 8px;
  color: var(--ink-soft);
  font-size: 12px;
  line-height: 1.6;
}

.console-main {
  min-height: 100vh;
  overflow-y: auto;
  padding: 28px;
}

.console-content-frame {
  width: 100%;
}

.console-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 22px;
}

.header-main {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-width: 0;
}

.header-copy {
  min-width: 0;
}

.console-header h1 {
  margin: 12px 0 0;
  font-size: 40px;
  line-height: 1;
  font-family: 'Source Serif 4', serif;
  letter-spacing: 0.01em;
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.header-badge {
  padding: 11px 16px;
  border-radius: 999px;
  background: linear-gradient(135deg, #82553c, #a77253);
  color: #fff8ef;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.mobile-nav-trigger {
  display: none;
  width: 46px;
  height: 46px;
  border-radius: 16px;
  border: 1px solid var(--line-soft);
  background: rgba(255, 252, 246, 0.92);
  color: var(--ink-main);
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 10px 24px rgba(88, 69, 47, 0.08);
}

.mobile-nav-trigger .el-icon {
  font-size: 20px;
}

.console-route-view {
  width: 100%;
}

.editorial-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.hero-panel,
.panel-card {
  border: 1px solid var(--line-soft);
  background: var(--bg-soft);
  box-shadow: 0 18px 46px rgba(88, 69, 47, 0.07);
  backdrop-filter: blur(12px);
  border-radius: 28px;
}

.hero-panel {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 24px;
}

.hero-panel h2 {
  margin: 12px 0 10px;
  font-size: 30px;
  line-height: 1.18;
  font-family: 'Source Serif 4', serif;
}

.hero-panel p {
  margin: 0;
  max-width: 780px;
  color: var(--ink-soft);
  line-height: 1.8;
}

.hero-side {
  min-width: 160px;
  text-align: right;
}

.hero-side strong {
  display: block;
  font-family: 'Source Serif 4', serif;
  font-size: 28px;
  line-height: 1;
}

.hero-side .muted-text {
  margin-top: 10px;
}

.panel-card {
  padding: 20px;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.panel-title {
  font-size: 24px;
  line-height: 1.2;
  font-family: 'Source Serif 4', serif;
}

.panel-subtitle {
  margin-top: 8px;
  color: var(--ink-soft);
  line-height: 1.7;
}

.panel-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.summary-card {
  border-radius: 24px;
  border: 1px solid var(--line-soft);
  background: rgba(255, 252, 246, 0.88);
  padding: 18px;
}

.summary-card .eyebrow {
  font-size: 12px;
  color: var(--ink-soft);
}

.summary-card .value {
  margin-top: 10px;
  font-size: 34px;
  line-height: 1;
  font-family: 'Source Serif 4', serif;
}

.summary-card .meta {
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--ink-soft);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.split-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 18px;
}

.stack-grid {
  display: grid;
  gap: 14px;
}

.surface-card {
  border-radius: 24px;
  padding: 18px;
}

.surface-card h3,
.surface-card h4 {
  margin: 0;
  font-size: 18px;
  font-family: 'Source Serif 4', serif;
}

.surface-card p {
  margin: 10px 0 0;
  color: var(--ink-soft);
  line-height: 1.7;
}

.muted-text {
  color: var(--ink-soft);
  font-size: 13px;
  line-height: 1.7;
}

.status-dot {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--ink-soft);
}

.status-dot::before {
  content: '';
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
}

.status-dot.success::before {
  background: var(--success);
}

.status-dot.danger::before {
  background: var(--danger);
}

.editorial-table {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.editorial-table .el-table {
  --el-table-border-color: rgba(146, 98, 71, 0.12);
  --el-table-header-bg-color: rgba(239, 230, 216, 0.82);
  --el-table-row-hover-bg-color: rgba(252, 248, 240, 0.92);
  --el-table-text-color: var(--ink-main);
  --el-table-header-text-color: var(--ink-main);
  background: transparent;
  border-radius: 18px;
  overflow: hidden;
}

.editorial-table .el-table th.el-table__cell {
  font-weight: 600;
}

.editorial-table .el-table tr,
.editorial-table .el-table td.el-table__cell,
.editorial-table .el-table th.el-table__cell {
  background: transparent;
}

.editorial-table .cell {
  line-height: 1.6;
}

.detail-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.detail-item {
  border-radius: 18px;
  padding: 14px;
  background: rgba(255, 252, 246, 0.88);
  border: 1px solid var(--line-soft);
}

.detail-item strong {
  display: block;
  font-size: 12px;
  color: var(--ink-soft);
  margin-bottom: 8px;
}

.detail-item span {
  display: block;
  word-break: break-all;
}

.permission-card {
  border-radius: 20px;
  padding: 16px;
  background: rgba(255, 252, 246, 0.88);
  border: 1px solid var(--line-soft);
}

.permission-card + .permission-card {
  margin-top: 12px;
}

.permission-card h4 {
  margin-bottom: 12px;
}

.note-preview {
  line-height: 1.8;
  white-space: pre-wrap;
}

.danger-text {
  color: var(--danger);
}

.toolbar-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.mobile-nav-drawer .el-drawer__body {
  padding: 0;
}

.el-button,
.el-input__wrapper,
.el-textarea__inner,
.el-select__wrapper,
.el-radio-button__inner,
.el-drawer__body,
.el-form-item__label,
.el-table,
.el-tag {
  font-family: 'Noto Sans SC', sans-serif;
}

.el-drawer {
  --el-drawer-bg-color: #f8f4ec;
}

@media (max-width: 1280px) {
  .summary-grid,
  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .split-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 980px) {
  .console-shell {
    grid-template-columns: 1fr;
  }

  .console-sidebar-desktop {
    display: none;
  }

  .mobile-nav-trigger {
    display: inline-flex;
  }

  .console-main {
    padding: 14px 12px calc(18px + env(safe-area-inset-bottom, 0px));
  }

  .console-content-frame {
    width: min(100%, var(--mobile-frame-width));
    margin: 0 auto;
  }

  .console-header {
    position: sticky;
    top: 0;
    z-index: 20;
    margin-bottom: 14px;
    padding: calc(10px + env(safe-area-inset-top, 0px)) 12px 12px;
    border: 1px solid var(--line-soft);
    border-radius: 22px;
    background: rgba(248, 244, 236, 0.94);
    backdrop-filter: blur(16px);
    box-shadow: 0 16px 38px rgba(88, 69, 47, 0.08);
    flex-direction: column;
    gap: 12px;
  }

  .header-main,
  .header-actions {
    width: 100%;
  }

  .header-actions {
    justify-content: space-between;
    align-items: stretch;
  }

  .header-actions .el-button {
    flex: 1;
    min-width: 0;
  }

  .console-header h1 {
    margin-top: 8px;
    font-size: 28px;
    line-height: 1.06;
  }

  .page-kicker {
    font-size: 10px;
  }
}

@media (max-width: 720px) {
  .summary-grid,
  .metrics-grid,
  .detail-meta {
    grid-template-columns: 1fr;
  }

  .hero-panel {
    flex-direction: column;
    padding: 18px;
  }

  .hero-panel h2 {
    font-size: 24px;
  }

  .hero-side {
    min-width: 0;
    text-align: left;
  }

  .panel-card {
    padding: 16px;
    border-radius: 22px;
  }

  .panel-header {
    flex-direction: column;
    gap: 12px;
  }

  .panel-toolbar {
    width: 100%;
  }

  .panel-toolbar > * {
    width: 100% !important;
  }

  .toolbar-actions {
    width: 100%;
  }

  .toolbar-actions > * {
    flex: 1 1 calc(50% - 5px);
    min-width: 0;
  }

  .brand-card {
    border-radius: 22px;
    padding: 18px 16px;
  }

  .brand-title-mobile {
    font-size: 28px;
  }
}

@media (max-width: 430px) {
  .console-main {
    padding: 10px 8px calc(16px + env(safe-area-inset-bottom, 0px));
  }

  .console-content-frame {
    width: 100%;
    max-width: 430px;
  }

  .console-header {
    padding: calc(8px + env(safe-area-inset-top, 0px)) 10px 10px;
    border-radius: 20px;
  }

  .mobile-nav-trigger {
    width: 42px;
    height: 42px;
    border-radius: 14px;
  }

  .console-header h1 {
    font-size: 24px;
  }

  .header-badge {
    padding: 10px 12px;
    font-size: 11px;
  }

  .hero-panel,
  .panel-card,
  .surface-card,
  .summary-card,
  .detail-item,
  .permission-card {
    border-radius: 18px;
  }

  .hero-panel {
    padding: 14px;
    gap: 14px;
  }

  .hero-panel h2 {
    font-size: 21px;
    line-height: 1.14;
  }

  .hero-panel p,
  .panel-subtitle,
  .muted-text,
  .summary-card .meta {
    font-size: 12px;
    line-height: 1.65;
  }

  .panel-card {
    padding: 14px;
  }

  .panel-title {
    font-size: 20px;
  }

  .summary-card {
    padding: 14px;
  }

  .summary-card .value,
  .hero-side strong {
    font-size: 24px;
  }

  .surface-card {
    padding: 14px;
  }

  .detail-item,
  .permission-card {
    padding: 12px;
  }

  .editorial-table .el-table {
    min-width: 620px;
  }

  .mobile-nav-drawer {
    --el-drawer-size: min(364px, 100vw);
  }
}
</style>
