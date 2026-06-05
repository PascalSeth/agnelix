# Agnelix: Agent Orchestration Setup
**Framework: LangGraph / LangChain**

To build an autonomous engine, you need a state-machine based agent system that can handle loops, errors, and multi-step reasoning.

## 1. Agent Roles & Logic

### A. The Scout Agent
*   **Goal**: Discover raw leads based on "Trigger Events".
*   **Tools**: `GoogleSearchAPI`, `MapsScraper`, `IndeedScraper`.
*   **Logic**: 
    1. Search "Dentists in [City]".
    2. Check GMB reviews for recent negatives.
    3. If found, pass to Profiler.

### B. The Profiler Agent
*   **Goal**: Identify the decision-maker and their contact info.
*   **Tools**: `ApolloAPI`, `LinkedInScraper`, `BuiltWith`.
*   **Logic**:
    1. Get domain from Scout.
    2. Search Apollo for "Owner" or "Office Manager".
    3. Verify email with `ZeroBounce`.

### C. The Closer Agent
*   **Goal**: Create a personalized sequence and schedule sending.
*   **Tools**: `OpenAI-GPT4o`, `SendGridAPI`.
*   **Logic**:
    1. Take Profiler data + Scout signal.
    2. Draft email using the "Reputation Repair" hook.
    3. Push to SendGrid.

## 2. Implementation Steps
1. Initialize a `LangGraph` state.
2. Define `Nodes` for each agent.
3. Define `Edges` (e.g., if Profiler fails to find an email, send back to Scout to find a different practice).
4. Deploy as a background worker using **Inngest** or **Vercel Cron Jobs**.
