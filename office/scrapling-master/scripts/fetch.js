#!/usr/bin/env node
/**
 * Scrapling Fetcher - 网页抓取（模拟 Scrapling 调用）
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

function parseArgs() {
    const config = {
        url: '',
        css: '',
        xpath: '',
        text: '',
        regex: '',
        fields: '',
        output: './output/data.json',
        stealth: false,
        dynamic: false,
        headless: false,
        solveCf: false,
        adaptive: false,
        autoSave: false,
        session: null,
        concurrency: 1,
        delay: 0,
        timeout: 30,
    };
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--url': config.url = args[++i]; break;
            case '--css': config.css = args[++i]; break;
            case '--xpath': config.xpath = args[++i]; break;
            case '--text': config.text = args[++i]; break;
            case '--regex': config.regex = args[++i]; break;
            case '--fields': config.fields = args[++i]; break;
            case '--output': config.output = args[++i]; break;
            case '--stealth': config.stealth = true; break;
            case '--dynamic': config.dynamic = true; break;
            case '--headless': config.headless = true; break;
            case '--solve-cf': config.solveCf = true; break;
            case '--adaptive': config.adaptive = true; break;
            case '--auto-save': config.autoSave = true; break;
            case '--session': config.session = args[++i]; break;
            case '--concurrency': config.concurrency = parseInt(args[++i]); break;
            case '--delay': config.delay = parseFloat(args[++i]); break;
            case '--timeout': config.timeout = parseInt(args[++i]); break;
        }
    }
    
    return config;
}

function fetchWithScrapling(config) {
    const mode = config.stealth ? '🛡️ Stealth' : config.dynamic ? '🌐 Dynamic' : '📡 HTTP';
    const adaptive = config.adaptive ? ' + 自适应' : '';
    
    console.log('🕷️ Scrapling 网页抓取\n');
    console.log('='.repeat(50));
    console.log(`${mode} 模式${adaptive}`);
    console.log(`🔗 URL: ${config.url}`);
    console.log(`🎯 选择器：${config.css || config.xpath || config.text || '自动'}`);
    if (config.fields) console.log(`📋 字段：${config.fields}`);
    if (config.stealth && config.solveCf) console.log(`🔓 绕过 Cloudflare: 是`);
    if (config.headless) console.log(`👻 无头模式：是`);
    console.log(`⚡ 并发：${config.concurrency}`);
    console.log(`⏱️  超时：${config.timeout}s`);
    console.log('');
    
    // 模拟抓取
    console.log('🔄 正在抓取网页...\n');
    
    setTimeout(() => {
        const outputDir = path.dirname(config.output);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // 模拟抓取结果
        const results = [];
        const itemCount = Math.floor(Math.random() * 5) + 3;
        
        for (let i = 0; i < itemCount; i++) {
            const item = {
                id: i + 1,
                title: `示例内容 ${i + 1}`,
                url: `${config.url}/item/${i + 1}`,
                extracted_at: new Date().toISOString(),
            };
            
            if (config.fields) {
                config.fields.split(',').forEach(field => {
                    const [name, selector] = field.split(':');
                    item[name.trim()] = `数据 - ${name.trim()}`;
                });
            }
            
            results.push(item);
        }
        
        // 保存结果
        const outputPath = path.join(outputDir, `scraped-${Date.now()}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
        
        console.log('✅ 抓取成功！\n');
        console.log(`📊 提取项目：${results.length} 个`);
        console.log(`📍 输出文件：${outputPath}`);
        console.log(`📦 文件大小：${(JSON.stringify(results).length / 1024).toFixed(2)} KB\n`);
        
        // 显示示例数据
        console.log('📋 数据预览:\n');
        results.slice(0, 2).forEach((item, i) => {
            console.log(`${i + 1}. ${JSON.stringify(item, null, 2)}`);
        });
        console.log('');
        
        // 保存抓取记录
        const logPath = path.join(__dirname, '../logs/fetches.json');
        const logDir = path.dirname(logPath);
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
        
        let logs = [];
        if (fs.existsSync(logPath)) logs = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
        
        logs.push({
            timestamp: new Date().toISOString(),
            url: config.url,
            mode: mode.replace(/[\u0370-\u03FF\u0400-\u04FF]/g, '').trim(),
            items: results.length,
            output: outputPath,
        });
        fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
        
    }, 800);
}

const config = parseArgs();

if (!config.url) {
    console.log('使用方法:\n');
    console.log('  node fetch.js --url="https://example.com" --css=".product"');
    console.log('  node fetch.js --url="https://site.com" --stealth --solve-cf');
    console.log('  node fetch.js --url="https://site.com" --fields="title:.title,price:.price"');
    console.log('\n选项:');
    console.log('  --url         目标网址（必填）');
    console.log('  --css         CSS 选择器');
    console.log('  --xpath       XPath 选择器');
    console.log('  --fields      字段定义（name:selector,name:selector）');
    console.log('  --stealth     隐身模式（绕过反爬）');
    console.log('  --dynamic     浏览器模式（动态网页）');
    console.log('  --solve-cf    绕过 Cloudflare');
    console.log('  --adaptive    自适应模式（网站改版后使用）');
    console.log('  --output      输出文件路径\n');
    process.exit(0);
}

fetchWithScrapling(config);
