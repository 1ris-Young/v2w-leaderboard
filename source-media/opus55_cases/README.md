# Opus 5.5 Video2World：真实案例视频（5 组）

整理日期：2026-10-14

对比模型：

- 新模型：`claude-opus-5-5`（Claude Code 2.1.290，effort=max）
- 旧模型：`claude-fable-5-1`
- 正式评测：V2 `eval2/4`，rev5 评分树

筛选口径：同一个 benchmark case、同一个真实输入视频，正式评测中 Opus 5.5 的 `task_success=true`，Fable 5.1 的 `task_success=false`。222 个共同 case 中共有 24 个满足条件，本目录从中选了 5 个任务类型较有代表性的案例。

每个案例目录包含：

- `human_assisted.mp4`：真实 human-assisted 原视频（来自交付包 `pkg/source/video.mp4`）
- `opus55_success_sim.mp4`：Opus 5.5 生成方案的 simulator rollout，正式判定成功
- `fable51_failure_sim.mp4`：Fable 5.1 生成方案的 simulator rollout，正式判定失败；额外保留用于 A/B 对照

## 案例

| # | Family / Sample | Opus 5.5 | Fable 5.1 | 主要数值对比 |
|---|---|---:|---:|---|
| 01 | `droid-pick-place/droid_guptalab_2023_05_19_11h_15m_41s_orange_hand` | 成功 | 失败 | terminal error 1.22 cm vs 100.00 cm；scene CD 1.08 cm vs 14.17 cm |
| 02 | `dexycb-lift-bimanual/dexycb_s01_142517` | 成功 | 失败 | hidden replay 成功 vs 失败；scene CD 3.62 cm vs 11.39 cm |
| 03 | `hot3d-pickplace-bimanual/hot3d_002498` | 成功 | 失败 | terminal error 5.05 cm vs 24.31 cm |
| 04 | `bulb-insert/fbraw_2023-01-22-22_45_54_lamp_bulb` | 成功 | 失败 | terminal error 1.41 cm vs 100.00 cm |
| 05 | `leg-insert/fbraw_2023-01-26-00_00_38_desk_leg2` | 成功 | 失败 | terminal error 2.44 cm vs 32.46 cm |

注意：`task_success` 是正式评测的综合任务判定，不等同于只看单一几何指标。完整字段、源 ZIP 路径和文件哈希见 `manifest.json` 与 `SHA256SUMS`。
