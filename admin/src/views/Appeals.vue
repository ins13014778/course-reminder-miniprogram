<template>
  <div class="editorial-page">
    <section class="hero-panel">
      <div>
        <div class="section-kicker">Appeal Desk</div>
        <h2>集中处理账号、笔记、分享、头像、个性签名的用户申诉</h2>
        <p>
          审核通过后，系统会自动解除对应限制；审核驳回后，会把结果与备注同步到小程序通知中心和申诉中心。
        </p>
      </div>
      <div class="hero-side">
        <strong>{{ pendingCount }}</strong>
        <div class="muted-text">待处理申诉</div>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-header">
        <div>
          <div class="panel-title">申诉列表</div>
          <div class="panel-subtitle">支持按状态、类型和关键字筛选，优先处理仍在待审中的用户申诉。</div>
        </div>
        <div class="panel-toolbar">
          <el-select v-model="status" placeholder="全部状态" clearable style="width: 160px" @change="loadData">
            <el-option label="待处理" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已驳回" value="rejected" />
          </el-select>
          <el-select v-model="appealType" placeholder="全部类型" clearable style="width: 180px" @change="loadData">
            <el-option
              v-for="item in appealTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <el-input
            v-model="keyword"
            placeholder="搜索标题 / 内容 / 联系方式 / 用户"
            clearable
            style="width: 320px"
            @keyup.enter="loadData"
          />
          <el-button type="primary" @click="loadData">查询</el-button>
        </div>
      </div>

      <div class="editorial-table">
        <el-table :data="rows" v-loading="loading">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column label="用户" min-width="160">
            <template #default="{ row }">
              <div>
                <div>{{ row.nickname || '未命名用户' }}</div>
                <div class="muted-text">{{ row.school || '未填写学校' }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="申诉类型" width="128">
            <template #default="{ row }">
              <el-tag>{{ appealTypeLabel(row.appeal_type) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="标题" min-width="180" />
          <el-table-column label="申诉内容" min-width="260">
            <template #default="{ row }">{{ trimText(row.content, 100) }}</template>
          </el-table-column>
          <el-table-column label="限制原因" min-width="180">
            <template #default="{ row }">{{ row.restriction_reason || '-' }}</template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="提交时间" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <div class="toolbar-actions">
                <el-button size="small" @click="previewRow(row)">查看</el-button>
                <el-button size="small" type="primary" plain :disabled="row.status !== 'pending'" @click="reviewRow(row)">
                  审核
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>

    <el-dialog v-model="previewVisible" title="申诉详情" width="760px">
      <div v-if="selectedRow" class="stack-grid">
        <div class="detail-item">
          <strong>申诉标题</strong>
          <span>{{ selectedRow.title }}</span>
        </div>
        <div class="detail-item">
          <strong>申诉类型</strong>
          <span>{{ appealTypeLabel(selectedRow.appeal_type) }}</span>
        </div>
        <div class="detail-item">
          <strong>申诉内容</strong>
          <div class="note-preview">{{ selectedRow.content }}</div>
        </div>
        <div class="detail-item">
          <strong>联系方式</strong>
          <span>{{ selectedRow.contact || '-' }}</span>
        </div>
        <div class="detail-item">
          <strong>限制原因</strong>
          <span>{{ selectedRow.restriction_reason || '-' }}</span>
        </div>
        <div class="detail-item">
          <strong>限制截止</strong>
          <span>{{ formatDateTime(selectedRow.restriction_expires_at) }}</span>
        </div>
        <div class="detail-item">
          <strong>当前状态</strong>
          <span>{{ statusLabel(selectedRow.status) }}</span>
        </div>
        <div v-if="selectedRow.admin_note" class="detail-item">
          <strong>后台备注</strong>
          <span>{{ selectedRow.admin_note }}</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { appealApi } from '../api'
import { formatDateTime, trimText } from '../utils/format'

const appealTypeOptions = [
  { label: '账号申诉', value: 'account' },
  { label: '笔记申诉', value: 'note' },
  { label: '分享申诉', value: 'share' },
  { label: '头像申诉', value: 'avatar' },
  { label: '个签申诉', value: 'signature' },
]

const appealTypeMap = appealTypeOptions.reduce<Record<string, string>>((map, item) => {
  map[item.value] = item.label
  return map
}, {})

const rows = ref<any[]>([])
const loading = ref(true)
const keyword = ref('')
const status = ref('')
const appealType = ref('')
const previewVisible = ref(false)
const selectedRow = ref<any | null>(null)

const pendingCount = computed(() => rows.value.filter((item) => item.status === 'pending').length)

async function loadData() {
  loading.value = true
  try {
    const res = await appealApi.getList({
      keyword: keyword.value || undefined,
      status: status.value || undefined,
      appealType: appealType.value || undefined,
    })
    rows.value = res.data || []
  } finally {
    loading.value = false
  }
}

function previewRow(row: any) {
  selectedRow.value = row
  previewVisible.value = true
}

function appealTypeLabel(value: string) {
  return appealTypeMap[value] || '未知类型'
}

function statusLabel(value: string) {
  if (value === 'approved') return '已通过'
  if (value === 'rejected') return '已驳回'
  return '待处理'
}

function statusType(value: string) {
  if (value === 'approved') return 'success'
  if (value === 'rejected') return 'danger'
  return 'warning'
}

async function reviewRow(row: any) {
  try {
    const statusResult = await ElMessageBox.prompt(
      '输入审核结果：approved 表示通过并自动解除对应限制，rejected 表示驳回并保留当前限制。',
      '处理申诉',
      {
        confirmButtonText: '下一步',
        cancelButtonText: '取消',
        inputPlaceholder: 'approved / rejected',
        inputValue: 'approved',
      },
    )

    const nextStatus = String(statusResult.value || '').trim().toLowerCase()
    if (!['approved', 'rejected'].includes(nextStatus)) {
      ElMessage.warning('请输入 approved 或 rejected')
      return
    }

    const noteResult = await ElMessageBox.prompt('可填写处理备注，用户会在通知中心看到这条备注。', '后台备注', {
      confirmButtonText: '确认提交',
      cancelButtonText: '取消',
      inputPlaceholder: '例如：已核实情况，现解除限制',
      inputValue: row.admin_note || '',
    })

    await appealApi.review(row.id, {
      status: nextStatus,
      adminNote: noteResult.value,
    })

    ElMessage.success('申诉状态已更新')
    await loadData()
  } catch (error: any) {
    if (error === 'cancel') return
  }
}

onMounted(loadData)
</script>
