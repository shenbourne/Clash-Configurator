<template>
  <div class="rules-config">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>规则列表</span>
          <div class="actions">
            <el-button type="primary" size="small" @click="showAddDialog">
              <el-icon><Plus /></el-icon>
              添加规则
            </el-button>
            <el-button size="small" @click="showBatchDialog">
              <el-icon><Document /></el-icon>
              批量添加
            </el-button>
          </div>
        </div>
      </template>
      
      <el-empty v-if="!rules.length" description="暂无规则">
        <el-button type="primary" @click="showAddDialog">添加第一条规则</el-button>
      </el-empty>
      
      <div v-else class="rules-container">
        <div class="drag-hint">
          <el-icon><Rank /></el-icon>
          <span>拖拽规则可调整顺序</span>
        </div>
        <draggable
          v-model="draggableRules"
          item-key="id"
          handle=".drag-handle"
          animation="200"
          ghost-class="ghost"
          @end="onDragEnd"
        >
          <template #item="{ element, index }">
            <div class="rule-item">
              <div class="drag-handle">
                <el-icon><Rank /></el-icon>
              </div>
              <div class="rule-index">{{ index + 1 }}</div>
              <div class="rule-type">
                <el-tag size="small">{{ getRuleType(element) }}</el-tag>
              </div>
              <div class="rule-value">{{ getRuleValue(element) }}</div>
              <div class="rule-target">
                <el-tag size="small" type="success">{{ getRuleTarget(element) }}</el-tag>
              </div>
              <div class="rule-actions">
                <el-button link type="primary" @click="editRule(index)">编辑</el-button>
                <el-button link type="danger" @click="removeRule(index)">删除</el-button>
              </div>
            </div>
          </template>
        </draggable>
        
        <div class="footer-actions">
          <el-button type="primary" @click="saveRules" :loading="saving">
            保存规则
          </el-button>
        </div>
      </div>
    </el-card>
    
    <!-- 添加/编辑规则对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingIndex !== null ? '编辑规则' : '添加规则'"
      width="500px"
      destroy-on-close
    >
      <el-form :model="ruleForm" :rules="rules1" ref="formRef" label-width="80px">
        <el-form-item label="规则类型" prop="type">
          <el-select v-model="ruleForm.type" placeholder="选择规则类型" @change="onRuleTypeChange">
            <el-option-group label="域名规则">
              <el-option label="DOMAIN (完整域名)" value="DOMAIN" />
              <el-option label="DOMAIN-SUFFIX (域名后缀)" value="DOMAIN-SUFFIX" />
              <el-option label="DOMAIN-KEYWORD (域名关键词)" value="DOMAIN-KEYWORD" />
            </el-option-group>
            <el-option-group label="IP 规则">
              <el-option label="IP-CIDR (IP 段)" value="IP-CIDR" />
              <el-option label="IP-CIDR6 (IPv6 段)" value="IP-CIDR6" />
              <el-option label="GEOIP (地理位置)" value="GEOIP" />
              <el-option label="IP-ASN (ASN 号)" value="IP-ASN" />
            </el-option-group>
            <el-option-group label="进程规则">
              <el-option label="PROCESS-NAME (进程名)" value="PROCESS-NAME" />
              <el-option label="PROCESS-PATH (进程路径)" value="PROCESS-PATH" />
            </el-option-group>
            <el-option-group label="其他规则">
              <el-option label="SRC-IP-CIDR (源 IP)" value="SRC-IP-CIDR" />
              <el-option label="SRC-PORT (源端口)" value="SRC-PORT" />
              <el-option label="DST-PORT (目标端口)" value="DST-PORT" />
              <el-option label="RULE-SET (规则集合)" value="RULE-SET" />
              <el-option label="MATCH (匹配所有)" value="MATCH" />
            </el-option-group>
          </el-select>
        </el-form-item>
        
        <el-form-item label="规则值" prop="value" v-if="ruleForm.type !== 'MATCH'">
          <el-select 
            v-if="ruleForm.type === 'RULE-SET'" 
            v-model="ruleForm.value" 
            placeholder="选择规则集合"
            filterable
            allow-create
          >
            <el-option
              v-for="provider in ruleProviderNames"
              :key="provider"
              :label="provider"
              :value="provider"
            />
          </el-select>
          <el-input v-else v-model="ruleForm.value" :placeholder="getValuePlaceholder()" />
        </el-form-item>
        
        <el-form-item label="目标策略" prop="target">
          <el-select v-model="ruleForm.target" placeholder="选择目标策略或代理组">
            <el-option label="DIRECT (直连)" value="DIRECT" />
            <el-option label="REJECT (拒绝)" value="REJECT" />
            <el-option
              v-for="group in proxyGroups"
              :key="group"
              :label="group"
              :value="group"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="no-resolve" v-if="['IP-CIDR', 'IP-CIDR6', 'SRC-IP-CIDR'].includes(ruleForm.type)">
          <el-switch v-model="ruleForm.noResolve" />
          <span style="margin-left: 8px; color: #909399; font-size: 12px;">不解析域名</span>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
    
    <!-- 批量添加对话框 -->
    <el-dialog
      v-model="batchDialogVisible"
      title="批量添加规则"
      width="600px"
      destroy-on-close
    >
      <el-input
        v-model="batchRules"
        type="textarea"
        :rows="10"
        placeholder="每行一条规则，格式：类型,值,目标&#10;例如：&#10;DOMAIN-SUFFIX,google.com,PROXY&#10;IP-CIDR,192.168.0.0/16,DIRECT"
      />
      <template #footer>
        <el-button @click="batchDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitBatch">添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Rank } from '@element-plus/icons-vue'
import draggable from 'vuedraggable'
import { useConfigStore } from '@/stores/config'

const route = useRoute()
const store = useConfigStore()

const dialogVisible = ref(false)
const batchDialogVisible = ref(false)
const editingIndex = ref(null)
const saving = ref(false)
const formRef = ref(null)
const batchRules = ref('')

const rules = computed(() => {
  const rawRules = store.currentConfig?.rules || []
  return rawRules.map((rule, index) => {
    if (typeof rule === 'string') {
      const parts = rule.split(',')
      // MATCH 规则格式: MATCH,target (没有 value)
      if (parts[0] === 'MATCH') {
        return {
          id: `rule-${index}-${Date.now()}`,
          type: 'MATCH',
          value: '',
          target: parts[1] || '',
          noResolve: false,
          raw: rule
        }
      }
      return {
        id: `rule-${index}-${Date.now()}`,
        type: parts[0] || '',
        value: parts[1] || '',
        target: parts[2] || '',
        noResolve: parts[3] === 'no-resolve',
        raw: rule
      }
    }
    return { id: `rule-${index}-${Date.now()}`, ...rule }
  })
})

// 用于拖拽的响应式数组
const draggableRules = ref([])

// 监听 rules 变化，更新 draggableRules
watch(rules, (newRules) => {
  draggableRules.value = newRules.map((rule, index) => ({
    ...rule,
    id: rule.id || `rule-${index}-${Date.now()}`
  }))
}, { immediate: true, deep: true })

// 拖拽结束处理
async function onDragEnd() {
  // 拖拽完成后保存新顺序
  await saveRulesOrder()
}

// 保存规则顺序
async function saveRulesOrder() {
  try {
    await store.updateRules(route.params.id, rulesToStrings(draggableRules.value))
    ElMessage.success('规则顺序已更新')
  } catch (e) {
    // 错误已处理
  }
}

const proxyGroups = computed(() => {
  return store.currentConfig?.['proxy-groups']?.map(g => g.name) || []
})

const ruleProviderNames = computed(() => {
  return Object.keys(store.currentConfig?.['rule-providers'] || {})
})

const defaultRuleForm = {
  type: 'DOMAIN-SUFFIX',
  value: '',
  target: 'DIRECT',
  noResolve: false
}

const ruleForm = reactive({ ...defaultRuleForm })

const rules1 = {
  type: [{ required: true, message: '请选择规则类型', trigger: 'change' }],
  value: [{ required: true, message: '请输入规则值', trigger: 'blur' }],
  target: [{ required: true, message: '请选择目标策略', trigger: 'change' }]
}

function getRuleType(rule) {
  return rule.type || rule.raw?.split(',')[0] || ''
}

function getRuleValue(rule) {
  if (rule.type === 'MATCH') return '*'
  return rule.value || rule.raw?.split(',')[1] || ''
}

function getRuleTarget(rule) {
  return rule.target || rule.raw?.split(',')[2] || ''
}

function getValuePlaceholder() {
  const placeholders = {
    'DOMAIN': '例如: www.google.com',
    'DOMAIN-SUFFIX': '例如: google.com',
    'DOMAIN-KEYWORD': '例如: google',
    'IP-CIDR': '例如: 192.168.0.0/16',
    'IP-CIDR6': '例如: 2001:db8::/32',
    'GEOIP': '例如: CN',
    'IP-ASN': '例如: 13335',
    'PROCESS-NAME': '例如: chrome.exe',
    'PROCESS-PATH': '例如: /usr/bin/curl',
    'SRC-IP-CIDR': '例如: 192.168.0.0/16',
    'SRC-PORT': '例如: 80',
    'DST-PORT': '例如: 443',
    'RULE-SET': '例如: proxy-domain'
  }
  return placeholders[ruleForm.type] || ''
}

function onRuleTypeChange() {
  if (ruleForm.type === 'MATCH') {
    ruleForm.value = ''
  }
}

function showAddDialog() {
  editingIndex.value = null
  Object.assign(ruleForm, defaultRuleForm)
  dialogVisible.value = true
}

function editRule(index) {
  editingIndex.value = index
  const rule = draggableRules.value[index]
  Object.assign(ruleForm, {
    type: rule.type,
    value: rule.value,
    target: rule.target,
    noResolve: rule.noResolve
  })
  dialogVisible.value = true
}

async function removeRule(index) {
  try {
    await ElMessageBox.confirm('确定要删除这条规则吗？', '删除确认', { type: 'warning' })
    draggableRules.value.splice(index, 1)
    await store.updateRules(route.params.id, rulesToStrings(draggableRules.value))
    ElMessage.success('规则已删除')
  } catch (e) {
    // 取消或错误
  }
}

function showBatchDialog() {
  batchRules.value = ''
  batchDialogVisible.value = true
}

async function submitBatch() {
  if (!batchRules.value.trim()) {
    ElMessage.warning('请输入规则内容')
    return
  }
  
  const lines = batchRules.value.trim().split('\n').filter(line => line.trim())
  
  lines.forEach(line => {
    const parts = line.trim().split(',')
    if (parts.length >= 2) {
      draggableRules.value.push({
        id: `rule-new-${Date.now()}-${Math.random()}`,
        type: parts[0],
        value: parts[1],
        target: parts[2] || 'DIRECT',
        noResolve: parts[3] === 'no-resolve'
      })
    }
  })
  
  try {
    await store.updateRules(route.params.id, rulesToStrings(draggableRules.value))
    ElMessage.success(`已添加 ${lines.length} 条规则`)
    batchDialogVisible.value = false
  } catch (e) {
    // 错误已处理
  }
}

async function submitForm() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  
  const newRule = {
    id: `rule-${Date.now()}`,
    type: ruleForm.type,
    value: ruleForm.value,
    target: ruleForm.target,
    noResolve: ruleForm.noResolve
  }
  
  if (editingIndex.value !== null) {
    draggableRules.value[editingIndex.value] = newRule
  } else {
    draggableRules.value.push(newRule)
  }
  
  try {
    await store.updateRules(route.params.id, rulesToStrings(draggableRules.value))
    ElMessage.success(editingIndex.value !== null ? '规则已更新' : '规则已添加')
    dialogVisible.value = false
  } catch (e) {
    // 错误已处理
  }
}

async function saveRules() {
  saving.value = true
  try {
    await store.updateRules(route.params.id, rulesToStrings(draggableRules.value))
    ElMessage.success('规则已保存')
  } catch (e) {
    // 错误已处理
  } finally {
    saving.value = false
  }
}

function rulesToStrings(rulesList) {
  return rulesList.map(rule => {
    if (rule.type === 'MATCH') {
      return `MATCH,${rule.target}`
    }
    const parts = [rule.type, rule.value, rule.target]
    if (rule.noResolve) {
      parts.push('no-resolve')
    }
    return parts.join(',')
  })
}
</script>

<style lang="scss" scoped>
.rules-config {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .footer-actions {
    margin-top: 20px;
    text-align: right;
  }
  
  .el-select {
    width: 100%;
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
  
  .rule-item {
    display: flex;
    align-items: center;
    padding: 10px 12px;
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
    
    .rule-index {
      width: 40px;
      color: #909399;
      font-size: 12px;
    }
    
    .rule-type {
      width: 150px;
      flex-shrink: 0;
    }
    
    .rule-value {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding: 0 12px;
    }
    
    .rule-target {
      width: 120px;
      flex-shrink: 0;
    }
    
    .rule-actions {
      width: 100px;
      flex-shrink: 0;
      text-align: right;
    }
  }
  
  .ghost {
    opacity: 0.5;
    background: #e6f7ff;
    border: 1px dashed #1890ff;
  }
}
</style>