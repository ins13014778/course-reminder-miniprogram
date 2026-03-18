<template>
  <div class="editorial-page">
    <section class="hero-panel">
      <div>
        <div class="hero-kicker">Subscription Watch</div>
        <h2>查看用户的提醒授权、剩余次数和提醒时机。</h2>
        <p>这部分直接对应小程序设置页里的订阅消息授权功能，用于确认哪些用户还处于 active 状态，哪些授权已经用尽或失活。</p>
      </div>
      <div class="hero-side">
        <strong>{{ rows.length }} 条授权记录</strong>
        <div class="muted-text">当前活跃授权一眼可见</div>
      </div>
    </section>

    <section class="summary-grid">
      <article class="summary-card">
        <div class="eyebrow">活跃授权</div>
        <div class="value">{{ activeCount }}</div>
        <div class="meta">状态为 active 的记录</div>
      </article>
      <article class="summary-card">
        <div class="eyebrow">已用尽</div>
        <div class="value">{{ usedCount }}</div>
        <div class="meta">状态为 used 的记录</div>
      </article>
      <article class="summary-card">
        <div class="eyebrow">已关闭</div>
        <div class="value">{{ inactiveCount }}</div>
        <div class="meta">状态为 inactive 的记录</div>
      </article>
    </section>

    <section class="panel-card">
      <div class="panel-header">
        <div>
          <div class="panel-title">订阅授权列表</div>
          <div class="panel-subtitle">包含模板 ID、跳转页、提醒分钟数和剩余发送次数。</div>
        </div>
      </div>

      <div class="editorial-table">
        <el-table :data="rows" v-loading="loading">
          <el-table-column label="用户" min-width="160">
            <template #default="{ row }">
              <div>
                <div>{{ row.nickname || '未命名用户' }}</div>
                <div class="muted-text">{{ row.school || '未填写学校' }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="template_id" label="模板 ID" min-width="220" />
          <el-table-column prop="page_path" label="跳转页" min-width="160" />
          <el-table-column label="提醒提前量" width="110">
            <template #default="{ row }">{{ row.remind_minutes }} 分钟</template>
          </el-table-column>
          <el-table-column label="剩余次数" width="100">
            <template #default="{ row }">{{ row.remaining_count }}</template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="tagType(row.status)">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="最近授权" min-width="160">
            <template #default="{ row }">{{ formatDateTime(row.last_subscribed_at) }}</template>
          </el-table-column>
        </el-table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { subscriptionApi } from '../api'
import { formatDateTime } from '../utils/format'

const rows = ref<any[]>([])
const loading = ref(true)

const activeCount = computed(() => rows.value.filter((item) => item.status === 'active').length)
const usedCount = computed(() => rows.value.filter((item) => item.status === 'used').length)
const inactiveCount = computed(() => rows.value.filter((item) => item.status === 'inactive').length)

function tagType(status: string) {
  if (status === 'active') return 'success'
  if (status === 'used') return 'warning'
  return 'info'
}

async function loadData() {
  loading.value = true
  try {
    const res = await subscriptionApi.getList()
    rows.value = res.data
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>
