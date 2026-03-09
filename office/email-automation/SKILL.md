---
name: email-automation
description: 邮件自动化技能。自动收发邮件、智能分类、批量处理、模板回复、定时发送。支持 IMAP/SMTP 协议，可配置 Gmail、Outlook、企业邮箱。Use when: 需要自动处理邮件、批量发送、分类整理、模板回复、定时发送邮件。
---

# 📧 Email Automation - 邮件自动化

## 核心功能

- **自动收件** - 定时检查新邮件
- **智能分类** - 根据规则自动分类邮件
- **模板回复** - 预设回复模板快速响应
- **批量发送** - 批量发送邮件（支持定时）
- **邮件归档** - 自动归档旧邮件

## 快速开始

### 配置邮箱

```bash
node scripts/config.js --add
```

### 检查新邮件

```bash
node scripts/check.js --inbox
```

### 发送邮件

```bash
node scripts/send.js \
  --to "user@example.com" \
  --subject "会议邀请" \
  --body "会议内容..."
```

## 支持的服务商

| 服务商 | IMAP 服务器 | SMTP 服务器 | 端口 |
|--------|-----------|-----------|------|
| Gmail | imap.gmail.com | smtp.gmail.com | 993/587 |
| Outlook | outlook.office365.com | smtp.office365.com | 993/587 |
| QQ 邮箱 | imap.qq.com | smtp.qq.com | 993/587 |
| 163 邮箱 | imap.163.com | smtp.163.com | 993/465 |
| 企业邮箱 | 自定义 | 自定义 | 自定义 |

## 配置示例

```json
{
  "accounts": [
    {
      "name": "工作邮箱",
      "email": "user@company.com",
      "imap": {
        "host": "imap.company.com",
        "port": 993,
        "secure": true
      },
      "smtp": {
        "host": "smtp.company.com",
        "port": 587,
        "secure": false
      },
      "auth": {
        "user": "user@company.com",
        "pass": "app_password"
      }
    }
  ]
}
```

## 智能分类规则

### 预设规则

| 规则 | 条件 | 动作 |
|------|------|------|
| 工作邮件 | 发件人包含公司域名 | 标记为工作 |
| 订阅邮件 | 主题包含"订阅""newsletter" | 移动到订阅文件夹 |
| 重要邮件 | 发件人在联系人列表 | 标记星标 |
| 推广邮件 | 主题包含"优惠""促销" | 移动到推广文件夹 |

### 自定义规则

```json
{
  "rules": [
    {
      "name": "GitHub 通知",
      "conditions": {
        "from": "notifications@github.com"
      },
      "actions": {
        "label": "GitHub",
        "archive": true
      }
    }
  ]
}
```

## 邮件模板

### 模板示例

```markdown
## 会议邀请

主题：{{subject}}

您好，

邀请您参加 {{meeting_name}} 会议。

时间：{{time}}
地点：{{location}}

请确认是否参加。

谢谢！
```

### 使用模板

```bash
node scripts/send.js \
  --template meeting-invite \
  --to "team@company.com" \
  --vars "meeting_name=周会,time=周五 14:00,location=会议室 A"
```

## 自动化任务

### 定时检查

```bash
# 每 30 分钟检查一次
*/30 * * * * node email-automation/scripts/check.js
```

### 每日摘要

```bash
# 每天早上 8 点发送摘要
0 8 * * * node email-automation/scripts/digest.js
```

### 自动归档

```bash
# 每周日归档 30 天前的邮件
0 2 * * 0 node email-automation/scripts/archive.js --days 30
```

## 脚本使用

### 检查邮件

```bash
node scripts/check.js --unread --limit 10
```

### 发送邮件

```bash
node scripts/send.js \
  --to "recipient@example.com" \
  --cc "manager@example.com" \
  --subject "项目更新" \
  --body "附件是最新的项目报告。" \
  --attach "./report.pdf"
```

### 批量发送

```bash
node scripts/bulk-send.js \
  --recipients "./recipients.csv" \
  --template "newsletter" \
  --schedule "2026-03-10T09:00:00"
```

### 分类整理

```bash
node scripts/classify.js --apply
```

## 安全建议

- ✅ 使用应用专用密码（App Password）
- ✅ 启用两步验证
- ✅ 定期轮换密码
- ❌ 不要在代码中硬编码密码

## 常见问题

**Q: Gmail 无法连接怎么办？**

A: 需要启用 IMAP 并生成应用专用密码：
1. 访问 Google 账户设置
2. 启用两步验证
3. 生成应用专用密码
4. 使用该密码配置

**Q: 如何查看发送历史？**

A: 查看发送日志：
```bash
cat logs/email-sent.log
```

---

*Last updated: 2026-03-09*
*作者：[@S370035760](https://github.com/S370035760)*
