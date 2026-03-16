import request from './index'

// ==================== 规则集合管理 ====================

/**
 * 获取所有规则集合列表
 * @param {Object} params - 查询参数
 * @param {string} params.search - 搜索关键词
 * @param {string} params.behavior - 行为模式筛选
 * @param {string} params.tag - 标签筛选
 */
export function getRuleSets(params = {}) {
  return request.get('/rule-sets', { params })
}

/**
 * 获取可用规则集列表（简化版，用于选择器）
 */
export function getAvailableRuleSets() {
  return request.get('/rule-sets/available')
}

/**
 * 获取单个规则集合
 * @param {string} id - 规则集合 ID
 */
export function getRuleSet(id) {
  return request.get(`/rule-sets/${id}`)
}

/**
 * 创建规则集合
 * @param {Object} data - 规则集合数据
 */
export function createRuleSet(data) {
  return request.post('/rule-sets', data)
}

/**
 * 更新规则集合
 * @param {string} id - 规则集合 ID
 * @param {Object} data - 更新数据
 */
export function updateRuleSet(id, data) {
  return request.put(`/rule-sets/${id}`, data)
}

/**
 * 删除规则集合
 * @param {string} id - 规则集合 ID
 */
export function deleteRuleSet(id) {
  return request.delete(`/rule-sets/${id}`)
}

/**
 * 导出规则集合
 * @param {string} id - 规则集合 ID
 */
export function exportRuleSet(id) {
  return request.get(`/rule-sets/${id}/export`, { responseType: 'text' })
}

/**
 * 获取规则集合的发布链接
 * @param {string} id - 规则集合 ID
 */
export function getRuleSetPublishUrl(id) {
  return request.get(`/rule-sets/${id}/publish-url`)
}

/**
 * 导入规则集合
 * @param {File} file - YAML 文件
 * @param {string} name - 规则集合名称
 */
export function importRuleSet(file, name) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('name', name)
  return request.post('/rule-sets/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

/**
 * 验证规则
 * @param {Array} rules - 规则数组
 * @param {string} behavior - 行为模式
 */
export function validateRules(rules, behavior = 'classical') {
  return request.post('/rule-sets/validate', { rules, behavior })
}

// ==================== 标签管理 ====================

/**
 * 获取所有标签
 */
export function getTags() {
  return request.get('/rule-sets/tags')
}

/**
 * 创建标签
 * @param {Object} data - 标签数据 { name, color }
 */
export function createTag(data) {
  return request.post('/rule-sets/tags', data)
}

/**
 * 更新标签
 * @param {string} id - 标签 ID
 * @param {Object} data - 更新数据
 */
export function updateTag(id, data) {
  return request.put(`/rule-sets/tags/${id}`, data)
}

/**
 * 删除标签
 * @param {string} id - 标签 ID
 */
export function deleteTag(id) {
  return request.delete(`/rule-sets/tags/${id}`)
}