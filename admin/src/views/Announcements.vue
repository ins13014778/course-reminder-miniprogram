<template>
  <div class="editorial-page">
    <section class="hero-panel">
      <div>
        <div class="hero-kicker">Announcement Studio</div>
        <h2>把首页公告做成一个轻量运营编辑器，而不只是单条文本输入框。</h2>
        <p>公告会展示在小程序首页顶部，这里保留标题、正文、发布状态与置顶能力，适合日常发校历提醒、活动通知和功能更新。</p>
      </div>
      <div class="hero-side">
        <strong>{{ form.status === 'published' ? '已发布' : '草稿中' }}</strong>
        <div class="muted-text">当前卡片可直接影响首页内容展示</div>
      </div>
    </section>

    <section class="split-grid">
      <div class="panel-card">
        <div class="panel-header">
          <div>
            <div class="panel-title">公告编辑</div>
            <div class="panel-subtitle">建议标题控制在 24 字以内，正文控制在 3 至 5 行阅读长度。</div>
          </div>
          <div class="pill-note">{{ form.status === 'published' ? '前台可见' : '仅后台草稿' }}</div>
        </div>

        <el-form label-position="top" v-loading="loading">
          <el-form-item label="公告标题">
            <el-input v-model="form.title" maxlength="120" show-word-limit placeholder="例如：清明节调课说明 / 本周校园活动提醒" />
          </el-form-item>

          <el-form-item label="公告正文">
            <el-input
              v-model="form.content"
              type="textarea"
              :rows="10"
              maxlength="2000"
              show-word-limit
              placeholder="这里填写会展示在小程序首页的公告内容。"
            />
          </el-form-item>

          <el-form-item label="发布状态">
            <el-radio-group v-model="form.status">
              <el-radio-button label="draft">保存草稿</el-radio-button>
              <el-radio-button label="published">立即发布</el-radio-button>
            </el-radio-group>
          </el-form-item>

          <el-form-item>
            <el-switch v-model="form.isPinned" active-text="置顶公告" inactive-text="普通公告" />
          </el-form-item>

          <div class="actions">
            <el-button type="primary" :loading="saving" @click="handleSave">保存公告</el-button>
            <el-button @click="loadData">重新加载</el-button>
          </div>
        </el-form>
      </div>

      <div class="panel-card">
        <div class="panel-header">
          <div>
            <div class="panel-title">预览面板</div>
            <div class="panel-subtitle">模拟小程序首页读取公告时的卡片内容。</div>
          </div>
        </div>

        <div class="preview-card">
          <div class="preview-tag">{{ form.isPinned ? '置顶公告' : '最新公告' }}</div>
          <h3>{{ form.title || '这里会显示公告标题' }}</h3>
          <p>{{ form.content || '这里会显示公告正文，帮助运营在保存前先检查语气和信息密度。' }}</p>
          <div class="preview-sub">
            {{ form.status === 'published' ? '保存后前台首页可见' : '当前是草稿，不会展示给小程序用户' }}
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { announcementApi } from '../api'

const loading = ref(true)
const saving = ref(false)
const form = reactive({
  title: '',
  content: '',
  status: 'draft',
  isPinned: true,
})

const loadData = async () => {
  loading.value = true
  try {
    const res = await announcementApi.getCurrent()
    const current = res.data
    form.title = current?.title || ''
    form.content = current?.content || ''
    form.status = current?.status || 'draft'
    form.isPinned = current?.isPinned ?? true
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  if (!form.title.trim() || !form.content.trim()) {
    ElMessage.warning('请先填写标题和内容')
    return
  }

  saving.value = true
  try {
    await announcementApi.saveCurrent({
      title: form.title.trim(),
      content: form.content.trim(),
      status: form.status,
      isPinned: form.isPinned,
    })
    ElMessage.success(form.status === 'published' ? '公告已发布' : '草稿已保存')
    await loadData()
  } finally {
    saving.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.actions {
  display: flex;
  gap: 12px;
}

.preview-card {
  min-height: 360px;
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
</style>
