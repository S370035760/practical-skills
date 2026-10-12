# 本地AI慢，先看哪一段在等：Ollama计时检查

准备换显卡前，先把一次请求的等待分开。这里提供一个**免费、本地、无第三方依赖**的小检查器：读取已有响应JSON，把纳秒换成秒，计算输出token吞吐量，并标出三个已记录阶段中时间最长的一项。

这是LeanEdge公众号《本地AI慢，先别花钱换显卡：用Ollama这5个字段，分清加载慢、读入慢还是生成慢》的原创配套，creative_id `20261012-batch8-ollama`。不是另一篇换皮文章，不是新的收费技能；没有在本轮运行Ollama模型或测试显卡。

## 1. 不装模型，先看懂输出

下载本目录文件，在已有Node.js的终端进入该目录：

```powershell
node timing.cjs sample-responses.json
node --test
```

本机实际验证环境为Node v25.2.1；脚本只用Node内置模块，不需要npm install。尚未验证其他版本。`node --test`目前包含18项检查。

`sample-responses.json`中的两条数据全部是**人工编写的教学输入**，不是任何设备的跑分、客户记录或本机实测。输出如下：

| 记录 | 总时长 | 加载 | 读入 | 生成 | 未归类差额 | 输出token | 输出token/秒 |
|---|---:|---:|---:|---:|---:|---:|---:|
| 教学A | 8秒 | 4秒 | 1秒 | 2秒 | 1秒 | 40 | 20 |
| 教学B | 3.5秒 | 0.1秒 | 1秒 | 2秒 | 0.4秒 | 40 | 20 |

这组数值只说明计算方法：总耗时不同，生成吞吐量也可以相同。**不能据此宣传提升比例，或断言B用了更好的显卡、已缓存、已驻留。**

## 2. 换成自己的响应

如果Ollama服务已在本机运行、已有适用的本地模型，可按[官方generate文档](https://docs.ollama.com/api/generate)准备请求。先运行 `ollama list`，把下面的 `MODEL_NAME` 换成已安装模型名，不要照抄占位符。

```powershell
$body = @{
  model = 'MODEL_NAME'
  prompt = '把交接记录整理成待办：周三核对包装规格，负责人小周，完成后留照片。'
  stream = $false
} | ConvertTo-Json
$r = Invoke-RestMethod -Method Post `
  -Uri 'http://127.0.0.1:11434/api/generate' `
  -ContentType 'application/json; charset=utf-8' `
  -Body ([Text.Encoding]::UTF8.GetBytes($body))
$r | ConvertTo-Json -Depth 10 | node timing.cjs
```

这是供读者运行的示例命令，本轮未向Ollama发送该请求。服务未启动或模型未安装时先处理前置条件，不把连接错误归为性能差。不要切换到云模型或为了跟教程额外购买硬件；本配套不会自动下载模型。

也可把已有完整响应保存为本地 `my-response.json`，执行：

```powershell
node timing.cjs my-response.json
```

`my-response.json`是你的私有输入，**不要提交到仓库或公开Issue**。脚本无网络请求，也不保存文件。报告仅保留计时与计数，不输出原回答、提示词或模型名；你的终端历史、输入文件和重定向输出仍由你自己管理。

## 3. 怎样读报告，而不是乱下结论

- `seconds`：总时长、加载、读入、生成均换算成秒。`unassigned`只是总时长减去三个阶段的差额，**不是已经证实的网络开销**。
- `output_tokens_per_second`：`eval_count / (eval_duration / 1e9)`，只算输出阶段，不是全任务吞吐量，更不是汉字/秒。
- `largest_recorded_phases`：三项记录中最大的阶段；并列全部保留。它是观察线索，不是根因诊断或购买建议，也没有判断“快/慢”的统一阈值。
- `warnings`：生成时长为零时不除零；阶段合计大于总时长时差额给null并报警；`done_reason=length`提醒检查输出是否被长度限制截断。没有警告不代表答案正确完整。

同一模型、同一输入、同一选项做两次记录，再核对答案质量。需要确认模型是否驻留，可用[官方ps接口](https://docs.ollama.com/api/ps)辅助观察；仅凭计时不能证明驻留。一次只改一个条件，不把少答内容当速度改善。

## 4. 哪些输入不会被“糊弄成成功”

只接受 `done:true` 的最终计时对象，必须含五个合法非负安全整数字段：`total_duration`、`load_duration`、`prompt_eval_duration`、`eval_count`、`eval_duration`。缺字段、错误对象、字符串计时、负值或未完成片段都会失败，不补零。

CLI支持单对象或非空对象数组；数组仅逐条分析，不自动计算加速比例。采用[官方非流式方式](https://docs.ollama.com/api/streaming) `stream:false`，或者自行取出含计时字段的最终对象。**不直接支持NDJSON流文件**；多行错误输入不会被悄悄只取最后一行。

它不能读取显存、修驱动、定位硬件故障、监控全部进程、测首token等待或自动优化配置。这里验证的是离线计算和异常边界，不是生产部署、模型性能或平台原创认证。

## 5. 带着可复现的问题来讨论

如果仍找不到等待在哪，先记录操作系统、Ollama版本、能脱敏的计时结果、固定任务和发生条件，再到[本仓库Issue](https://github.com/S370035760/practical-skills/issues)描述；不要贴提示词、客户资料、令牌或完整业务响应。不承诺技术支持时效或已存在的付费服务。

需要的是车间/仓库区域与动线，而不是本地模型性能？请另看[180㎡仓库原始输入与输出](../warehouse-180-return-isolation/README.md)，按该案例的边界申请一次免费概念预览；这两个问题不混成同一商品。

接口依据：官方generate、streaming、ps文档，2026-10-12核对。算法、教学输入、测试与说明为LeanEdge原创，含AI辅助生成内容；新配套文件按本目录MIT许可使用，不改变仓库其他项目和付费商品权益。
