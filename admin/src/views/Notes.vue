<template>
  <div class="editorial-page">
    <section class="hero-panel">
      <div>
        <div class="section-kicker">Notes Moderation</div>
        <h2>后台直接查看已发布笔记内容，并对违规笔记执行下架或恢复。</h2>
        <p>
          这里展示的就是用户已经写入数据库的笔记正文。你可以按内容、昵称、学校检索，并对单条笔记进行违规处置。
        </p>
      </div>
      <div class="hero-side">
        <strong>{{ rows.length }}</strong>
        <div class="muted-text">条笔记记录</div>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-header">
        <div>
          <div class="panel-title">笔记审核列表</div>
          <div class="panel-subtitle">支持全文检索，并可单独封禁违规笔记内容。</div>
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
            <template #default="{ row }">{{ trimText(row.content, 110) }}</template>
          </el-table-column>
          <el-table-column label="图片" width="90">
            <template #default="{ row }">
              <el-tag :type="row.image_url ? 'success' : 'info'">{{ row.image_url ? '有图' : '纯文字' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'blocked' ? 'danger' : 'success'">
                {{ row.status === 'blocked' ? '已下架' : '正常' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="处置原因" min-width="180">
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

    <el-dialog v-model="previewVisible" title="笔记内容预览" width="640px">
      <div v-if="selectedNote" class="stack-grid">
        <div class="detail-item">
          <strong>发布者</strong>
          <span>{{ selectedNote.nickname || '未命名用户' }} / {{ selectedNote.school || '未填写学校' }}</span>
        </div>
        <div class="detail-item">
          <strong>内容</strong>
          <div class="note-preview">{{ selectedNote.content || '暂无内容' }}</div>
        </div>
        <div v-if="selectedNote.image_url" class="detail-item">
          <strong>图片 FileID</strong>
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

const rows = ref<any[]>([])
const loading = ref(true)
const keyword = ref('')
const previewVisible = ref(false)
const selectedNote = ref<any | null>(null)

async function loadData() {
  loading.value = true
  try {
    const res = await noteApi.getList({ keyword: keyword.value || undefined })
    rows.value = res.data
  } finally {
    loading.value = false
  }
}

function previewNote(row: any) {
  selectedNote.value = row
  previewVisible.value = true
}

async function moderate(row: any, status: 'visible' | 'blocked') {
  let reason = ''

  try {
    if (status === 'blocked') {
      const result = await ElMessageBox.prompt('请输入下架原因，用户侧会据此拦截违规内容。', '下架违规笔记', {
        confirmButtonText: '确认下架',
        cancelButtonText: '取消',
        inputPlaceholder: '例如：广告引流、辱骂内容、违规图片',
      })
      reason = result.value
    }

    await noteApi.moderate(row.id, { status, reason })
    ElMessage.success(status === 'blocked' ? '笔记已下架' : '笔记已恢复')
    await loadData()
  } catch (error: any) {
    if (error === 'cancel') return
  }
}

onMounted(loadData)
</script>
