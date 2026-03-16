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

module.exports = {
  toYaml,
  fromYaml,
  validateClashConfig,
  generateDefaultConfig
};