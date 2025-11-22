# Two Dialog Flows System - User Guide

## Overview
The Mock Trial Simulator now uses **two separate OpenJustice Dialog Flows** for better separation of concerns:

1. **Fact-Gathering Flow** - Collects case information through chat
2. **Trial Flow** - Powers the voice trial with debate/argumentation

## Why Two Flows?

### Problem with Single Flow:
- Single flow tries to do both fact gathering AND argumentation
- After fact gathering completes, execution is "done"
- Can't continue with same execution for trial phase
- Flow runs all nodes (facts → reasoning → outcome) even when just chatting

### Solution with Two Flows:
- **Flow 1** (Facts): Only collects information, ends cleanly
- **Flow 2** (Trial): Starts fresh with debate logic, has access to all facts
- Each flow is optimized for its specific purpose
- Conversation history is shared between both flows

## How It Works

### Knowledge Sharing Between Flows

Both flows use the **same `conversationId`**, which means:

```
Fact-Gathering Phase:
  conversationId: "conv_abc123"
  dialogFlowId: "df_fact_gathering"
  → Conversation stores: [user msgs, AI responses, extracted facts]

Trial Phase (NEW execution, SAME conversation):
  conversationId: "conv_abc123"  ← SAME!
  dialogFlowId: "df_trial_debate"  ← DIFFERENT
  executionId: None  ← Fresh start
  → AI automatically has access to ALL facts from conv_abc123
```

The conversation history carries over automatically!

## User Flow

### 1. Homepage
- Enter **Fact-Gathering Flow ID** (e.g., `df_fact_gathering_123`)
- Enter **Trial Flow ID** (e.g., `df_trial_debate_456`)
- Select roles (Judge, Prosecutor, Defense)
- Click "Start Fact Gathering"

### 2. Fact-Gathering Phase
- Chat interface with AI
- Uses **Fact-Gathering Flow**
- AI asks questions, gathers information
- Upload documents if needed
- Flow processes through its nodes (facts, etc.)
- When ready, click "Start Trial"

### 3. Trial Phase
- Voice-powered trial begins
- Uses **Trial Flow** (different flow ID)
- Starts NEW execution with trial flow
- Has access to ALL facts from conversation
- Each agent (judge/prosecutor/defense) debates using gathered context

## Technical Implementation

### Frontend Changes

**Homepage (`app/page.tsx`):**
```typescript
const [factFlowId, setFactFlowId] = useState('');
const [trialFlowId, setTrialFlowId] = useState('');

// Navigate with both IDs
router.push(`/fact-gathering/${sessionId}?factFlowId=${factFlowId}&trialFlowId=${trialFlowId}&roles=${roles}`);
```

**Fact-Gathering Page:**
```typescript
const factFlowId = searchParams.get('factFlowId');
const trialFlowId = searchParams.get('trialFlowId');

// Uses factFlowId for chat
<ChatInterface flowId={factFlowId} />

// Passes trialFlowId to trial creation
const trialRequest = {
  conversationId,
  flowId: trialFlowId,  // Uses trial flow!
  roles: [...]
};
```

### Backend Changes

**Trial Creation (`routers/trial.py`):**
```python
# Removed executionId from request
class CreateTrialRequest:
    conversationId: str
    flowId: str  # This is the TRIAL flow ID
    roles: [...]

# Creates agent manager with trial flow
agent_manager = AgentManager(
    conversation_id=request.conversationId,
    flow_id=request.flowId  # Trial flow ID
)
```

**Agent Manager (`services/agent_manager.py`):**
```python
def __init__(self, conversation_id: str, flow_id: str):
    self.conversation_id = conversation_id
    self.trial_flow_id = flow_id  # Store trial flow ID
    self.trial_execution_id = None  # Starts empty

async def get_agent_response_from_flow():
    # Send message to conversation
    await send_message_to_conversation(conversationId, message)
    
    # Stream with trial flow
    if self.trial_execution_id:
        # Resume existing trial execution
        stream(execution_id=self.trial_execution_id)
    else:
        # Start NEW trial execution
        stream(
            dialog_flow_id=self.trial_flow_id,
            conversation_id=self.conversation_id
        )
    
    # Save executionId for next turn
    self.trial_execution_id = new_execution_id
```

## API Calls Flow

### Fact-Gathering Phase:
```
1. POST /conversation/send-message
   conversationId: null
   → Returns: {conversationId: "conv_123"}

2. GET /nap/stream?dialogFlowId=df_facts&conversationId=conv_123
   → Streams fact-gathering responses

3. User responds, repeat steps 1-2 with same conversationId
```

### Trial Phase:
```
1. POST /api/trial/create
   {
     conversationId: "conv_123",  # From fact-gathering
     flowId: "df_trial",          # TRIAL flow ID
     roles: [...]
   }

2. User speaks (STT) → Text message

3. POST /conversation/send-message
   conversationId: "conv_123"  # Same conversation!
   message: "I object to that"

4. GET /nap/stream?dialogFlowId=df_trial&conversationId=conv_123
   → NEW execution of TRIAL flow
   → Has access to ALL facts from conv_123
   → Streams trial response

5. Trial executionId saved, next turn uses:
   GET /nap/stream?executionId=exec_trial_456
```

## Key Points

1. **Separate Flows, Shared Conversation**
   - Fact flow and trial flow are different
   - Both use same conversationId
   - Knowledge transfers automatically via conversation history

2. **Fresh Execution for Trial**
   - Don't pass fact-gathering executionId to trial
   - Trial starts new execution with trial flowId
   - Maintains its own executionId across turns

3. **Flow Design**
   - **Fact Flow**: Should focus on extracting information
   - **Trial Flow**: Should focus on debate/argumentation
   - Configure flows differently in OpenJustice

## Testing

### Prerequisites:
Create TWO dialog flows in OpenJustice:

**Flow 1 - Fact Gathering:**
- Nodes: Fact extraction, questions about case
- Should collect: parties, events, evidence, timeline
- Ends with: awaiting-user-input or completion

**Flow 2 - Trial Debate:**
- Nodes: Reasoning, argumentation, rebuttal
- Uses conversation history (has access to facts)
- Generates legal arguments based on gathered information

### Test Steps:
1. Enter both flow IDs on homepage
2. Chat with fact-gathering flow
3. Verify facts are collected
4. Click "Start Trial"
5. Speak to agents
6. Verify agents use facts from gathering phase
7. Verify agents debate/argue (not just collect facts)

## Files Modified

### Frontend:
- `app/page.tsx` - Two flow ID inputs
- `app/fact-gathering/[sessionId]/page.tsx` - Pass trial flow to API
- `types/index.ts` - Removed executionId from CreateTrialRequest

### Backend:
- `models/trial.py` - Removed executionId from CreateTrialRequest
- `routers/trial.py` - Store trial_flow_id, removed execution_id
- `services/agent_manager.py` - Use trial flow with fresh execution
- `services/openjustice.py` - Better param prioritization
- `ws_handlers/fact_gathering.py` - Pass flow_id for continuation

## Status
✅ Two-flow system implemented
✅ Knowledge sharing via conversationId
✅ Fresh execution for trial phase
✅ No linter errors
✅ Ready for testing

