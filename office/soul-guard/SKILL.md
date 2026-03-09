---
name: soul-guard
description: OpenClaw 安全审计技能。保护核心配置文件（SOUL.md/MEMORY.md/环境变量等），检测未授权修改、配置漂移、敏感信息泄露。支持完整性校验、安全扫描、自动备份、风险告警。Use when: 需要审计 OpenClaw 配置安全、检测核心文件是否被篡改、扫描敏感信息泄露、定期安全检查。
---

# 🔒 Soul Guard - OpenClaw 安全审计

## 核心功能

- **文件完整性校验** - 检测 SOUL.md、MEMORY.md 等核心文件是否被篡改
- **配置漂移检测** - 对比当前配置与基准配置的差异
- **敏感信息扫描** - 扫描环境变量、配置文件中的密钥/Token 泄露
- **自动备份** - 定期备份核心配置文件
- **风险告警** - 发现异常时立即告警

## 快速开始

### 基础扫描

```bash
node scripts/audit.js --full
```

### 检查特定文件

```bash
node scripts/audit.js --file SOUL.md
node scripts/audit.js --file MEMORY.md
node scripts/audit.js --file .env
```

### 生成报告

```bash
node scripts/audit.js --report
```

## 保护的文件

| 文件 | 风险等级 | 说明 |
|------|---------|------|
| SOUL.md | 🔴 高 | AI 人格定义，被篡改会改变行为 |
| MEMORY.md | 🔴 高 | 长期记忆，包含敏感个人信息 |
| .env | 🔴 高 | 环境变量，包含 API 密钥 |
| AGENTS.md | 🟠 中 | 工作区配置 |
| USER.md | 🟠 中 | 用户信息 |
| TOOLS.md | 🟡 低 | 工具配置 |

## 安全扫描项

### 1. 文件完整性

**检测内容：**
- 文件哈希值变化
- 文件大小异常变化
- 修改时间异常

**基准建立：**
```bash
node scripts/baseline.js --create
```

**对比检查：**
```bash
node scripts/baseline.js --check
```

### 2. 敏感信息泄露

**扫描模式：**
- API 密钥（GitHub Token、OpenAI Key 等）
- 密码/凭证
- 私钥文件
- 数据库连接字符串

**扫描命令：**
```bash
node scripts/scan-secrets.js --path /root/.openclaw/workspace
```

### 3. 配置漂移

**检测内容：**
- OpenClaw 配置变更
- 权限配置变更
- 启用的 Skills 变更

**命令：**
```bash
node scripts/drift-check.js
```

### 4. 权限审计

**检查项：**
- 文件权限是否过宽（如 777）
- 敏感文件是否可被其他用户读取
- 脚本是否有执行权限

**命令：**
```bash
node scripts/permission-audit.js
```

## 自动化防护

### 定时扫描

建议配置 cron 任务定期扫描：

```bash
# 每天凌晨 2 点扫描
0 2 * * * node /root/.openclaw/workspace/skills/soul-guard/scripts/audit.js --full
```

### 变更监控

监控文件变更并告警：

```bash
node scripts/watch.js --files SOUL.md,MEMORY.md,.env
```

### 自动备份

定期备份核心文件：

```bash
node scripts/backup.js --daily
```

## 风险等级

| 等级 | 颜色 | 说明 | 响应 |
|------|------|------|------|
| 🔴 高危 | Red | 核心文件被篡改、密钥泄露 | 立即处理 |
| 🟠 中危 | Orange | 配置异常、权限过宽 | 24 小时内处理 |
| 🟡 低危 | Yellow | 建议改进项 | 本周内处理 |
| 🟢 安全 | Green | 无问题 | 继续保持 |

## 告警方式

### 本地告警

- 终端输出告警信息
- 生成告警日志文件
- 发送系统通知

### 远程告警（需配置）

- 邮件告警
- Telegram/钉钉消息
- Webhook 通知

## 脚本使用

### 完整审计

```bash
node scripts/audit.js --full
```

输出：
```
🔒 Soul Guard 安全审计

📁 文件完整性检查...
✅ SOUL.md - 正常
✅ MEMORY.md - 正常
⚠️  .env - 权限过宽 (644 → 建议 600)

🔍 敏感信息扫描...
✅ 未发现泄露的 API 密钥
✅ 未发现密码/凭证

📊 配置漂移检测...
✅ 配置与基准一致

🔐 权限审计...
⚠️  2 个文件权限需要调整

📊 审计报告
━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 高危：0
🟠 中危：1
🟡 低危：2
🟢 安全：15
━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 创建基准

```bash
node scripts/baseline.js --create
```

### 恢复备份

```bash
node scripts/backup.js --restore --date 2026-03-08
```

## 安全建议

### 文件权限

```bash
# 敏感文件权限设置为 600
chmod 600 SOUL.md MEMORY.md .env

# 脚本权限设置为 755
chmod 755 scripts/*.js
```

### 密钥管理

- ❌ 不要将密钥硬编码在代码中
- ✅ 使用环境变量或密钥管理服务
- ✅ 定期轮换密钥
- ✅ 使用密钥前缀检测泄露（如 `ghp_`、`sk-`）

### 备份策略

- 每日备份核心配置
- 保留最近 7 天的备份
- 备份文件加密存储

## 常见问题

**Q: 误报怎么办？**

A: 将误报项添加到白名单：
```bash
node scripts/whitelist.js --add "path/to/file"
```

**Q: 如何查看历史审计记录？**

A: 查看审计日志：
```bash
cat logs/audit-history.json
```

**Q: 文件被篡改了怎么办？**

A: 立即从备份恢复：
```bash
node scripts/backup.js --restore --file SOUL.md
```

## 延伸阅读

- [OpenClaw 安全最佳实践](references/security-best-practices.md)
- [密钥管理指南](references/secret-management.md)
- [应急响应流程](references/incident-response.md)

---

*Last updated: 2026-03-09*
*作者：[@S370035760](https://github.com/S370035760)*
