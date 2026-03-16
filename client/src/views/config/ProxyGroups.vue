<template>
  <div class="proxy-groups">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>代理组</span>
          <div class="actions">
            <el-button type="primary" size="small" @click="showAddDialog">
              <el-icon><Plus /></el-icon>
              添加代理组
            </el-button>
          </div>
        </div>
      </template>
      
      <el-empty v-if="!groups.length" description="暂无代理组">
        <el-button type="primary" @click="showAddDialog">添加第一个代理组</el-button>
      </el-empty>
      
      <el-table v-else :data="groups" stripe style="width: 100%">
        <el-table-column prop="name" label="名称" min-width="150" />
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="getGroupTypeTag(row.type)">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="节点数量" width="100">
          <template #default="{ row }">
            {{ (row.proxies?.length || 0) + (row.use?.length || 0) }}
          </template>
        </el-table-column>
        <el-table-column label="节点列表" min-width="200">
          <template #default="{ row }">
            <el-tag 
              v-for="(proxy, index) in row.proxies?.slice(0, 5)" 
              :key="index"
              size="small"
              style="margin-right: 4px; margin-bottom: 4px;"
            >
              {{ proxy }}
            </el-tag>
            <el-tag 
              v-for="(provider, index) in row.use?.slice(0, 3)" 
              :key="'use-' + index"
              size="small"
              type="success"
              style="margin-right: 4px; margin-bottom: 4px;"
            >
              📦 {{ provider }}
            </el-tag>
            <el-tag v-if="(row.proxies?.length || 0) + (row.use?.length || 0) > 8" size="small" type="info">
              +{{ (row.proxies?.length || 0) + (row.use?.length || 0) - 8 }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="editGroup(row)">编辑</el-button>
            <el-button link type="danger" @click="removeGroup(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- 添加/编辑代理组对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingGroup ? '编辑代理组' : '添加代理组'"
      width="650px"
      destroy-on-close
    >
      <el-form :model="groupForm" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="代理组名称" prop="name">
          <el-input v-model="groupForm.name" placeholder="请输入代理组名称" />
        </el-form-item>
        
        <el-form-item label="类型" prop="type">
          <el-select v-model="groupForm.type" placeholder="选择类型" @change="onTypeChange">
            <el-option label="手动选择 (select)" value="select" />
            <el-option label="自动测速 (url-test)" value="url-test" />
            <el-option label="故障转移 (fallback)" value="fallback" />
            <el-option label="负载均衡 (load-balance)" value="load-balance" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="手动节点" prop="proxies">
          <el-select
            v-model="groupForm.proxies"
            multiple
            filterable
            placeholder="选择要包含的节点/组"
            style="width: 100%"
          >
            <el-option
              v-for="proxy in allProxies"
              :key="proxy"
              :label="proxy"
              :value="proxy"
            />
          </el-select>
          <div class="form-tip">选择手动指定的节点或代理组（可选）</div>
        </el-form-item>
        
        <el-form-item label="引用 Provider" prop="use">
          <el-select
            v-model="groupForm.use"
            multiple
            filterable
            placeholder="选择要引用的 Provider"
            style="width: 100%"
          >
            <el-option
              v-for="provider in allProviders"
              :key="provider"
              :label="provider"
              :value="provider"
            />
          </el-select>
          <div class="form-tip">选择要引用的 Proxy Provider（可选）</div>
        </el-form-item>
        
        <el-divider content-position="left">高级选项</el-divider>
        
        <el-form-item label="包含所有节点">
          <el-switch v-model="groupForm.includeAll" />
          <div class="form-tip">自动包含所有节点（与「手动节点」「引用 Provider」互斥）</div>
        </el-form-item>
        
        <el-form-item label="节点过滤">
          <el-input 
            v-model="groupForm.filter" 
            placeholder="例如: 香港|台湾|日本（支持正则）"
          />
          <div class="form-tip">使用正则表达式过滤节点名称（可选）</div>
        </el-form-item>
        
        <el-form-item label="图标">
          <el-input 
            v-model="groupForm.icon" 
            placeholder="例如: https://example.com/icon.png"
          />
          <div class="form-tip">代理组图标 URL（可选，用于客户端显示）</div>
        </el-form-item>
        
        <el-divider content-position="left">测速配置</el-divider>
        
        <!-- 自动测速/故障转移/负载均衡 特有字段 -->
        <template v-if="['url-test', 'fallback', 'load-balance'].includes(groupForm.type)">
          <el-form-item label="测速 URL">
            <el-input v-model="groupForm.url" placeholder="http://www.gstatic.com/generate_204" />
          </el-form-item>
          <el-form-item label="测速间隔">
            <el-input-number v-model="groupForm.interval" :min="0" placeholder="300" />
            <span style="margin-left: 8px; color: #909399;">秒</span>
          </el-form-item>
        </template>
        
        <template v-if="groupForm.type === 'url-test'">
          <el-form-item label="容差">
            <el-input-number v-model="groupForm.tolerance" :min="0" placeholder="50" />
            <span style="margin-left: 8px; color: #909399;">毫秒</span>
          </el-form-item>
        </template>
        
        <template v-if="groupForm.type === 'fallback'">
          <el-form-item label="懒加载">
            <el-switch v-model="groupForm.lazy" />
          </el-form-item>
        </template>
        
        <template v-if="groupForm.type === 'load-balance'">
          <el-form-item label="策略">
            <el-select v-model="groupForm.strategy" placeholder="选择策略">
              <el-option label="一致性哈希" value="consistent-hashing" />
              <el-option label="轮询" value="round-robin" />
            </el-select>
          </el-form-item>
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
import { ref, computed, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useConfigStore } from '@/stores/config'

const route = useRoute()
const store = useConfigStore()

const dialogVisible = ref(false)
const editingGroup = ref(null)
const submitting = ref(false)
const formRef = ref(null)

const groups = computed(() => store.currentConfig?.['proxy-groups'] || [])
const allProxies = computed(() => {
  const proxyNames = store.currentConfig?.proxies?.map(p => p.name) || []
  const groupNames = groups.value.map(g => g.name)
  // 内置策略
  const builtIn = ['DIRECT', 'REJECT', 'GLOBAL']
  return [...new Set([...builtIn, ...proxyNames, ...groupNames])]
})

const allProviders = computed(() => {
  return store.providerNames || []
})

const defaultGroupForm = {
  name: '',
  type: 'select',
  proxies: [],
  use: [],
  url: 'http://www.gstatic.com/generate_204',
  interval: 300,
  tolerance: 50,
  lazy: true,
  strategy: 'consistent-hashing',
  includeAll: false,
  filter: '',
  icon: ''
}

const groupForm = reactive({ ...defaultGroupForm })

const rules = {
  name: [{ required: true, message: '请输入代理组名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }]
}

function getGroupTypeTag(type) {
  const map = {
    'select': '',
    'url-test': 'success',
    'fallback': 'warning',
    'load-balance': 'info'
  }
  return map[type] || ''
}

function showAddDialog() {
  editingGroup.value = null
  // 重置表单，确保数组是新的引用
  groupForm.name = ''
  groupForm.type = 'select'
  groupForm.proxies = []
  groupForm.use = []
  groupForm.url = 'http://www.gstatic.com/generate_204'
  groupForm.interval = 300
  groupForm.tolerance = 50
  groupForm.lazy = true
  groupForm.strategy = 'consistent-hashing'
  groupForm.includeAll = false
  groupForm.filter = ''
  groupForm.icon = ''
  dialogVisible.value = true
}

function editGroup(group) {
  editingGroup.value = group
  // 确保数组是新的引用，避免引用问题
  groupForm.name = group.name
  groupForm.type = group.type
  groupForm.proxies = group.proxies ? [...group.proxies] : []
  groupForm.use = group.use ? [...group.use] : []
  groupForm.url = group.url || 'http://www.gstatic.com/generate_204'
  groupForm.interval = group.interval || 300
  groupForm.tolerance = group.tolerance || 50
  groupForm.lazy = group.lazy !== undefined ? group.lazy : true
  groupForm.strategy = group.strategy || 'consistent-hashing'
  groupForm.includeAll = group['include-all'] || false
  groupForm.filter = group.filter || ''
  groupForm.icon = group.icon || ''
  dialogVisible.value = true
}

async function removeGroup(group) {
  try {
    await ElMessageBox.confirm(
      `确定要删除代理组「${group.name}」吗？`,
      '删除确认',
      { type: 'warning' }
    )
    await store.deleteProxyGroup(route.params.id, group.name)
    ElMessage.success('代理组已删除')
  } catch (e) {
    // 取消或错误
  }
}

function onTypeChange() {
  // 重置特定字段
  groupForm.url = 'http://www.gstatic.com/generate_204'
  groupForm.interval = 300
  groupForm.tolerance = 50
  groupForm.lazy = true
  groupForm.strategy = 'consistent-hashing'
}

async function submitForm() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  
  submitting.value = true
  
  try {
    const data = { ...groupForm }
    
    // 处理 include-all 字段（需要转换为 kebab-case）
    if (groupForm.includeAll) {
      data['include-all'] = true
    }
    delete data.includeAll
    
    // 根据类型清理不需要的字段
    if (groupForm.type === 'select') {
      delete data.url
      delete data.interval
      delete data.tolerance
      delete data.lazy
      delete data.strategy
    } else if (groupForm.type === 'url-test') {
      delete data.lazy
      delete data.strategy
    } else if (groupForm.type === 'fallback') {
      delete data.tolerance
      delete data.strategy
    } else if (groupForm.type === 'load-balance') {
      delete data.tolerance
      delete data.lazy
    }
    
    // 清理空值（但保留空数组，因为空数组表示清空节点列表）
    Object.keys(data).forEach(key => {
      if (data[key] === '' || data[key] === null || data[key] === undefined) {
        delete data[key]
      }
    })
    
    if (editingGroup.value) {
      await store.updateProxyGroup(route.params.id, editingGroup.value.name, data)
      ElMessage.success('代理组已更新')
    } else {
      await store.addProxyGroup(route.params.id, data)
      ElMessage.success('代理组已添加')
    }
    
    dialogVisible.value = false
  } catch (e) {
    // 错误已处理
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.proxy-groups {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .el-select {
    width: 100%;
  }
  
  .form-tip {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
  }
}
</style>