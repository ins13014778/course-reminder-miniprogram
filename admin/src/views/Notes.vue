<template>
  <div class="editorial-page">
    <section class="hero-panel">
      <div>
        <div class="section-kicker">Notes Moderation</div>
        <h2>支持单条和批量下架笔记，并保留图片预览与处理原因。</h2>
        <p>后台可以直接查看用户已发布笔记的正文和图片，适合处理违规笔记、申诉复核和批量审核。</p>
      </div>
      <div class="hero-side">
        <strong>{{ rows.length }}</strong>
        <div class="muted-text">当前笔记记录</div>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-header">
        <div>
          <div class="panel-title">笔记审核列表</div>
          <div class="panel-subtitle">支持全文搜索、批量下架、批量恢复。</div>
        </div>
        <div class="panel-toolbar">
          <el-input
            v-model="keyword"
            placeholder="搜索内容 / 昵称 / 学校"
            clearable
            style="width: 300px"
            @keyup.enter="loadData"
          />
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button :disabled="!selectedIds.length" @click="runBatchModeration('blocked')">批量下架</el-button>
          <el-button :disabled="!selectedIds.length" @click="runBatchModeration('visible')">批量恢复</el-button>
        </div>
      </div>

      <div class="muted-text" style="margin-bottom: 12px">已选择 {{ selectedIds.length }} 条笔记</div>

      <div class="editorial-table">
        <el-table :data="rows" v-loading="loading" @selection-change="onSelectionChange">
          <el-table-column type="selection" width="52" />
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
            <template #default="{ row }">{{ trimText(row.content, 110) }}</template>
          </el-table-column>
          <el-table-column label="图片" width="90">
            <template #default="{ row }">
              <el-tag :type="row.previewImageUrl ? 'success' : 'info'">
                {{ row.previewImageUrl ? '有图' : '纯文字' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'blocked' ? 'danger' : 'success'">
                {{ row.status === 'blocked' ? '已下架' : '正常' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="处理原因" min-width="180">
            <template #default="{ row }">{{ row.moderation_reason || '-' }}</template>
          </el-table-column>
          <el-table-column label="更新时间" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.updated_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="240" fixed="right">
            <template #default="{ row }">
              <div class="toolbar-actions">
                <el-button size="small" @click="previewNote(row)">查看全文</el-button>
                <el-button
                  v-if="row.status !== 'blocked'"
                  type="danger"
                  plain
                  size="small"
                  @click="moderate(row, 'blocked')"
                >
                  下架
                </el-button>
                <el-button
                  v-else
                  type="success"
                  plain
                  size="small"
                  @click="moderate(row, 'visible')"
                >
                  恢复
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>

    <el-dialog v-model="previewVisible" title="笔记内容预览" width="720px">
      <div v-if="selectedNote" class="stack-grid">
        <div class="detail-item">
          <strong>发布者</strong>
          <span>{{ selectedNote.nickname || '未命名用户' }} / {{ selectedNote.school || '未填写学校' }}</span>
        </div>
        <div class="detail-item">
          <strong>内容</strong>
          <div class="note-preview">{{ selectedNote.content || '暂无内容' }}</div>
        </div>
        <div v-if="selectedNote.previewImageUrl" class="detail-item">
          <strong>笔记图片</strong>
          <el-image
            class="note-image"
            :src="selectedNote.previewImageUrl"
            :preview-src-list="[selectedNote.previewImageUrl]"
            preview-teleported
            fit="cover"
          />
        </div>
        <div v-if="selectedNote.image_url" class="detail-item">
          <strong>原始 FileID</strong>
          <span>{{ selectedNote.image_url }}</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { noteApi } from '../api'
import { formatDateTime, trimText } from '../utils/format'
import { resolveCloudFileUrl } from '../utils/cloud'
import { resolveHighRiskConfirmation } from '../utils/high-risk'

const rows = ref<any[]>([])
const loading = ref(true)
const keyword = ref('')
const previewVisible = ref(false)
const selectedNote = ref<any | null>(null)
const selectedIds = ref<number[]>([])

function normalizeRow(row: any) {
  return {
    ...row,
    previewImageUrl: resolveCloudFileUrl(row.image_url),
  }
}

function onSelectionChange(selection: any[]) {
  selectedIds.value = selection.map((item) => Number(item.id))
}

async function loadData() {
  loading.value = true
  try {
    const res = await noteApi.getList({ keyword: keyword.value || undefined })
    rows.value = (res.data || []).map(normalizeRow)
  } finally {
    loading.value = false
  }
}

function previewNote(row: any) {
  selectedNote.value = normalizeRow(row)
  previewVisible.value = true
}

async function buildReason(status: 'visible' | 'blocked', initialValue = '') {
  if (status !== 'blocked') {
    return ''
  }

  const result = await ElMessageBox.prompt(
    '请输入下架原因，用户端和运营复核会看到这条说明。',
    '下架违规笔记',
    {
      confirmButtonText: '确认下架',
      cancelButtonText: '取消',
      inputPlaceholder: '例如：广告引流、违规图片、辱骂攻击',
      inputValue: initialValue,
    },
  )

  return String(result.value || '').trim()
}

async function moderate(row: any, status: 'visible' | 'blocked') {
  try {
    const reason = await buildReason(status, row.moderation_reason || '')
    const extraConfirmation =
      status === 'blocked'
        ? await resolveHighRiskConfirmation({
            actionKey: 'note.moderate',
            targetType: 'note',
            targetIds: [row.id],
            summary: 'block note',
          })
        : {}

    await noteApi.moderate(row.id, { status, reason, ...extraConfirmation })
    ElMessage.success(status === 'blocked' ? '笔记已下架' : '笔记已恢复')
    await loadData()
  } catch (error: any) {
    if (error === 'cancel') return
  }
}

async function runBatchModeration(status: 'visible' | 'blocked') {
  if (!selectedIds.value.length) {
    ElMessage.warning('请先选择笔记')
    return
  }

  try {
    const reason = await buildReason(status)
    const extraConfirmation =
      status === 'blocked'
        ? await resolveHighRiskConfirmation({
            actionKey: 'note.moderate.batch',
            targetType: 'note',
            targetIds: selectedIds.value,
            summary: 'batch block notes',
          })
        : {}

    await noteApi.batchModerate({
      ids: selectedIds.value,
      status,
      reason,
      ...extraConfirmation,
    })

    ElMessage.success(status === 'blocked' ? '批量下架完成' : '批量恢复完成')
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
