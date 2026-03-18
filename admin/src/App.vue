<template>
  <div class="shell">
    <aside class="side-nav">
      <div class="brand-block">
        <div class="brand-kicker">Campus Operations</div>
        <div class="brand">课表提醒后台</div>
        <p>围绕小程序当前真实能力搭建的运营工作台。</p>
      </div>

      <nav class="nav-group">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: $route.path === item.path }"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="side-note">
        <div>环境</div>
        <strong>dawdawd15</strong>
        <span>CloudBase · ap-shanghai</span>
      </div>
    </aside>

    <main class="main-panel">
      <header class="topbar">
        <div>
          <div class="topbar-kicker">Editorial Console</div>
          <h1>{{ currentTitle }}</h1>
        </div>
        <div class="topbar-badge">运营模式</div>
      </header>

      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  Bell,
  Collection,
  DataAnalysis,
  Document,
  Memo,
  Notebook,
  Share,
  User,
} from '@element-plus/icons-vue'

const route = useRoute()

const navItems = [
  { path: '/overview', label: '概览', icon: DataAnalysis },
  { path: '/users', label: '用户', icon: User },
  { path: '/courses', label: '课程', icon: Collection },
  { path: '/template-courses', label: '模板课表', icon: Notebook },
  { path: '/shares', label: '分享导入', icon: Share },
  { path: '/subscriptions', label: '订阅提醒', icon: Bell },
  { path: '/notes', label: '校园笔记', icon: Memo },
  { path: '/announcements', label: '公告运营', icon: Document },
]

const titleMap: Record<string, string> = {
  '/overview': '总览与状态',
  '/users': '用户运营',
  '/courses': '课程库巡检',
  '/template-courses': '模板课表资产',
  '/shares': '分享导入链路',
  '/subscriptions': '订阅授权观察',
  '/notes': '校园笔记内容池',
  '/announcements': '公告编辑器',
}

const currentTitle = computed(() => titleMap[route.path] || '课表提醒后台')
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@500;600;700&display=swap');

:root {
  --paper: #f5f1e8;
  --ink: #1f3a2e;
  --ink-soft: #586154;
  --accent: #c96f3b;
  --line: #d8c7a3;
  --panel: rgba(255, 250, 242, 0.74);
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
    radial-gradient(circle at top left, rgba(201, 111, 59, 0.14), transparent 22%),
    radial-gradient(circle at bottom right, rgba(31, 58, 46, 0.12), transparent 24%),
    var(--paper);
  color: #20261f;
  font-family: 'IBM Plex Sans', sans-serif;
}

a {
  color: inherit;
  text-decoration: none;
}

.shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
}

.side-nav {
  position: sticky;
  top: 0;
  height: 100vh;
  padding: 28px 22px;
  border-right: 1px solid rgba(216, 199, 163, 0.7);
  background: linear-gradient(180deg, rgba(255, 248, 238, 0.9), rgba(246, 239, 226, 0.72));
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.brand-block {
  padding: 18px;
  border: 1px solid rgba(216, 199, 163, 0.9);
  border-radius: 28px;
  background: rgba(255, 252, 247, 0.72);
}

.brand-kicker,
.topbar-kicker {
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-size: 11px;
  color: var(--ink-soft);
}

.brand {
  margin-top: 10px;
  font-size: 34px;
  line-height: 1;
  color: var(--ink);
  font-family: 'Cormorant Garamond', 'Noto Serif SC', serif;
}

.brand-block p {
  margin: 12px 0 0;
  line-height: 1.7;
  color: var(--ink-soft);
  font-size: 13px;
}

.nav-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 18px;
  color: var(--ink);
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.nav-item:hover,
.nav-item.active {
  transform: translateX(4px);
  background: rgba(255, 251, 245, 0.88);
  border-color: rgba(216, 199, 163, 0.9);
}

.side-note {
  margin-top: auto;
  padding: 18px;
  border-radius: 24px;
  background: var(--ink);
  color: #f7f2e7;
}

.side-note div {
  font-size: 12px;
  opacity: 0.7;
}

.side-note strong {
  display: block;
  margin-top: 8px;
  font-size: 18px;
  font-family: 'Cormorant Garamond', 'Noto Serif SC', serif;
}

.side-note span {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  opacity: 0.75;
}

.main-panel {
  padding: 28px;
}

.topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}

.topbar h1 {
  margin: 10px 0 0;
  color: var(--ink);
  font-size: 42px;
  line-height: 1;
  font-family: 'Cormorant Garamond', 'Noto Serif SC', serif;
}

.topbar-badge {
  padding: 12px 16px;
  border-radius: 999px;
  color: #fff7ed;
  background: linear-gradient(135deg, #b46135, #d08f4b);
  font-size: 12px;
  letter-spacing: 0.08em;
}

.editorial-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.hero-panel,
.panel-card {
  border-radius: 28px;
  border: 1px solid rgba(216, 199, 163, 0.9);
  background: var(--panel);
  box-shadow: 0 20px 60px rgba(78, 67, 49, 0.08);
  backdrop-filter: blur(12px);
}

.hero-panel {
  padding: 22px 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.hero-panel h2 {
  margin: 10px 0 8px;
  font-size: 30px;
  line-height: 1.05;
  color: var(--ink);
  font-family: 'Cormorant Garamond', 'Noto Serif SC', serif;
}

.hero-panel p {
  margin: 0;
  max-width: 720px;
  color: var(--ink-soft);
  line-height: 1.8;
}

.hero-kicker {
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

.hero-side {
  min-width: 160px;
  text-align: right;
  color: var(--ink);
}

.hero-side strong {
  display: block;
  font-size: 14px;
  color: var(--accent);
}

.panel-card {
  padding: 18px;
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
  color: var(--ink);
  font-family: 'Cormorant Garamond', 'Noto Serif SC', serif;
}

.panel-subtitle {
  margin-top: 6px;
  color: var(--ink-soft);
  font-size: 13px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.summary-card {
  border-radius: 22px;
  padding: 18px;
  border: 1px solid rgba(216, 199, 163, 0.9);
  background: rgba(255, 252, 247, 0.7);
}

.summary-card .eyebrow {
  font-size: 12px;
  color: var(--ink-soft);
}

.summary-card .value {
  margin-top: 12px;
  font-size: 34px;
  color: var(--ink);
  font-family: 'Cormorant Garamond', 'Noto Serif SC', serif;
}

.summary-card .meta {
  margin-top: 8px;
  font-size: 12px;
  color: var(--ink-soft);
}

.panel-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.split-grid {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 18px;
}

.muted-text {
  color: var(--ink-soft);
}

.empty-wrap {
  padding: 36px 12px;
}

.editorial-table .el-table {
  --el-table-border-color: rgba(216, 199, 163, 0.7);
  --el-table-header-bg-color: rgba(242, 232, 214, 0.62);
  --el-table-row-hover-bg-color: rgba(255, 249, 238, 0.7);
  background: transparent;
}

.editorial-table .el-table th.el-table__cell {
  color: var(--ink);
  font-weight: 600;
}

.editorial-table .el-table tr,
.editorial-table .el-table td.el-table__cell,
.editorial-table .el-table th.el-table__cell {
  background: transparent;
}

.pill-note {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 6px 10px;
  background: rgba(201, 111, 59, 0.12);
  color: var(--accent);
  font-size: 12px;
}

@media (max-width: 1280px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .split-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 960px) {
  .shell {
    grid-template-columns: 1fr;
  }

  .side-nav {
    position: static;
    height: auto;
  }

  .main-panel {
    padding: 20px;
  }

  .topbar {
    flex-direction: column;
  }

  .topbar h1 {
    font-size: 34px;
  }
}

@media (max-width: 720px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
