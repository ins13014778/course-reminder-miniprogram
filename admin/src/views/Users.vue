<template>
  <div class="editorial-page">
    <section class="hero-panel">
      <div>
        <div class="section-kicker">User Governance</div>
        <h2>统一查看用户课表、笔记、分享密钥与资料违规状态</h2>
        <p>
          这里可以直接处理账号、笔记、分享、头像、个性签名五类权限限制，并联动查看该用户的课表、
          已发布笔记和分享密钥，方便后台做完整审核。
        </p>
      </div>
      <div class="hero-side">
        <strong>{{ users.length }}</strong>
        <div class="muted-text">已注册用户</div>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-header">
        <div>
          <div class="panel-title">用户治理列表</div>
          <div class="panel-subtitle">支持昵称、学校、专业、OpenID 搜索，并可直接进入用户详情进行权限控制。</div>
        </div>
        <div class="panel-toolbar">
          <el-input
            v-model="keyword"
            placeholder="搜索昵称 / 学校 / 专业 / OpenID"
            clearable
            style="width: 320px"
            @keyup.enter="loadData"
          />
          <el-button type="primary" @click="loadData">查询</el-button>
        </div>
      </div>

      <div class="editorial-table">
        <el-table :data="users" v-loading="loading">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column label="用户" min-width="220">
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
          <el-table-column label="课表" width="80">
            <template #default="{ row }">{{ row.course_count }}</template>
          </el-table-column>
          <el-table-column label="笔记" width="80">
            <template #default="{ row }">{{ row.note_count }}</template>
          </el-table-column>
          <el-table-column label="密钥" width="80">
            <template #default="{ row }">{{ row.share_count }}</template>
          </el-table-column>
          <el-table-column
            v-for="item in permissionConfigs"
            :key="`list-${item.key}`"
            :label="item.shortLabel"
            width="112"
          >
            <template #default="{ row }">
              <el-tag :type="row.permissions[item.key].status === 'banned' ? item.tagType : 'success'">
                {{ row.permissions[item.key].status === 'banned' ? '受限' : '正常' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="注册时间" min-width="170">
            <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" plain @click="openDetail(row)">查看详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>

    <el-drawer v-model="drawerVisible" size="72%" :with-header="false">
      <div v-if="detail" class="stack-grid">
        <section class="surface-card">
          <div class="panel-header" style="margin-bottom: 0">
            <div>
              <div class="section-kicker">User Detail</div>
              <h3>{{ detail.user.nickname || '未命名用户' }}</h3>
              <p>{{ detail.user.signature || '这个用户暂未填写个性签名。' }}</p>
            </div>
            <div class="toolbar-actions">
              <el-tag
                v-for="item in permissionConfigs"
                :key="`detail-${item.key}`"
                :type="detail.user.permissions[item.key].status === 'banned' ? item.tagType : 'success'"
              >
                {{ item.label }}{{ detail.user.permissions[item.key].status === 'banned' ? '受限' : '正常' }}
              </el-tag>
            </div>
          </div>
        </section>

        <section class="detail-meta">
          <div class="detail-item">
            <strong>OpenID</strong>
            <span>{{ detail.user.openid }}</span>
          </div>
          <div class="detail-item">
            <strong>学校 / 专业</strong>
            <span>{{ detail.user.school || '-' }} / {{ detail.user.major || '-' }}</span>
          </div>
          <div class="detail-item">
            <strong>年级</strong>
            <span>{{ detail.user.grade || '-' }}</span>
          </div>
          <div class="detail-item">
            <strong>注册时间</strong>
            <span>{{ formatDateTime(detail.user.created_at) }}</span>
          </div>
        </section>

        <section class="split-grid">
          <div class="stack-grid">
            <div v-for="item in permissionConfigs" :key="item.key" class="permission-card">
              <h4>{{ item.label }}</h4>
              <div class="muted-text">{{ item.description }}</div>
              <el-form label-position="top" style="margin-top: 12px">
                <el-form-item label="状态">
                  <el-radio-group v-model="permissionForms[item.key].mode">
                    <el-radio-button label="active">正常</el-radio-button>
                    <el-radio-button label="banned">封禁</el-radio-button>
                  </el-radio-group>
                </el-form-item>
                <el-form-item label="封禁天数">
                  <el-input-number
                    v-model="permissionForms[item.key].durationDays"
                    :min="1"
                    :disabled="permissionForms[item.key].mode !== 'banned' || permissionForms[item.key].permanent"
                  />
                  <el-checkbox v-model="permissionForms[item.key].permanent" style="margin-left: 12px">
                    永久封禁
                  </el-checkbox>
                </el-form-item>
                <el-form-item label="原因">
                  <el-input v-model="permissionForms[item.key].reason" :placeholder="item.placeholder" />
                </el-form-item>
                <el-button type="primary" @click="savePermission(item.key)">{{ item.buttonText }}</el-button>
              </el-form>
            </div>
          </div>

          <div class="stack-grid">
            <section class="surface-card">
              <div class="section-kicker">Schedule</div>
              <h4>用户课表</h4>
              <div class="muted-text">共 {{ detail.courses.length }} 门课，可直接核查该用户的完整课表。</div>
              <div class="editorial-table" style="margin-top: 14px">
                <el-table :data="detail.courses" max-height="280">
                  <el-table-column prop="course_name" label="课程" min-width="160" />
                  <el-table-column label="时间" min-width="120">
                    <template #default="{ row }">
                      {{ weekdayLabel(row.weekday) }} / {{ sectionLabel(row.start_section, row.end_section) }}
                    </template>
                  </el-table-column>
                  <el-table-column prop="location" label="教室" min-width="140" />
                </el-table>
              </div>
            </section>

            <section class="surface-card">
              <div class="section-kicker">Notes</div>
              <h4>用户笔记</h4>
              <div class="muted-text">共 {{ detail.notes.length }} 条，可辅助判断笔记权限是否需要继续限制。</div>
              <div class="editorial-table" style="margin-top: 14px">
                <el-table :data="detail.notes" max-height="220">
                  <el-table-column label="状态" width="90">
                    <template #default="{ row }">
                      <el-tag :type="row.status === 'blocked' ? 'danger' : 'success'">
                        {{ row.status === 'blocked' ? '已下架' : '正常' }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column label="内容" min-width="220">
                    <template #default="{ row }">{{ trimText(row.content, 60) }}</template>
                  </el-table-column>
                </el-table>
              </div>
            </section>

            <section class="surface-card">
              <div class="section-kicker">Share Keys</div>
              <h4>分享密钥</h4>
              <div class="muted-text">共 {{ detail.shareKeys.length }} 条，可判断是否需要同步禁用单个分享密钥。</div>
              <div class="editorial-table" style="margin-top: 14px">
                <el-table :data="detail.shareKeys" max-height="220">
                  <el-table-column prop="share_key" label="密钥" min-width="140" />
                  <el-table-column label="状态" width="90">
                    <template #default="{ row }">
                      <el-tag :type="row.status === 'blocked' ? 'danger' : 'success'">
                        {{ row.status === 'blocked' ? '停用' : '正常' }}
                      </el-tag>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </section>
          </div>
        </section>
      </div>
      <el-skeleton v-else-if="detailLoading" :rows="10" animated />
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { userApi } from '../api'
import { formatDateTime, sectionLabel, trimText, weekdayLabel } from '../utils/format'

type PermissionKey = 'account' | 'note' | 'share' | 'avatar' | 'signature'

type PermissionFormState = {
  mode: 'active' | 'banned'
  durationDays: number | null
  permanent: boolean
  reason: string
}

const permissionConfigs: Array<{
  key: PermissionKey
  label: string
  shortLabel: string
  tagType: 'danger' | 'warning'
  description: string
  placeholder: string
  buttonText: string
}> = [
  {
    key: 'account',
    label: '账号权限',
    shortLabel: '账号权限',
    tagType: 'danger',
    description: '封禁后，用户登录与绝大多数写入操作都会被拦截。',
    placeholder: '例如：恶意刷接口、违规行为、确认封号',
    buttonText: '保存账号权限',
  },
  {
    key: 'note',
    label: '笔记权限',
    shortLabel: '笔记权限',
    tagType: 'warning',
    description: '封禁后，用户将无法发布、编辑、删除笔记。',
    placeholder: '例如：违规笔记、广告引流、恶意刷屏',
    buttonText: '保存笔记权限',
  },
  {
    key: 'share',
    label: '分享密钥权限',
    shortLabel: '密钥权限',
    tagType: 'warning',
    description: '封禁后，用户无法生成、查询或使用分享密钥导入课表。',
    placeholder: '例如：分享滥用、异常导入、批量传播',
    buttonText: '保存密钥权限',
  },
  {
    key: 'avatar',
    label: '头像权限',
    shortLabel: '头像权限',
    tagType: 'warning',
    description: '封禁后，用户无法重新上传或修改头像，可用于单独处理头像违规。',
    placeholder: '例如：头像违规、冒名他人、涉黄涉暴',
    buttonText: '保存头像权限',
  },
  {
    key: 'signature',
    label: '个性签名权限',
    shortLabel: '个签权限',
    tagType: 'warning',
    description: '封禁后，用户无法修改个性签名，可用于单独处理资料文案违规。',
    placeholder: '例如：个性签名违规、广告引流、辱骂攻击',
    buttonText: '保存个签权限',
  },
]

const users = ref<any[]>([])
const loading = ref(true)
const keyword = ref('')
const drawerVisible = ref(false)
const detailLoading = ref(false)
const detail = ref<any | null>(null)
const selectedUserId = ref<number | null>(null)

const permissionForms = reactive<Record<PermissionKey, PermissionFormState>>({
  account: { mode: 'active', durationDays: 7, permanent: false, reason: '' },
  note: { mode: 'active', durationDays: 7, permanent: false, reason: '' },
  share: { mode: 'active', durationDays: 7, permanent: false, reason: '' },
  avatar: { mode: 'active', durationDays: 7, permanent: false, reason: '' },
  signature: { mode: 'active', durationDays: 7, permanent: false, reason: '' },
})

function calcRemainingDays(until?: string | null) {
  if (!until) return null
  const time = new Date(until).getTime()
  if (Number.isNaN(time)) return null
  const diff = time - Date.now()
  if (diff <= 0) return 1
  return Math.ceil(diff / (24 * 60 * 60 * 1000))
}

function syncPermissionForms() {
  if (!detail.value) return

  permissionConfigs.forEach(({ key }) => {
    const source = detail.value.user.permissions[key]
    permissionForms[key].mode = source.status === 'banned' ? 'banned' : 'active'
    permissionForms[key].permanent = source.status === 'banned' && !source.bannedUntil
    permissionForms[key].durationDays =
      source.status === 'banned' && source.bannedUntil ? calcRemainingDays(source.bannedUntil) : 7
    permissionForms[key].reason = source.reason || ''
  })
}

async function loadData() {
  loading.value = true
  try {
    const res = await userApi.getList({ keyword: keyword.value || undefined })
    users.value = res.data || []
  } finally {
    loading.value = false
  }
}

async function openDetail(row: any) {
  drawerVisible.value = true
  detailLoading.value = true
  selectedUserId.value = row.id
  try {
    const res = await userApi.getDetail(row.id)
    detail.value = res.data
    syncPermissionForms()
  } finally {
    detailLoading.value = false
  }
}

async function refreshSelectedUser() {
  if (!selectedUserId.value) return
  const res = await userApi.getDetail(selectedUserId.value)
  detail.value = res.data
  syncPermissionForms()
  await loadData()
}

async function savePermission(key: PermissionKey) {
  if (!selectedUserId.value) return

  const source = permissionForms[key]
  const payload = {
    [key]: {
      mode: source.mode,
      durationDays: source.mode === 'banned' && !source.permanent ? source.durationDays : null,
      reason: source.reason,
    },
  }

  await userApi.updatePermissions(selectedUserId.value, payload)
  ElMessage.success('权限已更新')
  await refreshSelectedUser()
}

onMounted(loadData)
</script>
