const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { toYaml, fromYaml, validateClashConfig, generateDefaultConfig } = require('../utils/yaml');

const CONFIGS_DIR = path.join(__dirname, '../data/configs');

// UUID 格式验证正则
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 验证配置 ID 格式
 * @param {string} id - 配置 ID
 * @returns {boolean} 是否有效
 */
function isValidConfigId(id) {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

/**
 * 将配置名称转换为安全的文件名
 * @param {string} name - 配置名称
 * @returns {string} 安全的文件名
 */
function sanitizeFileName(name) {
  if (!name || typeof name !== 'string') {
    return 'unnamed';
  }
  // 移除或替换不允许作为文件名的字符
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')  // 替换非法字符
    .replace(/\s+/g, '_')                      // 空格替换为下划线
    .replace(/_{2,}/g, '_')                    // 多个下划线合并为一个
    .replace(/^_|_$/g, '')                     // 移除首尾下划线
    .substring(0, 200) || 'unnamed';           // 限制长度，防止过长
}

/**
 * 确保配置目录存在
 */
async function ensureConfigDir() {
  try {
    await fs.access(CONFIGS_DIR);
  } catch {
    await fs.mkdir(CONFIGS_DIR, { recursive: true });
  }
}

/**
 * 获取配置文件路径（使用配置名称作为文件名）
 * @param {string} id - 配置 ID（用于内部标识）
 * @param {string} name - 配置名称（用于文件名）
 * @returns {string} 配置文件路径
 */
function getConfigPath(id, name = null) {
  if (!isValidConfigId(id)) {
    throw new Error('无效的配置 ID 格式');
  }
  // 使用名称作为文件名，ID 存储在文件内容中
  const safeName = sanitizeFileName(name || id);
  return path.join(CONFIGS_DIR, `${safeName}.yaml`);
}

/**
 * 将配置对象转换为带有元数据注释的 YAML
 * @param {Object} config - 配置对象
 * @returns {string} YAML 字符串（带元数据注释）
 */
function configToYamlWithMeta(config) {
  // 提取元数据
  const meta = {
    id: config.id,
    name: config.name,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt
  };
  
  // 创建导出数据（移除元数据）
  const exportData = { ...config };
  delete exportData.id;
  delete exportData.name;
  delete exportData.createdAt;
  delete exportData.updatedAt;
  
  // 生成 YAML 内容
  const yamlContent = toYaml(exportData);
  
  // 添加元数据注释
  const metaComment = `# Clash Configurator Metadata\n# id: ${meta.id}\n# name: ${meta.name}\n# createdAt: ${meta.createdAt}\n# updatedAt: ${meta.updatedAt}\n\n`;
  
  return metaComment + yamlContent;
}

/**
 * 从 YAML 内容解析配置对象（包含元数据）
 * @param {string} yamlString - YAML 字符串
 * @param {string} defaultId - 默认 ID（如果 YAML 中没有）
 * @returns {Object} 配置对象
 */
function parseYamlWithMeta(yamlString, defaultId = null) {
  // 提取元数据注释
  const metaRegex = /# Clash Configurator Metadata\n# id: ([^\n]+)\n# name: ([^\n]+)\n# createdAt: ([^\n]+)\n# updatedAt: ([^\n]+)/;
  const match = yamlString.match(metaRegex);
  
  let meta = {
    id: defaultId,
    name: '未命名配置',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  if (match) {
    meta.id = match[1].trim();
    meta.name = match[2].trim();
    meta.createdAt = match[3].trim();
    meta.updatedAt = match[4].trim();
  }
  
  // 移除元数据注释后解析 YAML
  const cleanYaml = yamlString.replace(metaRegex, '').trim();
  const data = fromYaml(cleanYaml);
  
  return {
    ...data,
    ...meta
  };
}

/**
 * 获取所有配置列表
 * @returns {Promise<Array>} 配置列表
 */
async function getAllConfigs() {
  await ensureConfigDir();
  const files = await fs.readdir(CONFIGS_DIR);
  const configs = [];

  for (const file of files) {
    // 支持 YAML 和 JSON 两种格式（兼容旧数据）
    if (file.endsWith('.yaml') || file.endsWith('.yml')) {
      try {
        const content = await fs.readFile(path.join(CONFIGS_DIR, file), 'utf-8');
        const config = parseYamlWithMeta(content);
        configs.push({
          id: config.id,
          name: config.name,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt,
          proxyCount: config.proxies?.length || 0,
          groupCount: config['proxy-groups']?.length || 0,
          ruleCount: config.rules?.length || 0
        });
      } catch (error) {
        console.error(`读取配置文件 ${file} 失败:`, error);
      }
    } else if (file.endsWith('.json')) {
      // 兼容旧的 JSON 格式
      try {
        const content = await fs.readFile(path.join(CONFIGS_DIR, file), 'utf-8');
        const config = JSON.parse(content);
        configs.push({
          id: config.id,
          name: config.name,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt,
          proxyCount: config.proxies?.length || 0,
          groupCount: config['proxy-groups']?.length || 0,
          ruleCount: config.rules?.length || 0
        });
      } catch (error) {
        console.error(`读取配置文件 ${file} 失败:`, error);
      }
    }
  }

  return configs.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

/**
 * 获取单个配置详情
 * @param {string} id - 配置 ID
 * @returns {Promise<Object>} 配置详情
 */
async function getConfig(id) {
  await ensureConfigDir();
  
  // 遍历所有 YAML 文件查找匹配的 ID
  const files = await fs.readdir(CONFIGS_DIR);
  
  for (const file of files) {
    if (file.endsWith('.yaml') || file.endsWith('.yml')) {
      try {
        const content = await fs.readFile(path.join(CONFIGS_DIR, file), 'utf-8');
        const config = parseYamlWithMeta(content);
        if (config.id === id) {
          return config;
        }
      } catch (error) {
        // 忽略解析错误，继续查找
      }
    } else if (file.endsWith('.json')) {
      // 兼容旧的 JSON 格式
      try {
        const content = await fs.readFile(path.join(CONFIGS_DIR, file), 'utf-8');
        const config = JSON.parse(content);
        if (config.id === id) {
          return config;
        }
      } catch (error) {
        // 忽略解析错误，继续查找
      }
    }
  }
  
  throw new Error(`配置不存在: ${id}`);
}

/**
 * 创建新配置
 * @param {Object} data - 配置数据
 * @returns {Promise<Object>} 创建的配置
 */
async function createConfig(data = {}) {
  await ensureConfigDir();
  
  const id = uuidv4();
  const now = new Date().toISOString();
  
  const config = {
    id,
    name: data.name || '未命名配置',
    createdAt: now,
    updatedAt: now,
    ...generateDefaultConfig(),
    ...data
  };

  // 确保 proxies 和 proxy-groups 是数组
  config.proxies = config.proxies || [];
  config['proxy-groups'] = config['proxy-groups'] || [];
  config['proxy-providers'] = config['proxy-providers'] || {};
  config.rules = config.rules || [];

  // 使用配置名称作为文件名
  const configPath = getConfigPath(id, config.name);
  await fs.writeFile(configPath, configToYamlWithMeta(config), 'utf-8');
  
  return config;
}

/**
 * 更新配置
 * @param {string} id - 配置 ID
 * @param {Object} data - 更新数据
 * @returns {Promise<Object>} 更新后的配置
 */
async function updateConfig(id, data) {
  const config = await getConfig(id);
  const oldName = config.name;
  
  // 不允许更新的字段
  delete data.id;
  delete data.createdAt;
  
  const updatedConfig = {
    ...config,
    ...data,
    updatedAt: new Date().toISOString()
  };

  // 如果名称发生变化，需要重命名文件
  if (data.name && data.name !== oldName) {
    const oldPath = getConfigPath(id, oldName);
    const newPath = getConfigPath(id, updatedConfig.name);
    
    // 写入新文件
    await fs.writeFile(newPath, configToYamlWithMeta(updatedConfig), 'utf-8');
    
    // 删除旧文件
    try {
      await fs.unlink(oldPath);
    } catch {
      // 忽略错误，文件可能不存在
    }
  } else {
    // 名称未变化，直接更新
    const configPath = getConfigPath(id, updatedConfig.name);
    await fs.writeFile(configPath, configToYamlWithMeta(updatedConfig), 'utf-8');
  }
  
  // 删除旧的 JSON 文件（如果存在，兼容旧数据）
  const jsonPath = path.join(CONFIGS_DIR, `${id}.json`);
  try {
    await fs.unlink(jsonPath);
  } catch {
    // 忽略错误，文件可能不存在
  }
  
  return updatedConfig;
}

/**
 * 删除配置
 * @param {string} id - 配置 ID
 * @returns {Promise<boolean>} 是否成功
 */
async function deleteConfig(id) {
  await ensureConfigDir();
  
  // 先获取配置以找到文件名
  const config = await getConfig(id);
  const safeName = sanitizeFileName(config.name);
  const yamlPath = path.join(CONFIGS_DIR, `${safeName}.yaml`);
  const jsonPath = path.join(CONFIGS_DIR, `${id}.json`);
  
  let deleted = false;
  
  // 尝试删除 YAML 文件
  try {
    await fs.unlink(yamlPath);
    deleted = true;
  } catch {
    // 忽略错误
  }
  
  // 尝试删除 JSON 文件（兼容旧数据）
  try {
    await fs.unlink(jsonPath);
    deleted = true;
  } catch {
    // 忽略错误
  }
  
  if (!deleted) {
    throw new Error(`删除配置失败: ${id}`);
  }
  
  return true;
}

/**
 * 获取配置的原始 YAML 内容（用于编辑）
 * @param {string} id - 配置 ID
 * @returns {Promise<string>} YAML 字符串
 */
async function getConfigYaml(id) {
  const config = await getConfig(id);
  return configToYamlWithMeta(config);
}

/**
 * 从 YAML 内容更新配置（用于编辑器保存）
 * @param {string} id - 配置 ID
 * @param {string} yamlString - YAML 内容
 * @returns {Promise<Object>} 更新后的配置
 */
async function updateConfigFromYaml(id, yamlString) {
  // 解析 YAML 内容
  const config = parseYamlWithMeta(yamlString, id);
  
  // 验证配置
  const validation = validateClashConfig(config);
  if (!validation.valid) {
    throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
  }
  
  // 确保必要的元数据
  const existingConfig = await getConfig(id);
  const oldName = existingConfig.name;
  const updatedConfig = {
    ...config,
    id: existingConfig.id, // 保持原有 ID
    name: config.name || existingConfig.name,
    createdAt: existingConfig.createdAt, // 保持创建时间
    updatedAt: new Date().toISOString()
  };
  
  // 如果名称发生变化，需要重命名文件
  if (updatedConfig.name !== oldName) {
    const oldPath = getConfigPath(id, oldName);
    const newPath = getConfigPath(id, updatedConfig.name);
    
    // 写入新文件
    await fs.writeFile(newPath, configToYamlWithMeta(updatedConfig), 'utf-8');
    
    // 删除旧文件
    try {
      await fs.unlink(oldPath);
    } catch {
      // 忽略错误，文件可能不存在
    }
  } else {
    // 名称未变化，直接更新
    const configPath = getConfigPath(id, updatedConfig.name);
    await fs.writeFile(configPath, configToYamlWithMeta(updatedConfig), 'utf-8');
  }
  
  // 删除旧的 JSON 文件（如果存在）
  const jsonPath = path.join(CONFIGS_DIR, `${id}.json`);
  try {
    await fs.unlink(jsonPath);
  } catch {
    // 忽略错误，文件可能不存在
  }
  
  return updatedConfig;
}

/**
 * 导出配置为 YAML
 * @param {string} id - 配置 ID
 * @returns {Promise<string>} YAML 字符串
 */
async function exportConfig(id) {
  const config = await getConfig(id);
  
  // 移除内部字段
  const exportData = { ...config };
  delete exportData.id;
  delete exportData.createdAt;
  delete exportData.updatedAt;
  
  // 处理 rule-providers 中的 local 类型
  // local 类型是应用内部使用的，导出时需要移除内部字段
  if (exportData['rule-providers']) {
    const processedProviders = {};
    for (const [name, provider] of Object.entries(exportData['rule-providers'])) {
      if (provider.type === 'local') {
        // local 类型导出时移除内部字段，保留必要信息
        // 注意：实际使用时用户需要将规则集文件放到指定位置
        const { localRuleSetId, localRuleSet, ...exportProvider } = provider;
        // 导出为 file 类型，路径使用规则集名称
        exportProvider.type = 'file';
        exportProvider.path = `./rule-sets/${name}.yaml`;
        processedProviders[name] = exportProvider;
      } else {
        processedProviders[name] = provider;
      }
    }
    exportData['rule-providers'] = processedProviders;
  }
  
  return toYaml(exportData);
}

/**
 * 从 YAML 导入配置
 * @param {string} yamlString - YAML 字符串
 * @param {string} name - 配置名称
 * @returns {Promise<Object>} 导入的配置
 */
async function importConfig(yamlString, name = '导入的配置') {
  const data = fromYaml(yamlString);
  
  // 验证配置
  const validation = validateClashConfig(data);
  if (!validation.valid) {
    throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
  }

  return createConfig({
    name,
    ...data
  });
}

/**
 * 预览 YAML（不保存）
 * @param {Object} data - 配置数据
 * @returns {string} YAML 字符串
 */
function previewYaml(data) {
  const exportData = { ...data };
  delete exportData.id;
  delete exportData.createdAt;
  delete exportData.updatedAt;
  
  // 处理 rule-providers 中的 local 类型
  if (exportData['rule-providers']) {
    const processedProviders = {};
    for (const [name, provider] of Object.entries(exportData['rule-providers'])) {
      if (provider.type === 'local') {
        const { localRuleSetId, localRuleSet, ...exportProvider } = provider;
        exportProvider.type = 'file';
        exportProvider.path = `./rule-sets/${name}.yaml`;
        processedProviders[name] = exportProvider;
      } else {
        processedProviders[name] = provider;
      }
    }
    exportData['rule-providers'] = processedProviders;
  }
  
  return toYaml(exportData);
}

/**
 * 验证配置
 * @param {Object} data - 配置数据
 * @returns {Object} 验证结果
 */
function validateConfig(data) {
  return validateClashConfig(data);
}

/**
 * 验证 YAML 内容
 * @param {string} yamlString - YAML 字符串
 * @returns {Object} 验证结果 { valid: boolean, errors: string[], data: Object }
 */
function validateYaml(yamlString) {
  try {
    const data = fromYaml(yamlString);
    const validation = validateClashConfig(data);
    return {
      valid: validation.valid,
      errors: validation.errors,
      data: validation.valid ? data : null
    };
  } catch (error) {
    return {
      valid: false,
      errors: [error.message],
      data: null
    };
  }
}

module.exports = {
  getAllConfigs,
  getConfig,
  createConfig,
  updateConfig,
  deleteConfig,
  exportConfig,
  importConfig,
  previewYaml,
  validateConfig,
  getConfigYaml,
  updateConfigFromYaml,
  validateYaml
};