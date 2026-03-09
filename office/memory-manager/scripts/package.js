#!/usr/bin/env node
/**
 * Memory Manager Skill Packager
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SKILL_NAME = 'memory-manager';
const SKILL_DIR = path.join(__dirname, '..');
const OUTPUT_DIR = path.join(SKILL_DIR, 'dist');
const OUTPUT_FILE = path.join(OUTPUT_DIR, `${SKILL_NAME}.skill`);

console.log('🧠 Memory Manager Skill Packager\n');
console.log('='.repeat(50));

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

try {
    const zipCommand = `cd "${SKILL_DIR}" && zip -r "${OUTPUT_FILE}" SKILL.md scripts/ -x "*.git*" "*.DS_Store"`;
    execSync(zipCommand, { stdio: 'inherit' });
    
    const stats = fs.statSync(OUTPUT_FILE);
    console.log(`\n✅ 打包完成：${OUTPUT_FILE}`);
    console.log(`📊 文件大小：${(stats.size / 1024).toFixed(2)} KB\n`);
} catch (error) {
    console.error('❌ 打包失败:', error.message);
    process.exit(1);
}
