<template>
  <div>
    <h2>课程管理</h2>
    <el-table :data="courses" v-loading="loading">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="courseName" label="课程名" />
      <el-table-column prop="teacherName" label="教师" />
      <el-table-column prop="classroom" label="教室" />
      <el-table-column prop="weekday" label="星期" width="80" />
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button type="danger" size="small" @click="handleDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { courseApi } from '../api'

const courses = ref([])
const loading = ref(true)

const loadData = async () => {
  const res = await courseApi.getList()
  courses.value = res.data
  loading.value = false
}

const handleDelete = async (id: number) => {
  await courseApi.delete(id)
  ElMessage.success('删除成功')
  loadData()
}

onMounted(loadData)
</script>
