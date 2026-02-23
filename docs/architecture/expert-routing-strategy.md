# Expert Routing Strategy

## Overview

This document defines the strategy for routing triage requests to specialized expert agents within the CoPilot Care architecture. The goal is to maximize clinical accuracy and safety while optimizing for latency and cost by leveraging the specific strengths of different Large Language Models (LLMs).

## Role Definitions

Each expert role is bound to a specific LLM provider chosen for its strengths relevant to that domain.

### Cardiology Specialist
- **Focus:** Cardiovascular risks, heart rhythm analysis, and acute cardiac event detection.
- **Provider:** **DeepSeek**
- **Rationale:** Selected for its strong reasoning capabilities and performance in complex medical decision-making scenarios, particularly for high-stakes cardiovascular assessments.

### General Practice (GP)
- **Focus:** Broad symptom analysis, common conditions, and initial triage of undifferentiated complaints.
- **Provider:** **Gemini**
- **Rationale:** Selected for its balanced performance and general knowledge base, suitable for handling a wide variety of common presentations.

### Metabolic Specialist
- **Focus:** Chronic disease management (diabetes, hypertension, thyroid), lifestyle factors, and longitudinal care.
- **Provider:** **Gemini**
- **Rationale:** Selected for its large context window, allowing it to process extensive patient history and longitudinal data effectively.

### Safety Reviewer
- **Focus:** Risk auditing, red-flag detection, and compliance with safety guardrails.
- **Provider:** **Kimi**
- **Rationale:** Selected for its conservative safety alignment and ability to strictly adhere to guardrails, serving as a reliable final check against unsafe outputs.

## Routing Logic

The routing system determines the appropriate set of experts and the collaboration mode based on the input request.

### 1. Department Triage & Red-Flag Check
The system first analyzes the patient profile and symptom text to:
- Identify the primary clinical domain (Cardiology, Metabolic, or General Practice).
- Check for immediate "Red Flags" (critical symptoms requiring emergency care).
- **Rule:** If a Red Flag is detected, the system short-circuits to an **Escalation** path, bypassing standard debate to ensure immediate safety.

### 2. Complexity Assessment
If no immediate Red Flag is found, a `ComplexityScore` is computed based on factors like:
- Number of symptoms
- Ambiguity of presentation
- Vital sign abnormalities
- Patient risk factors (age, history)

### 3. Collaboration Mode Routing
Based on the `ComplexityScore`, the request is routed to one of three modes:

- **Fast Consensus (Score 0-2):**
  - **Agents:** Primary Specialist + Safety Reviewer.
  - **Process:** Parallel generation. If agreement is high, result is returned.

- **Light Debate (Score 3-5):**
  - **Agents:** Primary Specialist + GP + Safety Reviewer.
  - **Process:** One round of critique and refinement if initial opinions diverge (Dissent Index 0.2 - 0.4).

- **Deep Debate (Score ≥6):**
  - **Agents:** Full Panel (Cardiology + Metabolic + GP + Safety).
  - **Process:** Multi-turn debate (up to 3 rounds) moderated by the Debate Engine until consensus (Dissent Index < 0.2) or conservative escalation (Dissent Index ≥ 0.7).

*Note: Missing Minimum Information Set (MIS) forces at least "Light Debate" mode.*

## KPIs

Key Performance Indicators to measure the effectiveness of this strategy:

- **Accuracy:** Agreement rate with ground truth labels in A-F reference scenarios.
- **Safety:** Recall rate for Red-Flag detection (Target: 100%).
- **Latency:** End-to-end response time per expert and total session duration (Target: <12s for risk path).
- **Cost:** Token usage per expert and total cost per triage session.
