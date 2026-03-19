<template>
  <div class="editorial-page">
    <section class="hero-panel">
      <div>
        <div class="section-kicker">Reports Moderation</div>
        <h2>审核用户对分享笔记的举报，并可同步执行下架原笔记或封禁分享链接。</h2>
        <p>举报通过后可以只封禁分享，也可以直接把原笔记一起下架，方便你按违规程度处理。</p>
      </div>
      <div class="hero-side">
        <strong>{{ pendingCount }}</strong>
        <div class="muted-text">待审核举报</div>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-header">
        <div>
          <div class="panel-title">举报列表</div>
          <div class="panel-subtitle">支持按状态和关键词过滤，优先处理未审核内容。</div>
        </div>
        <div class="panel-toolbar">
          <el-select v-model="status" placeholder="全部状态" clearable style="width: 180px" @change="loadData">
            <el-option label="待审核" value="pending" />
            <el-option label="已通过" value="resolved" />
            <el-option label="已驳回" value="rejected" />
          </el-select>
          <el-input
            v-model="keyword"
            placeholder="搜索举报原因 / 用户 / 内容"
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
          <el-table-column label="举报人" min-width="160">
            <template #default="{ row }">
              <div>
                <div>{{ row.reporter_nickname || '匿名用户' }}</div>
                <div class="muted-text">{{ row.reporter_school || '未填写学校' }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="被举报人" min-width="160">
            <template #default="{ row }">
              <div>
                <div>{{ row.reported_nickname || '未知' }}</div>
                <div class="muted-text">{{ row.reported_school || '未填写学校' }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="原因" min-width="160">
            <template #default="{ row }">{{ row.reason }}</template>
          </el-table-column>
          <el-table-column label="补充说明" min-width="220">
            <template #default="{ row }">{{ trimText(row.description, 90) }}</template>
          </el-table-column>
          <el-table-column label="目标" min-width="220">
            <template #default="{ row }">
              <div>{{ row.target_type === 'note_share' ? `分享 ${row.share_code || '-'}` : `笔记 #${row.note_id || row.target_id}` }}</div>
              <div class="muted-text">{{ trimText(row.note_content, 50) }}</div>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="statusType(row.status)">{{ statusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="处理动作" width="120">
            <template #default="{ row }">{{ actionLabel(row.action_taken) }}</template>
          </el-table-column>
          <el-table-column label="提交时间" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <div class="toolbar-actions">
                <el-button size="small" @click="previewRow(row)">查看</el-button>
                <el-button
                  v-if="row.status === 'pending'"
                  type="primary"
                  plain
                  size="small"
                  @click="reviewRow(row)"
                >
                  审核
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>

    <el-dialog v-model="previewVisible" title="举报详情" width="720px">
      <div v-if="selectedRow" class="stack-grid">
        <div class="detail-item">
          <strong>举报原因</strong>
          <span>{{ selectedRow.reason }}</span>
        </div>
        <div class="detail-item">
          <strong>补充说明</strong>
          <span>{{ selectedRow.description || '-' }}</span>
        </div>
        <div class="detail-item">
          <strong>目标内容</strong>
          <div class="note-preview">{{ selectedRow.note_content || '暂无内容' }}</div>
        </div>
        <div v-if="selectedRow.previewImageUrl" class="detail-item">
          <strong>目标图片</strong>
          <el-image
            class="note-image"
            :src="selectedRow.previewImageUrl"
            :preview-src-list="[selectedRow.previewImageUrl]"
            preview-teleported
            fit="cover"
          />
          <div class="muted-text">点击图片可放大查看</div>
        </div>
        <div class="detail-item">
          <strong>当前状态</strong>
          <span>{{ statusLabel(selectedRow.status) }} / {{ actionLabel(selectedRow.action_taken) }}</span>
        </div>
        <div v-if="selectedRow.review_note" class="detail-item">
          <strong>审核备注</strong>
          <span>{{ selectedRow.review_note }}</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { reportApi } from '../api'
import { formatDateTime, trimText } from '../utils/format'
import { resolveCloudFileUrl } from '../utils/cloud'

const rows = ref<any[]>([])
const loading = ref(true)
const keyword = ref('')
const status = ref('')
const previewVisible = ref(false)
const selectedRow = ref<any | null>(null)

const pendingCount = computed(() => rows.value.filter((item) => item.status === 'pending').length)

function normalizeRow(row: any) {
  return {
    ...row,
    previewImageUrl: resolveCloudFileUrl(row.note_image_url),
  }
}

async function loadData() {
  loading.value = true
  try {
    const res = await reportApi.getList({
      keyword: keyword.value || undefined,
      status: status.value || undefined,
    })
    rows.value = (res.data || []).map(normalizeRow)
  } finally {
    loading.value = false
  }
}

function previewRow(row: any) {
  selectedRow.value = normalizeRow(row)
  previewVisible.value = true
}

function statusLabel(value: string) {
  if (value === 'resolved') return '已通过'
  if (value === 'rejected') return '已驳回'
  return '待审核'
}

function statusType(value: string) {
  if (value === 'resolved') return 'success'
  if (value === 'rejected') return 'info'
  return 'warning'
}

function actionLabel(value: string) {
  if (value === 'block_note') return '下架笔记'
  if (value === 'block_share') return '封禁分享'
  return '无'
}

async function reviewRow(row: any) {
  try {
    const statusResult = await ElMessageBox.prompt(
      '输入处理方式：pass 表示举报成立，reject 表示驳回。成立后可在下一步选择是否下架笔记或封禁分享。',
      '审核举报',
      {
        confirmButtonText: '下一步',
        cancelButtonText: '取消',
        inputPlaceholder: 'pass / reject',
      },
    )

    const decision = String(statusResult.value || '').trim().toLowerCase()
    if (!['pass', 'reject'].includes(decision)) {
      ElMessage.warning('请输入 pass 或 reject')
      return
    }

    let finalStatus: 'resolved' | 'rejected' = decision === 'pass' ? 'resolved' : 'rejected'
    let action: 'none' | 'block_note' | 'block_share' = 'none'

    if (finalStatus === 'resolved') {
      const actionResult = await ElMessageBox.prompt(
        '输入处置动作：share 表示只封禁分享，note 表示下架原笔记，none 表示仅记录举报。',
        '选择处置动作',
        {
          confirmButtonText: '继续',
          cancelButtonText: '取消',
          inputPlaceholder: 'share / note / none',
        },
      )

      const actionInput = String(actionResult.value || '').trim().toLowerCase()
      if (actionInput === 'share') action = 'block_share'
      else if (actionInput === 'note') action = 'block_note'
      else action = 'none'
    }

    const noteResult = await ElMessageBox.prompt(
      '可填写审核备注，用户或运营回溯时会展示。',
      '审核备注',
      {
        confirmButtonText: '确认提交',
        cancelButtonText: '取消',
        inputPlaceholder: '例如：确认违规引流，已下架原笔记',
        inputValue: row.reason,
      },
    )

    await reportApi.review(row.id, {
      status: finalStatus,
      action,
      reviewNote: noteResult.value,
    })

    ElMessage.success('举报已处理')
    await loadData()
  } catch (error: any) {
    if (error === 'cancel') return
  }
}

onMounted(loadData)
</script>

<style scoped>
.note-image {
  width: 100%;
  max-height: 360px;
  border-radius: 18px;
  border: 1px solid var(--line-soft);
}
</style>
