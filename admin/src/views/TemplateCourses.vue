<template>
  <div class="editorial-page">
    <section class="hero-panel">
      <div>
        <div class="hero-kicker">Template Assets</div>
        <h2>默认课表模板是游客模式和兜底课表体验的基础资产。</h2>
        <p>这一页用来核对 `course_templates` 中的模板课程，方便查看模板键、节次、周次和单双周设置是否合理。</p>
      </div>
      <div class="hero-side">
        <strong>{{ rows.length }} 条模板课程</strong>
        <div class="muted-text">当前模板主要服务默认课表模式</div>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-header">
        <div>
          <div class="panel-title">模板课表</div>
          <div class="panel-subtitle">字段直接对应线上 `course_templates` 表。</div>
        </div>
        <div class="panel-toolbar">
          <el-input v-model="templateKey" placeholder="按模板 key 过滤" clearable style="width: 220px" @keyup.enter="loadData" />
          <el-button type="primary" @click="loadData">筛选</el-button>
        </div>
      </div>

      <div class="editorial-table">
        <el-table :data="rows" v-loading="loading">
          <el-table-column prop="template_key" label="模板 Key" min-width="140" />
          <el-table-column prop="template_name" label="模板名" min-width="140" />
          <el-table-column prop="course_name" label="课程" min-width="150" />
          <el-table-column prop="teacher_name" label="教师" min-width="100" />
          <el-table-column prop="classroom" label="教室" min-width="120" />
          <el-table-column label="星期" width="90">
            <template #default="{ row }">{{ weekdayLabel(row.weekday) }}</template>
          </el-table-column>
          <el-table-column label="节次" width="110">
            <template #default="{ row }">{{ sectionLabel(row.start_section, row.end_section) }}</template>
          </el-table-column>
          <el-table-column label="周次" min-width="110">
            <template #default="{ row }">{{ row.start_week }} - {{ row.end_week }}</template>
          </el-table-column>
          <el-table-column prop="week_type" label="单双周" width="90" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.is_active ? 'success' : 'info'">{{ row.is_active ? '启用' : '停用' }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { templateApi } from '../api'
import { sectionLabel, weekdayLabel } from '../utils/format'

const rows = ref<any[]>([])
const loading = ref(true)
const templateKey = ref('')

async function loadData() {
  loading.value = true
  try {
    const res = await templateApi.getList({
      templateKey: templateKey.value || undefined,
    })
    rows.value = res.data
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>
