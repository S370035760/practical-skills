---
name: data-visualizer
description: 数据可视化技能。将数据转换为图表（柱状图/折线图/饼图/散点图/热力图等），支持 CSV/Excel/JSON 数据源，自动生成可视化报告和交互式仪表板。Use when: 需要将数据转换为图表、生成可视化报告、分析数据趋势、创建仪表板。
---

# 📊 Data Visualizer - 数据可视化

## 核心功能

- **多图表支持** - 柱状图、折线图、饼图、散点图、热力图等
- **多数据源** - CSV、Excel、JSON、数据库
- **自动分析** - 智能识别数据类型推荐图表
- **交互仪表板** - 生成可交互的 HTML 仪表板
- **报告导出** - PNG、PDF、HTML 格式

## 快速开始

### 从 CSV 生成图表

```bash
node scripts/chart.js \
  --data "./sales.csv" \
  --type bar \
  --x "Month" \
  --y "Revenue"
```

### 自动分析

```bash
node scripts/analyze.js --data "./data.xlsx"
```

### 生成交互仪表板

```bash
node scripts/dashboard.js \
  --data "./metrics.csv" \
  --output "./dashboard.html"
```

## 支持的图表类型

| 类型 | 适用场景 | 示例 |
|------|---------|------|
| bar | 分类对比 | 各产品销售额 |
| line | 趋势分析 | 月度收入变化 |
| pie | 占比分析 | 市场份额 |
| scatter | 相关性分析 | 价格 vs 销量 |
| heatmap | 密度分析 | 用户活跃度 |
| area | 累积趋势 | 累计用户数 |

## 数据源格式

### CSV

```csv
Date,Product,Sales,Revenue
2026-03-01,A,100,1000
2026-03-01,B,150,1500
2026-03-02,A,120,1200
```

### Excel

支持多 sheet，自动识别表头

### JSON

```json
[
  {"date": "2026-03-01", "value": 100},
  {"date": "2026-03-02", "value": 120}
]
```

## 脚本使用

### 生成柱状图

```bash
node scripts/chart.js \
  --data "./sales.csv" \
  --type bar \
  --x "Product" \
  --y "Revenue" \
  --title "产品销售对比" \
  --output "./chart.png"
```

### 生成折线图

```bash
node scripts/chart.js \
  --data "./trends.csv" \
  --type line \
  --x "Date" \
  --y "Users" \
  --title "用户增长趋势"
```

### 生成饼图

```bash
node scripts/chart.js \
  --data "./market.csv" \
  --type pie \
  --x "Company" \
  --y "Share" \
  --title "市场份额"
```

### 多系列图表

```bash
node scripts/chart.js \
  --data "./data.csv" \
  --type line \
  --x "Month" \
  --y "Revenue,Profit,Cost" \
  --title "财务指标趋势"
```

## 输出格式

| 格式 | 用途 | 命令 |
|------|------|------|
| PNG | 图片插入文档 | --output "./chart.png" |
| PDF | 报告文档 | --output "./report.pdf" |
| HTML | 交互式网页 | --output "./chart.html" |
| SVG | 矢量图编辑 | --output "./chart.svg" |

## 样式定制

### 颜色主题

```bash
node scripts/chart.js \
  --data "./data.csv" \
  --theme "blue" \
  --palette "#1f77b4,#ff7f0e,#2ca02c"
```

### 尺寸设置

```bash
node scripts/chart.js \
  --width 1200 \
  --height 600 \
  --dpi 300
```

## 自动化报告

### 每日数据报告

```bash
# 每天早晨 8 点生成日报
0 8 * * * node data-visualizer/scripts/daily-report.js
```

### 每周分析

```bash
# 每周一生成周报
0 9 * * 1 node data-visualizer/scripts/weekly-report.js
```

## 示例输出

### 销售分析仪表板

```
📊 销售数据可视化报告

生成时间：2026-03-09 22:00

图表列表:
1. 📈 月度销售趋势 (line)
2. 📊 产品分类对比 (bar)
3. 🥧 市场份额分布 (pie)
4. 🔥 热销产品热力图 (heatmap)

输出文件:
- ./output/sales_dashboard.html
- ./output/sales_report.pdf
```

## 依赖说明

本技能使用以下库：
- chart.js - 图表渲染
- papaparse - CSV 解析
- xlsx - Excel 解析
- puppeteer - PDF 导出

## 常见问题

**Q: 中文显示乱码怎么办？**

A: 确保系统安装了中文字体，或在配置中指定字体：
```bash
--font "Noto Sans CJK SC"
```

**Q: 数据量太大图表卡顿？**

A: 使用数据采样或分页：
```bash
--sample 1000  # 采样 1000 条
```

---

*Last updated: 2026-03-09*
*作者：[@S370035760](https://github.com/S370035760)*
