<template>
  <div class="editorial-page">
    <section class="hero-panel">
      <div>
        <div class="section-kicker">Note Sharing</div>
        <h2>集中查看笔记分享链接、分享状态和浏览情况，支持直接封禁违规分享。</h2>
        <p>如果某条分享内容违规，可以在这里直接停用分享链接，不影响原笔记继续留存待审。</p>
      </div>
      <div class="hero-side">
        <strong>{{ rows.length }}</strong>
        <div class="muted-text">条分享记录</div>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-header">
        <div>
          <div class="panel-title">分享记录</div>
          <div class="panel-subtitle">支持按分享码、发布者昵称和笔记正文关键词检索。</div>
        </div>
        <div class="panel-toolbar">
          <el-input
            v-model="keyword"
            placeholder="搜索分享码 / 发布者 / 笔记内容"
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
          <el-table-column label="分享码" min-width="180">
            <template #default="{ row }">{{ row.share_code }}</template>
          </el-table-column>
          <el-table-column label="发布者" min-width="160">
            <template #default="{ row }">
              <div>
                <div>{{ row.nickname || '未命名用户' }}</div>
                <div class="muted-text">{{ row.school || '未填写学校' }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="笔记内容" min-width="320">
            <template #default="{ row }">{{ trimText(row.content, 120) }}</template>
          </el-table-column>
          <el-table-column label="浏览" width="90">
            <template #default="{ row }">{{ row.view_count || 0 }}</template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="row.status === 'blocked' ? 'danger' : 'success'">
                {{ row.status === 'blocked' ? '已封禁' : '正常' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="最近访问" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.last_viewed_at) }}</template>
          </el-table-column>
          <el-table-column label="封禁原因" min-width="180">
            <template #default="{ row }">{{ row.ban_reason || '-' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="240" fixed="right">
            <template #default="{ row }">
              <div class="toolbar-actions">
                <el-button size="small" @click="previewRow(row)">查看内容</el-button>
                <el-button
                  v-if="row.status !== 'blocked'"
                  type="danger"
                  plain
                  size="small"
                  @click="updateStatus(row, 'blocked')"
                >
                  封禁分享
                </el-button>
                <el-button
                  v-else
                  type="success"
                  plain
                  size="small"
                  @click="updateStatus(row, 'active')"
                >
                  恢复分享
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>

    <el-dialog v-model="previewVisible" title="分享详情" width="720px">
      <div v-if="selectedRow" class="stack-grid">
        <div class="detail-item">
          <strong>分享码</strong>
          <span>{{ selectedRow.share_code }}</span>
        </div>
        <div class="detail-item">
          <strong>发布者</strong>
          <span>{{ selectedRow.nickname || '未命名用户' }} / {{ selectedRow.school || '未填写学校' }}</span>
        </div>
        <div class="detail-item">
          <strong>分享内容</strong>
          <div class="note-preview">{{ selectedRow.content || '暂无内容' }}</div>
        </div>
        <div v-if="selectedRow.previewImageUrl" class="detail-item">
          <strong>分享图片</strong>
          <el-image
            class="note-image"
            :src="selectedRow.previewImageUrl"
            :preview-src-list="[selectedRow.previewImageUrl]"
            preview-teleported
            fit="cover"
          />
          <div class="muted-text">点击图片可放大查看</div>
        </div>
        <div v-if="selectedRow.image_url" class="detail-item">
          <strong>原始 FileID</strong>
          <span>{{ selectedRow.image_url }}</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { noteShareApi } from '../api'
import { formatDateTime, trimText } from '../utils/format'
import { resolveCloudFileUrl } from '../utils/cloud'

const rows = ref<any[]>([])
const loading = ref(true)
const keyword = ref('')
const previewVisible = ref(false)
const selectedRow = ref<any | null>(null)

function normalizeRow(row: any) {
  return {
    ...row,
    previewImageUrl: resolveCloudFileUrl(row.image_url),
  }
}

async function loadData() {
  loading.value = true
  try {
    const res = await noteShareApi.getList({ keyword: keyword.value || undefined })
    rows.value = (res.data || []).map(normalizeRow)
  } finally {
    loading.value = false
  }
}

function previewRow(row: any) {
  selectedRow.value = normalizeRow(row)
  previewVisible.value = true
}

async function updateStatus(row: any, status: 'active' | 'blocked') {
  let reason = ''

  try {
    if (status === 'blocked') {
      const result = await ElMessageBox.prompt(
        '请输入封禁分享原因，用户打开分享页时会被拦截。',
        '封禁笔记分享',
        {
          confirmButtonText: '确认封禁',
          cancelButtonText: '取消',
          inputPlaceholder: '例如：违规引流、内容不当、用户举报',
        },
      )
      reason = result.value
    }

    await noteShareApi.updateStatus(row.id, { status, reason })
    ElMessage.success(status === 'blocked' ? '分享已封禁' : '分享已恢复')
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
