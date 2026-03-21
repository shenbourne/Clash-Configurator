const yaml = require('js-yaml');

/**
 * 将 JavaScript 对象转换为 YAML 字符串
 * @param {Object} data - 要转换的数据
 * @returns {string} YAML 字符串
 */
function toYaml(data) {
  try {
    return yaml.dump(data, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
      quotingType: '"',
      forceQuotes: false
    });
  } catch (error) {
    throw new Error(`YAML 序列化失败: ${error.message}`);
  }
}

/**
 * 将 YAML 字符串解析为 JavaScript 对象
 * @param {string} yamlString - YAML 字符串
 * @returns {Object} 解析后的对象
 */
function fromYaml(yamlString) {
  try {
    // 使用 JSON_SCHEMA 限制为安全的 YAML 子集，防止反序列化攻击
    return yaml.load(yamlString, { schema: yaml.JSON_SCHEMA });
  } catch (error) {
    throw new Error(`YAML 解析失败: ${error.message}`);
  }
}

/**
 * 验证 Clash 配置的基本结构
 * @param {Object} config - 配置对象
 * @returns {Object} 验证结果 { valid: boolean, errors: string[] }
 */
function validateClashConfig(config) {
  const errors = [];

  if (!config || typeof config !== 'object') {
    errors.push('配置必须是一个有效的对象');
    return { valid: false, errors };
  }

  // 验证代理节点
  if (config.proxies && Array.isArray(config.proxies)) {
    config.proxies.forEach((proxy, index) => {
      if (!proxy.name) {
        errors.push(`代理节点 ${index + 1} 缺少名称`);
      }
      if (!proxy.type) {
        errors.push(`代理节点 ${index + 1} 缺少类型`);
      }
      if (!proxy.server) {
        errors.push(`代理节点 ${index + 1} 缺少服务器地址`);
      }
      if (!proxy.port && proxy.port !== 0) {
        errors.push(`代理节点 ${index + 1} 缺少端口`);
      }
    });
  }

  // 验证代理组
  if (config['proxy-groups'] && Array.isArray(config['proxy-groups'])) {
    config['proxy-groups'].forEach((group, index) => {
      if (!group.name) {
        errors.push(`代理组 ${index + 1} 缺少名称`);
      }
      if (!group.type) {
        errors.push(`代理组 ${index + 1} 缺少类型`);
      }
    });
  }

  // 验证 proxy-providers
  if (config['proxy-providers'] && typeof config['proxy-providers'] === 'object') {
    Object.entries(config['proxy-providers']).forEach(([name, provider]) => {
      if (!provider.type) {
        errors.push(`Provider "${name}" 缺少类型`);
      } else if (!['http', 'file'].includes(provider.type)) {
        errors.push(`Provider "${name}" 类型无效，必须是 http 或 file`);
      }
      if (provider.type === 'http' && !provider.url) {
        errors.push(`HTTP Provider "${name}" 缺少 URL`);
      }
      if (provider.type === 'file' && !provider.path) {
        errors.push(`File Provider "${name}" 缺少路径`);
      }
    });
  }

  // 验证规则
  if (config.rules && Array.isArray(config.rules)) {
    config.rules.forEach((rule, index) => {
      if (typeof rule === 'string') {
        const parts = rule.split(',');
        const ruleType = parts[0]?.trim();
        
        // MATCH 规则格式: MATCH,target (只有类型和目标)
        if (ruleType === 'MATCH') {
          if (parts.length < 2 || !parts[1]?.trim()) {
            errors.push(`规则 ${index + 1} MATCH 规则缺少目标策略: ${rule}`);
          }
        } else if (parts.length < 2) {
          // 其他规则至少需要类型和值
          errors.push(`规则 ${index + 1} 格式无效: ${rule}`);
        } else if (parts.length < 3 && ruleType !== 'MATCH') {
          // 非MATCH规则需要类型、值和目标
          errors.push(`规则 ${index + 1} 缺少目标策略: ${rule}`);
        }
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 生成默认的 Clash 配置
 * @returns {Object} 默认配置对象
 */
function generateDefaultConfig() {
  return {
    'mixed-port': 7890,
    'allow-lan': false,
    'bind-address': '*',
    mode: 'rule',
    'log-level': 'info',
    ipv6: false,
    proxies: [],
    'proxy-providers': {},
    'proxy-groups': [
      {
        name: 'PROXY',
        type: 'select',
        proxies: []
      },
      {
        name: 'DIRECT',
        type: 'select',
        proxies: ['DIRECT']
      },
      {
        name: 'REJECT',
        type: 'select',
        proxies: ['REJECT']
      }
    ],
    rules: [
      'GEOIP,CN,PROXY',
      'MATCH,PROXY'
    ],
    dns: {
      enable: true,
      ipv6: false,
      'enhanced-mode': 'fake-ip',
      'fake-ip-range': '198.18.0.1/16',
      'fake-ip-filter': [
        '*.lan',
        'localhost.ptlogin2.qq.com'
      ],
      nameserver: [
        '223.5.5.5',
        '119.29.29.29'
      ],
      fallback: [
        'tls://8.8.8.8:853',
        'tls://1.1.1.1:853'
      ]
    },
    sniffer: {
      enable: true,
      'parse-pure-ip': true,
      sniff: {
        HTTP: {
          ports: [80, '8080-8880'],
          'override-destination': true
        },
        TLS: {
          ports: [443, 8443]
        },
        QUIC: {
          ports: [443, 8443]
        }
      }
    }
  };
}

/**
 * 从 YAML 内容中解析数组类型字段的分组信息
 * @param {string} yamlString - YAML 字符串
 * @param {string} key - 要解析的键名，如 'rules', 'proxy-groups', 'proxies'
 * @returns {Array} 分组数据数组
 */
function parseArrayWithGroups(yamlString, key) {
  const lines = yamlString.split('\n');
  const groups = [];
  let currentGroup = { name: null, items: [] };
  let inTargetSection = false;
  let targetIndent = -1;
  
  // 分组注释正则：匹配 #分组名 格式（#后直接跟分组名，无空格）
  const groupCommentRegex = /^\s*#(\S+)\s*$/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // 检测是否进入目标 section
    if (trimmedLine === `${key}:`) {
      inTargetSection = true;
      targetIndent = line.search(/\S/);
      continue;
    }
    
    // 检测是否离开目标 section（遇到同级或更高级的键）
    if (inTargetSection) {
      const currentIndent = line.search(/\S/);
      
      // 空行跳过
      if (trimmedLine === '') {
        continue;
      }
      
      // 遇到同级或更高级的非列表项，说明 section 结束
      if (currentIndent <= targetIndent && !trimmedLine.startsWith('-')) {
        break;
      }
      
      // 检测分组注释
      const groupMatch = trimmedLine.match(groupCommentRegex);
      if (groupMatch) {
        // 保存当前分组（如果有内容）
        if (currentGroup.items.length > 0) {
          groups.push(currentGroup);
        }
        // 开始新分组
        currentGroup = { name: groupMatch[1], items: [] };
        continue;
      }
      
      // 检测列表项
      if (trimmedLine.startsWith('-')) {
        // 解析列表项内容
        const itemContent = trimmedLine.substring(1).trim();
        
        // 对于 rules，直接存储字符串
        if (key === 'rules') {
          currentGroup.items.push(itemContent);
        } else {
          // 对于 proxy-groups 和 proxies，需要解析多行对象
          // 收集完整的 YAML 对象
          let itemYaml = line;
          let j = i + 1;
          while (j < lines.length) {
            const nextLine = lines[j];
            const nextTrimmed = nextLine.trim();
            const nextIndent = nextLine.search(/\S/);
            
            // 空行跳过但继续
            if (nextTrimmed === '') {
              j++;
              continue;
            }
            
            // 注释行停止
            if (nextTrimmed.startsWith('#')) {
              break;
            }
            
            // 如果是新的列表项（缩进等于 targetIndent + 2），停止
            if (nextTrimmed.startsWith('-') && nextIndent === targetIndent + 2) {
              break;
            }
            
            // 如果遇到同级或更高级的键（非列表项），停止
            if (nextIndent <= targetIndent && !nextTrimmed.startsWith('-')) {
              break;
            }
            
            itemYaml += '\n' + nextLine;
            j++;
          }
          
          // 解析 YAML 对象
          try {
            const parsed = yaml.load(itemYaml);
            if (parsed) {
              // yaml.load 解析列表项时会返回数组，取第一个元素
              // 处理可能的嵌套数组情况（如 [[{...}]]）
              let item = parsed;
              while (Array.isArray(item) && item.length > 0) {
                item = item[0];
              }
              if (item && typeof item === 'object' && !Array.isArray(item)) {
                currentGroup.items.push(item);
              }
            }
          } catch (e) {
            // 解析失败，跳过
          }
          
          // 跳过已处理的行
          i = j - 1;
        }
      }
    }
  }
  
  // 保存最后一个分组
  if (currentGroup.items.length > 0) {
    groups.push(currentGroup);
  }
  
  // 如果没有分组，返回默认分组
  if (groups.length === 0) {
    return [{ name: null, items: [] }];
  }
  
  return groups;
}

/**
 * 从 YAML 内容中解析对象类型字段的分组信息
 * @param {string} yamlString - YAML 字符串
 * @param {string} key - 要解析的键名，如 'rule-providers', 'proxy-providers'
 * @returns {Array} 分组数据数组
 */
function parseObjectWithGroups(yamlString, key) {
  const lines = yamlString.split('\n');
  const groups = [];
  let currentGroup = { name: null, items: [] };
  let inTargetSection = false;
  let targetIndent = -1;
  
  // 分组注释正则：匹配 #分组名 格式
  const groupCommentRegex = /^\s*#(\S+)\s*$/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // 检测是否进入目标 section
    if (trimmedLine === `${key}:`) {
      inTargetSection = true;
      targetIndent = line.search(/\S/);
      continue;
    }
    
    // 检测是否离开目标 section
    if (inTargetSection) {
      const currentIndent = line.search(/\S/);
      
      // 空行跳过
      if (trimmedLine === '') {
        continue;
      }
      
      // 遇到同级或更高级的键，说明 section 结束
      if (currentIndent <= targetIndent && !trimmedLine.startsWith('#')) {
        break;
      }
      
      // 检测分组注释
      const groupMatch = trimmedLine.match(groupCommentRegex);
      if (groupMatch) {
        // 保存当前分组（如果有内容）
        if (currentGroup.items.length > 0) {
          groups.push(currentGroup);
        }
        // 开始新分组
        currentGroup = { name: groupMatch[1], items: [] };
        continue;
      }
      
      // 检测对象键（provider 名称）
      // 格式：键名:
      const keyMatch = trimmedLine.match(/^(\S+):$/);
      if (keyMatch) {
        const itemName = keyMatch[1];
        
        // 收集完整的 YAML 对象
        let itemYaml = line;
        let j = i + 1;
        while (j < lines.length) {
          const nextLine = lines[j];
          const nextTrimmed = nextLine.trim();
          const nextIndent = nextLine.search(/\S/);
          
          // 如果是空行、注释行、新的键或同级键，停止
          if (nextTrimmed === '' || 
              nextTrimmed.startsWith('#') ||
              (nextIndent <= targetIndent + 2 && nextTrimmed.match(/^\S+:$/))) {
            break;
          }
          
          // 如果遇到同级或更高级的非缩进内容，停止
          if (nextIndent <= targetIndent) {
            break;
          }
          
          itemYaml += '\n' + nextLine;
          j++;
        }
        
        // 解析 YAML 对象
        try {
          const parsed = yaml.load(itemYaml);
          if (parsed && typeof parsed === 'object') {
            const itemData = parsed[itemName];
            if (itemData) {
              currentGroup.items.push({
                name: itemName,
                ...itemData
              });
            }
          }
        } catch (e) {
          // 解析失败，跳过
        }
        
        // 跳过已处理的行
        i = j - 1;
      }
    }
  }
  
  // 保存最后一个分组
  if (currentGroup.items.length > 0) {
    groups.push(currentGroup);
  }
  
  // 如果没有分组，返回默认分组
  if (groups.length === 0) {
    return [{ name: null, items: [] }];
  }
  
  return groups;
}

/**
 * 将分组数据序列化为 YAML 字符串片段（数组类型）
 * @param {Array} groups - 分组数据
 * @param {string} key - 键名
 * @returns {string} YAML 字符串片段
 */
function serializeArrayGroupsWithComments(groups, key) {
  let result = `${key}:\n`;
  
  for (const group of groups) {
    // 添加分组注释
    if (group.name) {
      result += `\n  #${group.name}\n`;
    }
    
    // 添加项目
    for (const item of group.items) {
      if (typeof item === 'string') {
        // 字符串类型（如 rules）
        result += `  - ${item}\n`;
      } else if (key === 'rules' && item && typeof item === 'object') {
        // 规则对象类型 - 转换为字符串格式
        const ruleString = ruleObjectToString(item);
        if (ruleString) {
          result += `  - ${ruleString}\n`;
        }
      } else if (item && typeof item === 'object') {
        // 如果是数组，取第一个元素（不应该发生，但做防御性处理）
        const objItem = Array.isArray(item) ? (item[0] || {}) : item;
        
        // 对象类型（如 proxy-groups, proxies）
        // 使用 JSON_SCHEMA 确保输出格式正确
        const itemYaml = yaml.dump(objItem, {
          indent: 2,
          lineWidth: -1,
          noRefs: true,
          sortKeys: false,
          styles: {
            '!!null': 'lower'  // null 值输出为小写
          }
        });
        
        // 将对象的每一行添加正确的缩进
        const lines = itemYaml.split('\n').filter(l => l.trim());
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (i === 0) {
            // 第一行添加 '- ' 前缀
            result += `  - ${line}\n`;
          } else {
            // 后续行添加4个空格缩进（与 '- ' 对齐）
            result += `    ${line}\n`;
          }
        }
      }
    }
  }
  
  return result;
}

/**
 * 将分组数据序列化为 YAML 字符串片段（对象类型）
 * @param {Array} groups - 分组数据
 * @param {string} key - 键名
 * @returns {string} YAML 字符串片段
 */
function serializeObjectGroupsWithComments(groups, key) {
  let result = `${key}:\n`;
  
  for (const group of groups) {
    // 添加分组注释
    if (group.name) {
      result += `\n  #${group.name}\n`;
    }
    
    // 添加项目
    for (const item of group.items) {
      const { name, ...itemData } = item;
      const itemYaml = yaml.dump({ [name]: itemData }, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false
      });
      // 添加正确的缩进
      const lines = itemYaml.split('\n').filter(l => l.trim());
      for (const line of lines) {
        result += `  ${line}\n`;
      }
    }
  }
  
  return result;
}

/**
 * 将规则对象转换为字符串
 * @param {Object|string} item - 规则对象或字符串
 * @returns {string} 规则字符串
 */
function ruleObjectToString(item) {
  // 如果有 raw 属性，直接使用
  if (item && item.raw) {
    return item.raw;
  }
  
  // 如果是字符串，直接返回
  if (typeof item === 'string') {
    return item;
  }
  
  // 如果是对象，构建规则字符串
  if (item && typeof item === 'object') {
    const type = item.type || '';
    const value = item.value || '';
    const target = item.target || '';
    const noResolve = item.noResolve ? ',no-resolve' : '';
    
    // MATCH 规则特殊处理
    if (type === 'MATCH') {
      return `MATCH,${target}`;
    }
    
    // 其他规则
    if (type && value && target) {
      return `${type},${value},${target}${noResolve}`;
    }
  }
  
  return '';
}

/**
 * 将分组数据转换为普通数组（用于兼容旧代码）
 * @param {Array} groups - 分组数据
 * @returns {Array} 所有项目的数组
 */
function groupsToArray(groups) {
  if (!groups || !Array.isArray(groups)) {
    return [];
  }
  return groups.flatMap(g => {
    const items = g.items || [];
    // 处理可能的嵌套数组情况
    return items.map(item => {
      if (Array.isArray(item)) {
        // 如果是数组，取第一个元素（如果是对象）
        let unwrapped = item;
        while (Array.isArray(unwrapped) && unwrapped.length > 0) {
          unwrapped = unwrapped[0];
        }
        return unwrapped && typeof unwrapped === 'object' ? unwrapped : item;
      }
      return item;
    });
  });
}

/**
 * 将分组数据转换为规则字符串数组
 * @param {Array} groups - 分组数据
 * @returns {Array} 规则字符串数组
 */
function groupsToRuleStrings(groups) {
  if (!groups || !Array.isArray(groups)) {
    return [];
  }
  return groups.flatMap(g => {
    const items = g.items || [];
    return items.map(item => ruleObjectToString(item)).filter(r => r);
  });
}

/**
 * 将分组数据转换为普通对象（用于兼容旧代码）
 * @param {Array} groups - 分组数据
 * @returns {Object} 所有项目的对象
 */
function groupsToObject(groups) {
  if (!groups || !Array.isArray(groups)) {
    return {};
  }
  const result = {};
  for (const group of groups) {
    for (const item of (group.items || [])) {
      if (item && item.name) {
        const { name, ...data } = item;
        result[name] = data;
      }
    }
  }
  return result;
}

/**
 * 将普通数组转换为分组数据
 * @param {Array} items - 项目数组
 * @returns {Array} 分组数据（单个默认分组）
 */
function arrayToGroups(items) {
  if (!items || !Array.isArray(items)) {
    return [{ name: null, items: [] }];
  }
  return [{ name: null, items: [...items] }];
}

/**
 * 将普通对象转换为分组数据
 * @param {Object} obj - 项目对象
 * @returns {Array} 分组数据（单个默认分组）
 */
function objectToGroups(obj) {
  if (!obj || typeof obj !== 'object') {
    return [{ name: null, items: [] }];
  }
  const items = Object.entries(obj).map(([name, data]) => ({
    name,
    ...data
  }));
  return [{ name: null, items }];
}

module.exports = {
  toYaml,
  fromYaml,
  validateClashConfig,
  generateDefaultConfig,
  // 分组相关函数
  parseArrayWithGroups,
  parseObjectWithGroups,
  serializeArrayGroupsWithComments,
  serializeObjectGroupsWithComments,
  groupsToArray,
  groupsToObject,
  arrayToGroups,
  objectToGroups,
  groupsToRuleStrings,
  ruleObjectToString
};