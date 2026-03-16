 <template>
  <div class="rule-providers">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>规则集合</span>
          <div class="actions">
            <el-button type="primary" size="small" @click="showAddDialog">
              <el-icon><Plus /></el-icon>
              添加规则集合
            </el-button>
          </div>
        </div>
      </template>
      
      <el-empty v-if="!providerList.length" description="暂无规则集合">
        <el-button type="primary" @click="showAddDialog">添加第一个规则集合</el-button>
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
              <el-tag size="small" :type="getTypeTagType(provider.type)">
                {{ getTypeLabel(provider.type) }}
              </el-tag>
              <el-tag size="small" type="warning" v-if="provider.behavior">
                {{ getBehaviorLabel(provider.behavior) }}
              </el-tag>
            </div>
            <div class="provider-actions">
              <el-button link type="primary" @click="editProvider(provider)">编辑</el-button>
              <el-button link type="danger" @click="removeProvider(provider)">删除</el-button>
            </div>
          </div>
          
          <div class="provider-info">
            <!-- 本地规则集类型 -->
            <template v-if="provider.type === 'local'">
              <div class="info-item">
                <span class="label">本地规则集:</span>
                <span class="value">{{ provider.localRuleSet?.name || provider.localRuleSetId }}</span>
              </div>
              <div class="info-item" v-if="provider.localRuleSet?.description">
                <span class="label">描述:</span>
                <span class="value">{{ provider.localRuleSet.description }}</span>
              </div>
            </template>
            
            <!-- HTTP 类型配置 -->
            <template v-else-if="provider.type === 'http'">
              <div class="info-item">
                <span class="label">订阅地址:</span>
                <span class="value url">{{ provider.url }}</span>
              </div>
              <div class="info-item" v-if="provider.interval">
                <span class="label">更新间隔:</span>
                <span class="value">{{ provider.interval }} 秒</span>
              </div>
            </template>
            
            <!-- File 类型配置 -->
            <template v-else-if="provider.type === 'file'">
              <div class="info-item">
                <span class="label">文件路径:</span>
                <span class="value">{{ provider.path }}</span>
              </div>
            </template>
            
            <div class="info-item" v-if="provider.path && provider.type !== 'file'">
              <span class="label">存储路径:</span>
              <span class="value">{{ provider.path }}</span>
            </div>
            
            <div class="info-item" v-if="provider.format">
              <span class="label">格式:</span>
              <span class="value">{{ provider.format.toUpperCase() }}</span>
            </div>
          </div>
        </el-card>
      </div>
    </el-card>
    
    <!-- 添加/编辑规则集合对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingProvider ? '编辑规则集合' : '添加规则集合'"
      width="650px"
      destroy-on-close
    >
      <el-form :model="providerForm" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="名称" prop="name">
          <el-input 
            v-model="providerForm.name" 
            placeholder="请输入规则集合名称"
          />
        </el-form-item>
        
        <el-form-item label="类型" prop="type">
          <el-radio-group v-model="providerForm.type" @change="onTypeChange">
            <el-radio value="local">本地规则集</el-radio>
            <el-radio value="http">HTTP (订阅)</el-radio>
            <el-radio value="file">File (本地文件)</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <!-- 本地规则集选择 -->
        <template v-if="providerForm.type === 'local'">
          <el-form-item label="选择规则集" prop="localRuleSetId">
            <el-select 
              v-model="providerForm.localRuleSetId" 
              placeholder="选择本地规则集"
              style="width: 100%"
              @change="onLocalRuleSetChange"
            >
              <el-option 
                v-for="rs in localRuleSets" 
                :key="rs.id" 
                :label="rs.name" 
                :value="rs.id"
              >
                <div class="rule-set-option">
                  <span class="name">{{ rs.name }}</span>
                  <el-tag size="small" :type="getBehaviorTagType(rs.behavior)">
                    {{ rs.behavior }}
                  </el-tag>
                  <span class="count">{{ rs.payload?.length || 0 }} 条规则</span>
                </div>
              </el-option>
            </el-select>
            <div class="form-tip">
              选择在「规则集合」管理中创建的本地规则集
              <el-link type="primary" @click="$router.push('/rule-sets')">前往管理</el-link>
            </div>
          </el-form-item>
          
          <el-form-item label="行为模式">
            <el-tag :type="getBehaviorTagType(selectedLocalRuleSet?.behavior)">
              {{ selectedLocalRuleSet?.behavior || '自动获取' }}
            </el-tag>
            <span style="margin-left: 8px; color: #909399; font-size: 12px;">
              从规则集自动获取
            </span>
          </el-form-item>
        </template>
        
        <!-- HTTP 类型配置 -->
        <template v-if="providerForm.type === 'http'">
          <el-form-item label="订阅地址" prop="url">
            <el-input v-model="providerForm.url" placeholder="https://example.com/rules.yaml" />
          </el-form-item>
          <el-form-item label="更新间隔">
            <el-input-number v-model="providerForm.interval" :min="0" :step="60" />
            <span style="margin-left: 8px; color: #909399;">秒 (0 表示不自动更新)</span>
          </el-form-item>
        </template>
        
        <!-- File 类型配置 -->
        <template v-if="providerForm.type === 'file'">
          <el-form-item label="文件路径" prop="path">
            <el-input v-model="providerForm.path" placeholder="./profiles/rule/provider.yaml" />
          </el-form-item>
        </template>
        
        <!-- 行为模式（非本地规则集） -->
        <el-form-item label="行为模式" prop="behavior" v-if="providerForm.type !== 'local'">
          <el-select v-model="providerForm.behavior" placeholder="选择行为模式">
            <el-option label="classical (经典模式)" value="classical" />
            <el-option label="domain (域名模式)" value="domain" />
            <el-option label="ipcidr (IP 模式)" value="ipcidr" />
          </el-select>
          <div class="form-tip">
            classical: 完整规则格式; domain: 仅域名规则; ipcidr: 仅 IP 规则
          </div>
        </el-form-item>
        
        <!-- 存储路径 (可选，HTTP类型) -->
        <el-form-item label="存储路径" v-if="providerForm.type === 'http'">
          <el-input 
            v-model="providerForm.storagePath" 
            placeholder="./profiles/rule/provider.yaml"
          />
          <div class="form-tip">规则集合文件的本地存储路径 (可选)</div>
        </el-form-item>
        
        <el-form-item label="格式" v-if="providerForm.type !== 'local'">
          <el-select v-model="providerForm.format" placeholder="选择规则格式">
            <el-option label="YAML" value="yaml" />
            <el-option label="TEXT (MRS)" value="text" />
          </el-select>
          <div class="form-tip">规则文件的格式，默认为 YAML</div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useConfigStore } from '@/stores/config'
import { useRuleSetStore } from '@/stores/ruleSet'

const route = useRoute()
const store = useConfigStore()
const ruleSetStore = useRuleSetStore()

const dialogVisible = ref(false)
const editingProvider = ref(null)
const submitting = ref(false)
const formRef = ref(null)

// 本地规则集列表
const localRuleSets = computed(() => ruleSetStore.ruleSets)

// 选中的本地规则集
const selectedLocalRuleSet = computed(() => {
  if (!providerForm.localRuleSetId) return null
  return localRuleSets.value.find(rs => rs.id === providerForm.localRuleSetId)
})

const providers = computed(() => store.currentConfig?.['rule-providers'] || {})

const providerList = computed(() => {
  return Object.entries(providers.value).map(([name, config]) => ({
    name,
    ...config
  }))
})

const defaultProviderForm = {
  name: '',
  type: 'local',
  behavior: 'classical',
  localRuleSetId: '',
  url: '',
  interval: 86400,
  path: '',
  storagePath: '',
  format: 'yaml'
}

const providerForm = reactive({ ...defaultProviderForm })

const rules = {
  name: [
    { required: true, message: '请输入规则集合名称', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_-]+$/, message: '名称只能包含字母、数字、下划线和连字符', trigger: 'blur' }
  ],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
  behavior: [{ required: true, message: '请选择行为模式', trigger: 'change' }],
  url: [{ required: true, message: '请输入订阅地址', trigger: 'blur' }],
  path: [{ required: true, message: '请输入文件路径', trigger: 'blur' }],
  localRuleSetId: [{ required: true, message: '请选择本地规则集', trigger: 'change' }]
}

function getTypeLabel(type) {
  const labels = {
    'local': '本地',
    'http': 'HTTP',
    'file': 'FILE'
  }
  return labels[type] || type.toUpperCase()
}

function getTypeTagType(type) {
  const types = {
    'local': 'success',
    'http': 'primary',
    'file': 'info'
  }
  return types[type] || ''
}

function getBehaviorLabel(behavior) {
  const labels = {
    'classical': '经典',
    'domain': '域名',
    'ipcidr': 'IP'
  }
  return labels[behavior] || behavior
}

function getBehaviorTagType(behavior) {
  const types = {
    'classical': 'info',
    'domain': 'success',
    'ipcidr': 'warning'
  }
  return types[behavior] || 'info'
}

function showAddDialog() {
  editingProvider.value = null
  Object.assign(providerForm, defaultProviderForm)
  dialogVisible.value = true
}

function editProvider(provider) {
  editingProvider.value = provider
  Object.assign(providerForm, {
    name: provider.name,
    type: provider.type || 'http',
    behavior: provider.behavior || 'classical',
    localRuleSetId: provider.localRuleSetId || '',
    url: provider.url || '',
    interval: provider.interval || 86400,
    path: provider.path || '',
    storagePath: provider.path || '',
    format: provider.format || 'yaml'
  })
  dialogVisible.value = true
}

async function removeProvider(provider) {
  try {
    await ElMessageBox.confirm(
      `确定要删除规则集合「${provider.name}」吗？相关的规则引用也将被移除。`,
      '删除确认',
      { type: 'warning' }
    )
    await store.deleteRuleProvider(route.params.id, provider.name)
    ElMessage.success('规则集合已删除')
  } catch (e) {
    // 取消或错误
  }
}

function onTypeChange() {
  // 重置特定字段
  providerForm.url = ''
  providerForm.path = ''
  providerForm.localRuleSetId = ''
  providerForm.interval = 86400
  providerForm.storagePath = ''
}

function onLocalRuleSetChange() {
  // 本地规则集的行为模式自动从规则集获取
  if (selectedLocalRuleSet.value) {
    providerForm.behavior = selectedLocalRuleSet.value.behavior
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
      type: providerForm.type,
      behavior: providerForm.type === 'local' 
        ? selectedLocalRuleSet.value?.behavior || 'classical'
        : providerForm.behavior
    }
    
    // 本地规则集
    if (providerForm.type === 'local') {
      data.localRuleSetId = providerForm.localRuleSetId
      data.localRuleSet = {
        id: selectedLocalRuleSet.value.id,
        name: selectedLocalRuleSet.value.name,
        behavior: selectedLocalRuleSet.value.behavior,
        description: selectedLocalRuleSet.value.description
      }
    }
    
    // HTTP 类型字段
    if (providerForm.type === 'http') {
      data.url = providerForm.url
      if (providerForm.interval > 0) {
        data.interval = providerForm.interval
      }
      if (providerForm.storagePath) {
        data.path = providerForm.storagePath
      }
    }
    
    // File 类型字段
    if (providerForm.type === 'file') {
      data.path = providerForm.path
    }
    
    // 格式
    if (providerForm.format && providerForm.format !== 'yaml') {
      data.format = providerForm.format
    }
    
    if (editingProvider.value) {
      await store.updateRuleProvider(route.params.id, editingProvider.value.name, data)
      ElMessage.success('规则集合已更新')
    } else {
      await store.addRuleProvider(route.params.id, data)
      ElMessage.success('规则集合已添加')
    }
    
    dialogVisible.value = false
  } catch (e) {
    // 错误已处理
  } finally {
    submitting.value = false
  }
}

// 加载本地规则集列表
onMounted(() => {
  ruleSetStore.fetchRuleSets()
})
</script>

<style lang="scss" scoped>
.rule-providers {
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
          width: 80px;
          flex-shrink: 0;
        }
        
        .value {
          flex: 1;
          
          &.url {
            word-break: break-all;
            color: #409eff;
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
  
  .rule-set-option {
    display: flex;
    align-items: center;
    gap: 8px;
    
    .name {
      font-weight: 500;
    }
    
    .count {
      color: #909399;
      font-size: 12px;
      margin-left: auto;
    }
  }
}
</style>