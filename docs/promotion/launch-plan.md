# Video2World 持续评测与传播计划

更新日期：2026-10-17。网站以总体榜单、独立模型报告、成绩图和真实案例建立持续评测节奏，争取模型团队的引用、转发和后续合作；credits 指影响力。

正式目标地址为 [Video2World leaderboard](https://aetherlabsai.github.io/Video2World/leaderboard/)。本地改动和报告准备不表示已经部署或授权外发，发布前仍需确认实际公开页面和素材。

## 当前事实表

以下对应 `v2-published-2026-10-17`，共同范围为 222 实例 / 39 任务族；来源、聚合和零分规则见 [本轮快照说明](../RESULT_SNAPSHOT_2026-10-17.md)。V2WScore 从 owner 的正式分数表读取，原始分项按 dashboard 的 family macro 规则计算，不能用展示列简单互算。

| 模型 | V2WScore | Task Success | Stage Progress | Build Rate |
| --- | ---: | ---: | ---: | ---: |
| Claude Opus 5.5 | 52.41 | 33.6% | 0.61 | 92.3% |
| GPT-6.1 Sol | 41.19 | 10.9% | 0.30 | 91.0% |
| Meta Muse Wonder | 27.90 | 2.8% | 0.08 | 86.7% |
| Gemini 4 Argon | Testing | — | — | — |

同一当前快照中的 Claude Opus 5 为 37.91 V2WScore、12.9% task success；Opus 5.5 的 task success 高 20.7 个百分点，约为 2.61 倍，均由未舍入数值计算。Claude Fable 5.1 为 44.13 V2WScore、22.2% task success。

2026-10-09 的截图快照已单独归档，其中的旧成功率、覆盖数和增幅不能继续作为当前宣发数字；论文结果及 human-assisted reference 也独立保留。本次读取已保存的发布记录，不是重新运行整套 runtime 评测。

## 发布节奏与条件

| 内容 | 主要素材 | 条件 |
| --- | --- | --- |
| 各模型独立报告 | 正式总分、分项、覆盖数、成绩图 | 数据及口径核对，真实报告链接和图片可访问 |
| 同输入执行案例 | 源视频、各模型实际 rollout、正式判定 | case / run / evaluator 可追溯，输入哈希一致 |
| 能力诊断与失败分析 | 分项指标、失败或反例、必要过程日志 | 解释不超过证据范围，缺失证据不记成失败 |
| 四旗舰联合 Blog | 四模型报告、共同协议、真实对照素材 | Gemini 补齐，协议和文章复核完成，再单独批准发布 |

当前可准备 Opus、GPT、Muse 的独立报告及案例；Gemini 保持 Coming soon。联合 Blog 仍在准备，不能写成四模型测试已经完成；结果行数补齐也不会自动发布文章。

## 独立结果推文草稿

以下为待审核草稿。外发前确认公开链接、可访问的成绩图及拟标记的模型团队账号和作者身份。

> Can a coding agent watch a video and recreate the interaction in simulation?
>
> In Video2World's current published-record snapshot, Opus 5.5 leads with 52.41 V2WScore and 33.6% task success, compared with Opus 5's 12.9% — about 2.61×.
>
> Inspect the metrics, coverage and actual executions: [PUBLIC_RESULT_URL]

GPT 独立报告草稿：

> GPT-6.1 Sol on Video2World: 41.19 V2WScore, 91.0% build rate and 10.9% task success in the current published-record snapshot.
>
> Executable worlds and completed interactions reveal different parts of the result. Explore the metrics and same-video cases: [PUBLIC_GPT_REPORT_URL]

Muse 独立报告草稿：

> Meta Muse Wonder on Video2World: 27.90 V2WScore, 86.7% build rate and 2.8% task success in the current published-record snapshot.
>
> The report separates executability, physical fidelity and task outcomes with metrics and actual rollouts: [PUBLIC_MUSE_REPORT_URL]

## 案例素材与文案

首页五个源视频各有四个模型位置：Opus、GPT、Muse 有实际 rollout 和正式布尔判定，Gemini 待测；三份已测模型输入与保留的原始视频哈希一致。缺少素材或判定时显示等待证据或等待判定，不填造成功或失败。

这五例沿用早期为展示 Opus 成功 / Fable 失败差异而筛选的集合，不能估计四模型总体胜率、任务族胜率或完整失败分类。总体结论使用完整榜单，单例仅解释对应源视频上的已观测结果。

> Same source video. Different model-built worlds.
>
> On [CASE], [MODEL_A] receives a formal [OUTCOME_A] judgment and [MODEL_B] receives [OUTCOME_B].
>
> Inspect the original input, actual rollouts and recorded metrics: [PUBLIC_CASE_URL]

短视频每条只讲一个可复查差异，标注精确模型名、case ID、正式判定和结果页入口。可为观看剪辑，但保留完整视频，不能暗示不同 rollout 逐帧对齐；反馈利用和修复能力需过程日志，不能只由最终结果推断。

## 诊断文案备选

> Opus 5.5 leads the current Video2World snapshot, but the diagnostics remain mixed.
>
> Fixed-reference task success is 10.8%, compared with Fable 5.1's 13.1%. Build rate, task completion and reference-action behavior deserve separate inspection.
>
> Metrics and coverage: [PUBLIC_RESULT_URL]

正式总分的零分分母规则与原始诊断列的有限值覆盖规则不同，具体见快照说明。没有额外检验时，不使用“统计显著”“所有能力最强”或成本优势表述。

## 每轮更新流程

1. 保存精确模型 ID、run、agent harness、已提供配置、evaluator / contract 版本及共同实例范围。
2. 从正式来源读取总分，按对应 dashboard 规则处理分项，保留每项实例数和任务族数，不把缺失值普遍填零。
3. 更新榜单、News、模型页和分析，未完成者保持 Testing，历史快照与论文结果独立归档。
4. 从同一快照生成成绩图和事实表，清理旧分数及增幅，检查浏览器、视频、分享链接和移动端。
5. 保留案例源输入、实际输出、正式判定、run、evaluator 和哈希，同时寻找反例与失败案例。
6. 发布获批后使用对应公开页面；独立模型报告与联合 Blog 分别审核。
7. 记录官方引用、有效转发、访问和合作线索，区分官方背书与员工个人转发。

子骏负责口径、发现、案例解释、最终文案和模型团队沟通；Yangjing 负责运行、导出、素材和网站更新。每轮复用报告、成绩图、可核查案例与草稿，避免为同一事实维护多份不同数字。
