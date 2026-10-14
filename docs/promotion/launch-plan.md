这轮先用 Opus 5.5 的结果建立 Video2World 持续评测的传播节奏。主网站承接完整榜单和案例，每个新模型有独立结果页；宣传以明确增幅和可检查的执行证据为核心，争取模型团队的引用、转发和后续评测合作。

首版网站：https://video2world-observatory.zijnzhang.chatgpt.site

该版本供预览和整合进主站。正式推文中的链接应替换为主站公开结果页。

# Opus 5.5 可引用结论

以下数值来自 2026 年 10 月 9 日提供的同一结果快照。

| 模型 | V2WScore | Task Success | Stage Progress |
| --- | ---: | ---: | ---: |
| Claude Opus 5.5 | 52.41 | 29.4% | 0.57 |
| Claude Fable 5.1 | 44.13 | 20.2% | 0.45 |
| GPT-6 Astra | 38.27 | 6.5% | 0.29 |
| Claude Opus 5 | 37.91 | 11.5% | 0.34 |

主结论：Opus 5.5 在当前已测配置中领先。相比 Opus 5，Task Success 增加 17.9 个百分点，约为 2.56 倍；相比 Fable 5.1，增加 9.2 个百分点。

快照中的 Task Success 标记 n=200/222，其他指标覆盖率不同。公开发布前确认这些 n 的含义、宏平均口径和 evaluator 版本；完整评测、缺失记录及失败构建应按同一协议处理。暂不使用“统计显著”“所有物理能力均最强”等表述。

# 三轮发布内容

| 顺序 | 内容 | 主要素材 | 发布条件 |
| --- | --- | --- | --- |
| 第一轮 | 新结果和能力提升 | 1200 × 630 成绩分享图，独立结果页 | 数值和口径确认，公开链接可访问 |
| 第二轮 | 新模型完成旧模型失败的任务 | 源视频、旧模型、Opus 5.5 三栏执行视频，15 至 25 秒 | 拿到同一实例的真实 Opus 5.5 输出与判定 |
| 第三轮 | 一个仍然失败的物理交互或诊断差异 | 执行视频，事件判定，少量解释性字幕 | 判定经过复核，解释不超过证据范围 |

默认从成绩图开始。真实 Opus 5.5 视频就绪后再发案例，形成连续内容。每条内容链接回对应结果或案例，不把旧模型视频当成新模型输出。

# 第一条推文

建议使用下面的成绩发布版，配首版成绩图。发布前替换公开结果链接；与发布相关的官方账号和模型作者需核对后再标记。

> Can a coding agent watch a video and build a world that works?
>
> Opus 5.5 now leads Video2World: 29.4% task success, up from Opus 5’s 11.5% — 2.56×.
>
> It writes the scene, physics and robot behavior. We run the result.
>
> [PUBLIC_RESULT_URL]

更偏能力问题的备选版：

> Can a coding agent turn a video into a working physical world?
>
> On our new Video2World snapshot, Opus 5.5 reaches 29.4% task success, up from Opus 5's 11.5%.
>
> Inspect the result, the protocol and the remaining gaps: [PUBLIC_RESULT_URL]

# 案例推文模板

真实素材接入后使用以下模板。方括号字段均来自实际案例，不预先填写任务名或成功判定。

> Same video. Same task. Different outcome.
>
> On [TASK], [BASELINE] stops at [FAILED_STAGE]. Opus 5.5 completes [VERIFIED_EVENT].
>
> Original video and both physical executions below.
> Case and full results: [PUBLIC_CASE_URL]

15 至 25 秒视频建议：前 2 秒显示任务；随后固定三栏“Source / Baseline / Opus 5.5”；关键事件处加一条字幕；最后 2 秒显示结果、Video2World 标识和案例链接。单条视频只讲一个差异。不同执行时长可为观看做剪辑，但保留完整执行入口，避免暗示逐帧对应。

三个首选素材分别是：旧模型失败而新模型成功的案例；能直接看见接触、插入或操作顺序的困难案例；一个 Opus 5.5 仍然失败的案例。必须保留实例 ID、模型 ID、run 标签、冻结产物、evaluator 版本、任务判定、stage progress 和来源。

# 诊断推文备选

> Opus 5.5 leads our Video2World snapshot, but the diagnostics tell a richer story.
>
> Fixed-ref Task: 8.6%, versus Fable 5.1's 11.4%.
>
> End-to-end success and world reliability deserve separate inspection.
> Results: [PUBLIC_RESULT_URL]

这条使用原表诊断名。进一步解释场景与动作的原因之前，确认 Fixed-ref 的具体执行定义，并检查共同样本。避免仅凭总分或某一列推断因果。

# 每个新模型的更新流程

1. 固定实例集合、评测版本和比较口径，记录模型 ID、agent harness、effort 和预算。

2. 导出全指标及每列有效样本数，区分方法失败和 evaluator 错误。

3. 更新网站数据文件，新增独立结果页；未完成的模型保留 Testing 状态，不填估计分数。

4. 使用同一数据生成成绩图和推文事实表。

5. 选择三个可复查的案例，保留原输入、基线、完整执行与判定。

6. 先发布结果，后发布案例及失败分析；由同一网页承接。

7. 记录模型团队的有效转发、官方引用、项目访问和主动合作。官方账号背书与员工个人转发分别记录。

GPT-6.1 目前只展示正在测试。结果未确认前不做排名预测。

# 两位负责人的分工

子骏负责评测口径、发现、案例解释、最终文案和模型团队沟通。Yangjing 负责运行、导出、素材整理、网站数据与页面更新。根据双方擅长可以调整。

每轮复用的成果是一个结果页、一张成绩图、三个候选案例及三轮文案。第一轮完成后，以一次新模型更新所需人工时间作为流程是否轻量的指标。

资料来源：[Video2World 论文](https://arxiv.org/abs/2610.04432)、[项目主站](https://aetherlabsai.github.io/Video2World/)，以及本轮提供的榜单截图和 Real2Sim benchmark 测试记录。公开图库当前是论文已有模型的案例；新版 Opus 5.5 录像仍需从评测运行中导出。
