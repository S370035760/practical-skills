---
name: memory-manager
description: OpenClaw 记忆管理技能。管理 MEMORY.md 和 daily memory 文件，支持记忆整理、归档、检索、去重、合并。自动提炼日常记录为长期记忆，清理过期内容，优化记忆存储结构。Use when: 需要整理 MEMORY.md、归档 daily memory、检索历史记忆、合并重复内容、定期清理过期记忆。
---

# 🧠 Memory Manager - 记忆管理

## 核心功能

- **记忆整理** - 将 daily memory 提炼为长期记忆
- **自动归档** - 定期归档旧的记忆文件
- **智能检索** - 语义搜索记忆内容
- **去重合并** - 识别并合并重复记忆
- **存储优化** - 清理过期/无效记忆

## 快速开始

### 整理记忆

```bash
node scripts/organize.js --from memory/2026-03-09.md
```

### 归档旧记忆

```bash
node scripts/archive.js --days 30
```

### 搜索记忆

```bash
node scripts/search.js --query "GitHub 技能开发"
```

### 清理重复

```bash
node scripts/dedup.js
```

## 记忆结构

```
memory/
├── MEMORY.md                    # 长期记忆（ curated ）
├── 2026-03-09.md                # 每日记忆（raw logs）
├── 2026-03-08.md
└── ...
```

## 记忆生命周期

### 1. 日常记录

每天自动创建 daily memory 文件：
- 记录当天的重要事件
- 对话摘要
- 决策和待办

### 2. 定期提炼

每周/每月提炼 daily memory：
- 提取关键决策
- 合并重复信息
- 更新长期记忆

### 3. 归档清理

超过阈值的记忆归档：
- 30 天前的 daily → 归档
- 90 天前的归档 → 压缩存储

## 脚本使用

### 整理记忆

```bash
node scripts/organize.js --today
```

功能：
- 读取今日 daily memory
- 提取关键信息
- 更新 MEMORY.md
- 标记已处理

### 归档记忆

```bash
node scripts/archive.js --days 30 --compress
```

功能：
- 移动 30 天前的文件到 archive/
- 可选压缩为 zip
- 更新索引

### 搜索记忆

```bash
node scripts/search.js \
  --query "用户偏好" \
  --limit 10 \
  --highlight
```

功能：
- 语义搜索（关键词匹配）
- 高亮显示匹配内容
- 按相关性排序

### 去重

```bash
node scripts/dedup.js --dry-run
```

功能：
- 识别相似/重复内容
- 建议合并方案
- `--apply` 执行合并

## 记忆提炼规则

### 应该保留的

- ✅ 用户偏好和习惯
- ✅ 重要决策和原因
- ✅ 项目上下文
- ✅ 人际关系信息
- ✅ 技能和知识

### 应该丢弃的

- ❌ 临时性信息
- ❌ 已过期的待办
- ❌ 重复的对话
- ❌ 错误的尝试记录

### 提炼示例

**Daily Memory (原始):**
```
用户说今天很忙，开了 3 个会
下午讨论了 GitHub 技能开发的事情
决定每天发布一个技能
用户喜欢简洁的输出风格
```

**提炼后 (MEMORY.md):**
```
## 用户偏好
- 沟通风格：简洁直接
- 输出偏好：不要过多询问，直接执行

## 项目：GitHub 技能开发
- 开始日期：2026-03-09
- 目标：每日发布一个 OpenClaw 技能
- 策略：自主开发，不提醒不询问
```

## 自动化

### 每日整理

```bash
# 每天 23:00 整理当日记忆
0 23 * * * node memory-manager/scripts/organize.js --today
```

### 每周归档

```bash
# 每周日归档 7 天前的记忆
0 2 * * 0 node memory-manager/scripts/archive.js --days 7
```

### 每月清理

```bash
# 每月 1 号清理重复
0 3 1 * * node memory-manager/scripts/dedup.js --apply
```

## 记忆安全

### 敏感信息处理

- 自动检测并标记敏感内容
- 加密存储敏感记忆
- 访问控制（可选）

### 备份策略

- 每次修改前自动备份
- 保留最近 7 个版本
- 支持快速恢复

## 常见问题

**Q: 记忆文件太大了怎么办？**

A: 使用归档和压缩：
```bash
node scripts/archive.js --days 30 --compress
```

**Q: 如何恢复误删的记忆？**

A: 从备份恢复：
```bash
node scripts/backup.js --restore --date 2026-03-08
```

**Q: 搜索不准确怎么办？**

A: 调整搜索参数：
```bash
node scripts/search.js --query "关键词" --fuzzy --threshold 0.8
```

## 延伸阅读

- [MEMORY.md 最佳实践](references/memory-best-practices.md)
- [记忆提炼指南](references/extraction-guide.md)
- [隐私和安全](references/privacy-security.md)

---

*Last updated: 2026-03-09*
*作者：[@S370035760](https://github.com/S370035760)*
