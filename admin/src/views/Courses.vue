<template>
  <div class="editorial-page">
    <section class="hero-panel">
      <div>
        <div class="hero-kicker">Course Operations</div>
        <h2>管理用户课表、筛查异常课程，并核对节次与上课地点。</h2>
        <p>课程数据来自小程序中的手动编辑、OCR 导入、分享导入三种链路，这里统一从线上课程表做运营和排障视图。</p>
      </div>
      <div class="hero-side">
        <strong>{{ courses.length }} 门课程</strong>
        <div class="muted-text">支持关键词与星期过滤</div>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-header">
        <div>
          <div class="panel-title">课程库</div>
          <div class="panel-subtitle">字段按 CloudBase 真实表结构渲染：course_name / teacher / location。</div>
        </div>
        <div class="panel-toolbar">
          <el-input v-model="keyword" placeholder="搜索课程 / 教师 / 教室 / 用户昵称" clearable style="width: 280px" @keyup.enter="loadData" />
          <el-select v-model="weekday" clearable placeholder="星期" style="width: 120px">
            <el-option v-for="item in weekdayOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-button type="primary" @click="loadData">筛选</el-button>
        </div>
      </div>

      <div class="editorial-table">
        <el-table :data="courses" v-loading="loading">
          <el-table-column prop="id" label="ID" width="78" />
          <el-table-column prop="course_name" label="课程名" min-width="160" />
          <el-table-column prop="teacher" label="教师" min-width="120" />
          <el-table-column prop="location" label="教室" min-width="140" />
          <el-table-column label="用户" min-width="120">
            <template #default="{ row }">{{ row.nickname || '未命名用户' }}</template>
          </el-table-column>
          <el-table-column label="星期" width="90">
            <template #default="{ row }">{{ weekdayLabel(row.weekday) }}</template>
          </el-table-column>
          <el-table-column label="节次" min-width="120">
            <template #default="{ row }">{{ sectionLabel(row.start_section, row.end_section) }}</template>
          </el-table-column>
          <el-table-column label="周次" min-width="120">
            <template #default="{ row }">第 {{ row.start_week }} - {{ row.end_week }} 周</template>
          </el-table-column>
          <el-table-column label="时间" min-width="130">
            <template #default="{ row }">{{ row.start_time || '-' }} ~ {{ row.end_time || '-' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="110" fixed="right">
            <template #default="{ row }">
              <el-button type="danger" plain size="small" @click="handleDelete(row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { courseApi } from '../api'
import { sectionLabel, weekdayLabel } from '../utils/format'

const courses = ref<any[]>([])
const loading = ref(true)
const keyword = ref('')
const weekday = ref<number | undefined>()

const weekdayOptions = [
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 },
  { label: '周日', value: 7 },
]

async function loadData() {
  loading.value = true
  try {
    const res = await courseApi.getList({
      keyword: keyword.value || undefined,
      weekday: weekday.value || undefined,
    })
    courses.value = res.data
  } finally {
    loading.value = false
  }
}

async function handleDelete(id: number) {
  await ElMessageBox.confirm('删除后无法恢复，这门课程会从用户课表中移除。', '确认删除', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  })
  await courseApi.delete(id)
  ElMessage.success('删除成功')
  loadData()
}

onMounted(loadData)
</script>
