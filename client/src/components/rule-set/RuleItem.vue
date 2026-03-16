<template>
  <div class="rule-item" :class="{ selected }">
    <div class="drag-handle" v-if="draggable">
      <el-icon><Rank /></el-icon>
    </div>
    <el-checkbox 
      v-if="selectable" 
      v-model="selected" 
      @change="onSelectChange"
    />
    <div class="rule-content">
      <span class="rule-text">{{ displayText }}</span>
    </div>
    <div class="rule-actions">
      <el-button link type="danger" @click="remove" v-if="!readonly">
        <el-icon><Delete /></el-icon>
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { Delete, Rank } from '@element-plus/icons-vue'

const props = defineProps({
  rule: {
    type: [String, Object],
    required: true
  },
  index: {
    type: Number,
    required: true
  },
  behavior: {
    type: String,
    default: 'classical' // classical, domain, ipcidr
  },
  draggable: {
    type: Boolean,
    default: false
  },
  selectable: {
    type: Boolean,
    default: false
  },
  readonly: {
    type: Boolean,
    default: false
  },
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['remove', 'update:modelValue'])

const selected = ref(props.modelValue)

// 计算显示文本，支持对象和字符串格式
const displayText = computed(() => {
  if (typeof props.rule === 'string') {
    return props.rule
  }
  
  if (typeof props.rule === 'object' && props.rule !== null) {
    // classical 模式: { type, content, policy }
    if (props.behavior === 'classical') {
      const { type, content, policy } = props.rule
      if (type && content) {
        return policy ? `${type},${content},${policy}` : `${type},${content}`
      }
    }
    // domain/ipcidr 模式: { content }
    if (props.rule.content) {
      return props.rule.content
    }
  }
  
  return String(props.rule)
})

watch(() => props.modelValue, (val) => {
  selected.value = val
})

function onSelectChange(val) {
  emit('update:modelValue', val)
}

function remove() {
  emit('remove', props.index)
}
</script>

<style lang="scss" scoped>
.rule-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  margin-bottom: 8px;
  transition: all 0.2s;
  
  &:hover {
    border-color: #409eff;
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
  }
  
  &.selected {
    background: #ecf5ff;
    border-color: #409eff;
  }
  
  .drag-handle {
    cursor: move;
    padding: 4px 8px;
    margin-right: 8px;
    color: #909399;
    
    &:hover {
      color: #409eff;
    }
  }
  
  .el-checkbox {
    margin-right: 12px;
  }
  
  .rule-content {
    flex: 1;
    min-width: 0;
    
    .rule-text {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 13px;
      color: #303133;
    }
  }
  
  .rule-actions {
    margin-left: 12px;
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  &:hover .rule-actions {
    opacity: 1;
  }
}
</style>