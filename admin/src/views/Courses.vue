<template>
  <div class="editorial-page">
    <section class="hero-panel">
      <div>
        <div class="section-kicker">Course Operations</div>
        <h2>全局巡检所有用户课表，快速定位异常课程并直接删除。</h2>
        <p>
          这里主要用于排查 OCR 导入错误、重复课程、异常地点和时间段，也能辅助核对某个用户的课表是否已经正确落库。
        </p>
      </div>
      <div class="hero-side">
        <strong>{{ courses.length }}</strong>
        <div class="muted-text">门课程记录</div>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-header">
        <div>
          <div class="panel-title">课表巡检列表</div>
          <div class="panel-subtitle">按课程名、教师、教室、用户昵称和星期过滤。</div>
        </div>
        <div class="panel-toolbar">
          <el-input
            v-model="keyword"
            placeholder="搜索课程 / 教师 / 教室 / 用户昵称"
            clearable
            style="width: 280px"
            @keyup.enter="loadData"
          />
          <el-select v-model="weekday" clearable placeholder="星期" style="width: 120px">
            <el-option v-for="item in weekdayOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-button type="primary" @click="loadData">查询</el-button>
        </div>
      </div>

      <div class="editorial-table">
        <el-table :data="courses" v-loading="loading">
          <el-table-column prop="id" label="ID" width="78" />
          <el-table-column prop="course_name" label="课程" min-width="180" />
          <el-table-column prop="teacher" label="教师" min-width="120" />
          <el-table-column prop="location" label="教室" min-width="160" />
          <el-table-column label="用户" min-width="120">
            <template #default="{ row }">{{ row.nickname || '未命名用户' }}</template>
          </el-table-column>
          <el-table-column label="星期" width="90">
            <template #default="{ row }">{{ weekdayLabel(row.weekday) }}</template>
          </el-table-column>
          <el-table-column label="节次" min-width="120">
            <template #default="{ row }">{{ sectionLabel(row.start_section, row.end_section) }}</template>
          </el-table-column>
          <el-table-column label="周次" min-width="130">
            <template #default="{ row }">第 {{ row.start_week }} - {{ row.end_week }} 周</template>
          </el-table-column>
          <el-table-column label="时间" min-width="140">
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
