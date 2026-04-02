<template>
  <div class="rule-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>规则列表 ({{ ruleSet?.payload?.length || 0 }} 条)</span>
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
        <template v-if="ruleSet?.behavior === 'classical'">
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
            :placeholder="ruleSet?.behavior === 'domain' ? '输入域名，如 google.com' : '输入 IP/CIDR，如 192.168.1.0/24'"
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
      
      <div class="rules-tip" v-if="ruleSet?.behavior !== 'classical'">
        <el-alert type="info" :closable="false">
          {{ ruleSet?.behavior === 'domain' ? 'Domain 模式：每行只包含域名，不需要 DOMAIN-SUFFIX 前缀' : 'IPCIDR 模式：每行只包含 IP 或 CIDR，不需要 IP-CIDR 前缀' }}
        </el-alert>
      </div>
      
      <div class="rules-toolbar" v-if="ruleSet?.payload?.length > 0">
        <el-checkbox v-model="selectAll" @change="toggleSelectAll">全选</el-checkbox>
        <el-button v-if="selectedRules.length > 0" type="danger" link @click="deleteSelected">
          删除选中 ({{ selectedRules.length }})
        </el-button>
        <el-button type="primary" @click="saveRules" :loading="saving" style="margin-left: auto">
          保存规则
        </el-button>
      </div>
      
      <el-empty v-if="!ruleSet?.payload || ruleSet.payload.length === 0" description="暂无规则">
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
              <div class="rule-type" v-if="ruleSet?.behavior === 'classical'">
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
    
    <!-- 批量添加对话框 -->
    <el-dialog
      v-model="batchAddVisible"
      title="批量添加规则"
      width="600px"
      destroy-on-close
    >
      <el-alert type="info" :closable="false" style="margin-bottom: 16px">
        <template #title>
          <span v-if="ruleSet?.behavior === 'classical'">
            每行一条规则，格式：规则类型,规则内容<br/>
            例如：DOMAIN-SUFFIX,google.com 或 IP-CIDR,127.0.0.0/8
          </span>
          <span v-else-if="ruleSet?.behavior === 'domain'">
            每行一个域名，无需前缀<br/>
            例如：google.com
          </span>
          <span v-else-if="ruleSet?.behavior === 'ipcidr'">
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
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Delete, Document, Rank } from '@element-plus/icons-vue'
import draggable from 'vuedraggable'
import { useRuleSetStore } from '@/stores/ruleSet'

const route = useRoute()
const store = useRuleSetStore()

const ruleSet = inject('ruleSet')
const isNew = inject('isNew')

const saving = ref(false)
const newRuleType = ref('DOMAIN-SUFFIX')
const newRuleContent = ref('')
const selectedRules = ref([])
const selectAll = ref(false)
const batchAddVisible = ref(false)
const batchRules = ref('')

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

// 保存规则
async function saveRules() {
  if (isNew.value) {
    ElMessage.warning('请先保存基本信息')
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
    
    await store.updateRuleSet(route.params.id, data)
    ElMessage.success('规则已保存')
  } catch (e) {
    // 错误已处理
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
.rule-list {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .add-rule-section {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #ebeef5;
  }
  
  .rules-tip {
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
  
  // 输入验证错误状态
  .is-error {
    :deep(.el-input__wrapper) {
      box-shadow: 0 0 0 1px var(--el-color-danger) inset;
    }
  }
}
</style>
