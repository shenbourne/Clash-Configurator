<template>
  <div class="grouped-container">
    <div v-for="(group, groupIndex) in localGroups" :key="groupIndex" class="group">
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
        <div :class="contentClass">
          <div
            v-for="(element, index) in group.items"
            :key="element._dragId"
            class="draggable-item"
            draggable="true"
            @dragstart="onDragStart($event, groupIndex, index)"
            @dragend="onDragEnd"
            @dragover.prevent
            @drop="onDrop($event, groupIndex, index)"
          >
            <slot
              name="item"
              :element="element"
              :group-index="groupIndex"
              :item-index="index"
            />
          </div>
        </div>
        <!-- 空分组的放置区域 -->
        <div
          v-if="!group.items || group.items.length === 0"
          class="empty-drop-zone"
          @dragover.prevent="onDragOver"
          @drop="onDropOnEmptyGroup($event, groupIndex)"
        >
          <span class="empty-hint">拖放项目到此处</span>
        </div>
      </div>
    </div>
    
    <!-- 添加分组按钮 -->
    <div class="add-group-btn-container">
      <el-button @click="showAddGroupDialog">
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
import { ref, reactive, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowRight, Edit, Delete, Plus } from '@element-plus/icons-vue'

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

// 本地响应式数据，用于拖拽操作
const localGroups = ref([])

// 用于生成唯一 ID 的计数器
let dragIdCounter = 0

// 拖拽状态
const dragState = ref({
  isDragging: false,
  sourceGroupIndex: null,
  sourceItemIndex: null
})

// 为 items 添加唯一拖拽 ID
function addDragIds(groups) {
  return groups.map(group => ({
    ...group,
    items: (group.items || []).map(item => ({
      ...item,
      _dragId: item._dragId || `drag-${++dragIdCounter}`
    }))
  }))
}

// 监听 props 变化，更新本地数据
watch(() => props.modelValue, (newVal) => {
  localGroups.value = addDragIds(JSON.parse(JSON.stringify(newVal)))
}, { immediate: true, deep: true })

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
  localGroups.value[index].collapsed = !localGroups.value[index].collapsed
}

// 显示添加分组对话框
function showAddGroupDialog() {
  addGroupForm.name = ''
  addGroupDialogVisible.value = true
}

// 提交添加分组
async function submitAddGroup() {
  if (!addGroupForm.name.trim()) {
    ElMessage.warning('请输入分组名称')
    return
  }
  
  // 检查是否已存在同名分组
  if (localGroups.value.some(g => g.name === addGroupForm.name.trim())) {
    ElMessage.warning('分组名称已存在')
    return
  }
  
  // 添加新分组
  const newGroup = { name: addGroupForm.name.trim(), collapsed: false, items: [] }
  localGroups.value.push(newGroup)
  
  // 等待下一个 tick，确保本地数据已更新
  await nextTick()
  
  // 发送变更事件
  emitChange()
  
  addGroupDialogVisible.value = false
  ElMessage.success('分组已添加')
}

// 编辑分组名称
function editGroupName(index) {
  editingGroupIndex.value = index
  editGroupForm.name = localGroups.value[index].name || ''
  editGroupDialogVisible.value = true
}

// 提交编辑分组名称
function submitEditGroup() {
  if (!editGroupForm.name.trim()) {
    ElMessage.warning('请输入分组名称')
    return
  }
  
  // 检查是否已存在同名分组（排除当前分组）
  const exists = localGroups.value.some((g, i) =>
    i !== editingGroupIndex.value && g.name === editGroupForm.name.trim()
  )
  
  if (exists) {
    ElMessage.warning('分组名称已存在')
    return
  }
  
  localGroups.value[editingGroupIndex.value].name = editGroupForm.name.trim()
  emitChange()
  editGroupDialogVisible.value = false
  ElMessage.success('分组名称已更新')
}

// 删除分组
async function deleteGroup(index) {
  try {
    await ElMessageBox.confirm(
      `确定要删除分组"${localGroups.value[index].name || '默认'}"吗？该分组内的 ${localGroups.value[index].items?.length || 0} 个项目将被移到默认分组。`,
      '删除确认',
      { type: 'warning' }
    )
    
    const currentGroup = localGroups.value[index]
    const newGroups = localGroups.value.filter((_, i) => i !== index)
    
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
    
    localGroups.value = newGroups
    emitChange()
    ElMessage.success('分组已删除')
  } catch (e) {
    // 取消或错误
  }
}

// 拖拽开始
function onDragStart(event, groupIndex, itemIndex) {
  console.log('Drag start:', { groupIndex, itemIndex })
  dragState.value.isDragging = true
  dragState.value.sourceGroupIndex = groupIndex
  dragState.value.sourceItemIndex = itemIndex
  
  // 设置拖拽数据（使用 dataTransfer 保存源位置信息）
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('application/json', JSON.stringify({ groupIndex, itemIndex }))
  
  // 添加拖拽样式（使用 setTimeout 确保样式在拖拽开始后应用）
  setTimeout(() => {
    event.target.classList.add('dragging')
  }, 0)
}

// 拖拽结束
function onDragEnd(event) {
  console.log('Drag end')
  dragState.value.isDragging = false
  dragState.value.sourceGroupIndex = null
  dragState.value.sourceItemIndex = null
  
  // 移除拖拽样式
  event.target.classList.remove('dragging')
  
  // 移除所有可能残留的 dragging 类
  document.querySelectorAll('.dragging').forEach(el => {
    el.classList.remove('dragging')
  })
}

// 拖拽经过
function onDragOver(event) {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
}

// 放置处理
function onDrop(event, targetGroupIndex, targetItemIndex) {
  event.preventDefault()
  console.log('Drop:', { targetGroupIndex, targetItemIndex })
  
  // 从 dataTransfer 获取源位置信息
  let sourceData
  try {
    const jsonData = event.dataTransfer.getData('application/json')
    sourceData = JSON.parse(jsonData)
  } catch (e) {
    console.error('Failed to parse drag data:', e)
    return
  }
  
  if (!sourceData) {
    console.log('No source data')
    return
  }
  
  const sourceGroupIndex = sourceData.groupIndex
  const sourceItemIndex = sourceData.itemIndex
  
  console.log('Source:', { sourceGroupIndex, sourceItemIndex })
  
  // 如果是同一位置，不做任何操作
  if (sourceGroupIndex === targetGroupIndex && sourceItemIndex === targetItemIndex) {
    console.log('Same position, skip')
    return
  }
  
  // 获取源项目
  const sourceGroup = localGroups.value[sourceGroupIndex]
  if (!sourceGroup || !sourceGroup.items) {
    console.error('Source group not found')
    return
  }
  
  const sourceItem = sourceGroup.items[sourceItemIndex]
  if (!sourceItem) {
    console.error('Source item not found')
    return
  }
  
  console.log('Moving item:', sourceItem)
  
  // 创建新的分组数组（避免直接修改）
  const newGroups = JSON.parse(JSON.stringify(localGroups.value))
  
  // 从源位置移除
  newGroups[sourceGroupIndex].items.splice(sourceItemIndex, 1)
  
  // 计算目标位置（考虑移除后的偏移）
  let newIndex = targetItemIndex
  if (sourceGroupIndex === targetGroupIndex && sourceItemIndex < targetItemIndex) {
    newIndex--
  }
  
  // 确保目标分组存在
  if (!newGroups[targetGroupIndex].items) {
    newGroups[targetGroupIndex].items = []
  }
  
  // 插入到目标位置
  newGroups[targetGroupIndex].items.splice(newIndex, 0, sourceItem)
  
  // 更新本地数据
  localGroups.value = newGroups
  
  // 发送更新
  emitChange()
  
  console.log('Drop completed')
}

// 拖放到空分组的处理
function onDropOnEmptyGroup(event, targetGroupIndex) {
  event.preventDefault()
  console.log('Drop on empty group:', { targetGroupIndex })
  
  // 从 dataTransfer 获取源位置信息
  let sourceData
  try {
    const jsonData = event.dataTransfer.getData('application/json')
    sourceData = JSON.parse(jsonData)
  } catch (e) {
    console.error('Failed to parse drag data:', e)
    return
  }
  
  if (!sourceData) {
    console.log('No source data')
    return
  }
  
  const sourceGroupIndex = sourceData.groupIndex
  const sourceItemIndex = sourceData.itemIndex
  
  console.log('Source:', { sourceGroupIndex, sourceItemIndex })
  
  // 获取源项目
  const sourceGroup = localGroups.value[sourceGroupIndex]
  if (!sourceGroup || !sourceGroup.items) {
    console.error('Source group not found')
    return
  }
  
  const sourceItem = sourceGroup.items[sourceItemIndex]
  if (!sourceItem) {
    console.error('Source item not found')
    return
  }
  
  console.log('Moving item to empty group:', sourceItem)
  
  // 创建新的分组数组（避免直接修改）
  const newGroups = JSON.parse(JSON.stringify(localGroups.value))
  
  // 从源位置移除
  newGroups[sourceGroupIndex].items.splice(sourceItemIndex, 1)
  
  // 确保目标分组存在 items 数组
  if (!newGroups[targetGroupIndex].items) {
    newGroups[targetGroupIndex].items = []
  }
  
  // 添加到目标分组
  newGroups[targetGroupIndex].items.push(sourceItem)
  
  // 更新本地数据
  localGroups.value = newGroups
  
  // 发送更新
  emitChange()
  
  console.log('Drop on empty group completed')
}

// 移除 items 中的 _dragId 属性
function removeDragIds(groups) {
  return groups.map(group => ({
    ...group,
    items: (group.items || []).map(item => {
      const { _dragId, ...rest } = item
      return rest
    })
  }))
}

// 发送变更
function emitChange() {
  const cleanedGroups = removeDragIds(localGroups.value)
  emit('update:modelValue', JSON.parse(JSON.stringify(cleanedGroups)))
  emit('change', JSON.parse(JSON.stringify(cleanedGroups)))
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
      
      .empty-drop-zone {
        min-height: 60px;
        border: 2px dashed #dcdfe6;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fafafa;
        transition: all 0.2s;
        
        &:hover {
          border-color: #409eff;
          background: #ecf5ff;
        }
        
        .empty-hint {
          color: #909399;
          font-size: 14px;
        }
      }
    }
  }
  
  .add-group-btn-container {
    margin-top: 16px;
    text-align: center;
  }
}

// 拖拽项目样式
.draggable-item {
  cursor: grab;
  margin-bottom: 8px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  &.dragging {
    opacity: 0.5;
    cursor: grabbing;
  }
  
  &:active {
    cursor: grabbing;
  }
}
</style>

<style lang="scss">
// 全局样式 - 确保拖拽手柄能正确工作
.drag-handle {
  cursor: grab;
  user-select: none;
  
  &:active {
    cursor: grabbing;
  }
}
</style>
