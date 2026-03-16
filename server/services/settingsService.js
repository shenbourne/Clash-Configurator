const fs = require('fs').promises;
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, '../data/settings.json');

// 默认设置
const DEFAULT_SETTINGS = {
  exportDirectory: '',
  autoExport: false,
  exportFormat: 'yaml', // yaml 或 json
  publishUrl: '',       // 规则集合发布 URL 前缀
  ruleSetTags: []       // 规则集合标签列表
};

/**
 * 确保设置目录存在
 */
async function ensureSettingsDir() {
  const dir = path.dirname(SETTINGS_FILE);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * 获取设置
 * @returns {Promise<Object>} 设置对象
 */
async function getSettings() {
  await ensureSettingsDir();
  try {
    const content = await fs.readFile(SETTINGS_FILE, 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(content) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * 更新设置
 * @param {Object} updates - 要更新的设置
 * @returns {Promise<Object>} 更新后的设置
 */
async function updateSettings(updates) {
  await ensureSettingsDir();
  const currentSettings = await getSettings();
  const newSettings = { ...currentSettings, ...updates };
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(newSettings, null, 2), 'utf-8');
  return newSettings;
}

/**
 * 设置导出目录
 * @param {string} directory - 导出目录路径
 * @returns {Promise<Object>} 结果对象 { success: boolean, message: string }
 */
async function setExportDirectory(directory) {
  if (!directory) {
    await updateSettings({ exportDirectory: '', autoExport: false });
    return { success: true, message: '已清除导出目录设置' };
  }

  // 安全验证：规范化路径并检查路径遍历
  const normalizedPath = path.normalize(directory);
  
  // 检查是否包含路径遍历字符
  if (normalizedPath.includes('..')) {
    return { success: false, message: '路径不能包含 ".." 等相对路径字符' };
  }

  // 在 Windows 上检查是否为绝对路径且指向系统敏感目录
  if (process.platform === 'win32') {
    const lowerPath = normalizedPath.toLowerCase();
    const forbiddenPaths = ['\\windows\\', '\\system32\\', '\\program files\\', '\\program files (x86)\\'];
    for (const forbidden of forbiddenPaths) {
      if (lowerPath.includes(forbidden)) {
        return { success: false, message: '不允许使用系统敏感目录' };
      }
    }
  }

  // 验证目录是否存在，不存在则尝试创建
  try {
    await fs.access(normalizedPath);
  } catch {
    try {
      await fs.mkdir(normalizedPath, { recursive: true });
    } catch (error) {
      return { success: false, message: `无法创建目录: ${error.message}` };
    }
  }

  // 测试写入权限
  const testFile = path.join(normalizedPath, '.write_test');
  try {
    await fs.writeFile(testFile, 'test');
    await fs.unlink(testFile);
  } catch (error) {
    return { success: false, message: `目录无写入权限: ${error.message}` };
  }

  await updateSettings({ exportDirectory: normalizedPath });
  return { success: true, message: '导出目录设置成功' };
}

/**
 * 导出配置到指定目录
 * @param {Object} config - 配置对象
 * @param {string} yamlContent - YAML 格式的配置内容
 * @returns {Promise<Object>} 结果对象 { success: boolean, message: string, path: string }
 */
async function exportConfigToDirectory(config, yamlContent) {
  const settings = await getSettings();
  
  if (!settings.exportDirectory) {
    return { success: false, message: '未设置导出目录' };
  }

  try {
    // 确保目录存在
    try {
      await fs.access(settings.exportDirectory);
    } catch {
      await fs.mkdir(settings.exportDirectory, { recursive: true });
    }

    // 生成文件名（使用配置名称，清理非法字符）
    const safeName = (config.name || 'config')
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_');
    
    const fileName = settings.exportFormat === 'json' 
      ? `${safeName}.json`
      : `${safeName}.yaml`;
    
    const filePath = path.join(settings.exportDirectory, fileName);

    // 根据格式写入文件
    let content;
    if (settings.exportFormat === 'json') {
      // 移除内部字段
      const exportData = { ...config };
      delete exportData.id;
      delete exportData.createdAt;
      delete exportData.updatedAt;
      content = JSON.stringify(exportData, null, 2);
    } else {
      content = yamlContent;
    }

    await fs.writeFile(filePath, content, 'utf-8');
    
    return { 
      success: true, 
      message: `配置已导出到: ${filePath}`,
      path: filePath 
    };
  } catch (error) {
    return { success: false, message: `导出失败: ${error.message}` };
  }
}

module.exports = {
  getSettings,
  updateSettings,
  setExportDirectory,
  exportConfigToDirectory
};