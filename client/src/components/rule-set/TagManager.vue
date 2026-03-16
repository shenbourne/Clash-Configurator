<template>
  <el-dialog
    v-model="visible"
    title="管理标签"
    width="500px"
    destroy-on-close
  >
    <div class="tag-manager">
      <!-- 创建新标签 -->
      <div class="create-tag">
        <el-form :inline="true" @submit.prevent="handleCreate">
          <el-form-item label="名称">
            <el-input 
              v-model="newTagName" 
              placeholder="标签名称"
              size="small"
              style="width: 150px"
            />
          </el-form-item>
          <el-form-item label="颜色">
            <el-color-picker v-model="newTagColor" size="small" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" size="small" @click="handleCreate" :loading="creating">
              创建
            </el-button>
          </el-form-item>
        </el-form>
      </div>
      
      <!-- 标签列表 -->
      <div class="tag-list">
        <el-empty v-if="tags.length === 0" description="暂无标签" :image-size="60" />
        
        <div v-else class="tags">
          <div 
            v-for="tag in tags" 
            :key="tag.id" 
            class="tag-item"
          >
            <div class="tag-info">
              <span class="tag-color" :style="{ background: tag.color }"></span>
              <span class="tag-name">{{ tag.name }}</span>
              <span class="tag-count">{{ tag.count || 0 }} 次使用</span>
            </div>
            <div class="tag-actions">
              <el-button link type="primary" @click="editTag(tag)">编辑</el-button>
              <el-button link type="danger" @click="deleteTag(tag)">删除</el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 编辑对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑标签"
      width="400px"
      append-to-body
      destroy-on-close
    >
      <el-form :model="editForm" label-width="60px">
        <el-form-item label="名称">
          <el-input v-model="editForm.name" />
        </el-form-item>
        <el-form-item label="颜色">
          <el-color-picker v-model="editForm.color" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleEdit" :loading="editing">保存</el-button>
      </template>
    </el-dialog>
    
    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRuleSetStore } from '@/stores/ruleSet'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'refresh'])

const store = useRuleSetStore()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const tags = computed(() => store.tags)

// 创建新标签
const newTagName = ref('')
const newTagColor = ref('#409EFF')
const creating = ref(false)

async function handleCreate() {
  if (!newTagName.value.trim()) {
    ElMessage.warning('请输入标签名称')
    return
  }
  
  creating.value = true
  try {
    await store.createTag({
      name: newTagName.value.trim(),
      color: newTagColor.value
    })
    ElMessage.success('标签创建成功')
    newTagName.value = ''
    emit('refresh')
  } catch (e) {
    // 错误已处理
  } finally {
    creating.value = false
  }
}

// 编辑标签
const editDialogVisible = ref(false)
const editing = ref(false)
const editForm = ref({
  id: '',
  name: '',
  color: ''
})

function editTag(tag) {
  editForm.value = {
    id: tag.id,
    name: tag.name,
    color: tag.color
  }
  editDialogVisible.value = true
}

async function handleEdit() {
  if (!editForm.value.name.trim()) {
    ElMessage.warning('标签名称不能为空')
    return
  }
  
  editing.value = true
  try {
    await store.updateTag(editForm.value.id, {
      name: editForm.value.name.trim(),
      color: editForm.value.color
    })
    ElMessage.success('标签更新成功')
    editDialogVisible.value = false
    emit('refresh')
  } catch (e) {
    // 错误已处理
  } finally {
    editing.value = false
  }
}

// 删除标签
async function deleteTag(tag) {
  try {
    await ElMessageBox.confirm(
      `确定要删除标签「${tag.name}」吗？`,
      '删除确认',
      { type: 'warning' }
    )
    
    await store.deleteTag(tag.id)
    ElMessage.success('标签已删除')
    emit('refresh')
  } catch (e) {
    // 取消或错误
  }
}

// 对话框打开时刷新标签列表
watch(visible, (val) => {
  if (val) {
    store.fetchTags()
  }
})
</script>

<style lang="scss" scoped>
.tag-manager {
  .create-tag {
    padding: 16px;
    background: #f5f7fa;
    border-radius: 4px;
    margin-bottom: 16px;
    
    .el-form-item {
      margin-bottom: 0;
    }
  }
  
  .tag-list {
    .tags {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .tag-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border: 1px solid #e4e7ed;
      border-radius: 4px;
      
      .tag-info {
        display: flex;
        align-items: center;
        gap: 12px;
        
        .tag-color {
          width: 16px;
          height: 16px;
          border-radius: 4px;
        }
        
        .tag-name {
          font-weight: 500;
        }
        
        .tag-count {
          color: #909399;
          font-size: 12px;
        }
      }
      
      .tag-actions {
        display: flex;
        gap: 8px;
      }
    }
  }
}
</style>