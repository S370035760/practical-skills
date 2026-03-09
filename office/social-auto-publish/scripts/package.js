#!/usr/bin/env node
/**
 * Skill Packager for social-auto-publish
 * Packages the skill into a .skill file (zip format)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SKILL_NAME = 'social-auto-publish';
const SKILL_DIR = path.join(__dirname, '..');
const OUTPUT_DIR = path.join(__dirname, '../dist');
const OUTPUT_FILE = path.join(OUTPUT_DIR, `${SKILL_NAME}.skill`);

// 验证技能结构
function validateSkill() {
    console.log('🔍 验证技能结构...\n');
    
    const requiredFiles = [
        'SKILL.md',
    ];
    
    const errors = [];
    
    // 检查必需文件
    for (const file of requiredFiles) {
        const filePath = path.join(SKILL_DIR, file);
        if (!fs.existsSync(filePath)) {
            errors.push(`❌ 缺少必需文件：${file}`);
        } else {
            console.log(`✅ ${file}`);
        }
    }
    
    // 检查 SKILL.md 格式
    const skillMdPath = path.join(SKILL_DIR, 'SKILL.md');
    if (fs.existsSync(skillMdPath)) {
        const content = fs.readFileSync(skillMdPath, 'utf-8');
        
        // 检查 frontmatter
        if (!content.startsWith('---')) {
            errors.push('❌ SKILL.md 缺少 YAML frontmatter');
        } else {
            const frontmatterEnd = content.indexOf('---', 3);
            const frontmatter = content.substring(3, frontmatterEnd);
            
            if (!frontmatter.includes('name:')) {
                errors.push('❌ SKILL.md frontmatter 缺少 name 字段');
            }
            if (!frontmatter.includes('description:')) {
                errors.push('❌ SKILL.md frontmatter 缺少 description 字段');
            }
            
            if (!errors.some(e => e.includes('frontmatter'))) {
                console.log('✅ frontmatter 格式正确');
            }
        }
    }
    
    if (errors.length > 0) {
        console.error('\n验证失败：');
        errors.forEach(e => console.error(e));
        process.exit(1);
    }
    
    console.log('\n✅ 验证通过\n');
}

// 打包技能
function packageSkill() {
    console.log('📦 开始打包...\n');
    
    // 创建输出目录
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        console.log(`📁 创建输出目录：${OUTPUT_DIR}`);
    }
    
    // 使用 zip 命令打包
    try {
        const zipCommand = `cd "${SKILL_DIR}" && zip -r "${OUTPUT_FILE}" SKILL.md scripts/ references/ assets/ -x "*.git*" "*.DS_Store"`;
        execSync(zipCommand, { stdio: 'inherit' });
        
        console.log(`\n✅ 打包完成：${OUTPUT_FILE}`);
        
        // 显示文件大小
        const stats = fs.statSync(OUTPUT_FILE);
        const size = (stats.size / 1024).toFixed(2);
        console.log(`📊 文件大小：${size} KB`);
        
    } catch (error) {
        console.error('❌ 打包失败:', error.message);
        console.log('\n💡 提示：请确保已安装 zip 命令');
        console.log('   macOS: brew install zip');
        console.log('   Linux: apt-get install zip');
        console.log('   Windows: 安装 Git Bash 或 WSL');
        process.exit(1);
    }
}

// 显示使用说明
function showUsage() {
    console.log('\n📖 使用说明:\n');
    console.log('1. 安装技能（未来功能）:');
    console.log('   openclaw skills install ./dist/social-auto-publish.skill');
    console.log('');
    console.log('2. 手动安装:');
    console.log(`   cp ./dist/${SKILL_NAME}.skill ~/.openclaw/skills/`);
    console.log('');
    console.log('3. 测试技能:');
    console.log('   node scripts/publish.js --platform wechat --title "测试" --content "内容"');
    console.log('');
}

// 主函数
function main() {
    console.log('🚀 Social Auto Publish Skill Packager\n');
    console.log('='.repeat(50));
    console.log('');
    
    validateSkill();
    packageSkill();
    showUsage();
    
    console.log('🎉 打包完成！');
}

main();
