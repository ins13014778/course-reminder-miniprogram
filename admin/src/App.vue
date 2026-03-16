<template>
  <el-container>
    <el-aside width="220px" class="side-nav">
      <div class="brand">课程提醒后台</div>
      <el-menu router :default-active="$route.path">
        <el-menu-item index="/users">用户管理</el-menu-item>
        <el-menu-item index="/courses">课程管理</el-menu-item>
        <el-menu-item index="/imports">导入任务</el-menu-item>
        <el-menu-item index="/reminders">提醒记录</el-menu-item>
        <el-menu-item index="/announcements">公告管理</el-menu-item>
      </el-menu>
    </el-aside>
    <el-main class="main-panel">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
</script>

<style>
body {
  margin: 0;
  background: #f7f8fb;
}

.el-container {
  height: 100vh;
}

.side-nav {
  border-right: 1px solid #e8ebf2;
  background: #fff;
}

.brand {
  padding: 20px 20px 12px;
  font-size: 18px;
  font-weight: 700;
  color: #1f2d3d;
}

.main-panel {
  padding: 24px;
}
</style>
