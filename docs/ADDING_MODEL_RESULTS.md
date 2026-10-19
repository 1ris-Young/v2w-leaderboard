# 新模型结果录入（Yangjing × 子骏）

当前四个模型的页面已经存在；截至 2026-10-17，Opus 5.5、GPT-6.1 Sol 和 Meta Muse Wonder 已有本轮发布记录，只有 Gemini 4 Argon 保持 Testing。当前 222 实例 / 39 任务族快照、分项聚合及零分规则见 [本轮结果来源说明](RESULT_SNAPSHOT_2026-10-17.md)。

入口分工：已上线的 project page / arXiv 是研究主入口，主站的 leaderboard 连接仍待接入；主站右上浮动 News 入口用于引流到独立 News。每个新测模型有独立 News 报告页，leaderboard 顶部的紧凑逐条 News feed 链接到这些页面。公司 Blog / Jinzhou 的方法说明和技术报告另走编辑流程，不由模型结果数量决定发表。

## 1. 填对应的 receipt

| 模型 | receipt | 模型 ID |
| --- | --- | --- |
| Gemini 4 Argon | `examples/gemini-4-argon-receipt.json` | `gemini-4-argon` |
| Meta Muse Wonder | `examples/meta-muse-receipt.json` | `meta-muse` |
| GPT-6.1 Sol | `examples/gpt-6-1-sol-receipt.json` | `gpt-6-1-sol` |

填写实际结果日期、新闻标题和摘要、12 项 `model.metrics`、每列有效样本数 `model.coverage`，以及精确 API model ID、冻结 run、agent harness、effort、预算、evaluator 版本和 manifest hash；新增 `source` 记录正式导出的来源。模板中的空值不是 0 分。

与子骏确认同一实例 manifest、指标定义、评分版本、宏平均口径、缺失样本与失败构建处理规则后，才把 `compatible_protocol_confirmed` 改为 `true`。指标未齐或协议不同，先保留 Testing；不要填估计分数，也不要把论文旧结果并入新快照。

## 2. 导入结果与成绩图

在仓库根目录运行，以下以 Gemini 为例：

```bash
python scripts/add-model.py --input examples/gemini-4-argon-receipt.json
python scripts/generate-social-card.py --model gemini-4-argon
```

导入器使用主站 `/Video2World/leaderboard/` 地址，自动更新榜单、对应模型页、News 和 Testing 状态。Gemini 完成后按上述流程导入；更正已存在的 GPT 或 Muse 结果时，需要使用经确认的 `--replace`，并同步核对快照来源和已有分析。脚本只改本地文件，不会提交 Git、发推或部署主站。成绩图脚本需要 Pillow 和 DejaVu 字体（现有脚本使用 Linux DejaVu 字体路径）。

## 3. 补模型优劣分析

修改 `site/data/model-analysis.json` 中对应 `models[模型 ID]`，可参考 Opus 5.5：

- `intro`：一句话说明这个模型的主要发现。
- `findings`：每条有 `title`、`body`、`metric_keys` 和可选 `case_ids`；指标值和覆盖数会自动读取，不要把数字复制进多份页面。
- `limitations`：仍然薄弱、失败或证据不足的部分。
- `evidence_priorities`：还缺的案例或日志，材料补齐后及时更新。

按 build、Geometry、Dynamics、Functionality 分析可运行性、几何、动力学、任务成功与阶段进展；每项结论绑定真实指标和对应输出。强模型可以用其真实成功执行与同输入下其他模型的正式失败做对照，说明具体亮点。反馈使用或修复能力需要 agent 迭代日志，不能仅凭最终成功率或一次 rollout 判断。比较相对名次、最高 build 等表述时，同时复核已有 Opus 页的结论是否仍适用于更新后的榜单。

也可在 receipt 增加 `analysis` 对象（结构与上面一致）及 `analysis_verified: true`，导入已复核的解读；未复核时不填这两项，导入器会先显示中性的待分析文字。

## 4. 接入真实案例

视频和封面放入 `site/assets/cases/模型ID/`；按 `examples/model-cases.example.json` 填写导入器创建的 `site/data/模型ID-cases.json`。保留源视频、该模型实际输出、正式 task success / progress、case ID、run 和 evaluator 来源；需要对照时再添加同输入的 baseline。

`findings.case_ids` 要与案例文件中 `cases[].id` 一致，分析卡片就能跳转到对应案例。建议既有亮点也有失败，说明筛选条件；不要把五个定向挑选的成功案例当总体胜率，也不要用论文旧模型视频充当新模型输出。

首页同输入四宫格另由 `site/data/frontier-cases.json` 驱动，对照 GPT-6.1 Sol、Claude Fable 5.1、Meta Muse Wonder 和 Claude Opus 5.5。Fable 使用现有五组真实输出和正式失败判定；五例最初按 Opus 成功 / Fable 失败筛选，不能推断总体胜率。Gemini 不占首页案例位置，但在 News 和四厂商 campaign 中仍保持 Testing / Coming soon。

同一 case 的各模型输出需要相同源视频哈希和独立判定。只有实际 rollout 加明确布尔判定才显示 Success / Failed，待测、缺失素材和缺失判定必须分别保留状态。

## 5. 预览、检查、PR

```bash
python scripts/preview-server.py --port 8765
node scripts/check.mjs
node scripts/check-interactions.mjs
```

桌面和手机都看一下：榜单与弹窗、News 状态、模型页、视频和分享图。检查通过后按 `CONTRIBUTING.md` 开分支和 PR，由另一人审阅后合并。

## 6. 区分公司技术 Blog 与四旗舰比较文章

公司 Blog / Jinzhou 文章用于方法说明和技术报告，按其作者、材料与公司编辑流程推进。它不需要等 Gemini 或四个结果齐全；未获得实际公开链接与发表状态前，不填造地址，也不将其写成已上线。

四旗舰联合比较文章是另一项内容：四模型结果及配置都按兼容协议复核后，再完成比较文章。给 `site/data/news.json` 添加经复核的 `kind: roundup`、`status: published` 条目，填写真实日期和可访问的文章路径，并让 `campaign.roundup_href` 指向同一条路径，最后把 `campaign.publication_status` 改为 `published`。这些字段记录四模型比较文章，不代表公司技术 Blog 的状态。不要用不存在的路径或草稿占位内容充当已发布文章；结果数量凑齐也不会自动发布文章。
