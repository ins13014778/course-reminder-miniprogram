<template>
  <div class="editorial-page">
    <section class="hero-panel">
      <div>
        <div class="hero-kicker">Share Import</div>
        <h2>跟踪课表分享密钥的生成与导入链路。</h2>
        <p>小程序支持通过分享密钥复制他人课表，这里关注密钥是否仍然生效、谁在被分享，以及最近一次导入发生在什么时候。</p>
      </div>
      <div class="hero-side">
        <strong>{{ rows.length }} 条分享密钥</strong>
        <div class="muted-text">由设置页和导入页共同驱动</div>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-header">
        <div>
          <div class="panel-title">分享导入中心</div>
          <div class="panel-subtitle">用于排查“分享密钥无效”或“导入不到课程”的问题。</div>
        </div>
      </div>

      <div class="editorial-table">
        <el-table :data="rows" v-loading="loading">
          <el-table-column prop="share_key" label="分享密钥" min-width="160" />
          <el-table-column label="所属用户" min-width="160">
            <template #default="{ row }">
              <div>
                <div>{{ row.nickname || '未命名用户' }}</div>
                <div class="muted-text">{{ row.school || '未填写学校' }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="课程量" width="100">
            <template #default="{ row }">{{ row.course_count }}</template>
          </el-table-column>
          <el-table-column label="是否生效" width="100">
            <template #default="{ row }">
              <el-tag :type="row.is_active ? 'success' : 'info'">{{ row.is_active ? '启用' : '停用' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="最近导入" min-width="160">
            <template #default="{ row }">{{ formatDateTime(row.last_imported_at) }}</template>
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
import { shareApi } from '../api'
import { formatDateTime } from '../utils/format'

const rows = ref<any[]>([])
const loading = ref(true)

async function loadData() {
  loading.value = true
  try {
    const res = await shareApi.getList()
    rows.value = res.data
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>
