<template>
  <div>
    <h2>用户管理</h2>
    <el-table :data="users" v-loading="loading">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="nickname" label="昵称" />
      <el-table-column prop="schoolName" label="学校" />
      <el-table-column prop="major" label="专业" />
      <el-table-column prop="createdAt" label="注册时间" />
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { userApi } from '../api'

const users = ref([])
const loading = ref(true)

onMounted(async () => {
  const res = await userApi.getList()
  users.value = res.data
  loading.value = false
})
</script>
