# 📄 简历工坊 — 在线简历制作工具

一个功能完整的在线简历制作网站，支持多模板切换、实时预览、PDF 导出、PDF 导入和本地持久化。

## 功能特色

- **PDF 导入** — 上传已有的 PDF 简历，自动解析并填充到编辑器，同时生成相似风格的模板
- **实时预览** — 编辑内容即时反映在右侧简历预览中
- **多模板切换** — 内置 3 套专业简历模板 + PDF 导入自动生成的新模板
- **导出 PDF** — 浏览器打印功能导出为 PDF 文件
- **自动保存** — 内容自动保存到浏览器 localStorage，刷新不丢失
- **头像支持** — 可选添加头像 URL
- **响应式设计** — 桌面和移动端均可使用

## 使用方法

### 方式一：直接打开（最简单）

直接用浏览器打开 `index.html` 文件即可使用。注意：部分浏览器的 `file://` 协议下 localStorage 可能受限，推荐方式二。

### 方式二：使用 HTTP 服务器

```bash
# 使用 Python
cd resume-builder
python -m http.server 8080

# 或使用 Node.js
cd resume-builder
npx serve .
```

然后在浏览器中访问 `http://localhost:8080`。

### 导入 PDF 简历

1. 点击顶部工具栏的 **"导入 PDF"** 按钮
2. 选择一份包含可选文字的 PDF 简历文件
3. 系统自动解析并提取个人信息、教育经历、工作经历、技能、项目等
4. 自动生成一个与 PDF 排版风格相似的新模板
5. 表单自动填充内容，预览即时更新
6. 可在编辑器中继续修改完善

> ⚠️ 注意：本功能依赖 [pdf.js](https://mozilla.github.io/pdf.js/) 解析 PDF 文字层，**不支持纯扫描件（图片型 PDF）**。如果是扫描件请先 OCR 转换。

## 项目结构

```
resume-builder/
├── index.html                # 主页面
├── test-runner.html          # 单元测试入口
├── css/
│   └── style.css             # 编辑器样式和布局
├── js/
│   ├── storage.js            # localStorage 持久化模块
│   ├── templates.js          # 模板系统（3 套内置模板）
│   ├── pdf-importer.js       # PDF 导入模块（解析+数据映射+模板生成）
│   ├── pdf-importer.test.js  # PDF 导入模块单元测试
│   └── app.js                # 主应用逻辑
└── README.md                 # 本文件
```

## 技术栈

- 原生 JavaScript (ES6+)
- CSS3 (Flexbox, Grid, 渐变, 动画)
- HTML5 (语义化标签)
- [pdf.js](https://mozilla.github.io/pdf.js/) — PDF 文本解析（浏览器端）
- 其余无任何第三方依赖

## 内置模板

| 模板名称 | 风格 | 特点 |
|---------|------|------|
| 简约经典 | 传统 | 左右分栏、清晰的时间线、进度条技能 |
| 现代清新 | 现代 | 侧边栏设计、紫色渐变主题、圆点标记 |
| 专业商务 | 商务 | 深色顶栏、双列布局、正式稳重 |

导入 PDF 后会根据文档布局自动生成新的模板。

## 测试

用浏览器打开 `test-runner.html` 即可运行 PDF 导入模块的单元测试。

## 许可

MIT License
