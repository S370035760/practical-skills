#!/usr/bin/env node
/**
 * 基准线管理 - 创建和对比配置基准
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const WORKSPACE = '/root/.openclaw/workspace';
const BASELINE_FILE = path.join(WORKSPACE, '.soul-guard-baseline.json');

const PROTECTED_FILES = [
    'SOUL.md',
    'MEMORY.md',
    '.env',
    'AGENTS.md',
    'USER.md',
    'TOOLS.md',
];

function hashFile(filePath) {
    try {
        const content = fs.readFileSync(filePath);
        return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
        return null;
    }
}

function createBaseline() {
    console.log('📋 创建基准线...\n');
    
    const baseline = {
        createdAt: new Date().toISOString(),
        files: {},
    };
    
    PROTECTED_FILES.forEach(file => {
        const filePath = path.join(WORKSPACE, file);
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            baseline.files[file] = {
                hash: hashFile(filePath),
                size: stats.size,
                mtime: stats.mtime.toISOString(),
                mode: stats.mode.toString(8).slice(-3),
            };
            console.log(`✅ ${file}`);
        } else {
            console.log(`⚠️  ${file} (不存在)`);
        }
    });
    
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2));
    console.log(`\n📍 基准线已保存：${BASELINE_FILE}`);
    console.log(`📅 创建时间：${baseline.createdAt}\n`);
}

function checkBaseline() {
    console.log('🔍 对比基准线...\n');
    
    if (!fs.existsSync(BASELINE_FILE)) {
        console.log('❌ 基准线不存在，请先创建基准线：node baseline.js --create\n');
        process.exit(1);
    }
    
    const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf-8'));
    const changes = [];
    
    console.log('📁 文件对比:\n');
    
    Object.entries(baseline.files).forEach(([file, base]) => {
        const filePath = path.join(WORKSPACE, file);
        
        if (!fs.existsSync(filePath)) {
            changes.push({ file, type: 'deleted', desc: '文件被删除' });
            console.log(`🔴 ${file} - 文件被删除`);
            return;
        }
        
        const currentHash = hashFile(filePath);
        const stats = fs.statSync(filePath);
        
        if (currentHash !== base.hash) {
            changes.push({ file, type: 'modified', desc: '内容被修改' });
            console.log(`🔴 ${file} - 内容被修改`);
            console.log(`   基准：${base.hash.substring(0, 16)}...`);
            console.log(`   当前：${currentHash.substring(0, 16)}...`);
        } else if (stats.mode.toString(8).slice(-3) !== base.mode) {
            changes.push({ file, type: 'permission', desc: '权限被修改' });
            console.log(`🟡 ${file} - 权限被修改 (${base.mode} → ${stats.mode.toString(8).slice(-3)})`);
        } else {
            console.log(`✅ ${file} - 无变化`);
        }
    });
    
    console.log('\n' + '='.repeat(50));
    if (changes.length === 0) {
        console.log('✅ 所有文件与基准线一致，无配置漂移。\n');
    } else {
        console.log(`⚠️  发现 ${changes.length} 处变更:\n`);
        changes.forEach(c => {
            console.log(`   ${c.file}: ${c.desc}`);
        });
        console.log('');
    }
}

const args = process.argv.slice(2);

if (args.includes('--create')) {
    createBaseline();
} else if (args.includes('--check')) {
    checkBaseline();
} else {
    console.log('使用方法:\n');
    console.log('  node baseline.js --create   创建基准线');
    console.log('  node baseline.js --check    对比基准线\n');
}
