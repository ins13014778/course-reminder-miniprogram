<template>
  <div class="editorial-page">
    <section class="hero-panel">
      <div>
        <div class="section-kicker">System Settings</div>
        <h2>把学期参数、提醒规则、功能开关和第三方服务地址，统一收口到后台可维护的配置中心。</h2>
        <p>
          这一页先承接高频运营配置，后续还可以继续往里扩。这样不管是 CloudBase 路线还是宝塔部署路线，
          后面的开发者都能从一个地方快速找到关键参数。
        </p>
      </div>
      <div class="hero-side">
        <strong>{{ totalItems }}</strong>
        <div class="muted-text">当前配置项</div>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-header">
        <div>
          <div class="panel-title">配置概览</div>
          <div class="panel-subtitle">先把最常改、最容易散落在代码里的参数收口到后台。</div>
        </div>
        <div class="toolbar-actions">
          <el-button @click="resetToDefaults">恢复默认</el-button>
          <el-button @click="reloadData">重新加载</el-button>
          <el-button type="primary" :loading="saving" @click="saveSettings">保存全部配置</el-button>
        </div>
      </div>

      <div class="summary-grid">
        <article v-for="group in groups" :key="group.key" class="summary-card">
          <div class="eyebrow">{{ group.label }}</div>
          <div class="value">{{ group.items.length }}</div>
          <div class="meta">{{ group.description }}</div>
        </article>
      </div>
    </section>

    <section class="stack-grid" v-loading="loading">
      <section v-for="group in groups" :key="group.key" class="panel-card">
        <div class="panel-header">
          <div>
            <div class="panel-title">{{ group.label }}</div>
            <div class="panel-subtitle">{{ group.description }}</div>
          </div>
        </div>

        <div class="stack-grid settings-grid">
          <article v-for="item in group.items" :key="item.key" class="surface-card setting-card">
            <div class="setting-card-top">
              <div>
                <h3>{{ item.label }}</h3>
                <p>{{ item.description }}</p>
              </div>
              <div class="muted-text setting-key">{{ item.key }}</div>
            </div>

            <div class="setting-field">
              <el-switch
                v-if="item.type === 'boolean'"
                v-model="values[item.key]"
                inline-prompt
                active-text="开"
                inactive-text="关"
              />

              <el-input-number
                v-else-if="item.type === 'number'"
                v-model="values[item.key]"
                :min="item.min ?? 0"
                :max="item.max ?? 99999"
                :step="item.step ?? 1"
              />

              <el-date-picker
                v-else-if="item.type === 'date'"
                v-model="values[item.key]"
                type="date"
                value-format="YYYY-MM-DD"
                format="YYYY-MM-DD"
                placeholder="请选择日期"
                style="width: 100%"
              />

              <el-input
                v-else-if="item.type === 'textarea'"
                v-model="values[item.key]"
                type="textarea"
                :rows="5"
                :placeholder="item.placeholder || '请输入内容'"
              />

              <el-input
                v-else
                v-model="values[item.key]"
                :placeholder="item.placeholder || '请输入内容'"
              />
            </div>

            <div class="setting-meta">
              <div class="muted-text">默认值：{{ formatDefaultValue(item.defaultValue) }}</div>
              <div class="muted-text">最近更新：{{ formatDateTime(item.updatedAt) }}</div>
            </div>
          </article>
        </div>
      </section>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { systemSettingsApi } from '../api'
import { formatDateTime } from '../utils/format'

type SettingItem = {
  key: string
  label: string
  description: string
  type: 'boolean' | 'number' | 'text' | 'textarea' | 'date'
  value: any
  defaultValue: any
  placeholder?: string
  min?: number | null
  max?: number | null
  step?: number | null
  updatedAt?: string | null
}

type SettingGroup = {
  key: string
  label: string
  description: string
  items: SettingItem[]
}

const loading = ref(true)
const saving = ref(false)
const groups = ref<SettingGroup[]>([])
const values = reactive<Record<string, any>>({})

const totalItems = computed(() => groups.value.reduce((total, group) => total + group.items.length, 0))

function clearValues() {
  Object.keys(values).forEach((key) => delete values[key])
}

function cloneValue(value: any) {
  if (Array.isArray(value)) return [...value]
  if (value && typeof value === 'object') return JSON.parse(JSON.stringify(value))
  return value
}

function applyGroups(nextGroups: SettingGroup[]) {
  groups.value = Array.isArray(nextGroups) ? nextGroups : []
  clearValues()

  groups.value.forEach((group) => {
    group.items.forEach((item) => {
      values[item.key] = cloneValue(item.value)
    })
  })
}

async function loadData() {
  loading.value = true
  try {
    const res = await systemSettingsApi.get()
    applyGroups(res.data?.groups || [])
  } finally {
    loading.value = false
  }
}

async function reloadData() {
  await loadData()
  ElMessage.success('系统配置已重新加载')
}

function resetToDefaults() {
  groups.value.forEach((group) => {
    group.items.forEach((item) => {
      values[item.key] = cloneValue(item.defaultValue)
    })
  })
  ElMessage.success('已恢复默认值，记得保存')
}

function formatDefaultValue(value: any) {
  if (typeof value === 'boolean') return value ? '开启' : '关闭'
  if (value === null || typeof value === 'undefined' || value === '') return '-'
  return String(value)
}

async function saveSettings() {
  saving.value = true
  try {
    const settings: Record<string, any> = {}
    groups.value.forEach((group) => {
      group.items.forEach((item) => {
        settings[item.key] = values[item.key]
      })
    })

    const res = await systemSettingsApi.save({ settings })
    applyGroups(res.data?.groups || [])
    ElMessage.success('系统配置已保存')
  } finally {
    saving.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.settings-grid {
  gap: 16px;
}

.setting-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.setting-card-top h3 {
  margin: 0;
}

.setting-key {
  word-break: break-all;
  text-align: right;
}

.setting-field {
  display: flex;
  align-items: center;
}

.setting-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 720px) {
  .setting-card-top {
    flex-direction: column;
  }

  .setting-key {
    text-align: left;
  }

  .setting-meta {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
