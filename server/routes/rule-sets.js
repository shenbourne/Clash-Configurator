const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ruleSetService = require('../services/ruleSetService');
const settingsService = require('../services/settingsService');

const router = express.Router();

// 文件上传配置
const upload = multer({
  storage: multer.diskStorage({
    destination: 'server/data/temp/',
    filename: (req, file, cb) => {
      const randomName = uuidv4() + path.extname(file.originalname).toLowerCase();
      cb(null, randomName);
    }
  }),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.yaml' || ext === '.yml' || ext === '.txt') {
      cb(null, true);
    } else {
      cb(new Error('只支持 YAML 和 TXT 文件'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制文件大小为 5MB
  }
});

// ==================== 规则集合管理 ====================

/**
 * GET /api/rule-sets
 * 获取所有规则集合列表
 * 支持搜索和筛选
 */
router.get('/rule-sets', async (req, res) => {
  try {
    const { search, behavior, tag } = req.query;
    let ruleSets = await ruleSetService.getAllRuleSets();
    
    // 搜索过滤
    if (search) {
      const searchLower = search.toLowerCase();
      ruleSets = ruleSets.filter(rs => 
        rs.name.toLowerCase().includes(searchLower) ||
        (rs.description && rs.description.toLowerCase().includes(searchLower)) ||
        (rs.tags && rs.tags.some(t => t.name.toLowerCase().includes(searchLower)))
      );
    }
    
    // 行为模式筛选
    if (behavior && behavior !== 'all') {
      ruleSets = ruleSets.filter(rs => rs.behavior === behavior);
    }
    
    // 标签筛选
    if (tag && tag !== 'all') {
      ruleSets = ruleSets.filter(rs => 
        rs.tags && rs.tags.some(t => t.id === tag || t.name === tag)
      );
    }
    
    res.json({
      success: true,
      data: ruleSets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/rule-sets/available
 * 获取可用规则集列表（简化版，用于选择器）
 */
router.get('/rule-sets/available', async (req, res) => {
  try {
    const ruleSets = await ruleSetService.getAvailableRuleSets();
    res.json({
      success: true,
      data: ruleSets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ==================== 标签管理 (静态路由必须在 :id 路由之前) ====================

/**
 * GET /api/rule-sets/tags
 * 获取所有标签
 */
router.get('/rule-sets/tags', async (req, res) => {
  try {
    const settings = await settingsService.getSettings();
    const tags = settings.ruleSetTags || [];
    
    res.json({
      success: true,
      data: tags
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/rule-sets/tags
 * 创建新标签
 */
router.post('/rule-sets/tags', async (req, res) => {
  try {
    const { name, color } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: '标签名称不能为空'
      });
    }
    
    const settings = await settingsService.getSettings();
    const tags = settings.ruleSetTags || [];
    
    // 检查是否已存在同名标签
    if (tags.some(t => t.name.toLowerCase() === name.trim().toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: '标签名称已存在'
      });
    }
    
    const newTag = {
      id: uuidv4(),
      name: name.trim(),
      color: color || '#409EFF',
      count: 0
    };
    
    tags.push(newTag);
    await settingsService.updateSettings({ ruleSetTags: tags });
    
    res.status(201).json({
      success: true,
      data: newTag,
      message: '标签创建成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/rule-sets/tags/:id
 * 更新标签
 */
router.put('/rule-sets/tags/:id', async (req, res) => {
  try {
    const { name, color } = req.body;
    const tagId = req.params.id;
    
    const settings = await settingsService.getSettings();
    const tags = settings.ruleSetTags || [];
    
    const tagIndex = tags.findIndex(t => t.id === tagId);
    if (tagIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '标签不存在'
      });
    }
    
    // 检查名称是否与其他标签重复
    if (name && tags.some((t, i) => i !== tagIndex && t.name.toLowerCase() === name.trim().toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: '标签名称已存在'
      });
    }
    
    tags[tagIndex] = {
      ...tags[tagIndex],
      name: name !== undefined ? name.trim() : tags[tagIndex].name,
      color: color !== undefined ? color : tags[tagIndex].color
    };
    
    await settingsService.updateSettings({ ruleSetTags: tags });
    
    res.json({
      success: true,
      data: tags[tagIndex],
      message: '标签更新成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * DELETE /api/rule-sets/tags/:id
 * 删除标签
 */
router.delete('/rule-sets/tags/:id', async (req, res) => {
  try {
    const tagId = req.params.id;
    
    const settings = await settingsService.getSettings();
    const tags = settings.ruleSetTags || [];
    
    const tagIndex = tags.findIndex(t => t.id === tagId);
    if (tagIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '标签不存在'
      });
    }
    
    tags.splice(tagIndex, 1);
    await settingsService.updateSettings({ ruleSetTags: tags });
    
    res.json({
      success: true,
      message: '标签删除成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// ==================== 规则集合管理 ====================

/**
 * POST /api/rule-sets
 * 创建新规则集合
 */
router.post('/rule-sets', async (req, res) => {
  try {
    const { name, behavior, description, tags, targetPolicy, payload } = req.body;
    
    // 验证必填字段
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: '规则集合名称不能为空'
      });
    }
    
    // 验证行为模式
    const validBehaviors = ['classical', 'domain', 'ipcidr'];
    if (behavior && !validBehaviors.includes(behavior)) {
      return res.status(400).json({
        success: false,
        message: '无效的行为模式'
      });
    }
    
    // 验证规则
    if (payload && payload.length > 0) {
      const validation = ruleSetService.validateRules(payload, behavior || 'classical');
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: '规则验证失败',
          errors: validation.errors
        });
      }
    }
    
    const ruleSet = await ruleSetService.createRuleSet({
      name: name.trim(),
      behavior: behavior || 'classical',
      description: description || '',
      tags: tags || [],
      targetPolicy: targetPolicy || '',
      payload: payload || []
    });
    
    res.status(201).json({
      success: true,
      data: ruleSet,
      message: '规则集合创建成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/rule-sets/:id
 * 获取单个规则集合详情
 */
router.get('/rule-sets/:id', async (req, res) => {
  try {
    const ruleSet = await ruleSetService.getRuleSet(req.params.id);
    res.json({
      success: true,
      data: ruleSet
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/rule-sets/:id
 * 更新规则集合
 */
router.put('/rule-sets/:id', async (req, res) => {
  try {
    const { name, behavior, description, tags, targetPolicy, payload } = req.body;
    
    // 验证行为模式
    const validBehaviors = ['classical', 'domain', 'ipcidr'];
    if (behavior && !validBehaviors.includes(behavior)) {
      return res.status(400).json({
        success: false,
        message: '无效的行为模式'
      });
    }
    
    // 验证规则
    if (payload && payload.length > 0) {
      const validation = ruleSetService.validateRules(payload, behavior || 'classical');
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: '规则验证失败',
          errors: validation.errors
        });
      }
    }
    
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (behavior !== undefined) updateData.behavior = behavior;
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = tags;
    if (targetPolicy !== undefined) updateData.targetPolicy = targetPolicy;
    if (payload !== undefined) updateData.payload = payload;
    
    const ruleSet = await ruleSetService.updateRuleSet(req.params.id, updateData);
    
    res.json({
      success: true,
      data: ruleSet,
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
 * DELETE /api/rule-sets/:id
 * 删除规则集合
 */
router.delete('/rule-sets/:id', async (req, res) => {
  try {
    await ruleSetService.deleteRuleSet(req.params.id);
    res.json({
      success: true,
      message: '规则集合删除成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/rule-sets/:id/export
 * 导出规则集合为 YAML 文件
 */
router.get('/rule-sets/:id/export', async (req, res) => {
  try {
    const yaml = await ruleSetService.exportRuleSet(req.params.id);
    const ruleSet = await ruleSetService.getRuleSet(req.params.id);
    const fileName = `${ruleSetService.sanitizeFileName(ruleSet.name)}.yaml`;
    
    res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(yaml);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/rule-sets/:id/publish-url
 * 获取规则集合的发布链接
 */
router.get('/rule-sets/:id/publish-url', async (req, res) => {
  try {
    const settings = await settingsService.getSettings();
    
    if (!settings.publishUrl) {
      return res.status(400).json({
        success: false,
        message: '未配置发布 URL'
      });
    }
    
    const publishUrl = await ruleSetService.getPublishUrl(req.params.id, settings.publishUrl);
    
    res.json({
      success: true,
      data: { publishUrl }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/rule-sets/import
 * 导入规则集合文件
 */
router.post('/rule-sets/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要导入的文件'
      });
    }
    
    const fs = require('fs').promises;
    const content = await fs.readFile(req.file.path, 'utf-8');
    
    // 清理临时文件
    try {
      await fs.unlink(req.file.path);
    } catch (e) {
      // 忽略删除失败
    }
    
    const name = req.body.name || path.basename(req.file.originalname, path.extname(req.file.originalname));
    const ruleSet = await ruleSetService.importRuleSet(content, name);
    
    res.status(201).json({
      success: true,
      data: ruleSet,
      message: '规则集合导入成功'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/rule-sets/validate
 * 验证规则格式
 */
router.post('/rule-sets/validate', async (req, res) => {
  try {
    const { rules, behavior } = req.body;
    
    if (!Array.isArray(rules)) {
      return res.status(400).json({
        success: false,
        message: '规则必须为数组'
      });
    }
    
    const validation = ruleSetService.validateRules(rules, behavior || 'classical');
    
    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;