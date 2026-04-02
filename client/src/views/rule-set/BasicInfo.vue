<template>
  <div class="basic-info">
    <el-card>
      <template #header>
        <span>基本信息</span>
      </template>
      
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px" @submit.prevent>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="名称" prop="name">
              <el-input v-model="form.name" placeholder="规则集名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="行为模式" prop="behavior">
              <el-select v-model="form.behavior" @change="onBehaviorChange" style="width: 100%">
                <el-option label="Classical (经典模式)" value="classical" />
                <el-option label="Domain (域名模式)" value="domain" />
                <el-option label="IPCIDR (IP模式)" value="ipcidr" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="规则集描述（可选）" />
        </el-form-item>
        
        <el-form-item label="标签">
          <TagSelector v-model="form.tags" />
          <el-button link type="primary" @click="showTagManager" style="margin-left: 8px">
            管理标签
          </el-button>
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="save" :loading="saving">
            保存基本信息
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 标签管理对话框 -->
    <TagManager v-model="tagManagerVisible" @refresh="refreshTags" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, inject } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useRuleSetStore } from '@/stores/ruleSet'
import TagSelector from '@/components/rule-set/TagSelector.vue'
import TagManager from '@/components/rule-set/TagManager.vue'

const route = useRoute()
const store = useRuleSetStore()

const ruleSet = inject('ruleSet')
const updateRuleSet = inject('updateRuleSet')
const isNew = inject('isNew')

const formRef = ref(null)
const saving = ref(false)
const tagManagerVisible = ref(false)

const form = reactive({
  name: '',
  behavior: 'classical',
  description: '',
  tags: []
})

const rules = {
  name: [{ required: true, message: '请输入规则集名称', trigger: 'blur' }],
  behavior: [{ required: true, message: '请选择行为模式', trigger: 'change' }]
}

onMounted(() => {
  loadFormData()
})

watch(() => ruleSet.value, () => {
  loadFormData()
}, { deep: true })

function loadFormData() {
  if (ruleSet.value) {
    form.name = ruleSet.value.name || ''
    form.behavior = ruleSet.value.behavior || 'classical'
    form.description = ruleSet.value.description || ''
    form.tags = ruleSet.value.tags || []
  }
}

function onBehaviorChange() {
  // 行为模式变更时清空规则列表
  if (ruleSet.value) {
    ruleSet.value.payload = []
  }
  ElMessage.info('行为模式已变更，规则列表已清空')
}

async function save() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  
  saving.value = true
  try {
    const data = {
      ...ruleSet.value,
      name: form.name,
      behavior: form.behavior,
      description: form.description,
      tags: form.tags,
      payload: (ruleSet.value?.payload || []).map(r => {
        const { id, ...rest } = r
        return rest
      })
    }
    
    if (isNew.value) {
      const created = await store.createRuleSet(data)
      ElMessage.success('创建成功')
      updateRuleSet(created)
      // 替换路由，从 new 变为实际 ID
      window.history.replaceState({}, '', `/rule-sets/${created.id}/basic`)
    } else {
      await store.updateRuleSet(route.params.id, data)
      ElMessage.success('保存成功')
      updateRuleSet(data)
    }
  } catch (e) {
    // 错误已处理
  } finally {
    saving.value = false
  }
}

function showTagManager() {
  tagManagerVisible.value = true
}

async function refreshTags() {
  await store.fetchTags()
}
</script>

<style lang="scss" scoped>
.basic-info {
  max-width: 800px;
  
  .el-select {
    width: 100%;
  }
}
</style>
