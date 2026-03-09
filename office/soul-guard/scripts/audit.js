#!/usr/bin/env node
/**
 * Soul Guard - 安全审计主脚本
 * 检测核心文件完整性、敏感信息泄露、配置漂移
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const WORKSPACE = '/root/.openclaw/workspace';
const BACKUP_DIR = path.join(WORKSPACE, '.backups');
const LOGS_DIR = path.join(WORKSPACE, 'logs');

// 核心保护文件
const PROTECTED_FILES = [
    { path: 'SOUL.md', risk: 'high', desc: 'AI 人格定义' },
    { path: 'MEMORY.md', risk: 'high', desc: '长期记忆' },
    { path: '.env', risk: 'high', desc: '环境变量' },
    { path: 'AGENTS.md', risk: 'medium', desc: '工作区配置' },
    { path: 'USER.md', risk: 'medium', desc: '用户信息' },
    { path: 'TOOLS.md', risk: 'low', desc: '工具配置' },
];

// 敏感信息模式
const SECRET_PATTERNS = [
    { name: 'GitHub Token', pattern: /ghp_[a-zA-Z0-9]{36}/g },
    { name: 'OpenAI Key', pattern: /sk-[a-zA-Z0-9]{48}/g },
    { name: 'Generic API Key', pattern: /api[_-]?key\s*[=:]\s*['"]?[a-zA-Z0-9]{20,}/gi },
    { name: 'Password', pattern: /password\s*[=:]\s*['"]?[^\s'"]{8,}/gi },
    { name: 'Private Key', pattern: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/g },
];

// 命令行参数
const args = process.argv.slice(2);
const FULL_AUDIT = args.includes('--full');
const REPORT_ONLY = args.includes('--report');
const FILE_ARG = args.find(a => a.startsWith('--file='))?.split('=')[1];

// 计算文件哈希
function hashFile(filePath) {
    try {
        const content = fs.readFileSync(filePath);
        return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
        return null;
    }
}

// 检查文件权限
function checkPermissions(filePath) {
    try {
        const stats = fs.statSync(filePath);
        const mode = stats.mode.toString(8).slice(-3);
        
        const warnings = [];
        if (mode.endsWith('7') || mode.endsWith('6')) {
            const filename = path.basename(filePath);
            if (['SOUL.md', 'MEMORY.md', '.env'].includes(filename)) {
                warnings.push(`权限过宽 (${mode})，建议 600`);
            }
        }
        return { mode, warnings };
    } catch (error) {
        return { mode: 'unknown', warnings: ['无法读取权限'] };
    }
}

// 扫描敏感信息
function scanSecrets(filePath, content) {
    const found = [];
    
    for (const secret of SECRET_PATTERNS) {
        const matches = content.match(secret.pattern);
        if (matches) {
            found.push({
                type: secret.name,
                count: matches.length,
                sample: matches[0].substring(0, 10) + '...',
            });
        }
    }
    
    return found;
}

// 审计单个文件
function auditFile(fileInfo) {
    const filePath = path.join(WORKSPACE, fileInfo.path);
    const result = {
        file: fileInfo.path,
        desc: fileInfo.desc,
        risk: fileInfo.risk,
        exists: false,
        hash: null,
        permissions: null,
        secrets: [],
        warnings: [],
        status: '✅',
    };
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
        result.status = '⚠️';
        result.warnings.push('文件不存在');
        return result;
    }
    
    result.exists = true;
    result.hash = hashFile(filePath);
    
    // 检查权限
    const permResult = checkPermissions(filePath);
    result.permissions = permResult.mode;
    result.warnings.push(...permResult.warnings);
    
    // 扫描敏感信息（仅 .env 文件）
    if (fileInfo.path === '.env') {
        const content = fs.readFileSync(filePath, 'utf-8');
        const secrets = scanSecrets(filePath, content);
        result.secrets = secrets;
        if (secrets.length > 0) {
            result.status = '🔴';
            result.warnings.push(`发现 ${secrets.length} 个敏感信息`);
        }
    }
    
    // 更新状态
    if (result.warnings.length === 0) {
        result.status = '✅';
    } else if (result.risk === 'high' && result.warnings.length > 0) {
        result.status = '🔴';
    } else if (result.warnings.some(w => w.includes('权限'))) {
        result.status = '⚠️';
    }
    
    return result;
}

// 生成审计报告
function generateReport(results) {
    const stats = {
        total: results.length,
        safe: results.filter(r => r.status === '✅').length,
        high: results.filter(r => r.status === '🔴').length,
        medium: results.filter(r => r.status === '⚠️').length,
        low: results.filter(r => r.warnings.length > 0 && r.status !== '🔴').length,
    };
    
    console.log('\n📊 审计报告');
    console.log('━'.repeat(50));
    console.log(`🔴 高危：${stats.high}`);
    console.log(`🟠 中危：${stats.medium}`);
    console.log(`🟡 低危：${stats.low}`);
    console.log(`🟢 安全：${stats.safe}`);
    console.log('━'.repeat(50));
    console.log(`总计：${stats.total} 个文件\n`);
    
    // 详细结果
    console.log('📋 详细结果:\n');
    results.forEach(r => {
        console.log(`${r.status} ${r.file} (${r.desc})`);
        if (r.permissions) console.log(`   权限：${r.permissions}`);
        if (r.secrets.length > 0) {
            r.secrets.forEach(s => {
                console.log(`   🔍 发现 ${s.type}: ${s.count} 个`);
            });
        }
        r.warnings.forEach(w => console.log(`   ⚠️  ${w}`));
        console.log('');
    });
    
    // 保存报告
    const reportPath = path.join(LOGS_DIR, `audit-${new Date().toISOString().split('T')[0]}.json`);
    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        stats,
        results,
    }, null, 2));
    
    console.log(`📍 报告已保存：${reportPath}\n`);
    
    return stats;
}

// 主函数
async function main() {
    console.log('🔒 Soul Guard 安全审计\n');
    console.log('='.repeat(50));
    
    // 完整审计
    if (FULL_AUDIT) {
        console.log('\n📁 文件完整性检查...\n');
        const results = PROTECTED_FILES.map(f => auditFile(f));
        const stats = generateReport(results);
        
        if (stats.high > 0) {
            console.log('🚨 发现高危问题，请立即处理！\n');
            process.exit(1);
        } else if (stats.medium > 0) {
            console.log('⚠️  发现中危问题，建议尽快处理。\n');
        } else {
            console.log('✅ 安全检查通过！\n');
        }
    }
    
    // 检查特定文件
    if (FILE_ARG) {
        const fileInfo = PROTECTED_FILES.find(f => f.path === FILE_ARG);
        if (!fileInfo) {
            console.error(`❌ 未知文件：${FILE_ARG}`);
            process.exit(1);
        }
        const result = auditFile(fileInfo);
        generateReport([result]);
    }
    
    // 仅生成报告
    if (REPORT_ONLY) {
        console.log('📊 生成历史报告...\n');
        // 读取最近的审计报告
        const today = new Date().toISOString().split('T')[0];
        const reportPath = path.join(LOGS_DIR, `audit-${today}.json`);
        if (fs.existsSync(reportPath)) {
            const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
            console.log(JSON.stringify(report, null, 2));
        } else {
            console.log('今日暂无审计报告，请运行 --full 进行审计。\n');
        }
    }
    
    // 默认显示帮助
    if (!FULL_AUDIT && !FILE_ARG && !REPORT_ONLY) {
        console.log('\n使用方法:\n');
        console.log('  node audit.js --full          完整审计');
        console.log('  node audit.js --file=SOUL.md  检查特定文件');
        console.log('  node audit.js --report        查看历史报告\n');
    }
}

main().catch(error => {
    console.error('💥 错误:', error.message);
    process.exit(1);
});
