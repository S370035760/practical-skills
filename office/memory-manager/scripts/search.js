#!/usr/bin/env node
/**
 * Memory Search - 搜索记忆内容
 */

const fs = require('fs');
const path = require('path');

const WORKSPACE = '/root/.openclaw/workspace';
const MEMORY_FILE = path.join(WORKSPACE, 'MEMORY.md');
const MEMORY_DIR = path.join(WORKSPACE, 'memory');

const args = process.argv.slice(2);
const QUERY_ARG = args.find(a => a.startsWith('--query='))?.split('=')[1];
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1]) || 10;
const HIGHLIGHT = args.includes('--highlight');

function searchInFile(filePath, query) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const results = [];
    
    const queryLower = query.toLowerCase();
    
    lines.forEach((line, index) => {
        if (line.toLowerCase().includes(queryLower)) {
            results.push({
                file: path.basename(filePath),
                line: index + 1,
                content: line.trim(),
            });
        }
    });
    
    return results;
}

function highlightText(text, query) {
    if (!HIGHLIGHT) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '【$1】');
}

function searchAll(query) {
    console.log(`🔍 搜索："${query}"\n`);
    
    const allResults = [];
    
    // 搜索 MEMORY.md
    if (fs.existsSync(MEMORY_FILE)) {
        const results = searchInFile(MEMORY_FILE, query);
        results.forEach(r => {
            r.file = 'MEMORY.md';
            allResults.push(r);
        });
    }
    
    // 搜索 daily memory 文件
    if (fs.existsSync(MEMORY_DIR)) {
        const files = fs.readdirSync(MEMORY_DIR)
            .filter(f => f.endsWith('.md'))
            .sort()
            .reverse()
            .slice(0, 30); // 最近 30 天
        
        files.forEach(file => {
            const filePath = path.join(MEMORY_DIR, file);
            const results = searchInFile(filePath, query);
            allResults.push(...results);
        });
    }
    
    return allResults;
}

function displayResults(results) {
    if (results.length === 0) {
        console.log('❌ 未找到匹配内容\n');
        return;
    }
    
    console.log(`📊 找到 ${results.length} 条结果:\n`);
    console.log('━'.repeat(50));
    
    results.slice(0, LIMIT).forEach((r, i) => {
        console.log(`\n${i + 1}. ${r.file}:${r.line}`);
        console.log(`   ${highlightText(r.content, QUERY_ARG)}`);
    });
    
    if (results.length > LIMIT) {
        console.log(`\n... 还有 ${results.length - LIMIT} 条结果`);
    }
    
    console.log('\n');
}

if (QUERY_ARG) {
    const results = searchAll(QUERY_ARG);
    displayResults(results);
} else {
    console.log('使用方法:\n');
    console.log('  node search.js --query="关键词"     搜索记忆');
    console.log('  node search.js --query="XX" --limit=20  限制结果数');
    console.log('  node search.js --query="XX" --highlight 高亮匹配\n');
}
