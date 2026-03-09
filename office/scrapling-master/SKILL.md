---
name: scrapling-master
description: Scrapling 网页抓取大师技能。基于 Scrapling 框架，提供自适应网页抓取、反爬虫绕过、智能元素定位、批量数据提取功能。支持 HTTP 请求/浏览器自动化/蜘蛛爬虫，可绕过 Cloudflare 等反爬系统。Use when: 需要抓取网页数据、绕过反爬虫、批量提取内容、监控网站变化、生成爬虫脚本。
---

# 🕷️ Scrapling Master - 网页抓取大师

## 核心功能

- **自适应抓取** - 网站结构变化后自动重新定位元素
- **反爬虫绕过** - 自动绕过 Cloudflare Turnstile 等反爬系统
- **智能元素定位** - 使用 CSS/XPath/文本/相似度匹配
- **批量提取** - 支持并发抓取和流式输出
- **暂停/恢复** - 长时间爬取可中断续传

## 快速开始

### 基础抓取

```bash
node scripts/fetch.js --url "https://example.com" --css ".product"
```

### 绕过 Cloudflare

```bash
node scripts/fetch.js \
  --url "https://nopecha.com/demo/cloudflare" \
  --stealth \
  --solve-cf
```

### 批量抓取

```bash
node scripts/crawl.js \
  --urls "./urls.txt" \
  --css ".article-title" \
  --output "./results.json"
```

## 支持的抓取模式

| 模式 | 说明 | 适用场景 |
|------|------|---------|
| Fetcher | HTTP 请求 | 静态网页、API |
| StealthyFetcher | 隐身模式 | 反爬网站、Cloudflare |
| DynamicFetcher | 浏览器自动化 | 动态加载、JavaScript 渲染 |
| Spider | 蜘蛛爬虫 | 全站爬取、多页面 |

## 脚本使用

### 单页抓取

```bash
node scripts/fetch.js \
  --url "https://quotes.toscrape.com/" \
  --css ".quote" \
  --fields "text:.text::text,author:.author::text" \
  --output "./quotes.json"
```

### 隐身模式（绕过反爬）

```bash
node scripts/fetch.js \
  --url "https://example.com" \
  --stealth \
  --headless \
  --output "./data.json"
```

### 浏览器自动化

```bash
node scripts/fetch.js \
  --url "https://dynamic-site.com" \
  --dynamic \
  --wait-for ".loaded-content" \
  --output "./data.json"
```

### 蜘蛛爬虫

```bash
node scripts/crawl.js \
  --start "https://example.com" \
  --follow "a::attr(href)" \
  --css ".item" \
  --concurrency 10 \
  --output "./crawl_results.json"
```

## 选择器语法

### CSS 选择器

```bash
# 类选择器
--css ".product"

# ID 选择器
--css "#main-content"

# 属性选择器
--css "a[href*='/product']"

# 伪元素
--css ".title::text"
--css "img::attr(src)"
```

### XPath 选择器

```bash
--xpath "//div[@class='product']"
--xpath "//a[contains(@href, 'product')]"
```

### 文本搜索

```bash
--text "产品名称"
--regex "价格：\\d+"
```

## 输出格式

| 格式 | 参数 | 说明 |
|------|------|------|
| JSON | --output "./data.json" | 结构化数据 |
| JSONL | --output "./data.jsonl" | 每行一个 JSON |
| CSV | --output "./data.csv" | 表格数据 |
| TXT | --output "./data.txt" | 纯文本 |

## 高级功能

### 自适应模式

```bash
# 首次抓取（自动保存元素位置）
node scripts/fetch.js --url "https://site.com" --css ".product" --auto-save

# 网站改版后（自动重新定位）
node scripts/fetch.js --url "https://site.com" --css ".product" --adaptive
```

### 会话管理

```bash
# 保持登录状态
node scripts/fetch.js \
  --url "https://site.com/login" \
  --session "my_session" \
  --cookies "./cookies.json"
```

### 代理轮换

```bash
node scripts/fetch.js \
  --url "https://site.com" \
  --proxy "rotating" \
  --proxy-list "./proxies.txt"
```

### 暂停/恢复爬取

```bash
# 开始爬取（可中断）
node scripts/crawl.js --start "https://site.com" --crawldir "./checkpoint"

# 按 Ctrl+C 暂停后，恢复爬取
node scripts/crawl.js --start "https://site.com" --crawldir "./checkpoint" --resume
```

## 实战示例

### 抓取电商产品

```bash
node scripts/fetch.js \
  --url "https://example-shop.com/products" \
  --css ".product-item" \
  --fields "name:.title,price:.price,url:a::attr(href),image:img::attr(src)" \
  --output "./products.json"
```

### 抓取新闻文章

```bash
node scripts/crawl.js \
  --start "https://news-site.com" \
  --follow "article a::attr(href)" \
  --css "article" \
  --fields "title:h1, content:.article-body, date:.pub-date" \
  --concurrency 5 \
  --output "./news.json"
```

### 绕过 Cloudflare

```bash
node scripts/fetch.js \
  --url "https://protected-site.com" \
  --stealth \
  --solve-cf \
  --headless \
  --output "./data.json"
```

## 性能优化

### 并发设置

```bash
--concurrency 10        # 并发请求数
--delay 1              # 请求间隔（秒）
--timeout 30           # 超时时间（秒）
```

### 内存优化

```bash
--stream               # 流式输出（适合大数据量）
--batch-size 100       # 批次大小
```

## 常见问题

**Q: 被抓取网站有反爬怎么办？**

A: 使用隐身模式：
```bash
node scripts/fetch.js --url "https://site.com" --stealth --solve-cf
```

**Q: 网站改版后抓取失败？**

A: 使用自适应模式：
```bash
node scripts/fetch.js --url "https://site.com" --css ".product" --adaptive
```

**Q: 如何抓取需要登录的网站？**

A: 使用会话管理：
```bash
node scripts/fetch.js --url "https://site.com" --session "login" --cookies "./cookies.json"
```

## 依赖说明

本技能需要 Scrapling 库支持：
```bash
pip install scrapling
pip install "scrapling[fetchers]"  # 完整功能
```

## 法律提醒

⚠️ 请遵守目标网站的 robots.txt 和服务条款，仅用于合法合规的数据抓取。

---

*Last updated: 2026-03-09*
*作者：[@S370035760](https://github.com/S370035760)*
