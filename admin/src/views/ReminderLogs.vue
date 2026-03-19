<template>
  <div class="editorial-page">
    <section class="hero-panel">
      <div>
        <div class="section-kicker">Reminder Logs</div>
        <h2>把提醒是否发出去、为什么失败、发给了谁，全部沉到可查的发送日志里。</h2>
        <p>当用户反馈“没收到提醒”时，这里就是排查入口。支持按状态和关键词筛选发送记录。</p>
      </div>
      <div class="hero-side">
        <strong>{{ sentCount }}</strong>
        <div class="muted-text">成功发送记录</div>
      </div>
    </section>

    <section class="summary-grid">
      <article class="summary-card">
        <div class="eyebrow">成功</div>
        <div class="value">{{ sentCount }}</div>
        <div class="meta">状态为 sent 的记录</div>
      </article>
      <article class="summary-card">
        <div class="eyebrow">失败</div>
        <div class="value">{{ failedCount }}</div>
        <div class="meta">状态为 failed 的记录</div>
      </article>
    </section>

    <section class="panel-card">
      <div class="panel-header">
        <div>
          <div class="panel-title">发送日志</div>
          <div class="panel-subtitle">检索课程名、地点、错误信息、用户昵称或 OpenID。</div>
        </div>
        <div class="panel-toolbar">
          <el-select v-model="status" placeholder="全部状态" clearable style="width: 160px" @change="loadData">
            <el-option label="发送成功" value="sent" />
            <el-option label="发送失败" value="failed" />
          </el-select>
          <el-input v-model="keyword" placeholder="搜索课程 / 用户 / 错误信息" clearable style="width: 320px" @keyup.enter="loadData" />
          <el-button type="primary" @click="loadData">查询</el-button>
        </div>
      </div>

      <div class="editorial-table">
        <el-table :data="rows" v-loading="loading">
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
          <el-table-column prop="error_message" label="失败原因" min-width="220" />
          <el-table-column label="发送时间" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.created_at || row.sent_at) }}</template>
          </el-table-column>
        </el-table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { reminderLogApi } from '../api'
import { formatDateTime } from '../utils/format'

const rows = ref<any[]>([])
const loading = ref(true)
const keyword = ref('')
const status = ref('')

const sentCount = computed(() => rows.value.filter((item) => item.status === 'sent').length)
const failedCount = computed(() => rows.value.filter((item) => item.status === 'failed').length)

async function loadData() {
  loading.value = true
  try {
    const res = await reminderLogApi.getList({
      keyword: keyword.value || undefined,
      status: status.value || undefined,
    })
    rows.value = res.data || []
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>
