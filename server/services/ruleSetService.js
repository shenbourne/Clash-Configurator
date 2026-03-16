const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { toYaml, fromYaml } = require('../utils/yaml');

const RULE_SETS_DIR = path.join(__dirname, '../data/rule-sets');

// UUID 格式验证正则
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 验证规则集合 ID 格式
 * @param {string} id - 规则集合 ID
 * @returns {boolean} 是否有效
 */
function isValidRuleSetId(id) {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

/**
 * 将规则集合名称转换为安全的文件名
 * @param {string} name - 规则集合名称
 * @returns {string} 安全的文件名
 */
function sanitizeFileName(name) {
  if (!name || typeof name !== 'string') {
    return 'unnamed';
  }
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 200) || 'unnamed';
}

/**
 * 确保规则集合目录存在
 */
async function ensureRuleSetsDir() {
  try {
    await fs.access(RULE_SETS_DIR);
  } catch {
    await fs.mkdir(RULE_SETS_DIR, { recursive: true });
  }
}

/**
 * 获取规则集合文件路径
 * @param {string} id - 规则集合 ID
 * @param {string} name - 规则集合名称
 * @returns {string} 文件路径
 */
function getRuleSetPath(id, name = null) {
  if (!isValidRuleSetId(id)) {
    throw new Error('无效的规则集合 ID 格式');
  }
  const safeName = sanitizeFileName(name || id);
  return path.join(RULE_SETS_DIR, `${safeName}.yaml`);
}

/**
 * 将规则对象转换为字符串格式
 * @param {string|Object} rule - 规则（对象或字符串格式）
 * @param {string} behavior - 行为模式
 * @returns {string} 规则字符串
 */
function ruleToString(rule, behavior) {
  if (typeof rule === 'string') {
    return rule;
  }
  
  if (typeof rule === 'object' && rule !== null) {
    if (behavior === 'classical') {
      // classical 模式：TYPE,CONTENT[,POLICY]
      const { type, content, policy } = rule;
      if (type && content) {
        return policy ? `${type},${content},${policy}` : `${type},${content}`;
      }
    }
    // domain/ipcidr 模式：只需要 content
    if (rule.content) {
      return rule.content;
    }
  }
  
  return String(rule);
}

/**
 * 将规则集合对象转换为带有元数据注释的 YAML
 * @param {Object} ruleSet - 规则集合对象
 * @returns {string} YAML 字符串
 */
function ruleSetToYamlWithMeta(ruleSet) {
  const meta = {
    id: ruleSet.id,
    name: ruleSet.name,
    behavior: ruleSet.behavior,
    description: ruleSet.description || '',
    tags: ruleSet.tags || [],
    createdAt: ruleSet.createdAt,
    updatedAt: ruleSet.updatedAt
  };
  
  // 将对象格式的规则转换为字符串格式用于导出
  const payload = (ruleSet.payload || []).map(rule => ruleToString(rule, ruleSet.behavior));
  
  // 创建导出数据
  const exportData = {
    payload
  };
  
  // 生成 YAML 内容
  const yamlContent = toYaml(exportData);
  
  // 添加元数据注释（不包含 targetPolicy，因为 Clash Meta 规则集不需要策略）
  const metaComment = `# Rule Set Metadata\n# id: ${meta.id}\n# name: ${meta.name}\n# behavior: ${meta.behavior}\n# description: ${meta.description}\n# tags: ${JSON.stringify(meta.tags)}\n# createdAt: ${meta.createdAt}\n# updatedAt: ${meta.updatedAt}\n\n`;
  
  return metaComment + yamlContent;
}

/**
 * 从 YAML 内容解析规则集合对象
 * @param {string} yamlString - YAML 字符串
 * @param {string} defaultId - 默认 ID
 * @returns {Object} 规则集合对象
 */
function parseYamlWithMeta(yamlString, defaultId = null) {
  // 兼容新旧格式：新格式不包含 targetPolicy，旧格式包含
  const metaRegex = /# Rule Set Metadata\n# id: ([^\n]+)\n# name: ([^\n]+)\n# behavior: ([^\n]+)\n# description: ([^\n]*)\n# tags: ([^\n]+)\n# createdAt: ([^\n]+)\n# updatedAt: ([^\n]+)/;
  const oldMetaRegex = /# Rule Set Metadata\n# id: ([^\n]+)\n# name: ([^\n]+)\n# behavior: ([^\n]+)\n# description: ([^\n]*)\n# tags: ([^\n]+)\n# targetPolicy: ([^\n]*)\n# createdAt: ([^\n]+)\n# updatedAt: ([^\n]+)/;
  
  let metaMatch = yamlString.match(metaRegex);
  let isOldFormat = false;
  
  // 如果新格式不匹配，尝试旧格式
  if (!metaMatch) {
    metaMatch = yamlString.match(oldMetaRegex);
    isOldFormat = true;
  }
  
  let meta = {
    id: defaultId || uuidv4(),
    name: 'unnamed',
    behavior: 'classical',
    description: '',
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  if (metaMatch) {
    if (isOldFormat) {
      // 旧格式：id, name, behavior, description, tags, targetPolicy, createdAt, updatedAt
      meta = {
        id: metaMatch[1] || meta.id,
        name: metaMatch[2] || meta.name,
        behavior: metaMatch[3] || meta.behavior,
        description: metaMatch[4] || '',
        tags: safeJsonParse(metaMatch[5], []),
        createdAt: metaMatch[7] || meta.createdAt,
        updatedAt: metaMatch[8] || meta.updatedAt
      };
    } else {
      // 新格式：id, name, behavior, description, tags, createdAt, updatedAt
      meta = {
        id: metaMatch[1] || meta.id,
        name: metaMatch[2] || meta.name,
        behavior: metaMatch[3] || meta.behavior,
        description: metaMatch[4] || '',
        tags: safeJsonParse(metaMatch[5], []),
        createdAt: metaMatch[6] || meta.createdAt,
        updatedAt: metaMatch[7] || meta.updatedAt
      };
    }
  }
  
  // 移除元数据注释，解析 YAML 内容
  const yamlContent = yamlString.replace(isOldFormat ? oldMetaRegex : metaRegex, '').trim();
  const data = fromYaml(yamlContent);
  
  return {
    id: meta.id,
    name: meta.name,
    behavior: meta.behavior,
    description: meta.description,
    tags: meta.tags,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
    payload: data?.payload || []
  };
}

/**
 * 安全解析 JSON
 * @param {string} str - JSON 字符串
 * @param {*} defaultValue - 默认值
 * @returns {*} 解析结果
 */
function safeJsonParse(str, defaultValue) {
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
}

/**
 * 导出的规则集合 YAML（不含元数据）
 * @param {Object} ruleSet - 规则集合对象
 * @returns {string} YAML 字符串
 */
function exportRuleSetYaml(ruleSet) {

  // 将对象格式的规则转换为字符串格式用于导出
  const payload = (ruleSet.payload || []).map(rule => ruleToString(rule, ruleSet.behavior));
  
  const exportData = {
    payload
  };
  return toYaml(exportData);
}

/**
 * 获取所有规则集合列表
 * @returns {Promise<Array>} 规则集合列表
 */
async function getAllRuleSets() {
  await ensureRuleSetsDir();
  
  const files = await fs.readdir(RULE_SETS_DIR);
  const ruleSets = [];
  
  for (const file of files) {
    if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue;
    
    try {
      const filePath = path.join(RULE_SETS_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const ruleSet = parseYamlWithMeta(content);
      ruleSets.push(ruleSet);
    } catch (e) {
      console.error(`解析规则集合文件 ${file} 失败:`, e.message);
    }
  }
  
  // 按更新时间倒序排序
  ruleSets.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  
  return ruleSets;
}

/**
 * 获取可用规则集列表（简化版，用于选择器）
 * @returns {Promise<Array>} 简化的规则集合列表
 */
async function getAvailableRuleSets() {
  const ruleSets = await getAllRuleSets();
  return ruleSets.map(rs => ({
    id: rs.id,
    name: rs.name,
    behavior: rs.behavior,
    ruleCount: rs.payload?.length || 0,
    tags: rs.tags
  }));
}

/**
 * 获取单个规则集合
 * @param {string} id - 规则集合 ID
 * @returns {Promise<Object>} 规则集合对象
 */
async function getRuleSet(id) {
  await ensureRuleSetsDir();
  
  // 遍历查找对应 ID 的文件
  const files = await fs.readdir(RULE_SETS_DIR);
  
  for (const file of files) {
    if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue;
    
    try {
      const filePath = path.join(RULE_SETS_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const ruleSet = parseYamlWithMeta(content);
      
      if (ruleSet.id === id) {
        return ruleSet;
      }
    } catch (e) {
      // 继续查找下一个文件
    }
  }
  
  throw new Error('规则集合不存在');
}

/**
 * 创建规则集合
 * @param {Object} data - 规则集合数据
 * @returns {Promise<Object>} 创建的规则集合
 */
async function createRuleSet(data) {
  await ensureRuleSetsDir();
  
  const now = new Date().toISOString();
  const ruleSet = {
    id: uuidv4(),
    name: data.name || 'unnamed',
    behavior: data.behavior || 'classical',
    description: data.description || '',
    tags: data.tags || [],
    targetPolicy: data.targetPolicy || '',
    payload: data.payload || [],
    createdAt: now,
    updatedAt: now
  };
  
  const filePath = getRuleSetPath(ruleSet.id, ruleSet.name);
  const yamlContent = ruleSetToYamlWithMeta(ruleSet);
  await fs.writeFile(filePath, yamlContent, 'utf-8');
  
  return ruleSet;
}

/**
 * 更新规则集合
 * @param {string} id - 规则集合 ID
 * @param {Object} data - 更新数据
 * @returns {Promise<Object>} 更新后的规则集合
 */
async function updateRuleSet(id, data) {
  const existing = await getRuleSet(id);
  
  const updated = {
    ...existing,
    name: data.name !== undefined ? data.name : existing.name,
    behavior: data.behavior !== undefined ? data.behavior : existing.behavior,
    description: data.description !== undefined ? data.description : existing.description,
    tags: data.tags !== undefined ? data.tags : existing.tags,
    targetPolicy: data.targetPolicy !== undefined ? data.targetPolicy : existing.targetPolicy,
    payload: data.payload !== undefined ? data.payload : existing.payload,
    updatedAt: new Date().toISOString()
  };
  
  // 检查是否需要重命名文件
  const oldPath = getRuleSetPath(id, existing.name);
  const newPath = getRuleSetPath(id, updated.name);
  
  const yamlContent = ruleSetToYamlWithMeta(updated);
  
  if (oldPath !== newPath) {
    // 删除旧文件，创建新文件
    try {
      await fs.unlink(oldPath);
    } catch (e) {
      // 忽略文件不存在的错误
    }
  }
  
  await fs.writeFile(newPath, yamlContent, 'utf-8');
  
  return updated;
}

/**
 * 删除规则集合
 * @param {string} id - 规则集合 ID
 */
async function deleteRuleSet(id) {
  const ruleSet = await getRuleSet(id);
  const filePath = getRuleSetPath(id, ruleSet.name);
  
  try {
    await fs.unlink(filePath);
  } catch (e) {
    throw new Error('删除规则集合失败');
  }
}

/**
 * 导出规则集合
 * @param {string} id - 规则集合 ID
 * @returns {Promise<string>} YAML 内容
 */
async function exportRuleSet(id) {
  const ruleSet = await getRuleSet(id);
  return exportRuleSetYaml(ruleSet);
}

/**
 * 导入规则集合
 * @param {string} yamlContent - YAML 内容
 * @param {string} name - 规则集合名称（可选）
 * @returns {Promise<Object>} 导入的规则集合
 */
async function importRuleSet(yamlContent, name = null) {
  const parsed = fromYaml(yamlContent);
  
  if (!parsed || !parsed.payload || !Array.isArray(parsed.payload)) {
    throw new Error('无效的规则集合格式，缺少 payload 字段');
  }
  
  const data = {
    name: name || 'imported-rule-set',
    behavior: 'classical',
    payload: parsed.payload
  };
  
  return createRuleSet(data);
}

/**
 * 验证规则格式
 * @param {string|Object} rule - 规则（字符串或对象格式）
 * @param {string} behavior - 行为模式
 * @returns {Object} 验证结果 { valid: boolean, error?: string }
 */
function validateRule(rule, behavior = 'classical') {
  if (!rule) {
    return { valid: false, error: '规则不能为空' };
  }
  
  // 支持对象格式的规则
  if (typeof rule === 'object') {
    return validateRuleObject(rule, behavior);
  }
  
  // 支持字符串格式的规则
  if (typeof rule === 'string') {
    return validateRuleString(rule, behavior);
  }
  
  return { valid: false, error: '无效的规则格式' };
}

/**
 * 验证对象格式的规则
 * @param {Object} rule - 规则对象
 * @param {string} behavior - 行为模式
 * @returns {Object} 验证结果
 */
function validateRuleObject(rule, behavior) {
  if (!rule.content) {
    return { valid: false, error: '规则内容不能为空' };
  }
  
  if (behavior === 'classical') {
    // Classical 模式需要 type 字段
    if (!rule.type) {
      return { valid: false, error: '规则类型不能为空' };
    }
    
    const validTypes = [
      'DOMAIN', 'DOMAIN-SUFFIX', 'DOMAIN-KEYWORD', 'IP-CIDR', 'IP-CIDR6',
      'SRC-IP-CIDR', 'GEOIP', 'GEOSITE', 'DST-PORT', 'SRC-PORT',
      'PROCESS-NAME', 'RULE-SET', 'MATCH', 'AND', 'OR', 'NOT', 'SUB-RULE'
    ];
    
    const ruleType = rule.type.toUpperCase();
    if (!validTypes.includes(ruleType)) {
      return { valid: false, error: `未知的规则类型: ${rule.type}` };
    }
    
    // 验证 policy（可选）
    if (rule.policy) {
      const validPolicies = ['REJECT', 'DIRECT', 'PROXY', 'PASS', 'REJECT-DROP'];
      if (!validPolicies.includes(rule.policy.toUpperCase())) {
        return { valid: false, error: `未知的策略: ${rule.policy}` };
      }
    }
  } else if (behavior === 'domain') {
    // Domain 模式验证域名格式
    const domainPattern = /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
    if (!domainPattern.test(rule.content)) {
      return { valid: false, error: '无效的域名格式' };
    }
  } else if (behavior === 'ipcidr') {
    // IPCIDR 模式验证 IP/CIDR 格式
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    const ipv6Pattern = /^([0-9a-fA-F:]+)(\/\d{1,3})?$/;
    
    if (!ipv4Pattern.test(rule.content) && !ipv6Pattern.test(rule.content)) {
      return { valid: false, error: '无效的 IP/CIDR 格式' };
    }
  }
  
  return { valid: true };
}

/**
 * 验证字符串格式的规则
 * @param {string} rule - 规则字符串
 * @param {string} behavior - 行为模式
 * @returns {Object} 验证结果
 */
function validateRuleString(rule, behavior) {
  if (behavior === 'classical') {
    // Classical 模式验证完整规则格式
    const parts = rule.split(',');
    if (parts.length < 2) {
      return { valid: false, error: '规则格式错误，应为: TYPE,VALUE[,POLICY]' };
    }
    
    const validTypes = [
      'DOMAIN', 'DOMAIN-SUFFIX', 'DOMAIN-KEYWORD', 'IP-CIDR', 'IP-CIDR6',
      'SRC-IP-CIDR', 'GEOIP', 'GEOSITE', 'DST-PORT', 'SRC-PORT',
      'PROCESS-NAME', 'RULE-SET', 'MATCH', 'AND', 'OR', 'NOT', 'SUB-RULE'
    ];
    
    const ruleType = parts[0].toUpperCase();
    if (!validTypes.includes(ruleType)) {
      return { valid: false, error: `未知的规则类型: ${parts[0]}` };
    }
  } else if (behavior === 'domain') {
    // Domain 模式验证域名格式
    const domainPattern = /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
    if (!domainPattern.test(rule)) {
      return { valid: false, error: '无效的域名格式' };
    }
  } else if (behavior === 'ipcidr') {
    // IPCIDR 模式验证 IP/CIDR 格式
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    const ipv6Pattern = /^([0-9a-fA-F:]+)(\/\d{1,3})?$/;
    
    if (!ipv4Pattern.test(rule) && !ipv6Pattern.test(rule)) {
      return { valid: false, error: '无效的 IP/CIDR 格式' };
    }
  }
  
  return { valid: true };
}

/**
 * 批量验证规则
 * @param {Array} rules - 规则数组
 * @param {string} behavior - 行为模式
 * @returns {Object} 验证结果 { valid: boolean, errors: Array }
 */
function validateRules(rules, behavior = 'classical') {
  const errors = [];
  
  for (let i = 0; i < rules.length; i++) {
    const result = validateRule(rules[i], behavior);
    if (!result.valid) {
      errors.push({ index: i, rule: rules[i], error: result.error });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 获取规则集合的发布链接
 * @param {string} id - 规则集合 ID
 * @param {string} publishUrl - 发布 URL 前缀
 * @returns {Promise<string>} 完整发布链接
 */
async function getPublishUrl(id, publishUrl) {
  const ruleSet = await getRuleSet(id);
  const fileName = `${sanitizeFileName(ruleSet.name)}.yaml`;
  return `${publishUrl.replace(/\/$/, '')}/${fileName}`;
}

module.exports = {
  getAllRuleSets,
  getAvailableRuleSets,
  getRuleSet,
  createRuleSet,
  updateRuleSet,
  deleteRuleSet,
  exportRuleSet,
  importRuleSet,
  validateRule,
  validateRules,
  getPublishUrl,
  sanitizeFileName
};