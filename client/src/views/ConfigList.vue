npm<template>
  <div class="config-list-page">
    <!-- 头部操作栏 -->
    <div class="header">
      <h2>配置列表</h2>
      <div class="actions">
        <el-button @click="showSettingsDialog" plain>
          <el-icon><Setting /></el-icon>
          导出设置
        </el-button>
        <el-button type="warning" plain @click="handleExportAll" :disabled="!settings.autoExport || !settings.exportDirectory">
          <el-icon><FolderOpened /></el-icon>
          导出全部
        </el-button>
        <el-upload
          ref="uploadRef"
          :show-file-list="false"
          :before-upload="handleImport"
          accept=".yaml,.yml"
        >
          <template #trigger>
            <el-button type="primary" plain>
              <el-icon><Upload /></el-icon>
              导入配置
            </el-button>
          </template>
        </el-upload>
        <el-button type="primary" @click="handleCreate">
          <el-icon><Plus /></el-icon>
          新建配置
        </el-button>
      </div>
    </div>

    <!-- 配置列表 -->
    <div class="content" v-loading="store.loading">
      <el-empty v-if="!store.configs.length && !store.loading" description="暂无配置文件">
        <el-button type="primary" @click="handleCreate">创建第一个配置</el-button>
      </el-empty>

      <el-row :gutter="20" v-else>
        <el-col :xs="24" :sm="12" :md="8" :lg="6" v-for="config in store.configs" :key="config.id">
          <el-card class="config-card" shadow="hover" @click="handleEdit(config)">
            <template #header>
              <div class="card-header">
                <span class="config-name">{{ config.name }}</span>
                <el-dropdown trigger="click" @click.stop>
                  <el-button link type="primary">
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item @click="handleExport(config)">
                        <el-icon><Download /></el-icon>
                        下载
                      </el-dropdown-item>
                      <el-dropdown-item @click="handleExportToDirectory(config)" :disabled="!settings.exportDirectory">
                        <el-icon><FolderOpened /></el-icon>
                        导出到目录
                      </el-dropdown-item>
                      <el-dropdown-item @click="handleDelete(config)" divided>
                        <el-icon><Delete /></el-icon>
                        删除
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </template>
            <div class="config-stats">
              <div class="stat-item">
                <el-icon><Connection /></el-icon>
                <span>{{ config.proxyCount }} 个节点</span>
              </div>
              <div class="stat-item">
                <el-icon><Grid /></el-icon>
                <span>{{ config.groupCount }} 个代理组</span>
              </div>
              <div class="stat-item">
                <el-icon><List /></el-icon>
                <span>{{ config.ruleCount }} 条规则</span>
              </div>
            </div>
            <div class="config-time">
              <span>更新于 {{ formatTime(config.updatedAt) }}</span>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 新建配置对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新建配置"
      width="500px"
    >
      <el-form :model="newConfigForm" label-width="80px">
        <el-form-item label="配置名称">
          <el-input v-model="newConfigForm.name" placeholder="请输入配置名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCreate">创建</el-button>
      </template>
    </el-dialog>

    <!-- 导出设置对话框 -->
    <el-dialog
      v-model="settingsDialogVisible"
      title="设置"
      width="550px"
    >
      <el-form :model="settings" label-width="120px">
        <el-divider content-position="left">导出设置</el-divider>
        <el-form-item label="导出目录">
          <div class="export-dir-input">
            <el-input
              v-model="settings.exportDirectory"
              placeholder="输入导出目录路径，如 D:\clash-configs"
              clearable
            />
            <el-tooltip content="配置保存时自动导出到此目录">
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </div>
        </el-form-item>
        <el-form-item label="自动导出">
          <el-switch
            v-model="settings.autoExport"
            :disabled="!settings.exportDirectory"
          />
          <span class="switch-tip">开启后，每次保存配置都会自动导出到指定目录</span>
        </el-form-item>
        <el-form-item label="导出格式">
          <el-radio-group v-model="settings.exportFormat">
            <el-radio label="yaml">YAML</el-radio>
            <el-radio label="json">JSON</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-divider content-position="left">规则集合发布</el-divider>
        <el-form-item label="发布URL前缀">
          <el-input
            v-model="settings.publishUrl"
            placeholder="https://example.com/rules"
            clearable
          />
          <div class="form-tip">
            设置规则集合的发布地址前缀，用于生成订阅链接。<br/>
            例如：https://example.com/rules，最终链接为 https://example.com/rules/{规则集ID}.yaml
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="settingsDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveSettings">保存设置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useConfigStore } from '@/stores/config'
import * as api from '@/api/config'

const router = useRouter()
const store = useConfigStore()

const createDialogVisible = ref(false)
const newConfigForm = ref({ name: '' })
const settingsDialogVisible = ref(false)
const settings = ref({
  exportDirectory: '',
  autoExport: false,
  exportFormat: 'yaml',
  publishUrl: ''
})

onMounted(async () => {
  store.fetchConfigs()
  await loadSettings()
})

async function loadSettings() {
  try {
    const res = await api.getSettings()
    if (res.success) {
      settings.value = { ...settings.value, ...res.data }
    }
  } catch (e) {
    console.error('加载设置失败', e)
  }
}

async function saveSettings() {
  try {
    // 先保存导出目录
    if (settings.value.exportDirectory) {
      const dirRes = await api.setExportDirectory(settings.value.exportDirectory)
      if (!dirRes.success) {
        ElMessage.error(dirRes.message || '设置导出目录失败')
        return
      }
    }
    
    // 再保存其他设置
    await api.updateSettings({
      autoExport: settings.value.autoExport,
      exportFormat: settings.value.exportFormat,
      publishUrl: settings.value.publishUrl
    })
    
    ElMessage.success('设置保存成功')
    settingsDialogVisible.value = false
  } catch (e) {
    ElMessage.error('保存设置失败')
  }
}

function showSettingsDialog() {
  settingsDialogVisible.value = true
}

function formatTime(time) {
  if (!time) return '-'
  const date = new Date(time)
  return date.toLocaleString('zh-CN')
}

function handleCreate() {
  newConfigForm.value = { name: '' }
  createDialogVisible.value = true
}

async function submitCreate() {
  if (!newConfigForm.value.name.trim()) {
    ElMessage.warning('请输入配置名称')
    return
  }

  try {
    const config = await store.createConfig({ name: newConfigForm.value.name })
    ElMessage.success('配置创建成功')
    createDialogVisible.value = false
    router.push(`/config/${config.id}`)
  } catch (e) {
    // 错误已在 store 中处理
  }
}

function handleEdit(config) {
  router.push(`/config/${config.id}`)
}

async function handleImport(file) {
  const name = file.name.replace(/\.(yaml|yml)$/i, '')
  
  try {
    await store.importConfig(file, name)
    ElMessage.success('配置导入成功')
  } catch (e) {
    // 错误已在 store 中处理
  }
  
  return false // 阻止默认上传行为
}

async function handleExport(config) {
  try {
    const yaml = await store.exportConfig(config.id)
    downloadYaml(yaml, `${config.name}.yaml`)
    ElMessage.success('下载成功')
  } catch (e) {
    // 错误已在 store 中处理
  }
}

async function handleExportToDirectory(config) {
  if (!settings.value.exportDirectory) {
    ElMessage.warning('请先设置导出目录')
    return
  }
  
  try {
    const res = await api.exportConfigToDirectory(config.id)
    if (res.success) {
      ElMessage.success(res.message || '导出成功')
    } else {
      ElMessage.error(res.message || '导出失败')
    }
  } catch (e) {
    ElMessage.error('导出失败')
  }
}

async function handleExportAll() {
  if (!settings.value.exportDirectory) {
    ElMessage.warning('请先设置导出目录')
    return
  }
  
  try {
    const res = await api.exportAllConfigs()
    if (res.success) {
      ElMessage.success(res.message || '导出完成')
    } else {
      ElMessage.error(res.message || '导出失败')
    }
  } catch (e) {
    ElMessage.error('导出失败')
  }
}

async function handleDelete(config) {
  try {
    await ElMessageBox.confirm(
      `确定要删除配置「${config.name}」吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await store.deleteConfig(config.id)
    ElMessage.success('配置删除成功')
  } catch (e) {
    if (e !== 'cancel') {
      // 错误已在 store 中处理
    }
  }
}

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
</script>

<style lang="scss" scoped>
.config-list-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  
  .header {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    background: #fff;
    border-bottom: 1px solid #e6e6e6;
    
    h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
    
    .actions {
      display: flex;
      gap: 12px;
    }
  }
  
  .content {
    flex: 1;
    padding: 20px;
    overflow: auto;
  }
}

.config-card {
  margin-bottom: 20px;
  cursor: pointer;
  transition: all 0.3s;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    
    .config-name {
      font-weight: 600;
      font-size: 16px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 180px;
    }
  }
  
  .config-stats {
    display: flex;
    flex-direction: column;
    gap: 8px;
    
    .stat-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #666;
      
      .el-icon {
        color: #409eff;
      }
    }
  }
  
  .config-time {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #eee;
    font-size: 12px;
    color: #999;
  }
}

.export-dir-input {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  
  .el-input {
    flex: 1;
  }
  
  .help-icon {
    color: #909399;
    font-size: 16px;
    cursor: help;
  }
}

.switch-tip {
  margin-left: 12px;
  font-size: 12px;
  color: #909399;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.5;
}
</style>