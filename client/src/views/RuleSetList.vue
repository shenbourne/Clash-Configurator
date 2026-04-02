<template>
  <div class="rule-set-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>规则集合</h3>
          <div class="actions">
            <el-button size="small" @click="showImportDialog">
              <el-icon><Upload /></el-icon>
              导入
            </el-button>
            <el-button type="primary" size="small" @click="showCreateDialog">
              <el-icon><Plus /></el-icon>
              新建规则集
            </el-button>
          </div>
        </div>
      </template>
      
      <!-- 搜索和筛选区域 -->
      <div class="filter-section">
        <el-input
          v-model="searchText"
          placeholder="搜索规则集名称、描述、标签..."
          clearable
          @input="handleSearch"
          style="width: 300px"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        
        <el-select v-model="filterBehavior" placeholder="行为模式" clearable style="width: 150px" @change="handleSearch">
          <el-option label="全部" value="" />
          <el-option label="Classical" value="classical" />
          <el-option label="Domain" value="domain" />
          <el-option label="IPCIDR" value="ipcidr" />
        </el-select>
        
        <el-select v-model="filterTag" placeholder="标签筛选" clearable style="width: 150px" @change="handleSearch">
          <el-option label="全部" value="" />
          <el-option 
            v-for="tag in tags" 
            :key="tag.id" 
            :label="tag.name" 
            :value="tag.id"
          />
        </el-select>
      </div>
      
      <!-- 规则集列表 -->
      <div class="rule-set-content" v-loading="loading">
        <el-empty v-if="ruleSets.length === 0 && !loading" description="暂无规则集合">
          <el-button type="primary" @click="showCreateDialog">创建第一个规则集</el-button>
        </el-empty>

        <div v-else class="rule-set-grid">
          <el-card 
            v-for="rs in ruleSets" 
            :key="rs.id"
            class="rule-set-card"
            shadow="hover"
            @click="editRuleSet(rs)"
          >
            <div class="card-header">
              <div class="card-title">
                <span class="name">{{ rs.name }}</span>
                <el-tag size="small" :type="getBehaviorType(rs.behavior)">
                  {{ rs.behavior }}
                </el-tag>
              </div>
              <div class="card-actions">
                <el-dropdown trigger="click" @click.stop>
                  <el-button link type="primary" size="small">
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item @click="exportRuleSet(rs)">
                        <el-icon><Download /></el-icon>
                        下载
                      </el-dropdown-item>
                      <el-dropdown-item @click="copyPublishUrl(rs)" v-if="publishUrl">
                        <el-icon><Link /></el-icon>
                        复制链接
                      </el-dropdown-item>
                      <el-dropdown-item @click="deleteRuleSet(rs)" divided>
                        <el-icon><Delete /></el-icon>
                        删除
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
            
            <div class="card-info">
              <div class="info-item">
                <el-icon><Document /></el-icon>
                <span>{{ rs.payload?.length || 0 }} 条规则</span>
              </div>
              <div class="info-item" v-if="rs.description">
                <span class="description">{{ rs.description }}</span>
              </div>
            </div>
            
            <div class="card-tags" v-if="rs.tags && rs.tags.length > 0">
              <el-tag 
                v-for="tag in rs.tags.slice(0, 3)" 
                :key="tag.id"
                :color="tag.color"
                size="small"
                class="tag"
              >
                {{ tag.name }}
              </el-tag>
              <el-tag v-if="rs.tags.length > 3" size="small" type="info">
                +{{ rs.tags.length - 3 }}
              </el-tag>
            </div>
            
            <div class="card-footer">
              <span class="time">更新于 {{ formatDate(rs.updatedAt) }}</span>
            </div>
          </el-card>
        </div>
      </div>
    </el-card>

    <!-- 创建对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新建规则集"
      width="500px"
      destroy-on-close
    >
      <el-form :model="createForm" :rules="createRules" ref="createFormRef" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="createForm.name" placeholder="请输入规则集名称" />
        </el-form-item>
        <el-form-item label="行为模式" prop="behavior">
          <el-select v-model="createForm.behavior" style="width: 100%">
            <el-option label="Classical (经典模式)" value="classical" />
            <el-option label="Domain (域名模式)" value="domain" />
            <el-option label="IPCIDR (IP模式)" value="ipcidr" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="createForm.description" type="textarea" :rows="2" placeholder="规则集描述（可选）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreate" :loading="creating">创建</el-button>
      </template>
    </el-dialog>

    <!-- 导入对话框 -->
    <el-dialog
      v-model="importDialogVisible"
      title="导入规则集"
      width="500px"
      destroy-on-close
    >
      <el-upload
        drag
        :auto-upload="false"
        :limit="1"
        accept=".yaml,.yml,.txt"
        @change="handleFileSelect"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">
          拖拽文件到此处，或 <em>点击选择文件</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持 YAML 格式的规则集合文件
          </div>
        </template>
      </el-upload>
      
      <el-form v-if="importFile" :model="importForm" label-width="80px" style="margin-top: 16px">
        <el-form-item label="名称">
          <el-input v-model="importForm.name" placeholder="规则集名称" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleImport" :loading="importing" :disabled="!importFile">导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Upload, Search, UploadFilled, Download, Delete, Link, Document, MoreFilled } from '@element-plus/icons-vue'
import { useRuleSetStore } from '@/stores/ruleSet'
import { getSettings } from '@/api/config'

const router = useRouter()
const store = useRuleSetStore()

// 状态
const loading = ref(false)
const searchText = ref('')
const filterBehavior = ref('')
const filterTag = ref('')
const publishUrl = ref('')

// 计算属性
const ruleSets = computed(() => store.ruleSets)
const tags = computed(() => store.tags)

// 创建对话框
const createDialogVisible = ref(false)
const creating = ref(false)
const createFormRef = ref(null)
const createForm = ref({
  name: '',
  behavior: 'classical',
  description: ''
})
const createRules = {
  name: [{ required: true, message: '请输入规则集名称', trigger: 'blur' }],
  behavior: [{ required: true, message: '请选择行为模式', trigger: 'change' }]
}

// 导入对话框
const importDialogVisible = ref(false)
const importing = ref(false)
const importFile = ref(null)
const importForm = ref({
  name: ''
})

// 获取发布 URL
async function loadSettings() {
  try {
    const res = await getSettings()
    publishUrl.value = res.data?.publishUrl || ''
  } catch (e) {
    // 忽略
  }
}

// 加载规则集列表
async function loadRuleSets() {
  loading.value = true
  try {
    const params = {}
    if (searchText.value) params.search = searchText.value
    if (filterBehavior.value) params.behavior = filterBehavior.value
    if (filterTag.value) params.tag = filterTag.value
    
    await store.fetchRuleSets(params)
  } catch (e) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

// 搜索处理
let searchTimer = null
function handleSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    loadRuleSets()
  }, 300)
}

// 显示创建对话框
function showCreateDialog() {
  createForm.value = {
    name: '',
    behavior: 'classical',
    description: ''
  }
  createDialogVisible.value = true
}

// 创建规则集
async function handleCreate() {
  try {
    await createFormRef.value.validate()
  } catch {
    return
  }
  
  creating.value = true
  try {
    const rs = await store.createRuleSet({
      ...createForm.value,
      payload: []
    })
    ElMessage.success('创建成功')
    createDialogVisible.value = false
    router.push(`/rule-sets/${rs.id}/basic`)
  } catch (e) {
    // 错误已处理
  } finally {
    creating.value = false
  }
}

// 编辑规则集
function editRuleSet(rs) {
  router.push(`/rule-sets/${rs.id}/basic`)
}

// 导出规则集
async function exportRuleSet(rs) {
  try {
    const yaml = await store.exportRuleSet(rs.id)
    downloadYaml(yaml, `${rs.name}.yaml`)
    ElMessage.success('下载成功')
  } catch (e) {
    // 错误已处理
  }
}

// 复制发布链接
async function copyPublishUrl(rs) {
  try {
    const url = await store.getPublishUrl(rs.id)
    await navigator.clipboard.writeText(url)
    ElMessage.success('链接已复制到剪贴板')
  } catch (e) {
    ElMessage.error('复制失败')
  }
}

// 删除规则集
async function deleteRuleSet(rs) {
  try {
    await ElMessageBox.confirm(
      `确定要删除规则集「${rs.name}」吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await store.deleteRuleSet(rs.id)
    ElMessage.success('删除成功')
  } catch (e) {
    if (e !== 'cancel') {
      // 错误已处理
    }
  }
}

// 显示导入对话框
function showImportDialog() {
  importFile.value = null
  importForm.value = { name: '' }
  importDialogVisible.value = true
}

// 文件选择处理
function handleFileSelect(uploadFile) {
  importFile.value = uploadFile.raw
  const fileName = uploadFile.name.replace(/\.(yaml|yml|txt)$/i, '')
  importForm.value.name = fileName
}

// 导入处理
async function handleImport() {
  if (!importFile.value) return
  
  importing.value = true
  try {
    await store.importRuleSet(importFile.value, importForm.value.name)
    ElMessage.success('导入成功')
    importDialogVisible.value = false
    loadRuleSets()
  } catch (e) {
    ElMessage.error('导入失败: ' + (e.response?.data?.message || e.message))
  } finally {
    importing.value = false
  }
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

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

// 获取行为模式标签类型
function getBehaviorType(behavior) {
  const types = {
    classical: 'primary',
    domain: 'success',
    ipcidr: 'warning'
  }
  return types[behavior] || 'info'
}

onMounted(() => {
  loadRuleSets()
  store.fetchTags()
  loadSettings()
})
</script>

<style lang="scss" scoped>
.rule-set-list {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .filter-section {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid #ebeef5;
  }
  
  .rule-set-content {
    min-height: 200px;
  }
  
  .rule-set-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }
}

.rule-set-card {
  cursor: pointer;
  transition: all 0.3s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
    
    .card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 0;
      
      .name {
        font-size: 16px;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
    
    .card-actions {
      flex-shrink: 0;
    }
  }
  
  .card-info {
    margin-bottom: 12px;
    
    .info-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #666;
      margin-bottom: 6px;
      
      .el-icon {
        color: #909399;
      }
      
      .description {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #909399;
      }
    }
  }
  
  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 12px;
    
    .tag {
      color: #fff;
    }
  }
  
  .card-footer {
    padding-top: 12px;
    border-top: 1px solid #ebeef5;
    
    .time {
      font-size: 12px;
      color: #909399;
    }
  }
}
</style>