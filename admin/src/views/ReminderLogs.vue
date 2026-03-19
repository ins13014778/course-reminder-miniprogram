<template>
  <div class="editorial-page">
    <section class="hero-panel">
      <div>
        <div class="section-kicker">Reminder Logs</div>
        <h2>提醒失败可重试，并把异常告警集中展示出来。</h2>
        <p>当用户反馈“没收到提醒”时，这里可以快速筛查失败原因、选择失败记录重试，并查看近 24 小时告警强度。</p>
      </div>
      <div class="hero-side">
        <strong>{{ summary.failedCount }}</strong>
        <div class="muted-text">累计失败记录</div>
      </div>
    </section>

    <section class="summary-grid">
      <article class="summary-card">
        <div class="eyebrow">成功</div>
        <div class="value">{{ summary.sentCount }}</div>
        <div class="meta">发送成功日志数</div>
      </article>
      <article class="summary-card">
        <div class="eyebrow">近 24 小时失败</div>
        <div class="value">{{ summary.failedLast24h }}</div>
        <div class="meta">最近一天内新增失败数</div>
      </article>
      <article class="summary-card">
        <div class="eyebrow">已重试</div>
        <div class="value">{{ summary.retriedCount }}</div>
        <div class="meta">至少重试过一次的失败日志</div>
      </article>
      <article class="summary-card">
        <div class="eyebrow">重点告警</div>
        <div class="value">{{ summary.criticalCount }}</div>
        <div class="meta">重试次数较高，需要人工跟进</div>
      </article>
    </section>

    <section class="surface-card" v-if="summary.latestAlerts.length">
      <div class="section-kicker">Alert Feed</div>
      <h3>最新异常告警</h3>
      <div class="stack-grid" style="margin-top: 14px">
        <div v-for="item in summary.latestAlerts" :key="item.id" class="detail-item">
          <strong>#{{ item.id }} / {{ item.nickname || item.openid || '未知用户' }}</strong>
          <span>{{ item.course_name || '未命名课程' }} / {{ item.start_time || '-' }} / 重试 {{ item.retry_count || 0 }} 次</span>
          <div class="muted-text" style="margin-top: 8px">{{ item.error_message || '无错误信息' }}</div>
        </div>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-header">
        <div>
          <div class="panel-title">发送日志</div>
          <div class="panel-subtitle">支持按状态、课程、用户、错误信息筛选，并可重试失败记录。</div>
        </div>
        <div class="panel-toolbar">
          <el-select v-model="status" placeholder="全部状态" clearable style="width: 160px" @change="loadData">
            <el-option label="发送成功" value="sent" />
            <el-option label="发送失败" value="failed" />
          </el-select>
          <el-input
            v-model="keyword"
            placeholder="搜索课程 / 用户 / 错误信息"
            clearable
            style="width: 320px"
            @keyup.enter="loadData"
          />
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button :disabled="!selectedIds.length" @click="retrySelected">重试失败记录</el-button>
        </div>
      </div>

      <div class="muted-text" style="margin-bottom: 12px">已选择 {{ selectedIds.length }} 条日志</div>

      <div class="editorial-table">
        <el-table :data="rows" v-loading="loading" @selection-change="onSelectionChange">
          <el-table-column type="selection" width="52" />
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column label="用户" min-width="170">
            <template #default="{ row }">
              <div>
                <div>{{ row.nickname || row.openid || '未知用户' }}</div>
                <div class="muted-text">{{ row.school || row.openid || '-' }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="course_name" label="课程" min-width="160" />
          <el-table-column prop="start_time" label="开始时间" width="110" />
          <el-table-column prop="location" label="地点" min-width="140" />
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'sent' ? 'success' : 'danger'">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="重试次数" width="100">
            <template #default="{ row }">{{ row.retry_count || 0 }}</template>
          </el-table-column>
          <el-table-column prop="error_message" label="失败原因" min-width="220" />
          <el-table-column label="最后重试" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.last_retry_at) }}</template>
          </el-table-column>
          <el-table-column label="发送时间" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.created_at || row.sent_at) }}</template>
          </el-table-column>
        </el-table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { reminderLogApi } from '../api'
import { formatDateTime } from '../utils/format'

const rows = ref<any[]>([])
const loading = ref(true)
const keyword = ref('')
const status = ref('')
const selectedIds = ref<number[]>([])

const summary = reactive({
  sentCount: 0,
  failedCount: 0,
  failedLast24h: 0,
  retriedCount: 0,
  criticalCount: 0,
  latestAlerts: [] as any[],
})

function onSelectionChange(selection: any[]) {
  selectedIds.value = selection
    .filter((item) => item.status === 'failed')
    .map((item) => Number(item.id))
}

async function loadSummary() {
  const res = await reminderLogApi.getSummary()
  Object.assign(summary, res.data || {})
}

async function loadData() {
  loading.value = true
  try {
    const [listRes] = await Promise.all([
      reminderLogApi.getList({
        keyword: keyword.value || undefined,
        status: status.value || undefined,
      }),
      loadSummary(),
    ])
    rows.value = listRes.data || []
  } finally {
    loading.value = false
  }
}

async function retrySelected() {
  if (!selectedIds.value.length) {
    ElMessage.warning('请先选择失败日志')
    return
  }

  const res = await reminderLogApi.retry({ ids: selectedIds.value })
  Object.assign(summary, res.data?.summary || {})
  ElMessage.success('失败日志已发起重试')
  await loadData()
}

onMounted(loadData)
</script>
