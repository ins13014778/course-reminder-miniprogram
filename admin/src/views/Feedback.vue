<template>
  <div class="editorial-page">
    <section class="hero-panel">
      <div>
        <div class="section-kicker">Feedback Inbox</div>
        <h2>集中查看用户提交的建议、功能诉求与问题反馈，避免真正有价值的意见被埋掉。</h2>
        <p>这里展示的是已登录用户从小程序提交的留言反馈。你可以筛选、查看详情，并标记为已处理或归档。</p>
      </div>
      <div class="hero-side">
        <strong>{{ pendingCount }}</strong>
        <div class="muted-text">待处理反馈</div>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-header">
        <div>
          <div class="panel-title">反馈列表</div>
          <div class="panel-subtitle">按状态、分类和关键词筛选，快速定位有价值的问题与建议。</div>
        </div>
        <div class="panel-toolbar">
          <el-select v-model="status" placeholder="全部状态" clearable style="width: 160px" @change="loadData">
            <el-option label="待处理" value="pending" />
            <el-option label="已处理" value="reviewed" />
            <el-option label="已归档" value="archived" />
          </el-select>
          <el-select v-model="category" placeholder="全部分类" clearable style="width: 180px" @change="loadData">
            <el-option label="功能建议" value="feature" />
            <el-option label="体验优化" value="ux" />
            <el-option label="问题反馈" value="bug" />
            <el-option label="其他" value="other" />
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
          <el-table-column label="分类" width="120">
            <template #default="{ row }">
              <el-tag>{{ categoryLabel(row.category) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="标题" min-width="180" />
          <el-table-column label="内容" min-width="260">
            <template #default="{ row }">{{ trimText(row.content, 100) }}</template>
          </el-table-column>
          <el-table-column prop="contact" label="联系方式" min-width="180" />
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
                <el-button size="small" type="primary" plain @click="reviewRow(row)">处理</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>

    <el-dialog v-model="previewVisible" title="反馈详情" width="760px">
      <div v-if="selectedRow" class="stack-grid">
        <div class="detail-item">
          <strong>反馈标题</strong>
          <span>{{ selectedRow.title }}</span>
        </div>
        <div class="detail-item">
          <strong>反馈分类</strong>
          <span>{{ categoryLabel(selectedRow.category) }}</span>
        </div>
        <div class="detail-item">
          <strong>反馈内容</strong>
          <div class="note-preview">{{ selectedRow.content }}</div>
        </div>
        <div class="detail-item">
          <strong>联系方式</strong>
          <span>{{ selectedRow.contact || '-' }}</span>
        </div>
        <div class="detail-item">
          <strong>用户信息</strong>
          <span>{{ selectedRow.nickname || '未命名用户' }} / {{ selectedRow.school || '未填写学校' }}</span>
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
import { feedbackApi } from '../api'
import { formatDateTime, trimText } from '../utils/format'

const rows = ref<any[]>([])
const loading = ref(true)
const keyword = ref('')
const status = ref('')
const category = ref('')
const previewVisible = ref(false)
const selectedRow = ref<any | null>(null)

const pendingCount = computed(() => rows.value.filter((item) => item.status === 'pending').length)

async function loadData() {
  loading.value = true
  try {
    const res = await feedbackApi.getList({
      keyword: keyword.value || undefined,
      status: status.value || undefined,
      category: category.value || undefined,
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

function categoryLabel(value: string) {
  if (value === 'feature') return '功能建议'
  if (value === 'ux') return '体验优化'
  if (value === 'bug') return '问题反馈'
  return '其他'
}

function statusLabel(value: string) {
  if (value === 'reviewed') return '已处理'
  if (value === 'archived') return '已归档'
  return '待处理'
}

function statusType(value: string) {
  if (value === 'reviewed') return 'success'
  if (value === 'archived') return 'info'
  return 'warning'
}

async function reviewRow(row: any) {
  try {
    const statusResult = await ElMessageBox.prompt(
      '输入处理状态：reviewed 表示已处理，archived 表示归档，pending 表示重新标记回待处理。',
      '处理反馈',
      {
        confirmButtonText: '下一步',
        cancelButtonText: '取消',
        inputPlaceholder: 'reviewed / archived / pending',
        inputValue: row.status || 'reviewed',
      },
    )

    const nextStatus = String(statusResult.value || '').trim().toLowerCase()
    if (!['pending', 'reviewed', 'archived'].includes(nextStatus)) {
      ElMessage.warning('请输入 reviewed、archived 或 pending')
      return
    }

    const noteResult = await ElMessageBox.prompt(
      '可填写后台处理备注，方便后续回看这个反馈是如何处理的。',
      '后台备注',
      {
        confirmButtonText: '确认提交',
        cancelButtonText: '取消',
        inputPlaceholder: '例如：已纳入下个版本计划 / 已确认是使用问题',
        inputValue: row.admin_note || '',
      },
    )

    await feedbackApi.review(row.id, {
      status: nextStatus,
      adminNote: noteResult.value,
    })

    ElMessage.success('反馈状态已更新')
    await loadData()
  } catch (error: any) {
    if (error === 'cancel') return
  }
}

onMounted(loadData)
</script>
