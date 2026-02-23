# Expert Routing Strategy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Define the expert-role provider routing strategy (cardio/gp/metabolic/safety) with measurable quality KPIs.

**Architecture:** Create an ADR to formalize the decision and a detailed architecture document describing the strategy.

**Tech Stack:** Markdown documentation.

---

### Task 1: Create ADR for Expert Routing Strategy

**Files:**
- Create: `docs/adr/0004-expert-routing-strategy.md`

**Step 1: Draft the ADR content**

Create the file with the following content structure:
- **Title:** 0004-expert-routing-strategy
- **Context:** The current system uses a basic routing mechanism. We need to specialize routing for different expert roles (Cardiology, GP, Metabolic, Safety) to improve accuracy and safety.
- **Decision:** Implement a role-based routing strategy using specific LLM providers for each role (e.g., DeepSeek for Cardio, Gemini for GP/Metabolic, Kimi for Safety). Define KPIs for each role.
- **Consequences:** Improved specialization, potential increased complexity in provider management.

**Step 2: Verify ADR creation**

Check if the file exists and has the correct format.

### Task 2: Create Detailed Strategy Document

**Files:**
- Create: `docs/architecture/expert-routing-strategy.md`

**Step 1: Draft the strategy document**

Create the file with the following sections:
- **Overview:** Purpose of the strategy.
- **Role Definitions:**
    - **Cardiology:** Focus on cardiovascular risks. Provider: DeepSeek (reasoning strength).
    - **General Practice (GP):** Broad symptom analysis. Provider: Gemini (balanced).
    - **Metabolic:** Chronic disease management. Provider: Gemini (context window).
    - **Safety:** Risk auditing. Provider: Kimi (safety guardrails).
- **Routing Logic:** How requests are routed to these experts based on input analysis.
- **KPIs:**
    - **Accuracy:** Agreement with ground truth (A-F scenarios).
    - **Safety:** Red-flag detection rate.
    - **Latency:** Response time per expert.
    - **Cost:** Token usage per expert.

**Step 2: Verify document creation**

Check if the file exists.

### Task 3: Verify Workflow Gate

**Files:**
- None (running command)

**Step 1: Run workflow gate**

Run: `npm run gate:workflow`
Expected: PASS (ensures ADR and docs are present and valid)
