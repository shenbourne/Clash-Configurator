# UI 风格指南

本文档记录项目的 UI 风格规范，确保所有模块保持统一的用户体验。

## 1. 页面布局规范

### 1.1 列表页布局

所有列表页（如规则集合列表、配置列表）统一使用以下结构：

```vue
<template>
  <div class="xxx-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>标题</span>
          <div class="actions">
            <el-button size="small">次要操作</el-button>
            <el-button type="primary" size="small">主要操作</el-button>
          </div>
        </div>
      </template>
      
      <!-- 筛选区域（可选） -->
      <div class="filter-section">
        <!-- 筛选控件 -->
      </div>
      
      <!-- 内容区域 -->
      <div class="xxx-content" v-loading="loading">
        <!-- 列表内容 -->
      </div>
    </el-card>
  </div>
</template>
```

**关键样式：**

```scss
.xxx-list {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .filter-section {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid #ebeef5;
  }
}
```

### 1.2 编辑页布局

编辑页统一使用以下结构：

```vue
<template>
  <div class="xxx-edit" v-loading="loading">
    <!-- 顶部操作栏 -->
    <div class="page-header">
      <div class="title-section">
        <el-button link @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回列表
        </el-button>
        <h2>{{ isNew ? '创建XX' : '编辑XX' }}</h2>
      </div>
      <div class="actions">
        <el-button type="primary" :loading="saving">保存</el-button>
        <el-button>其他操作</el-button>
      </div>
    </div>
    
    <!-- 基本信息卡片 -->
    <el-card class="info-card">
      <template #header>
        <div class="card-header">
          <span>基本信息</span>
        </div>
      </template>
      <el-form><!-- 表单内容 --></el-form>
    </el-card>
    
    <!-- 其他内容卡片 -->
    <el-card class="content-card">
      <!-- 内容 -->
    </el-card>
  </div>
</template>
```

**关键样式：**

```scss
.xxx-edit {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 16px 20px;
    background: #fff;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
    
    .title-section {
      display: flex;
      align-items: center;
      gap: 16px;
      
      h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
      }
    }
    
    .actions {
      display: flex;
      gap: 10px;
    }
  }
  
  .info-card,
  .content-card {
    margin-bottom: 20px;
    
    .card-header {
      font-weight: 600;
    }
  }
}
```

## 2. 卡片网格布局

用于展示多个项目卡片（如规则集合、Provider 等）：

```scss
.xxx-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.xxx-card {
  cursor: pointer;
  transition: all 0.3s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
    
    .card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 0;
      
      .name {
        font-size: 16px;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
  
  .card-footer {
    padding-top: 12px;
    border-top: 1px solid #ebeef5;
    
    .time {
      font-size: 12px;
      color: #909399;
    }
  }
}
```

## 3. 拖拽列表样式

用于可拖拽排序的列表项（如规则列表）：

```vue
<template>
  <div class="rules-container">
    <div class="drag-hint">
      <el-icon><Rank /></el-icon>
      <span>拖拽规则可调整顺序</span>
    </div>
    <draggable
      v-model="items"
      item-key="id"
      handle=".drag-handle"
      animation="200"
      ghost-class="ghost"
      class="xxx-list"
    >
      <template #item="{ element, index }">
        <div class="xxx-item">
          <div class="drag-handle">
            <el-icon><Rank /></el-icon>
          </div>
          <div class="item-index">{{ index + 1 }}</div>
          <div class="item-content"><!-- 内容 --></div>
          <div class="item-actions">
            <el-button link type="danger" @click="remove(index)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </template>
    </draggable>
  </div>
</template>
```

**关键样式：**

```scss
.rules-container {
  .drag-hint {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #909399;
    font-size: 12px;
    margin-bottom: 12px;
  }
}

.xxx-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background: #fafafa;
  border-radius: 4px;
  margin-bottom: 8px;
  transition: all 0.2s;
  
  &:hover {
    background: #f0f0f0;
    
    .item-actions {
      opacity: 1;
    }
  }
  
  .drag-handle {
    cursor: grab;
    color: #c0c4cc;
    margin-right: 12px;
    display: flex;
    align-items: center;
    
    &:hover {
      color: #909399;
    }
    
    &:active {
      cursor: grabbing;
    }
  }
  
  .item-index {
    width: 40px;
    color: #909399;
    font-size: 12px;
  }
  
  .item-content {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0 12px;
  }
  
  .item-actions {
    opacity: 0;
    transition: opacity 0.2s;
  }
}

.ghost {
  opacity: 0.5;
  background: #c8ebfb;
}
```

## 4. 对话框规范

### 4.1 标准对话框

```vue
<el-dialog
  v-model="dialogVisible"
  :title="isEdit ? '编辑XX' : '添加XX'"
  width="500px"
  destroy-on-close
>
  <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
    <el-form-item label="名称" prop="name">
      <el-input v-model="form.name" placeholder="请输入名称" />
    </el-form-item>
    <!-- 其他表单项 -->
  </el-form>
  
  <template #footer>
    <el-button @click="dialogVisible = false">取消</el-button>
    <el-button type="primary" @click="submitForm" :loading="submitting">确定</el-button>
  </template>
</el-dialog>
```

### 4.2 宽度规范

| 对话框类型 | 宽度 |
|-----------|------|
| 简单表单 | 400px - 500px |
| 复杂表单 | 600px - 650px |
| 批量操作 | 600px |
| 预览/详情 | 700px - 800px |

### 4.3 表单提示文字

```scss
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
```

使用方式：

```vue
<el-form-item label="名称">
  <el-input v-model="form.name" />
  <div class="form-tip">这里是提示文字</div>
</el-form-item>
```

## 5. 颜色规范

### 5.1 背景色

| 用途 | 颜色值 |
|------|--------|
| 页面背景 | `#f5f7fa` |
| 卡片背景 | `#fff` |
| 列表项背景 | `#fafafa` |
| 列表项 hover 背景 | `#f0f0f0` |
| 工具栏背景 | `#f5f7fa` |

### 5.2 边框色

| 用途 | 颜色值 |
|------|--------|
| 默认边框 | `#ebeef5` |
| 分隔线 | `#ebeef5` |
| 输入框边框 | `#dcdfe6` |

### 5.3 文字颜色

| 用途 | 颜色值 |
|------|--------|
| 主文字 | `#303133` |
| 次要文字 | `#606266` |
| 占位文字 | `#909399` |
| 禁用文字 | `#c0c4cc` |

## 6. 间距规范

| 用途 | 间距 |
|------|------|
| 卡片间距 | 16px - 20px |
| 表单项间距 | 20px (默认) |
| 按钮组间距 | 10px - 12px |
| 列表项间距 | 8px |
| 内边距 (小) | 8px 12px |
| 内边距 (中) | 12px 16px |
| 内边距 (大) | 16px 20px |

## 7. 字体规范

| 用途 | 字号 | 字重 |
|------|------|------|
| 页面标题 (h2) | 18px | 600 |
| 卡片标题 | 16px | 600 |
| 正文 | 14px | 400 |
| 辅助文字 | 13px | 400 |
| 小字/提示 | 12px | 400 |

## 8. 代码字体

用于规则内容、代码展示等：

```scss
.code-text {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
}
```

## 9. Element Plus 组件使用规范

### 9.1 按钮

- 页面顶部操作按钮：`size="small"`
- 卡片内操作按钮：`size="small"`
- 对话框按钮：默认大小
- 次要操作：`link` 类型或 `plain`

### 9.2 标签 (Tag)

- 行为模式：使用 `type` 区分
  - classical: `type="primary"`
  - domain: `type="success"`
  - ipcidr: `type="warning"`

### 9.3 选择器 (Select)

- 宽度默认 100%（需要在父容器设置宽度）
- 多选时使用 `multiple` 和 `filterable`
- 分组使用 `el-option-group`

## 10. 响应式断点

参考 Element Plus 的响应式断点：

```scss
// xs: < 768px
// sm: >= 768px
// md: >= 992px
// lg: >= 1200px
// xl: >= 1920px

// 网格布局示例
.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
```

## 11. 文件结构参考

```
client/src/views/
├── XxxList.vue        # 列表页
├── XxxEdit.vue        # 编辑页
└── config/
    ├── Rules.vue      # 规则配置
    ├── ProxyGroups.vue
    └── ...
```

## 12. 组件复用

对于可复用的组件，放在 `client/src/components/` 目录下：

```
client/src/components/
├── rule-set/
│   ├── TagSelector.vue   # 标签选择器
│   └── TagManager.vue    # 标签管理对话框
└── ...
```

---

**最后更新：** 2026-03-16