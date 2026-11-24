# Evo Studio v0.1.0-preview.1

## 中文｜核验与交付报告

Evo Studio 是一套运行在本机的多岗位协作命令行工具。它把派单、依赖校验、执行器交接、独立角色复核、岗位工作流规则提案、个人成长整理和对外展示审批统一记在同一个本地 SQLite 事件账本里。

### 核心机制

1. **事务型事件账本与产物存证（`packages/kernel.ts`、`packages/control.ts`）**：所有工单、状态变更、依赖关系和单值写入范围（`scope`）在 SQLite 事务内校验版本号后落盘；产物字节按 SHA-256 摘要落库，复核时可取回提交原件，验收记录同时保存产物摘要和提交版本，退回修改时清除旧摘要。
2. **执行器接入与最小上下文（`apps/worker.ts`、`packages/control.ts`、`packages/surfaces.ts`）**：外部程序通过标准输入接收当前工单、工作规则、工单历史和已验收依赖，通过标准输出交回产物。执行器只接收工单相关事件，即使工单名与角色名相同也不会夹带该角色的私人成长记录。
3. **受控流程演进与成长整理（`packages/growth.ts`、`packages/review.ts`、`apps/consolidate.ts`）**：角色只能基于历史返工或退单提出单条规则提案，采用前核对基线版本、规则摘要、独立复核标签与回归检查结果，并支持回滚；已生效的同文规则在提议时拦截，不计入待审。整理任务会直接将近七日的私人笔记、完成与退回记录汇总写入周记（`week.md`）；只有经人工确认晋升（`promote-memory`）的条目才会写入本地 Markdown 知识页。
4. **静音看板与授权展示出口（`packages/surfaces.ts`、`apps/panel.ts`、`packages/intake.ts`、`packages/outbox.ts`）**：本机回环网页看板只展示工单编号、依赖、状态和待审数量，不暴露私人反思、工单标题或交接正文。对外展示需先基于已验收工单起草、过滤常见敏感格式并按具体用途确认摘要后再导出或写入本地发件箱。

### 核验结果

本预览版已完成静态类型检查（记录至修订 05）、修订 03 的全包独立静态审校及后续 04、05 增量复核，运行时测试按当前要求暂缓。

| 检查项 | 当前状态 | 说明 |
| --- | --- | --- |
| TypeScript 静态检查（`npm run check`） | 通过（记录至修订 05） | 在 Node 24.22.3、TypeScript 5.9.3 下通过 `tsc --noEmit`；修订 06–08 仅改 Markdown 文档，未触碰 `.ts` 源码，未重新执行 |
| 独立静态审校（修订 03 全包 + 04、05 增量复核） | 通过（单机预览无阻断） | 核对 37 个源码与文档文件，已确认关闭所有已发现阻断项 |
| 端到端脚本（`scripts/workflow-e2e.ts`） | 已编写，暂缓运行 | 覆盖依赖阻塞、SVG 执行器交接、独立复核凭据、展示审批、同名工单隐私隔离与看板脱敏 |
| 真实岗位联调 / 并发 / 崩溃恢复 | 未验证 | 尚待恢复测试后实跑 |

#### 静态审校与修订关闭记录

| 修订 | 发现问题 | 处理结果 |
| --- | --- | --- |
| 01 → 02 | 初查发现工单与角色同名时，执行器历史可能夹带私人成长记录 | `apps/worker.ts` 改为仅传工单事件，并在 `scripts/workflow-e2e.ts` 补同名工单回归断言 |
| 02 → 03 | 初查发现本机网页看板暴露私人内容及工单自由文本（私人反思、提案正文、工单标题与交接说明） | `packages/surfaces.ts` 移除私人内容及工单自由文本，仅展示工单编号、依赖、状态和待审数量 |
| 03 → 04 | 修订 03 全包独立静审指出返工可能残留旧产物摘要、验收缺少摘要和提交版本、架构页含工具控件、README 命令缺前缀 | 补全验收凭据与返工清理逻辑，重导静态 `docs/architecture.html`，补齐 README 命令与私有目录示例 |
| 04 → 05 | 修订 04 增量复核指出已生效规则再次原样提议仍会入账并计入待审 | `packages/growth.ts` 在入账前拦重，`packages/surfaces.ts` 待审计数统一通过 `canAdoptRule` 过滤 |

### 适用范围与边界

本版本为**单机、单所有者、可信执行器、全新私有数据目录**前提下的开发预览版，公开仓仅含通用内核、合成角色与示例脚本。以下能力尚未验证，不作承诺：多用户隔离、不可信执行器沙箱、高并发与异常断电恢复、真实大模型接入、多日成长整理以及第三方平台自动发布。

---

## English | Verification and Delivery Report

Evo Studio is a local command-line tool for coordinating multi-role agent work. It stores tickets, dependency checks, worker handoffs, independent role reviews, workflow rule proposals, personal growth consolidation, and export approvals in one local SQLite event ledger.

### How it works

1. **Transactional ledger and artifact verification (`packages/kernel.ts`, `packages/control.ts`)**: Tickets, state transitions, dependencies, and single-value write scope (`scope`) are validated against revisions inside SQLite transactions. Artifacts are stored by SHA-256 digest. Reviews can inspect the exact submitted bytes, acceptance records bind the artifact digest and submission version, and rework clears stale artifact digests.
2. **Worker adapter and scoped history (`apps/worker.ts`, `packages/control.ts`, `packages/surfaces.ts`)**: External programs read one JSON payload from stdin containing the ticket, active work rules, ticket history, and accepted dependencies, and write artifact bytes to stdout. Only ticket events are forwarded, so a ticket sharing a role name never leaks that role's private growth notes.
3. **Gated workflow evolution and growth consolidation (`packages/growth.ts`, `packages/review.ts`, `apps/consolidate.ts`)**: Roles propose one incremental rule from a handback or review return. Adoption checks the active base revision, exact UTF-8 rule digest, independent reviewer label, and regression observations, with rollback support. Proposals matching an already active rule are rejected before recording and excluded from pending counts. Consolidation writes recent private notes, completed tickets, and returns directly into a seven-day journal (`week.md`); only entries explicitly promoted via `promote-memory` are written to local Markdown knowledge pages.
4. **Quiet attention desk and approved exports (`packages/surfaces.ts`, `apps/panel.ts`, `packages/intake.ts`, `packages/outbox.ts`)**: The loopback web panel displays only ticket identifiers, dependencies, states, and pending review counts without private notes, ticket titles, or handoff text. External text requires a draft from an accepted ticket, common sensitive-pattern screening, and destination-bound hash approval before export or local outbox delivery.

### Verification status

Static type checking (recorded through rev 05), a full-package independent static review of rev 03, and incremental follow-up reviews for rev 04 and rev 05 are complete for this preview. Runtime execution remains deferred by owner request.

| Check | Status | Notes |
| --- | --- | --- |
| TypeScript static check (`npm run check`) | Passed (recorded through rev 05) | `tsc --noEmit` passed on Node 24.22.3 with TypeScript 5.9.3; rev 06–08 only changed Markdown docs without touching `.ts` files, and `npm run check` was not re-run |
| Independent static review (rev 03 full + rev 04, 05 incremental) | Passed (no preview blockers) | Reviewed across all 37 source and doc files; all reported blockers closed |
| End-to-end script (`scripts/workflow-e2e.ts`) | Written, execution deferred | Covers dependency gating, SVG worker handoff, acceptance receipt, export approval, same-name ticket privacy, and panel redaction |
| Real role integration / concurrency / crash recovery | Not verified | Pending runtime verification once testing resumes |

#### Static review and revision closure summary

| Revision | Finding | Resolution |
| --- | --- | --- |
| 01 → 02 | Initial check found that a ticket sharing a role name could pass private growth notes in worker history | Scoped `apps/worker.ts` to ticket events only and added a regression assertion in `scripts/workflow-e2e.ts` |
| 02 → 03 | Initial check found that the loopback web panel exposed private content and ticket free-text (private reflections, proposal text, ticket titles, and handoff notes) | Updated `packages/surfaces.ts` to remove private content and ticket free-text, restricting the panel to ticket IDs, dependencies, states, and pending counts |
| 03 → 04 | Full independent static review of rev 03 flagged stale artifact hash after rework, missing digest/version on `done`, leftover UI controls in `docs/architecture.html`, and incomplete CLI prefixes in `README.md` | Cleared stale hash on rework, recorded digest and submission version on acceptance, cleaned static architecture page, and completed README commands |
| 04 → 05 | Incremental follow-up on rev 04 flagged that re-proposing an already active rule was still recorded and counted as pending | Blocked duplicate active proposals in `packages/growth.ts` and aligned pending counts via `canAdoptRule` in `packages/surfaces.ts` |

### Scope and limits

This preview targets a **single computer, single owner, trusted local workers, and a fresh private state directory**. The repository contains only generic core code, synthetic roles, and demo fixtures. Multi-user isolation, untrusted worker sandboxing, concurrent workloads, abrupt crash recovery, real model providers, multi-day growth runs, and third-party remote publishing are not verified and are outside this preview's guarantees.

---

## 复现命令 / Reproduction commands

在仓库根目录运行（需 Node 24.12+）。Run from the repository root (requires Node 24.12+).

```sh
npm ci
npm run check
npm test
node apps/cli.ts --help
```

按 `README.md` 在全新临时目录体验完整四岗交接。Follow `README.md` in a fresh temporary directory to try the four-role handoff:

```sh
export EVO_HOME="$(mktemp -d)"
node apps/cli.ts ticket opener motion film "Render a title card"
node apps/cli.ts ticket catalog curator library "Catalog the approved title" opener
node apps/worker.ts opener node profiles/demo/render.ts
node apps/cli.ts attention
```
