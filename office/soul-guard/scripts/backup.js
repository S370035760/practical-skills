#!/usr/bin/env node
/**
 * 自动备份核心配置文件
 */

const fs = require('fs');
const path = require('path');

const WORKSPACE = '/root/.openclaw/workspace';
const BACKUP_DIR = path.join(WORKSPACE, '.backups');

const PROTECTED_FILES = [
    'SOUL.md',
    'MEMORY.md',
    '.env',
    'AGENTS.md',
    'USER.md',
    'TOOLS.md',
];

function backupFiles() {
    const today = new Date().toISOString().split('T')[0];
    const backupPath = path.join(BACKUP_DIR, today);
    
    console.log('💾 开始备份...\n');
    
    // 创建备份目录
    if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
    }
    
    let backedUp = 0;
    let skipped = 0;
    
    PROTECTED_FILES.forEach(file => {
        const srcPath = path.join(WORKSPACE, file);
        const destPath = path.join(backupPath, file);
        
        if (fs.existsSync(srcPath)) {
            fs.copyFileSync(srcPath, destPath);
            console.log(`✅ ${file}`);
            backedUp++;
        } else {
            console.log(`⚠️  ${file} (不存在)`);
            skipped++;
        }
    });
    
    console.log(`\n📍 备份位置：${backupPath}`);
    console.log(`✅ 成功：${backedUp} 个文件`);
    console.log(`⏭️  跳过：${skipped} 个文件\n`);
    
    // 清理 7 天前的备份
    cleanupOldBackups();
}

function cleanupOldBackups() {
    const maxAge = 7; // 保留 7 天
    const now = Date.now();
    
    if (!fs.existsSync(BACKUP_DIR)) return;
    
    const dirs = fs.readdirSync(BACKUP_DIR);
    let deleted = 0;
    
    dirs.forEach(dir => {
        const dirPath = path.join(BACKUP_DIR, dir);
        if (fs.statSync(dirPath).isDirectory()) {
            const date = new Date(dir);
            const age = (now - date.getTime()) / (1000 * 60 * 60 * 24);
            
            if (age > maxAge) {
                fs.rmSync(dirPath, { recursive: true, force: true });
                console.log(`🗑️  删除过期备份：${dir}`);
                deleted++;
            }
        }
    });
    
    if (deleted > 0) {
        console.log(`🗑️  清理了 ${deleted} 个过期备份\n`);
    }
}

function listBackups() {
    console.log('📦 可用备份:\n');
    
    if (!fs.existsSync(BACKUP_DIR)) {
        console.log('暂无备份\n');
        return;
    }
    
    const dirs = fs.readdirSync(BACKUP_DIR).sort().reverse();
    dirs.forEach(dir => {
        const dirPath = path.join(BACKUP_DIR, dir);
        const stats = fs.statSync(dirPath);
        const files = fs.readdirSync(dirPath).length;
        console.log(`📅 ${dir} - ${files} 个文件 (${(stats.size / 1024).toFixed(2)} KB)`);
    });
    
    console.log('');
}

function restore(args) {
    const dateArg = args.find(a => a.startsWith('--date='))?.split('=')[1];
    const fileArg = args.find(a => a.startsWith('--file='))?.split('=')[1];
    
    if (!dateArg) {
        console.log('❌ 请指定备份日期：--date=2026-03-08\n');
        process.exit(1);
    }
    
    const backupPath = path.join(BACKUP_DIR, dateArg);
    
    if (!fs.existsSync(backupPath)) {
        console.log(`❌ 备份不存在：${dateArg}\n`);
        process.exit(1);
    }
    
    console.log(`🔄 从 ${dateArg} 恢复...\n`);
    
    const files = fileArg ? [fileArg] : PROTECTED_FILES;
    let restored = 0;
    
    files.forEach(file => {
        const srcPath = path.join(backupPath, file);
        const destPath = path.join(WORKSPACE, file);
        
        if (fs.existsSync(srcPath)) {
            fs.copyFileSync(srcPath, destPath);
            console.log(`✅ 恢复：${file}`);
            restored++;
        } else {
            console.log(`⚠️  ${file} (备份中不存在)`);
        }
    });
    
    console.log(`\n✅ 恢复了 ${restored} 个文件\n`);
}

const args = process.argv.slice(2);

if (args.includes('--daily')) {
    backupFiles();
} else if (args.includes('--list')) {
    listBackups();
} else if (args.includes('--restore')) {
    restore(args);
} else if (args.includes('--cleanup')) {
    cleanupOldBackups();
} else {
    console.log('使用方法:\n');
    console.log('  node backup.js --daily              每日备份');
    console.log('  node backup.js --list               列出备份');
    console.log('  node backup.js --restore --date=XXX 恢复备份');
    console.log('  node backup.js --cleanup            清理过期备份\n');
}
