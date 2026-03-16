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
      
      <div v-else class="provider-list">
        <el-card 
          v-for="provider in providerList" 
          :key="provider.name"
          class="provider-card"
          shadow="hover"
        >
          <div class="provider-header">
            <div class="provider-title">
              <span class="name">{{ provider.name }}</span>
              <el-tag size="small" :type="provider.type === 'http' ? 'primary' : 'success'">
                {{ provider.type.toUpperCase() }}
              </el-tag>
            </div>
            <div class="provider-actions">
              <el-button link type="primary" @click="editProvider(provider)">编辑</el-button>
              <el-button link type="danger" @click="removeProvider(provider)">删除</el-button>
            </div>
          </div>
          
          <div class="provider-info">
            <template v-if="provider.type === 'http'">
              <div class="info-item">
                <span class="label">订阅地址:</span>
                <span class="value url">{{ provider.url }}</span>
              </div>
              <div class="info-item" v-if="provider.interval">
                <span class="label">更新间隔:</span>
                <span class="value">{{ provider.interval }} 秒</span>
              </div>
            </template>
            
            <template v-if="provider.type === 'file'">
              <div class="info-item">
                <span class="label">文件路径:</span>
                <span class="value">{{ provider.path }}</span>
              </div>
            </template>
            
            <div class="info-item" v-if="provider.path">
              <span class="label">存储路径:</span>
              <span class="value">{{ provider.path }}</span>
            </div>
            
            <div class="info-item health-check" v-if="provider['health-check']?.enable">
              <el-tag type="success" size="small">健康检查已启用</el-tag>
              <span class="health-interval">间隔: {{ provider['health-check'].interval || 300 }} 秒</span>
            </div>
            <div class="info-item" v-else>
              <el-tag type="info" size="small">健康检查未启用</el-tag>
            </div>
            
            <!-- Override 配置显示 -->
            <template v-if="provider.override">
              <div class="info-item override-info">
                <el-tag type="warning" size="small">节点名称覆盖已启用</el-tag>
              </div>
              <div class="info-item" v-if="provider.override['additional-prefix']">
                <span class="label">名称前缀:</span>
                <span class="value">{{ provider.override['additional-prefix'] }}</span>
              </div>
              <div class="info-item" v-if="provider.override['additional-suffix']">
                <span class="label">名称后缀:</span>
                <span class="value">{{ provider.override['additional-suffix'] }}</span>
              </div>
              <template v-if="provider.override['proxy-name']?.length">
                <div class="info-item">
                  <span class="label">替换规则:</span>
                  <div class="replace-list">
                    <span 
                      v-for="(rule, idx) in provider.override['proxy-name']" 
                      :key="idx" 
                      class="replace-tag"
                    >
                      {{ rule }}
                    </span>
                  </div>
                </div>
              </template>
            </template>
          </div>
        </el-card>
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
            v-model="providerForm.path"
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
import { ref, computed, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import { useConfigStore } from '@/stores/config'

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

const defaultProviderForm = {
  name: '',
  type: 'http',
  url: '',
  interval: 3600,
  path: '',
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
    await store.deleteProxyProvider(route.params.id, provider.name)
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
    if (providerForm.path && providerForm.type === 'http') {
      data.path = providerForm.path
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
      await store.updateProxyProvider(route.params.id, editingProvider.value.name, data)
      ElMessage.success('代理集合已更新')
    } else {
      await store.addProxyProvider(route.params.id, data)
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
  
  .provider-list {
    display: grid;
    gap: 16px;
  }
  
  .provider-card {
    .provider-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      
      .provider-title {
        display: flex;
        align-items: center;
        gap: 8px;
        
        .name {
          font-size: 16px;
          font-weight: 600;
        }
      }
    }
    
    .provider-info {
      .info-item {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
        
        .label {
          color: #909399;
          margin-right: 8px;
          min-width: 70px;
        }
        
        .value {
          color: #303133;
          
          &.url {
            max-width: 400px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
        
        &.health-check, &.override-info {
          margin-top: 8px;
          
          .health-interval {
            margin-left: 8px;
            color: #909399;
            font-size: 12px;
          }
        }
        
        .replace-list {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          
          .replace-tag {
            background: #f0f0f0;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            color: #606266;
          }
        }
      }
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
</style>