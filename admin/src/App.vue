<template>
  <el-container>
    <el-aside width="200px">
      <el-menu router>
        <el-menu-item index="/users">用户管理</el-menu-item>
        <el-menu-item index="/courses">课程管理</el-menu-item>
        <el-menu-item index="/imports">导入任务</el-menu-item>
        <el-menu-item index="/reminders">提醒记录</el-menu-item>
      </el-menu>
    </el-aside>
    <el-main>
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
</script>

<style>
body { margin: 0; }
.el-container { height: 100vh; }
</style>
