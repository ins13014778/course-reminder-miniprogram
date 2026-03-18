<template>
  <div class="editorial-page">
    <section class="hero-panel">
      <div>
        <div class="hero-kicker">User Operations</div>
        <h2>观察注册用户、课表沉淀和内容活跃度。</h2>
        <p>这一页对应小程序里的登录、个人资料、课程维护、笔记和订阅授权能力，用来快速找到高活跃用户和资料缺口。</p>
      </div>
      <div class="hero-side">
        <strong>{{ users.length }} 位用户</strong>
        <div class="muted-text">支持昵称、学校、专业、OpenID 检索</div>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-header">
        <div>
          <div class="panel-title">用户列表</div>
          <div class="panel-subtitle">展示个人资料完整度以及关联课程、笔记、分享和订阅数量。</div>
        </div>
        <div class="panel-toolbar">
          <el-input v-model="keyword" placeholder="搜索昵称 / 学校 / 专业 / OpenID" clearable style="width: 320px" @keyup.enter="loadData" />
          <el-button type="primary" @click="loadData">筛选</el-button>
        </div>
      </div>

      <div class="editorial-table">
        <el-table :data="users" v-loading="loading">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column label="用户" min-width="170">
            <template #default="{ row }">
              <div>
                <div>{{ row.nickname || '未命名用户' }}</div>
                <div class="muted-text">{{ row.openid }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="school" label="学校" min-width="140" />
          <el-table-column prop="major" label="专业" min-width="140" />
          <el-table-column prop="grade" label="年级" width="90" />
          <el-table-column label="课程" width="80">
            <template #default="{ row }">{{ row.course_count }}</template>
          </el-table-column>
          <el-table-column label="笔记" width="80">
            <template #default="{ row }">{{ row.note_count }}</template>
          </el-table-column>
          <el-table-column label="分享" width="80">
            <template #default="{ row }">{{ row.share_count }}</template>
          </el-table-column>
          <el-table-column label="订阅" width="80">
            <template #default="{ row }">{{ row.active_subscription_count }}</template>
          </el-table-column>
          <el-table-column label="注册时间" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
          </el-table-column>
        </el-table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { userApi } from '../api'
import { formatDateTime } from '../utils/format'

const users = ref<any[]>([])
const loading = ref(true)
const keyword = ref('')

async function loadData() {
  loading.value = true
  try {
    const res = await userApi.getList({ keyword: keyword.value || undefined })
    users.value = res.data
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>
