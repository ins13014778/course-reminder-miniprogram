<template>
  <div class="editorial-page">
    <section class="hero-panel">
      <div>
        <div class="section-kicker">Governance Overview</div>
        <h2>把用户治理、提醒告警和内容风控放进同一个运营视图里。</h2>
        <p>这里优先展示当前线上数据规模、待处理风控项、累计违规档案，以及提醒失败的告警强度。</p>
      </div>
      <div class="hero-side">
        <strong>{{ metricCards.length }}</strong>
        <div class="muted-text">核心指标</div>
      </div>
    </section>

    <section class="summary-grid">
      <article v-for="item in metricCards" :key="item.label" class="summary-card">
        <div class="eyebrow">{{ item.label }}</div>
        <div class="value">{{ item.value }}</div>
        <div class="meta">{{ item.meta }}</div>
      </article>
    </section>

    <section class="split-grid">
      <div class="stack-grid">
        <section class="panel-card">
          <div class="panel-header">
            <div>
              <div class="panel-title">最近注册用户</div>
              <div class="panel-subtitle">帮助你快速看到新增用户来源和资料完整度。</div>
            </div>
          </div>
          <div class="editorial-table">
            <el-table :data="data.recentUsers" v-loading="loading">
              <el-table-column prop="id" label="ID" width="80" />
              <el-table-column prop="nickname" label="昵称" min-width="140" />
              <el-table-column prop="school" label="学校" min-width="140" />
              <el-table-column prop="major" label="专业" min-width="140" />
              <el-table-column prop="grade" label="年级" width="100" />
              <el-table-column label="注册时间" min-width="170">
                <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
              </el-table-column>
            </el-table>
          </div>
        </section>

        <section class="panel-card">
          <div class="panel-header">
            <div>
              <div class="panel-title">最新课表变动</div>
              <div class="panel-subtitle">适合排查异常导入或重复课程。</div>
            </div>
          </div>
          <div class="editorial-table">
            <el-table :data="data.recentCourses" v-loading="loading">
              <el-table-column prop="course_name" label="课程" min-width="180" />
              <el-table-column prop="teacher" label="教师" min-width="120" />
              <el-table-column prop="location" label="教室" min-width="140" />
              <el-table-column label="用户" min-width="120">
                <template #default="{ row }">{{ row.nickname || '未命名用户' }}</template>
              </el-table-column>
            </el-table>
          </div>
        </section>
      </div>

      <div class="stack-grid">
        <section class="surface-card">
          <div class="section-kicker">Moderation</div>
          <h3>风控指标</h3>
          <div class="metrics-grid" style="margin-top: 14px">
            <div class="summary-card">
              <div class="eyebrow">账号封禁</div>
              <div class="value">{{ data.metrics.bannedUsers }}</div>
              <div class="meta">当前仍在封禁期内的用户</div>
            </div>
            <div class="summary-card">
              <div class="eyebrow">违规档案</div>
              <div class="value">{{ data.metrics.totalViolations }}</div>
              <div class="meta">累计处罚与治理记录总数</div>
            </div>
            <div class="summary-card">
              <div class="eyebrow">当前生效处罚</div>
              <div class="value">{{ data.metrics.activeViolations }}</div>
              <div class="meta">仍处于生效中的处罚</div>
            </div>
          </div>
        </section>

        <section class="surface-card">
          <div class="section-kicker">Reminder Health</div>
          <h3>提醒异常告警</h3>
          <div class="metrics-grid" style="margin-top: 14px">
            <div class="summary-card">
              <div class="eyebrow">近 24 小时失败</div>
              <div class="value">{{ data.metrics.failedReminders24h }}</div>
              <div class="meta">最近一天发送失败的提醒</div>
            </div>
            <div class="summary-card">
              <div class="eyebrow">重点告警</div>
              <div class="value">{{ data.metrics.criticalReminderAlerts }}</div>
              <div class="meta">高重试失败，需要人工处理</div>
            </div>
          </div>
        </section>

        <section class="surface-card">
          <div class="section-kicker">Content Watch</div>
          <h3>最近更新笔记</h3>
          <div class="stack-grid" style="margin-top: 14px">
            <div v-for="note in data.recentNotes" :key="note.id" class="detail-item">
              <strong>{{ note.nickname || '未命名用户' }}</strong>
              <span>{{ trimText(note.content, 90) }}</span>
              <div class="muted-text" style="margin-top: 8px">
                {{ formatDateTime(note.updated_at) }} / {{ note.status === 'blocked' ? '已下架' : '正常' }}
              </div>
            </div>
          </div>
        </section>

        <section class="surface-card">
          <div class="section-kicker">Feature Health</div>
          <h3>关键数据表状态</h3>
          <div class="stack-grid" style="margin-top: 14px">
            <div class="status-dot" :class="data.featureHealth.remindersTable ? 'success' : 'danger'">
              提醒表 {{ data.featureHealth.remindersTable ? '正常' : '缺失' }}
            </div>
            <div class="status-dot" :class="data.featureHealth.notesTable ? 'success' : 'danger'">
              笔记表 {{ data.featureHealth.notesTable ? '正常' : '缺失' }}
            </div>
            <div class="status-dot" :class="data.featureHealth.announcementTable ? 'success' : 'danger'">
              公告表 {{ data.featureHealth.announcementTable ? '正常' : '缺失' }}
            </div>
            <div class="status-dot" :class="data.featureHealth.violationTable ? 'success' : 'danger'">
              违规档案表 {{ data.featureHealth.violationTable ? '正常' : '缺失' }}
            </div>
          </div>
        </section>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { overviewApi } from '../api'
import { formatDateTime, trimText } from '../utils/format'

const loading = ref(true)
const data = reactive({
  metrics: {
    users: 0,
    courses: 0,
    notes: 0,
    activeSubscriptions: 0,
    activeShares: 0,
    templateCourses: 0,
    publishedAnnouncements: 0,
    bannedUsers: 0,
    noteBans: 0,
    shareBans: 0,
    blockedNotes: 0,
    blockedKeys: 0,
    totalViolations: 0,
    activeViolations: 0,
    failedReminders24h: 0,
    criticalReminderAlerts: 0,
  },
  recentUsers: [] as any[],
  recentNotes: [] as any[],
  recentCourses: [] as any[],
  reminderSummary: {
    latestAlerts: [] as any[],
  },
  featureHealth: {
    remindersTable: false,
    importTasksTable: false,
    notesTable: false,
    announcementTable: false,
    appealTable: false,
    feedbackTable: false,
    violationTable: false,
  },
})

const metricCards = computed(() => [
  { label: '注册用户', value: data.metrics.users, meta: '当前已注册的小程序用户数' },
  { label: '课表总量', value: data.metrics.courses, meta: '已写入数据库的课程总数' },
  { label: '笔记总量', value: data.metrics.notes, meta: '包含正常与已下架的全部笔记' },
  { label: '活跃订阅', value: data.metrics.activeSubscriptions, meta: '处于 active 状态的提醒授权' },
  { label: '可用分享密钥', value: data.metrics.activeShares, meta: '当前仍可使用的课表分享密钥' },
  { label: '已发布公告', value: data.metrics.publishedAnnouncements, meta: '用户端当前可见的公告数量' },
  { label: '待审核举报', value: data.metrics.pendingReports, meta: '尚未处理的内容举报' },
  { label: '提醒重点告警', value: data.metrics.criticalReminderAlerts, meta: '提醒失败重试较高的风险项' },
])

async function loadData() {
  loading.value = true
  try {
    const res = await overviewApi.get()
    Object.assign(data, res.data)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>
