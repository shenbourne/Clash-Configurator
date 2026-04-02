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
          <span>拖拽规则可调整顺序，拖拽到不同分组可移动规则</span>
        </div>
        
        <GroupedContainer
          v-model="ruleGroups"
          draggable-group="rules"
          content-class="rules-list"
          @change="onGroupsChange"
        >
          <template #item="{ element, groupIndex, itemIndex }">
            <div class="rule-item" :class="{ 'is-disabled': element.enabled === false }">
              <div class="drag-handle">
                <el-icon><Rank /></el-icon>
              </div>
              <div class="rule-index">{{ getGlobalIndex(groupIndex, itemIndex) }}</div>
              <div class="rule-type">
                <el-tag size="small">{{ getRuleType(element) }}</el-tag>
              </div>
              <div class="rule-value">{{ getRuleValue(element) }}</div>
              <div class="rule-target">
                <el-tag size="small" type="success">{{ getRuleTarget(element) }}</el-tag>
              </div>
              <div class="rule-actions">
                <el-switch
                  v-model="element.enabled"
                  :active-value="true"
                  :inactive-value="false"
                  @change="toggleRule(groupIndex, itemIndex, $event)"
                  size="small"
                  style="margin-right: 8px;"
                />
                <el-button link type="primary" @click="editRule(groupIndex, itemIndex)">编辑</el-button>
                <el-button link type="danger" @click="removeRule(groupIndex, itemIndex)">删除</el-button>
              </div>
            </div>
          </template>
        </GroupedContainer>
        
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
              <el-option label="GEOSITE (地理站点)" value="GEOSITE" />
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
import { useConfigStore } from '@/stores/config'
import GroupedContainer from '@/components/GroupedContainer.vue'

const route = useRoute()
const store = useConfigStore()

const dialogVisible = ref(false)
const batchDialogVisible = ref(false)
const editingIndex = ref(null)
const editingGroupIndex = ref(null)
const saving = ref(false)
const formRef = ref(null)
const batchRules = ref('')

const rules = computed(() => {
  const rawRules = store.currentConfig?.rules || []
  return rawRules.map((rule, index) => {
    if (typeof rule === 'string') {
      const isDisabled = rule.startsWith('#')
      const cleanRule = isDisabled ? rule.substring(1).trim() : rule
      const parts = cleanRule.split(',')
      // MATCH 规则格式: MATCH,target (没有 value)
      if (parts[0] === 'MATCH') {
        return {
          id: `rule-${index}-${Date.now()}`,
          type: 'MATCH',
          value: '',
          target: parts[1] || '',
          noResolve: false,
          enabled: !isDisabled,
          raw: cleanRule
        }
      }
      return {
        id: `rule-${index}-${Date.now()}`,
        type: parts[0] || '',
        value: parts[1] || '',
        target: parts[2] || '',
        noResolve: parts[3] === 'no-resolve',
        enabled: !isDisabled,
        raw: cleanRule
      }
    }
    return { id: `rule-${index}-${Date.now()}`, ...rule }
  })
})

// 将原始规则字符串转换为对象格式
function parseRuleItem(item, index, groupName) {
  // 如果已经是对象格式，直接返回
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    return {
      ...item,
      id: item.id || `rule-${groupName || 'default'}-${index}-${Date.now()}`
    }
  }
  
  // 如果是字符串，解析为对象
  if (typeof item === 'string') {
    // 检测是否是被注释（禁用）的规则
    const isDisabled = item.startsWith('#')
    const cleanItem = isDisabled ? item.substring(1).trim() : item
    const parts = cleanItem.split(',')
    // MATCH 规则格式: MATCH,target (没有 value)
    if (parts[0] === 'MATCH') {
      return {
        id: `rule-${groupName || 'default'}-${index}-${Date.now()}`,
        type: 'MATCH',
        value: '',
        target: parts[1] || '',
        noResolve: false,
        enabled: !isDisabled,
        raw: cleanItem
      }
    }
    return {
      id: `rule-${groupName || 'default'}-${index}-${Date.now()}`,
      type: parts[0] || '',
      value: parts[1] || '',
      target: parts[2] || '',
      noResolve: parts[3] === 'no-resolve',
      enabled: !isDisabled,
      raw: cleanItem
    }
  }
  
  // 其他情况，返回默认对象
  return {
    id: `rule-${groupName || 'default'}-${index}-${Date.now()}`,
    type: '',
    value: '',
    target: '',
    noResolve: false,
    raw: ''
  }
}

// 本地分组数据（用于临时存储修改）
const localGroups = ref([])

// 获取分组信息
const ruleGroups = computed({
  get() {
    const groups = store.getFieldGroups('rules')
    // 只要有分组数据（即使是空分组），就使用分组数据
    if (groups && Array.isArray(groups) && groups.length > 0) {
      // 确保每个 item 都被正确解析为对象格式
      return groups.map(group => ({
        ...group,
        items: (group.items || []).map((item, index) =>
          parseRuleItem(item, index, group.name)
        )
      }))
    }
    // 如果没有分组信息，将所有规则放入默认分组
    return [{ name: null, collapsed: false, items: rules.value }]
  },
  set(value) {
    // 更新本地分组数据
    localGroups.value = value
  }
})

// 计算全局索引
function getGlobalIndex(groupIndex, itemIndex) {
  let index = itemIndex + 1
  for (let i = 0; i < groupIndex; i++) {
    index += (ruleGroups.value[i]?.items?.length || 0)
  }
  return index
}

// 分组变更处理
async function onGroupsChange(newGroups) {
  // 如果传入了新数据，直接使用；否则使用本地缓存或 computed 值
  const groupsToSave = newGroups || (localGroups.value.length > 0 ? localGroups.value : ruleGroups.value)
  await saveGroups(groupsToSave)
}

// 保存分组
async function saveGroups(groupsToSave) {
  try {
    // 如果没有传入数据，使用本地缓存或 computed 值
    if (!groupsToSave) {
      groupsToSave = localGroups.value.length > 0 ? localGroups.value : ruleGroups.value
    }
    await store.updateConfigGroups(route.params.id, 'rules', groupsToSave)
    // 清空本地缓存
    localGroups.value = []
    ElMessage.success('规则分组已保存')
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
    'GEOSITE': '例如: google, cn, apple-cn',
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
  editingGroupIndex.value = null
  Object.assign(ruleForm, defaultRuleForm)
  dialogVisible.value = true
}

function editRule(groupIndex, itemIndex) {
  editingGroupIndex.value = groupIndex
  editingIndex.value = itemIndex
  const rule = ruleGroups.value[groupIndex]?.items?.[itemIndex]
  if (rule) {
    Object.assign(ruleForm, {
      type: rule.type,
      value: rule.value,
      target: rule.target,
      noResolve: rule.noResolve
    })
  }
  dialogVisible.value = true
}

async function removeRule(groupIndex, itemIndex) {
  try {
    await ElMessageBox.confirm('确定要删除这条规则吗？', '删除确认', { type: 'warning' })
    
    // 创建新的分组数据
    const newGroups = ruleGroups.value.map((group, gi) => {
      if (gi === groupIndex) {
        return {
          ...group,
          items: group.items.filter((_, i) => i !== itemIndex)
        }
      }
      return group
    })
    
    await store.updateConfigGroups(route.params.id, 'rules', newGroups)
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
  const newRules = []
  
  lines.forEach(line => {
    const parts = line.trim().split(',')
    if (parts.length >= 2) {
      newRules.push({
        id: `rule-new-${Date.now()}-${Math.random()}`,
        type: parts[0],
        value: parts[1],
        target: parts[2] || 'DIRECT',
        noResolve: parts[3] === 'no-resolve'
      })
    }
  })
  
  // 添加到最后一个分组
  const newGroups = [...ruleGroups.value]
  if (newGroups.length === 0) {
    newGroups.push({ name: null, collapsed: false, items: newRules })
  } else {
    newGroups[newGroups.length - 1] = {
      ...newGroups[newGroups.length - 1],
      items: [...(newGroups[newGroups.length - 1].items || []), ...newRules]
    }
  }
  
  try {
    await store.updateConfigGroups(route.params.id, 'rules', newGroups)
    ElMessage.success(`已添加 ${newRules.length} 条规则`)
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
  
  // 编辑时保留原有的 enabled 状态
  if (editingGroupIndex.value !== null) {
    const originalRule = ruleGroups.value[editingGroupIndex.value]?.items?.[editingIndex.value]
    if (originalRule && originalRule.enabled === false) {
      newRule.enabled = false
    }
  }
  
  const newGroups = ruleGroups.value.map((group, gi) => {
    if (editingGroupIndex.value !== null && gi === editingGroupIndex.value) {
      // 编辑模式
      return {
        ...group,
        items: group.items.map((item, ii) => 
          ii === editingIndex.value ? newRule : item
        )
      }
    }
    return group
  })
  
  if (editingGroupIndex.value === null) {
    // 添加模式 - 添加到最后一个分组
    if (newGroups.length === 0) {
      newGroups.push({ name: null, collapsed: false, items: [newRule] })
    } else {
      newGroups[newGroups.length - 1] = {
        ...newGroups[newGroups.length - 1],
        items: [...(newGroups[newGroups.length - 1].items || []), newRule]
      }
    }
  }
  
  try {
    await store.updateConfigGroups(route.params.id, 'rules', newGroups)
    ElMessage.success(editingGroupIndex.value !== null ? '规则已更新' : '规则已添加')
    dialogVisible.value = false
  } catch (e) {
    // 错误已处理
  }
}

async function toggleRule(groupIndex, itemIndex, value) {
  const newGroups = ruleGroups.value.map((group, gi) => {
    if (gi === groupIndex) {
      return {
        ...group,
        items: group.items.map((item, ii) =>
          ii === itemIndex ? { ...item, enabled: value } : item
        )
      }
    }
    return group
  })
  try {
    await store.updateConfigGroups(route.params.id, 'rules', newGroups)
    ElMessage.success(value ? '规则已启用' : '规则已禁用')
  } catch (e) {
    // 错误已处理
  }
}

async function saveRules() {
  saving.value = true
  try {
    await store.updateConfigGroups(route.params.id, 'rules', ruleGroups.value)
    ElMessage.success('规则已保存')
  } catch (e) {
    // 错误已处理
  } finally {
    saving.value = false
  }
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
    user-select: none;
    
    &:hover {
      background: #f0f0f0;
    }
    
    :deep(.drag-handle) {
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
      width: 140px;
      flex-shrink: 0;
      text-align: right;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
    }
    
    &.is-disabled {
      opacity: 0.55;
      background: #e8e8e8;
      
      .rule-value,
      .rule-type,
      .rule-target,
      .rule-index {
        text-decoration: line-through;
      }
    }
  }
  
  .ghost {
    opacity: 0.5;
    background: #e6f7ff;
    border: 1px dashed #1890ff;
  }
}
</style>