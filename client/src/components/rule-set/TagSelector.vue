<template>
  <div class="tag-selector">
    <div class="selected-tags" v-if="selectedTags.length > 0">
      <el-tag
        v-for="tag in selectedTags"
        :key="tag.id"
        :color="tag.color"
        closable
        @close="removeTag(tag)"
        class="selected-tag"
      >
        {{ tag.name }}
      </el-tag>
    </div>
    
    <el-dropdown trigger="click" @command="addTag" placement="bottom-start">
      <el-button size="small" type="primary" link>
        <el-icon><Plus /></el-icon>
        添加标签
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item 
            v-for="tag in availableTags" 
            :key="tag.id"
            :command="tag"
            :disabled="isSelected(tag)"
          >
            <span class="tag-option">
              <span class="tag-color" :style="{ background: tag.color }"></span>
              {{ tag.name }}
            </span>
          </el-dropdown-item>
          <el-dropdown-item divided @click="showTagManager = true">
            <el-icon><Setting /></el-icon>
            管理标签
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
    
    <!-- 标签管理对话框 -->
    <TagManager v-model="showTagManager" @refresh="fetchTags" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Plus, Setting } from '@element-plus/icons-vue'
import { useRuleSetStore } from '@/stores/ruleSet'
import TagManager from './TagManager.vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue'])

const store = useRuleSetStore()

const showTagManager = ref(false)

const selectedTags = ref([])

// 所有可用标签
const tags = computed(() => store.tags)

// 未选中的标签
const availableTags = computed(() => 
  tags.value.filter(t => !selectedTags.value.some(s => s.id === t.id))
)

// 检查标签是否已选中
function isSelected(tag) {
  return selectedTags.value.some(s => s.id === tag.id)
}

// 添加标签
function addTag(tag) {
  if (!isSelected(tag)) {
    selectedTags.value.push(tag)
    emitChange()
  }
}

// 移除标签
function removeTag(tag) {
  selectedTags.value = selectedTags.value.filter(t => t.id !== tag.id)
  emitChange()
}

// 发送变更事件
function emitChange() {
  emit('update:modelValue', [...selectedTags.value])
}

// 获取标签列表
async function fetchTags() {
  await store.fetchTags()
}

// 监听外部值变化
watch(() => props.modelValue, (val) => {
  selectedTags.value = val ? [...val] : []
}, { immediate: true, deep: true })

onMounted(() => {
  fetchTags()
})
</script>

<style lang="scss" scoped>
.tag-selector {
  .selected-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 8px;
    
    .selected-tag {
      color: #fff;
    }
  }
  
  .tag-option {
    display: flex;
    align-items: center;
    gap: 8px;
    
    .tag-color {
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }
  }
}
</style>