<template>
  <div class="editorial-page">
    <section class="hero-panel">
      <div>
        <div class="hero-kicker">Announcement Studio</div>
        <h2>把首页公告做成真正可运营的内容位，而不是只能覆盖一条文本。</h2>
        <p>后台现在可以新建、编辑、发布和删除公告。小程序首页只读取已发布公告，并优先展示置顶内容。</p>
      </div>
      <div class="hero-side">
        <strong>{{ publishedCount }} 条已发布</strong>
        <div class="muted-text">当前共 {{ announcements.length }} 条公告记录</div>
      </div>
    </section>

    <section class="split-grid announcements-grid">
      <div class="panel-card list-panel" v-loading="loading">
        <div class="panel-header">
          <div>
            <div class="panel-title">公告列表</div>
            <div class="panel-subtitle">选择历史公告继续编辑，或新建一条新的发布内容。</div>
          </div>
          <el-button type="primary" @click="startCreate">新建公告</el-button>
        </div>

        <div v-if="announcements.length" class="announcement-list">
          <button
            v-for="item in announcements"
            :key="item.id"
            type="button"
            class="announcement-item"
            :class="{ active: selectedId === item.id }"
            @click="selectAnnouncement(item)"
          >
            <div class="announcement-item-top">
              <div class="announcement-item-title">{{ item.title || '未命名公告' }}</div>
              <div class="announcement-item-tags">
                <span class="status-pill" :class="statusClass(item.status)">{{ statusLabel(item.status) }}</span>
                <span v-if="item.isPinned" class="pin-pill">置顶</span>
              </div>
            </div>

            <div class="announcement-item-content">{{ item.content || '暂无正文' }}</div>

            <div class="announcement-item-meta">
              <span>{{ formatDateTime(item.updatedAt || item.updated_at) }}</span>
              <span>ID {{ item.id }}</span>
            </div>
          </button>
        </div>

        <div v-else class="empty-state">
          还没有公告记录，先创建第一条公告。
        </div>
      </div>

      <div class="panel-card editor-panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">{{ selectedId ? '编辑公告' : '新建公告' }}</div>
            <div class="panel-subtitle">发布后，小程序首页会读取最新且优先置顶的已发布公告。</div>
          </div>
          <div class="pill-note">{{ form.status === 'published' ? '前台可见' : '暂不展示' }}</div>
        </div>

        <el-form label-position="top" v-loading="loading">
          <el-form-item label="公告标题">
            <el-input
              v-model="form.title"
              maxlength="120"
              show-word-limit
              placeholder="例如：清明节调课说明 / 本周校园活动提醒"
            />
          </el-form-item>

          <el-form-item label="公告正文">
            <el-input
              v-model="form.content"
              type="textarea"
              :rows="8"
              maxlength="2000"
              show-word-limit
              placeholder="这里填写会展示在小程序首页的公告内容。"
            />
          </el-form-item>

          <el-form-item label="发布状态">
            <el-radio-group v-model="form.status">
              <el-radio-button value="draft">草稿</el-radio-button>
              <el-radio-button value="published">发布</el-radio-button>
              <el-radio-button value="archived">归档</el-radio-button>
            </el-radio-group>
          </el-form-item>

          <el-form-item>
            <el-switch v-model="form.isPinned" active-text="置顶公告" inactive-text="普通公告" />
          </el-form-item>

          <div class="actions">
            <el-button type="primary" :loading="saving" @click="handleSave">
              {{ selectedId ? '保存修改' : '创建公告' }}
            </el-button>
            <el-button @click="resetFormOnly">重置</el-button>
            <el-button v-if="selectedId" type="danger" plain :loading="deleting" @click="handleDelete">
              删除公告
            </el-button>
          </div>
        </el-form>

        <div class="preview-card">
          <div class="preview-tag">{{ form.isPinned ? '置顶公告' : '普通公告' }}</div>
          <h3>{{ form.title || '这里会显示公告标题' }}</h3>
          <p>{{ form.content || '这里会显示公告正文，帮助运营在保存前检查语气和信息密度。' }}</p>
          <div class="preview-sub">
            {{ form.status === 'published' ? '已发布后，小程序首页可直接看到这条公告。' : '当前不是发布状态，小程序首页不会展示。' }}
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { announcementApi } from '../api'
import { formatDateTime } from '../utils/format'

type AnnouncementStatus = 'draft' | 'published' | 'archived'

type AnnouncementRecord = {
  id: number
  title: string
  content: string
  status: AnnouncementStatus
  isPinned: boolean
  updatedAt?: string
  updated_at?: string
}

const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const announcements = ref<AnnouncementRecord[]>([])
const selectedId = ref<number | null>(null)

const form = reactive({
  title: '',
  content: '',
  status: 'draft' as AnnouncementStatus,
  isPinned: true,
})

const publishedCount = computed(() => announcements.value.filter((item) => item.status === 'published').length)

const resetFormOnly = () => {
  form.title = ''
  form.content = ''
  form.status = 'draft'
  form.isPinned = true
}

const applyAnnouncement = (item: AnnouncementRecord) => {
  selectedId.value = item.id
  form.title = item.title || ''
  form.content = item.content || ''
  form.status = item.status || 'draft'
  form.isPinned = !!item.isPinned
}

const startCreate = () => {
  selectedId.value = null
  resetFormOnly()
}

const selectAnnouncement = (item: AnnouncementRecord) => {
  applyAnnouncement(item)
}

const loadData = async () => {
  loading.value = true
  try {
    const res = await announcementApi.getList()
    const list = Array.isArray(res.data) ? res.data : []
    announcements.value = list

    if (!list.length) {
      startCreate()
      return
    }

    const current = selectedId.value
      ? list.find((item) => item.id === selectedId.value)
      : list[0]

    if (current) {
      applyAnnouncement(current)
    } else {
      startCreate()
    }
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  if (!form.title.trim() || !form.content.trim()) {
    ElMessage.warning('请先填写公告标题和正文')
    return
  }

  const payload = {
    title: form.title.trim(),
    content: form.content.trim(),
    status: form.status,
    isPinned: form.isPinned,
  }

  saving.value = true
  try {
    const res = selectedId.value
      ? await announcementApi.update(selectedId.value, payload)
      : await announcementApi.create(payload)

    selectedId.value = res.data?.id ?? selectedId.value
    ElMessage.success(form.status === 'published' ? '公告已发布' : '公告已保存')
    await loadData()
  } finally {
    saving.value = false
  }
}

const handleDelete = async () => {
  if (!selectedId.value) return

  await ElMessageBox.confirm('删除后这条公告会从后台和小程序展示链路中移除，确定继续吗？', '删除公告', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  })

  deleting.value = true
  try {
    await announcementApi.delete(selectedId.value)
    ElMessage.success('公告已删除')
    startCreate()
    await loadData()
  } finally {
    deleting.value = false
  }
}

const statusLabel = (status: AnnouncementStatus) => {
  if (status === 'published') return '已发布'
  if (status === 'archived') return '已归档'
  return '草稿'
}

const statusClass = (status: AnnouncementStatus) => ({
  published: status === 'published',
  archived: status === 'archived',
  draft: status === 'draft',
})

onMounted(loadData)
</script>

<style scoped>
.announcements-grid {
  grid-template-columns: minmax(320px, 0.92fr) minmax(0, 1.08fr);
}

.list-panel,
.editor-panel {
  min-height: 720px;
}

.announcement-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.announcement-item {
  width: 100%;
  padding: 18px;
  border-radius: 24px;
  border: 1px solid rgba(216, 199, 163, 0.9);
  background: rgba(255, 251, 243, 0.82);
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.announcement-item:hover,
.announcement-item.active {
  transform: translateY(-1px);
  border-color: rgba(201, 111, 59, 0.55);
  box-shadow: 0 14px 28px rgba(114, 88, 47, 0.1);
}

.announcement-item-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.announcement-item-title {
  font-size: 18px;
  line-height: 1.3;
  color: #1f3a2e;
  font-weight: 600;
}

.announcement-item-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.status-pill,
.pin-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 12px;
}

.status-pill.draft {
  background: rgba(92, 102, 97, 0.12);
  color: #586154;
}

.status-pill.published {
  background: rgba(46, 107, 91, 0.12);
  color: #2e6b5b;
}

.status-pill.archived {
  background: rgba(122, 104, 84, 0.14);
  color: #7a6854;
}

.pin-pill {
  background: rgba(201, 111, 59, 0.12);
  color: #c96f3b;
}

.announcement-item-content {
  margin-top: 10px;
  color: #586154;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.announcement-item-meta {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #7a6854;
  font-size: 12px;
}

.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.preview-card {
  margin-top: 28px;
  min-height: 280px;
  padding: 24px;
  border-radius: 28px;
  border: 1px solid rgba(216, 199, 163, 0.9);
  background: linear-gradient(180deg, rgba(255, 251, 243, 0.95), rgba(247, 239, 226, 0.82));
}

.preview-tag {
  display: inline-flex;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(201, 111, 59, 0.12);
  color: #c96f3b;
  font-size: 12px;
}

.preview-card h3 {
  margin: 18px 0 12px;
  font-size: 30px;
  line-height: 1.05;
  color: #1f3a2e;
  font-family: 'Cormorant Garamond', 'Noto Serif SC', serif;
}

.preview-card p {
  margin: 0;
  line-height: 1.9;
  color: #586154;
  white-space: pre-wrap;
}

.preview-sub {
  margin-top: 20px;
  color: #586154;
  font-size: 13px;
}

.empty-state {
  display: grid;
  place-items: center;
  min-height: 240px;
  border-radius: 24px;
  border: 1px dashed rgba(122, 104, 84, 0.35);
  color: #7a6854;
  background: rgba(255, 251, 243, 0.6);
}

@media (max-width: 1100px) {
  .announcements-grid {
    grid-template-columns: 1fr;
  }

  .list-panel,
  .editor-panel {
    min-height: auto;
  }
}
</style>
