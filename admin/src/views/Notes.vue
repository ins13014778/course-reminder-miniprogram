<template>
  <div class="editorial-page">
    <section class="hero-panel">
      <div>
        <div class="hero-kicker">Campus Notes</div>
        <h2>观察小程序里的内容发布活跃度和图文质量。</h2>
        <p>笔记是个人表达和校园生活的内容池，这里主要面向运营查看最近更新、用户来源和图文分布。</p>
      </div>
      <div class="hero-side">
        <strong>{{ rows.length }} 条笔记</strong>
        <div class="muted-text">支持按内容和用户检索</div>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-header">
        <div>
          <div class="panel-title">内容池</div>
          <div class="panel-subtitle">来自小程序 `notes` 页面，可用于观察校园内容活跃度。</div>
        </div>
        <div class="panel-toolbar">
          <el-input v-model="keyword" placeholder="搜索内容 / 昵称 / 学校" clearable style="width: 280px" @keyup.enter="loadData" />
          <el-button type="primary" @click="loadData">筛选</el-button>
        </div>
      </div>

      <div class="editorial-table">
        <el-table :data="rows" v-loading="loading">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column label="发布者" min-width="160">
            <template #default="{ row }">
              <div>
                <div>{{ row.nickname || '未命名用户' }}</div>
                <div class="muted-text">{{ row.school || '未填写学校' }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="内容" min-width="320">
            <template #default="{ row }">
              {{ String(row.content || '').slice(0, 120) || '暂无内容' }}
            </template>
          </el-table-column>
          <el-table-column label="图片" width="100">
            <template #default="{ row }">
              <el-tag :type="row.image_url ? 'success' : 'info'">{{ row.image_url ? '有图' : '纯文字' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="更新时间" min-width="160">
            <template #default="{ row }">{{ formatDateTime(row.updated_at) }}</template>
          </el-table-column>
        </el-table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { noteApi } from '../api'
import { formatDateTime } from '../utils/format'

const rows = ref<any[]>([])
const loading = ref(true)
const keyword = ref('')

async function loadData() {
  loading.value = true
  try {
    const res = await noteApi.getList({ keyword: keyword.value || undefined })
    rows.value = res.data
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>
