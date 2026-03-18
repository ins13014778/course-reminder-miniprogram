<template>
  <div class="editorial-page">
    <section class="hero-panel">
      <div>
        <div class="hero-kicker">Operations Dashboard</div>
        <h2>把小程序的用户、课程、公告和内容流放进同一块监控版面里。</h2>
        <p>这里优先展示真实线上数据里的活跃度、数据量和功能健康状态，让后台不只是“列表入口”，而是日常巡检和内容运营的第一现场。</p>
      </div>
      <div class="hero-side">
        <strong>CloudBase Ready</strong>
        <div class="muted-text">环境：dawdawd15</div>
      </div>
    </section>

    <section class="summary-grid">
      <article v-for="item in metricCards" :key="item.label" class="summary-card">
        <div class="eyebrow">{{ item.label }}</div>
        <div class="value">{{ item.value }}</div>
        <div class="meta">{{ item.meta }}</div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { overviewApi } from '../api'

const loading = ref(true)
const data = reactive({
  metrics: {
    users: 0,
    courses: 0,
    notes: 0,
    activeSubscriptions: 0,
    activeShares: 0,
    templateCourses: 0,
    publishedAnnouncements: 0,
  },
})

const metricCards = computed(() => [
  { label: '注册用户', value: data.metrics.users, meta: '当前小程序沉淀的用户数' },
  { label: '课程总量', value: data.metrics.courses, meta: '用户课表中已落库课程' },
  { label: '校园笔记', value: data.metrics.notes, meta: '内容侧公开记录量' },
  { label: '活跃订阅', value: data.metrics.activeSubscriptions, meta: '仍处于可发送状态的授权' },
  { label: '可用分享', value: data.metrics.activeShares, meta: '用户可复制使用的分享密钥' },
  { label: '模板课程', value: data.metrics.templateCourses, meta: '默认课表模板资产数量' },
  { label: '已发布公告', value: data.metrics.publishedAnnouncements, meta: '当前处于发布态的公告数量' },
])

async function loadData() {
  loading.value = true
  try {
    const res = await overviewApi.get()
    Object.assign(data, res.data)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>
