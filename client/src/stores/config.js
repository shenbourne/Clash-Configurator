import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as api from '@/api/config'

export const useConfigStore = defineStore('config', () => {
  // 状态
  const configs = ref([])
  const currentConfig = ref(null)
  const configId = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // 计算属性
  const proxyNames = computed(() => {
    if (!currentConfig.value?.proxies) return []
    return currentConfig.value.proxies.map(p => p.name)
  })

  const groupNames = computed(() => {
    if (!currentConfig.value?.['proxy-groups']) return []
    return currentConfig.value['proxy-groups'].map(g => g.name)
  })

  const providerNames = computed(() => {
    if (!currentConfig.value?.['proxy-providers']) return []
    return Object.keys(currentConfig.value['proxy-providers'])
  })

  const allProxyAndGroupNames = computed(() => {
    return [...proxyNames.value, ...groupNames.value]
  })

  // 操作方法
  async function fetchConfigs() {
    loading.value = true
    error.value = null
    try {
      const res = await api.getConfigs()
      configs.value = res.data || []
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function fetchConfig(id) {
    loading.value = true
    error.value = null
    try {
      const res = await api.getConfig(id)
      currentConfig.value = res.data
      configId.value = id
      return res.data
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createConfig(data) {
    loading.value = true
    error.value = null
    try {
      const res = await api.createConfig(data)
      configs.value.unshift(res.data)
      return res.data
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateConfig(id, data) {
    loading.value = true
    error.value = null
    try {
      const res = await api.updateConfig(id, data)
      currentConfig.value = res.data
      // 更新列表中的项
      const index = configs.value.findIndex(c => c.id === id)
      if (index !== -1) {
        configs.value[index] = {
          ...configs.value[index],
          ...res.data
        }
      }
      return res.data
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteConfig(id) {
    loading.value = true
    error.value = null
    try {
      await api.deleteConfig(id)
      configs.value = configs.value.filter(c => c.id !== id)
      if (currentConfig.value?.id === id) {
        currentConfig.value = null
      }
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function importConfig(file, name) {
    loading.value = true
    error.value = null
    try {
      const res = await api.importConfig(file, name)
      configs.value.unshift(res.data)
      return res.data
    } catch (e) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function exportConfig(id) {
    try {
      const yaml = await api.exportConfig(id)
      return yaml
    } catch (e) {
      throw e
    }
  }

  // 代理节点操作
  async function addProxy(configId, proxy) {
    try {
      const res = await api.addProxy(configId, proxy)
      currentConfig.value.proxies = res.data
    } catch (e) {
      throw e
    }
  }

  async function updateProxy(configId, proxyName, proxy) {
    try {
      const res = await api.updateProxy(configId, proxyName, proxy)
      currentConfig.value.proxies = res.data
    } catch (e) {
      throw e
    }
  }

  async function deleteProxy(configId, proxyName) {
    try {
      const res = await api.deleteProxy(configId, proxyName)
      currentConfig.value.proxies = res.data
      // 更新代理组中的引用
      if (currentConfig.value['proxy-groups']) {
        currentConfig.value['proxy-groups'] = currentConfig.value['proxy-groups'].map(group => ({
          ...group,
          proxies: group.proxies.filter(p => p !== proxyName)
        }))
      }
    } catch (e) {
      throw e
    }
  }

  async function batchAddProxies(configId, proxies) {
    try {
      const res = await api.batchAddProxies(configId, proxies)
      currentConfig.value.proxies = res.data
    } catch (e) {
      throw e
    }
  }

  // 代理组操作
  async function addProxyGroup(configId, group) {
    try {
      const res = await api.addProxyGroup(configId, group)
      currentConfig.value['proxy-groups'] = res.data
    } catch (e) {
      throw e
    }
  }

  async function updateProxyGroup(configId, groupName, group) {
    try {
      const res = await api.updateProxyGroup(configId, groupName, group)
      currentConfig.value['proxy-groups'] = res.data
    } catch (e) {
      throw e
    }
  }

  async function deleteProxyGroup(configId, groupName) {
    try {
      const res = await api.deleteProxyGroup(configId, groupName)
      currentConfig.value['proxy-groups'] = res.data
    } catch (e) {
      throw e
    }
  }

  // 更新代理组顺序
  async function updateProxyGroupsOrder(configId, groups) {
    try {
      const res = await api.updateProxyGroupsOrder(configId, groups)
      currentConfig.value['proxy-groups'] = res.data
    } catch (e) {
      throw e
    }
  }

  // 规则操作
  async function updateRules(configId, rules) {
    try {
      const res = await api.updateRules(configId, rules)
      currentConfig.value.rules = res.data
    } catch (e) {
      throw e
    }
  }

  // DNS 配置操作
  async function updateDNSConfig(configId, dns) {
    try {
      const res = await api.updateDNSConfig(configId, dns)
      currentConfig.value.dns = res.data
    } catch (e) {
      throw e
    }
  }

  // Proxy Provider 操作
  async function addProxyProvider(configId, provider) {
    try {
      const res = await api.addProxyProvider(configId, provider)
      currentConfig.value['proxy-providers'] = res.data
    } catch (e) {
      throw e
    }
  }

  async function updateProxyProvider(configId, providerName, provider) {
    try {
      const res = await api.updateProxyProvider(configId, providerName, provider)
      currentConfig.value['proxy-providers'] = res.data
    } catch (e) {
      throw e
    }
  }

  async function deleteProxyProvider(configId, providerName) {
    try {
      const res = await api.deleteProxyProvider(configId, providerName)
      currentConfig.value['proxy-providers'] = res.data
      // 更新代理组中的 use 引用
      if (currentConfig.value['proxy-groups']) {
        currentConfig.value['proxy-groups'] = currentConfig.value['proxy-groups'].map(group => ({
          ...group,
          use: (group.use || []).filter(u => u !== providerName)
        }))
      }
    } catch (e) {
      throw e
    }
  }

  // Rule Provider 操作
  async function addRuleProvider(configId, provider) {
    try {
      const res = await api.addRuleProvider(configId, provider)
      currentConfig.value['rule-providers'] = res.data
    } catch (e) {
      throw e
    }
  }

  async function updateRuleProvider(configId, providerName, provider) {
    try {
      const res = await api.updateRuleProvider(configId, providerName, provider)
      currentConfig.value['rule-providers'] = res.data
    } catch (e) {
      throw e
    }
  }

  async function deleteRuleProvider(configId, providerName) {
    try {
      const res = await api.deleteRuleProvider(configId, providerName)
      currentConfig.value['rule-providers'] = res.data
    } catch (e) {
      throw e
    }
  }

  // 更新 rule-providers 顺序
  async function updateRuleProvidersOrder(configId, providers) {
    try {
      const res = await api.updateRuleProvidersOrder(configId, providers)
      currentConfig.value['rule-providers'] = res.data
    } catch (e) {
      throw e
    }
  }

  // 高级配置操作
  async function updateAdvancedConfig(configId, advanced) {
    try {
      const res = await api.updateAdvancedConfig(configId, advanced)
      currentConfig.value = res.data
    } catch (e) {
      throw e
    }
  }

  // 本地更新方法（不立即保存到服务器）
  function updateCurrentConfigLocal(data) {
    currentConfig.value = {
      ...currentConfig.value,
      ...data,
      updatedAt: new Date().toISOString()
    }
  }

  function updateProxiesLocal(proxies) {
    if (currentConfig.value) {
      currentConfig.value.proxies = proxies
    }
  }

  function updateProxyGroupsLocal(groups) {
    if (currentConfig.value) {
      currentConfig.value['proxy-groups'] = groups
    }
  }

  function updateRulesLocal(rules) {
    if (currentConfig.value) {
      currentConfig.value.rules = rules
    }
  }

  function updateDNSLocal(dns) {
    if (currentConfig.value) {
      currentConfig.value.dns = dns
    }
  }

  function updateProxyProvidersLocal(providers) {
    if (currentConfig.value) {
      currentConfig.value['proxy-providers'] = providers
    }
  }

  function updateRuleProvidersLocal(providers) {
    if (currentConfig.value) {
      currentConfig.value['rule-providers'] = providers
    }
  }

  function clearCurrentConfig() {
    currentConfig.value = null
    configId.value = null
  }

  function setCurrentConfig(config) {
    currentConfig.value = config
    if (config?.id) {
      configId.value = config.id
    }
  }

  // ==================== 分组操作 ====================

  // 获取分组信息
  const configGroups = computed(() => {
    return currentConfig.value?._groups || {}
  })

  // 获取指定字段的分组信息
  function getFieldGroups(field) {
    return currentConfig.value?._groups?.[field] || null
  }

  // 更新分组信息
  async function updateConfigGroups(configId, field, groups) {
    try {
      const res = await api.updateConfigGroups(configId, field, groups)
      if (currentConfig.value) {
        currentConfig.value._groups = res.data
        // 同步更新实际数据
        if (field === 'rules') {
          // rules 需要转换为字符串数组
          currentConfig.value.rules = groupsToRuleStrings(groups)
        } else if (field === 'proxy-groups') {
          currentConfig.value['proxy-groups'] = groupsToArray(groups)
        } else if (field === 'proxies') {
          currentConfig.value.proxies = groupsToArray(groups)
        } else if (field === 'rule-providers') {
          currentConfig.value['rule-providers'] = groupsToObject(groups)
        } else if (field === 'proxy-providers') {
          currentConfig.value['proxy-providers'] = groupsToObject(groups)
        }
      }
    } catch (e) {
      throw e
    }
  }

  // 本地更新分组信息（不立即保存）
  function updateGroupsLocal(field, groups) {
    if (currentConfig.value) {
      if (!currentConfig.value._groups) {
        currentConfig.value._groups = {}
      }
      currentConfig.value._groups[field] = groups
    }
  }

  // 辅助函数：将规则对象转换为字符串
  function ruleObjectToString(item) {
    // 如果有 raw 属性，直接使用
    if (item.raw) {
      return item.raw
    }
    
    // 如果是字符串，直接返回
    if (typeof item === 'string') {
      return item
    }
    
    // 如果是对象，构建规则字符串
    if (item && typeof item === 'object') {
      const type = item.type || ''
      const value = item.value || ''
      const target = item.target || ''
      const noResolve = item.noResolve ? ',no-resolve' : ''
      
      // MATCH 规则特殊处理
      if (type === 'MATCH') {
        return `MATCH,${target}`
      }
      
      // 其他规则
      if (type && value && target) {
        return `${type},${value},${target}${noResolve}`
      }
    }
    
    return ''
  }

  // 辅助函数：分组数组转普通数组
  function groupsToArray(groups) {
    if (!groups || !Array.isArray(groups)) return []
    return groups.flatMap(g => {
      const items = g.items || []
      // 处理可能的嵌套数组情况
      return items.map(item => {
        if (Array.isArray(item)) {
          // 如果是数组，取第一个元素（如果是对象）
          let unwrapped = item
          while (Array.isArray(unwrapped) && unwrapped.length > 0) {
            unwrapped = unwrapped[0]
          }
          return unwrapped && typeof unwrapped === 'object' ? unwrapped : item
        }
        return item
      })
    })
  }

  // 辅助函数：分组数组转规则字符串数组
  function groupsToRuleStrings(groups) {
    if (!groups || !Array.isArray(groups)) return []
    return groups.flatMap(g => {
      const items = g.items || []
      return items.map(item => ruleObjectToString(item)).filter(r => r)
    })
  }

  // 辅助函数：分组数组转普通对象
  function groupsToObject(groups) {
    if (!groups || !Array.isArray(groups)) return {}
    const result = {}
    for (const group of groups) {
      for (const item of (group.items || [])) {
        if (item && item.name) {
          const { name, ...data } = item
          result[name] = data
        }
      }
    }
    return result
  }

  // 辅助函数：普通数组转分组数组
  function arrayToGroups(items) {
    if (!items || !Array.isArray(items)) {
      return [{ name: null, items: [] }]
    }
    return [{ name: null, items: [...items] }]
  }

  // 辅助函数：普通对象转分组数组
  function objectToGroups(obj) {
    if (!obj || typeof obj !== 'object') {
      return [{ name: null, items: [] }]
    }
    const items = Object.entries(obj).map(([name, data]) => ({
      name,
      ...data
    }))
    return [{ name: null, items }]
  }

  return {
    // 状态
    configs,
    currentConfig,
    configId,
    loading,
    error,
    
    // 计算属性
    proxyNames,
    groupNames,
    providerNames,
    allProxyAndGroupNames,
    configGroups,
    
    // 操作方法
    fetchConfigs,
    fetchConfig,
    createConfig,
    updateConfig,
    deleteConfig,
    importConfig,
    exportConfig,
    
    // 代理节点操作
    addProxy,
    updateProxy,
    deleteProxy,
    batchAddProxies,
    
    // 代理组操作
    addProxyGroup,
    updateProxyGroup,
    deleteProxyGroup,
    updateProxyGroupsOrder,
    
    // Proxy Provider 操作
    addProxyProvider,
    updateProxyProvider,
    deleteProxyProvider,
    
    // Rule Provider 操作
    addRuleProvider,
    updateRuleProvider,
    deleteRuleProvider,
    updateRuleProvidersOrder,
    
    // 规则操作
    updateRules,
    
    // DNS 操作
    updateDNSConfig,
    
    // 高级配置操作
    updateAdvancedConfig,
    
    // 分组操作
    getFieldGroups,
    updateConfigGroups,
    updateGroupsLocal,
    groupsToArray,
    groupsToObject,
    arrayToGroups,
    objectToGroups,
    
    // 本地更新方法
    updateCurrentConfigLocal,
    updateProxiesLocal,
    updateProxyGroupsLocal,
    updateRulesLocal,
    updateDNSLocal,
    updateProxyProvidersLocal,
    updateRuleProvidersLocal,
    clearCurrentConfig,
    setCurrentConfig
  }
})