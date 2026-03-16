import request from './index'

// ==================== 配置管理 ====================

/**
 * 获取所有配置列表
 */
export function getConfigs() {
  return request.get('/configs')
}

/**
 * 创建新配置
 * @param {Object} data - 配置数据
 */
export function createConfig(data) {
  return request.post('/configs', data)
}

/**
 * 获取单个配置详情
 * @param {string} id - 配置 ID
 */
export function getConfig(id) {
  return request.get(`/configs/${id}`)
}

/**
 * 更新配置
 * @param {string} id - 配置 ID
 * @param {Object} data - 更新数据
 */
export function updateConfig(id, data) {
  return request.put(`/configs/${id}`, data)
}

/**
 * 删除配置
 * @param {string} id - 配置 ID
 */
export function deleteConfig(id) {
  return request.delete(`/configs/${id}`)
}

/**
 * 导入配置文件
 * @param {File} file - YAML 文件
 * @param {string} name - 配置名称
 */
export function importConfig(file, name) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('name', name)
  return request.post('/configs/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

/**
 * 导出配置
 * @param {string} id - 配置 ID
 */
export function exportConfig(id) {
  return request.get(`/configs/${id}/export`, { responseType: 'text' })
}

/**
 * 预览 YAML
 * @param {Object} data - 配置数据
 */
export function previewYaml(data) {
  return request.post('/configs/preview', data, { responseType: 'text' })
}

/**
 * 验证配置
 * @param {Object} data - 配置数据
 */
export function validateConfig(data) {
  return request.post('/configs/validate', data)
}

/**
 * 验证 YAML 内容
 * @param {string} yaml - YAML 字符串
 */
export function validateYaml(yaml) {
  return request.post('/configs/validate-yaml', { yaml })
}

/**
 * 获取配置的原始 YAML 内容（用于编辑）
 * @param {string} id - 配置 ID
 */
export function getConfigYaml(id) {
  return request.get(`/configs/${id}/yaml`, { responseType: 'text' })
}

/**
 * 从 YAML 内容更新配置（用于编辑器保存）
 * @param {string} id - 配置 ID
 * @param {string} yaml - YAML 内容
 */
export function updateConfigFromYaml(id, yaml) {
  return request.put(`/configs/${id}/yaml`, { yaml })
}

// ==================== 代理节点管理 ====================

/**
 * 获取代理节点列表
 * @param {string} configId - 配置 ID
 */
export function getProxies(configId) {
  return request.get(`/configs/${configId}/proxies`)
}

/**
 * 添加代理节点
 * @param {string} configId - 配置 ID
 * @param {Object} proxy - 代理节点数据
 */
export function addProxy(configId, proxy) {
  return request.post(`/configs/${configId}/proxies`, proxy)
}

/**
 * 更新代理节点
 * @param {string} configId - 配置 ID
 * @param {string} proxyName - 代理节点名称
 * @param {Object} proxy - 代理节点数据
 */
export function updateProxy(configId, proxyName, proxy) {
  return request.put(`/configs/${configId}/proxies/${encodeURIComponent(proxyName)}`, proxy)
}

/**
 * 删除代理节点
 * @param {string} configId - 配置 ID
 * @param {string} proxyName - 代理节点名称
 */
export function deleteProxy(configId, proxyName) {
  return request.delete(`/configs/${configId}/proxies/${encodeURIComponent(proxyName)}`)
}

/**
 * 批量添加代理节点
 * @param {string} configId - 配置 ID
 * @param {Array} proxies - 代理节点数组
 */
export function batchAddProxies(configId, proxies) {
  return request.post(`/configs/${configId}/proxies/batch`, { proxies })
}

// ==================== 代理组管理 ====================

/**
 * 获取代理组列表
 * @param {string} configId - 配置 ID
 */
export function getProxyGroups(configId) {
  return request.get(`/configs/${configId}/groups`)
}

/**
 * 添加代理组
 * @param {string} configId - 配置 ID
 * @param {Object} group - 代理组数据
 */
export function addProxyGroup(configId, group) {
  return request.post(`/configs/${configId}/groups`, group)
}

/**
 * 更新代理组
 * @param {string} configId - 配置 ID
 * @param {string} groupName - 代理组名称
 * @param {Object} group - 代理组数据
 */
export function updateProxyGroup(configId, groupName, group) {
  return request.put(`/configs/${configId}/groups/${encodeURIComponent(groupName)}`, group)
}

/**
 * 删除代理组
 * @param {string} configId - 配置 ID
 * @param {string} groupName - 代理组名称
 */
export function deleteProxyGroup(configId, groupName) {
  return request.delete(`/configs/${configId}/groups/${encodeURIComponent(groupName)}`)
}

// ==================== 规则管理 ====================

/**
 * 获取规则列表
 * @param {string} configId - 配置 ID
 */
export function getRules(configId) {
  return request.get(`/configs/${configId}/rules`)
}

/**
 * 更新规则列表
 * @param {string} configId - 配置 ID
 * @param {Array} rules - 规则数组
 */
export function updateRules(configId, rules) {
  return request.put(`/configs/${configId}/rules`, { rules })
}

// ==================== DNS 配置管理 ====================

/**
 * 获取 DNS 配置
 * @param {string} configId - 配置 ID
 */
export function getDNSConfig(configId) {
  return request.get(`/configs/${configId}/dns`)
}

/**
 * 更新 DNS 配置
 * @param {string} configId - 配置 ID
 * @param {Object} dns - DNS 配置
 */
export function updateDNSConfig(configId, dns) {
  return request.put(`/configs/${configId}/dns`, dns)
}

// ==================== Proxy Providers 管理 ====================

/**
 * 获取所有 proxy-providers
 * @param {string} configId - 配置 ID
 */
export function getProxyProviders(configId) {
  return request.get(`/configs/${configId}/providers`)
}

/**
 * 添加 proxy-provider
 * @param {string} configId - 配置 ID
 * @param {Object} provider - provider 数据，包含 name 和配置
 */
export function addProxyProvider(configId, provider) {
  return request.post(`/configs/${configId}/providers`, provider)
}

/**
 * 更新 proxy-provider
 * @param {string} configId - 配置 ID
 * @param {string} name - provider 名称
 * @param {Object} provider - provider 配置
 */
export function updateProxyProvider(configId, name, provider) {
  return request.put(`/configs/${configId}/providers/${encodeURIComponent(name)}`, provider)
}

/**
 * 删除 proxy-provider
 * @param {string} configId - 配置 ID
 * @param {string} name - provider 名称
 */
export function deleteProxyProvider(configId, name) {
  return request.delete(`/configs/${configId}/providers/${encodeURIComponent(name)}`)
}

// ==================== Rule Providers 管理 ====================

/**
 * 获取所有 rule-providers
 * @param {string} configId - 配置 ID
 */
export function getRuleProviders(configId) {
  return request.get(`/configs/${configId}/rule-providers`)
}

/**
 * 添加 rule-provider
 * @param {string} configId - 配置 ID
 * @param {Object} provider - provider 数据，包含 name 和配置
 */
export function addRuleProvider(configId, provider) {
  return request.post(`/configs/${configId}/rule-providers`, provider)
}

/**
 * 更新 rule-provider
 * @param {string} configId - 配置 ID
 * @param {string} name - provider 名称
 * @param {Object} provider - provider 配置
 */
export function updateRuleProvider(configId, name, provider) {
  return request.put(`/configs/${configId}/rule-providers/${encodeURIComponent(name)}`, provider)
}

/**
 * 删除 rule-provider
 * @param {string} configId - 配置 ID
 * @param {string} name - provider 名称
 */
export function deleteRuleProvider(configId, name) {
  return request.delete(`/configs/${configId}/rule-providers/${encodeURIComponent(name)}`)
}

// ==================== 高级配置管理 ====================

/**
 * 获取高级配置
 * @param {string} configId - 配置 ID
 */
export function getAdvancedConfig(configId) {
  return request.get(`/configs/${configId}/advanced`)
}

/**
 * 更新高级配置
 * @param {string} configId - 配置 ID
 * @param {Object} advanced - 高级配置
 */
export function updateAdvancedConfig(configId, advanced) {
  return request.put(`/configs/${configId}/advanced`, advanced)
}

// ==================== 设置管理 ====================

/**
 * 获取设置
 */
export function getSettings() {
  return request.get('/settings')
}

/**
 * 更新设置
 * @param {Object} settings - 设置对象
 */
export function updateSettings(settings) {
  return request.put('/settings', settings)
}

/**
 * 设置导出目录
 * @param {string} directory - 导出目录路径
 */
export function setExportDirectory(directory) {
  return request.post('/settings/export-directory', { directory })
}

/**
 * 导出配置到指定目录
 * @param {string} configId - 配置 ID
 */
export function exportConfigToDirectory(configId) {
  return request.post(`/configs/${configId}/export-to-directory`)
}

/**
 * 导出所有配置到指定目录
 */
export function exportAllConfigs() {
  return request.post('/export-all')
}