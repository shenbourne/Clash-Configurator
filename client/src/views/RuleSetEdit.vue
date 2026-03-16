<template>
  <div class="rule-set-edit" v-loading="loading">
    <template v-if="ruleSet">
      <!-- 顶部操作栏 - 固定 -->
      <div class="page-header">
        <div class="title-section">
          <el-button link @click="goBack">
            <el-icon><ArrowLeft /></el-icon>
            返回列表
          </el-button>
          <h2>{{ isNew ? '创建规则集' : '编辑规则集' }}</h2>
        </div>
        <div class="actions">
          <el-radio-group v-model="editMode" size="small" style="margin-right: 12px">
            <el-radio-button value="visual">可视化编辑</el-radio-button>
            <el-radio-button value="yaml">YAML 编辑</el-radio-button>
          </el-radio-group>
          <el-button @click="save" type="primary" :loading="saving">
            <el-icon><Check /></el-icon>
            保存
          </el-button>
          <el-button @click="exportYaml" :disabled="!ruleSet.name">
            <el-icon><Download /></el-icon>
            导出
          </el-button>
        </div>
      </div>
      
      <!-- 可视化编辑模式 -->
      <template v-if="editMode === 'visual'">
        <!-- 基本信息 -->
        <el-card class="info-card">
          <template #header>
            <div class="card-header">
              <span>基本信息</span>
            </div>
          </template>
          <el-form :model="ruleSet" :rules="rules" ref="formRef" label-width="100px">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="名称" prop="name">
                  <el-input v-model="ruleSet.name" placeholder="规则集名称" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="行为模式" prop="behavior">
                  <el-select v-model="ruleSet.behavior" @change="onBehaviorChange" style="width: 100%">
                    <el-option label="Classical (经典模式)" value="classical" />
                    <el-option label="Domain (域名模式)" value="domain" />
                    <el-option label="IPCIDR (IP模式)" value="ipcidr" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            
            <el-form-item label="描述">
              <el-input v-model="ruleSet.description" type="textarea" :rows="2" placeholder="规则集描述（可选）" />
            </el-form-item>
            
            <el-form-item label="标签">
              <TagSelector v-model="ruleSet.tags" />
              <el-button link type="primary" @click="showTagManager" style="margin-left: 8px">
                管理标签
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
        
        <!-- 规则列表 -->
        <el-card class="rules-card">
          <template #header>
            <div class="card-header">
              <span>规则列表 ({{ ruleSet.payload?.length || 0 }} 条)</span>
              <div class="header-actions">
                <el-button size="small" @click="batchAddVisible = true">
                  <el-icon><Document /></el-icon>
                  批量添加
                </el-button>
              </div>
            </div>
          </template>
          
          <!-- 添加规则区域 -->
          <div class="add-rule-section">
            <!-- Classical 模式：可视化添加 -->
            <template v-if="ruleSet.behavior === 'classical'">
              <el-select v-model="newRuleType" placeholder="规则类型" style="width: 180px">
                <el-option-group label="域名规则">
                  <el-option label="DOMAIN (完整域名)" value="DOMAIN" />
                  <el-option label="DOMAIN-SUFFIX (域名后缀)" value="DOMAIN-SUFFIX" />
                  <el-option label="DOMAIN-KEYWORD (域名关键词)" value="DOMAIN-KEYWORD" />
                </el-option-group>
                <el-option-group label="IP 规则">
                  <el-option label="IP-CIDR" value="IP-CIDR" />
                  <el-option label="IP-CIDR6 (IPv6)" value="IP-CIDR6" />
                  <el-option label="SRC-IP-CIDR (源IP)" value="SRC-IP-CIDR" />
                  <el-option label="GEOIP (地理位置)" value="GEOIP" />
                  <el-option label="GEOSITE (地理位置站点)" value="GEOSITE" />
                  <el-option label="ASN" value="IP-ASN" />
                </el-option-group>
                <el-option-group label="端口规则">
                  <el-option label="DST-PORT (目标端口)" value="DST-PORT" />
                  <el-option label="SRC-PORT (源端口)" value="SRC-PORT" />
                </el-option-group>
                <el-option-group label="其他规则">
                  <el-option label="PROCESS-NAME (进程名)" value="PROCESS-NAME" />
                  <el-option label="PROCESS-PATH (进程路径)" value="PROCESS-PATH" />
                  <el-option label="RULE-SET (规则集)" value="RULE-SET" />
                  <el-option label="MATCH (匹配所有)" value="MATCH" />
                </el-option-group>
              </el-select>
              <el-input
                v-model="newRuleContent"
                :placeholder="ruleContentPlaceholder"
                style="flex: 1; min-width: 200px"
                @keyup.enter="addRule"
                :class="{ 'is-error': newRuleContent && !isRuleContentValid }"
              />
              <el-button type="primary" @click="addRule" :disabled="!canAddRule">
                <el-icon><Plus /></el-icon>
                添加
              </el-button>
            </template>
            <!-- Domain/IPCIDR 模式：简单输入 -->
            <template v-else>
              <el-input
                v-model="newRuleContent"
                :placeholder="ruleSet.behavior === 'domain' ? '输入域名，如 google.com' : '输入 IP/CIDR，如 192.168.1.0/24'"
                style="flex: 1; min-width: 200px"
                @keyup.enter="addRule"
                :class="{ 'is-error': newRuleContent && !isRuleContentValid }"
              />
              <el-button type="primary" @click="addRule" :disabled="!canAddRule">
                <el-icon><Plus /></el-icon>
                添加
              </el-button>
            </template>
          </div>
          
          <div class="rules-tip" v-if="ruleSet.behavior !== 'classical'">
            <el-alert type="info" :closable="false">
              {{ ruleSet.behavior === 'domain' ? 'Domain 模式：每行只包含域名，不需要 DOMAIN-SUFFIX 前缀' : 'IPCIDR 模式：每行只包含 IP 或 CIDR，不需要 IP-CIDR 前缀' }}
            </el-alert>
          </div>
          
          <div class="rules-toolbar" v-if="ruleSet.payload?.length > 0">
            <el-checkbox v-model="selectAll" @change="toggleSelectAll">全选</el-checkbox>
            <el-button v-if="selectedRules.length > 0" type="danger" link @click="deleteSelected">
              删除选中 ({{ selectedRules.length }})
            </el-button>
          </div>
          
          <el-empty v-if="!ruleSet.payload || ruleSet.payload.length === 0" description="暂无规则">
            <el-button type="primary" @click="batchAddVisible = true">批量添加规则</el-button>
          </el-empty>
          
          <div v-else class="rules-container">
            <div class="drag-hint">
              <el-icon><Rank /></el-icon>
              <span>拖拽规则可调整顺序</span>
            </div>
            <draggable
              v-model="ruleSet.payload"
              item-key="id"
              handle=".drag-handle"
              animation="200"
              ghost-class="ghost"
              class="rules-list"
            >
              <template #item="{ element, index }">
                <div class="rule-item">
                  <div class="drag-handle">
                    <el-icon><Rank /></el-icon>
                  </div>
                  <el-checkbox 
                    v-model="selectedRules"
                    :label="element.id"
                    @change="updateSelectAll"
                  />
                  <div class="rule-index">{{ index + 1 }}</div>
                  <div class="rule-type" v-if="ruleSet.behavior === 'classical'">
                    <el-tag size="small">{{ element.type }}</el-tag>
                  </div>
                  <div class="rule-value">{{ element.content }}</div>
                  <div class="rule-actions">
                    <el-button link type="danger" @click="deleteRule(index)">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </div>
              </template>
            </draggable>
          </div>
        </el-card>
      </template>
      
      <!-- YAML 编辑模式 -->
      <template v-else>
        <el-card class="yaml-card">
          <template #header>
            <div class="card-header">
              <span>YAML 编辑</span>
              <div class="header-actions">
                <el-button size="small" @click="formatYaml">
                  <el-icon><Document /></el-icon>
                  格式化
                </el-button>
                <el-button size="small" @click="resetYaml" type="warning">
                  重置
                </el-button>
              </div>
            </div>
          </template>
          <el-input
            v-model="yamlContent"
            type="textarea"
            :rows="25"
            placeholder="在此编辑 YAML 内容..."
            class="yaml-editor"
          />
          <div class="yaml-tip">
            <el-alert type="info" :closable="false">
              <template #title>
                <span>提示：YAML 格式编辑规则集，切换回可视化编辑时会自动解析内容。注释行（以 # 开头）会被保留。</span>
              </template>
            </el-alert>
          </div>
        </el-card>
      </template>
      
      <!-- 批量添加对话框 -->
      <el-dialog
        v-model="batchAddVisible"
        title="批量添加规则"
        width="600px"
        destroy-on-close
      >
        <el-alert type="info" :closable="false" style="margin-bottom: 16px">
          <template #title>
            <span v-if="ruleSet.behavior === 'classical'">
              每行一条规则，格式：规则类型,规则内容<br/>
              例如：DOMAIN-SUFFIX,google.com 或 IP-CIDR,127.0.0.0/8
            </span>
            <span v-else-if="ruleSet.behavior === 'domain'">
              每行一个域名，无需前缀<br/>
              例如：google.com
            </span>
            <span v-else-if="ruleSet.behavior === 'ipcidr'">
              每行一个 IP 或 CIDR，无需前缀<br/>
              例如：192.168.1.0/24
            </span>
          </template>
        </el-alert>
        
        <el-input
          v-model="batchRules"
          type="textarea"
          rows="15"
          placeholder="每行一条规则"
        />
        
        <template #footer>
          <el-button @click="batchAddVisible = false">取消</el-button>
          <el-button type="primary" @click="batchAdd" :disabled="!batchRules.trim()">
            添加
          </el-button>
        </template>
      </el-dialog>
      
      <!-- 标签管理对话框 -->
      <TagManager v-model="tagManagerVisible" @refresh="refreshTags" />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Check, Download, Plus, Delete, Document, Rank } from '@element-plus/icons-vue'
import draggable from 'vuedraggable'
import yaml from 'js-yaml'
import { useRuleSetStore } from '@/stores/ruleSet'
import TagSelector from '@/components/rule-set/TagSelector.vue'
import TagManager from '@/components/rule-set/TagManager.vue'

const route = useRoute()
const router = useRouter()
const store = useRuleSetStore()

// 状态
const loading = ref(false)
const saving = ref(false)
const isNew = computed(() => route.params.id === 'new')
const ruleSet = ref(null)
const formRef = ref(null)

// 编辑模式
const editMode = ref('visual') // 'visual' | 'yaml'
const yamlContent = ref('')

// 规则操作
const newRuleType = ref('DOMAIN-SUFFIX')
const newRuleContent = ref('')
const selectedRules = ref([])
const selectAll = ref(false)
const batchAddVisible = ref(false)
const batchRules = ref('')
const tagManagerVisible = ref(false)

// 规则内容占位符
const ruleContentPlaceholder = computed(() => {
  const placeholders = {
    'DOMAIN': '完整域名，如 www.google.com',
    'DOMAIN-SUFFIX': '域名后缀，如 google.com',
    'DOMAIN-KEYWORD': '域名关键词，如 google',
    'IP-CIDR': 'IP/CIDR，如 192.168.1.0/24',
    'IP-CIDR6': 'IPv6/CIDR，如 2001:db8::/32',
    'SRC-IP-CIDR': '源 IP/CIDR，如 192.168.1.1',
    'GEOIP': '国家/地区代码，如 CN',
    'GEOSITE': 'Geosite 名称，如 cn',
    'IP-ASN': 'ASN 编号，如 13335',
    'DST-PORT': '目标端口，如 80 或 443',
    'SRC-PORT': '源端口，如 8080',
    'PROCESS-NAME': '进程名称，如 chrome.exe',
    'PROCESS-PATH': '进程路径，如 /usr/bin/curl',
    'RULE-SET': '规则集名称，如 google',
    'MATCH': '无需输入内容'
  }
  return placeholders[newRuleType.value] || '输入规则内容'
})

// 规则内容验证函数
function validateRuleContent(type, content) {
  if (!content || !content.trim()) return false
  
  const trimmed = content.trim()
  const portRegex = /^\d{1,5}$/
  
  switch (type) {
    case 'DOMAIN':
    case 'DOMAIN-SUFFIX':
    case 'DOMAIN-KEYWORD':
    case 'IP-CIDR':
    case 'SRC-IP-CIDR':
    case 'IP-CIDR6':
    case 'GEOIP':
    case 'GEOSITE':
    case 'PROCESS-NAME':
    case 'PROCESS-PATH':
    case 'RULE-SET':
      return trimmed.length > 0
    case 'IP-ASN':
      return /^\d+$/.test(trimmed)
    case 'DST-PORT':
    case 'SRC-PORT':
      const port = parseInt(trimmed)
      return portRegex.test(trimmed) && port >= 0 && port <= 65535
    case 'MATCH':
      return true
    default:
      return trimmed.length > 0
  }
}

// 规则内容是否有效
const isRuleContentValid = computed(() => {
  if (!newRuleContent.value) return false
  
  if (ruleSet.value?.behavior === 'classical') {
    return validateRuleContent(newRuleType.value, newRuleContent.value)
  } else if (ruleSet.value?.behavior === 'domain' || ruleSet.value?.behavior === 'ipcidr') {
    return newRuleContent.value.trim().length > 0
  }
  
  return false
})

// 是否可以添加规则
const canAddRule = computed(() => {
  if (!newRuleContent.value || !newRuleContent.value.trim()) return false
  return isRuleContentValid.value
})

// 表单验证规则
const rules = {
  name: [{ required: true, message: '请输入规则集名称', trigger: 'blur' }],
  behavior: [{ required: true, message: '请选择行为模式', trigger: 'change' }]
}

// 初始化规则集数据
function initRuleSet() {
  return {
    name: '',
    behavior: 'classical',
    description: '',
    tags: [],
    payload: []
  }
}

// 生成 YAML 内容
function generateYaml() {
  if (!ruleSet.value) return ''
  
  const data = {
    payload: ruleSet.value.payload.map(r => {
      if (ruleSet.value.behavior === 'classical') {
        return `${r.type},${r.content}`
      }
      return r.content
    })
  }
  
  // 添加元数据注释
  const metaComments = `# Rule Set: ${ruleSet.value.name}
# Behavior: ${ruleSet.value.behavior}
# Description: ${ruleSet.value.description || 'N/A'}
# Tags: ${ruleSet.value.tags?.map(t => t.name).join(', ') || 'None'}

`
  
  try {
    return metaComments + yaml.dump(data, { 
      indent: 2, 
      lineWidth: -1,
      quotingType: '"',
      forceQuotes: false
    })
  } catch (e) {
    return ''
  }
}

// 解析 YAML 内容
function parseYaml() {
  try {
    const parsed = yaml.load(yamlContent.value)
    if (parsed && parsed.payload) {
      const newPayload = parsed.payload.map((r, i) => {
        if (ruleSet.value.behavior === 'classical') {
          const parts = String(r).split(',')
          return {
            id: `rule-${i}-${Date.now()}`,
            type: parts[0] || '',
            content: parts[1] || ''
          }
        }
        return {
          id: `rule-${i}-${Date.now()}`,
          content: String(r)
        }
      })
      ruleSet.value.payload = newPayload
      return true
    }
  } catch (e) {
    ElMessage.error('YAML 格式错误: ' + e.message)
    return false
  }
  return false
}

// 格式化 YAML
function formatYaml() {
  yamlContent.value = generateYaml()
}

// 重置 YAML
function resetYaml() {
  yamlContent.value = generateYaml()
}

// 监听编辑模式切换
watch(editMode, (newMode, oldMode) => {
  if (newMode === 'yaml' && ruleSet.value) {
    yamlContent.value = generateYaml()
  } else if (newMode === 'visual' && yamlContent.value) {
    parseYaml()
  }
})

// 加载规则集
async function loadRuleSet() {
  if (isNew.value) {
    ruleSet.value = initRuleSet()
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
  } catch (e) {
    ElMessage.error('加载失败')
    goBack()
  } finally {
    loading.value = false
  }
}

// 从 YAML 字符串解析规则对象
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

// 保存规则集
async function save() {
  // 如果是 YAML 模式，先解析 YAML
  if (editMode.value === 'yaml') {
    if (!parseYaml()) {
      return
    }
  }
  
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  
  saving.value = true
  try {
    const data = {
      ...ruleSet.value,
      payload: ruleSet.value.payload.map(r => {
        const { id, ...rest } = r
        return rest
      })
    }
    
    if (isNew.value) {
      const created = await store.createRuleSet(data)
      ElMessage.success('创建成功')
      router.replace(`/rule-sets/${created.id}`)
    } else {
      await store.updateRuleSet(route.params.id, data)
      ElMessage.success('保存成功')
    }
  } catch (e) {
    // 错误已处理
  } finally {
    saving.value = false
  }
}

// 导出 YAML
async function exportYaml() {
  try {
    if (isNew.value) {
      ElMessage.warning('请先保存规则集后再导出')
      return
    }
    
    const yamlStr = await store.exportRuleSet(route.params.id)
    downloadYaml(yamlStr, `${ruleSet.value.name}.yaml`)
    ElMessage.success('导出成功')
  } catch (e) {
    // 错误已处理
  }
}

// 行为模式变更
function onBehaviorChange() {
  ruleSet.value.payload = []
  selectedRules.value = []
}

// 添加规则
function addRule() {
  if (!newRuleContent.value.trim()) return
  
  const behavior = ruleSet.value.behavior
  
  if (behavior === 'classical') {
    const rule = {
      id: `rule-${Date.now()}`,
      type: newRuleType.value,
      content: newRuleContent.value.trim()
    }
    ruleSet.value.payload.push(rule)
    newRuleContent.value = ''
  } else {
    const rule = {
      id: `rule-${Date.now()}`,
      content: newRuleContent.value.trim()
    }
    ruleSet.value.payload.push(rule)
    newRuleContent.value = ''
  }
}

// 解析规则
function parseRule(text) {
  const behavior = ruleSet.value.behavior
  
  if (behavior === 'classical') {
    const parts = text.split(',').map(p => p.trim())
    if (parts.length >= 2) {
      return {
        type: parts[0],
        content: parts[1]
      }
    }
    return null
  } else if (behavior === 'domain' || behavior === 'ipcidr') {
    return { content: text }
  }
  
  return null
}

// 批量添加
function batchAdd() {
  const lines = batchRules.value.split('\n').filter(l => l.trim())
  const newRules = []
  
  for (const line of lines) {
    const rule = parseRule(line.trim())
    if (rule) {
      newRules.push({
        id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        ...rule
      })
    }
  }
  
  if (newRules.length > 0) {
    ruleSet.value.payload.push(...newRules)
    ElMessage.success(`成功添加 ${newRules.length} 条规则`)
  }
  
  batchAddVisible.value = false
  batchRules.value = ''
}

// 删除规则
function deleteRule(index) {
  const rule = ruleSet.value.payload[index]
  ruleSet.value.payload.splice(index, 1)
  
  const selectIndex = selectedRules.value.indexOf(rule.id)
  if (selectIndex > -1) {
    selectedRules.value.splice(selectIndex, 1)
  }
}

// 全选
function toggleSelectAll(val) {
  if (val) {
    selectedRules.value = ruleSet.value.payload.map(r => r.id)
  } else {
    selectedRules.value = []
  }
}

// 更新全选状态
function updateSelectAll() {
  selectAll.value = selectedRules.value.length === ruleSet.value.payload?.length
}

// 删除选中
function deleteSelected() {
  ruleSet.value.payload = ruleSet.value.payload.filter(
    r => !selectedRules.value.includes(r.id)
  )
  selectedRules.value = []
  selectAll.value = false
}

// 标签管理
function showTagManager() {
  tagManagerVisible.value = true
}

async function refreshTags() {
  await store.fetchTags()
}

// 返回列表
function goBack() {
  router.push('/rule-sets')
}

// 下载 YAML
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

// 监听路由参数变化
watch(() => route.params.id, () => {
  if (route.params.id) {
    loadRuleSet()
  }
}, { immediate: true })

// 初始化
onMounted(() => {
  store.fetchTags()
})
</script>

<style lang="scss" scoped>
.rule-set-edit {
  height: 100%;
  overflow-y: auto;
  padding-bottom: 40px;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #c0c4cc;
    border-radius: 4px;
    
    &:hover {
      background: #909399;
    }
  }
  
  &::-webkit-scrollbar-track {
    background: #f5f7fa;
    border-radius: 4px;
  }
  
  .page-header {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 16px 20px;
    background: #fff;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
    
    .title-section {
      display: flex;
      align-items: center;
      gap: 16px;
      
      h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }
    }
    
    .actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
  }
  
  .info-card {
    margin-bottom: 20px;
    
    .card-header {
      font-weight: 600;
    }
  }
  
  .rules-card,
  .yaml-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
    }
    
    .add-rule-section {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid #ebeef5;
    }
    
    .rules-tip,
    .yaml-tip {
      margin-bottom: 12px;
    }
    
    .rules-toolbar {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 12px;
      padding: 8px 12px;
      background: #f5f7fa;
      border-radius: 4px;
    }
    
    .rules-container {
      .drag-hint {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #909399;
        font-size: 12px;
        margin-bottom: 12px;
      }
    }
    
    .rules-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .rule-item {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      background: #fafafa;
      border-radius: 4px;
      transition: all 0.2s;
      
      &:hover {
        background: #f0f0f0;
        
        .rule-actions {
          opacity: 1;
        }
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
      
      .el-checkbox {
        margin-right: 12px;
      }
      
      .rule-index {
        width: 40px;
        color: #909399;
        font-size: 12px;
      }
      
      .rule-type {
        width: 140px;
        flex-shrink: 0;
      }
      
      .rule-value {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        padding: 0 12px;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 13px;
      }
      
      .rule-actions {
        opacity: 0;
        transition: opacity 0.2s;
      }
    }
    
    .ghost {
      opacity: 0.5;
      background: #c8ebfb;
    }
    
    .yaml-editor {
      :deep(.el-textarea__inner) {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 13px;
        line-height: 1.6;
        tab-size: 2;
      }
    }
    
    // 输入验证错误状态
    .is-error {
      :deep(.el-input__wrapper) {
        box-shadow: 0 0 0 1px var(--el-color-danger) inset;
      }
    }
  }
}
</style>