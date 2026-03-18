<template>
  <div class="editorial-page">
    <section class="hero-panel">
      <div>
        <div class="section-kicker">Share Key Control</div>
        <h2>后台可以直接禁用或恢复分享密钥，并看到密钥最近是否被导入使用。</h2>
        <p>
          如果你发现某个密钥被滥用，既可以在用户页封禁用户的密钥权限，也可以在这里单独停用某一个密钥。
        </p>
      </div>
      <div class="hero-side">
        <strong>{{ rows.length }}</strong>
        <div class="muted-text">个分享密钥</div>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-header">
        <div>
          <div class="panel-title">分享密钥中心</div>
          <div class="panel-subtitle">可查看归属用户、最近导入时间、状态与禁用原因。</div>
        </div>
      </div>

      <div class="editorial-table">
        <el-table :data="rows" v-loading="loading">
          <el-table-column prop="share_key" label="密钥" min-width="150" />
          <el-table-column label="所属用户" min-width="170">
            <template #default="{ row }">
              <div>
                <div>{{ row.nickname || '未命名用户' }}</div>
                <div class="muted-text">{{ row.school || '未填写学校' }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="课表数量" width="100">
            <template #default="{ row }">{{ row.course_count }}</template>
          </el-table-column>
          <el-table-column label="密钥状态" width="110">
            <template #default="{ row }">
              <el-tag :type="row.status === 'blocked' ? 'danger' : 'success'">
                {{ row.status === 'blocked' ? '已停用' : '正常' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="用户权限" width="110">
            <template #default="{ row }">
              <el-tag :type="row.owner_share_status === 'banned' ? 'warning' : 'success'">
                {{ row.owner_share_status === 'banned' ? '用户受限' : '正常' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="最近导入" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.last_imported_at) }}</template>
          </el-table-column>
          <el-table-column label="禁用原因" min-width="180">
            <template #default="{ row }">{{ row.ban_reason || '-' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <div class="toolbar-actions">
                <el-button
                  v-if="row.status !== 'blocked'"
                  type="danger"
                  plain
                  size="small"
                  @click="updateStatus(row, 'blocked')"
                >
                  禁用密钥
                </el-button>
                <el-button
                  v-else
                  type="success"
                  plain
                  size="small"
                  @click="updateStatus(row, 'active')"
                >
                  恢复密钥
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
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

async function updateStatus(row: any, status: 'active' | 'blocked') {
  let reason = ''

  try {
    if (status === 'blocked') {
      const result = await ElMessageBox.prompt('请输入禁用原因，后续查账和排查会用到。', '禁用分享密钥', {
        confirmButtonText: '确认禁用',
        cancelButtonText: '取消',
        inputPlaceholder: '例如：违规传播、异常导入、用户投诉',
      })
      reason = result.value
    }

    await shareApi.updateStatus(row.id, { status, reason })
    ElMessage.success(status === 'blocked' ? '分享密钥已禁用' : '分享密钥已恢复')
    await loadData()
  } catch (error: any) {
    if (error === 'cancel') return
  }
}

onMounted(loadData)
</script>
