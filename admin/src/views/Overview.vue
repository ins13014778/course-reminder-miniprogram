<template>
  <div class="editorial-page">
    <section class="hero-panel">
      <div>
        <div class="section-kicker">Governance Overview</div>
        <h2>把用户、课表、笔记、分享密钥和提醒授权放进同一张治理视图里。</h2>
        <p>
          这里优先展示当前线上数据规模，以及封禁、下架、停用等风险指标，方便你第一眼就知道后台要处理什么。
        </p>
      </div>
      <div class="hero-side">
        <strong>{{ metricCards.length }}</strong>
        <div class="muted-text">项核心运营指标</div>
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
              <div class="panel-subtitle">最近写入的课表记录，适合排查异常导入或重复课程。</div>
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
          <h3>权限风险</h3>
          <p>账号封禁、笔记权限封禁、分享密钥封禁与违规内容下架都会在这里汇总。</p>
          <div class="metrics-grid" style="margin-top: 14px;">
            <div class="summary-card">
              <div class="eyebrow">账号封禁</div>
              <div class="value">{{ data.metrics.bannedUsers }}</div>
              <div class="meta">当前仍在封禁期内的用户</div>
            </div>
            <div class="summary-card">
              <div class="eyebrow">笔记权限封禁</div>
              <div class="value">{{ data.metrics.noteBans }}</div>
              <div class="meta">被暂停发布笔记的用户</div>
            </div>
            <div class="summary-card">
              <div class="eyebrow">密钥权限封禁</div>
              <div class="value">{{ data.metrics.shareBans }}</div>
              <div class="meta">被暂停分享密钥能力的用户</div>
            </div>
            <div class="summary-card">
              <div class="eyebrow">违规笔记下架</div>
              <div class="value">{{ data.metrics.blockedNotes }}</div>
              <div class="meta">已被后台隐藏的笔记</div>
            </div>
            <div class="summary-card">
              <div class="eyebrow">密钥停用</div>
              <div class="value">{{ data.metrics.blockedKeys }}</div>
              <div class="meta">被后台禁用的分享密钥</div>
            </div>
          </div>
        </section>

        <section class="surface-card">
          <div class="section-kicker">Content Watch</div>
          <h3>最近更新笔记</h3>
          <div class="stack-grid" style="margin-top: 14px;">
            <div v-for="note in data.recentNotes" :key="note.id" class="detail-item">
              <strong>{{ note.nickname || '未命名用户' }}</strong>
              <span>{{ trimText(note.content, 90) }}</span>
              <div class="muted-text" style="margin-top: 8px;">
                {{ formatDateTime(note.updated_at) }} · {{ note.status === 'blocked' ? '已下架' : '正常' }}
              </div>
            </div>
          </div>
        </section>

        <section class="surface-card">
          <div class="section-kicker">Feature Health</div>
          <h3>关键数据表状态</h3>
          <div class="stack-grid" style="margin-top: 14px;">
            <div class="status-dot" :class="data.featureHealth.remindersTable ? 'success' : 'danger'">
              提醒表 {{ data.featureHealth.remindersTable ? '正常' : '缺失' }}
            </div>
            <div class="status-dot" :class="data.featureHealth.importTasksTable ? 'success' : 'danger'">
              导入任务表 {{ data.featureHealth.importTasksTable ? '正常' : '缺失' }}
            </div>
            <div class="status-dot" :class="data.featureHealth.notesTable ? 'success' : 'danger'">
              笔记表 {{ data.featureHealth.notesTable ? '正常' : '缺失' }}
            </div>
            <div class="status-dot" :class="data.featureHealth.announcementTable ? 'success' : 'danger'">
              公告表 {{ data.featureHealth.announcementTable ? '正常' : '缺失' }}
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
  },
  recentUsers: [] as any[],
  recentNotes: [] as any[],
  recentCourses: [] as any[],
  featureHealth: {
    remindersTable: false,
    importTasksTable: false,
    notesTable: false,
    announcementTable: false,
  },
})

const metricCards = computed(() => [
  { label: '注册用户', value: data.metrics.users, meta: '当前已注册的小程序用户数量' },
  { label: '课表总量', value: data.metrics.courses, meta: '已写入数据库的课表课程总数' },
  { label: '笔记总量', value: data.metrics.notes, meta: '包含正常与已下架的所有笔记' },
  { label: '活跃订阅', value: data.metrics.activeSubscriptions, meta: '还处于 active 状态的提醒授权' },
  { label: '可用分享密钥', value: data.metrics.activeShares, meta: '当前仍可使用的分享密钥数量' },
  { label: '模板课程', value: data.metrics.templateCourses, meta: '默认模板课表资产数量' },
  { label: '已发布公告', value: data.metrics.publishedAnnouncements, meta: '前台当前可见的公告数量' },
  { label: '风控事项', value: data.metrics.bannedUsers + data.metrics.blockedNotes + data.metrics.blockedKeys, meta: '需要后台持续关注的封禁与下架项' },
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
