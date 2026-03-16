# RuleSet 模块 UI 重构计划

## 1. 概述

本计划旨在将 ruleset 模块的 UI 风格对标 config 模块，实现统一的用户体验。

**状态: ✅ 已完成**

## 2. UI 结构对比分析

### 2.1 Config 模块 UI 特点

| 组件 | 布局方式 | 特点 |
|------|----------|------|
| Rules.vue | el-card + 拖拽列表 | 卡片包裹，头部带操作按钮，规则项支持拖拽排序 |
| RuleProviders.vue | el-card + 卡片网格 | 卡片列表展示，每个provider是一个子卡片 |
| ProxyGroups.vue | el-card + el-table | 表格展示，清晰的数据列 |
| ProxyProviders.vue | el-card + 卡片网格 | 与RuleProviders类似风格 |

### 2.2 RuleSet 模块当前 UI 问题

| 组件 | 当前状态 | 问题 |
|------|----------|------|
| RuleSetList.vue | 自定义页面布局 | 页面结构与config模块不一致，使用了独立的header/filter-bar/content结构 |
| RuleSetEdit.vue | 基本卡片布局 | 布局基本合理，但样式细节与config不一致 |
| RuleItem.vue | 自定义样式 | 样式与config/Rules.vue的规则项不一致 |

## 3. 详细重构方案

### 3.1 RuleSetList.vue 重构

#### 当前结构问题

```
rule-set-list-page
├── header (自定义)
├── filter-bar (自定义)
└── content (卡片网格)
```

#### 目标结构（对标 ConfigList.vue 和 RuleProviders.vue）

```
rule-set-list (使用 el-card 包裹)
├── el-card
│   ├── template #header
│   │   └── card-header (标题 + 操作按钮)
│   ├── 筛选区域 (搜索框、行为模式筛选、标签筛选)
│   └── 列表区域
│       └── el-row + el-col (卡片网格) 或 el-table
```

#### 具体改动

1. **移除自定义页面布局**
   - 删除 `.rule-set-list-page` 的 flex 布局
   - 使用 el-card 作为主容器

2. **统一头部样式**
   ```vue
   <el-card>
     <template #header>
       <div class="card-header">
         <span>规则集合</span>
         <div class="actions">
           <el-button size="small" @click="showImportDialog">
             <el-icon><Upload /></el-icon>
             导入
           </el-button>
           <el-button type="primary" size="small" @click="showCreateDialog">
             <el-icon><Plus /></el-icon>
             新建规则集
           </el-button>
         </div>
       </div>
     </template>
     <!-- 内容 -->
   </el-card>
   ```

3. **统一筛选区域样式**
   - 将筛选条件放在卡片内部顶部
   - 使用 inline 形式的表单或直接排列

4. **统一卡片网格样式**
   - 保持 el-row + el-col 的网格布局
   - 调整卡片样式与 RuleProviders.vue 一致

### 3.2 RuleSetEdit.vue 重构

#### 当前结构

```
rule-set-edit
├── page-header (自定义)
├── info-card (el-card)
└── rules-card (el-card)
```

#### 目标调整

1. **统一页面头部**
   - 参照 ConfigEdit.vue 的头部布局
   - 保持返回按钮和操作按钮的位置一致

2. **统一表单样式**
   ```vue
   <el-form label-width="100px">
     <el-form-item label="名称" prop="name">
       <el-input v-model="ruleSet.name" />
     </el-form-item>
     <!-- 其他表单项 -->
   </el-form>
   ```

3. **统一规则列表样式**
   - 对标 Rules.vue 的规则列表
   - 使用相同的拖拽组件和样式

### 3.3 RuleItem.vue 重构

#### 对标 Rules.vue 的规则项样式

```scss
// Rules.vue 中的规则项样式
.rule-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background: #fafafa;
  border-radius: 4px;
  margin-bottom: 8px;
  transition: all 0.2s;
  
  &:hover {
    background: #f0f0f0;
  }
  
  .drag-handle { /* ... */ }
  .rule-index { /* ... */ }
  .rule-type { /* ... */ }
  .rule-value { /* ... */ }
  .rule-target { /* ... */ }
  .rule-actions { /* ... */ }
}
```

#### RuleItem.vue 需要调整

1. **背景色统一**
   - 从 `#fff` 改为 `#fafafa`
   - hover 时改为 `#f0f0f0`

2. **边框调整**
   - 移除 `border: 1px solid #e4e7ed`
   - 或改为更轻量的分隔方式

3. **操作按钮显示逻辑**
   - 保持 hover 时显示操作按钮

### 3.4 对话框和表单统一样式

#### 创建/编辑对话框

```vue
<el-dialog
  v-model="dialogVisible"
  :title="editingIndex !== null ? '编辑XX' : '添加XX'"
  width="500px"
  destroy-on-close
>
  <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
    <!-- 表单项 -->
  </el-form>
  
  <template #footer>
    <el-button @click="dialogVisible = false">取消</el-button>
    <el-button type="primary" @click="submitForm">确定</el-button>
  </template>
</el-dialog>
```

#### 表单提示文字样式

```scss
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
```

## 4. 实施步骤

### 步骤 1: 重构 RuleSetList.vue

1. 修改页面结构，使用 el-card 包裹
2. 统一 card-header 样式
3. 调整筛选区域布局
4. 更新样式代码

### 步骤 2: 重构 RuleSetEdit.vue

1. 调整页面头部样式
2. 统一表单样式
3. 优化规则列表展示

### 步骤 3: 重构 RuleItem.vue

1. 对标 Rules.vue 的规则项样式
2. 统一背景、边框、hover效果
3. 调整操作按钮显示逻辑

### 步骤 4: 统一对话框样式

1. 检查所有对话框宽度是否一致
2. 统一表单 label-width
3. 统一 footer 按钮布局

### 步骤 5: 样式细节优化

1. 统一颜色变量
2. 统一间距规范
3. 统一字体大小

## 5. 组件对比详情

### 5.1 RuleSetList.vue 对比 ConfigList.vue

| 方面 | ConfigList | RuleSetList (当前) | 目标 |
|------|-----------|-------------------|------|
| 主容器 | el-card | 自定义div | el-card |
| 头部 | card-header | 自定义header | card-header |
| 筛选 | 卡片内顶部 | 独立filter-bar | 卡片内顶部 |
| 列表 | 表格/卡片网格 | 卡片网格 | 保持卡片网格 |

### 5.2 RuleItem.vue 对比 Rules.vue 规则项

| 方面 | Rules.vue | RuleItem.vue (当前) | 目标 |
|------|-----------|---------------------|------|
| 背景 | #fafafa | #fff | #fafafa |
| 边框 | 无 | 1px solid | 无或更轻 |
| hover | #f0f0f0 | box-shadow | #f0f0f0 |
| 操作 | hover显示 | hover显示 | 保持 |

## 6. 预期成果

重构完成后，ruleset 模块将具有与 config 模块一致的 UI 风格：

1. **统一的卡片布局** - 所有列表页使用 el-card 包裹
2. **统一的头部样式** - card-header 包含标题和操作按钮
3. **统一的表单样式** - label-width、tip 文字等保持一致
4. **统一的规则项样式** - 背景色、hover 效果保持一致
5. **统一的对话框样式** - 宽度、按钮布局保持一致

## 7. 文件修改清单

| 文件 | 修改内容 |
|------|----------|
| `client/src/views/RuleSetList.vue` | 页面结构重构，样式更新 |
| `client/src/views/RuleSetEdit.vue` | 样式调整，布局优化 |
| `client/src/components/rule-set/RuleItem.vue` | 样式对标 Rules.vue |
| `client/src/components/rule-set/TagSelector.vue` | 可选：样式微调 |
| `client/src/components/rule-set/TagManager.vue` | 可选：样式微调 |