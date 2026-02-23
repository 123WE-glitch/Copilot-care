# CoPilot Care Monorepo

CoPilot Care 是一个基于 TypeScript 的社区医疗分诊辅助原型，采用 Monorepo 管理后端、前端与共享契约，强调架构边界、流程可解释性与安全审校。

## 项目结构

```text
src/
|- backend/         # Express + orchestration runtime
|- frontend/        # Vue 3 client
|- shared/          # Shared contracts/types
|- domain/          # Domain contracts (incremental migration target)
|- application/     # Use case contracts (incremental migration target)
|- infrastructure/  # Adapters (incremental migration target)
`- interfaces/      # Interface layer (incremental migration target)
```

## 快速开始

```bash
npm install
# bash: cp .env.example .env
# powershell: Copy-Item .env.example .env
# 填入你自己的 API Key
npm run devwf:arch
```

前端默认请求后端 `http://localhost:3001`，可通过 `VITE_API_BASE_URL` 覆盖。

## 常用命令

```bash
# 全仓
npm test
npm run build
npm run typecheck

# 质量门禁
npm run gate:all
npm run gate:metrics
npm run security:secrets
```

## 自动化工作流（TODO + 里程碑）

基础状态命令：

```bash
npm run todos:doctor
npm run todos:init
npm run todos:status
npm run todos:next
```

工作流清单切换：

```bash
# 竞赛工作流 v6
npm run competition:use

# 增强工作流 v7（当前使用）
npm run enhance:use
```

增强工作流（v7）阶段命令：

```bash
npm run enhance:status
npm run enhance:next
npm run enhance:week1
npm run enhance:week2
npm run enhance:week3
npm run enhance:week4
```

相关文件：

- `docs/process/todos-workflow.v5_00.json`
- `docs/process/todos-workflow.v6_00.json`
- `docs/process/todos-workflow.v7_00.json`
- `reports/todos/workflow-state.json`

## 本地运行（前后端）

```bash
# terminal A
npm run build --workspace=@copilot-care/backend
npm run start --workspace=@copilot-care/backend

# terminal B
npm run dev --workspace=@copilot-care/frontend
```

## 可选外部 LLM Provider

后端支持按角色选择外部模型（未配置时自动回退到内置启发式 Agent）：

```bash
# 全局 provider
# none | auto | deepseek | gemini | kimi | deepseek_gemini | openai | anthropic
COPILOT_CARE_LLM_PROVIDER=auto
COPILOT_CARE_LLM_TIMEOUT_MS=20000
COPILOT_CARE_LLM_MAX_RETRIES=1
COPILOT_CARE_LLM_RETRY_DELAY_MS=300

# 角色 provider（推荐）
COPILOT_CARE_CARDIO_PROVIDER=deepseek
COPILOT_CARE_GP_PROVIDER=gemini
COPILOT_CARE_METABOLIC_PROVIDER=gemini
COPILOT_CARE_SAFETY_PROVIDER=kimi

# provider keys
DEEPSEEK_API_KEY=...
GEMINI_API_KEY=...
KIMI_API_KEY=...
# OPENAI_API_KEY=...
# ANTHROPIC_API_KEY=...
```

可选 base URL：

- `OPENAI_BASE_URL`（默认 `https://api.openai.com/v1`）
- `ANTHROPIC_BASE_URL`（默认 `https://api.anthropic.com/v1`）
- `GEMINI_BASE_URL`（默认 `https://generativelanguage.googleapis.com/v1beta`）
- `DEEPSEEK_BASE_URL`（默认 `https://api.deepseek.com/v1`）
- `KIMI_BASE_URL`（默认 `https://api.moonshot.cn/v1`）

## 架构与可观测接口

后端提供专家路由快照接口：

```bash
GET /architecture/experts
```

返回包含每个专家的 provider、来源（`env|default|invalid_fallback`）以及 `llmEnabled` 状态，前端可据此展示专家绑定情况。

## 比赛演示建议

演示前建议执行：

```bash
npm run check:copy --workspace=@copilot-care/frontend
npm run test --workspace=@copilot-care/frontend
npm run typecheck --workspace=@copilot-care/frontend
npm run build --workspace=@copilot-care/frontend
npm run perf:check --workspace=@copilot-care/frontend
npm run security:secrets
```

重点回归点：

- 问诊提交流程和输入校验是否稳定；
- 报告导出 PDF/TXT 回退是否正常；
- 中文文本是否出现乱码；
- 红旗场景是否明确进入线下上转路径。

## 文档索引

- `AGENTS.md`
- `CONTRIBUTING.md`
- `docs/process/development-workflow.md`
- `docs/process/opencode-operation-guide.md`
- `docs/process/todos-workflow.md`
