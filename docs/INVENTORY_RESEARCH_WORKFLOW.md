# Inventory & Research Operations Workflow


```
CEO  ←─────────────── Project Status, Cost, Priority Oversight ────────────────┐
                                                                                │
VPs ── Create Research Project ── Assign Researcher ── Set Deadline & Priority ─┘
  │
  │
  ▼
Branches (7)
  │
  │ School Requirement
  ▼
Select Work Type ────────────────────────────────────────────────────────────────┐
  │                                                                               │
  │                                                                               │
  ▼                                                                               ▼
STEM OPERATIONS                                                               RESEARCH OPERATIONS
  │                                                                               │
  │                                                                               │
  ▼                                                                               ▼
Inventory Area (Per Branch)                                                  Researcher
  │                                                                               │
  │                                                                               │
  ▼                                                                               ▼
Inventory Admin ── Assigns KIT ──► [Execution Type?]                          Component Request
                    │                    │                                      │
                    │                    │                                      ▼
                    │               ┌────┴────┐                         Inventory Admin
                    │               │           │                              │
                    │            KIT Loan    KIT Sale                           │
                    │               │           │                              ▼
                    │         KIT to School   Bill Generated             Component Available?
                    │               │           │                        ┌───────┴─────────┐
                    │         STEM Session     Inventory Deducted        │                 │
                    │               │                                   Yes                No
                    │         KIT Returned                               │                 │
                    │               │                                   │                 ▼
                    │         Inventory Inspection                        │             Forward to VP
                    │               │                                   │                 │
                    │        Damaged?                                   │                 ▼
                    │        ┌───────┴───────┐                          │          VP Reviews Requirement
                    │       Yes             No                          │                 │
                    │        │               │                          │          Is Component Costly?
                    │        ▼               ▼                          │          ┌───────┴─────────┐
                    │  Mark as Consumed   Inventory Updated             │         No                Yes
                    │        │                                            │          │                 │
                    │        ▼                                            │          │                 ▼
                    │  Inventory Deducted                                │          │              CEO Approval
                    │                                                    │          │                 │
                    │                                                    │          ▼                 ▼
                    │                                                    └── Component Assigned   Approved/Rejected
                    │                                                            │
                    │                                                            ▼
                    │                                                Project Material Cost Updated
                    │                                                            │
                    │                                                            ▼
                    │                              Researcher Builds Project
                    │                        (Can take from Inventory OR
                    │                         from low-priority projects)
                    │                                                            │
                    │                                                            ▼
                    │                                               Project Completed
                    │                                                            │
                    │                          ┌──── Tools & Components Returned? ────┐
                    │                          │                                      │
                    │                        Yes                                     No
                    │                          │                                      │
                    │                          ▼                                      ▼
                    │                Inventory Inspection                   Inventory Consumption Finalized
                    │                          │
                    │                     Damaged?
                    │                     ┌────┴────┐
                    │                   Yes          No
                    │                    │            │
                    │                    ▼            ▼
                    │             Mark as Consumed   Inventory Updated
                    │                    │
                    │                    ▼
                    │            Inventory Deducted
                    │                          │
                    │                          ▼
                    │               Final Bill Generated (Actual Consumed Cost)
                    │                          │
                    │                          ▼
                    │                    Project Closed
                    │
                    │
                    │   ┌── If Components Borrowed from Low Priority Project ──┐
                    │   │                                                      │
                    │   ▼                                                      ▼
                    │ Inventory Updated                               Assigned Project Priority Raised
                    │   │                                                      │
                    │   ▼                                                      ▼
                    │ Low Priority Project Inventory Reduced         Borrowing Project Marked High Priority
                    │
                    │
                    ├────────► Trainer requests KIT → Inventory Admin
                    │                              ↓
                    │                      Inventory Admin assigns KIT
                    │                              ↓
                    │                        Trainer goes to School
                    │                              ↓
                    │                   Trainer Self-Skilling Session
                    │                              ↓
                    │                     Trainer returns KIT to Branch
                    │                              ↓
                    │                      Inventory Inspection
                    │                              ↓
                    │                         Damaged?
                    │                       ┌─────┴─────┐
                    │                     Yes           No
                    │                      │             │
                    │                      ▼             ▼
                    │               Mark as Consumed   Inventory Updated
                    │                      │
                    │                      ▼
                    │              Inventory Deducted
                    │
                    └────────────── Inventory System Updated (shared across all operations)
```

## Branch Intake
1. Branch (7 total) receives School Requirements.
2. Branch selects the appropriate Work Type:
   - **STEM Operations**
   - **Research Operations**

---

## STEM Operations Path

### Inventory Area (Per Branch)
1. Inventory Admin assigns a KIT to the requesting entity (trainer or project).
2. Determine the **Execution Type**:
   - **KIT Loan**
     - KIT delivered to school → STEM session conducted → KIT returned → Inventory inspection.
     - If damaged → Mark as consumed → Inventory deducted.
     - If intact → Inventory updated (restocked).
   - **KIT Sale**
     - Kit provided to school → Bill generated → Inventory deducted (no return expected).

### Trainer Workflow (STEM)
1. Trainer requests KIT → Inventory Admin assigns KIT.
2. Trainer conducts school session (including self-skilling if applicable).
3. Trainer returns KIT to branch → Inventory inspection.
4. If damaged → Mark as consumed → Inventory deducted; if intact → Inventory updated.

---

## Research Operations Path

### Researcher Assignment
1. Research project initiated by VP → Researcher assigned with deadline & priority.
2. Researcher may request components via **Component Request** to Inventory Admin.

### Component Handling
1. Inventory Admin checks availability:
   - **Available:** component assigned to project; project material cost updated.
   - **Not available:** request escalated to VP.
     - If component is high-cost → CEO approval required (approve/reject).
     - Once approved, component assigned and cost tracked.
2. Inventory Admin updates stock for any assigned components.

### Research Execution
1. Researcher builds project using assigned components.
   - May borrow from low-priority projects if needed.
     - Inventory deducted from donor project, borrowing project priority raised to high.
2. Upon project completion:
   - Tools/components returned?
     - **Yes:** Inventory inspection.
       - If damaged → Mark consumed → Inventory deducted.
       - If intact → Inventory updated.
     - **No:** Inventory consumption finalized (assume consumed).
3. Final bill generated based on actual consumed cost → Project closed.

---

## Inventory Consumption & Updates
- All operations (STEM sessions, research projects, component loans/sales) feed into the shared Inventory System.
- Each deduction or restock triggers:
  - Inventory inspection (for returned items).
  - Status updates (available, consumed, repaired, etc.).
  - Billing events for KIT sales or project materials.

---

## Escalation Logic Summary
1. **Component Request → Inventory Admin**
2. If unavailable → forwarded to VP.
3. VP checks cost:
   - Low-cost → VP approves directly → assignment continues.
   - High-cost → CEO approval required.
4. After approval (VP or CEO), component assigned and inventory/cost records updated.

---

## Low-Priority Borrowing Rules
- When a high-priority project borrows from a low-priority project:
  - Low-priority project inventory is reduced (logged).
  - Borrowing project priority is raised to high until components are returned or reconciled.
  - Inventory system keeps both projects in sync to avoid double-counting.

---

## Closure Steps
1. Confirm all components billed or returned.
2. Verify any outstanding inspections/damage assessments.
3. Generate final bill (actual consumed cost).
4. Close project with updated inventory records.

---

Priority Management Algorithms (what you’ll implement in your system)

These are the algorithms suggested in the document and ideal for your use case:

Weighted Priority Scheduling
Each project gets a score:

Priority Score = (Deadline Weight × Urgency)
               + (Cost Weight × Budget Size)
               + (Client/School Importance Weight)


Higher score → higher priority.

Dynamic Priority Queue
All projects live in a priority queue (max-heap).
Whenever:

deadline changes

cost increases

CEO/VP updates priority
→ project is reinserted into the queue with new score.

Cost Escalation Algorithm

if component_cost > VP_APPROVAL_LIMIT:
    forward_to_CEO()


This enforces financial control.

Resource Conflict Resolution

if high_priority_project lacks components:
    pull from lowest_priority_active_project


Keeps deadlines protected.

These four together give you a real enterprise-grade priority engine.

---

## Implementation Plan (Dashboards & Ownership)

To operationalize the workflow inside MIS, we will implement/extend the following dashboards:

1. **CEO / Executive Oversight Dashboard**
   - Inputs: escalated high-cost component requests, overall project priority queue, budget utilization.
   - Actions: approve/reject high-value requests, adjust project priority weights, monitor cost escalations.
2. **VP Operations Dashboard**
   - Inputs: branch escalations, component availability, borrowing events, project priority scores.
   - Actions: approve standard component requests, promote/demote project priorities, forward costly items to CEO.
3. **Branch Intake Dashboard (per branch)**
   - Inputs: incoming school requirements, work-type selection (STEM vs Research), local inventory snapshot.
   - Actions: classify requirements, trigger KIT assignment workflow, view status of KIT loans/sales for the branch.
4. **Inventory Admin Dashboard**
   - Inputs: KIT allocation queue, component request queue, inspection/damage logs, billing states.
   - Actions: assign KITs, record loan vs sale, log inspections, mark damaged/consumed stock, trigger billing events.
5. **Trainer / Researcher Dashboard (shared)**
   - Trainers and researchers share the existing Employee Dashboard features, supplemented with:
     - Component request creation.
     - Borrow/return logging from low-priority projects.
     - Project material usage reporting prior to closure.
6. **Shared Inventory & Billing Dashboard**
   - Inputs: unified ledger of deductions/restocks, inspection backlog, consumption states, outstanding bills.
   - Actions: reconcile inventory across operations, finalize consumption, release final bills, audit borrowing adjustments.

This plan ensures every actor in the workflow (CEO → VP → Branch → Inventory Admin → Trainer/Researcher) has a dedicated view aligned with their responsibilities while keeping researchers on the trainer experience.
