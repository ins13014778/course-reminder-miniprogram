<template>
  <div class="editorial-page">
    <section class="hero-panel">
      <div>
        <div class="section-kicker">Share Key Control</div>
        <h2>支持单条和批量停用课表分享密钥。</h2>
        <p>如果发现某个课表分享密钥被滥用，可以在这里单独处理，也可以批量停用或恢复。</p>
      </div>
      <div class="hero-side">
        <strong>{{ rows.length }}</strong>
        <div class="muted-text">分享密钥</div>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-header">
        <div>
          <div class="panel-title">分享密钥中心</div>
          <div class="panel-subtitle">展示归属用户、最近导入时间、状态和禁用原因。</div>
        </div>
        <div class="panel-toolbar">
          <el-button :disabled="!selectedIds.length" @click="runBatch('blocked')">批量禁用</el-button>
          <el-button :disabled="!selectedIds.length" @click="runBatch('active')">批量恢复</el-button>
        </div>
      </div>

      <div class="muted-text" style="margin-bottom: 12px">已选择 {{ selectedIds.length }} 个密钥</div>

      <div class="editorial-table">
        <el-table :data="rows" v-loading="loading" @selection-change="onSelectionChange">
          <el-table-column type="selection" width="52" />
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
                  @click="updateStatus([row.id], 'blocked')"
                >
                  禁用密钥
                </el-button>
                <el-button
                  v-else
                  type="success"
                  plain
                  size="small"
                  @click="updateStatus([row.id], 'active')"
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
import { resolveHighRiskConfirmation } from '../utils/high-risk'

const rows = ref<any[]>([])
const loading = ref(true)
const selectedIds = ref<number[]>([])

function onSelectionChange(selection: any[]) {
  selectedIds.value = selection.map((item) => Number(item.id))
}

async function loadData() {
  loading.value = true
  try {
    const res = await shareApi.getList()
    rows.value = res.data || []
  } finally {
    loading.value = false
  }
}

async function askReason(status: 'active' | 'blocked') {
  if (status !== 'blocked') {
    return ''
  }

  const result = await ElMessageBox.prompt('请输入禁用原因。', '禁用分享密钥', {
    confirmButtonText: '确认禁用',
    cancelButtonText: '取消',
    inputPlaceholder: '例如：违规传播、异常导入、批量滥用',
  })
  return String(result.value || '').trim()
}

async function updateStatus(ids: number[], status: 'active' | 'blocked') {
  try {
    const reason = await askReason(status)
    const extraConfirmation =
      status === 'blocked'
        ? await resolveHighRiskConfirmation({
            actionKey: ids.length > 1 ? 'share_key.status.batch' : 'share_key.status.update',
            targetType: 'share_key',
            targetIds: ids,
            summary: 'block share keys',
          })
        : {}

    if (ids.length > 1) {
      await shareApi.batchUpdateStatus({ ids, status, reason, ...extraConfirmation })
    } else {
      await shareApi.updateStatus(ids[0], { status, reason, ...extraConfirmation })
    }

    ElMessage.success(status === 'blocked' ? '分享密钥已禁用' : '分享密钥已恢复')
    await loadData()
  } catch (error: any) {
    if (error === 'cancel') return
  }
}

async function runBatch(status: 'active' | 'blocked') {
  if (!selectedIds.value.length) {
    ElMessage.warning('请先选择密钥')
    return
  }

  await updateStatus(selectedIds.value, status)
}

onMounted(loadData)
</script>
