<template>
  <div class="login-shell">
    <section class="login-panel">
      <div class="section-kicker">Admin Access</div>
      <h1>后台管理员登录</h1>
      <p class="login-copy">登录后可查看用户、课表、笔记、分享和举报等治理数据，并执行后台管理动作。</p>

      <el-form label-position="top">
        <el-form-item label="管理员账号">
          <el-input v-model="form.email" placeholder="请输入管理员邮箱" />
        </el-form-item>
        <el-form-item label="管理员密码">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="请输入管理员密码"
            @keyup.enter="submit"
          />
        </el-form-item>
        <el-button
          type="primary"
          @click="submit"
          :loading="submitting"
          class="login-button"
        >
          登录后台
        </el-button>
      </el-form>
    </section>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authApi } from '../api'
import { setAdminProfile, setToken } from '../utils/auth'

const route = useRoute()
const submitting = ref(false)
const form = reactive({
  email: '',
  password: '',
})

function getSafeRedirect() {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  if (!redirect || redirect === '/login' || redirect.startsWith('/login?')) {
    return '/overview'
  }
  return redirect
}

async function submit() {
  if (submitting.value) return

  if (!form.email.trim() || !form.password) {
    ElMessage.warning('请输入管理员账号和密码')
    return
  }

  submitting.value = true
  try {
    const res = await authApi.adminLogin({
      email: form.email.trim(),
      password: form.password,
    })

    setToken(res.data.token)
    setAdminProfile(res.data.profile)

    ElMessage.success('管理员登录成功')
    const redirect = getSafeRedirect()
    window.location.href = redirect
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.login-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.login-panel {
  width: min(460px, 100%);
  padding: 28px;
  border-radius: 28px;
  border: 1px solid var(--line-soft);
  background: var(--bg-soft);
  box-shadow: 0 18px 46px rgba(88, 69, 47, 0.08);
}

.login-panel h1 {
  margin: 12px 0 10px;
  font-size: 34px;
  line-height: 1.05;
  font-family: 'Source Serif 4', serif;
}

.login-copy {
  margin: 0 0 20px;
  color: var(--ink-soft);
  line-height: 1.8;
}

.login-button {
  width: 100%;
  margin-top: 8px;
}

@media (max-width: 430px) {
  .login-shell {
    padding: 14px;
    align-items: start;
  }

  .login-panel {
    width: 100%;
    margin-top: calc(18px + env(safe-area-inset-top, 0px));
    padding: 18px 16px;
    border-radius: 22px;
  }

  .login-panel h1 {
    font-size: 28px;
    line-height: 1.08;
  }

  .login-copy {
    font-size: 13px;
    line-height: 1.7;
  }
}
</style>
