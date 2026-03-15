<template>
  <div>
    <h2>提醒记录</h2>
    <el-table :data="reminders" v-loading="loading">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="userId" label="用户ID" width="100" />
      <el-table-column prop="courseId" label="课程ID" width="100" />
      <el-table-column prop="remindTime" label="提醒时间" />
      <el-table-column prop="status" label="状态" width="100" />
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { reminderApi } from '../api'

const reminders = ref([])
const loading = ref(true)

onMounted(async () => {
  const res = await reminderApi.getList()
  reminders.value = res.data
  loading.value = false
})
</script>
