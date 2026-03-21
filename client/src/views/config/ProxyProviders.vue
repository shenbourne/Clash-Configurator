<template>
  <div class="proxy-providers">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>代理集合</span>
          <div class="actions">
            <el-button type="primary" size="small" @click="showAddDialog">
              <el-icon><Plus /></el-icon>
              添加代理集合
            </el-button>
          </div>
        </div>
      </template>
      
      <el-empty v-if="!providerList.length" description="暂无代理集合">
        <el-button type="primary" @click="showAddDialog">添加第一个代理集合</el-button>
      </el-empty>
      
      <div v-else class="providers-container">
        <div class="drag-hint">
          <el-icon><Rank /></el-icon>
          <span>拖拽代理集合可调整顺序，拖拽到不同分组可移动代理集合</span>
        </div>
        
        <GroupedContainer
          v-model="proxyProviderGroups"
          draggable-group="proxy-providers"
          content-class="providers-list"
          @change="onGroupsChange"
        >
          <template #item="{ element, groupIndex, itemIndex }">
            <div class="provider-item">
              <div class="drag-handle">
                <el-icon><Rank /></el-icon>
              </div>
              <div class="provider-index">{{ getGlobalIndex(groupIndex, itemIndex) }}</div>
              <div class="provider-main">
                <div class="provider-header">
                  <span class="name">{{ element.name }}</span>
                  <el-tag size="small" :type="element.type === 'http' ? 'primary' : 'success'">
                    {{ element.type?.toUpperCase() || 'HTTP' }}
                  </el-tag>
                </div>
                <div class="provider-info">
                  <template v-if="element.type === 'http'">
                    <span class="info-text url">{{ element.url }}</span>
                    <span class="info-text" v-if="element.interval">
                      更新间隔: {{ element.interval }} 秒
                    </span>
                  </template>
                  
                  <template v-if="element.type === 'file'">
                    <span class="info-text">{{ element.path }}</span>
                  </template>
                  
                  <template v-if="element['health-check']?.enable">
                    <el-tag type="success" size="small">健康检查</el-tag>
                  </template>
                  
                  <template v-if="element.override">
                    <el-tag type="warning" size="small">名称覆盖</el-tag>
                  </template>
                </div>
              </div>
              <div class="provider-actions">
                <el-button link type="primary" @click="editProvider(element)">编辑</el-button>
                <el-button link type="danger" @click="removeProvider(element)">删除</el-button>
              </div>
            </div>
          </template>
        </GroupedContainer>
      </div>
    </el-card>
    
    <!-- 添加/编辑代理集合对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingProvider ? '编辑代理集合' : '添加代理集合'"
      width="650px"
      destroy-on-close
    >
      <el-form :model="providerForm" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="名称" prop="name">
          <el-input
            v-model="providerForm.name"
            placeholder="请输入代理集合名称"
            :disabled="!!editingProvider"
          />
        </el-form-item>
        
        <el-form-item label="类型" prop="type">
          <el-radio-group v-model="providerForm.type" @change="onTypeChange">
            <el-radio value="http">HTTP (订阅)</el-radio>
            <el-radio value="file">File (本地文件)</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <!-- HTTP 类型配置 -->
        <template v-if="providerForm.type === 'http'">
          <el-form-item label="订阅地址" prop="url">
            <el-input v-model="providerForm.url" placeholder="https://example.com/subscription" />
          </el-form-item>
          <el-form-item label="更新间隔">
            <el-input-number v-model="providerForm.interval" :min="0" :step="60" />
            <span style="margin-left: 8px; color: #909399;">秒 (0 表示不自动更新)</span>
          </el-form-item>
        </template>
        
        <!-- File 类型配置 -->
        <template v-if="providerForm.type === 'file'">
          <el-form-item label="文件路径" prop="path">
            <el-input v-model="providerForm.path" placeholder="./profiles/proxy/provider.yaml" />
          </el-form-item>
        </template>
        
        <!-- 存储路径 (可选) -->
        <el-form-item label="存储路径">
          <el-input
            v-model="providerForm.storagePath"
            :placeholder="providerForm.type === 'file' ? '同文件路径' : './profiles/proxy/provider.yaml'"
          />
          <div class="form-tip">代理集合文件的本地存储路径 (可选)</div>
        </el-form-item>
        
        <el-divider content-position="left">健康检查</el-divider>
        
        <el-form-item label="启用">
          <el-switch v-model="providerForm.healthCheckEnable" />
        </el-form-item>
        
        <template v-if="providerForm.healthCheckEnable">
          <el-form-item label="检查 URL">
            <el-input 
              v-model="providerForm.healthCheckUrl" 
              placeholder="http://www.gstatic.com/generate_204"
            />
          </el-form-item>
          <el-form-item label="检查间隔">
            <el-input-number v-model="providerForm.healthCheckInterval" :min="0" :step="60" />
            <span style="margin-left: 8px; color: #909399;">秒</span>
          </el-form-item>
        </template>
        
        <el-divider content-position="left">节点名称覆盖</el-divider>
        
        <el-form-item label="启用覆盖">
          <el-switch v-model="providerForm.overrideEnable" />
        </el-form-item>
        
        <template v-if="providerForm.overrideEnable">
          <el-form-item label="名称前缀">
            <el-input 
              v-model="providerForm.overridePrefix" 
              placeholder="例如: 香港-"
            />
          </el-form-item>
          <el-form-item label="名称后缀">
            <el-input 
              v-model="providerForm.overrideSuffix" 
              placeholder="例如: -01"
            />
          </el-form-item>
          
          <el-divider content-position="left" style="margin: 12px 0;">内容替换</el-divider>
          
          <div class="replace-rules">
            <div class="replace-header">
              <span>替换规则</span>
              <el-button type="primary" size="small" @click="addReplaceRule">
                添加规则
              </el-button>
            </div>
            
            <div 
              v-for="(rule, index) in providerForm.replaceRules" 
              :key="index" 
              class="replace-item"
            >
              <el-input 
                v-model="rule.from" 
                placeholder="要替换的内容（支持正则）"
                style="width: 200px;"
              />
              <span class="arrow">→</span>
              <el-input 
                v-model="rule.to" 
                placeholder="替换为"
                style="width: 200px;"
              />
              <el-button 
                type="danger" 
                size="small" 
                @click="removeReplaceRule(index)"
                :icon="Delete"
                circle
              />
            </div>
            
            <div v-if="!providerForm.replaceRules.length" class="no-rules">
              暂无替换规则
            </div>
          </div>
        </template>
      </el-form>
      
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Rank, Delete } from '@element-plus/icons-vue'
import { useConfigStore } from '@/stores/config'
import GroupedContainer from '@/components/GroupedContainer.vue'

const route = useRoute()
const store = useConfigStore()

const dialogVisible = ref(false)
const editingProvider = ref(null)
const submitting = ref(false)
const formRef = ref(null)

const providers = computed(() => store.currentConfig?.['proxy-providers'] || {})

const providerList = computed(() => {
  return Object.entries(providers.value).map(([name, config]) => ({
    name,
    ...config
  }))
})

// 获取分组信息
const proxyProviderGroups = computed({
  get() {
    const groupsData = store.getFieldGroups('proxy-providers')
    if (groupsData && Array.isArray(groupsData)) {
      // 确保每个 item 都有 id
      return groupsData.map(group => ({
        ...group,
        items: (group.items || []).map((item, index) => ({
          ...item,
          id: item.id || item.name || `provider-${group.name || 'default'}-${index}`
        }))
      }))
    }
    // 如果没有分组信息，将所有代理集合放入默认分组
    const items = providerList.value.map((provider, index) => ({
      ...provider,
      id: provider.name || `provider-${index}`
    }))
    return [{ name: null, collapsed: false, items }]
  },
  set(value) {
    // 更新本地分组数据
    localGroups.value = value
  }
})

// 本地分组数据（用于临时存储修改）
const localGroups = ref([])

// 计算全局索引
function getGlobalIndex(groupIndex, itemIndex) {
  let index = itemIndex + 1
  for (let i = 0; i < groupIndex; i++) {
    index += (proxyProviderGroups.value[i]?.items?.length || 0)
  }
  return index
}

// 分组变更处理
async function onGroupsChange(newGroups) {
  // 如果传入了新数据，直接使用；否则使用本地缓存或 computed 值
  const groupsToSave = newGroups || (localGroups.value.length > 0 ? localGroups.value : proxyProviderGroups.value)
  await saveGroups(groupsToSave)
}

// 保存分组
async function saveGroups(groupsToSave) {
  try {
    // 如果没有传入数据，使用本地缓存或 computed 值
    if (!groupsToSave) {
      groupsToSave = localGroups.value.length > 0 ? localGroups.value : proxyProviderGroups.value
    }
    await store.updateConfigGroups(route.params.id, 'proxy-providers', groupsToSave)
    // 清空本地缓存
    localGroups.value = []
    ElMessage.success('代理集合分组已保存')
  } catch (e) {
    // 错误已处理
  }
}

const defaultProviderForm = {
  name: '',
  type: 'http',
  url: '',
  interval: 3600,
  path: '',
  storagePath: '',
  healthCheckEnable: false,
  healthCheckUrl: 'http://www.gstatic.com/generate_204',
  healthCheckInterval: 300,
  overrideEnable: false,
  overridePrefix: '',
  overrideSuffix: '',
  replaceRules: []
}

const providerForm = reactive({ ...defaultProviderForm })

const rules = {
  name: [
    { required: true, message: '请输入代理集合名称', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_-]+$/, message: '名称只能包含字母、数字、下划线和连字符', trigger: 'blur' }
  ],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  url: [{ required: true, message: '请输入订阅地址', trigger: 'blur' }],
  path: [{ required: true, message: '请输入文件路径', trigger: 'blur' }]
}

function showAddDialog() {
  editingProvider.value = null
  Object.assign(providerForm, defaultProviderForm)
  providerForm.replaceRules = []
  dialogVisible.value = true
}

function editProvider(provider) {
  editingProvider.value = provider
  
  // 解析 override 配置
  const override = provider.override || {}
  const replaceRules = (override['proxy-name'] || []).map(rule => {
    // 格式: "pattern,replacement" 或 "/pattern/,replacement"
    const match = rule.match(/^(.+),(.+)$/)
    if (match) {
      return { from: match[1], to: match[2] }
    }
    return { from: rule, to: '' }
  })
  
  Object.assign(providerForm, {
    name: provider.name,
    type: provider.type,
    url: provider.url || '',
    interval: provider.interval || 3600,
    path: provider.path || '',
    storagePath: provider.path || '',
    healthCheckEnable: provider['health-check']?.enable || false,
    healthCheckUrl: provider['health-check']?.url || 'http://www.gstatic.com/generate_204',
    healthCheckInterval: provider['health-check']?.interval || 300,
    overrideEnable: !!provider.override,
    overridePrefix: override['additional-prefix'] || '',
    overrideSuffix: override['additional-suffix'] || '',
    replaceRules: replaceRules
  })
  dialogVisible.value = true
}

async function removeProvider(provider) {
  try {
    await ElMessageBox.confirm(
      `确定要删除代理集合「${provider.name}」吗？相关的代理组引用也将被移除。`,
      '删除确认',
      { type: 'warning' }
    )
    
    // 从分组中删除
    const newGroups = proxyProviderGroups.value.map(g => ({
      ...g,
      items: (g.items || []).filter(item => item.name !== provider.name)
    }))
    
    await store.updateConfigGroups(route.params.id, 'proxy-providers', newGroups)
    ElMessage.success('代理集合已删除')
  } catch (e) {
    // 取消或错误
  }
}

function onTypeChange() {
  // 重置特定字段
  if (providerForm.type === 'http') {
    providerForm.path = ''
  } else {
    providerForm.url = ''
    providerForm.interval = 0
  }
}

async function submitForm() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  
  submitting.value = true
  
  try {
    const data = {
      name: providerForm.name,
      type: providerForm.type
    }
    
    // HTTP 类型字段
    if (providerForm.type === 'http') {
      data.url = providerForm.url
      if (providerForm.interval > 0) {
        data.interval = providerForm.interval
      }
    }
    
    // File 类型字段
    if (providerForm.type === 'file') {
      data.path = providerForm.path
    }
    
    // 存储路径
    if (providerForm.storagePath && providerForm.type === 'http') {
      data.path = providerForm.storagePath
    }
    
    // 健康检查配置
    if (providerForm.healthCheckEnable) {
      data['health-check'] = {
        enable: true,
        url: providerForm.healthCheckUrl,
        interval: providerForm.healthCheckInterval
      }
    }
    
    // Override 配置
    if (providerForm.overrideEnable) {
      const override = {}
      
      if (providerForm.overridePrefix) {
        override['additional-prefix'] = providerForm.overridePrefix
      }
      
      if (providerForm.overrideSuffix) {
        override['additional-suffix'] = providerForm.overrideSuffix
      }
      
      // 处理替换规则
      const validReplaceRules = providerForm.replaceRules.filter(r => r.from && r.to !== undefined)
      if (validReplaceRules.length > 0) {
        override['proxy-name'] = validReplaceRules.map(r => `${r.from},${r.to}`)
      }
      
      // 只有有配置时才添加 override
      if (Object.keys(override).length > 0) {
        data.override = override
      }
    }
    
    if (editingProvider.value) {
      // 编辑模式：更新分组中的代理集合
      const newGroups = proxyProviderGroups.value.map(g => ({
        ...g,
        items: (g.items || []).map(item => 
          item.name === editingProvider.value.name ? { ...item, ...data } : item
        )
      }))
      await store.updateConfigGroups(route.params.id, 'proxy-providers', newGroups)
      ElMessage.success('代理集合已更新')
    } else {
      // 添加模式：添加到最后一个分组
      const newGroups = [...proxyProviderGroups.value]
      const newProvider = { ...data, id: data.name }
      if (newGroups.length === 0) {
        newGroups.push({ name: null, collapsed: false, items: [newProvider] })
      } else {
        newGroups[newGroups.length - 1] = {
          ...newGroups[newGroups.length - 1],
          items: [...(newGroups[newGroups.length - 1].items || []), newProvider]
        }
      }
      await store.updateConfigGroups(route.params.id, 'proxy-providers', newGroups)
      ElMessage.success('代理集合已添加')
    }
    
    dialogVisible.value = false
  } catch (e) {
    // 错误已处理
  } finally {
    submitting.value = false
  }
}

// 添加替换规则
function addReplaceRule() {
  providerForm.replaceRules.push({ from: '', to: '' })
}

// 删除替换规则
function removeReplaceRule(index) {
  providerForm.replaceRules.splice(index, 1)
}
</script>

<style lang="scss" scoped>
.proxy-providers {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .providers-container {
    .drag-hint {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #909399;
      font-size: 12px;
      margin-bottom: 12px;
    }
  }
  
  .provider-item {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background: #fafafa;
    border-radius: 4px;
    margin-bottom: 8px;
    transition: all 0.2s;
    
    &:hover {
      background: #f0f0f0;
    }
    
    .drag-handle {
      cursor: grab;
      color: #c0c4cc;
      margin-right: 12px;
      display: flex;
      align-items: center;
      
      &:hover {
        color: #909399;
      }
      
      &:active {
        cursor: grabbing;
      }
    }
    
    .provider-index {
      width: 32px;
      color: #909399;
      font-size: 12px;
      text-align: center;
    }
    
    .provider-main {
      flex: 1;
      min-width: 0;
      
      .provider-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
        
        .name {
          font-size: 15px;
          font-weight: 600;
        }
      }
      
      .provider-info {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 12px;
        
        .info-text {
          font-size: 13px;
          color: #606266;
          
          &.url {
            color: #409eff;
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      }
    }
    
    .provider-actions {
      width: 100px;
      text-align: right;
      flex-shrink: 0;
    }
  }
  
  .form-tip {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
  }
  
  .replace-rules {
    .replace-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      
      span {
        font-weight: 500;
        color: #606266;
      }
    }
    
    .replace-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      
      .arrow {
        color: #909399;
        font-size: 16px;
      }
    }
    
    .no-rules {
      color: #909399;
      font-size: 12px;
      text-align: center;
      padding: 12px;
      background: #fafafa;
      border-radius: 4px;
    }
  }
}

// 拖拽样式
.ghost {
  opacity: 0.5;
  background: #f0f0f0;
  border: 1px dashed #dcdfe6;
}
</style>