# 图标说明

## 图标文件
这个目录包含了插件的图标文件。

### 需要的图标尺寸
Chrome 扩展需要以下尺寸的 PNG 图标：
- `icon16.png` - 16x16 像素（工具栏小图标）
- `icon32.png` - 32x32 像素（管理页面）
- `icon48.png` - 48x48 像素（扩展管理页面）
- `icon128.png` - 128x128 像素（Chrome 网上应用店）

### 生成 PNG 图标

#### 推荐方法：使用项目脚本 ⭐
项目已包含自动生成脚本，使用 Node.js 和 Sharp 库：

```bash
# 在项目根目录运行
npm run generate-icons
```

这个脚本会自动从 `icon.svg` 生成所有需要的 PNG 文件，支持透明背景和高质量渲染。

#### 其他方法

1. **使用 Inkscape**（如果已安装）：
   ```bash
   inkscape icon.svg --export-type=png --export-filename=icon16.png --export-width=16 --export-height=16
   inkscape icon.svg --export-type=png --export-filename=icon32.png --export-width=32 --export-height=32
   inkscape icon.svg --export-type=png --export-filename=icon48.png --export-width=48 --export-height=48
   inkscape icon.svg --export-type=png --export-filename=icon128.png --export-width=128 --export-height=128
   ```

2. **使用 ImageMagick**（如果已安装）：
   ```bash
   convert icon.svg -resize 16x16 icon16.png
   convert icon.svg -resize 32x32 icon32.png
   convert icon.svg -resize 48x48 icon48.png
   convert icon.svg -resize 128x128 icon128.png
   ```

### 图标设计说明
当前图标设计包含：
- 渐变背景（蓝色到紫色）
- 链接列表的视觉表示
- 箭头表示"打开"动作
- 加号表示"全部"或"批量"的概念

你可以根据需要修改 `icon.svg` 文件来调整图标设计。