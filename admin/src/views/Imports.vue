<template>
  <div>
    <h2>导入任务</h2>
    <el-table :data="tasks" v-loading="loading">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="userId" label="用户ID" width="100" />
      <el-table-column prop="status" label="状态" width="100" />
      <el-table-column prop="createdAt" label="创建时间" />
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { importApi } from '../api'

const tasks = ref([])
const loading = ref(true)

onMounted(async () => {
  const res = await importApi.getList()
  tasks.value = res.data
  loading.value = false
})
</script>
