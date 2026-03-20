<template>
  <div class="grouped-container">
    <div v-for="(group, groupIndex) in modelValue" :key="groupIndex" class="group">
      <!-- 分组头部 -->
      <div class="group-header" :class="{ collapsed: group.collapsed }" @click="toggleGroup(groupIndex)">
        <el-icon class="arrow-icon" :class="{ rotated: !group.collapsed }">
          <ArrowRight />
        </el-icon>
        <span class="group-name">{{ group.name || '默认' }}</span>
        <span class="item-count">{{ group.items?.length || 0 }} 项</span>
        <div class="group-actions" @click.stop>
          <el-button link type="primary" size="small" @click="editGroupName(groupIndex)">
            <el-icon><Edit /></el-icon>
          </el-button>
          <el-button 
            v-if="group.name" 
            link 
            type="danger" 
            size="small" 
            @click="deleteGroup(groupIndex)"
          >
            <el-icon><Delete /></el-icon>
          </el-button>
        </div>
      </div>
      
      <!-- 分组内容 -->
      <div v-show="!group.collapsed" class="group-content">
        <draggable
          v-model="group.items"
          :group="draggableGroup"
          item-key="id"
          :handle="handleSelector"
          animation="200"
          ghost-class="ghost"
          :class="contentClass"
          @end="onDragEnd"
        >
          <template #item="{ element, index }">
            <slot 
              name="item" 
              :element="element" 
              :group-index="groupIndex" 
              :item-index="index"
            />
          </template>
        </draggable>
      </div>
    </div>
    
    <!-- 添加分组按钮 -->
    <div class="add-group-btn-container">
      <el-button type="dashed" @click="showAddGroupDialog">
        <el-icon><Plus /></el-icon>
        添加分组
      </el-button>
    </div>
    
    <!-- 添加分组对话框 -->
    <el-dialog
      v-model="addGroupDialogVisible"
      title="添加分组"
      width="400px"
      destroy-on-close
    >
      <el-form :model="addGroupForm" ref="formRef" label-width="80px">
        <el-form-item label="分组名称" required>
          <el-input 
            v-model="addGroupForm.name" 
            placeholder="请输入分组名称"
            @keyup.enter="submitAddGroup"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addGroupDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAddGroup">确定</el-button>
      </template>
    </el-dialog>
    
    <!-- 编辑分组名称对话框 -->
    <el-dialog
      v-model="editGroupDialogVisible"
      title="编辑分组名称"
      width="400px"
      destroy-on-close
    >
      <el-form :model="editGroupForm" ref="editFormRef" label-width="80px">
        <el-form-item label="分组名称" required>
          <el-input 
            v-model="editGroupForm.name" 
            placeholder="请输入分组名称"
            @keyup.enter="submitEditGroup"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editGroupDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitEditGroup">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowRight, Edit, Delete, Plus } from '@element-plus/icons-vue'
import draggable from 'vuedraggable'

const props = defineProps({
  modelValue: {
    type: Array,
    required: true,
    default: () => []
  },
  // 拖拽组名，相同组名的 draggable 可以互相拖拽
  draggableGroup: {
    type: String,
    default: 'items'
  },
  // 拖拽手柄选择器
  handleSelector: {
    type: String,
    default: '.drag-handle'
  },
  // 内容区域 class
  contentClass: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

// 添加分组对话框
const addGroupDialogVisible = ref(false)
const addGroupForm = reactive({
  name: ''
})
const formRef = ref(null)

// 编辑分组对话框
const editGroupDialogVisible = ref(false)
const editGroupForm = reactive({
  name: ''
})
const editFormRef = ref(null)
const editingGroupIndex = ref(null)

// 切换分组折叠状态
function toggleGroup(index) {
  const newGroups = props.modelValue.map((group, i) => {
    if (i === index) {
      return { ...group, collapsed: !group.collapsed }
    }
    return group
  })
  emit('update:modelValue', newGroups)
}

// 显示添加分组对话框
function showAddGroupDialog() {
  addGroupForm.name = ''
  addGroupDialogVisible.value = true
}

// 提交添加分组
function submitAddGroup() {
  if (!addGroupForm.name.trim()) {
    ElMessage.warning('请输入分组名称')
    return
  }
  
  // 检查是否已存在同名分组
  if (props.modelValue.some(g => g.name === addGroupForm.name.trim())) {
    ElMessage.warning('分组名称已存在')
    return
  }
  
  const newGroups = [
    ...props.modelValue,
    { name: addGroupForm.name.trim(), collapsed: false, items: [] }
  ]
  emit('update:modelValue', newGroups)
  emit('change')
  addGroupDialogVisible.value = false
  ElMessage.success('分组已添加')
}

// 编辑分组名称
function editGroupName(index) {
  editingGroupIndex.value = index
  editGroupForm.name = props.modelValue[index].name || ''
  editGroupDialogVisible.value = true
}

// 提交编辑分组名称
function submitEditGroup() {
  if (!editGroupForm.name.trim()) {
    ElMessage.warning('请输入分组名称')
    return
  }
  
  // 检查是否已存在同名分组（排除当前分组）
  const exists = props.modelValue.some((g, i) => 
    i !== editingGroupIndex.value && g.name === editGroupForm.name.trim()
  )
  
  if (exists) {
    ElMessage.warning('分组名称已存在')
    return
  }
  
  const newGroups = props.modelValue.map((group, i) => {
    if (i === editingGroupIndex.value) {
      return { ...group, name: editGroupForm.name.trim() }
    }
    return group
  })
  emit('update:modelValue', newGroups)
  emit('change')
  editGroupDialogVisible.value = false
  ElMessage.success('分组名称已更新')
}

// 删除分组
async function deleteGroup(index) {
  try {
    await ElMessageBox.confirm(
      `确定要删除分组"${props.modelValue[index].name || '默认'}"吗？该分组内的 ${props.modelValue[index].items?.length || 0} 个项目将被移到默认分组。`,
      '删除确认',
      { type: 'warning' }
    )
    
    const currentGroup = props.modelValue[index]
    const newGroups = props.modelValue.filter((_, i) => i !== index)
    
    // 将删除分组的项目移到默认分组（第一个分组）
    if (currentGroup.items && currentGroup.items.length > 0) {
      if (newGroups.length === 0) {
        // 如果没有其他分组，创建默认分组
        newGroups.unshift({ name: null, collapsed: false, items: [...currentGroup.items] })
      } else {
        // 合并到第一个分组
        newGroups[0].items = [...(newGroups[0].items || []), ...currentGroup.items]
      }
    }
    
    emit('update:modelValue', newGroups)
    emit('change')
    ElMessage.success('分组已删除')
  } catch (e) {
    // 取消或错误
  }
}

// 拖拽结束处理
async function onDragEnd() {
  emit('change')
}
</script>

<style lang="scss" scoped>
.grouped-container {
  .group {
    margin-bottom: 16px;
    background: #f5f7fa;
    border-radius: 4px;
    overflow: hidden;
    
    .group-header {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      background: #e4e7ed;
      cursor: pointer;
      transition: background 0.2s;
      
      &:hover {
        background: #dcdfe6;
      }
      
      &.collapsed {
        .arrow-icon {
          transform: rotate(0deg);
        }
      }
      
      .arrow-icon {
        transform: rotate(90deg);
        transition: transform 0.2s;
        margin-right: 8px;
        color: #606266;
        
        &.rotated {
          transform: rotate(90deg);
        }
      }
      
      .group-name {
        font-weight: 600;
        color: #303133;
        margin-right: 12px;
      }
      
      .item-count {
        font-size: 12px;
        color: #909399;
        margin-right: auto;
      }
      
      .group-actions {
        display: flex;
        gap: 4px;
      }
    }
    
    .group-content {
      padding: 12px;
      background: #fff;
    }
  }
  
  .add-group-btn-container {
    margin-top: 16px;
    text-align: center;
  }
}

// 拖拽样式
.ghost {
  opacity: 0.5;
  background: #f0f0f0;
  border: 1px dashed #dcdfe6;
}
</style>
