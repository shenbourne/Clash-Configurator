<template>
  <div class="rule-set-edit-page" v-loading="loading">
    <!-- 左侧导航 -->
    <div class="edit-sidebar">
      <div class="rule-set-title">
        <el-input
          v-model="ruleSetName"
          size="small"
          @blur="saveRuleSetName"
          @keyup.enter="saveRuleSetName"
        >
          <template #prefix>
            <el-icon><Collection /></el-icon>
          </template>
        </el-input>
      </div>
      <el-menu
        :default-active="activeMenu"
        @select="handleMenuSelect"
      >
        <el-menu-item index="basic">
          <el-icon><Setting /></el-icon>
          <span>基本信息</span>
        </el-menu-item>
        <el-menu-item index="rules">
          <el-icon><List /></el-icon>
          <span>规则列表</span>
          <el-badge :value="ruleCount" class="menu-badge" v-if="ruleCount > 0" />
        </el-menu-item>
        <el-menu-item index="preview">
          <el-icon><Edit /></el-icon>
          <span>YAML 编辑</span>
        </el-menu-item>
      </el-menu>
      
      <div class="sidebar-actions">
        <el-button type="primary" @click="handleExport" :loading="exporting">
          <el-icon><Download /></el-icon>
          导出规则集
        </el-button>
      </div>
    </div>
    
    <!-- 右侧内容区 -->
    <div class="edit-content">
      <router-view v-if="ruleSet" />
      <el-empty v-else-if="!loading" description="规则集加载失败" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useRuleSetStore } from '@/stores/ruleSet'

const route = useRoute()
const router = useRouter()
const store = useRuleSetStore()

const loading = ref(false)
const ruleSetName = ref('')
const exporting = ref(false)
const ruleSet = ref(null)

const isNew = computed(() => route.params.id === 'new')

const activeMenu = computed(() => {
  const path = route.path.split('/').pop()
  return path || 'basic'
})

const ruleCount = computed(() => ruleSet.value?.payload?.length || 0)

onMounted(async () => {
  await loadRuleSet()
  store.fetchTags()
})

async function loadRuleSet() {
  if (isNew.value) {
    ruleSet.value = initRuleSet()
    ruleSetName.value = ruleSet.value.name
    return
  }
  
  loading.value = true
  try {
    const data = await store.fetchRuleSet(route.params.id)
    
    const convertedPayload = (data.payload || []).map((r, i) => {
      if (typeof r === 'object' && r !== null) {
        return {
          ...r,
          id: r.id || `rule-${i}-${Date.now()}`
        }
      }
      
      if (typeof r === 'string') {
        return {
          id: `rule-${i}-${Date.now()}`,
          ...parseRuleFromYaml(r, data.behavior)
        }
      }
      
      return { id: `rule-${i}-${Date.now()}`, content: String(r) }
    })
    
    ruleSet.value = {
      ...data,
      payload: convertedPayload
    }
    ruleSetName.value = data.name
  } catch (e) {
    ElMessage.error('加载失败')
    goBack()
  } finally {
    loading.value = false
  }
}

function initRuleSet() {
  return {
    name: '',
    behavior: 'classical',
    description: '',
    tags: [],
    payload: []
  }
}

function parseRuleFromYaml(ruleStr, behavior) {
  if (behavior === 'classical') {
    const parts = ruleStr.split(',').map(p => p.trim())
    if (parts.length >= 2) {
      return {
        type: parts[0],
        content: parts[1]
      }
    }
  }
  
  return { content: ruleStr }
}

function handleMenuSelect(index) {
  router.push(`/rule-sets/${route.params.id}/${index}`)
}

async function saveRuleSetName() {
  if (!ruleSetName.value.trim()) {
    ruleSetName.value = ruleSet.value?.name || '未命名规则集'
    return
  }
  
  if (ruleSetName.value !== ruleSet.value?.name) {
    try {
      await store.updateRuleSet(route.params.id, { name: ruleSetName.value })
      ruleSet.value.name = ruleSetName.value
      ElMessage.success('规则集名称已更新')
    } catch (e) {
      ruleSetName.value = ruleSet.value?.name
    }
  }
}

async function handleExport() {
  if (isNew.value) {
    ElMessage.warning('请先保存规则集后再导出')
    return
  }
  
  exporting.value = true
  try {
    const yamlStr = await store.exportRuleSet(route.params.id)
    downloadYaml(yamlStr, `${ruleSet.value.name}.yaml`)
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

function goBack() {
  router.push('/rule-sets')
}

// 监听路由参数变化
watch(() => route.params.id, () => {
  if (route.params.id) {
    loadRuleSet()
  }
}, { immediate: true })

// 暴露给子组件
provide('ruleSet', ruleSet)
provide('updateRuleSet', (newData) => {
  Object.assign(ruleSet.value, newData)
})
provide('isNew', isNew)
</script>

<script>
import { provide } from 'vue'
import { Collection, Setting, List, Edit, Download } from '@element-plus/icons-vue'
</script>

<style lang="scss" scoped>
.rule-set-edit-page {
  height: 100%;
  display: flex;
  background: #f5f7fa;
  
  .edit-sidebar {
    width: 200px;
    background: #fff;
    border-right: 1px solid #e6e6e6;
    display: flex;
    flex-direction: column;
    
    .rule-set-title {
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
