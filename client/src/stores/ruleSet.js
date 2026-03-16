import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as api from '@/api/ruleSet'

export const useRuleSetStore = defineStore('ruleSet', () => {
  // 状态
  const ruleSets = ref([])
  const currentRuleSet = ref(null)
  const tags = ref([])
  const loading = ref(false)
  const error = ref(null)

  // 计算属性
  const ruleSetCount = computed(() => ruleSets.value.length)
  
  const tagOptions = computed(() => 
    tags.value.map(t => ({
      label: t.name,
      value: t.id,
      color: t.color
    }))
  )

  // 规则集合操作
  async function fetchRuleSets(params = {}) {
    loading.value = true
    error.value = null
    try {
      const res = await api.getRuleSets(params)
      ruleSets.value = res.data || []
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchAvailableRuleSets() {
    try {
      const res = await api.getAvailableRuleSets()
      return res.data || []
    } catch (e) {
      throw e
    }
  }

  async function fetchRuleSet(id) {
    loading.value = true
    error.value = null
    try {
      const res = await api.getRuleSet(id)
      currentRuleSet.value = res.data
      return res.data
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createRuleSet(data) {
    loading.value = true
    error.value = null
    try {
      const res = await api.createRuleSet(data)
      ruleSets.value.unshift(res.data)
      return res.data
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateRuleSet(id, data) {
    loading.value = true
    error.value = null
    try {
      const res = await api.updateRuleSet(id, data)
      currentRuleSet.value = res.data
      // 更新列表中的项
      const index = ruleSets.value.findIndex(rs => rs.id === id)
      if (index !== -1) {
        ruleSets.value[index] = res.data
      }
      return res.data
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteRuleSet(id) {
    loading.value = true
    error.value = null
    try {
      await api.deleteRuleSet(id)
      ruleSets.value = ruleSets.value.filter(rs => rs.id !== id)
      if (currentRuleSet.value?.id === id) {
        currentRuleSet.value = null
      }
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function exportRuleSet(id) {
    try {
      const yaml = await api.exportRuleSet(id)
      return yaml
    } catch (e) {
      throw e
    }
  }

  async function getPublishUrl(id) {
    try {
      const res = await api.getRuleSetPublishUrl(id)
      return res.data.publishUrl
    } catch (e) {
      throw e
    }
  }

  async function importRuleSet(file, name) {
    loading.value = true
    error.value = null
    try {
      const res = await api.importRuleSet(file, name)
      ruleSets.value.unshift(res.data)
      return res.data
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function validateRules(rules, behavior) {
    try {
      const res = await api.validateRules(rules, behavior)
      return res.data
    } catch (e) {
      throw e
    }
  }

  // 标签操作
  async function fetchTags() {
    try {
      const res = await api.getTags()
      tags.value = res.data || []
    } catch (e) {
      throw e
    }
  }

  async function createTag(data) {
    try {
      const res = await api.createTag(data)
      tags.value.push(res.data)
      return res.data
    } catch (e) {
      throw e
    }
  }

  async function updateTag(id, data) {
    try {
      const res = await api.updateTag(id, data)
      const index = tags.value.findIndex(t => t.id === id)
      if (index !== -1) {
        tags.value[index] = res.data
      }
      return res.data
    } catch (e) {
      throw e
    }
  }

  async function deleteTag(id) {
    try {
      await api.deleteTag(id)
      tags.value = tags.value.filter(t => t.id !== id)
    } catch (e) {
      throw e
    }
  }

  // 本地操作方法
  function clearCurrentRuleSet() {
    currentRuleSet.value = null
  }

  function setCurrentRuleSet(ruleSet) {
    currentRuleSet.value = ruleSet
  }

  function updateCurrentRuleSetLocal(data) {
    if (currentRuleSet.value) {
      currentRuleSet.value = {
        ...currentRuleSet.value,
        ...data,
        updatedAt: new Date().toISOString()
      }
    }
  }

  function updatePayloadLocal(payload) {
    if (currentRuleSet.value) {
      currentRuleSet.value.payload = payload
    }
  }

  return {
    // 状态
    ruleSets,
    currentRuleSet,
    tags,
    loading,
    error,
    
    // 计算属性
    ruleSetCount,
    tagOptions,
    
    // 规则集合操作
    fetchRuleSets,
    fetchAvailableRuleSets,
    fetchRuleSet,
    createRuleSet,
    updateRuleSet,
    deleteRuleSet,
    exportRuleSet,
    getPublishUrl,
    importRuleSet,
    validateRules,
    
    // 标签操作
    fetchTags,
    createTag,
    updateTag,
    deleteTag,
    
    // 本地操作
    clearCurrentRuleSet,
    setCurrentRuleSet,
    updateCurrentRuleSetLocal,
    updatePayloadLocal
  }
})