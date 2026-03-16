<template>
  <div class="editor-page">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>YAML 编辑器</span>
          <div class="actions">
            <el-tag v-if="hasChanges" type="warning" size="small">未保存</el-tag>
            <el-popover
              v-if="validationResult && !validationResult.valid"
              placement="bottom"
              :width="400"
              trigger="click"
            >
              <template #reference>
                <el-tag type="danger" size="small" style="cursor: pointer;">
                  验证错误 ({{ validationResult.errors.length }})
                </el-tag>
              </template>
              <div class="error-popover">
                <div class="error-title">验证错误详情：</div>
                <div
                  v-for="(error, index) in validationResult.errors"
                  :key="index"
                  class="error-item"
                >
                  <el-icon color="#f56c6c"><WarningFilled /></el-icon>
                  <span>{{ error }}</span>
                </div>
              </div>
            </el-popover>
            <el-button size="small" @click="formatYaml">
              <el-icon><Document /></el-icon>
              格式化
            </el-button>
            <el-button size="small" @click="copyYaml">
              <el-icon><CopyDocument /></el-icon>
              复制
            </el-button>
            <el-button size="small" @click="downloadYaml">
              <el-icon><Download /></el-icon>
              下载
            </el-button>
            <el-button type="primary" size="small" @click="saveYaml" :loading="saving" :disabled="!canSave">
              <el-icon><Check /></el-icon>
              保存
            </el-button>
          </div>
        </div>
      </template>
      
      <div class="editor-container" v-loading="loading">
        <div ref="editorContainer" class="monaco-editor"></div>
      </div>
      
      <!-- 验证错误提示 -->
      <div v-if="validationResult && !validationResult.valid" class="validation-errors">
        <el-alert
          v-for="(error, index) in validationResult.errors"
          :key="index"
          :title="error"
          type="error"
          :closable="false"
          show-icon
          style="margin-bottom: 8px;"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { WarningFilled } from '@element-plus/icons-vue'
import { useConfigStore } from '@/stores/config'
import { getConfigYaml, updateConfigFromYaml, validateYaml } from '@/api/config'
import * as monaco from 'monaco-editor'

const route = useRoute()
const store = useConfigStore()

const editorContainer = ref(null)
const yamlContent = ref('')
const originalContent = ref('')
const loading = ref(false)
const saving = ref(false)
const validationResult = ref(null)
let editor = null
let debounceTimer = null

const hasChanges = computed(() => yamlContent.value !== originalContent.value)
const canSave = computed(() => {
  if (!hasChanges.value) return false
  if (validationResult.value && !validationResult.value.valid) return false
  return true
})

onMounted(() => {
  loadYamlContent()
})

onUnmounted(() => {
  if (editor) {
    editor.dispose()
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
})

watch(() => store.currentConfig, () => {
  loadYamlContent()
}, { deep: true })

async function loadYamlContent() {
  if (!store.configId) return
  
  loading.value = true
  try {
    const yaml = await getConfigYaml(store.configId)
    yamlContent.value = yaml
    originalContent.value = yaml
    
    await nextTick()
    initEditor()
  } catch (e) {
    ElMessage.error('加载配置失败')
    yamlContent.value = '# 加载配置失败'
  } finally {
    loading.value = false
  }
}

function initEditor() {
  if (editor) {
    editor.dispose()
  }
  
  if (!editorContainer.value) return
  
  // 注册 YAML 语言
  monaco.languages.register({ id: 'yaml' })
  
  // 设置 YAML 主题
  monaco.editor.defineTheme('yaml-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'keyword', foreground: '569CD6' },
    ],
    colors: {
      'editor.background': '#1e1e1e',
    }
  })
  
  editor = monaco.editor.create(editorContainer.value, {
    value: yamlContent.value,
    language: 'yaml',
    theme: 'yaml-dark',
    automaticLayout: true,
    minimap: { enabled: true },
    fontSize: 13,
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    tabSize: 2,
    insertSpaces: true,
    renderWhitespace: 'selection',
    bracketPairColorization: { enabled: true },
  })
  
  // 监听内容变化
  editor.onDidChangeModelContent(() => {
    yamlContent.value = editor.getValue()
    
    // 防抖验证
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(() => {
      performValidation()
    }, 500)
  })
}

async function performValidation() {
  if (!yamlContent.value.trim()) {
    validationResult.value = null
    return
  }
  
  try {
    const response = await validateYaml(yamlContent.value)
    console.log('Validation API response:', response)
    // API 返回格式: { success: true, data: { valid, errors, data } }
    // 响应拦截器返回 res，所以需要从 response.data 获取实际结果
    const result = response.data || response
    console.log('Parsed validation result:', result)
    validationResult.value = result
  } catch (e) {
    console.error('Validation error:', e)
    validationResult.value = {
      valid: false,
      errors: ['验证请求失败']
    }
  }
}

async function saveYaml() {
  if (!canSave.value) return
  
  // 先验证
  try {
    const response = await validateYaml(yamlContent.value)
    const result = response.data || response
    if (!result.valid) {
      ElMessage.error('配置验证失败，请检查错误')
      validationResult.value = result
      return
    }
  } catch (e) {
    ElMessage.error('验证请求失败')
    return
  }
  
  saving.value = true
  try {
    const response = await updateConfigFromYaml(store.configId, yamlContent.value)
    const config = response.data || response
    originalContent.value = yamlContent.value
    
    // 更新 store 中的配置
    store.setCurrentConfig(config)
    
    ElMessage.success('配置保存成功')
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

function formatYaml() {
  if (!editor) return
  
  // 使用 Monaco 的格式化功能
  editor.getAction('editor.action.formatDocument')?.run()
}

async function copyYaml() {
  try {
    await navigator.clipboard.writeText(yamlContent.value)
    ElMessage.success('已复制到剪贴板')
  } catch (e) {
    ElMessage.error('复制失败，请手动复制')
  }
}

function downloadYaml() {
  const blob = new Blob([yamlContent.value], { type: 'text/yaml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${store.currentConfig?.name || 'config'}.yaml`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  ElMessage.success('下载成功')
}

// 离开页面时提示保存
async function beforeLeave() {
  if (hasChanges.value) {
    try {
      await ElMessageBox.confirm(
        '当前有未保存的更改，确定要离开吗？',
        '提示',
        {
          confirmButtonText: '保存并离开',
          cancelButtonText: '不保存',
          distinguishCancelAndClose: true,
          type: 'warning',
        }
      )
      // 用户选择保存
      await saveYaml()
      return true
    } catch (action) {
      if (action === 'cancel') {
        // 用户选择不保存
        return true
      }
      // 用户关闭对话框
      return false
    }
  }
  return true
}

// 暴露方法给父组件
defineExpose({
  beforeLeave
})
</script>

<style lang="scss" scoped>
.editor-page {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
  }
  
  .editor-container {
    height: calc(100vh - 280px);
    min-height: 400px;
    
    .monaco-editor {
      width: 100%;
      height: 100%;
      border-radius: 8px;
      overflow: hidden;
    }
  }
  
  .validation-errors {
    margin-top: 16px;
    max-height: 200px;
    overflow-y: auto;
  }
}

.error-popover {
  .error-title {
    font-weight: 600;
    margin-bottom: 12px;
    color: #303133;
  }
  
  .error-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 0;
    border-bottom: 1px solid #ebeef5;
    
    &:last-child {
      border-bottom: none;
    }
    
    .el-icon {
      flex-shrink: 0;
      margin-top: 2px;
    }
    
    span {
      color: #606266;
      font-size: 13px;
      line-height: 1.5;
      word-break: break-word;
    }
  }
}
</style>