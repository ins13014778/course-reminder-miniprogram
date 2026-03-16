<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2>公告管理</h2>
        <p>保存后小程序首页会读取最新已发布公告。</p>
      </div>
      <el-tag :type="form.status === 'published' ? 'success' : 'info'">
        {{ form.status === 'published' ? '已发布' : '草稿' }}
      </el-tag>
    </div>

    <el-card v-loading="loading">
      <el-form label-position="top">
        <el-form-item label="公告标题">
          <el-input v-model="form.title" maxlength="120" show-word-limit placeholder="例如：五一放假课程安排说明" />
        </el-form-item>

        <el-form-item label="公告内容">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="8"
            maxlength="2000"
            show-word-limit
            placeholder="这里填写会展示在小程序首页的公告内容"
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
    </el-card>
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
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.page-header h2 {
  margin: 0 0 8px;
}

.page-header p {
  margin: 0;
  color: #6b7280;
}

.actions {
  display: flex;
  gap: 12px;
}
</style>
