#!/usr/bin/env node
/**
 * Memory Organizer - 整理 daily memory 到长期记忆
 */

const fs = require('fs');
const path = require('path');

const WORKSPACE = '/root/.openclaw/workspace';
const MEMORY_FILE = path.join(WORKSPACE, 'MEMORY.md');
const MEMORY_DIR = path.join(WORKSPACE, 'memory');

const args = process.argv.slice(2);
const TODAY_ARG = args.includes('--today');
const FROM_ARG = args.find(a => a.startsWith('--from='))?.split('=')[1];

// 提取关键信息模式
const PATTERNS = {
    preferences: [/用户喜欢/, /偏好/, /习惯/, /风格/],
    decisions: [/决定/, /决策/, /选择/, /同意/],
    projects: [/项目/, /任务/, /目标/, /计划/],
    relationships: [/同事/, /朋友/, /家人/, /团队/],
};

function extractToday() {
    const today = new Date().toISOString().split('T')[0];
    const todayFile = path.join(MEMORY_DIR, `${today}.md`);
    
    if (!fs.existsSync(todayFile)) {
        console.log(`⚠️  今日记忆文件不存在：${todayFile}\n`);
        return null;
    }
    
    console.log(`📝 读取今日记忆：${today}\n`);
    return fs.readFileSync(todayFile, 'utf-8');
}

function extractFromFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`⚠️  文件不存在：${filePath}\n`);
        return null;
    }
    
    console.log(`📝 读取记忆文件：${path.basename(filePath)}\n`);
    return fs.readFileSync(filePath, 'utf-8');
}

function categorizeContent(content) {
    const categories = {
        preferences: [],
        decisions: [],
        projects: [],
        relationships: [],
        other: [],
    };
    
    const lines = content.split('\n');
    
    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        
        let categorized = false;
        
        for (const [category, patterns] of Object.entries(PATTERNS)) {
            if (patterns.some(p => p.test(trimmed))) {
                categories[category].push(trimmed);
                categorized = true;
                break;
            }
        }
        
        if (!categorized && trimmed.length > 10) {
            categories.other.push(trimmed);
        }
    });
    
    return categories;
}

function formatForMemory(categories, sourceDate) {
    let output = `## 来自 ${sourceDate} 的提炼\n\n`;
    
    if (categories.preferences.length > 0) {
        output += '### 偏好\n';
        categories.preferences.forEach(item => {
            output += `- ${item}\n`;
        });
        output += '\n';
    }
    
    if (categories.decisions.length > 0) {
        output += '### 决策\n';
        categories.decisions.forEach(item => {
            output += `- ${item}\n`;
        });
        output += '\n';
    }
    
    if (categories.projects.length > 0) {
        output += '### 项目\n';
        categories.projects.forEach(item => {
            output += `- ${item}\n`;
        });
        output += '\n';
    }
    
    if (categories.relationships.length > 0) {
        output += '### 关系\n';
        categories.relationships.forEach(item => {
            output += `- ${item}\n`;
        });
        output += '\n';
    }
    
    return output;
}

function appendToMemory(content) {
    let existing = '';
    
    if (fs.existsSync(MEMORY_FILE)) {
        existing = fs.readFileSync(MEMORY_FILE, 'utf-8');
    }
    
    // 添加到文件末尾
    const updated = existing + '\n\n' + content;
    fs.writeFileSync(MEMORY_FILE, updated);
    
    console.log(`✅ 已更新：${MEMORY_FILE}\n`);
}

function markAsProcessed(filePath) {
    const marker = '\n\n> 📌 已整理到 MEMORY.md';
    const content = fs.readFileSync(filePath, 'utf-8');
    
    if (!content.includes(marker)) {
        fs.writeFileSync(filePath, content + marker);
        console.log(`📌 已标记：${path.basename(filePath)}\n`);
    }
}

async function main() {
    console.log('🧠 Memory Organizer\n');
    console.log('='.repeat(50));
    
    let content = null;
    let source = '';
    
    if (TODAY_ARG) {
        content = extractToday();
        source = new Date().toISOString().split('T')[0];
    } else if (FROM_ARG) {
        content = extractFromFile(FROM_ARG);
        source = path.basename(FROM_ARG, '.md');
    } else {
        console.log('使用方法:\n');
        console.log('  node organize.js --today           整理今日记忆');
        console.log('  node organize.js --from=FILE.md    整理指定文件\n');
        return;
    }
    
    if (!content) return;
    
    // 分类提取
    console.log('🔍 分析内容...\n');
    const categories = categorizeContent(content);
    
    // 显示统计
    console.log('📊 提取结果:\n');
    Object.entries(categories).forEach(([cat, items]) => {
        if (items.length > 0) {
            console.log(`   ${cat}: ${items.length} 条`);
        }
    });
    console.log('');
    
    // 格式化并保存
    const formatted = formatForMemory(categories, source);
    appendToMemory(formatted);
    
    // 标记已处理
    if (FROM_ARG) {
        markAsProcessed(FROM_ARG);
    }
    
    console.log('✅ 整理完成！\n');
}

main().catch(error => {
    console.error('💥 错误:', error.message);
    process.exit(1);
});
