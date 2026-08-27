# /train-galien

Orchestrate Galien's AI training system: teach lessons, run simulations, correct AI responses, and track learning across playbooks.

## Usage

```
/train-galien teach <workspace> <scenario>
  Create a new training lesson: describe a situation, AI responds, you correct it.

/train-galien simulate <workspace> <surface>
  Run a single sparring turn: AI vs AI role-play to stress-test responses.

/train-galien correct <workspace> <surface> <aiResponse>
  Extract generalizable lessons from AI mistakes. Builds training rules.

/train-galien ingest <workspace> <filePath>
  Bulk-import lessons from PDF, TXT, or Markdown documents.

/train-galien list <workspace> [surface]
  Show active training rules, lesson count, and effectiveness metrics.

/train-galien spar <workspace> [turns]
  Extended AI vs AI sparring match (prospect role-play with objections).

/train-galien retry <ruleId>
  Re-test a trained rule against the original scenario to verify improvement.
```

## Examples

### Teach a new lesson
```
/train-galien teach sales_os "Lead asks budget but has no buying power"
→ AI generates a response
→ You review and provide correction
→ System extracts the lesson (when to ask qualifying questions)
```

### Simulate a tough scenario
```
/train-galien simulate sales_os REPLY
→ AI replies to a budget objection from a role-played prospect
→ Shows response text + confidence + any policy flags
```

### Ingest playbook knowledge
```
/train-galien ingest sales_os ~/playbook-sales.pdf
→ Extracts 3-8 key lessons from document
→ Creates training rules scoped to Sales OS workspace
→ All rules start as LOW priority (manual review needed)
```

### Sparring match (stress test)
```
/train-galien spar sales_os 5
→ 5 turns of AI vs AI (Agency Closer vs. Prospect)
→ Prospect starts friendly, escalates objections
→ Shows objection handling patterns + weaknesses
```

## Features

**Workspace-aware**: Training rules scoped to playbook type (Sales OS, SEO OS, Social OS, etc.)
- Each workspace has specialized training for its use case
- Lessons learned in one workspace don't pollute others

**Multi-surface training**: Train EMAIL, REPLY, PROPOSAL, or ADVISOR separately
- Email opener training ≠ objection handling training
- Focus on the specific voice needed for each surface

**Sparring simulator**: AI role-plays both sides
- Prospect starts with buying intent, escalates objections
- [CONTINUE] / [BOOKED] / [LOST] outcome tags
- Teaches objection handling in real-time scenarios

**Lesson distillation**: Convert corrections → generalizable rules
- You say: "This response was too pushy. Soften the CTA."
- System extracts: "After yes → no hard sell for 24h"
- Creates reusable training rule

**Document ingestion**: Learn from your playbooks
- Upload agency docs, case studies, best practices
- Automatically distill into training lessons
- Max 24KB per document

**Effectiveness tracking**:
```
Sales OS rules:
  ✓ Objection Handling (3 lessons) - 87% effectiveness
  ✓ Budget Qualification (2 lessons) - 92% effectiveness
  ⚠ Meeting Scheduling (1 lesson) - 68% effectiveness
```

## Workflow: Teach → Simulate → Correct → Retry

**Step 1: Teach a Lesson**
```
/train-galien teach sales_os "Prospect says 'too expensive'"
→ System generates a response using current training
→ You mark parts as good/bad
→ Lesson extracted
```

**Step 2: Simulate to stress-test**
```
/train-galien simulate sales_os REPLY
→ Same scenario, fresh AI attempt
→ Does it pass? If not, mark for Step 3
```

**Step 3: Correct the AI**
```
/train-galien correct sales_os REPLY "Your response was too conciliatory. Use ROI framing."
→ Rule created: "Price objection → lead with ROI before negotiating"
```

**Step 4: Retry & verify**
```
/train-galien retry <ruleId>
→ Same scenario as Step 1, new rule active
→ Compare before/after: "87% → 92% quality score"
```

## Advanced: Sparring Matches

Stress-test your training with multi-turn conversations:

```
/train-galien spar sales_os 3

Turn 1: Prospect → "We need to see 3 case studies first"
Turn 2: Agency   → [Your training in action]
Turn 3: Prospect → [Role-plays objection escalation]
```

Sparring will surface weaknesses:
- Prospect keeps asking budget but your response is vague
- Post-yes CTA is too aggressive
- Missing key credibility signals

## Metrics & Reporting

Each training rule tracks:
- **Effectiveness**: % of test scenarios where rule improves response
- **Source**: Manual / Session Teaching / Document Ingestion
- **Scope**: Workspace + Surface (e.g., "Sales OS → EMAIL")
- **Enabled**: Toggle rules on/off to A/B test
- **Last tested**: When rule was last verified

```
/train-galien list sales_os REPLY

Active Rules (REPLY surface):
  1. Objection Handling (87% ✓)
     Source: Manual (2 lessons from sparring)
     Last tested: 2 min ago

  2. Budget Qualification (92% ✓)
     Source: Document (from playbook-sales.pdf)
     Last tested: 1 hour ago

  3. Meeting Scheduling (68% ⚠)
     Source: Session Teaching (low priority)
     Last tested: 12 hours ago
     Action: Run /train-galien spar to improve
```

## Integration with Playbook System

Training rules are **workspace-scoped**, so:
- Sales OS learns how Closers talk (direct, urgent, ROI)
- Social OS learns how Creative Directors talk (creative, trendy, brand-aware)
- SEO OS learns how Analysts talk (data, metrics, long-term)

When the agent responds, it merges:
1. Workspace persona (from playbook)
2. Active training rules (from teaching)
3. User persona overrides (from AgentGoal.personaConfig)

## Notes

- Rules are **live directives**, not fine-tuning. Changes take effect immediately.
- Training is **opt-in per workspace**. You choose what to teach.
- Sparring uses **flash temp 0.9** (creative) for prospect role-play.
- Agency always uses **production stack**: persona + lessons + workspace objection handlers.
- Max 50 rules per workspace (excess hidden). Consolidate low-effectiveness rules.
