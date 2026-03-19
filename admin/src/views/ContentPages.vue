<template>
  <div class="editorial-page">
    <section class="hero-panel">
      <div>
        <div class="hero-kicker">Page Configuration</div>
        <h2>把“通知管理”和“关于我们”做成后台可运营的真实内容位，而不是写死在小程序里。</h2>
        <p>
          这里保存的是小程序个人中心两个页面的正式内容。支持标题、副标题、正文、状态和扩展 JSON
          配置，发布后小程序端会直接读取最新已发布内容。
        </p>
      </div>
      <div class="hero-side">
        <strong>{{ pages.length }} 个页面</strong>
        <div class="muted-text">当前可配置的高权限内容页</div>
      </div>
    </section>

    <section class="split-grid content-pages-grid">
      <div class="panel-card list-panel" v-loading="loading">
        <div class="panel-header">
          <div>
            <div class="panel-title">页面列表</div>
            <div class="panel-subtitle">选择一个页面后即可编辑对应的小程序内容。</div>
          </div>
        </div>

        <div class="page-list">
          <button
            v-for="item in pages"
            :key="item.key"
            type="button"
            class="page-item"
            :class="{ active: selectedKey === item.key }"
            @click="selectPage(item.key)"
          >
            <div class="page-item-top">
              <div>
                <div class="page-item-title">{{ item.name }}</div>
                <div class="page-item-key">{{ item.key }}</div>
              </div>
              <span class="status-pill" :class="item.status">{{ statusLabel(item.status) }}</span>
            </div>
            <div class="page-item-desc">{{ item.description }}</div>
            <div class="page-item-meta">最近更新：{{ formatDateTime(item.updatedAt) }}</div>
          </button>
        </div>
      </div>

      <div class="panel-card editor-panel" v-loading="detailLoading">
        <div class="panel-header">
          <div>
            <div class="panel-title">{{ currentPage?.name || '页面配置' }}</div>
            <div class="panel-subtitle">{{ currentPage?.description || '选择页面后开始编辑。' }}</div>
          </div>
          <div class="pill-note">{{ statusLabel(form.status) }}</div>
        </div>

        <el-form label-position="top">
          <el-form-item label="页面标题">
            <el-input v-model="form.title" maxlength="120" show-word-limit placeholder="输入页面标题" />
          </el-form-item>

          <el-form-item label="页面副标题">
            <el-input
              v-model="form.subtitle"
              maxlength="255"
              show-word-limit
              placeholder="输入页面副标题或引导语"
            />
          </el-form-item>

          <el-form-item label="页面正文">
            <el-input
              v-model="form.content"
              type="textarea"
              :rows="8"
              maxlength="4000"
              show-word-limit
              placeholder="输入页面正文，支持多段文案。"
            />
          </el-form-item>

          <el-form-item label="发布状态">
            <el-radio-group v-model="form.status">
              <el-radio-button value="draft">草稿</el-radio-button>
              <el-radio-button value="published">发布</el-radio-button>
              <el-radio-button value="archived">归档</el-radio-button>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="扩展 JSON">
            <el-input
              v-model="form.extraJson"
              type="textarea"
              :rows="12"
              placeholder="输入合法 JSON，用于小程序页面的扩展展示。"
            />
          </el-form-item>

          <div class="actions">
            <el-button type="primary" :loading="saving" @click="handleSave">保存页面配置</el-button>
            <el-button @click="reloadCurrent">重新加载</el-button>
          </div>
        </el-form>

        <div class="preview-card">
          <div class="preview-tag">MINIPROGRAM PREVIEW</div>
          <h3>{{ form.title || '页面标题预览' }}</h3>
          <div class="preview-subtitle">{{ form.subtitle || '这里会显示页面副标题。' }}</div>
          <p>{{ form.content || '这里会显示页面正文内容。' }}</p>

          <div class="preview-extra">
            <div class="preview-extra-title">扩展 JSON 预览</div>
            <pre>{{ parsedExtraText }}</pre>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { contentPageApi } from '../api'
import { formatDateTime } from '../utils/format'

type ContentPageStatus = 'draft' | 'published' | 'archived'

type ContentPageRecord = {
  key: string
  name: string
  description: string
  title: string
  subtitle: string
  content: string
  status: ContentPageStatus
  extraJson: string
  updatedAt?: string | null
}

const loading = ref(false)
const detailLoading = ref(false)
const saving = ref(false)
const pages = ref<ContentPageRecord[]>([])
const selectedKey = ref('')

const form = reactive({
  title: '',
  subtitle: '',
  content: '',
  status: 'draft' as ContentPageStatus,
  extraJson: '',
})

const currentPage = computed(() => pages.value.find((item) => item.key === selectedKey.value) || null)

const parsedExtraText = computed(() => {
  try {
    return JSON.stringify(JSON.parse(form.extraJson || '{}'), null, 2)
  } catch {
    return 'JSON 格式无效，保存前请修正。'
  }
})

const statusLabel = (status?: ContentPageStatus) => {
  if (status === 'published') return '已发布'
  if (status === 'archived') return '已归档'
  return '草稿'
}

function applyDetail(detail: ContentPageRecord) {
  form.title = detail.title || ''
  form.subtitle = detail.subtitle || ''
  form.content = detail.content || ''
  form.status = detail.status || 'draft'
  form.extraJson = detail.extraJson || '{}'
}

async function loadList() {
  loading.value = true
  try {
    const res = await contentPageApi.getList()
    pages.value = Array.isArray(res.data) ? res.data : []

    if (!selectedKey.value && pages.value.length) {
      selectedKey.value = pages.value[0].key
    }
  } finally {
    loading.value = false
  }
}

async function loadDetail(key: string) {
  if (!key) return

  detailLoading.value = true
  try {
    const res = await contentPageApi.getDetail(key)
    applyDetail(res.data)
  } finally {
    detailLoading.value = false
  }
}

async function selectPage(key: string) {
  selectedKey.value = key
  await loadDetail(key)
}

async function reloadCurrent() {
  if (!selectedKey.value) return
  await loadList()
  await loadDetail(selectedKey.value)
}

async function handleSave() {
  if (!selectedKey.value) return

  try {
    JSON.parse(form.extraJson || '{}')
  } catch {
    ElMessage.warning('扩展 JSON 不是合法格式，请先修正。')
    return
  }

  saving.value = true
  try {
    await contentPageApi.saveDetail(selectedKey.value, {
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      content: form.content.trim(),
      status: form.status,
      extraJson: form.extraJson.trim(),
    })
    ElMessage.success('页面配置已保存')
    await reloadCurrent()
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await loadList()
  if (selectedKey.value) {
    await loadDetail(selectedKey.value)
  }
})
</script>

<style scoped>
.content-pages-grid {
  grid-template-columns: minmax(320px, 0.86fr) minmax(0, 1.14fr);
}

.list-panel,
.editor-panel {
  min-height: 720px;
}

.page-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.page-item {
  width: 100%;
  padding: 18px;
  border-radius: 24px;
  border: 1px solid rgba(216, 199, 163, 0.9);
  background: rgba(255, 251, 243, 0.82);
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.page-item:hover,
.page-item.active {
  transform: translateY(-1px);
  border-color: rgba(201, 111, 59, 0.55);
  box-shadow: 0 14px 28px rgba(114, 88, 47, 0.1);
}

.page-item-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-item-title {
  font-size: 18px;
  line-height: 1.3;
  color: #1f3a2e;
  font-weight: 600;
}

.page-item-key,
.page-item-meta,
.page-item-desc,
.preview-subtitle {
  color: #586154;
}

.page-item-key {
  margin-top: 4px;
  font-size: 12px;
}

.page-item-desc {
  margin-top: 10px;
  line-height: 1.7;
}

.page-item-meta {
  margin-top: 12px;
  font-size: 12px;
}

.status-pill {
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

.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.preview-card {
  margin-top: 28px;
  min-height: 320px;
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
  margin: 18px 0 8px;
  font-size: 30px;
  line-height: 1.05;
  color: #1f3a2e;
  font-family: 'Source Serif 4', serif;
}

.preview-card p {
  margin: 16px 0 0;
  line-height: 1.9;
  color: #586154;
  white-space: pre-wrap;
}

.preview-extra {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px dashed rgba(122, 104, 84, 0.24);
}

.preview-extra-title {
  font-size: 13px;
  color: #7a6854;
  margin-bottom: 10px;
}

.preview-extra pre {
  margin: 0;
  padding: 16px;
  border-radius: 20px;
  background: rgba(255, 251, 243, 0.88);
  border: 1px solid rgba(216, 199, 163, 0.9);
  color: #1f3a2e;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 1100px) {
  .content-pages-grid {
    grid-template-columns: 1fr;
  }

  .list-panel,
  .editor-panel {
    min-height: auto;
  }
}
</style>
