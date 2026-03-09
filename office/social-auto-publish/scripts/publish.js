#!/usr/bin/env node
/**
 * 多平台内容一键发布脚本
 * 支持：微信公众号、知乎、掘金、小红书、微博
 */

const fs = require('fs');
const path = require('path');

// 平台配置
const PLATFORMS = {
    wechat: {
        name: '微信公众号',
        titleLimit: 64,
        coverSize: { width: 900, height: 383, ratio: 2.35 },
        tagFormat: '#{tag}#',
        maxTags: 3,
        imageLimit: { count: Infinity, size: 5 * 1024 * 1024 },
    },
    zhihu: {
        name: '知乎',
        titleLimit: 20,
        coverSize: { width: 1200, height: 675, ratio: 16/9 },
        tagFormat: '#{tag}#',
        maxTags: 5,
        imageLimit: { count: Infinity, size: 10 * 1024 * 1024 },
    },
    juejin: {
        name: '掘金',
        titleLimit: 50,
        coverSize: { width: 1280, height: 720, ratio: 16/9 },
        tagFormat: '#{tag}#',
        maxTags: 5,
        imageLimit: { count: Infinity, size: 5 * 1024 * 1024 },
    },
    xiaohongshu: {
        name: '小红书',
        titleLimit: 20,
        coverSize: { width: 1080, height: 1440, ratio: 3/4 },
        tagFormat: '#{tag}#',
        maxTags: 10,
        imageLimit: { count: 9, size: 5 * 1024 * 1024 },
        requireEmoji: true,
    },
    weibo: {
        name: '微博',
        titleLimit: 140,
        coverSize: { width: 1200, height: 675, ratio: 16/9 },
        tagFormat: '#{tag}#',
        maxTags: 5,
        imageLimit: { count: 9, size: 5 * 1024 * 1024 },
    },
};

// 命令行参数解析
function parseArgs() {
    const args = process.argv.slice(2);
    const config = {
        platform: [],
        title: '',
        content: '',
        images: [],
        mode: 'draft',
        schedule: null,
        tags: [],
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--platform':
                config.platform = args[++i].split(',');
                break;
            case '--title':
                config.title = args[++i];
                break;
            case '--content':
                const nextArg = args[++i];
                // 如果是文件路径，读取文件内容；否则直接使用字符串
                if (fs.existsSync(nextArg)) {
                    config.content = fs.readFileSync(nextArg, 'utf-8');
                } else {
                    config.content = nextArg;
                }
                break;
            case '--images':
                config.images = fs.readdirSync(args[++i]).map(f => path.join(args[i], f));
                break;
            case '--mode':
                config.mode = args[++i];
                break;
            case '--schedule':
                config.schedule = args[++i];
                break;
            case '--tags':
                config.tags = args[++i].split(',');
                break;
        }
    }

    return config;
}

// 优化标题（根据平台特点）
function optimizeTitle(title, platform) {
    const config = PLATFORMS[platform];
    let optimized = title;

    // 截断超长标题
    if (optimized.length > config.titleLimit) {
        optimized = optimized.substring(0, config.titleLimit - 3) + '...';
    }

    // 小红书必须加 emoji
    if (config.requireEmoji && !/[\u{1F600}-\u{1F64F}]/u.test(optimized)) {
        const emojis = ['✨', '🔥', '💡', '✅', '📌', '💪', '🎯', '⭐'];
        optimized = emojis[Math.floor(Math.random() * emojis.length)] + ' ' + optimized;
    }

    // 知乎添加疑问句
    if (platform === 'zhihu' && !/[\?？]$/.test(optimized)) {
        optimized = '如何' + optimized + '？';
    }

    return optimized;
}

// 格式化标签
function formatTags(tags, platform) {
    const config = PLATFORMS[platform];
    return tags
        .slice(0, config.maxTags)
        .map(tag => config.tagFormat.replace('{tag}', tag))
        .join(' ');
}

// 模拟发布到平台
async function publishToPlatform(platform, config) {
    const platformConfig = PLATFORMS[platform];
    
    console.log(`\n📱 发布到 ${platformConfig.name}...`);
    console.log(`   标题：${optimizeTitle(config.title, platform)}`);
    console.log(`   标签：${formatTags(config.tags, platform)}`);
    console.log(`   图片：${config.images.length} 张`);
    console.log(`   模式：${config.mode === 'draft' ? '💾 草稿箱' : '🚀 直接发布'}`);
    
    if (config.schedule) {
        console.log(`   定时：${config.schedule}`);
    }

    // 模拟 API 调用（实际应该调用各平台 API）
    await new Promise(resolve => setTimeout(resolve, 500));

    const result = {
        platform,
        success: true,
        url: `https://${platform}.com/post/${Date.now()}`,
        mode: config.mode,
        scheduledAt: config.schedule,
    };

    console.log(`   ✅ 发布成功：${result.url}`);
    return result;
}

// 主函数
async function main() {
    console.log('🚀 多平台内容一键发布\n');
    console.log('=' .repeat(50));

    const config = parseArgs();

    // 验证必填参数
    if (config.platform.length === 0) {
        console.error('❌ 错误：请指定 --platform 参数');
        process.exit(1);
    }

    if (!config.title) {
        console.error('❌ 错误：请指定 --title 参数');
        process.exit(1);
    }

    if (!config.content) {
        console.error('❌ 错误：请指定 --content 参数');
        process.exit(1);
    }

    // 验证平台
    const validPlatforms = Object.keys(PLATFORMS);
    const invalidPlatforms = config.platform.filter(p => !validPlatforms.includes(p));
    if (invalidPlatforms.length > 0) {
        console.error(`❌ 错误：不支持的平台：${invalidPlatforms.join(', ')}`);
        console.error(`   支持的平台：${validPlatforms.join(', ')}`);
        process.exit(1);
    }

    // 发布到各平台
    const results = [];
    for (const platform of config.platform) {
        try {
            const result = await publishToPlatform(platform, config);
            results.push(result);
        } catch (error) {
            console.error(`❌ ${platform} 发布失败：${error.message}`);
            results.push({
                platform,
                success: false,
                error: error.message,
            });
        }
    }

    // 输出汇总报告
    console.log('\n' + '='.repeat(50));
    console.log('📊 发布汇总报告\n');

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ 成功：${successCount}/${results.length}`);
    console.log(`❌ 失败：${results.length - successCount}/${results.length}`);

    console.log('\n各平台状态：');
    results.forEach(r => {
        const icon = r.success ? '✅' : '❌';
        const name = PLATFORMS[r.platform].name;
        const url = r.url || r.error;
        console.log(`   ${icon} ${name}: ${url}`);
    });

    // 保存发布记录
    const reportPath = path.join(__dirname, '../publish-report.json');
    const report = {
        timestamp: new Date().toISOString(),
        title: config.title,
        platforms: config.platform,
        results,
    };

    // 读取现有报告或创建新报告
    let existingReport = [];
    if (fs.existsSync(reportPath)) {
        existingReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    }
    existingReport.push(report);
    fs.writeFileSync(reportPath, JSON.stringify(existingReport, null, 2));

    console.log(`\n📍 发布记录已保存：${reportPath}`);
    console.log('\n🎉 发布完成！');
}

// 运行
main().catch(error => {
    console.error('💥 错误:', error.message);
    process.exit(1);
});
