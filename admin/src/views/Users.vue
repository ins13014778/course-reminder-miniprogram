<template>
  <div class="editorial-page">
    <section class="hero-panel">
      <div>
        <div class="section-kicker">User Governance</div>
        <h2>统一查看用户状态、批量封禁解封，并保留完整违规档案。</h2>
        <p>这里把账号、笔记、分享、头像、个签五类权限合并在一个治理台里，同时展示用户课表、笔记、分享密钥和累计处罚记录。</p>
      </div>
      <div class="hero-side">
        <strong>{{ users.length }}</strong>
        <div class="muted-text">当前列表用户</div>
      </div>
    </section>

    <section class="panel-card">
      <div class="panel-header">
        <div>
          <div class="panel-title">用户治理列表</div>
          <div class="panel-subtitle">支持关键词搜索、批量权限调整、单用户详情下钻。</div>
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
          <el-button :disabled="!selectedIds.length" @click="openBatchDialog">批量权限</el-button>
        </div>
      </div>

      <div class="muted-text" style="margin-bottom: 12px">已选择 {{ selectedIds.length }} 人</div>

      <div class="editorial-table">
        <el-table :data="users" v-loading="loading" @selection-change="onSelectionChange">
          <el-table-column type="selection" width="52" />
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
            :key="item.key"
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

    <el-dialog v-model="batchDialogVisible" title="批量权限调整" width="520px">
      <el-form label-position="top">
        <el-form-item label="权限类型">
          <el-select v-model="batchForm.permissionKey" style="width: 100%">
            <el-option
              v-for="item in permissionConfigs"
              :key="`batch-${item.key}`"
              :label="item.label"
              :value="item.key"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="操作">
          <el-radio-group v-model="batchForm.mode">
            <el-radio-button label="active">批量解封</el-radio-button>
            <el-radio-button label="banned">批量封禁</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="封禁天数" v-if="batchForm.mode === 'banned'">
          <el-input-number v-model="batchForm.durationDays" :min="1" :disabled="batchForm.permanent" />
          <el-checkbox v-model="batchForm.permanent" style="margin-left: 12px">永久封禁</el-checkbox>
        </el-form-item>
        <el-form-item label="原因">
          <el-input v-model="batchForm.reason" type="textarea" :rows="3" placeholder="填写统一处理原因" />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="toolbar-actions">
          <el-button @click="batchDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="batchSaving" @click="submitBatchPermissions">确认提交</el-button>
        </div>
      </template>
    </el-dialog>

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

        <section class="summary-grid">
          <article class="summary-card">
            <div class="eyebrow">累计处罚</div>
            <div class="value">{{ detail.violationStats?.total || 0 }}</div>
            <div class="meta">历史违规与处置记录总数</div>
          </article>
          <article class="summary-card">
            <div class="eyebrow">当前生效</div>
            <div class="value">{{ detail.violationStats?.active || 0 }}</div>
            <div class="meta">仍处于生效中的处罚记录</div>
          </article>
          <article class="summary-card">
            <div class="eyebrow">已解除</div>
            <div class="value">{{ detail.violationStats?.lifted || 0 }}</div>
            <div class="meta">已完成申诉或恢复的记录</div>
          </article>
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
              <div class="section-kicker">Violation Archive</div>
              <h4>违规档案</h4>
              <div class="muted-text">记录每次封禁、下架、申诉解封等治理动作，方便累计处罚判断。</div>
              <div class="editorial-table" style="margin-top: 14px">
                <el-table :data="detail.violationRecords || []" max-height="280">
                  <el-table-column prop="violation_type" label="类型" width="100" />
                  <el-table-column prop="action_type" label="动作" min-width="120" />
                  <el-table-column prop="record_status" label="状态" width="90" />
                  <el-table-column prop="reason" label="原因" min-width="220" />
                  <el-table-column label="时间" min-width="170">
                    <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
                  </el-table-column>
                </el-table>
              </div>
            </section>

            <section class="surface-card">
              <div class="section-kicker">Schedule</div>
              <h4>用户课表</h4>
              <div class="muted-text">共 {{ detail.courses.length }} 门课，用于核对提醒、分享和导入问题。</div>
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
import { resolveHighRiskConfirmation } from '../utils/high-risk'

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
    shortLabel: '账号',
    tagType: 'danger',
    description: '封禁后用户登录和大多数写入动作都会被拦截。',
    placeholder: '例如：恶意刷接口、确认违规行为',
    buttonText: '保存账号权限',
  },
  {
    key: 'note',
    label: '笔记权限',
    shortLabel: '笔记',
    tagType: 'warning',
    description: '封禁后用户无法发布、编辑、删除笔记。',
    placeholder: '例如：违规笔记、广告引流、恶意刷屏',
    buttonText: '保存笔记权限',
  },
  {
    key: 'share',
    label: '分享权限',
    shortLabel: '分享',
    tagType: 'warning',
    description: '封禁后用户无法生成和使用课表或笔记分享能力。',
    placeholder: '例如：滥用分享、异常传播、违规导入',
    buttonText: '保存分享权限',
  },
  {
    key: 'avatar',
    label: '头像权限',
    shortLabel: '头像',
    tagType: 'warning',
    description: '封禁后用户无法修改头像，用于单独处理头像违规。',
    placeholder: '例如：头像违规、冒用他人、涉黄涉暴',
    buttonText: '保存头像权限',
  },
  {
    key: 'signature',
    label: '个签权限',
    shortLabel: '个签',
    tagType: 'warning',
    description: '封禁后用户无法修改个性签名，用于处理资料违规。',
    placeholder: '例如：个签违规、广告引流、辱骂攻击',
    buttonText: '保存个签权限',
  },
]

const users = ref<any[]>([])
const loading = ref(true)
const keyword = ref('')
const selectedIds = ref<number[]>([])
const drawerVisible = ref(false)
const detailLoading = ref(false)
const detail = ref<any | null>(null)
const selectedUserId = ref<number | null>(null)
const batchDialogVisible = ref(false)
const batchSaving = ref(false)

const permissionForms = reactive<Record<PermissionKey, PermissionFormState>>({
  account: { mode: 'active', durationDays: 7, permanent: false, reason: '' },
  note: { mode: 'active', durationDays: 7, permanent: false, reason: '' },
  share: { mode: 'active', durationDays: 7, permanent: false, reason: '' },
  avatar: { mode: 'active', durationDays: 7, permanent: false, reason: '' },
  signature: { mode: 'active', durationDays: 7, permanent: false, reason: '' },
})

const batchForm = reactive<{
  permissionKey: PermissionKey
  mode: 'active' | 'banned'
  durationDays: number | null
  permanent: boolean
  reason: string
}>({
  permissionKey: 'account',
  mode: 'banned',
  durationDays: 7,
  permanent: false,
  reason: '',
})

function calcRemainingDays(until?: string | null) {
  if (!until) return null
  const time = new Date(until).getTime()
  if (Number.isNaN(time)) return null
  const diff = time - Date.now()
  if (diff <= 0) return 1
  return Math.ceil(diff / (24 * 60 * 60 * 1000))
}

function onSelectionChange(rows: any[]) {
  selectedIds.value = rows.map((item) => Number(item.id))
}

function buildPermissionPayload(key: PermissionKey, source: PermissionFormState) {
  return {
    [key]: {
      mode: source.mode,
      durationDays: source.mode === 'banned' && !source.permanent ? source.durationDays : null,
      reason: source.reason,
    },
  }
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
  const payload = buildPermissionPayload(key, source)
  const extraConfirmation =
    source.mode === 'banned'
      ? await resolveHighRiskConfirmation({
          actionKey: 'user.permissions.update',
          targetType: 'user',
          targetIds: [selectedUserId.value],
          summary: `${key} permission ban`,
        })
      : {}

  await userApi.updatePermissions(selectedUserId.value, {
    ...payload,
    ...extraConfirmation,
  })
  ElMessage.success('权限已更新')
  await refreshSelectedUser()
}

function openBatchDialog() {
  if (!selectedIds.value.length) {
    ElMessage.warning('请先选择用户')
    return
  }
  batchDialogVisible.value = true
}

async function submitBatchPermissions() {
  if (!selectedIds.value.length) {
    ElMessage.warning('请先选择用户')
    return
  }

  batchSaving.value = true
  try {
    const permissions = buildPermissionPayload(batchForm.permissionKey, {
      mode: batchForm.mode,
      durationDays: batchForm.durationDays,
      permanent: batchForm.permanent,
      reason: batchForm.reason,
    })

    const extraConfirmation =
      batchForm.mode === 'banned'
        ? await resolveHighRiskConfirmation({
            actionKey: 'user.permissions.batch',
            targetType: 'user',
            targetIds: selectedIds.value,
            summary: `batch ${batchForm.permissionKey} permission update`,
          })
        : {}

    await userApi.batchUpdatePermissions({
      ids: selectedIds.value,
      permissions,
      ...extraConfirmation,
    })

    ElMessage.success('批量权限已更新')
    batchDialogVisible.value = false
    await loadData()
    if (selectedUserId.value) {
      await refreshSelectedUser()
    }
  } finally {
    batchSaving.value = false
  }
}

onMounted(loadData)
</script>
