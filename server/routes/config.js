const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const configService = require('../services/configService');
const settingsService = require('../services/settingsService');

const router = express.Router();

// 配置文件上传 - 使用随机文件名防止路径遍历和文件覆盖攻击
const upload = multer({
  storage: multer.diskStorage({
    destination: 'server/data/temp/',
    filename: (req, file, cb) => {
      // 使用 UUID 生成随机文件名，保留原始扩展名
      const randomName = uuidv4() + path.extname(file.originalname).toLowerCase();
      cb(null, randomName);
    }
  }),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.yaml' || ext === '.yml') {
      cb(null, true);
    } else {
      cb(new Error('只支持 YAML 文件'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制文件大小为 5MB
  }
});

// ==================== 配置管理 ====================

/**
 * GET /api/configs
 * 获取所有配置列表
 */
router.get('/configs', async (req, res) => {
  try {
    const configs = await configService.getAllConfigs();
    res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/configs
 * 创建新配置
 */
router.post('/configs', async (req, res) => {
  try {
    const config = await configService.createConfig(req.body);
    res.status(201).json({
      success: true,
      data: config,
      message: '配置创建成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/configs/:id
 * 获取单个配置详情
 */
router.get('/configs/:id', async (req, res) => {
  try {
    const config = await configService.getConfig(req.params.id);
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/configs/:id
 * 更新配置
 */
router.put('/configs/:id', async (req, res) => {
  try {
    const config = await configService.updateConfig(req.params.id, req.body);
    
    // 自动导出到指定目录
    const settings = await settingsService.getSettings();
    if (settings.autoExport && settings.exportDirectory) {
      const yaml = await configService.exportConfig(req.params.id);
      await settingsService.exportConfigToDirectory(config, yaml);
    }
    
    res.json({
      success: true,
      data: config,
      message: '配置更新成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * DELETE /api/configs/:id
 * 删除配置
 */
router.delete('/configs/:id', async (req, res) => {
  try {
    await configService.deleteConfig(req.params.id);
    res.json({
      success: true,
      message: '配置删除成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/configs/import
 * 导入配置文件
 */
router.post('/configs/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请上传 YAML 配置文件'
      });
    }

    const fs = require('fs').promises;
    const yamlContent = await fs.readFile(req.file.path, 'utf-8');
    
    // 清理临时文件
    await fs.unlink(req.file.path);

    const name = req.body.name || req.file.originalname.replace(/\.(yaml|yml)$/, '');
    const config = await configService.importConfig(yamlContent, name);
    
    res.status(201).json({
      success: true,
      data: config,
      message: '配置导入成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/configs/:id/export
 * 导出配置为 YAML
 */
router.get('/configs/:id/export', async (req, res) => {
  try {
    const yaml = await configService.exportConfig(req.params.id);
    const config = await configService.getConfig(req.params.id);
    
    res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(config.name)}.yaml"`);
    res.send(yaml);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/configs/preview
 * 预览 YAML（不保存）
 */
router.post('/configs/preview', async (req, res) => {
  try {
    const yaml = configService.previewYaml(req.body);
    res.type('text/yaml').send(yaml);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/configs/validate
 * 验证配置
 */
router.post('/configs/validate', async (req, res) => {
  try {
    const result = configService.validateConfig(req.body);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/configs/validate-yaml
 * 验证 YAML 内容
 */
router.post('/configs/validate-yaml', async (req, res) => {
  try {
    const { yaml } = req.body;
    if (!yaml) {
      return res.status(400).json({
        success: false,
        message: '请提供 YAML 内容'
      });
    }
    const result = configService.validateYaml(yaml);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/configs/:id/yaml
 * 获取配置的原始 YAML 内容（用于编辑）
 */
router.get('/configs/:id/yaml', async (req, res) => {
  try {
    const yaml = await configService.getConfigYaml(req.params.id);
    res.type('text/yaml').send(yaml);
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/configs/:id/yaml
 * 从 YAML 内容更新配置（用于编辑器保存）
 */
router.put('/configs/:id/yaml', async (req, res) => {
  try {
    const { yaml } = req.body;
    if (!yaml) {
      return res.status(400).json({
        success: false,
        message: '请提供 YAML 内容'
      });
    }
    const config = await configService.updateConfigFromYaml(req.params.id, yaml);
    res.json({
      success: true,
      data: config,
      message: '配置更新成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// ==================== 代理节点管理 ====================

/**
 * GET /api/configs/:id/proxies
 * 获取代理节点列表
 */
router.get('/configs/:id/proxies', async (req, res) => {
  try {
    const config = await configService.getConfig(req.params.id);
    res.json({
      success: true,
      data: config.proxies || []
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/configs/:id/proxies
 * 添加代理节点
 */
router.post('/configs/:id/proxies', async (req, res) => {
  try {
    const config = await configService.getConfig(req.params.id);
    const proxies = config.proxies || [];
    
    // 检查名称是否重复
    if (proxies.some(p => p.name === req.body.name)) {
      return res.status(400).json({
        success: false,
        message: '代理节点名称已存在'
      });
    }

    proxies.push(req.body);
    const updatedConfig = await configService.updateConfig(req.params.id, { proxies });
    
    res.status(201).json({
      success: true,
      data: updatedConfig.proxies,
      message: '代理节点添加成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/configs/:id/proxies/:proxyName
 * 更新代理节点
 */
router.put('/configs/:id/proxies/:proxyName', async (req, res) => {
  try {
    const config = await configService.getConfig(req.params.id);
    const proxies = config.proxies || [];
    const proxyName = decodeURIComponent(req.params.proxyName);
    
    const index = proxies.findIndex(p => p.name === proxyName);
    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: '代理节点不存在'
      });
    }

    // 如果修改了名称，检查新名称是否重复
    if (req.body.name && req.body.name !== proxyName) {
      if (proxies.some(p => p.name === req.body.name)) {
        return res.status(400).json({
          success: false,
          message: '代理节点名称已存在'
        });
      }
      
      // 更新代理组中的引用
      if (config['proxy-groups']) {
        config['proxy-groups'] = config['proxy-groups'].map(group => ({
          ...group,
          proxies: group.proxies.map(p => p === proxyName ? req.body.name : p)
        }));
      }
    }

    proxies[index] = { ...proxies[index], ...req.body };
    const updatedConfig = await configService.updateConfig(req.params.id, { 
      proxies,
      'proxy-groups': config['proxy-groups']
    });
    
    res.json({
      success: true,
      data: updatedConfig.proxies,
      message: '代理节点更新成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * DELETE /api/configs/:id/proxies/:proxyName
 * 删除代理节点
 */
router.delete('/configs/:id/proxies/:proxyName', async (req, res) => {
  try {
    const config = await configService.getConfig(req.params.id);
    const proxies = config.proxies || [];
    const proxyName = decodeURIComponent(req.params.proxyName);
    
    const index = proxies.findIndex(p => p.name === proxyName);
    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: '代理节点不存在'
      });
    }

    proxies.splice(index, 1);
    
    // 从代理组中移除该节点引用
    if (config['proxy-groups']) {
      config['proxy-groups'] = config['proxy-groups'].map(group => ({
        ...group,
        proxies: group.proxies.filter(p => p !== proxyName)
      }));
    }

    const updatedConfig = await configService.updateConfig(req.params.id, { 
      proxies,
      'proxy-groups': config['proxy-groups']
    });
    
    res.json({
      success: true,
      data: updatedConfig.proxies,
      message: '代理节点删除成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/configs/:id/proxies/batch
 * 批量添加代理节点
 */
router.post('/configs/:id/proxies/batch', async (req, res) => {
  try {
    const config = await configService.getConfig(req.params.id);
    const proxies = config.proxies || [];
    const newProxies = req.body.proxies || [];
    
    // 过滤掉名称重复的节点
    const existingNames = new Set(proxies.map(p => p.name));
    const uniqueNewProxies = newProxies.filter(p => !existingNames.has(p.name));
    
    proxies.push(...uniqueNewProxies);
    const updatedConfig = await configService.updateConfig(req.params.id, { proxies });
    
    res.status(201).json({
      success: true,
      data: updatedConfig.proxies,
      message: `成功添加 ${uniqueNewProxies.length} 个代理节点，跳过 ${newProxies.length - uniqueNewProxies.length} 个重复节点`
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// ==================== 代理组管理 ====================

/**
 * GET /api/configs/:id/groups
 * 获取代理组列表
 */
router.get('/configs/:id/groups', async (req, res) => {
  try {
    const config = await configService.getConfig(req.params.id);
    res.json({
      success: true,
      data: config['proxy-groups'] || []
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/configs/:id/groups
 * 添加代理组
 */
router.post('/configs/:id/groups', async (req, res) => {
  try {
    const config = await configService.getConfig(req.params.id);
    const groups = config['proxy-groups'] || [];
    
    // 检查名称是否重复
    if (groups.some(g => g.name === req.body.name)) {
      return res.status(400).json({
        success: false,
        message: '代理组名称已存在'
      });
    }

    groups.push(req.body);
    const updatedConfig = await configService.updateConfig(req.params.id, { 'proxy-groups': groups });
    
    res.status(201).json({
      success: true,
      data: updatedConfig['proxy-groups'],
      message: '代理组添加成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/configs/:id/groups/:groupName
 * 更新代理组
 */
router.put('/configs/:id/groups/:groupName', async (req, res) => {
  try {
    const config = await configService.getConfig(req.params.id);
    const groups = config['proxy-groups'] || [];
    const groupName = decodeURIComponent(req.params.groupName);
    
    const index = groups.findIndex(g => g.name === groupName);
    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: '代理组不存在'
      });
    }

    // 如果修改了名称，检查新名称是否重复
    if (req.body.name && req.body.name !== groupName) {
      if (groups.some(g => g.name === req.body.name)) {
        return res.status(400).json({
          success: false,
          message: '代理组名称已存在'
        });
      }
    }

    groups[index] = { ...groups[index], ...req.body };
    const updatedConfig = await configService.updateConfig(req.params.id, { 'proxy-groups': groups });
    
    res.json({
      success: true,
      data: updatedConfig['proxy-groups'],
      message: '代理组更新成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * DELETE /api/configs/:id/groups/:groupName
 * 删除代理组
 */
router.delete('/configs/:id/groups/:groupName', async (req, res) => {
  try {
    const config = await configService.getConfig(req.params.id);
    const groups = config['proxy-groups'] || [];
    const groupName = decodeURIComponent(req.params.groupName);
    
    const index = groups.findIndex(g => g.name === groupName);
    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: '代理组不存在'
      });
    }

    groups.splice(index, 1);
    const updatedConfig = await configService.updateConfig(req.params.id, { 'proxy-groups': groups });
    
    res.json({
      success: true,
      data: updatedConfig['proxy-groups'],
      message: '代理组删除成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// ==================== 规则管理 ====================

/**
 * GET /api/configs/:id/rules
 * 获取规则列表
 */
router.get('/configs/:id/rules', async (req, res) => {
  try {
    const config = await configService.getConfig(req.params.id);
    res.json({
      success: true,
      data: config.rules || []
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/configs/:id/rules
 * 更新规则列表
 */
router.put('/configs/:id/rules', async (req, res) => {
  try {
    const rules = req.body.rules || [];
    const updatedConfig = await configService.updateConfig(req.params.id, { rules });
    
    res.json({
      success: true,
      data: updatedConfig.rules,
      message: '规则更新成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// ==================== Proxy Providers 管理 ====================

/**
 * GET /api/configs/:id/providers
 * 获取所有 proxy-providers
 */
router.get('/configs/:id/providers', async (req, res) => {
  try {
    const config = await configService.getConfig(req.params.id);
    res.json({
      success: true,
      data: config['proxy-providers'] || {}
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/configs/:id/providers
 * 添加 proxy-provider
 */
router.post('/configs/:id/providers', async (req, res) => {
  try {
    const config = await configService.getConfig(req.params.id);
    const providers = config['proxy-providers'] || {};
    const { name, ...providerConfig } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Provider 名称不能为空'
      });
    }
    
    // 检查名称是否重复
    if (providers[name]) {
      return res.status(400).json({
        success: false,
        message: 'Provider 名称已存在'
      });
    }

    // 验证 provider 配置
    if (!providerConfig.type || !['http', 'file'].includes(providerConfig.type)) {
      return res.status(400).json({
        success: false,
        message: 'Provider 类型必须是 http 或 file'
      });
    }
    
    if (providerConfig.type === 'http' && !providerConfig.url) {
      return res.status(400).json({
        success: false,
        message: 'HTTP Provider 必须提供 URL'
      });
    }
    
    if (providerConfig.type === 'file' && !providerConfig.path) {
      return res.status(400).json({
        success: false,
        message: 'File Provider 必须提供路径'
      });
    }

    providers[name] = providerConfig;
    const updatedConfig = await configService.updateConfig(req.params.id, { 'proxy-providers': providers });
    
    res.status(201).json({
      success: true,
      data: updatedConfig['proxy-providers'],
      message: 'Proxy Provider 添加成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/configs/:id/providers/:name
 * 更新 proxy-provider
 */
router.put('/configs/:id/providers/:name', async (req, res) => {
  try {
    const config = await configService.getConfig(req.params.id);
    const providers = config['proxy-providers'] || {};
    const providerName = decodeURIComponent(req.params.name);
    
    if (!providers[providerName]) {
      return res.status(404).json({
        success: false,
        message: 'Proxy Provider 不存在'
      });
    }

    const { name: newName, ...providerConfig } = req.body;
    
    // 如果要修改名称
    if (newName && newName !== providerName) {
      if (providers[newName]) {
        return res.status(400).json({
          success: false,
          message: 'Provider 名称已存在'
        });
      }
      
      // 删除旧名称的 provider
      delete providers[providerName];
      providers[newName] = providerConfig;
      
      // 更新代理组中的 use 引用
      if (config['proxy-groups']) {
        config['proxy-groups'] = config['proxy-groups'].map(group => ({
          ...group,
          use: (group.use || []).map(u => u === providerName ? newName : u)
        }));
      }
    } else {
      providers[providerName] = { ...providers[providerName], ...providerConfig };
    }
    
    const updatedConfig = await configService.updateConfig(req.params.id, { 
      'proxy-providers': providers,
      'proxy-groups': config['proxy-groups']
    });
    
    res.json({
      success: true,
      data: updatedConfig['proxy-providers'],
      message: 'Proxy Provider 更新成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * DELETE /api/configs/:id/providers/:name
 * 删除 proxy-provider
 */
router.delete('/configs/:id/providers/:name', async (req, res) => {
  try {
    const config = await configService.getConfig(req.params.id);
    const providers = config['proxy-providers'] || {};
    const providerName = decodeURIComponent(req.params.name);
    
    if (!providers[providerName]) {
      return res.status(404).json({
        success: false,
        message: 'Proxy Provider 不存在'
      });
    }

    delete providers[providerName];
    
    // 从代理组中移除对该 provider 的引用
    if (config['proxy-groups']) {
      config['proxy-groups'] = config['proxy-groups'].map(group => ({
        ...group,
        use: (group.use || []).filter(u => u !== providerName)
      }));
    }
    
    const updatedConfig = await configService.updateConfig(req.params.id, { 
      'proxy-providers': providers,
      'proxy-groups': config['proxy-groups']
    });
    
    res.json({
      success: true,
      data: updatedConfig['proxy-providers'],
      message: 'Proxy Provider 删除成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// ==================== Rule Providers 管理 ====================

/**
 * GET /api/configs/:id/rule-providers
 * 获取所有 rule-providers
 */
router.get('/configs/:id/rule-providers', async (req, res) => {
  try {
    const config = await configService.getConfig(req.params.id);
    res.json({
      success: true,
      data: config['rule-providers'] || {}
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/configs/:id/rule-providers
 * 添加 rule-provider
 */
router.post('/configs/:id/rule-providers', async (req, res) => {
  try {
    const config = await configService.getConfig(req.params.id);
    const providers = config['rule-providers'] || {};
    const { name, ...providerConfig } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: '规则集合名称不能为空'
      });
    }
    
    // 检查名称是否重复
    if (providers[name]) {
      return res.status(400).json({
        success: false,
        message: '规则集合名称已存在'
      });
    }

    // 验证 provider 配置
    if (!providerConfig.type || !['http', 'file', 'local'].includes(providerConfig.type)) {
      return res.status(400).json({
        success: false,
        message: '规则集合类型必须是 http、file 或 local'
      });
    }
    
    if (providerConfig.type === 'http' && !providerConfig.url) {
      return res.status(400).json({
        success: false,
        message: 'HTTP 规则集合必须提供 URL'
      });
    }
    
    if (providerConfig.type === 'file' && !providerConfig.path) {
      return res.status(400).json({
        success: false,
        message: 'File 规则集合必须提供路径'
      });
    }
    
    if (providerConfig.type === 'local' && !providerConfig.localRuleSetId) {
      return res.status(400).json({
        success: false,
        message: '本地规则集合必须选择规则集'
      });
    }

    providers[name] = providerConfig;
    const updatedConfig = await configService.updateConfig(req.params.id, { 'rule-providers': providers });
    
    res.status(201).json({
      success: true,
      data: updatedConfig['rule-providers'],
      message: '规则集合添加成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/configs/:id/rule-providers/:name
 * 更新 rule-provider
 */
router.put('/configs/:id/rule-providers/:name', async (req, res) => {
  try {
    const config = await configService.getConfig(req.params.id);
    const providers = config['rule-providers'] || {};
    const providerName = decodeURIComponent(req.params.name);
    
    if (!providers[providerName]) {
      return res.status(404).json({
        success: false,
        message: '规则集合不存在'
      });
    }

    const { name: newName, ...providerConfig } = req.body;
    
    // 如果要修改名称
    if (newName && newName !== providerName) {
      if (providers[newName]) {
        return res.status(400).json({
          success: false,
          message: '规则集合名称已存在'
        });
      }
      
      // 删除旧名称的 provider
      delete providers[providerName];
      providers[newName] = providerConfig;
      
      // 更新规则中对该 rule-provider 的引用
      // 规则格式: RULE-SET,providerName,target
      if (config.rules && Array.isArray(config.rules)) {
        config.rules = config.rules.map(rule => {
          if (typeof rule === 'string' && rule.startsWith('RULE-SET,')) {
            const parts = rule.split(',');
            if (parts[1] === providerName) {
              parts[1] = newName;
              return parts.join(',');
            }
          }
          return rule;
        });
      }
    } else {
      providers[providerName] = { ...providers[providerName], ...providerConfig };
    }
    
    const updatedConfig = await configService.updateConfig(req.params.id, {
      'rule-providers': providers,
      rules: config.rules
    });
    
    res.json({
      success: true,
      data: updatedConfig['rule-providers'],
      message: '规则集合更新成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * DELETE /api/configs/:id/rule-providers/:name
 * 删除 rule-provider
 */
router.delete('/configs/:id/rule-providers/:name', async (req, res) => {
  try {
    const config = await configService.getConfig(req.params.id);
    const providers = config['rule-providers'] || {};
    const providerName = decodeURIComponent(req.params.name);
    
    if (!providers[providerName]) {
      return res.status(404).json({
        success: false,
        message: '规则集合不存在'
      });
    }

    delete providers[providerName];
    
    const updatedConfig = await configService.updateConfig(req.params.id, {
      'rule-providers': providers
    });
    
    res.json({
      success: true,
      data: updatedConfig['rule-providers'],
      message: '规则集合删除成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// ==================== DNS 配置管理 ====================

/**
 * GET /api/configs/:id/dns
 * 获取 DNS 配置
 */
router.get('/configs/:id/dns', async (req, res) => {
  try {
    const config = await configService.getConfig(req.params.id);
    res.json({
      success: true,
      data: config.dns || {}
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/configs/:id/dns
 * 更新 DNS 配置
 */
router.put('/configs/:id/dns', async (req, res) => {
  try {
    const updatedConfig = await configService.updateConfig(req.params.id, { dns: req.body });
    
    res.json({
      success: true,
      data: updatedConfig.dns,
      message: 'DNS 配置更新成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// ==================== 高级配置管理 ====================

/**
 * GET /api/configs/:id/advanced
 * 获取高级配置
 */
router.get('/configs/:id/advanced', async (req, res) => {
  try {
    const config = await configService.getConfig(req.params.id);
    const advanced = {
      sniffer: config.sniffer || {},
      tun: config.tun || {},
      'script': config.script || {},
      'experimental': config.experimental || {},
      'profile': config.profile || {},
      'geodata-mode': config['geodata-mode'] || false,
      'geox-url': config['geox-url'] || {},
      'unified-delay': config['unified-delay'] || false,
      'tcp-concurrent': config['tcp-concurrent'] || false,
      'find-process-mode': config['find-process-mode'] || 'off',
      'global-client-fingerprint': config['global-client-fingerprint'] || ''
    };
    
    res.json({
      success: true,
      data: advanced
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/configs/:id/advanced
 * 更新高级配置
 */
router.put('/configs/:id/advanced', async (req, res) => {
  try {
    const updatedConfig = await configService.updateConfig(req.params.id, req.body);
    
    // 自动导出到指定目录
    const settings = await settingsService.getSettings();
    if (settings.autoExport && settings.exportDirectory) {
      const yaml = await configService.exportConfig(req.params.id);
      await settingsService.exportConfigToDirectory(updatedConfig, yaml);
    }
    
    res.json({
      success: true,
      data: updatedConfig,
      message: '高级配置更新成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// ==================== 设置管理 ====================

/**
 * GET /api/settings
 * 获取所有设置
 */
router.get('/settings', async (req, res) => {
  try {
    const settings = await settingsService.getSettings();
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/settings
 * 更新设置
 */
router.put('/settings', async (req, res) => {
  try {
    const settings = await settingsService.updateSettings(req.body);
    res.json({
      success: true,
      data: settings,
      message: '设置更新成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/settings/export-directory
 * 设置导出目录
 */
router.post('/settings/export-directory', async (req, res) => {
  try {
    const { directory } = req.body;
    const result = await settingsService.setExportDirectory(directory);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/configs/:id/export-to-directory
 * 手动导出配置到指定目录
 */
router.post('/configs/:id/export-to-directory', async (req, res) => {
  try {
    const config = await configService.getConfig(req.params.id);
    const yaml = await configService.exportConfig(req.params.id);
    const result = await settingsService.exportConfigToDirectory(config, yaml);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        path: result.path
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/export-all
 * 导出所有配置到指定目录
 */
router.post('/export-all', async (req, res) => {
  try {
    const configs = await configService.getAllConfigs();
    const results = [];
    
    for (const configMeta of configs) {
      try {
        const config = await configService.getConfig(configMeta.id);
        const yaml = await configService.exportConfig(configMeta.id);
        const result = await settingsService.exportConfigToDirectory(config, yaml);
        results.push({
          name: config.name,
          success: result.success,
          message: result.message,
          path: result.path
        });
      } catch (error) {
        results.push({
          name: configMeta.name,
          success: false,
          message: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    res.json({
      success: true,
      message: `成功导出 ${successCount}/${results.length} 个配置`,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;