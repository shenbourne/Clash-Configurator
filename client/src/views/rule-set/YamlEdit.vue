<template>
  <div class="yaml-edit">
    <el-card>
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
            <span>提示：YAML 格式编辑规则集，保存时会自动解析内容。注释行（以 # 开头）会被保留。</span>
          </template>
        </el-alert>
      </div>
      
      <div class="footer-actions">
        <el-button type="primary" @click="save" :loading="saving">
          保存 YAML
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Document } from '@element-plus/icons-vue'
import yaml from 'js-yaml'
import { useRuleSetStore } from '@/stores/ruleSet'

const route = useRoute()
const store = useRuleSetStore()

const ruleSet = inject('ruleSet')
const updateRuleSet = inject('updateRuleSet')
const isNew = inject('isNew')

const saving = ref(false)
const yamlContent = ref('')

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

// 监听规则集变化，更新 YAML 内容
watch(() => ruleSet.value, () => {
  yamlContent.value = generateYaml()
}, { immediate: true, deep: true })

// 保存
async function save() {
  if (!parseYaml()) {
    return
  }
  
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
    ElMessage.success('保存成功')
    updateRuleSet(data)
  } catch (e) {
    // 错误已处理
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
.yaml-edit {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .yaml-editor {
    :deep(.el-textarea__inner) {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 13px;
      line-height: 1.6;
      tab-size: 2;
    }
  }
  
  .yaml-tip {
    margin-top: 12px;
  }
  
  .footer-actions {
    margin-top: 20px;
    text-align: right;
  }
}
</style>
