<template>
  <div class="editorial-page">
    <section class="hero-panel">
      <div>
        <div class="section-kicker">Admin Accounts</div>
        <h2>把后台从单一管理员账号升级成可分角色协作的权限体系。</h2>
        <p>超级管理员可以在这里新增管理员账号、分配权限，并保护系统默认超管账号不被误降权或停用。</p>
      </div>
      <div class="hero-side">
        <strong>{{ rows.length }}</strong>
        <div class="muted-text">个管理员账号</div>
      </div>
    </section>

    <section class="split-grid">
      <div class="panel-card">
        <div class="panel-header">
          <div>
            <div class="panel-title">管理员列表</div>
            <div class="panel-subtitle">系统默认超管账号仅可查看，不允许在这里修改角色或停用。</div>
          </div>
        </div>

        <div class="editorial-table">
          <el-table :data="rows" v-loading="loading" @row-click="selectRow">
            <el-table-column prop="email" label="邮箱" min-width="220" />
            <el-table-column prop="name" label="姓名" min-width="120" />
            <el-table-column prop="roleLabel" label="角色" min-width="120" />
            <el-table-column prop="status" label="状态" width="100" />
            <el-table-column label="保护" width="120">
              <template #default="{ row }">
                <el-tag v-if="row.isSystemProtected" type="danger">系统超管</el-tag>
                <span v-else class="muted-text">普通账号</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <div class="panel-card">
        <div class="panel-header">
          <div>
            <div class="panel-title">{{ editingId ? '编辑管理员' : '创建管理员' }}</div>
            <div class="panel-subtitle">可设置角色、启用状态、细粒度权限和密码。</div>
          </div>
        </div>

        <el-form label-position="top">
          <el-form-item label="邮箱">
            <el-input v-model="form.email" :disabled="!!editingId" placeholder="管理员登录邮箱" />
          </el-form-item>
          <el-form-item label="姓名">
            <el-input v-model="form.name" placeholder="管理员显示名称" />
          </el-form-item>
          <el-form-item label="角色">
            <el-select v-model="form.role" style="width: 100%" :disabled="isProtectedEditing">
              <el-option label="超级管理员" value="super_admin" />
              <el-option label="运营" value="operator" />
              <el-option label="审核员" value="moderator" />
              <el-option label="客服" value="support" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-radio-group v-model="form.status" :disabled="isProtectedEditing">
              <el-radio-button value="active">启用</el-radio-button>
              <el-radio-button value="disabled">停用</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="权限分配">
            <el-checkbox-group v-model="form.permissions">
              <el-checkbox
                v-for="item in permissionOptions"
                :key="item.key"
                :value="item.key"
                :disabled="isProtectedEditing"
              >
                {{ item.label }}
              </el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          <el-form-item :label="editingId ? '新密码（可选）' : '初始密码'">
            <el-input v-model="form.password" type="password" show-password placeholder="输入管理员密码" />
          </el-form-item>

          <div v-if="isProtectedEditing" class="muted-text">
            系统默认超管账号只用于保底接管，后台仅允许新增其他管理员，不允许在这里修改该账号。
          </div>

          <div class="actions">
            <el-button type="primary" :loading="saving" @click="submit" :disabled="isProtectedEditing">
              {{ editingId ? '保存修改' : '创建账号' }}
            </el-button>
            <el-button @click="resetForm">重置</el-button>
          </div>
        </el-form>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { adminAccountApi } from '../api'

const rows = ref<any[]>([])
const loading = ref(true)
const saving = ref(false)
const editingId = ref<number | null>(null)
const isProtectedEditing = ref(false)
const permissionOptions = [
  { key: 'user.view', label: '查看用户' },
  { key: 'user.ban', label: '封禁账号/笔记/分享' },
  { key: 'course.view', label: '查看课表' },
  { key: 'course.manage', label: '管理课表' },
  { key: 'share.view', label: '查看课表分享' },
  { key: 'share.manage', label: '管理课表分享' },
  { key: 'subscription.view', label: '查看订阅提醒' },
  { key: 'reminder_log.view', label: '查看提醒日志' },
  { key: 'note.view', label: '查看笔记' },
  { key: 'note.moderate', label: '审核笔记' },
  { key: 'note_share.view', label: '查看笔记分享' },
  { key: 'note_share.manage', label: '管理笔记分享' },
  { key: 'report.view', label: '查看举报' },
  { key: 'report.review', label: '处理举报' },
  { key: 'appeal.view', label: '查看申诉' },
  { key: 'appeal.review', label: '处理申诉' },
  { key: 'feedback.view', label: '查看反馈' },
  { key: 'feedback.review', label: '处理反馈' },
  { key: 'announcement.manage', label: '管理公告' },
  { key: 'content.manage', label: '管理页面内容' },
  { key: 'audit.view', label: '查看审计日志' },
  { key: 'admin.manage', label: '管理管理员账号' },
]

const form = reactive({
  email: '',
  name: '',
  role: 'operator',
  status: 'active',
  password: '',
  permissions: [] as string[],
})

function resetForm() {
  editingId.value = null
  isProtectedEditing.value = false
  form.email = ''
  form.name = ''
  form.role = 'operator'
  form.status = 'active'
  form.password = ''
  form.permissions = []
}

function selectRow(row: any) {
  editingId.value = row.id
  isProtectedEditing.value = !!row.isSystemProtected
  form.email = row.email || ''
  form.name = row.name || ''
  form.role = row.role || 'operator'
  form.status = row.status || 'active'
  form.password = ''
  form.permissions = Array.isArray(row.permissions) ? [...row.permissions] : []
}

async function loadData() {
  loading.value = true
  try {
    const res = await adminAccountApi.getList()
    rows.value = res.data || []
  } finally {
    loading.value = false
  }
}

async function submit() {
  saving.value = true
  try {
    if (editingId.value) {
      await adminAccountApi.update(editingId.value, {
        name: form.name,
        role: form.role,
        status: form.status,
        password: form.password || undefined,
        permissions: form.permissions,
      })
      ElMessage.success('管理员账号已更新')
    } else {
      await adminAccountApi.create({
        email: form.email,
        name: form.name,
        role: form.role,
        status: form.status,
        password: form.password,
        permissions: form.permissions,
      })
      ElMessage.success('管理员账号已创建')
    }

    resetForm()
    await loadData()
  } finally {
    saving.value = false
  }
}

onMounted(loadData)
</script>
