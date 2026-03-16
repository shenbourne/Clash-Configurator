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
    
    // Proxy Provider 操作
    addProxyProvider,
    updateProxyProvider,
    deleteProxyProvider,
    
    // Rule Provider 操作
    addRuleProvider,
    updateRuleProvider,
    deleteRuleProvider,
    
    // 规则操作
    updateRules,
    
    // DNS 操作
    updateDNSConfig,
    
    // 高级配置操作
    updateAdvancedConfig,
    
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