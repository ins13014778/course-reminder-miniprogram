<template>
  <div class="editorial-page">
    <section class="hero-panel">
      <div>
        <div class="section-kicker">Audit Logs</div>
        <h2>所有关键后台操作都留痕，后续查封禁、审核、账号变更都能回溯到具体管理员。</h2>
        <p>这里记录管理员登录、权限调整、反馈处理等关键动作，超级管理员专用。</p>
      </div>
      <div class="hero-side">
        <strong>{{ rows.length }}</strong>
        <div class="muted-text">条审计记录</div>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-header">
        <div>
          <div class="panel-title">审计日志</div>
          <div class="panel-subtitle">支持按管理员、摘要、目标对象或动作代码检索。</div>
        </div>
        <div class="panel-toolbar">
          <el-input v-model="action" placeholder="动作代码，如 report.review" clearable style="width: 220px" @keyup.enter="loadData" />
          <el-input v-model="keyword" placeholder="搜索管理员 / 摘要 / 目标" clearable style="width: 320px" @keyup.enter="loadData" />
          <el-button type="primary" @click="loadData">查询</el-button>
        </div>
      </div>

      <div class="editorial-table">
        <el-table :data="rows" v-loading="loading">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column label="管理员" min-width="180">
            <template #default="{ row }">
              <div>
                <div>{{ row.admin_name || row.admin_email || '-' }}</div>
                <div class="muted-text">{{ row.admin_email || '-' }} / {{ row.admin_role || '-' }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="action" label="动作" min-width="170" />
          <el-table-column prop="summary" label="摘要" min-width="260" />
          <el-table-column label="目标" min-width="170">
            <template #default="{ row }">{{ row.target_type || '-' }} / {{ row.target_id || '-' }}</template>
          </el-table-column>
          <el-table-column prop="ip_address" label="IP" min-width="140" />
          <el-table-column label="时间" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
          </el-table-column>
        </el-table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { auditLogApi } from '../api'
import { formatDateTime } from '../utils/format'

const rows = ref<any[]>([])
const loading = ref(true)
const keyword = ref('')
const action = ref('')

async function loadData() {
  loading.value = true
  try {
    const res = await auditLogApi.getList({
      keyword: keyword.value || undefined,
      action: action.value || undefined,
    })
    rows.value = res.data || []
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>
