<template>
  <div class="config-edit-page">
    <!-- 左侧导航 -->
    <div class="edit-sidebar">
      <div class="config-title">
        <el-input
          v-model="configName"
          size="small"
          @blur="saveConfigName"
          @keyup.enter="saveConfigName"
        >
          <template #prefix>
            <el-icon><Setting /></el-icon>
          </template>
        </el-input>
      </div>
      <el-menu
        :default-active="activeMenu"
        @select="handleMenuSelect"
      >
        <el-menu-item index="basic">
          <el-icon><Setting /></el-icon>
          <span>基础配置</span>
        </el-menu-item>
        <el-menu-item index="proxies">
          <el-icon><Connection /></el-icon>
          <span>代理节点</span>
          <el-badge :value="proxyCount" class="menu-badge" v-if="proxyCount > 0" />
        </el-menu-item>
        <el-menu-item index="providers">
          <el-icon><Folder /></el-icon>
          <span>代理集合</span>
          <el-badge :value="providerCount" class="menu-badge" v-if="providerCount > 0" />
        </el-menu-item>
        <el-menu-item index="rule-providers">
          <el-icon><Collection /></el-icon>
          <span>规则集合</span>
          <el-badge :value="ruleProviderCount" class="menu-badge" v-if="ruleProviderCount > 0" />
        </el-menu-item>
        <el-menu-item index="groups">
          <el-icon><Grid /></el-icon>
          <span>代理组</span>
          <el-badge :value="groupCount" class="menu-badge" v-if="groupCount > 0" />
        </el-menu-item>
        <el-menu-item index="rules">
          <el-icon><List /></el-icon>
          <span>规则</span>
          <el-badge :value="ruleCount" class="menu-badge" v-if="ruleCount > 0" />
        </el-menu-item>
        <el-menu-item index="dns">
          <el-icon><Promotion /></el-icon>
          <span>DNS</span>
        </el-menu-item>
        <el-menu-item index="advanced">
          <el-icon><Tools /></el-icon>
          <span>高级配置</span>
        </el-menu-item>
        <el-menu-item index="preview">
           <el-icon><Edit /></el-icon>
           <span>YAML 编辑</span>
         </el-menu-item>
      </el-menu>
      
      <div class="sidebar-actions">
        <el-button type="primary" @click="handleExport" :loading="exporting">
          <el-icon><Download /></el-icon>
          导出配置
        </el-button>
      </div>
    </div>
    
    <!-- 右侧内容区 -->
    <div class="edit-content">
      <router-view v-if="store.currentConfig" />
      <el-empty v-else-if="!store.loading" description="配置加载失败" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useConfigStore } from '@/stores/config'

const route = useRoute()
const router = useRouter()
const store = useConfigStore()

const configName = ref('')
const exporting = ref(false)

const activeMenu = computed(() => {
  const path = route.path.split('/').pop()
  return path || 'basic'
})

const proxyCount = computed(() => store.currentConfig?.proxies?.length || 0)
const groupCount = computed(() => store.currentConfig?.['proxy-groups']?.length || 0)
const providerCount = computed(() => Object.keys(store.currentConfig?.['proxy-providers'] || {}).length)
const ruleProviderCount = computed(() => Object.keys(store.currentConfig?.['rule-providers'] || {}).length)
const ruleCount = computed(() => store.currentConfig?.rules?.length || 0)

onMounted(async () => {
  const id = route.params.id
  if (id) {
    try {
      const config = await store.fetchConfig(id)
      configName.value = config.name
    } catch (e) {
      ElMessage.error('加载配置失败')
      router.push('/configs')
    }
  }
})

watch(() => store.currentConfig, (config) => {
  if (config) {
    configName.value = config.name
  }
})

function handleMenuSelect(index) {
  router.push(`/config/${route.params.id}/${index}`)
}

async function saveConfigName() {
  if (!configName.value.trim()) {
    configName.value = store.currentConfig?.name || '未命名配置'
    return
  }
  
  if (configName.value !== store.currentConfig?.name) {
    try {
      await store.updateConfig(route.params.id, { name: configName.value })
      ElMessage.success('配置名称已更新')
    } catch (e) {
      configName.value = store.currentConfig?.name
    }
  }
}

async function handleExport() {
  exporting.value = true
  try {
    const yaml = await store.exportConfig(route.params.id)
    downloadYaml(yaml, `${store.currentConfig.name}.yaml`)
    ElMessage.success('导出成功')
  } catch (e) {
    // 错误已处理
  } finally {
    exporting.value = false
  }
}

function downloadYaml(content, filename) {
  const blob = new Blob([content], { type: 'text/yaml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
</script>

<style lang="scss" scoped>
.config-edit-page {
  height: 100%;
  display: flex;
  background: #f5f7fa;
  
  .edit-sidebar {
    width: 200px;
    background: #fff;
    border-right: 1px solid #e6e6e6;
    display: flex;
    flex-direction: column;
    
    .config-title {
      padding: 16px;
      border-bottom: 1px solid #e6e6e6;
    }
    
    .el-menu {
      border-right: none;
      flex: 1;
      
      .el-menu-item {
        height: 48px;
        line-height: 48px;
        position: relative;
        
        .el-icon {
          margin-right: 8px;
        }
        
        .menu-badge {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
        }
      }
    }
    
    .sidebar-actions {
      padding: 16px;
      border-top: 1px solid #e6e6e6;
      
      .el-button {
        width: 100%;
      }
    }
  }
  
  .edit-content {
    flex: 1;
    overflow: auto;
    padding: 20px;
  }
}
</style>