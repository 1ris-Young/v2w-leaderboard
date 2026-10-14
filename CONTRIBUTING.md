# 协作流程

这个仓库是 Video2World leaderboard 网页的唯一正本。所有修改都在这里进行，不再互相发文件。
`main` 分支上的版本始终是可以上线的版本。

## 一次性准备

```bash
git clone https://github.com/1ris-Young/v2w-leaderboard.git
cd v2w-leaderboard
git config user.name  "你的名字"
git config user.email "你的 GitHub 邮箱"
```

需要 Python 3（本地预览）和 Node.js 18 以上（检查脚本）。网页本身没有构建步骤，不用装依赖。

## 内容放在哪里

页面上的结果数字和新闻都从 JSON 读取，更新数据时只改 JSON，页面会自动跟着变。

| 文件 | 内容 |
| --- | --- |
| `site/data/leaderboard.json` | 所有模型的结果、每项指标的覆盖数、测试中的模型 |
| `site/data/news.json` | News 条目（标题、摘要、日期、是否已发布）和四模型对比进度 |
| `site/data/opus-5-5-cases.json` | Opus 5.5 详情页的案例：视频路径、评测结果、每个案例的解读 |
| `site/data/paper-results.json` | 论文发表时的结果（单独一套，不与当前榜单混用） |
| `site/*.html`、`site/updates/*.html` | 页面结构和文字。文字里的数字也是从 `leaderboard.json` 填进去的 |

新模型的结果用导入脚本添加，不手改 `leaderboard.json`：

```bash
python scripts/add-model.py --input examples/gemini-4-argon-receipt.json --site-origin https://aetherlabsai.github.io/Video2World/leaderboard
```

它会同时更新榜单、生成模型详情页、写入 News。receipt 的填法见 `examples/`。

## 每次修改的流程

标 **【手动】** 的步骤由我们自己做，标 **【自动】** 的由 GitHub 完成。

**1.【手动】从最新的 main 开一个分支**

```bash
git switch main
git pull
git switch -c yangjing/fix-opus-copy        # 分支名：自己的名字/改了什么
```

**2.【手动】修改，并在本地预览**

```bash
python scripts/preview-server.py --port 8765
```

浏览器打开 `http://localhost:8765/`（远程服务器上要先把 8765 端口转发到本地）。
保存后刷新浏览器即可看到变化。桌面和手机宽度都看一下。

**3.【手动】本地跑两个检查**

```bash
node scripts/check.mjs
node scripts/check-interactions.mjs
```

两个都显示 `PASS` 再提交。

**4.【手动】提交并推送分支**

```bash
git add -A
git commit -m "Opus 5.5 page: tighten case readings"
git push -u origin yangjing/fix-opus-copy
```

**5.【手动】开 Pull Request**

在 GitHub 仓库页面点 “Compare & pull request”，或者运行 `gh pr create --fill`。
描述框里已经预填了模板：写清楚改了什么、请对方重点看哪里。

**6.【自动】GitHub 跑检查**

开 PR 后以及之后每次往这个分支推送，GitHub 都会自动运行上面两个检查，
结果显示在 PR 页面上：绿色 ✓ 表示通过，红色 ✗ 点进去能看到哪一项失败。

**7.【手动】对方查看并合并**

对方在 PR 页面看改动（需要的话拉下分支本地预览），确认没问题、检查是绿色 ✓ 之后，
选 **Squash and merge** 合并（一个 PR 在 main 上只留一条记录），然后删除分支。

**8.【自动】main 上再跑一次检查**

合并后 GitHub 会在 main 上再跑一次检查，确认合并后的版本没有问题。

**9.【手动】两个人都更新本地**

```bash
git switch main
git pull
```

## 避免冲突

- **一个 PR 只做一件事**，越小越好，越早合并越好。分支开太久最容易冲突。
- **开始修改前先 `git pull`**，改 JSON 之前尤其要。
- **新模型结果用导入脚本**，不手改 JSON。
- **真遇到冲突**：GitHub 的 PR 页面会提示。JSON 冲突不要整份选“保留我的”，
  要逐条对照两边的改动合在一起；拿不准就在 PR 里叫对方一起看。
