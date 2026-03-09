#!/usr/bin/env node
/**
 * Email Sender - 发送邮件（模拟）
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

function parseArgs() {
    const config = {
        to: '',
        cc: '',
        subject: '',
        body: '',
        attach: [],
        template: null,
        vars: {},
        schedule: null,
    };
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--to':
                config.to = args[++i];
                break;
            case '--cc':
                config.cc = args[++i];
                break;
            case '--subject':
                config.subject = args[++i];
                break;
            case '--body':
                config.body = args[++i];
                break;
            case '--attach':
                config.attach.push(args[++i]);
                break;
            case '--template':
                config.template = args[++i];
                break;
            case '--vars':
                const vars = args[++i].split(',');
                vars.forEach(v => {
                    const [k, val] = v.split('=');
                    config.vars[k] = val;
                });
                break;
            case '--schedule':
                config.schedule = args[++i];
                break;
        }
    }
    
    return config;
}

function applyTemplate(template, vars) {
    let content = template;
    Object.entries(vars).forEach(([key, value]) => {
        content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    return content;
}

function sendEmail(config) {
    console.log('📧 发送邮件\n');
    console.log('='.repeat(50));
    console.log(`📮 收件人：${config.to}`);
    if (config.cc) console.log(`📮 抄送：${config.cc}`);
    console.log(`📝 主题：${config.subject}`);
    console.log(`📄 正文：${config.body.substring(0, 100)}${config.body.length > 100 ? '...' : ''}`);
    if (config.attach.length > 0) {
        console.log(`📎 附件：${config.attach.join(', ')}`);
    }
    if (config.schedule) {
        console.log(`⏰ 定时：${config.schedule}`);
    }
    console.log('');
    
    // 模拟发送
    console.log('📤 发送中...\n');
    
    setTimeout(() => {
        console.log('✅ 发送成功！');
        console.log(`📍 邮件 ID: MSG-${Date.now()}`);
        console.log(`📊 状态：已送达\n`);
        
        // 保存发送记录
        const logPath = path.join(__dirname, '../logs/sent.json');
        const record = {
            id: `MSG-${Date.now()}`,
            timestamp: new Date().toISOString(),
            to: config.to,
            subject: config.subject,
            scheduled: config.schedule,
            status: 'sent',
        };
        
        const logDir = path.dirname(logPath);
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
        
        let logs = [];
        if (fs.existsSync(logPath)) {
            logs = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
        }
        logs.push(record);
        fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
        
        console.log(`📝 记录已保存：${logPath}\n`);
    }, 500);
}

const config = parseArgs();

if (!config.to || !config.subject) {
    console.log('使用方法:\n');
    console.log('  node send.js --to="user@example.com" --subject="主题" --body="内容"');
    console.log('  node send.js --to="user@example.com" --template="模板名" --vars="k1=v1,k2=v2"');
    console.log('  node send.js --to="user@example.com" --subject="主题" --schedule="2026-03-10T09:00:00"\n');
    process.exit(0);
}

sendEmail(config);
