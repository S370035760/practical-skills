#!/usr/bin/env node
/**
 * Chart Generator - 生成数据图表（模拟）
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

function parseArgs() {
    const config = {
        data: '',
        type: 'bar',
        x: '',
        y: '',
        title: '数据图表',
        output: './output/chart.png',
        width: 800,
        height: 600,
        theme: 'default',
    };
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--data': config.data = args[++i]; break;
            case '--type': config.type = args[++i]; break;
            case '--x': config.x = args[++i]; break;
            case '--y': config.y = args[++i]; break;
            case '--title': config.title = args[++i]; break;
            case '--output': config.output = args[++i]; break;
            case '--width': config.width = parseInt(args[++i]); break;
            case '--height': config.height = parseInt(args[++i]); break;
            case '--theme': config.theme = args[++i]; break;
        }
    }
    
    return config;
}

const CHART_TYPES = {
    bar: '📊',
    line: '📈',
    pie: '🥧',
    scatter: '🔘',
    heatmap: '🔥',
    area: '📉',
};

function generateChart(config) {
    const icon = CHART_TYPES[config.type] || '📊';
    
    console.log(`${icon} 生成${config.type}图表\n`);
    console.log('='.repeat(50));
    console.log(`📁 数据源：${config.data || '示例数据'}`);
    console.log(`📐 X 轴：${config.x || '自动'}`);
    console.log(`📐 Y 轴：${config.y || '自动'}`);
    console.log(`📝 标题：${config.title}`);
    console.log(`📏 尺寸：${config.width}x${config.height}`);
    console.log(`🎨 主题：${config.theme}`);
    console.log('');
    
    // 模拟生成
    console.log('🔄 渲染图表...\n');
    
    setTimeout(() => {
        const outputDir = path.dirname(config.output);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // 创建模拟输出文件
        const outputPath = path.join(outputDir, `chart-${Date.now()}.html`);
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>${config.title}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <h1>${config.title}</h1>
    <canvas id="myChart" width="${config.width}" height="${config.height}"></canvas>
    <script>
        const ctx = document.getElementById('myChart');
        new Chart(ctx, {
            type: '${config.type}',
            data: {
                labels: ['示例 1', '示例 2', '示例 3', '示例 4', '示例 5'],
                datasets: [{
                    label: '${config.y || '数值'}',
                    data: [12, 19, 3, 5, 2],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)',
                        'rgba(54, 162, 235, 0.2)',
                        'rgba(255, 206, 86, 0.2)',
                        'rgba(75, 192, 192, 0.2)',
                        'rgba(153, 102, 255, 0.2)'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: '${config.title}'
                    }
                }
            }
        });
    </script>
</body>
</html>
`;
        fs.writeFileSync(outputPath, html);
        
        console.log(`✅ 图表生成成功！`);
        console.log(`📍 输出文件：${outputPath}`);
        console.log(`📊 文件大小：${(html.length / 1024).toFixed(2)} KB\n`);
        
        // 保存生成记录
        const logPath = path.join(__dirname, '../logs/charts.json');
        const logDir = path.dirname(logPath);
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
        
        let logs = [];
        if (fs.existsSync(logPath)) logs = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
        
        logs.push({
            timestamp: new Date().toISOString(),
            type: config.type,
            title: config.title,
            output: outputPath,
        });
        fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
        
    }, 500);
}

const config = parseArgs();

if (!config.type || !CHART_TYPES[config.type]) {
    console.log('使用方法:\n');
    console.log('  node chart.js --data="./data.csv" --type=bar --x="Month" --y="Sales"');
    console.log('  node chart.js --type=line --title="趋势图" --output="./output.html"');
    console.log('\n支持的图表类型: bar, line, pie, scatter, heatmap, area\n');
    process.exit(0);
}

generateChart(config);
