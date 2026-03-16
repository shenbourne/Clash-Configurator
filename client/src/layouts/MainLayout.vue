<template>
  <div class="main-layout">
    <div class="sidebar">
      <div class="logo">
        <el-icon size="24"><Setting /></el-icon>
        <span style="margin-left: 8px;">Clash Config</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
        router
      >
        <el-menu-item index="/configs">
          <el-icon><Folder /></el-icon>
          <span>配置列表</span>
        </el-menu-item>
        <el-menu-item index="/rule-sets">
          <el-icon><List /></el-icon>
          <span>规则集合</span>
        </el-menu-item>
      </el-menu>
    </div>
    <div class="main-container">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { List } from '@element-plus/icons-vue'

const route = useRoute()

const activeMenu = computed(() => {
  if (route.path.startsWith('/config/')) {
    return '/configs'
  }
  if (route.path.startsWith('/rule-sets')) {
    return '/rule-sets'
  }
  return route.path
})
</script>

<style lang="scss" scoped>
.main-layout {
  display: flex;
  height: 100%;
  
  .sidebar {
    width: 220px;
    background: #304156;
    color: #fff;
    flex-shrink: 0;
    
    .logo {
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: bold;
      background: #263445;
      color: #fff;
    }
    
    .el-menu {
      border-right: none;
    }
  }
  
  .main-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
}
</style>