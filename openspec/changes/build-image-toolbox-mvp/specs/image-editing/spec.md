# image-editing 规格增量

## Purpose

在浏览器本地完成常见图片处理：裁剪、缩放、压缩、格式转换与水印，全程不上传任何图片数据，处理结果一键下载，保护隐私且离线可用。

## ADDED Requirements

### Requirement: 本地图片加载

系统 SHALL 支持通过文件选择或拖拽载入 JPG/PNG/WebP 图片，载入后 MUST 显示预览与原始尺寸、体积信息。图片数据 MUST 仅保留在浏览器内存中，MUST NOT 发起任何携带图片数据的网络请求。

#### Scenario: 载入图片

- WHEN 用户选择一张本地 JPG 图片
- THEN 页面显示预览、宽高像素与文件体积，且网络面板无图片上传请求

#### Scenario: 不支持的格式

- WHEN 用户载入非图片文件（如 .txt）
- THEN 系统提示格式不支持，不产生崩溃

### Requirement: 裁剪与缩放

系统 SHALL 提供可视化裁剪（拖拽选区，含常用比例预设：自由/1:1/4:3/16:9）与按目标宽高缩放，处理结果 MUST 可预览并下载。

#### Scenario: 裁剪下载

- WHEN 用户框选区域并确认裁剪后点击下载
- THEN 得到的图片仅含选区内容，尺寸与选区一致

#### Scenario: 等比缩放

- WHEN 用户输入目标宽度且保持纵横比
- THEN 输出图片高度按原图比例自动计算

### Requirement: 压缩与格式转换

系统 SHALL 支持调整输出质量压缩图片体积，并支持输出为 PNG/JPEG/WebP 三种格式。压缩后 MUST 显示新体积与原体积对比。

#### Scenario: 质量压缩

- WHEN 用户把 JPEG 质量从 0.9 调到 0.5 并导出
- THEN 输出体积明显小于原图，且页面显示前后体积对比

#### Scenario: 格式转换

- WHEN 用户把 PNG 输出格式选为 WebP 并导出
- THEN 下载文件为 WebP 格式且可正常打开

### Requirement: 文字水印

系统 SHALL 支持添加文字水印，可配置文字内容、字号、颜色、透明度与位置（平铺/右下角），水印 MUST 渲染进导出的图片。

#### Scenario: 平铺水印导出

- WHEN 用户输入水印文字并选择平铺后导出
- THEN 导出图片上可见半透明重复水印文字