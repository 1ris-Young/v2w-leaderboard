# 新模型结果录入（Yangjing × 子骏）

当前四个模型的页面已经存在；Gemini 4 Argon、Meta Muse、GPT-6.1 Sol 暂为 Testing，实际结果核验后会切换成模型报告。

## 1. 填对应的 receipt

| 模型 | receipt | 模型 ID |
| --- | --- | --- |
| Gemini 4 Argon | `examples/gemini-4-argon-receipt.json` | `gemini-4-argon` |
| Meta Muse | `examples/meta-muse-receipt.json` | `meta-muse` |
| GPT-6.1 Sol | `examples/gpt-6-1-sol-receipt.json` | `gpt-6-1-sol` |

填写实际结果日期、新闻标题和摘要、12 项 `model.metrics`、每列有效样本数 `model.coverage`，以及精确 API model ID、冻结 run、agent harness、effort、预算、evaluator 版本和 manifest hash；新增 `source` 记录正式导出的来源。模板中的空值不是 0 分。

与子骏确认同一实例 manifest、指标定义、评分版本、宏平均口径、缺失样本与失败构建处理规则后，才把 `compatible_protocol_confirmed` 改为 `true`。指标未齐或协议不同，先保留 Testing；不要填估计分数，也不要把论文旧结果并入新快照。

## 2. 导入结果与成绩图

在仓库根目录运行，以下以 Gemini 为例：

```bash
python scripts/add-model.py --input examples/gemini-4-argon-receipt.json
python scripts/generate-social-card.py --model gemini-4-argon
```

导入器使用主站 `/Video2World/leaderboard/` 地址，自动更新榜单、对应模型页、News 和 Testing 状态；其他两模型替换 receipt 路径及模型 ID 即可。脚本只改本地文件，不会提交 Git、发推或部署主站。成绩图脚本需要 Pillow 和 DejaVu 字体（现有脚本使用 Linux DejaVu 字体路径）。

## 3. 补模型优劣分析

修改 `site/data/model-analysis.json` 中对应 `models[模型 ID]`，可参考 Opus 5.5：

- `intro`：一句话说明这个模型的主要发现。
- `findings`：每条有 `title`、`body`、`metric_keys` 和可选 `case_ids`；指标值和覆盖数会自动读取，不要把数字复制进多份页面。
- `limitations`：仍然薄弱、失败或证据不足的部分。
- `evidence_priorities`：还缺的案例或日志，材料补齐后及时更新。

可以分析 build rate、任务成功率、阶段进展、几何和动力学表现；每项结论绑定真实指标和对应输出。反馈使用或修复能力需要 agent 迭代日志，不能仅凭最终成功率或一次 rollout 判断。比较相对名次、最高 build 等表述时，同时复核已有 Opus 页的结论是否仍适用于更新后的榜单。

也可在 receipt 增加 `analysis` 对象（结构与上面一致）及 `analysis_verified: true`，导入已复核的解读；未复核时不填这两项，导入器会先显示中性的待分析文字。

## 4. 接入真实案例

视频和封面放入 `site/assets/cases/模型ID/`；按 `examples/model-cases.example.json` 填写导入器创建的 `site/data/模型ID-cases.json`。保留源视频、该模型实际输出、正式 task success / progress、case ID、run 和 evaluator 来源；需要对照时再添加同输入的 baseline。

`findings.case_ids` 要与案例文件中 `cases[].id` 一致，分析卡片就能跳转到对应案例。建议既有亮点也有失败，说明筛选条件；不要把五个定向挑选的成功案例当总体胜率，也不要用论文旧模型视频充当新模型输出。

## 5. 预览、检查、PR

```bash
python scripts/preview-server.py --port 8765
node scripts/check.mjs
node scripts/check-interactions.mjs
```

桌面和手机都看一下：榜单与弹窗、News 状态、模型页、视频和分享图。检查通过后按 `CONTRIBUTING.md` 开分支和 PR，由另一人审阅后合并。

## 6. 四旗舰联合 Blog

四模型结果及配置都按兼容协议复核后，再由子骏和 Jinzhou 完成联合比较文章。给 `site/data/news.json` 添加经复核的 `kind: roundup`、`status: published` 条目，填写真实日期和可访问的文章路径，并让 `campaign.roundup_href` 指向同一条路径，最后把 `campaign.publication_status` 改为 `published`。不要用不存在的路径或草稿占位内容充当已发布文章；结果数量凑齐不会自动发布 Blog。
