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
      
      <div v-else class="providers-container">
        <div class="drag-hint">
          <el-icon><Rank /></el-icon>
          <span>拖拽规则集合可调整顺序</span>
        </div>
        <draggable
          v-model="draggableProviders"
          item-key="name"
          handle=".drag-handle"
          animation="200"
          ghost-class="ghost"
          @end="onDragEnd"
        >
          <template #item="{ element, index }">
            <div class="provider-item">
              <div class="drag-handle">
                <el-icon><Rank /></el-icon>
              </div>
              <div class="provider-index">{{ index + 1 }}</div>
              <div class="provider-main">
                <div class="provider-header">
                  <span class="name">{{ element.name }}</span>
                  <el-tag size="small" :type="getTypeTagType(element.type)">
                    {{ getTypeLabel(element.type) }}
                  </el-tag>
                  <el-tag size="small" type="warning" v-if="element.behavior">
                    {{ getBehaviorLabel(element.behavior) }}
                  </el-tag>
                </div>
                <div class="provider-info">
                  <!-- 本地规则集类型 -->
                  <template v-if="element.type === 'local'">
                    <span class="info-text">
                      本地规则集: {{ element.localRuleSet?.name || element.localRuleSetId }}
                    </span>
                    <span class="info-text" v-if="element.localRuleSet?.description">
                      {{ element.localRuleSet.description }}
                    </span>
                  </template>
                  
                  <!-- HTTP 类型配置 -->
                  <template v-else-if="element.type === 'http'">
                    <span class="info-text url">{{ element.url }}</span>
                    <span class="info-text" v-if="element.interval">
                      更新间隔: {{ element.interval }} 秒
                    </span>
                  </template>
                  
                  <!-- File 类型配置 -->
                  <template v-else-if="element.type === 'file'">
                    <span class="info-text">{{ element.path }}</span>
                  </template>
                </div>
              </div>
              <div class="provider-actions">
                <el-button link type="primary" @click="editProvider(element)">编辑</el-button>
                <el-button link type="danger" @click="removeProvider(element)">删除</el-button>
              </div>
            </div>
          </template>
        </draggable>
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
import { Rank } from '@element-plus/icons-vue'
import draggable from 'vuedraggable'
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

// 用于拖拽的响应式数组
const draggableProviders = ref([])

// 监听 providerList 变化，更新 draggableProviders
watch(providerList, (newList) => {
  draggableProviders.value = newList.map((provider, index) => ({
    ...provider,
    id: `provider-${index}-${provider.name}`
  }))
}, { immediate: true, deep: true })

// 拖拽结束处理
async function onDragEnd() {
  await saveProvidersOrder()
}

// 保存规则集合顺序
async function saveProvidersOrder() {
  try {
    // 构建有序的 rule-providers 对象
    const orderedProviders = {}
    draggableProviders.value.forEach(({ id, name, ...rest }) => {
      orderedProviders[name] = rest
    })
    await store.updateRuleProvidersOrder(route.params.id, orderedProviders)
    ElMessage.success('规则集合顺序已更新')
  } catch (e) {
    // 错误已处理
  }
}

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
    align-items: flex-start;
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
      padding-top: 4px;
      
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
      padding-top: 4px;
    }
    
    .provider-main {
      flex: 1;
      min-width: 0;
      
      .provider-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        
        .name {
          font-size: 15px;
          font-weight: 600;
        }
      }
      
      .provider-info {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        
        .info-text {
          font-size: 13px;
          color: #606266;
          
          &.url {
            color: #409eff;
            word-break: break-all;
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
      padding-top: 4px;
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

// 拖拽样式
.ghost {
  opacity: 0.5;
  background: #f0f0f0;
  border: 1px dashed #dcdfe6;
}
</style>