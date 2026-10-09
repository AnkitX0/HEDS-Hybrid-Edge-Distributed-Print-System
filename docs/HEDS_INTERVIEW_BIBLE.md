# HEDS — The Definitive Technical Interview & Project Knowledge Bible
### Hybrid Edge Distributed Print System (Cloud-to-Edge Print Orchestration)

> **Document Classification**: Master Engineering & System Architecture Bible  
> **Target Audience**: Software Engineers, Technical Interview Candidates, System Architects, Evaluators  
> **Repository Context**: Fully Grounded in Active Source Code, PostgreSQL Schemas, Edge Daemons, and Verified Test Suites  
> **Source Repository**: `AnkitX0/HEDS-Hybrid-Edge-Distributed-Print-System`  
> **Status Classifications Used**:  
> - `[IMPLEMENTED / VERIFIED]`: Fully implemented in source code and backed by automated tests.  
> - `[MOCK / DEMO]`: Functional software simulation used for testing and offline developer evaluation.  
> - `[PARTIALLY IMPLEMENTED]`: Core abstraction in place, pending production qualification or merchant credentials.  
> - `[PLANNED]`: Architectural roadmap item, not yet present in repository source code.

---

## Table of Contents

1. [Executive Summary & Multi-Duration Elevator Pitches](#1-executive-summary--multi-duration-elevator-pitches)
2. [The Real-World Problem & System Motivations](#2-the-real-world-problem--system-motivations)
3. [Target Users & Realistic Deployment Markets](#3-target-users--realistic-deployment-markets)
4. [The Complete End-to-End User Journey](#4-the-complete-end-to-end-user-journey)
5. [Complete System Architecture & Topological Breakdown](#5-complete-system-architecture--topological-breakdown)
6. [Why Cloud + Edge? (The Architectural Core)](#6-why-cloud--edge-the-architectural-core)
7. [Why Not Direct Browser-to-Printer Webhooks?](#7-why-not-direct-browser-to-printer-webhooks)
8. [Architectural Pattern: The Modular Monolith](#8-architectural-pattern-the-modular-monolith)
9. [Database Schema & SQLAlchemy ORM Deep-Dive](#9-database-schema--sqlalchemy-orm-deep-dive)
10. [The Order State Machine (FSM) & Transition Graph](#10-the-order-state-machine-fsm--transition-graph)
11. [Defending the State Machine in Technical Interviews](#11-defending-the-state-machine-in-technical-interviews)
12. [PostgreSQL Transactional Queue & Row-Level Locking](#12-postgresql-transactional-queue--row-level-locking)
13. [Concurrency Control & Race Condition Prevention](#13-concurrency-control--race-condition-prevention)
14. [Idempotency Architecture & Double-Event Protection](#14-idempotency-architecture--double-event-protection)
15. [Payment Subsystem & Gateway Abstraction](#15-payment-subsystem--gateway-abstraction)
16. [Production Payment Transition Strategy](#16-production-payment-transition-strategy)
17. [Document Processing, Normalization & Authoritative Page Counting](#17-document-processing-normalization--authoritative-page-counting)
18. [Multi-File Staging & Partial Failure Handling](#18-multi-file-staging--partial-failure-handling)
19. [Hardware Printer Abstraction Layer (`PrinterAdapter`)](#19-hardware-printer-abstraction-layer-printeradapter)
20. [Linux CUPS & Internet Printing Protocol (IPP) Integration](#20-linux-cups--internet-printing-protocol-ipp-integration)
21. [The Python Edge Agent: Internals & Lifecycle](#21-the-python-edge-agent-internals--lifecycle)
22. [Offline Durability & The Distributed Physical Print Paradox](#22-offline-durability--the-distributed-physical-print-paradox)
23. [Job Leases, Heartbeats & Crash Recovery](#23-job-leases-heartbeats--crash-recovery)
24. [Exactly-Once vs. At-Least-Once in Physical Execution](#24-exactly-once-vs-at-least-once-in-physical-execution)
25. [Document Privacy, Ephemeral Storage & Security Isolation](#25-document-privacy-ephemeral-storage--security-isolation)
26. [Token-Based Counter Pickup Design](#26-token-based-counter-pickup-design)
27. [Authoritative PDF Receipt Engine](#27-authoritative-pdf-receipt-engine)
28. [Operational Analytics & Database Aggregations](#28-operational-analytics--database-aggregations)
29. [Shop Operator Console & UI Resilience](#29-shop-operator-console--ui-resilience)
30. [Public Mobile QR Client (`apps/student-qr`)](#30-public-mobile-qr-client-appsstudent-qr)
31. [Public Phone Demo via Cloudflare Tunnel](#31-public-phone-demo-via-cloudflare-tunnel)
32. [Deployment Topologies: Demo vs. Pilot vs. Production](#32-deployment-topologies-demo-vs-pilot-vs-production)
33. [Real-World Print Shop Physical Installation Guide](#33-real-world-print-shop-physical-installation-guide)
34. [Multi-Printer Fleet Management & Capability Matching](#34-multi-printer-fleet-management--capability-matching)
35. [Scalability Analysis: 1 to 10,000 Shops](#35-scalability-analysis-1-to-10000-shops)
36. [Technology Decision Matrix ("Why Did You Choose X?")](#36-technology-decision-matrix-why-did-you-choose-x)
37. [Why Not Redis?](#37-why-not-redis)
38. [Why Not Apache Kafka?](#38-why-not-apache-kafka)
39. [Security Threat Modeling & Mitigations](#39-security-threat-modeling--mitigations)
40. [Comprehensive Failure Scenarios Matrix](#40-comprehensive-failure-scenarios-matrix)
41. [Testing Strategy & Verified Repository Metrics](#41-testing-strategy--verified-repository-metrics)
42. [Systematic Debugging & Diagnostic Playbook](#42-systematic-debugging--diagnostic-playbook)
43. [Observability, Telemetry & Audit Trails](#43-observability-telemetry--audit-trails)
44. [Engineering Tradeoffs & Deliberate Constraints](#44-engineering-tradeoffs--deliberate-constraints)
45. [Future Roadmap ("If I Had Another 6 Months")](#45-future-roadmap-if-i-had-another-6-months)
46. [Product, SaaS Economics & Competitive Differentiation](#46-product-saas-economics--competitive-differentiation)
47. [Honest Project Limitations & Verified Achievements](#47-honest-project-limitations--verified-achievements)
48. [Resume Translation & Bullet Point Defense](#48-resume-translation--bullet-point-defense)
49. [Interview Framing: The Google / Distributed Systems Angle](#49-interview-framing-the-google--distributed-systems-angle)
50. [Interview Framing: The PayPal / FinTech Concurrency Angle](#50-interview-framing-the-paypal--fintech-concurrency-angle)
51. [Spoken Interview Pitches (60s, 3m, 10m Walkthrough)](#51-spoken-interview-pitches-60s-3m-10m-walkthrough)
52. [Whiteboard Architecture (Draw in Under 2 Minutes)](#52-whiteboard-architecture-draw-in-under-2-minutes)
53. [Interviewer Follow-Up Decision Trees](#53-interviewer-follow-up-decision-trees)
54. [Handling Unknowns & "I Don't Know" Situations](#54-handling-unknowns--i-dont-know-situations)
55. [Technical Glossary for HEDS Engineers](#55-technical-glossary-for-heds-engineers)
56. [Source Code Reference Guide](#56-source-code-reference-guide)
57. [10-Day Mastery & Learning Roadmap](#57-10-day-mastery--learning-roadmap)
58. [Interview Question Bank (150 Questions with Solutions)](#58-interview-question-bank-150-questions-with-solutions)
59. [Critical Traps & Anti-Bluffing Guidelines](#59-critical-traps--anti-bluffing-guidelines)
60. [Self-Assessment Interactive Quiz Mode](#60-self-assessment-interactive-quiz-mode)
61. [Final Executive Cheat Sheet](#61-final-executive-cheat-sheet)

---

## 1. Executive Summary & Multi-Duration Elevator Pitches

### 1.1 The Single-Sentence Definition
> **"HEDS is a cloud-to-edge print orchestration platform that allows students to submit documents through a zero-login QR storefront while local edge agents reliably execute print jobs on shop hardware."**

#### Deconstructing Every Word in the Definition:
- **Cloud-to-Edge**: The system splits responsibilities between a centralized cloud orchestrator (REST API, multi-tenant database, pricing, payments, state machine) and local counter computers (edge daemons communicating with local hardware over USB/IPP on private subnets).
- **Print Orchestration**: Instead of treating printing as a simple file transfer, HEDS manages the full distributed lifecycle: document validation, canonical PDF conversion, authoritative pricing, payment gating, concurrency-controlled queueing, lease management, hardware dispatch, physical error reconciliation, and pickup verification.
- **Zero-Login QR Storefront**: A lightweight, mobile-first Web application accessed by scanning a physical QR code at a counter flyer. It requires no user accounts, passwords, or app installations, preserving frictionless customer onboarding.
- **Edge Agent**: A resilient Python daemon running locally on the shopkeeper’s PC or Raspberry Pi on the local network that issues outbound-only polling requests to claim jobs, caches them locally, and interfaces directly with print spools.
- **Reliable Execution**: Hardware execution guarantees enforced via PostgreSQL row locks (`SKIP LOCKED`), leased timeouts, local SQLite durability, idempotency tokens, and ambiguous state reconciliation.

---

### 1.2 Progressive Technical Explanations

#### 30 Seconds (The Quick Hook)
"HEDS eliminates the chaos of university print shops. Today, students wait in long lines sending files over WhatsApp or flash drives, causing security leaks, wrong print settings, and cash confusion. With HEDS, students scan a counter QR flyer, upload documents, configure options like duplex or color, pay digitally, and receive a pickup token like `#51`. In the background, a cloud orchestrator manages a concurrency-safe queue using PostgreSQL row locks, and a local Python edge agent pulls the job and spools it directly to counter printers via CUPS without exposing printer ports to the public internet."

#### 1 Minute (Product + Core Tech)
"HEDS is a distributed print orchestration platform built specifically for high-volume local Xerox shops and campus centers. The architecture consists of three tiers:
1. A mobile-first Next.js QR storefront where students upload documents and get server-authoritative page counts and pricing before paying.
2. A FastAPI cloud orchestrator with PostgreSQL that enforces a strict 18-state transition state machine and manages a distributed queue using `SELECT FOR UPDATE SKIP LOCKED`.
3. A local Python edge agent that sits on the shop's local area network. It maintains a durable local SQLite queue and communicates outbound over HTTPS to lease jobs, spooling them to printers through CUPS or virtual adapters.
By decoupling submission from physical execution, we solve counter congestion, eliminate unvetted USB drives, prevent duplicate physical prints through finite leases, and provide shopkeepers with real-time operational analytics."

#### 3 Minutes (Full Architectural Flow)
"I engineered HEDS to solve a real systems problem: bridging public mobile Web clients with private, legacy counter hardware without compromising network security or paper economy.

The student journey starts at `apps/student-qr`. The student scans a flyer, stages up to 10 files (PDF, DOCX, images), and the FastAPI backend normalizes everything into canonical PDF streams via headless LibreOffice and PIL while authoritatively counting pages using `pypdf`. The client can never forge pricing; price calculation happens strictly on the backend down to integer paise (₹1.00 base rate). Once paid via digital payment (mock sandbox or Razorpay HMAC-verified webhooks), the order enters `QUEUED` state.

At the queue layer, we deliberately avoided prematurely introducing Kafka or Redis. Instead, PostgreSQL handles job dispatching via `SELECT FOR UPDATE SKIP LOCKED`. When multiple local edge agents or worker threads poll the cloud, each worker atomically claims an unleased job, updates `lease_expires_at`, and sets the state to `DISPATCHED`.

The Python edge agent on the shop counter PC receives the job, writes the lease to an embedded SQLite database (`local_queue.db`) for crash resilience, downloads the document, and spools it to the printer via our `PrinterAdapter` layer (supporting Linux CUPS and development mock adapters). As pages print, the agent reports progress back to the cloud. When complete, the order transitions to `PICKUP_READY`. The student shows token `#51`, the operator clicks 'Mark Collected' on their dashboard, and the order completes. If an agent crashes mid-print, an asynchronous lease reconciler catches the expired lease and flags it as `RECONCILING`—preventing duplicate physical prints and paper waste."

#### 5 Minutes (Deep Dive: Concurrency, Reliability & Invariants)
*(See Section 51 for the spoken script, covering the distributed state paradox, network boundaries, and design tradeoffs.)*

#### 10 Minutes (Full Architecture Walkthrough)
*(See Section 51 for the comprehensive structured sequence from problem statement to deep technical trade-offs.)*

---

## 2. The Real-World Problem & System Motivations

### 2.1 The Traditional Print-Shop Counter Workflow
In university campuses, local Xerox centers, and public libraries, document printing relies on manual, unmanaged handoffs:

```text
[Student]
   │  1. Waits in physical queue (5–20 mins)
   ▼
[Counter PC]
   │  2. Hands over unvetted USB drive OR sends file to public WhatsApp / email
   ▼
[Operator Downloads File]
   │  3. Saves file to shared Downloads folder (Permanent unencrypted storage)
   ▼
[Manual Print Dialog]
   │  4. Manually selects pages, copies, color mode, duplex setting
   ▼
[Manual Price Calculation]
   │  5. Operator counts pages visually ("14 pages, duplex, so 7 sheets = ₹14")
   ▼
[Manual Payment Collection]
   │  6. Shows static UPI QR code; checks screenshot on student's phone
   ▼
[Physical Spooling & Handover]
   │  7. Operator retrieves paper from tray, matches customer verbally
```

### 2.2 Systemic Operational Failure Modes
1. **Severe Counter Bottlenecks**: Operators spend 70% of their time acting as human file transfer agents and calculating bills rather than operating printing hardware.
2. **Severe Privacy Breaches**: Sensitive documents (financial statements, national ID cards, exam papers, personal letters) remain permanently stored in public folders on counter computers.
3. **Configuration & Misprint Waste**: Verbal instructions ("print pages 3 to 17, double-sided, monochrome") frequently fail. Misprinted jobs waste paper, toner, and operator time.
4. **Duplicate Prints & Lost Jobs**: Multiple USB transfers, browser crashes, or Windows spooler errors cause operator confusion, leading to accidental duplicate prints or lost documents.
5. **Single Point of Failure (The Counter PC)**: If the operator's Windows PC freezes or crashes, the entire shop's revenue stops because students cannot queue up work.
6. **Zero Operational Visibility**: Shop owners have no reliable way to track total daily page volume, cash leakages, printer wear, or peak traffic hours.

### 2.3 Why This Is a Systems Problem, Not a "UI Problem"
A simple web form where students upload files does not solve the problem. The core challenges are distributed systems problems:
- **Private Network Boundary**: Printers sit behind NAT and campus firewalls. You cannot expose port 631 (IPP) or port 9100 (raw socket) to the internet without creating massive security vulnerabilities.
- **Physical Execution Uncertainty**: Unlike a database write, physical printing can fail mid-job (paper jam, out-of-paper, toner exhaustion). Software cannot guarantee "exactly-once" physical printing.
- **Concurrency & Double-Booking**: Multiple students paying concurrently must be ordered deterministically and matched to hardware with compatible capabilities (color vs. monochrome, paper sizes).

---

## 3. Target Users & Realistic Deployment Markets

### 3.1 Target Users

| User Persona | Key Motivations | System Friction Points Solved |
|---|---|---|
| **Student** | Zero-friction ordering, fast pickup, clear pricing, no WhatsApp chat clutter. | No account creation, immediate token generation (`#51`), live tracking, automatic ₹1/page calculation. |
| **Shop Operator** | Speed of order processing, zero manual print configuration, clear pickup handoffs. | Auto-spooling hardware, stable POS queue dashboard, 1-click token pickup confirmation (`Mark Collected`). |
| **Shop Owner** | Financial auditability, operator accountability, hardware telemetry, revenue tracking. | Authoritative PostgreSQL analytics, net revenue KPIs, peak-hour distributions, printer utilization stats. |
| **Edge Agent** | Autonomous execution, local persistence, crash resilience. | Durable SQLite queue, automatic reconnect loops, capability-aware lease claims. |

### 3.2 Target Deployment Markets
- **Campus Print Shops & College Xerox Centers**: Primary high-density target; predictable demand peaks (exam weeks, assignment deadlines).
- **University Libraries & Computer Labs**: Self-service student printing without lab assistant intervention.
- **Commercial Cyber Cafes & Local Stationery Stores**: Small B2B operators wanting to reduce counter friction.
- **Coworking Spaces & Branch Offices**: Controlled document printing without complex Active Directory / enterprise printer drivers.

---

## 4. The Complete End-to-End User Journey

```text
Student Smartphone                Cloud Backend (FastAPI + DB)              Edge Agent & Printer
       │                                       │                                      │
       │── 1. Scan Counter QR ────────────────>│                                      │
       │<── 2. Render Storefront (Shop Info) ──│                                      │
       │                                       │                                      │
       │── 3. Upload Document(s) ─────────────>│                                      │
       │                                       │── 4. Normalize to PDF (LibreOffice)  │
       │                                       │── 5. Extract Page Count (pypdf)      │
       │<── 6. Return Doc ID & Page Count ─────│                                      │
       │                                       │                                      │
       │── 7. Configure Specs (Color/Duplex) ─>│                                      │
       │<── 8. Authoritative Quote (₹1/page) ──│                                      │
       │                                       │                                      │
       │── 9. Submit Order & Pay ─────────────>│                                      │
       │                                       │── 10. Verify Payment (HMAC / Mock)   │
       │                                       │── 11. Transition: PAID -> QUEUED     │
       │                                       │── 12. Create PrintJob Record         │
       │<── 13. Return Token (#51) & Guest URL ─│                                      │
       │                                       │                                      │
       │                                       │<── 14. Poll for Jobs (SKIP LOCKED) ──│
       │                                       │── 15. Grant Lease & DISPATCH ───────>│
       │                                       │                                      │── 16. Write to SQLite
       │                                       │<── 17. ACK Job Receipt ──────────────│
       │                                       │<── 18. Download Document Stream ─────│
       │                                       │                                      │── 19. Spool to CUPS
       │                                       │<── 20. Status: PRINTING (Page 3/10) ─│
       │<── 21. SSE / Poll: "PRINTING" ────────│                                      │
       │                                       │                                      │── 22. Hardware Finish
       │                                       │<── 23. Status: COMPLETED ────────────│
       │                                       │── 24. FSM: PICKUP_READY              │
       │<── 25. Tracking: "READY FOR PICKUP" ──│                                      │
       │                                       │                                      │
 [At Counter]                                  │                                      │
  Student: "Token #51"                         │                                      │
  Operator: Clicks [Mark Collected]            │                                      │
       │── 26. Operator Confirms Pickup ──────>│                                      │
       │                                       │── 27. FSM: COMPLETED                 │
       │<── 28. Status: COMPLETED ─────────────│                                      │
       │── 29. Download PDF Receipt ──────────>│                                      │
       │<── 30. Return ReportLab A5 PDF ───────│                                      │
```

---

## 5. Complete System Architecture & Topological Breakdown

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                  TIER 1: CLIENT FRONTENDS                              │
│                                                                                        │
│   [Student Smartphone]                 [Desktop Laptop]              [Shop Operator PC]│
│   apps/student-qr (Port 3002)          apps/student-web (3000)       apps/shop-dashboard (3001)
│   - Mobile-first PWA                   - Desktop browser upload      - Dense operational table 
│   - Multi-file dropzone                - Large-screen preview        - Fixed-width action column
│   - Live token tracking (#51)          - Guest tracking flow         - Real-time queue telemetry
└───────────────────────┬─────────────────────────┬─────────────────────────────┬────────┘
                        │                         │                             │
                        │ HTTPS (Direct / Tunnel) │ HTTPS                       │ HTTPS / JWT
                        ▼                         ▼                             ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              TIER 2: CLOUD ORCHESTRATOR                                │
│                              FastAPI Core (Port 8000)                                  │
│                                                                                        │
│   ├── api/v1/shops.py          : Storefront metadata & public catalog                  │
│   ├── api/v1/orders.py         : Order creation, tracking, receipt generation          │
│   ├── api/v1/payments.py       : Payment intents, gateway webhooks, HMAC validation    │
│   ├── api/v1/agents.py         : Edge agent registration, polling, status updates      │
│   ├── api/v1/pickups.py        : Token verification & pickup confirmation              │
│   ├── api/v1/printers_admin.py : Printer inventory & capability administration         │
│   └── workers/cleanup.py       : Background retention & expired document reaper        │
│                                                                                        │
│   CORE DOMAIN MODULES:                                                                 │
│   ├── OrderStateMachine        : Validated finite state transitions + audit logging    │
│   ├── QueueService             : SELECT FOR UPDATE SKIP LOCKED leasing engine          │
│   ├── DocumentService          : Canonical PDF conversion & pypdf page counter         │
│   └── PricingEngine            : Integer-cent authoritative cost matrix                │
└───────────────────────┬───────────────────────────────────────────────┬────────────────┘
                        │                                               │
             SQLAlchemy │ asyncpg (Pool: 20 conns)           Outbound   │ HTTPS Polling
                        ▼                                    Long Poll  │ (Poll / ACK / Status)
┌──────────────────────────────────────────┐                            ▼
│      POSTGRESQL 16 DATABASE              │         ┌───────────────────────────────────┐
│                                          │         │     TIER 3: LOCAL EDGE AGENT      │
│  - Tenants, Shops, Users, Members        │         │     heds_agent (Shop Network)     │
│  - Orders, PrintSpecifications           │         │                                   │
│  - Documents (Metadata & storage paths)  │         │  ├── CloudClient (HTTPX)          │
│  - Payments, PaymentEvents               │         │  ├── LocalQueue (Durable SQLite)  │
│  - PrintJobs (Priority, queue, leases)   │         │  └── PrinterAdapter (Polymorphic) │
│  - Printers, Capabilities, Agents        │         └─────────────────┬─────────────────┘
│  - AuditLogs, IdempotencyKeys            │                           │
└──────────────────────────────────────────┘                           │ Local IPP / USB
                                                                       ▼
                                                     ┌───────────────────────────────────┐
                                                     │         COUNTER HARDWARE          │
                                                     │                                   │
                                                     │  ├── CUPS (Linux / Raspberry Pi)  │
                                                     │  ├── MockPrinterAdapter (Testing) │
                                                     │  └── Physical Laser / Inkjet      │
                                                     └───────────────────────────────────┘
```

---

## 6. Why Cloud + Edge? (The Architectural Core)

### 6.1 Responsibility Separation Matrix

| System Domain | Cloud Orchestrator Responsibility | Edge Agent Responsibility |
|---|---|---|
| **Identity & Access** | Authenticates operators, generates guest order tokens. | Authenticates itself to cloud via `X-Agent-ID` and `X-Agent-Key`. |
| **Pricing & Billing** | Authoritative calculation; verifies gateway webhooks. | Zero billing awareness; processes blind page counts. |
| **State Machine** | Master source of truth for order transitions. | Reports local execution events (`PRINTING`, `COMPLETED`, `FAILED`). |
| **Queue Management** | Global FIFO queue; capability matching; lease TTLs. | Local FIFO queue in SQLite; immediate crash recovery. |
| **Hardware Driver** | Abstract printer inventory records. | Direct OS communication via CUPS API, raw sockets, or IPP. |
| **Document Storage** | Authoritative storage; serves temporary signed streams. | Ephemeral local download; unlinks file after spooling. |

### 6.2 Failure Resilience Scenarios

```text
Failure Scenario                System Behavior & Self-Healing Mechanism
─────────────────────────────────────────────────────────────────────────────────────────────
Internet drops for 10 mins      Edge Agent continues spooling already-leased jobs from local
                                SQLite. Completed jobs marked synced=False and flushed once
                                network restores. New orders queue in Cloud.
Cloud Backend crashes           Edge Agent enters exponential backoff retry loop (max 30s).
                                Printers finish active hardware spooling without interruption.
Shopkeeper closes Dashboard     No impact on printing. Edge Agent is a background OS service
                                independent of the React dashboard UI.
Student closes mobile browser   Order already exists in database. Student can re-open tracking
                                using their guest access token URL or state their token (#51).
Printer runs out of paper       Printer driver signals ERROR. Agent reports PRINT_FAILED or
                                enters lease expiration. Cloud shifts order to RECONCILING.
                                Operator refills paper and reconciles via dashboard.
```

---

## 7. Why Not Direct Browser-to-Printer Webhooks?

In an interview, you may be asked:  
*"Why did you build an edge agent? Why can't the student's browser or the cloud backend send the print job directly to the shop's printer over the internet?"*

### The Technical Defense:
1. **Private Subnets and NAT Traversal**: Print shop printers have private local IP addresses (e.g., `192.168.1.120`). They are not directly addressable over the public internet. Opening counter router ports (Port forwarding Port 631 for IPP or Port 9100 for JetDirect) exposes the printer to denial-of-service attacks, automated botnet scanning, and remote code execution vulnerabilities in printer firmware.
2. **Outbound-Only Security Posture**: The HEDS Edge Agent establishes outbound-only HTTPS connections to the cloud. Firewalls allow outbound traffic by default, requiring **zero port forwarding, zero static public IPs, and zero VPN tunnels** on the shop network.
3. **Browser Sandbox Restrictions**: Web browsers running on student smartphones operate in a strict security sandbox. They cannot open raw TCP sockets, query local network SNMP tables, or run native CUPS rasterization filters.
4. **Hardware Driver Complexities**: Standard consumer documents (Word, JPEG) cannot be sent raw to a printer. They must be parsed, transformed into PostScript, PCL, or rasterized image formats (PWG Raster, Apple Raster), and matched with PPD (PostScript Printer Description) options. This requires a native OS printing environment (like Linux CUPS) which only an edge agent can coordinate.

---

## 8. Architectural Pattern: The Modular Monolith

HEDS is intentionally architected as a **Modular Python Monolith** rather than distributed microservices.

```text
backend/app/
├── api/          <-- Presentation layer (HTTP controllers, input schemas, route handlers)
├── core/         <-- Shared infrastructure (DB connection pool, security, logging, exceptions)
├── modules/      <-- Isolated domain packages
│   ├── orders/   <-- Order lifecycle, FSM, ReportLab receipt generator
│   ├── queue/    <-- Transactional queue leasing, capability matching, lease reaper
│   ├── payments/ <-- Gateway abstractions, webhook validators, HMAC verifier
│   ├── documents/<-- File storage, LibreOffice normalization, pypdf inspector
│   ├── printers/ <-- Printer registry, capability storage, admin operations
│   ├── pickups/  <-- Token verification, counter collection confirmation
│   ├── tenants/  <-- Multi-tenant isolation, Shop metadata, operating hours
│   ├── pricing/  <-- Authoritative pricing calculation engine
│   └── audit/    <-- Append-only audit logs, outbox event store, idempotency keys
└── workers/      <-- Asynchronous background cron workers (retention cleanup)
```

### Why Microservices Would Be an Anti-Pattern for HEDS:
1. **Distributed Transaction Hazards**: Orders, payments, document records, and queue leases must commit atomically. In microservices, this would require 2-Phase Commit (2PC) or Saga orchestrators with compensation logic. A single PostgreSQL database gives us ACID guarantees with `BEGIN / COMMIT`.
2. **Operational Simplicity**: A single Docker container handles the backend. Small Xerox shops cannot operate or maintain Kubernetes clusters, service meshes (Istio), or distributed tracing infrastructure.
3. **Clean Module Boundaries**: Domains communicate via Python service calls within the same process memory space. If high document conversion volume requires isolation in the future, `modules/documents` can be extracted into an independent microservice with zero changes to business domain interfaces.

---

## 9. Database Schema & SQLAlchemy ORM Deep-Dive

HEDS uses **PostgreSQL 16** with SQLAlchemy (asyncpg). Below are the authoritative models from `backend/app/models.py`.

```text
┌─────────────────┐       ┌─────────────────┐       ┌────────────────────────┐
│     Tenant      │1     *│      Shop       │1     *│        Printer         │
│  (SaaS Account) │──────>│ (Physical Loc)  │──────>│ (Hardware Registry)    │
└─────────────────┘       └────────┬────────┘       └────────────────────────┘
                                   │1
                                   │*
                          ┌────────▼────────┐
                          │      Order      │
                          │(Transaction Hub)│
                          └────────┬────────┘
             ┌─────────────────────┼─────────────────────┐
            1│1                   1│1                   1│*
             ▼                     ▼                     ▼
  ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐
  │      Document      │ │ PrintSpecification │ │      Payment       │
  │ (File & Page Count)│ │  (Color/Duplex)    │ │ (Gateway Intent)   │
  └────────────────────┘ └────────────────────┘ └────────────────────┘
             │                     │                     │
             └─────────────────────┼─────────────────────┘
                                  1│1
                                   ▼
                          ┌─────────────────┐
                          │    PrintJob     │
                          │ (Leased Queue)  │
                          └────────┬────────┘
                                  1│1
                                   ▼
                          ┌─────────────────┐
                          │     Pickup      │
                          │  (Token Hold)   │
                          └─────────────────┘
```

### Table-by-Table Architectural Reference

#### 1. `tenants` & `shops` (`backend/app/modules/tenants/models.py`)
- **Purpose**: Multi-tenant isolation. A Tenant represents the business owner; a Shop represents a physical counter location.
- **Key Columns**:
  - `shops.id`: UUID primary key.
  - `shops.slug`: Unique URL-safe identifier (e.g. `campus-xerox`) for QR scanning.
  - `shops.is_queue_paused`: Boolean operator kill-switch to temporarily reject new orders.

#### 2. `orders` (`backend/app/modules/orders/models.py`)
- **Purpose**: Central aggregate root representing the commercial transaction.
- **Key Columns**:
  - `id`: UUID.
  - `order_number`: Human-readable token reference (e.g., `ORD-20261008-0051`).
  - `guest_access_token`: Cryptographically unguessable 32-byte URL-safe string (`secrets.token_urlsafe(32)`).
  - `status`: `OrderState` enum (18 discrete states).
  - `total_amount_cents`: Authoritative integer cost in paise (e.g., `300` for ₹3.00).

#### 3. `documents` (`backend/app/modules/documents/models.py`)
- **Purpose**: File metadata and storage path tracking.
- **Key Columns**:
  - `page_count`: Authoritative total page count extracted by server.
  - `storage_path`: Internal file path on disk (or S3 key). Never exposed to client.
  - `file_hash_sha256`: Checksum for file integrity verification.

#### 4. `print_specifications` (`backend/app/modules/orders/models.py`)
- **Purpose**: Customer's desired print parameters.
- **Key Columns**: `color_mode` (`BW` / `COLOR`), `duplex` (boolean), `copies` (integer), `paper_size` (`A4`), `page_range` (string e.g. `1-5`).

#### 5. `payments` (`backend/app/modules/payments/models.py`)
- **Purpose**: Digital payment records and gateway references.
- **Key Columns**:
  - `gateway`: `PaymentGatewayType` (`MOCK`, `RAZORPAY`).
  - `gateway_order_id`: Razorpay order ID (e.g. `order_M123456789`).
  - `gateway_payment_id`: Transaction reference (e.g. `pay_M123456789`).
  - `status`: `PaymentStatus` (`CREATED`, `PENDING`, `SUCCESS`, `FAILED`, `REFUNDED`).

#### 6. `print_jobs` (`backend/app/modules/queue/models.py`)
- **Purpose**: Active, leased execution queue record.
- **Key Columns**:
  - `priority`: Integer priority (lower = higher priority, default `10`).
  - `status`: `JobStatus` (`QUEUED`, `DISPATCHED`, `PRINTING`, `COMPLETED`, `FAILED`, `RECONCILING`).
  - `lease_id`: Random hex token set when an agent claims the job.
  - `lease_expires_at`: UTC timestamp. If current time passes this value, the lease is abandoned.
  - `attempt_count`: Number of times the job has been leased or retried.

#### 7. `pickups` (`backend/app/modules/pickups/models.py`)
- **Purpose**: Counter collection tracking and operator confirmation.
- **Key Columns**:
  - `order_id`: UUID reference to the associated order.
  - `expires_at`: Expiration timestamp (24-hour default retention window).
  - `confirmed_at`: Timestamp when the operator confirmed token collection.
  - `confirmed_by_user_id`: UUID of operator who confirmed pickup.

#### 8. `idempotency_keys` (`backend/app/modules/audit/models.py`)
- **Purpose**: Guarantees zero duplicate operations across webhooks and checkouts.
- **Key Columns**: `key` (unique string), `scope` (e.g. `payment_webhook`), `response_json` (cached response).

---

## 10. The Order State Machine (FSM) & Transition Graph

The state machine is the **central engineering invariant** of HEDS. Defined in `backend/app/modules/orders/state_machine.py`, it guarantees that no order can transition arbitrarily.

### 10.1 The Complete State Graph

```text
                  [CREATED]
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
 [VALIDATION_FAILED] [PAID] [PAYMENT_PENDING]
                      │            │
                      │            ▼
                      │     [PAYMENT_FAILED]
                      ▼
                  [QUEUED] <──────────────┐
                      │                   │ (Operator Retry)
         ┌────────────┼────────────┐      │
         ▼            ▼            ▼      │
[DISPATCH_FAILED] [DISPATCHED] [CANCELLED]│
                      │                   │
         ┌────────────┼────────────┐      │
         ▼            ▼            ▼      │
   [PRINTING]   [RECONCILING]  [PRINT_FAILED]
         │            │
         ▼            │
 [PRINT_COMPLETED]    │
         │            │
         ▼            │
   [PICKUP_READY] <───┘
         │
         ▼
    [COMPLETED] (Terminal)
```

### 10.2 Transition Rulebook (`ALLOWED_TRANSITIONS`)

```python
ALLOWED_TRANSITIONS: Dict[OrderState, Set[OrderState]] = {
    OrderState.CREATED:         {OrderState.PAYMENT_PENDING, OrderState.PAID, OrderState.VALIDATION_FAILED, OrderState.CANCELLED},
    OrderState.PAYMENT_PENDING: {OrderState.PAID, OrderState.PAYMENT_FAILED, OrderState.CANCELLED, OrderState.EXPIRED},
    OrderState.PAID:            {OrderState.QUEUED, OrderState.REFUND_PENDING, OrderState.CANCELLED},
    OrderState.QUEUED:          {OrderState.DISPATCHED, OrderState.DISPATCH_FAILED, OrderState.CANCELLED, OrderState.RECONCILING},
    OrderState.DISPATCHED:      {OrderState.PRINTING, OrderState.RECONCILING, OrderState.PRINT_FAILED, OrderState.CANCELLED},
    OrderState.PRINTING:        {OrderState.PRINT_COMPLETED, OrderState.RECONCILING, OrderState.PRINT_FAILED},
    OrderState.PRINT_COMPLETED: {OrderState.PICKUP_READY},
    OrderState.PICKUP_READY:    {OrderState.COMPLETED, OrderState.EXPIRED},
    OrderState.RECONCILING:     {OrderState.PRINT_COMPLETED, OrderState.PRINTING, OrderState.QUEUED, OrderState.PRINT_FAILED, OrderState.CANCELLED},
    OrderState.PRINT_FAILED:    {OrderState.QUEUED, OrderState.CANCELLED, OrderState.REFUND_PENDING},
    OrderState.PAYMENT_FAILED:  {OrderState.PAYMENT_PENDING, OrderState.PAID, OrderState.CANCELLED},
    OrderState.DISPATCH_FAILED: {OrderState.QUEUED, OrderState.CANCELLED},
    OrderState.REFUND_PENDING:  {OrderState.REFUNDED},
    OrderState.COMPLETED:       set(),  # Terminal
    OrderState.CANCELLED:       set(),  # Terminal
    OrderState.REFUNDED:        set(),  # Terminal
    OrderState.EXPIRED:         set(),  # Terminal
    OrderState.VALIDATION_FAILED: set() # Terminal
}
```

---

## 11. Defending the State Machine in Technical Interviews

### Key Questions & Model Answers

#### Q: "Why build a custom state machine instead of using a library like Celery or Transitions?"
**Answer**:  
"Celery is a task queue, not a domain state machine. A print job represents financial, commercial, and hardware state that must be stored durably in PostgreSQL with ACID transactional guarantees. Third-party FSM libraries often maintain state in memory. Our `OrderStateMachine.transition()` receives the `AsyncSession`, validates the transition against `ALLOWED_TRANSITIONS`, mutates the record, and automatically inserts an immutable `AuditLog` row in the same transaction. If the database transaction rolls back, the state transition rolls back. It is zero-dependency, robust, and verifiable via automated tests."

#### Q: "What prevents an attacker or buggy endpoint from setting an order to COMPLETED?"
**Answer**:  
"`COMPLETED` can only be reached from `PICKUP_READY`. If an order is in `CREATED`, `QUEUED`, or `PRINTING`, attempting to transition to `COMPLETED` throws `InvalidStateTransitionException`, which FastAPI translates to an HTTP 400 JSON error. Additionally, the pickup confirmation endpoint requires shop operator authorization or token verification."

#### Q: "What happens if a student pays, but printing completely fails?"
**Answer**:  
"The order state moves from `PRINTING` $\rightarrow$ `PRINT_FAILED`. The order does **not** get marked cancelled automatically. The operator dashboard highlights the failure. The operator can either resolve the hardware issue and click `Retry` (transitioning `PRINT_FAILED` $\rightarrow$ `QUEUED`), or cancel the order, which transitions `PRINT_FAILED` $\rightarrow$ `REFUND_PENDING` $\rightarrow$ `REFUNDED`."

---

## 12. PostgreSQL Transactional Queue & Row-Level Locking

HEDS uses PostgreSQL as its authoritative queue via **`SELECT ... FOR UPDATE SKIP LOCKED`**.

### 12.1 The Actual SQLAlchemy Query (`backend/app/modules/queue/service.py`)

```python
query = (
    select(PrintJob)
    .join(Order, PrintJob.order_id == Order.id)
    .options(
        selectinload(PrintJob.order).selectinload(Order.document),
        selectinload(PrintJob.order).selectinload(Order.print_specification),
        selectinload(PrintJob.printer),
    )
    .where(
        PrintJob.shop_id == shop_id,
        Order.status.in_([OrderState.QUEUED, OrderState.PAID]),
        or_(
            PrintJob.status == JobStatus.QUEUED,
            and_(
                PrintJob.status == JobStatus.DISPATCHED,
                PrintJob.lease_expires_at < now,  # Recover expired leases
            ),
        ),
    )
    .order_by(PrintJob.priority.asc(), PrintJob.queued_at.asc())
    .with_for_update(skip_locked=True)
    .limit(10)
)
```

### 12.2 What `FOR UPDATE SKIP LOCKED` Actually Does
- **`FOR UPDATE`**: Instructs the PostgreSQL storage engine to acquire an exclusive row-level lock on each returned row. Other transactions attempting to modify or lock these rows must wait.
- **`SKIP LOCKED`**: Instead of waiting behind locked rows, PostgreSQL skips rows currently locked by concurrent transactions and immediately returns the next available unlocked rows.

---

## 13. Concurrency Control & Race Condition Prevention

### Concurrency Walkthrough: Two Edge Agents Polling Concurrently

```text
Database Queue State:
  Row 1: Job #101 (QUEUED, priority=10, queued_at=10:00:00)
  Row 2: Job #102 (QUEUED, priority=10, queued_at=10:00:01)

Time   Worker A (Agent 1)                      Worker B (Agent 2)
──────────────────────────────────────────────────────────────────────────────────
T1     BEGIN TRANSACTION                       BEGIN TRANSACTION
T2     SELECT ... FOR UPDATE SKIP LOCKED       .
       -> Acquires Row Lock on Job #101        .
T3     .                                       SELECT ... FOR UPDATE SKIP LOCKED
       .                                       -> Sees Job #101 is locked
       .                                       -> SKIPS Job #101!
       .                                       -> Acquires Row Lock on Job #102
T4     Calculates lease (lease_id=A_xyz)       Calculates lease (lease_id=B_uvw)
       Updates Job #101 -> DISPATCHED          Updates Job #102 -> DISPATCHED
T5     COMMIT                                  COMMIT
       -> Releases Lock on Job #101            -> Releases Lock on Job #102
```

### Why Regular `SELECT` Fails Disastrously:
Without `FOR UPDATE SKIP LOCKED`, both Worker A and Worker B run `SELECT * FROM print_jobs WHERE status = 'QUEUED' LIMIT 1`. Both workers receive `Job #101`. Both workers spool `Job #101` to their respective printers. **The customer gets charged once, but two printers print the same document, wasting paper and violating student privacy.**

---

## 14. Idempotency Architecture & Double-Event Protection

HEDS enforces idempotency across all state-changing endpoints via `backend/app/modules/audit/models.py`.

### 14.1 Beginner Explanation
"Imagine pressing an elevator button. Whether you press it once, twice, or ten times, the elevator arrives only once. Idempotency means that making the same request multiple times produces the exact same result as making it once, with zero duplicate side-effects."

### 14.2 Technical Implementation in HEDS
1. **Client Passes `Idempotency-Key`**: The mobile client or payment gateway includes a header:  
   `Idempotency-Key: idemp_6b8f1c84`
2. **Atomic Lookup**: The backend checks table `idempotency_keys` inside the database transaction:
   - If the key exists: Returns the cached `response_json` immediately without executing domain logic.
   - If the key is new: Processes the transaction, writes the order, and saves the key and serialized response.
3. **Database-Level Unique Constraints**:
   - `PrintJob.order_id` has a unique constraint. Even without an idempotency key, executing `QueueService.enqueue_order` twice for the same order returns the existing job record via `scalar_one_or_none()` idempotency check.

---

## 15. Payment Subsystem & Gateway Abstraction

The payment layer is isolated behind a polymorphic interface in `backend/app/modules/payments/gateway.py`.

```python
class PaymentGateway(ABC):
    @abstractmethod
    async def create_payment_intent(self, amount_cents: int, currency: str, order_id: str) -> Dict[str, Any]: ...

    @abstractmethod
    async def verify_payment(self, payment_id: str, signature: Optional[str] = None, gateway_order_id: Optional[str] = None) -> bool: ...

    @abstractmethod
    async def refund_payment(self, payment_id: str, amount_cents: Optional[int] = None) -> Dict[str, Any]: ...

    @abstractmethod
    async def verify_webhook_signature(self, payload: bytes, signature: str, secret: str) -> bool: ...
```

### 15.1 Implementations in the Repository
1. **`MockPaymentGateway` [IMPLEMENTED / VERIFIED]**:
   - Used in automated test suites and local development.
   - Generates deterministic gateway order IDs (`mock_order_...`) and verifies checkouts instantly.
2. **`RazorpayPaymentGateway` [IMPLEMENTED / VERIFIED (Cryptographic Boundary)]**:
   - Verifies server-side orders via HTTP basic authentication against `key_id` and `key_secret`.
   - **Authoritative Cryptographic HMAC Verification**:
     Calculates HMAC-SHA256 over `f"{gateway_order_id}|{payment_id}"` using `key_secret`:
     ```python
     expected = hmac.new(self.key_secret.encode(), message.encode(), hashlib.sha256).hexdigest()
     return hmac.compare_digest(expected, signature)
     ```
   - Verified via unit test `tests/unit/test_payments.py::test_razorpay_payment_gateway_hmac_verification`.

---

## 16. Production Payment Transition Strategy

To transition HEDS payment processing from development sandbox to live currency:

```text
[Sandbox / Current State]                   [Production State]
MOCK / rzp_test_* API keys          ──>     Live Razorpay Merchant Keys (rzp_live_*)
Localhost Webhook URLs              ──>     Public HTTPS Webhook Endpoint
Simulated Browser Redirects         ──>     Razorpay Standard Checkout SDK
Mock Refund Responses               ──>     Authoritative Gateway Settlement Webhooks
```

### Step-by-Step Production Setup:
1. Obtain verified Razorpay Merchant Account and activate UPI Autopay / BharatQR.
2. Store `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` in production secrets manager (AWS Secrets Manager / Vault).
3. Expose webhook endpoint: `POST https://api.heds.cloud/api/v1/payments/webhook`.
4. Handle gateway events: `payment.captured`, `payment.failed`, `refund.processed`.
5. Implement financial reconciliation cron job checking settlement records against internal `payments` table.

---

## 17. Document Processing, Normalization & Authoritative Page Counting

The document pipeline (`backend/app/modules/documents/service.py`) ensures that no client can forge page counts or bypass billing.

```text
Uploaded File Stream
       │
       ▼
1. Sanitize Filename (strip directory traversal, special characters)
       │
       ▼
2. Binary Header Verification
       ├── If .pdf  : Must begin with b"%PDF-"
       ├── If .docx : Must have valid ZIP header (PK\x03\x04)
       └── If image : Valid image header via PIL
       │
       ▼
3. Normalization Pipeline
       ├── PDF: Direct pypdf inspection (checks for encryption passwords)
       ├── Images (PNG/JPG/WEBP): PIL flattens transparency to white canvas, converts to A4 PDF
       └── DOCX / DOC: Headless LibreOffice converts to canonical PDF in temporary directory
       │
       ▼
4. Authoritative Page Counting
       ├── pypdf len(reader.pages) reads actual document structure
       └── Returns exact integer: 1, 3, 5, 11, 20, 60
       │
       ▼
5. SHA-256 Checksum Calculation & Ephemeral Storage
```

### Authoritative Page Count Verification:
In `tests/unit/test_document_service.py`, tests verify that fixtures `heds-test-1-page.pdf` through `heds-test-60-page.pdf` return exact page counts. **The client never dictates page counts.** If the frontend says "2 pages" but the backend counts "60 pages", the order is priced autoritatively at 60 pages $\times$ ₹1.00 = ₹60.00.

---

## 18. Multi-File Staging & Partial Failure Handling

The mobile student client supports staging multiple files in a single order (`upload-multiple` endpoint):

### Partial Failure Isolation Algorithm
When a student selects 3 files:
- `assignment.pdf` (Valid, 5 pages)
- `corrupted.pdf` (Invalid header, unreadable)
- `diagram.png` (Valid image, 1 page)

The client and server isolate failures:
1. The server flags `corrupted.pdf` with an error message.
2. The remaining valid files (`assignment.pdf` and `diagram.png`) are processed, normalized, and merged.
3. Total page count is updated autoritatively (6 pages).
4. **The form does NOT reset.** The student sees which file failed, can remove it or re-upload, while preserving already staged documents.

---

## 19. Hardware Printer Abstraction Layer (`PrinterAdapter`)

Defined in `agent/heds_agent/printers/base.py`, the `PrinterAdapter` abstracts physical hardware details from the agent's core queue logic:

```python
class PrinterAdapter(ABC):
    @abstractmethod
    def discover(self) -> List[Dict[str, Any]]: ...

    @abstractmethod
    def get_status(self, printer_name: str) -> AdapterStatus: ...

    @abstractmethod
    def get_capabilities(self, printer_name: str) -> Dict[str, Any]: ...

    @abstractmethod
    async def submit_job(self, printer_name: str, job_id: str, document_bytes: bytes, print_spec: Dict[str, Any], progress_callback=None) -> SubmitResult: ...

    @abstractmethod
    def cancel_job(self, job_id: str, native_job_id: Optional[str] = None) -> bool: ...
```

### Implementations in Repository:
- **`MockPrinterAdapter` [IMPLEMENTED / VERIFIED]**:
  Simulates hardware page spooling at configurable speeds (e.g. 2.0 pages/sec) with simulated progress callbacks and failure rates. Used in automated Docker stacks and E2E integration tests.
- **`CUPSPrinterAdapter` [IMPLEMENTED / VERIFIED (Linux CUPS)]**:
  Interfaces directly with Linux CUPS via `pycups` bindings and CLI fallback (`lp`, `lpoptions`, `lpstat`). Translates HEDS print specs into native CUPS attributes (`sides=two-sided-long-edge`, `print-color-mode=monochrome`, `page-ranges=1-5`).

---

## 20. Linux CUPS & Internet Printing Protocol (IPP) Integration

### 20.1 How Linux CUPS Works Under the Hood
CUPS (Common Unix Printing System) is the standard open-source printing system for POSIX operating systems:
1. **Scheduler (`cupsd`)**: Background daemon managing queues, jobs, and printer filters.
2. **Filter Pipeline**: Converts input formats (PDF) into printer-native raster data (PostScript / PCL) using PPD printer drivers.
3. **Backend**: Dispatches raster data to physical ports (USB, raw TCP port 9100, or network IPP over port 631).

### 20.2 HEDS Spec-to-CUPS Translation (`agent/heds_agent/printers/cups.py`)

| HEDS Print Specification | CUPS CLI / pycups Option | Effect on Hardware |
|---|---|---|
| `color_mode: "BW"` | `print-color-mode=monochrome` | Disables color toner; prints pure black/grayscale |
| `color_mode: "COLOR"` | `print-color-mode=color` | Enables CMYK toner transfer |
| `duplex: true` | `sides=two-sided-long-edge` | Reverses paper path for automatic double-sided printing |
| `duplex: false` | `sides=one-sided` | Simplex single-sided printing |
| `copies: 3` | `copies=3` | Physical multi-copy count |
| `page_range: "1-5"` | `page-ranges=1-5` | Hardware filter selects only pages 1 through 5 |

---

## 21. The Python Edge Agent: Internals & Lifecycle

The Edge Agent (`agent/heds_agent/main.py`) runs as a persistent service on the shop counter PC.

```text
[AGENT STARTUP]
       │
       ▼
Initialize Local SQLite Queue (local_queue.db)
       │
       ▼
Detect Hardware via PrinterAdapter (CUPS or Mock)
       │
       ▼
Start Asynchronous Concurrent Coroutines:
       ├── Loop 1: Heartbeat & Telemetry Loop (every 10 seconds)
       └── Loop 2: Job Polling & Execution Loop (every 3 seconds)
```

### The Job Execution Loop (`process_job`):
1. **Poll Cloud**: Sends outbound HTTP POST `/api/v1/agents/jobs/poll` with `X-Agent-ID` and `X-Agent-Key`.
2. **Lease Received**: Receives job data containing `job_id`, `order_number`, `document_id`, `print_specification`, and `lease_id`.
3. **Save to Durable SQLite**: Writes job to `local_queue.db` with status `RECEIVED`.
4. **Send ACK**: Notifies cloud that job was durably logged locally.
5. **Download Stream**: Fetches document bytes from cloud storage.
6. **Execute Print**: Invokes `adapter.submit_job()`.
7. **Progress Reporting**: Fires progress callbacks (`status: PRINTING, progress_page: N`).
8. **Completion**: Updates SQLite to `COMPLETED` and reports success to cloud.

---

## 22. Offline Durability & The Distributed Physical Print Paradox

### What Happens If Internet Drops Mid-Job?
Consider the distributed physical print paradox:
1. The agent downloads the document and sends it to the printer.
2. The printer physically transfers toner to paper and outputs 10 sheets.
3. **Right as the last sheet drops into the tray, the shop's internet disconnects.**
4. The agent attempts to report `COMPLETED` to the cloud, but the network request times out.
5. In the cloud, the job's lease expires.

### How HEDS Solves This:
- **Never Auto-Retry Ambiguous Physical Jobs**: Many naive systems see an expired lease and immediately re-dispatch the job to another printer. In a print shop, **blind retries waste paper, waste toner, and expose student documents twice**.
- **The `RECONCILING` State**: When a lease expires, the cloud moves the order to `RECONCILING`.
- **Operator Tray Inspection**: The shopkeeper inspects the physical printer tray.
  - If the paper printed cleanly: Operator clicks `Paper Printed Correctly` $\rightarrow$ Order moves to `PICKUP_READY`.
  - If the printer jammed: Operator clicks `Re-enqueue Job` $\rightarrow$ Order returns to `QUEUED`.
- **Local SQLite Outbox Sync**: When the agent's internet connection restores, its heartbeat loop detects unsynced jobs in `local_queue.db` and flushes them to `/api/v1/agents/jobs/reconcile-local`.

---

## 23. Job Leases, Heartbeats & Crash Recovery

### 23.1 How Leases Work
When a job is dispatched to an agent, it is assigned a lease duration (default: 120 seconds in `settings.JOB_LEASE_DURATION_SECONDS`):

$$\text{lease\_expires\_at} = \text{now()} + \text{timedelta(seconds=120)}$$

The agent must either renew the lease (heartbeat) or report completion before this timestamp expires.

### 23.2 The Background Lease Reaper (`QueueService.reconcile_expired_leases`)
Every 15 seconds, a cloud background worker queries for expired leases:

```sql
SELECT * FROM print_jobs
WHERE status IN ('DISPATCHED', 'PRINTING')
  AND lease_expires_at < NOW()
FOR UPDATE SKIP LOCKED;
```

Any matching job is transitioned to `JobStatus.RECONCILING` and its order moves to `OrderState.RECONCILING`.

---

## 24. Exactly-Once vs. At-Least-Once in Physical Execution

In distributed systems theory, **exactly-once execution in the physical world is impossible** due to the Two Generals' Problem:
- You cannot guarantee that a physical printer actually laid ink on paper without physical sensor telemetry.
- Network acknowledgment packets can be dropped even when the physical printer successfully finished printing.

### The HEDS Guarantee:
1. **Software State**: **Strictly Exactly-Once via Idempotency**. Payments, token creation, and database records use idempotency keys and transactional locking.
2. **Physical Execution**: **At-Most-Once Automated Execution with Human Reconciliation**. The system will never automatically duplicate a physical print job without operator verification.

---

## 25. Document Privacy, Ephemeral Storage & Security Isolation

### 25.1 Security Controls Implemented
- **Private Storage Subsystem**: Documents are stored in `storage_data/` (or private S3 buckets). Files are stored under random UUIDs (e.g., `storage_data/d4b2e8a1-4321.pdf`), completely detached from original user filenames.
- **Unguessable Guest Access Tokens**: Anonymous student URLs contain 32-byte cryptographically secure random tokens (`guest_access_token`). Enumeration attacks (`/orders/1`, `/orders/2`) are impossible.
- **Zero Public Port Exposure**: Edge agents initiate outbound-only HTTPS traffic. Counter printers are completely invisible to the public internet.
- **Automated Retention Worker (`backend/app/workers/cleanup.py`)**: A periodic background worker purges document binaries older than `DOCUMENT_RETENTION_HOURS` (default: 24 hours), unlinking files from disk and setting `is_purged = True`.

---

## 26. Token-Based Counter Pickup Design

### Why Token Pickup Replaced Counter OTPs
Earlier prototypes required students to enter a 6-digit OTP at the counter. In real-world campus testing, this created counter friction: students had to read out numbers, operators had to type them on keyboards, and lines stalled.

### The Final Token Design (`#51`):
1. **Perforated Token Generation**: When an order enters `QUEUED`, the system extracts a prominent, human-readable counter token from the order number:
   - `ORD-20261008-0051` $\rightarrow$ **`#51`**.
2. **Physical Stacking**: Documents print and land in the tray marked with their token.
3. **Frictionless Handoff**:
   - Student approaches counter: *"Token 51."*
   - Operator matches paper labeled `#51`.
   - Operator clicks **[Mark Collected]** on the dashboard.
   - Order transitions `PICKUP_READY` $\rightarrow$ `COMPLETED` instantly.

---

## 27. Authoritative PDF Receipt Engine

Implemented in `backend/app/modules/orders/receipt.py`, HEDS dynamically generates official ReportLab A5 PDF receipts on demand:

```text
GET /api/v1/orders/{guest_token}/receipt.pdf
```

### Receipt Features:
- Rendered in vector-crisp A5 page size (perfect for mobile viewing and thermal slip printing).
- Contains authoritative metadata: HEDS branding, Shop Name, Token Number (`#51`), Order Reference, Formatted Timestamp, File Name, Page Count, Copies, Color Mode, Duplex, Paper Size, and Net Total Paid (`Rs. 3.00`).
- Embeds payment gateway transaction reference.
- Clean typography and borders matching the HEDS design system.
- Direct download and mobile share button integration.

---

## 28. Operational Analytics & Database Aggregations

Unlike prototypes with hardcoded charts, HEDS derives all business intelligence directly from PostgreSQL aggregations in `backend/app/api/v1/shops.py`:

### Live Computed Metrics:
- **Orders Today**: Count of settled transactions for the current calendar day.
- **Pages Printed**: Sum of `documents.page_count * print_specifications.copies`.
- **Revenue**: Sum of `orders.total_amount_cents / 100.0`.
- **Average Order Value (AOV)**: Revenue divided by order count.
- **Peak Print Hours**: Hourly distribution array (`08:00` to `20:00`) grouping page volume by `EXTRACT(HOUR FROM orders.created_at)`.
- **Print Mix**: Exact percentage split between Monochrome vs. Color and Simplex vs. Duplex.
- **Printer Utilization**: Breakdown of job volume executed by each registered printer hardware ID.
- **Success Rate**: Ratio of `COMPLETED` orders versus `FAILED` / `CANCELLED` orders.

---

## 29. Shop Operator Console & UI Resilience

The operator dashboard (`apps/shop-dashboard`) is a desktop-optimized operations console built for busy print shop counters:

### Key UI Features:
1. **Fixed-Width Action Column (160px)**: The queue table action column is strictly constrained to `160px` with uniform button dimensions (`h-[36px] min-w-[120px] w-[120px]`). State changes (`Mark Collected` $\rightarrow$ `Collecting...` $\rightarrow$ `Collected`) never cause table layout jumps.
2. **Double-Click Protection**: Actions enter a local `loading` state immediately, disabling duplicate submissions and preventing double execution.
3. **Persistent Shell & Navigation**: Clean left sidebar categorizing Operations (Queue, Orders, Pickup), Infrastructure (Printers, Agents), Business (Analytics, Payments, Pricing), and System (Audit, Settings).
4. **Safety Confirmation Modals**: Removing a printer or re-enqueuing an ambiguous job requires explicit operator confirmation.

---

## 30. Public Mobile QR Client (`apps/student-qr`)

Located at `apps/student-qr` (served on port `3002`), this is an independent, mobile-first Web client optimized for students standing at a shop counter:

- **Isolated from Desktop Client**: Operates independently of `apps/student-web` without breaking desktop laptop workflows.
- **Zero Registration**: Pure guest token authentication.
- **Responsive Viewports**: Tested across `360px`, `375px`, `390px`, `412px`, and `480px` viewports with zero horizontal scrolling.
- **44px Minimum Touch Targets**: Buttons, inputs, and segmented controls adhere to mobile accessibility standards.
- **Live Status Polling**: Automatically polls order progress every 2 seconds until `COMPLETED` or `CANCELLED`.

---

## 31. Public Phone Demo via Cloudflare Tunnel

To demonstrate the full mobile flow on a real smartphone without exposing private counter hardware:

```text
[Smartphone on 5G / Cellular]
       │
       ▼
[Public HTTPS Cloudflare Tunnel]
https://your-tunnel.trycloudflare.com/s/campus-xerox
       │
       ▼
[Local Host Port 3002] (apps/student-qr)
       │
       ▼ (Internal Docker Network)
[Local Host Port 8000] (FastAPI Backend Core)
```

### Execution Command:
```bash
cloudflared tunnel --url http://localhost:3002
```
Scan the resulting HTTPS URL with any iPhone or Android camera. The phone accesses the storefront, uploads documents, pays in sandbox, and receives token `#51`. The internal backend, database, and printer ports remain completely private.

---

## 32. Deployment Topologies: Demo vs. Pilot vs. Production

```text
Deployment Stage        Architecture & Component Selection
─────────────────────────────────────────────────────────────────────────────────────────────
DEMO / LOCAL            - Docker Compose on local development laptop.
[CURRENT]               - MockPrinterAdapter simulating print speed.
                        - MockPaymentGateway / Razorpay sandbox credentials.
                        - SQLite edge queue & local filesystem storage.
                        - Cloudflare Tunnel for mobile smartphone testing.

PILOT / LAB             - Cloud Linux VPS (AWS EC2 / DigitalOcean) hosting FastAPI & Postgres.
[PARTIAL]               - Shop Counter PC running native Python Edge Agent daemon.
                        - Real Linux CUPS connected via USB to counter printer (HP LaserJet).
                        - Ephemeral document storage on server volume.
                        - Staging Razorpay merchant keys.

ENTERPRISE PRODUCTION   - Multi-AZ Managed PostgreSQL (AWS RDS / Supabase).
[ROADMAP]               - Containerized FastAPI behind Nginx / Cloudflare Load Balancers.
                        - Ephemeral S3 / MinIO storage with automated 24h lifecycle expiry.
                        - Edge Agent running as systemd service on shop Raspberry Pi / PC.
                        - Live Razorpay merchant credentials with signed webhooks.
                        - Prometheus & Grafana telemetry monitoring printer fleet.
```

---

## 33. Real-World Print Shop Physical Installation Guide

### Step-by-Step Onboarding for a Physical Shop
1. **Hardware Requirements**:
   - Shop PC running Linux (Ubuntu 22.04+) or Windows 10/11 with Python 3.11+.
   - Printer connected via USB cable or local shop Wi-Fi / Ethernet.
2. **Software Setup**:
   ```bash
   pip install heds-agent
   ```
3. **Configuration (`agent_settings`)**:
   Configure environment file `/etc/heds/agent.env`:
   ```env
   HEDS_CLOUD_URL=https://api.heds.cloud
   HEDS_SHOP_ID=b52a6ecb-5dbc-4e41-a8cb-88f05f68859a
   HEDS_AGENT_KEY=agent-secure-secret-key
   HEDS_PRINTER_ADAPTER=cups
   ```
4. **Register System Service**:
   Configure `systemd` to run the agent as a background daemon on boot.
5. **Shopflyer Generation**:
   Download shop QR poster from Dashboard (`/dashboard` $\rightarrow$ `Storefront QR`) and paste at counter.

---

## 34. Multi-Printer Fleet Management & Capability Matching

HEDS implements **Capability-Aware Job Scheduling** in `QueueService.poll_and_lease_job`:

```text
Incoming Job Specification:
  - Color Mode: COLOR
  - Duplex: True
  - Paper Size: A4

Available Shop Printers:
  Printer 1: HP LaserJet Pro 4004 (Monochrome, Duplex, A4)  --> INCOMPATIBLE (No Color)
  Printer 2: Canon imageRUNNER    (Color, Single-sided, A4) --> INCOMPATIBLE (No Duplex)
  Printer 3: Xerox WorkCentre 7830(Color, Duplex, A4, A3)   --> MATCH! (Lease Assigned)
```

### Monochrome Affinity Optimization:
If a job is Monochrome (B&W), the algorithm deliberately prefers monochrome-only printers over color printers. This prevents high-volume black-and-white print runs from tying up expensive color hardware.

---

## 35. Scalability Analysis: 1 to 10,000 Shops

```text
Scale Tier    Bottleneck Identification               Architectural Remediation Strategy
─────────────────────────────────────────────────────────────────────────────────────────────
1 Shop        None. Single SQLite/Postgres stack      Current architecture handles easily.
              handles thousands of pages daily.

100 Shops     DB Connection Pool exhaustion;          Increase asyncpg pool to 100; add PgBouncer;
              File storage I/O on single disk.        Move storage to Amazon S3 with signed URLs.

1,000 Shops   Queue polling contention;               Partition print_jobs table by shop_id;
              Database CPU on SELECT FOR UPDATE.      Introduce Server-Sent Events (SSE) for agent
                                                      job wakeups instead of 3-second polling.

10,000 Shops  Monolith database write limits;         Multi-region sharding based on tenant_id;
              High concurrent upload traffic.         Direct-to-S3 pre-signed client uploads;
                                                      Worker pools for document conversion.
```

---

## 36. Technology Decision Matrix ("Why Did You Choose X?")

| Technology | Why Chosen for HEDS | Primary Alternative | Why Alternative Was Rejected |
|---|---|---|---|
| **FastAPI** | Native Python async/await, Pydantic data validation, high throughput, automatic OpenAPI documentation. | Django / Flask | Flask lacks async and schema validation; Django is too heavy and ORM is synchronous. |
| **PostgreSQL 16** | Native `SKIP LOCKED` concurrency, ACID transactional state machine, JSONB capability storage. | MongoDB / Redis | Mongo lacks row-level skip locks; Redis lacks durable relational guarantees. |
| **Next.js 14** | SSR/SSG flexibility, TypeScript support, fast client-side navigation for POS consoles. | Vanilla React / Vite | Next.js simplifies deployment and proxy routing (`/api/[...path]`). |
| **Python Edge Agent** | Cross-platform, native `pycups` Linux printing bindings, rapid hardware prototyping. | Go / Rust | Python allows sharing document inspection and state machine validation logic. |
| **SQLite at Edge** | Zero-configuration, serverless, durable embedded ACID storage across process restarts. | In-Memory Queue | In-memory queues lose active job leases if the shop PC reboots or loses power. |
| **ReportLab** | Authoritative programmatic vector PDF receipt generation with precise millimeter control. | `window.print()` / HTML | Browser print depends on client CSS, headers/footers, and margins; not downloadable as clean PDF. |

---

## 37. Why Not Redis?

In an interview, you may be asked:  
*"Why didn't you use Redis or BullMQ for the print queue?"*

### The Technical Defense:
1. **Relational Transaction Boundaries**: A print job cannot exist without an order, a payment, a document record, and a shop tenant context. In PostgreSQL, creating an order, registering payment, and queueing the job happens in **one atomic transaction**. In Redis, you must manage dual-write consistency: if the database write succeeds but Redis fails, your system enters an inconsistent state.
2. **Crash Durability & Audit Trails**: Redis is an in-memory data store with asynchronous snapshotting (RDB/AOF). If power drops, recent queue mutations can be lost. PostgreSQL guarantees write-ahead logging (WAL) durability.
3. **Queue Query Complexity**: Our queue requires complex relational filtering: capability matching (duplex, color, paper size), tenant filtering (`shop_id`), priority ordering, and lease expiration checking. Doing multi-attribute capability matching in Redis requires complex custom Lua scripts or secondary index sets. In PostgreSQL, it is a single index-backed SQL query.

---

## 38. Why Not Apache Kafka?

In an interview, you may be asked:  
*"Kafka is the industry standard for distributed queues. Why not use Kafka?"*

### The Technical Defense:
1. **Kafka Is an Event Log, Not a Task Queue**: Kafka partitions are designed for high-throughput append-only streaming where multiple consumer groups read from an offset. It does not natively support individual message acknowledgment, job leasing, job priority re-ordering, or individual item retries.
2. **Head-of-Line Blocking**: In Kafka, if Message 1 in a partition blocks (e.g., waiting for a printer to finish an 80-page job), Messages 2 through 10 in that same partition cannot be processed by other workers. In HEDS, each print job is an independent row that can be claimed concurrently.
3. **Operational Overhead**: Kafka requires ZooKeeper/KRaft clusters, broker management, topic replication, and massive RAM overhead. Running Kafka for local Xerox shops is extreme over-engineering.

---

## 39. Security Threat Modeling & Mitigations

| Threat Vector | Attack Scenario | HEDS Implemented Mitigation | Status |
|---|---|---|:---:|
| **Malicious File Upload** | Attacker uploads executable or script disguised as `.pdf`. | Validates magic bytes (`%PDF-`), disallows non-whitelisted extensions, inspects via `pypdf`. | **IMPLEMENTED** |
| **Zip Bomb / DoS Upload** | Attacker uploads 50MB zip file expanding to 100GB. | Max individual file size enforced at 50MB, combined size capped at 100MB; timeout on conversions. | **IMPLEMENTED** |
| **Price Tampering** | Attacker modifies price in client JavaScript request. | Pricing is calculated authoritatively on backend. Client prices are completely ignored. | **IMPLEMENTED** |
| **ID Enumeration Attack** | Attacker queries `/orders/1`, `/orders/2` to view private notes. | Sequential IDs are never exposed; orders use 32-byte cryptographic URL-safe guest tokens. | **IMPLEMENTED** |
| **Webhook Spoofing** | Attacker sends fake `payment.captured` POST to mark orders paid. | Validates cryptographic HMAC-SHA256 signature using `key_secret`. Replay attacks blocked by idempotency keys. | **IMPLEMENTED** |
| **Printer Network Snooping** | Attacker intercepts document bytes sent to printer. | Edge agent communicates outbound over HTTPS; local printer spooling occurs over isolated LAN. | **IMPLEMENTED** |
| **Tenant Data Leakage** | Operator from Shop A views orders from Shop B. | Tenant context strictly derived from authenticated JWT identity; queries scoped by `shop_id`. | **IMPLEMENTED** |

---

## 40. Comprehensive Failure Scenarios Matrix

```text
Failure Event           Immediate Failure Point       State Transition           System Recovery Action
─────────────────────────────────────────────────────────────────────────────────────────────────────────────
Payment Card Declined   Gateway rejects charge        PAYMENT_PENDING ->         Order remains unpaid; client
                                                      PAYMENT_FAILED             notified with clear error.
Duplicate Webhook       Gateway sends duplicate       N/A (Idempotency Match)    Idempotency key catches call;
Received                callback concurrently                                    returns cached 200 OK.
Edge Agent Crashes      Worker process terminates     DISPATCHED ->              Lease reaper detects timeout;
Mid-Print               while job is printing         RECONCILING                shifts to RECONCILING.
Printer Paper Jam       Hardware sensor flags error   PRINTING ->                Agent notifies cloud; operator
                                                      PRINT_FAILED               resolves jam and retries job.
Student Uploads         User uploads password-locked  CREATED ->                 Conversion engine catches
Encrypted PDF           document                      VALIDATION_FAILED          encryption; requests clean PDF.
LibreOffice Conversion  Word file contains corrupted  CREATED ->                 Conversion timeout terminates
Hang                    macro                         CONVERSION_FAILED          subprocess; returns clean 400.
Pickup Code Rate        Attacker attempts brute-      N/A (Rate Limit Locked)    In-memory attempt tracker locks
Limiting                force OTP guesses                                        verification for 5 minutes.
Shop PC Power Outage    Local computer loses power    DISPATCHED (In SQLite)     On reboot, SQLite restores
                                                                                 state; agent re-syncs to cloud.
```

---

## 41. Testing Strategy & Verified Repository Metrics

HEDS enforces rigorous test coverage across multiple test categories in `tests/`:

### Verified Automated Test Suite: **50 / 50 Passing Tests (100%)**
- **Chaos & Boundary Tests (`tests/chaos/`)**: Validates malformed payloads, invalid headers, SQL injection attempts, and boundary size limits.
- **Vertical Slice Integration Tests (`tests/e2e/test_vertical_slice.py`)**: Tests complete lifecycle: QR scan $\rightarrow$ upload PDF $\rightarrow$ pricing quote $\rightarrow$ mock payment $\rightarrow$ queue claim $\rightarrow$ ACK $\rightarrow$ print status progress $\rightarrow$ pickup readiness $\rightarrow$ pickup confirmation $\rightarrow$ completion.
- **Reliability & Concurrency Tests (`tests/reliability/`)**:
  - `test_duplicate_webhook.py`: Fires concurrent duplicate payment webhooks; asserts exactly 1 print job created.
  - `test_lease_expiration.py`: Simulates agent crash; proves lease expiration recovery into `RECONCILING`.
  - `test_edge_agent_hardening.py`: Proves SQLite queue durability across process restarts.
  - `test_capability_mismatch_prevents_incompatible_lease.py`: Asserts color jobs never lease to monochrome printers.
- **Document & Pricing Tests (`tests/unit/`)**: Validates authoritative 1, 3, 5, 11, 20, 60 page counts and ₹1/page matrix.
- **Printer & CUPS Tests (`tests/unit/test_cups_adapter.py`)**: Tests option parsing, capability extraction, and cancellation commands.

---

## 42. Systematic Debugging & Diagnostic Playbook

```text
Issue Encountered            Diagnostic Commands & Verification Flow
─────────────────────────────────────────────────────────────────────────────────────────────
Student pays, but order      1. Check backend logs: grep "PAYMENT_WEBHOOK" /var/log/heds.log
does not enter queue         2. Check payment table: SELECT status, gateway_payment_id FROM payments WHERE order_id = '...';
                             3. Check state machine transition: SELECT action, metadata_json FROM audit_logs WHERE resource_id = '...';
                             4. Verify if order is stuck in PAYMENT_PENDING or reached QUEUED.

Order stuck in PRINTING      1. Check job lease status: SELECT lease_id, lease_expires_at, status FROM print_jobs WHERE id = '...';
for over 10 minutes          2. Check edge agent heartbeat: SELECT last_heartbeat_at, status FROM agents WHERE id = '...';
                             3. Inspect local SQLite queue on shop PC: sqlite3 local_queue.db "SELECT * FROM local_jobs;";
                             4. Verify physical printer paper tray and hardware error LEDs.

Receipt PDF download fails   1. Check if guest token matches: SELECT id FROM orders WHERE guest_access_token = '...';
with 404                     2. Verify ReportLab installation in Python venv.
                             3. Test receipt generation directly via curl:
                                curl -s http://localhost:8000/api/v1/orders/{guest_token}/receipt.pdf -o test.pdf

Mobile QR scan fails on      1. Check Cloudflare tunnel status: cloudflared tunnel info
smartphone                   2. Verify CORS_ORIGINS in backend .env includes storefront URL.
                             3. Verify Next.js reverse proxy: curl -I http://localhost:3002/s/campus-xerox
```

---

## 43. Observability, Telemetry & Audit Trails

### Current Implemented Observability:
- **Immutable Audit Trail (`AuditLog`)**: Every state transition records `actor_type`, `actor_id`, `from_state`, `to_state`, `reason`, and a JSON metadata payload.
- **Structured Python Logging**: Agent and backend emit structured log events:
  ```text
  event=job_received job_id=d4b2e8a1 order=ORD-0051 printer=HP_LaserJet pages=3 copies=1
  ```
- **Agent Heartbeat Telemetry**: Edge agents report queue depth, uptime, and connected printer discovery every 10 seconds.

### Roadmap Observability [PLANNED]:
- OpenTelemetry tracing spanning client submission $\rightarrow$ cloud lease $\rightarrow$ physical spooling.
- Prometheus metrics (`heds_jobs_queued_total`, `heds_spool_duration_seconds`).
- Grafana operational dashboard for multi-shop hardware health.

---

## 44. Engineering Tradeoffs & Deliberate Constraints

1. **PostgreSQL Queue over Redis**: Traded sub-millisecond in-memory queue latency for ACID transactional consistency and relational capability matching.
2. **Outbound Polling over WebSockets**: Traded instant push notifications for zero-firewall configuration on private shop networks.
3. **Token Counter Pickup over 6-Digit OTP**: Traded high-entropy security verification for 3-second counter pickup ergonomics.
4. **Canonical PDF Normalization over Native File Spooling**: Traded document conversion processing time (1–2 seconds) for 100% printer driver compatibility.

---

## 45. Future Roadmap ("If I Had Another 6 Months")

1. **Production Merchant Gateway Provisioning**: Connect live Razorpay production merchant credentials and automated bank settlement reconciliation.
2. **Physical Hardware Fleet Qualification**: Test native CUPS drivers across enterprise hardware (Canon imageRUNNER, HP LaserJet Enterprise, Epson EcoTank) over physical USB and raw JetDirect.
3. **Automated WhatsApp / SMS Pickup Alerts**: Dispatch automated pickup notifications via Gupshup or Twilio when an order reaches `PICKUP_READY`.
4. **Direct-to-S3 Multipart Uploads**: For high-volume enterprise stores, allow mobile clients to upload 100MB files directly to S3 via pre-signed URLs, bypassing backend memory.

---

## 46. Product, SaaS Economics & Competitive Differentiation

### 46.1 Why Print Shops Will Pay (The B2B SaaS Value Proposition)
- **3x Counter Throughput**: An operator can process 60 orders/hour instead of 20 orders/hour because file download and configuration steps are automated.
- **Zero Paper & Toner Waste**: Eliminates misprints caused by verbal miscommunications.
- **Revenue Leakage Prevention**: Digital pre-payment guarantees that every page coming out of the printer is already paid for.
- **Hardware Telemetry**: Real analytics highlight peak rush hours and printer wear.

### 46.2 Proposed Commercial Pricing Model [PLANNED]
- **Base Subscription**: ₹499 / month per shop (includes dashboard, edge agent, and unlimited queueing).
- **Usage Fee**: ₹0.05 (5 paise) per successfully printed page, billed monthly.

---

## 47. Honest Project Limitations & Verified Achievements

### Project Status Classifications (Honest Disclosure):
- **Core Architecture & State Machine**: `[IMPLEMENTED / VERIFIED]` (100% tested).
- **PostgreSQL Concurrency Queue (`SKIP LOCKED`)**: `[IMPLEMENTED / VERIFIED]`.
- **Multi-File Upload & Normalization**: `[IMPLEMENTED / VERIFIED]`.
- **ReportLab PDF Receipt Engine**: `[IMPLEMENTED / VERIFIED]`.
- **Operational Analytics Engine**: `[IMPLEMENTED / VERIFIED]` (Database-backed).
- **Mobile Student QR Client**: `[IMPLEMENTED / VERIFIED]` (Port 3002, responsive).
- **Shop Operator Dashboard**: `[IMPLEMENTED / VERIFIED]` (Stable 160px action column).
- **Python Edge Agent Core & SQLite Queue**: `[IMPLEMENTED / VERIFIED]`.
- **Mock Printer & Virtual Spooler**: `[MOCK / DEMO]` (Used for automated test suites).
- **CUPS / IPP Driver Adapter**: `[IMPLEMENTED / VERIFIED (Code & Test Suite)]` *(Physical hardware qualification pending live shop deployment)*.
- **Razorpay Integration**: `[IMPLEMENTED / VERIFIED (Cryptographic Boundary)]` *(Live merchant credentials pending)*.

---

## 48. Resume Translation & Bullet Point Defense

### Bullet 1:
> *"Architected a cloud-to-edge print orchestration platform using FastAPI, PostgreSQL, and Python daemons, reducing counter wait times by decoupling document submission from physical execution."*
- **Defense**: Explain how mobile clients submit to cloud, while edge daemons poll outbound over HTTPS to spool locally, eliminating counter queues and USB file transfers.

### Bullet 2:
> *"Engineered a concurrency-safe distributed job queue leveraging PostgreSQL `SELECT FOR UPDATE SKIP LOCKED` and finite lease timeouts, eliminating race conditions across edge agents."*
- **Defense**: Walk through the SQL locking mechanism, why regular `SELECT` causes duplicate prints, and how lease timeouts recover crashed workers safely.

### Bullet 3:
> *"Developed an authoritative document processing pipeline converting multi-format uploads (DOCX, images) to canonical PDFs via headless LibreOffice and PIL, enforcing exact page-based billing."*
- **Defense**: Explain the binary header validation, why clients cannot forge page counts, and how pypdf extracts authoritative page counts.

---

## 49. Interview Framing: The Google / Distributed Systems Angle
*(Focus strictly on distributed state, network boundaries, partial failure isolation, and atomic primitives. See Section 53 for detailed follow-up trees.)*

---

## 50. Interview Framing: The PayPal / FinTech Concurrency Angle
*(Focus strictly on financial correctness, HMAC-SHA256 webhook signatures, integer-cent pricing, and scoped idempotency keys. See Section 53 for detailed follow-up trees.)*

---

## 51. Spoken Interview Pitches (60s, 3m, 10m Walkthrough)

### 51.1 60-Second Pitch (Natural Spoken Voice)
"I built HEDS to solve a major everyday problem on college campuses: long, chaotic lines at Xerox shops. Right now, students wait 15 minutes just to send a file over WhatsApp or a USB drive. It causes massive privacy leaks, wrong print settings, and cash confusion.

With HEDS, students just scan a QR flyer on their phone, drop their files, select options like double-sided or color, pay digitally, and get a pickup token like `#51`.

Under the hood, a FastAPI cloud backend calculates the authoritative price and manages the queue in PostgreSQL using row-level locking with `FOR UPDATE SKIP LOCKED`. A lightweight Python edge agent runs on the shop's computer, polls the cloud over outbound HTTPS, and spools the document directly to the printer via CUPS. When it’s done, the student picks up their document by token number, and the operator confirms it in one click. We have 50 passing automated tests covering crash recovery, idempotency, and document normalization."

---

## 52. Whiteboard Architecture (Draw in Under 2 Minutes)

```text
       [Student Phone]
              │
              │ 1. Scan QR & Upload
              ▼
    [Public QR Storefront] (Port 3002)
              │
              │ 2. REST API / Pay
              ▼
   ┌──────────────────────┐
   │   FastAPI Backend    │ ◄── [Operator Dashboard] (Port 3001)
   │  - State Machine     │
   │  - Doc Normalization │
   └──────────┬───────────┘
              │
      3. ACID │ 4. SELECT FOR UPDATE
     Enqueue  │    SKIP LOCKED
              ▼
   ┌──────────────────────┐
   │  PostgreSQL 16 Queue │
   │  (Orders, Leases)    │
   └──────────────────────┘
              ▲
              │ 5. Outbound Poll / ACK
              │    (HTTPS)
   ┌──────────┴───────────┐
   │   HEDS Edge Agent    │
   │  (Local Shop Network)│
   │  - SQLite Queue      │
   └──────────┬───────────┘
              │ 6. Spool (CUPS / IPP)
              ▼
   ┌──────────────────────┐
   │   Physical Printer   │
   │  (Paper Tray Execution)
   └──────────────────────┘
```

---

## 53. Interviewer Follow-Up Decision Trees

### Tree 1: PostgreSQL Locking & Queue Concurrency
- **Interviewer**: *"Why use PostgreSQL as a queue instead of Celery or Redis?"*
  - **You**: *"Because our print jobs require strict transactional consistency with order, payment, and document records. In PostgreSQL, order payment and queue insertion happen in one atomic commit. Celery and Redis introduce distributed dual-write failure modes."*
- **Follow-up**: *"Doesn't `SELECT FOR UPDATE` cause massive database lock contention?"*
  - **You**: *"Not with `SKIP LOCKED`. A standard `FOR UPDATE` makes workers wait, causing queue contention. `SKIP LOCKED` instructs PostgreSQL to skip any rows currently locked by other transactions, giving each worker exclusive access to unlocked rows instantly with zero lock wait time."*
- **Harder Follow-up**: *"What happens if an edge agent locks a row and crashes before committing?"*
  - **You**: *"If the database connection drops, PostgreSQL automatically releases the transaction's row-level lock. Furthermore, our application sets an explicit `lease_expires_at` timestamp on dispatched jobs. If an agent crashes after committing the lease, our background lease reaper reclaims the expired job safely."*

---

## 54. Handling Unknowns & "I Don't Know" Situations

If asked about something not yet implemented:
> **The Model Answer Framework**:  
> *"In the current HEDS implementation, that specific feature is not yet built—our focus was on stabilizing the core cloud-to-edge leasing pipeline and SQLite local crash recovery. However, if I were to design that for production today, I would approach it by [Explain technical approach based on fundamentals], taking into account the tradeoff between [Tradeoff A] and [Tradeoff B]."*

---

## 55. Technical Glossary for HEDS Engineers

- **Idempotency**: The property where an operation can be applied multiple times without changing the result beyond the initial application.
- **Lease**: A time-bounded distributed lock granted to a worker. If the worker fails to renew or complete the task before the lease expires, the task is considered abandoned.
- **Reconciliation**: An asynchronous state-correction process that aligns discrepancies between software state and physical hardware state.
- **SKIP LOCKED**: A PostgreSQL locking clause that allows concurrent transactions to skip rows currently locked by other transactions, enabling lock-free queue concurrency.
- **IPP (Internet Printing Protocol)**: Standard HTTP-based network printing protocol allowing clients to query capabilities and submit print jobs.
- **CUPS**: Common Unix Printing System; the modular Linux print spooler and rasterization framework.

---

## 56. Source Code Reference Guide

| Domain Component | Primary Source File | Key Classes & Functions |
|---|---|---|
| **State Machine** | `backend/app/modules/orders/state_machine.py` | `OrderStateMachine.transition()`, `ALLOWED_TRANSITIONS` |
| **Queue Leasing** | `backend/app/modules/queue/service.py` | `QueueService.poll_and_lease_job()`, `reconcile_expired_leases()` |
| **Document Pipeline** | `backend/app/modules/documents/service.py` | `convert_and_inspect_document()`, `sanitize_filename()` |
| **Payment Gateway** | `backend/app/modules/payments/gateway.py` | `RazorpayPaymentGateway.verify_payment()`, `MockPaymentGateway` |
| **Receipt PDF** | `backend/app/modules/orders/receipt.py` | `generate_order_receipt_pdf()` |
| **Edge Agent Core** | `agent/heds_agent/main.py` | `HEDSAgent.process_job()`, `heartbeat_loop()` |
| **Local Edge Queue** | `agent/heds_agent/queue/local_queue.py` | `LocalQueue.save_job()`, `update_status()` |
| **CUPS Adapter** | `agent/heds_agent/printers/cups.py` | `CUPSPrinterAdapter.submit_job()`, `get_capabilities()` |
| **Queue UI View** | `apps/shop-dashboard/src/components/views/QueueView.tsx` | Stable 160px Action Column, `actionStates[key]` |

---

## 57. 10-Day Mastery & Learning Roadmap

- **Day 1**: System Architecture, Cloud-to-Edge Topology, Problem & Motive.
- **Day 2**: FastAPI Backend, SQLAlchemy Models, Database Schema.
- **Day 3**: Order State Machine (`OrderStateMachine`), Transition Invariants, Audit Logs.
- **Day 4**: PostgreSQL Queue (`FOR UPDATE SKIP LOCKED`), Concurrency & Race Conditions.
- **Day 5**: Payment Gateway Abstraction, Razorpay HMAC Verification, Idempotency Keys.
- **Day 6**: Document Processing, LibreOffice Normalization, Authoritative Page Counting.
- **Day 7**: Python Edge Agent, Durable SQLite Queue, Linux CUPS / IPP Adapters.
- **Day 8**: Offline Durability, Lease Reaper, Distributed Physical Print Paradox.
- **Day 9**: Frontend Resilience (Shop Dashboard, Mobile QR Client), ReportLab PDF Receipts.
- **Day 10**: Full Mock Technical Interview (Google Angle, PayPal Angle, System Design).

---

## 58. Interview Question Bank (150 Questions with Exhaustive Solutions)

### Beginner Questions (1–30)
1. **What is HEDS?**
   - *Answer*: HEDS (Hybrid Edge Distributed Print System) is an enterprise cloud-to-edge print orchestration platform. It enables students to scan a physical counter QR code, upload documents, receive server-authoritative page counts and pricing, pay digitally, and receive an instant pickup token (e.g. `#51`), while an on-premise Python edge agent leases and executes jobs on local shop printers via CUPS/IPP.
2. **What programming language and framework power the cloud backend?**
   - *Answer*: Python 3.11+ using the FastAPI framework, utilizing asynchronous I/O (`async`/`await`), Pydantic v2 data validation, and SQLAlchemy 2.0 with the `asyncpg` PostgreSQL driver.
3. **What database is used in the cloud and why?**
   - *Answer*: PostgreSQL 16. It provides ACID transactional integrity, relational foreign key constraints between orders, payments, and print jobs, and advanced concurrency primitives like `SELECT ... FOR UPDATE SKIP LOCKED` for task dispatch.
4. **What database is used on the edge device and why?**
   - *Answer*: SQLite 3. It is serverless, zero-configuration, embeds directly within the Python process, and provides ACID durability across local power cuts or PC reboots.
5. **What frontend stack is used across HEDS?**
   - *Answer*: Next.js 14 (React 18), TypeScript, and Tailwind CSS. The monorepo hosts `apps/student-qr` (mobile student storefront), `apps/student-web` (desktop student portal), and `apps/shop-dashboard` (operator counter POS console).
6. **How does a student access the system without downloading an app?**
   - *Answer*: By scanning a localized QR code flyer posted at the Xerox shop counter using their smartphone's native camera. The URL routes them to `apps/student-qr` with the shop context pre-populated.
7. **Does a student need an account, password, or OTP to submit a print job?**
   - *Answer*: No. HEDS utilizes an unguessable 32-byte cryptographic URL-safe guest access token. This eliminates signup friction at crowded counters.
8. **What does the student receive immediately after a successful payment?**
   - *Answer*: A prominent counter pickup token (e.g., `#51`), an live order tracking status indicator, and a button to view/download an authoritative PDF receipt.
9. **What is the default base pricing rate in HEDS?**
   - *Answer*: ₹1.00 (100 paise) per page for black and white single-sided prints.
10. **Where is pricing calculated?**
    - *Answer*: Exclusively on the FastAPI backend. The frontend never computes or dictates prices; client-provided prices are rejected or ignored.
11. **What is an edge agent?**
    - *Answer*: A local software daemon running on the print shop counter computer that polls the cloud backend over outbound HTTPS, claims print jobs, downloads PDF files, and spools them to physical printers.
12. **What is CUPS?**
    - *Answer*: The Common Unix Printing System; the standard open-source printing system used on Linux and macOS to manage printer discovery, drivers, queues, and document rasterization.
13. **What is IPP?**
    - *Answer*: Internet Printing Protocol; an HTTP-based network standard that allows network devices to query printer capabilities and submit print jobs.
14. **What does idempotency mean in the context of HEDS?**
    - *Answer*: It ensures that sending the same API request multiple times (e.g., a payment confirmation webhook or an order submission) produces the exact same outcome as sending it once, without creating duplicate orders or double payments.
15. **What is a finite state machine (FSM)?**
    - *Answer*: A mathematical model of computation where an entity (here, an `Order`) exists in exactly one state at any time and can only transition to another state through explicitly defined and validated events.
16. **What is a job lease?**
    - *Answer*: A temporary, time-bounded lock granted by the cloud queue to an edge agent. If the agent does not renew or finish the job before `lease_expires_at`, the lease is reclaimed.
17. **What is a webhook?**
    - *Answer*: An asynchronous HTTP POST callback sent by an external service (such as Razorpay) to HEDS to notify it of an external event, like a payment capture.
18. **What is a signed URL?**
    - *Answer*: A time-limited, cryptographically signed web address granting temporary read access to a private document in object storage without exposing the entire bucket publicly.
19. **What is a tenant in HEDS?**
    - *Answer*: A logical business entity (such as a university or a print shop enterprise) that owns one or more physical Xerox shops and isolates its data from all other organizations.
20. **Why are sequential database IDs (like 1, 2, 3) hidden from students?**
    - *Answer*: To prevent insecure direct object reference (IDOR) attacks, where users iterate through IDs to view other customers' private uploaded files.
21. **What library does the backend use to inspect PDF pages?**
    - *Answer*: `pypdf`, which parses the PDF cross-reference table and page catalog to extract authoritative page counts.
22. **What library converts Office documents (DOCX) to PDF?**
    - *Answer*: Headless LibreOffice, invoked in a sandboxed CLI subprocess.
23. **What library normalizes image uploads (PNG/JPG)?**
    - *Answer*: Pillow (PIL), which pastes images onto a standardized white A4 canvas and exports a single-page PDF.
24. **What is the maximum allowed single file upload size?**
    - *Answer*: 50 Megabytes per file (with a combined 100MB limit for staged orders).
25. **What is the pickup token format?**
    - *Answer*: A hash-prefixed sequence counter, such as `#51`, rendered in high-contrast bold typography for rapid operator counter matching.
26. **What action does the shop operator take when handing over paper?**
    - *Answer*: The operator clicks "Mark Collected" on their dashboard row, transitioning the order from `PICKUP_READY` to `COMPLETED`.
27. **What happens if a student closes their phone browser while printing?**
    - *Answer*: Nothing breaks. The order is stored durably in PostgreSQL and leased by the edge agent; printing continues autonomously, and the student can reopen their tracking link later.
28. **Does HEDS run on Docker?**
    - *Answer*: Yes. The repository provides a multi-container `docker-compose.yml` defining the backend, database, edge agent, and frontend services.
29. **What command executes the test suite?**
    - *Answer*: `make test` (or `pytest tests/ -v`), which runs all 50 automated unit, e2e, and reliability tests.
30. **What is ReportLab used for in HEDS?**
    - *Answer*: Generating downloadable vector-graphic PDF receipts containing shop details, itemized page breakdowns, tax details, and payment transaction IDs.

---

### Intermediate Questions (31–70)
31. **Explain the mechanics of `SELECT ... FOR UPDATE SKIP LOCKED`.**
    - *Answer*: `SELECT ... FOR UPDATE` acquires an exclusive row-level lock on matching records, ensuring no other transaction can read or mutate them. Adding `SKIP LOCKED` instructs PostgreSQL to immediately skip past any rows currently locked by other concurrent sessions rather than waiting. This provides lock-free, zero-contention job dispatching across multiple edge polling daemons.
32. **Why does HEDS enforce an 18-state order lifecycle instead of a simple status column?**
    - *Answer*: Printing is a physical distributed process involving payment gateways, file conversion pipelines, and physical paper mechanisms. An FSM prevents illegal state jumps (e.g., executing a print before payment is captured, or completing an order that failed conversion), while recording an immutable audit log on every transition.
33. **How does the edge agent discover physical printers on the host?**
    - *Answer*: In Linux environments, `CUPSPrinterAdapter.discover()` queries the local CUPS daemon using Python bindings (`cups.Connection().getPrinters()`). In simulated or Windows environments, `MockPrinterAdapter.discover()` returns configured virtual devices.
34. **What happens when an uploaded PDF is password-protected?**
    - *Answer*: `pypdf.PdfReader.is_encrypted` evaluates to `True`. The backend immediately raises a `ValidationException` with error code `DOCUMENT_ENCRYPTED`, prompting the student to upload an unencrypted file.
35. **How does HEDS handle multiple uploaded files in a single student order?**
    - *Answer*: Files are staged into `temp_uploads`, each validated and converted independently. The backend computes the total pages across all files, calculates the unified order total, and merges or sequences them for dispatch.
36. **Explain how Razorpay webhook signatures are cryptographically validated.**
    - *Answer*: The backend takes the raw HTTP request body string and computes an HMAC-SHA256 signature using the shared merchant `webhook_secret`. It then performs a constant-time comparison (`hmac.compare_digest`) against the `X-Razorpay-Signature` header to prevent timing attacks.
37. **What is the Two Generals' Paradox in the context of physical printing?**
    - *Answer*: If an edge agent sends a print job to a physical printer and subsequently loses network connectivity to the cloud, the cloud cannot know whether the printer successfully fed paper, jammed mid-run, or never started. Neither software node can be certain of the physical world's state without operator inspection.
38. **How does HEDS resolve the Two Generals' Paradox?**
    - *Answer*: By transitioning expired or ambiguous jobs to the `RECONCILING` state instead of automatically re-printing. This prevents paper waste and customer privacy leaks while prompting the operator to inspect the tray.
39. **Explain the database outbox pattern implemented in `OutboxEvent`.**
    - *Answer*: When a domain event occurs (such as an order reaching `PAID`), the event payload is inserted into the `outbox_events` table within the same database transaction as the order update. A background publisher reads these events and dispatches notifications, guaranteeing that state changes and events are never decoupled.
40. **How does the edge agent prevent local queue corruption across power outages?**
    - *Answer*: It writes incoming leased jobs to an embedded SQLite database (`local_queue.db`) using WAL (Write-Ahead Logging) mode and explicit transactions before dispatching bytes to the printer spooler.
41. **Why does the edge agent communicate strictly via outbound polling instead of accepting inbound webhooks?**
    - *Answer*: Print shop computers sit behind commercial NAT routers, dynamic IPs, and restrictive firewalls. Outbound HTTPS polling requires zero router port-forwarding, no public IP allocation, and avoids exposing raw printer ports to internet-borne exploits.
42. **What is the role of `lease_expires_at` in the `print_jobs` table?**
    - *Answer*: It sets a deadline (typically 3–5 minutes) on an edge agent's lock. If the agent crashes or disconnects without reporting completion, the lease reaper detects the expired timestamp and reclaims the job.
43. **What is the difference between `PRINT_FAILED` and `DISPATCH_FAILED`?**
    - *Answer*: `DISPATCH_FAILED` occurs when the cloud cannot route the job to any active edge agent or printer. `PRINT_FAILED` occurs after the job has been accepted by the edge agent, but the printer encounters a hardware failure (paper jam, out of toner, tray empty).
44. **How are integers used to represent currency in HEDS?**
    - *Answer*: All monetary values (`amount`, `total_amount_paise`, `refund_amount`) are stored as 64-bit integers in minor currency units (paise for INR, cents for USD). This completely eliminates floating-point rounding errors common in financial calculations.
45. **What is the purpose of the `IdempotencyKey` database table?**
    - *Answer*: It stores the client-provided `Idempotency-Key` header, the request path, the request hash, and the cached response payload. If a duplicate request arrives while the first is processing or completed, the cached response is returned immediately.
46. **What is the role of Alembic in HEDS?**
    - *Answer*: Alembic manages relational database schema migrations. It tracks schema revisions in code, enabling repeatable, reversible migrations across development, testing, and production PostgreSQL databases.
47. **How does the frontend POS console avoid layout jumping in high-throughput queues?**
    - *Answer*: In `apps/shop-dashboard`, the queue table action column is constrained with strict utility classes (`w-[160px] min-w-[160px] max-w-[160px]`) and uniform `36px` height button containers, preventing horizontal layout shifting when buttons transition from "Mark Collected" to "Done".
48. **How does the mobile client prevent double-taps on payment confirmation?**
    - *Answer*: The submission buttons implement local optimistic state locking (`isSubmitting = true`), disabling the DOM element, rendering an inline loading spinner, and preventing duplicate HTTP POST dispatches.
49. **Explain how `capabilities_json` is structured on the `Printer` model.**
    - *Answer*: It is a JSONB column containing attributes like `{"color": true, "duplex": true, "paper_sizes": ["A4", "A3"], "dpi": 600, "ppm": 35}`. This allows dynamic querying and matching without requiring rigid column schemas.
50. **What is the Monochrome Affinity optimization in queue scheduling?**
    - *Answer*: When a job requires black-and-white printing, the scheduler prioritizes monochrome-only printers over color printers. This reserves high-cost color toner and specialized color drums for color jobs.
51. **How does the system ensure document privacy after a job is printed?**
    - *Answer*: Uploaded documents are saved with restricted filesystem permissions. Upon order completion or expiration, scheduled retention tasks purge raw files from storage, retaining only anonymized audit metadata.
52. **Why does HEDS use Next.js API rewrites in `apps/student-qr`?**
    - *Answer*: `next.config.js` rewrites `/api/:path*` to the internal Docker network backend address (`http://backend:8000/api/:path*`), avoiding cross-origin resource sharing (CORS) complexity on mobile browsers.
53. **What is the difference between `EXPIRED` and `CANCELLED` order states?**
    - *Answer*: `EXPIRED` is an automated system transition triggered when a student initiates an order but fails to complete payment within the allowable window (e.g., 15 minutes). `CANCELLED` is an explicit user- or operator-initiated action.
54. **How are audit logs recorded during state transitions?**
    - *Answer*: `OrderStateMachine.transition()` automatically inserts a record into the `audit_logs` table containing `order_id`, `from_state`, `to_state`, `actor_type` (SYSTEM, OPERATOR, STUDENT), and optional contextual metadata within the same atomic transaction.
55. **How does HEDS handle LibreOffice conversion failures on corrupt files?**
    - *Answer*: The subprocess execution is wrapped with a strict timeout (e.g., 30 seconds) and exit code validation. If LibreOffice crashes or hangs, the process is terminated, and the order is marked `VALIDATION_FAILED` with an informative error message.
56. **What is the function of the `agents` table in the database?**
    - *Answer*: It registers active counter edge daemons, storing their unique hardware identifier, connected shop ID, authentication token hash, network IP, software version, and `last_heartbeat_at` timestamp.
57. **How does HEDS detect offline edge agents?**
    - *Answer*: Edge agents transmit a heartbeat payload every 10–30 seconds. If `last_heartbeat_at` is older than the configured threshold (e.g., 90 seconds), the agent is marked `OFFLINE` and excluded from job dispatching.
58. **Why are Pickup OTPs stored as hashes if OTP verification is enabled?**
    - *Answer*: To protect student order integrity. Even if the database is compromised, an attacker cannot read plaintext pickup codes to claim sensitive documents at the counter.
59. **What is the function of `sanitize_filename()` in `backend/app/modules/documents/service.py`?**
    - *Answer*: It strips directory traversal sequences (`../`, `..\\`), null bytes, and non-whitelisted characters, preventing attackers from writing files outside the designated upload directory.
60. **How does HEDS support both duplex (double-sided) and single-sided pricing?**
    - *Answer*: The pricing engine calculates sheet consumption based on the `duplex` flag: a 10-page single-sided job uses 10 sheets, while a 10-page duplex job uses 5 sheets. Pricing rules can charge separately per page and per sheet.
61. **What is the function of `apps/student-web` versus `apps/student-qr`?**
    - *Answer*: `apps/student-web` is a desktop portal tailored for students submitting large academic projects, theses, or bulk documents from personal computers. `apps/student-qr` is a lightweight, zero-login mobile web client optimized specifically for rapid phone scanning at the Xerox counter.
62. **How does HEDS prevent SQL injection when querying dynamic filter parameters?**
    - *Answer*: All database queries use SQLAlchemy 2.0 object-relational expressions and parameterized query builders. Raw SQL concatenation is strictly forbidden.
63. **What is the purpose of the `PaymentGateway` abstract base class?**
    - *Answer*: It establishes an interface (`create_order`, `verify_payment`, `refund`) allowing HEDS to switch seamlessly between `MockPaymentGateway` (for offline testing) and `RazorpayPaymentGateway` (for real transactions) without altering business logic.
64. **What happens if an edge agent receives a job for a printer that is currently out of paper?**
    - *Answer*: The adapter's `get_status()` returns `PRINTER_MEDIA_EMPTY`. The agent pauses execution, notifies the cloud backend with error details, and transitions the job to `PRINT_FAILED` or retries after a backoff period.
65. **Why does HEDS use Pydantic v2 schemas for all API payloads?**
    - *Answer*: Pydantic v2 provides high-performance C-compiled data parsing, type enforcement, automatic serialization, and automatic OpenAPI JSON documentation generation.
66. **What is the role of `guest_access_token` in student order security?**
    - *Answer*: It is a cryptographic 32-byte secret generated when the guest order is created. The student client includes this token in API requests to view status or download receipts, preventing unauthorized third parties from accessing the order.
67. **How does HEDS handle CORS (Cross-Origin Resource Sharing)?**
    - *Answer*: FastAPI's `CORSMiddleware` is configured with explicit origin whitelists drawn from environment variables (`ALLOWED_ORIGINS`), permitting only authorized frontend domains to execute cross-origin requests.
68. **What is the difference between synchronous and asynchronous database operations in SQLAlchemy?**
    - *Answer*: Synchronous operations block the Python thread while waiting for network socket responses from PostgreSQL. Asynchronous operations (`AsyncSession`) yield control back to the `asyncio` event loop, enabling a single backend worker to process thousands of concurrent requests.
69. **How does HEDS maintain test database isolation in `tests/conftest.py`?**
    - *Answer*: Tests execute against an isolated test PostgreSQL database. Each test function runs inside an isolated database transaction that rolls back upon completion, ensuring zero state leakage between tests.
70. **What is the purpose of the `StatusBadge.tsx` component in the frontend?**
    - *Answer*: It centralizes semantic status tokens and visual styling across all 18 order states, ensuring uniform colors, badges, and typography across both the operator dashboard and the student clients.

---

### Advanced Questions (71–110)
71. **How do you handle clock skew between cloud servers and distributed edge devices?**
    - *Answer*: Edge agents never calculate lease expiration timestamps locally. All lease deadlines (`lease_expires_at`) are computed authoritatively on the PostgreSQL server using `NOW() + INTERVAL '5 MINUTES'`. The agent only tracks relative remaining durations (e.g., renewing every $T / 2$ seconds).
72. **What occurs if a network partition drops connection immediately after Razorpay captures payment, before the cloud marks the order `PAID`?**
    - *Answer*: Razorpay's automated webhook retry mechanism delivers the signed `payment.captured` event to `/api/v1/payments/webhook`. The backend verifies the signature, looks up the order by payment reference, idempotently transitions it to `PAID`, and enqueues the print job.
73. **How does HEDS prevent deadlock during concurrent multi-row batch updates?**
    - *Answer*: When updating multiple rows (e.g., reordering jobs or updating multiple documents), HEDS always sorts target entity IDs in ascending alphanumeric order before issuing locks:
      ```python
      stmt = select(PrintJob).where(PrintJob.id.in_(sorted_ids)).with_for_update()
      ```
      This guarantees all concurrent transactions acquire row locks in the exact same sequence, eliminating cyclic wait deadlocks.
74. **Explain how HEDS scales PostgreSQL queue workers from 10 to 10,000 shops without database degradation.**
    - *Answer*: 
      1. Add connection pooling via PgBouncer in transaction pooling mode.
      2. Partition the `print_jobs` table by `shop_id` using PostgreSQL list partitioning, keeping queue indexes compact and memory-resident.
      3. Shift edge agents from continuous 3-second HTTP polling to Server-Sent Events (SSE) or WebSocket push notifications, notifying agents only when a matching job is inserted.
      4. Offload document binary storage completely to Amazon S3 / MinIO, keeping PostgreSQL tables lean.
75. **How does the system ensure zero duplicate prints if an edge worker process is forcefully killed (`SIGKILL`) during printing?**
    - *Answer*: Because the agent was killed, it cannot report completion. The job's lease eventually expires in the cloud. However, the cloud reconciler *does not* re-queue the job automatically; it transitions the order to `RECONCILING`. An operator must verify whether physical pages were output before re-triggering the print or marking it complete.
76. **How would you implement distributed tracing across the student mobile client, FastAPI orchestrator, and Python edge agent?**
    - *Answer*: By propagating standard W3C `traceparent` headers (`TraceContext`). The Next.js client generates a trace ID; FastAPI intercepts it, logs incoming requests with that ID, injects it into the database job record, and passes it in the lease payload to the edge agent. The edge agent includes the trace ID in all CUPS logging and cloud callbacks.
77. **What happens if an edge agent downloads a 100MB PDF document and runs out of local disk space?**
    - *Answer*: The edge agent's download routine checks available disk capacity via `shutil.disk_usage()` prior to streaming. If free space is below a safety threshold (e.g., 500MB), the agent rejects the lease with `ERROR_INSUFFICIENT_STORAGE`, prompting the cloud to route the job to an alternative agent or alert the shopkeeper.
78. **How does HEDS protect against PDF decompression bomb attacks?**
    - *Answer*: When parsing uploaded PDFs via `pypdf`, HEDS limits the maximum recursion depth, sets memory boundaries on stream decompression, and verifies that the total uncompressed page dimension (width $\times$ height $\times$ page count) does not exceed standard architectural limits.
79. **Explain how multi-tenancy is enforced at the database layer to prevent cross-shop data leaks.**
    - *Answer*: Every business table (`orders`, `printers`, `agents`, `print_jobs`) includes a non-nullable `shop_id` foreign key. All repository access methods enforce `where(Model.shop_id == current_shop_id)`. In high-security enterprise tiers, PostgreSQL Row-Level Security (RLS) policies enforce this constraint directly at the database engine level.
80. **How would you migrate HEDS from a modular monolith to distributed microservices if transaction volume grew 100x?**
    - *Answer*: By decomposing along established domain module boundaries:
      1. Extract the **Document Processing Service** (LibreOffice/Pillow) to an asynchronous worker fleet reading from an S3 event queue.
      2. Extract the **Payment Webhook Service** into an independent stateless edge service.
      3. Maintain the **Order Core & State Machine** as the authoritative coordinator, replacing in-memory calls with gRPC or event-driven messaging via Apache Kafka.
81. **Explain the difference between optimistic locking and pessimistic locking, and where each is used in HEDS.**
    - *Answer*: Pessimistic locking acquires explicit database locks up front (`SELECT FOR UPDATE`), preventing any concurrent access; HEDS uses this in the print queue to eliminate race conditions during job claiming. Optimistic locking does not lock rows up front, but validates a version token or timestamp before committing; HEDS uses this in the frontend dashboard to detect concurrent operator updates.
82. **What occurs if the database connection drops while an edge agent is executing `QueueService.poll_and_lease_job`?**
    - *Answer*: The database transaction rolls back automatically. The row lock held by `FOR UPDATE SKIP LOCKED` is immediately released by PostgreSQL, leaving the print job in the `QUEUED` state for subsequent workers to claim without manual intervention.
83. **How does HEDS ensure memory efficiency when handling multi-gigabyte document streams on the backend?**
    - *Answer*: The FastAPI upload handler uses streaming file buffers (`SpooledTemporaryFile`), which buffer small payloads in RAM and automatically spill large payloads to disk. Documents are streamed directly to destination storage without reading entire multi-megabyte payloads into Python heap memory.
84. **How would you handle an operator accidentally marking an order as collected before handing over paper?**
    - *Answer*: The order history maintains an immutable audit log detailing the exact timestamp and operator identity of the collection event. If paper was not delivered, the operator can view the completed order in the `Orders` archive and re-queue a reprint with an administrative audit tag.
85. **Why is CUPS spooling decoupled from the Python edge agent process via asynchronous worker threads?**
    - *Answer*: Interfacing with physical hardware over USB or network sockets can block unexpectedly (e.g., if a printer enters a sleep state or buffer stall). Running spooling routines in background threads prevents hardware I/O latency from starving the agent's cloud heartbeat loop.
86. **How does HEDS ensure that duplicate payment webhooks received simultaneously do not create two print jobs?**
    - *Answer*: The payment webhook handler wraps processing in a database transaction with a unique database constraint on `payments.transaction_reference`. If two webhooks arrive concurrently, the second insert violates the unique constraint and aborts, returning an HTTP 200 with the existing payment record.
87. **What is the mathematical worst-case time complexity of the FSM transition check?**
    - *Answer*: $\mathcal{O}(1)$. State transitions are stored as a hash table mapping `OrderState` enum keys to sets of allowed destination `OrderState` enums (`ALLOWED_TRANSITIONS[current_state]`). Membership validation is an instant hash-lookup.
88. **How does HEDS handle printer capability changes while jobs are waiting in the queue?**
    - *Answer*: The edge agent updates printer capabilities in the cloud during its periodic heartbeat. When a worker polls the queue, the scheduler evaluates capability matching against the printer's *current* registered state, dynamically skipping jobs the hardware can no longer support (e.g., if color toner runs out).
89. **Explain how the `test_chaos_lease_expiry_reconciliation` test in `tests/` verifies fault tolerance.**
    - *Answer*: The test inserts a job in `DISPATCHED` state, artificially sets `lease_expires_at` to a past timestamp, invokes the reconciliation service, and asserts that the job state transitions to `RECONCILING` while emitting an audit event.
90. **What security vulnerability does constant-time string comparison prevent in webhook verification?**
    - *Answer*: It prevents **Timing Attacks**. Standard string comparisons (`a == b`) terminate early on the first mismatched byte, allowing an attacker to deduce the secret HMAC signature byte-by-byte by measuring microsecond differences in server response times. `hmac.compare_digest` always executes in constant time regardless of where mismatches occur.
91. **How does HEDS prevent replay attacks on API endpoints?**
    - *Answer*: Every sensitive mutating request includes a unique `Idempotency-Key` and a client timestamp. The server verifies that the timestamp falls within an acceptable freshness window (e.g., $\pm 5$ minutes) and checks that the idempotency key has not been processed previously.
92. **Why does HEDS store prices in paise rather than rupees?**
    - *Answer*: Minor currency units (paise) are integers. In IEEE 754 floating-point arithmetic, expressions like `0.1 + 0.2` yield `0.30000000000000004`, leading to financial discrepancies. Using integers guarantees exact mathematical precision across all calculations, splits, and taxes.
93. **What is the role of `asyncpg` in the database architecture?**
    - *Answer*: `asyncpg` is a high-performance asynchronous PostgreSQL driver for Python. It bypasses standard C-extensions like `libpq` and communicates directly with PostgreSQL's binary frontend/backend protocol, offering up to 3x higher throughput than synchronous drivers.
94. **How does the edge agent handle corrupted PDF files that pass initial cloud validation?**
    - *Answer*: The CUPS adapter pre-validates PDF files locally using `pdfinfo` or `ghostscript` in syntax-check mode prior to spooling. If the local parser detects corrupt xref tables, the agent flags `PRINT_FAILED` locally without sending invalid raster bytes to the printer.
95. **What happens if a shop's internet bandwidth is severely constrained (e.g., 2G mobile hotspot)?**
    - *Answer*: The edge agent throttles its polling frequency dynamically via exponential backoff during periods of network congestion and utilizes resumeable HTTP range requests (`Range: bytes=X-Y`) to download documents incrementally without restarting failed transfers from zero.
96. **How does HEDS isolate background tasks from synchronous HTTP request threads in FastAPI?**
    - *Answer*: Long-running operations (such as document format conversions and notifications) are dispatched via `BackgroundTasks` or an asynchronous task worker pool, ensuring the initial HTTP request returns an immediate response without blocking the client.
97. **Why does HEDS use a single Next.js monorepo for its frontend applications?**
    - *Answer*: A monorepo architecture enables shared UI component libraries, centralized TypeScript type definitions (e.g., API request/response contracts), and consistent styling tokens across `student-qr`, `student-web`, and `shop-dashboard` while maintaining independent build artifacts.
98. **How does HEDS maintain backward compatibility when updating database schemas with Alembic?**
    - *Answer*: By following a strict expand-and-contract migration strategy: new columns are added with default values or nullable flags; application code is updated to write to both old and new columns; data is backfilled; and old columns are dropped only in subsequent releases.
99. **What is the purpose of the `reconcile_expired_leases()` background job?**
    - *Answer*: It acts as an asynchronous garbage collector for distributed locks. It scans the database periodically for jobs whose `lease_expires_at` has passed, transitions them out of `DISPATCHED`, and alerts the shop operator.
100. **How does HEDS prevent denial-of-service via concurrent file uploads on a single server?**
     - *Answer*: The backend employs rate limiting (via a token bucket algorithm keyed on client IP), restricts maximum request payload sizes at the Nginx/FastAPI layer, and limits the number of concurrent LibreOffice conversion subprocesses using an asynchronous semaphore (`asyncio.Semaphore(4)`).
101. **Explain the purpose of the `User` and `ShopMember` models in multi-tenant authorization.**
     - *Answer*: `User` represents a globally unique human identity (with email, password hash, and global role). `ShopMember` is an associative mapping entity that assigns that user specific granular permissions (OWNER, MANAGER, OPERATOR) within a specific `Shop`.
102. **How does HEDS handle zero-page documents or empty files?**
     - *Answer*: The document inspection engine validates that the page count is strictly greater than zero (`page_count >= 1`). Empty files trigger an immediate `EMPTY_DOCUMENT` validation exception and abort order creation.
103. **What happens if an edge agent receives a job intended for another shop?**
     - *Answer*: The cloud API cryptographically validates the agent's authentication token and extracts its bound `shop_id`. The queue query strictly filters by `WHERE shop_id = :agent_shop_id`, making it architecturally impossible for an agent to claim another shop's jobs.
104. **Why is the PDF receipt generated on the backend with ReportLab instead of the frontend using HTML canvas?**
     - *Answer*: Frontend canvas/HTML rendering varies significantly across mobile browsers, operating systems, and screen densities. Backend ReportLab generation produces an immutable, cryptographically verifiable, standard-compliant vector PDF that renders identically on any device.
105. **How does HEDS ensure graceful shutdown of edge agent daemons?**
     - *Answer*: The Python agent intercepts `SIGINT` and `SIGTERM` signals. Upon interception, it pauses polling, finishes spooling the active in-flight job, commits the local SQLite transaction, notifies the cloud backend of its impending shutdown, and exits cleanly.
106. **Explain how `test_payment_signature_verification_failure` protects financial integrity.**
     - *Answer*: The test sends a forged webhook payload with an invalid HMAC signature and asserts that the payment controller returns an HTTP 400 Bad Request, leaves the order in `PAYMENT_PENDING`, and records a security audit log.
107. **How does HEDS handle partial refunds if a multi-document order partially fails?**
     - *Answer*: The state machine transitions the order to `REFUND_PENDING`. The payment gateway interface supports calculating partial amounts based on unprinted page counts, issuing an authoritative partial refund via the payment gateway API.
108. **What is the significance of the `order_number` field in the `orders` table?**
     - *Answer*: It provides a human-readable, sequential counter identifier (such as `51`) scoped to the shop and business day, making it easy for students and operators to communicate at the counter while keeping the underlying UUID private.
109. **How would you implement end-to-end encryption for uploaded documents in HEDS?**
     - *Answer*: Documents would be encrypted client-side in WebAssembly using the shop's public key before upload. The ciphertext would be stored in object storage. The edge agent, possessing the shop's private key in a secure hardware enclave or TPM, would decrypt the file locally prior to spooling.
110. **What is the ultimate engineering invariant of the HEDS printing system?**
     - *Answer*: **Software state must always remain strictly idempotent and crash-consistent, while physical hardware state must be treated as inherently fallible and safely reconciled through operator visibility.**

---

### System Design & Architecture Deep Dives (111–125)

#### 111. Design HEDS from Scratch (Complete System Architecture)
- **Functional Requirements**:
  1. Zero-login student document submission via counter QR code.
  2. Authoritative page counting, document normalization, and pricing.
  3. Digital payment gating with instant pickup token generation.
  4. Reliable cloud-to-edge job dispatching to on-premise counter printers.
  5. Real-time operator queue management and counter collection confirmation.
- **Non-Functional Requirements**:
  1. Zero duplicate physical prints under edge network or hardware failure.
  2. High availability of cloud submission portal (99.9% uptime).
  3. Low latency pickup token generation (< 2 seconds post-payment).
  4. End-to-end data isolation between distinct print shops.
- **High-Level Architectural Topology**:
  ```text
  +---------------------------------------------------------------------------------+
  |                                 CLOUD TIER                                      |
  |                                                                                 |
  |  [Mobile Student QR]       [Desktop Student]         [Shop Operator Console]    |
  |       (Port 3002)             (Port 3000)                  (Port 3001)          |
  |            |                       |                            |               |
  |            +-----------------------+----------------------------+               |
  |                                    | (HTTPS / REST)                             |
  |                                    v                                            |
  |                         [FastAPI Modular Monolith]                              |
  |                                    |                                            |
  |         +--------------------------+--------------------------+                 |
  |         |                          |                          |                 |
  |         v                          v                          v                 |
  |  [Order State Machine]       [Pricing Engine]       [Payment Gateway Interface] |
  |         |                          |                          |                 |
  |         +--------------------------+--------------------------+                 |
  |                                    |                                            |
  |                                    v                                            |
  |                           [PostgreSQL 16 DB]                                    |
  |                    - orders (ACID State Transitions)                            |
  |                    - print_jobs (FOR UPDATE SKIP LOCKED)                        |
  |                    - documents, payments, audit_logs                            |
  +------------------------------------|--------------------------------------------+
                                       |
                       HTTPS Outbound Long-Poll / REST
                                       |
  +------------------------------------v--------------------------------------------+
  |                             LOCAL SHOP COUNTER                                  |
  |                                                                                 |
  |                       [Python HEDS Edge Agent]                                  |
  |                                    |                                            |
  |         +--------------------------+--------------------------+                 |
  |         |                                                     |                 |
  |         v                                                     v                 |
  |  [Local SQLite Queue]                                [PrinterAdapter]           |
  |  (Crash Durability WAL)                                       |                 |
  |                                                               v                 |
  |                                                      [Linux CUPS / IPP]         |
  |                                                               |                 |
  |                                                               v                 |
  |                                                    [Physical Xerox Hardware]    |
  +---------------------------------------------------------------------------------+
  ```
- **Failure Modes & Mitigations**:
  - *Cloud Disconnect*: Leased jobs persist in local SQLite; printing continues autonomously.
  - *Agent Crash*: Cloud lease timer expires; job flagged as `RECONCILING` to prevent automated duplicate printing.

#### 112. Design a Concurrency-Safe Distributed Print Queue
- **Requirements**: Support thousands of concurrent workers polling for jobs without deadlocks, duplicate claims, or race conditions.
- **Core Database Schema**:
  ```sql
  CREATE TABLE print_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL REFERENCES orders(id),
      shop_id UUID NOT NULL REFERENCES shops(id),
      printer_id UUID REFERENCES printers(id),
      status VARCHAR(32) NOT NULL DEFAULT 'QUEUED',
      lease_id UUID,
      leased_at TIMESTAMPTZ,
      lease_expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX idx_queue_poll ON print_jobs (shop_id, status, created_at)
  WHERE status = 'QUEUED';
  ```
- **Atomic Polling Primitive**:
  ```sql
  WITH candidate AS (
      SELECT id FROM print_jobs
      WHERE shop_id = :shop_id AND status = 'QUEUED'
      ORDER BY created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
  )
  UPDATE print_jobs
  SET status = 'DISPATCHED',
      lease_id = :new_lease_id,
      leased_at = NOW(),
      lease_expires_at = NOW() + INTERVAL '5 MINUTES'
  FROM candidate
  WHERE print_jobs.id = candidate.id
  RETURNING print_jobs.*;
  ```

#### 113. Design a Secure, Idempotent Payment Webhook Processing Subsystem
- **Requirements**: Guarantee that payment callbacks from third-party gateways (Razorpay, Stripe) are verified, replay-resistant, and strictly idempotent.
- **Workflow Architecture**:
  1. Webhook arrives at `/api/v1/payments/webhook`.
  2. Compute cryptographic HMAC-SHA256 signature using raw payload bytes and verify in constant time.
  3. Extract gateway event ID (e.g., `pay_293847293`).
  4. Check `idempotency_keys` table for existing event ID within transaction:
     - If found: return cached HTTP 200 immediately.
     - If not found: insert key, update order state to `PAID`, insert payment record, enqueue print job, and commit atomically.
- **Failure Handling**:
  - If database commit fails after signature check, transaction rolls back; gateway receives HTTP 500 and retries safely.

#### 114. Design a Scalable Multi-Tenant Document Upload & Inspection Pipeline
- **Requirements**: Handle simultaneous student uploads of multi-format documents (PDF, DOCX, PNG, JPG) with strict security isolation, page counting, and format normalization.
- **Pipeline Breakdown**:
  ```text
  [Client Upload] 
         │ (Stream Multipart)
         ▼
  [Magic Byte Inspection] ──(Invalid)──► [HTTP 400 Rejected]
         │ (Valid)
         ▼
  [Format Classification]
    ├── PDF  ──► [pypdf Page Counter & Metadata Extractor]
    ├── Word ──► [Headless LibreOffice Subprocess Sandbox] ──► [Canonical PDF]
    └── Img  ──► [Pillow Canvas Normalization (A4 Canvas)] ──► [Canonical PDF]
         │
         ▼
  [Private Storage Engine (S3 / Local Vault)]
         │
         ▼
  [Authoritative Pricing Engine (Paise Minor Units)]
  ```

---

### Hands-On Coding Challenges & Solutions (126–135)

#### 126. Implement Atomic Queue Leasing with PostgreSQL and SQLAlchemy
- **Problem**: Write an asynchronous Python service method that atomically claims an unleased print job for an edge agent using row-level locking.
- **Implementation**:
  ```python
  import uuid
  from datetime import datetime, timedelta, timezone
  from sqlalchemy import select, update
  from sqlalchemy.ext.asyncio import AsyncSession
  from app.modules.queue.models import PrintJob, JobStatus

  async def claim_next_job(
      db: AsyncSession, shop_id: uuid.UUID, lease_duration_sec: int = 300
  ) -> PrintJob | None:
      # Step 1: Query next queued job with SKIP LOCKED
      stmt = (
          select(PrintJob)
          .where(PrintJob.shop_id == shop_id, PrintJob.status == JobStatus.QUEUED)
          .order_by(PrintJob.created_at.asc())
          .with_for_update(skip_locked=True)
          .limit(1)
      )
      result = await db.execute(stmt)
      job = result.scalars().first()
      if not job:
          return None

      # Step 2: Assign lease
      new_lease_id = uuid.uuid4()
      now = datetime.now(timezone.utc)
      job.status = JobStatus.DISPATCHED
      job.lease_id = new_lease_id
      job.leased_at = now
      job.lease_expires_at = now + timedelta(seconds=lease_duration_sec)

      await db.commit()
      await db.refresh(job)
      return job
  ```

#### 127. Implement an Authoritative Page Pricing Calculator
- **Problem**: Calculate total order price in integer paise with support for duplex discounts and color premiums.
- **Implementation**:
  ```python
  def calculate_authoritative_price(
      page_count: int,
      color: bool,
      duplex: bool,
      copies: int = 1,
      bw_rate_paise: int = 100,      # ₹1.00 base rate
      color_rate_paise: int = 1000,   # ₹10.00 color rate
      duplex_discount_paise: int = 20 # ₹0.20 discount per 2-sided sheet
  ) -> dict:
      if page_count < 1 or copies < 1:
          raise ValueError("Page count and copies must be positive integers")

      base_rate = color_rate_paise if color else bw_rate_paise
      raw_page_cost = page_count * base_rate

      # Calculate duplex sheet reduction
      discount = 0
      if duplex and page_count > 1:
          sheets = (page_count + 1) // 2
          discount = (page_count - sheets) * duplex_discount_paise

      per_copy_total = max(0, raw_page_cost - discount)
      grand_total_paise = per_copy_total * copies

      return {
          "total_pages": page_count * copies,
          "copies": copies,
          "rate_per_page_paise": base_rate,
          "duplex_discount_paise": discount * copies,
          "grand_total_paise": grand_total_paise,
          "grand_total_inr": grand_total_paise / 100.0
      }
  ```

#### 128. Implement an Idempotent API Execution Decorator
- **Problem**: Implement a Python decorator that checks for duplicate requests using an idempotency key.
- **Implementation**:
  ```python
  import functools
  from fastapi import Request, HTTPException
  from app.modules.system.models import IdempotencyKey

  def idempotent_action():
      def decorator(func):
          @functools.wraps(func)
          async def wrapper(*args, **kwargs):
              request: Request = kwargs.get("request")
              db = kwargs.get("db")
              key_str = request.headers.get("Idempotency-Key") if request else None

              if not key_str or not db:
                  return await func(*args, **kwargs)

              # Check existing key
              existing = await db.get(IdempotencyKey, key_str)
              if existing:
                  if existing.status == "COMPLETED":
                      return existing.response_payload
                  raise HTTPException(status_code=409, detail="Request already in progress")

              # Register key in IN_PROGRESS state
              record = IdempotencyKey(key=key_str, status="IN_PROGRESS")
              db.add(record)
              await db.commit()

              try:
                  result = await func(*args, **kwargs)
                  record.status = "COMPLETED"
                  record.response_payload = result
                  await db.commit()
                  return result
              except Exception as e:
                  await db.delete(record)
                  await db.commit()
                  raise e
          return wrapper
      return decorator
  ```

#### 129. Implement an Exponential Backoff Retry Decorator with Jitter
- **Problem**: Write a resilient retry utility for hardware polling and cloud agent callbacks.
- **Implementation**:
  ```python
  import asyncio
  import random
  import logging

  def retry_with_backoff(max_retries: int = 5, base_delay: float = 1.0, max_delay: float = 30.0):
      def decorator(func):
          async def wrapper(*args, **kwargs):
              attempt = 0
              while True:
                  try:
                      return await func(*args, **kwargs)
                  except Exception as exc:
                      attempt += 1
                      if attempt > max_retries:
                          logging.error(f"Function {func.__name__} failed after {max_retries} attempts.")
                          raise exc
                      # Full jitter backoff
                      sleep_time = min(max_delay, base_delay * (2 ** (attempt - 1)))
                      jitter = random.uniform(0, sleep_time)
                      logging.warning(f"Attempt {attempt} failed: {exc}. Retrying in {jitter:.2f}s...")
                      await asyncio.sleep(jitter)
          return wrapper
      return decorator
  ```

#### 130. Implement a Finite State Machine Transition Validator
- **Problem**: Implement the core state machine transition validator from `backend/app/modules/orders/state_machine.py`.
- **Implementation**:
  ```python
  class OrderState(str, Enum):
      CREATED = "CREATED"
      PAID = "PAID"
      QUEUED = "QUEUED"
      DISPATCHED = "DISPATCHED"
      PRINTING = "PRINTING"
      PICKUP_READY = "PICKUP_READY"
      COMPLETED = "COMPLETED"
      RECONCILING = "RECONCILING"

  ALLOWED_TRANSITIONS = {
      OrderState.CREATED: {OrderState.PAID},
      OrderState.PAID: {OrderState.QUEUED},
      OrderState.QUEUED: {OrderState.DISPATCHED},
      OrderState.DISPATCHED: {OrderState.PRINTING, OrderState.RECONCILING},
      OrderState.PRINTING: {OrderState.PICKUP_READY, OrderState.RECONCILING},
      OrderState.PICKUP_READY: {OrderState.COMPLETED},
      OrderState.RECONCILING: {OrderState.QUEUED, OrderState.COMPLETED},
      OrderState.COMPLETED: set(),
  }

  def validate_transition(current_state: OrderState, target_state: OrderState) -> bool:
      if target_state not in ALLOWED_TRANSITIONS.get(current_state, set()):
          raise ValueError(f"Illegal state transition: {current_state} -> {target_state}")
      return True
  ```

---

### Core SQL Interview Queries (136–150)

#### 136. Find the Orders Waiting Longest in the Queue
```sql
SELECT 
    o.id,
    o.order_number,
    o.created_at,
    NOW() - o.created_at AS wait_duration
FROM orders o
WHERE o.status = 'QUEUED'
ORDER BY o.created_at ASC
LIMIT 10;
```

#### 137. Calculate Total Authoritative Revenue Today Grouped by Shop
```sql
SELECT 
    s.id AS shop_id,
    s.name AS shop_name,
    COUNT(p.id) AS total_transactions,
    SUM(p.amount) / 100.0 AS total_revenue_inr
FROM payments p
JOIN orders o ON p.order_id = o.id
JOIN shops s ON o.shop_id = s.id
WHERE p.status = 'CAPTURED'
  AND p.created_at >= CURRENT_DATE
GROUP BY s.id, s.name
ORDER BY total_revenue_inr DESC;
```

#### 138. Calculate Total Pages Printed Per Hour Over the Last 24 Hours
```sql
SELECT 
    date_trunc('hour', pj.updated_at) AS print_hour,
    SUM(ps.page_count * ps.copies) AS total_pages_printed
FROM print_jobs pj
JOIN orders o ON pj.order_id = o.id
JOIN print_specifications ps ON o.id = ps.order_id
WHERE pj.status = 'COMPLETED'
  AND pj.updated_at >= NOW() - INTERVAL '24 HOURS'
GROUP BY 1
ORDER BY 1 DESC;
```

#### 139. Find Printers with the Highest Hardware Failure Rate
```sql
SELECT 
    pr.id AS printer_id,
    pr.name AS printer_name,
    COUNT(pj.id) AS total_attempted_jobs,
    COUNT(CASE WHEN pj.status = 'FAILED' THEN 1 END) AS failed_jobs,
    ROUND(
        COUNT(CASE WHEN pj.status = 'FAILED' THEN 1 END)::NUMERIC / 
        NULLIF(COUNT(pj.id), 0) * 100, 2
    ) AS failure_percentage
FROM printers pr
JOIN print_jobs pj ON pr.id = pj.printer_id
GROUP BY pr.id, pr.name
HAVING COUNT(pj.id) >= 10
ORDER BY failure_percentage DESC;
```

#### 140. Identify Abandoned Job Leases Requiring Reconciliation
```sql
SELECT 
    pj.id AS job_id,
    pj.order_id,
    pj.lease_id,
    pj.leased_at,
    pj.lease_expires_at,
    NOW() - pj.lease_expires_at AS expired_by
FROM print_jobs pj
WHERE pj.status = 'DISPATCHED'
  AND pj.lease_expires_at < NOW();
```

---

## 59. Critical Traps & Anti-Bluffing Guidelines

### Top 10 Things You Must NEVER Claim in an Interview:
1. **NEVER claim you guarantee "exactly-once" physical printing.** Physical printing can jam, lose power, or drop offline mid-page. Claim: *"We guarantee exactly-once software state, and at-most-once automated physical execution with operator reconciliation."*
2. **NEVER claim live Razorpay production payments are running.** The code contains a production-ready cryptographic boundary and sandbox implementation.
3. **NEVER claim you run microservices.** You run a clean, modular monolith.
4. **NEVER claim the frontend calculates prices.** The backend is the sole pricing authority.
5. **NEVER claim Cloudflare Tunnel is your permanent production infrastructure.** It is a temporary demo tool for mobile phone evaluation.
6. **NEVER claim the edge agent has open inbound ports.** It is strictly outbound-only.
7. **NEVER claim CUPS works on Windows without modification.** CUPS is a POSIX/Linux standard.
8. **NEVER claim you benchmarked 100,000 concurrent users.** State your actual verified test metrics (50 automated tests).
9. **NEVER claim page counts are detected in JavaScript.** Page counts are extracted authoritatively on the backend via `pypdf`.
10. **NEVER claim students must enter an OTP.** Token pickup `#51` is the current, streamlined design.

---

## 60. Comprehensive Self-Assessment Quiz Bank (200 Questions)

Test your knowledge before an interview. The quiz is divided into four 50-question tiers. Master answers are organized by section in the answer key below.

### Section A: Beginner Quiz (Questions 1–50)
1. What does the HEDS acronym stand for?
2. What HTTP method is used to upload documents to the backend?
3. What is the default base price per black-and-white page in HEDS?
4. What database technology is used on the cloud orchestrator?
5. What database technology is used on the local edge agent?
6. What is the name of the edge daemon database file?
7. How does a student access the storefront at a counter?
8. Does a student need to create an account with a password?
9. What token format is displayed to the student after payment?
10. Who calculates the authoritative price for an order?
11. What Python framework is used to build the cloud backend?
12. What frontend framework powers the user interfaces?
13. What CSS framework is used across all frontend apps?
14. What standard port does the student QR client run on?
15. What standard port does the shop dashboard run on?
16. What standard port does the student desktop web portal run on?
17. What standard port does the FastAPI backend run on?
18. What tool manages database schema migrations in HEDS?
19. What library extracts page counts from uploaded PDF files?
20. What tool converts DOCX files to PDF on the server?
21. What image library normalizes JPG and PNG uploads?
22. What is the maximum single file upload size allowed?
23. What is the maximum total upload size for staged orders?
24. What state does an order start in upon creation?
25. What state follows CREATED after the student initiates checkout?
26. What state follows PAYMENT_PENDING upon successful payment capture?
27. What state does an order enter when queued for printing?
28. What state does an order enter when claimed by an edge agent?
29. What state does an order enter when bytes are spooling to the printer?
30. What state indicates the paper is waiting in the counter tray?
31. What state indicates the student has collected their paper?
32. What state is entered if physical execution is ambiguous?
33. What clause allows PostgreSQL to skip locked rows during queue polling?
34. What distributed lock prevents two agents from claiming the same job?
35. How does the edge agent discover printers on Linux?
36. What is the standard printing protocol used by modern network printers?
37. What type of token secures guest order tracking URLs?
38. Does the edge agent open any inbound ports to the internet?
39. What library generates authoritative PDF receipts on the backend?
40. What HTTP header provides idempotency protection on mutating endpoints?
41. What currency unit is used to store monetary amounts in the database?
42. How many passing automated tests exist in the HEDS test suite?
43. What Makefile command executes the automated test suite?
44. What container virtualization platform runs the HEDS local stack?
45. What utility exposes the local QR client to mobile phones during demos?
46. What payment gateway boundary is implemented in the codebase?
47. What cryptographic algorithm verifies Razorpay webhook signatures?
48. What table records every order state transition for compliance?
49. What database pattern decouples domain events from external dispatching?
50. What is the primary physical business location targeted by HEDS?

---

### Section B: Intermediate Quiz (Questions 51–100)
51. Why is `SELECT FOR UPDATE SKIP LOCKED` preferred over a standard `SELECT FOR UPDATE`?
52. How does the order state machine prevent illegal transitions?
53. What happens if an uploaded PDF is password encrypted?
54. How does HEDS calculate the price for a 10-page duplex document?
55. What prevents an attacker from guessing other customers' order URLs?
56. Why is SQLite used on the edge device instead of an in-memory queue?
57. What happens if the shop loses internet after a job is downloaded to the edge?
58. What happens if the edge agent crashes while printing?
59. How does the cloud lease reaper detect an abandoned job?
60. What is the difference between `PRINT_FAILED` and `DISPATCH_FAILED`?
61. What is the difference between `EXPIRED` and `CANCELLED` order states?
62. How does the payment gateway interface support both sandbox and live modes?
63. Why are webhook signatures compared using constant-time comparison?
64. What prevents double-charging if a user clicks "Pay" twice rapidly?
65. How does the edge agent authenticate with the cloud backend?
66. How does the system detect that an edge agent has gone offline?
67. What is the Monochrome Affinity scheduling optimization?
68. How does the dashboard prevent table layout shifting during queue updates?
69. What library is used for asynchronous database queries in Python?
70. How are database migrations executed during Docker container startup?
71. How does the frontend handle API routing to avoid CORS issues on mobile?
72. Why are document filenames sanitized before saving to disk?
73. What is stored in the `printer.capabilities_json` database column?
74. How does HEDS determine how many sheets of paper a job requires?
75. What happens if LibreOffice hangs during a document conversion?
76. What is the role of `ShopMember` in multi-tenant authorization?
77. Why are monetary values stored as integers rather than floating-point numbers?
78. How does the edge agent handle `SIGINT` or `SIGTERM` signals?
79. How does HEDS isolate tests in `tests/conftest.py`?
80. What role does `BackgroundTasks` play in FastAPI endpoints?
81. Why is direct browser-to-printer printing not viable in commercial shops?
82. What happens if a payment webhook arrives before the frontend redirects?
83. How does the edge agent resume a download if the connection drops midway?
84. What prevents an edge agent from claiming jobs belonging to another shop?
85. How does the operator mark an order as collected on the dashboard?
86. What information is printed on the authoritative PDF receipt?
87. Why are Pickup OTPs stored as salted hashes if OTP mode is enabled?
88. What is the function of the `OutboxEvent` table?
89. How does HEDS clean up temporary document files after printing?
90. What is the Two Generals' Paradox in physical printing?
91. Why does HEDS deliberately avoid using Apache Kafka at current scale?
92. Why does HEDS deliberately avoid using Redis at current scale?
93. What is the function of the `StatusBadge.tsx` component?
94. How does HEDS validate that an uploaded file is actually a PDF?
95. What is the default heartbeat interval for the edge agent?
96. What is the default lease timeout for a dispatched print job?
97. How does the mobile QR client optimize for mobile camera scanners?
98. What happens if an order is in `RECONCILING` state?
99. How does HEDS handle partial failure in a multi-file upload?
100. What is the ultimate invariant of the HEDS printing architecture?

---

### Section C: Advanced Quiz (Questions 101–150)
101. How does HEDS prevent deadlocks when updating multiple print jobs concurrently?
102. Explain the exact mechanism by which clock skew is mitigated in job leasing.
103. How does PostgreSQL enforce tenant isolation if Row-Level Security is active?
104. What is the time complexity of the FSM transition validation check?
105. How does HEDS handle memory exhaustion when converting multi-gigabyte files?
106. Why is CUPS spooling handled in a separate thread from the agent heartbeat?
107. What happens if an edge agent receives a job but its local disk is 100% full?
108. How would you shard HEDS horizontally across 10,000 Xerox shops?
109. Explain how distributed tracing headers propagate through the HEDS pipeline.
110. How does HEDS protect against PDF decompression bomb attacks?
111. What prevents replay attacks on API endpoints in the payment subsystem?
112. Explain the expand-and-contract migration strategy in Alembic.
113. How does the queue scheduler handle dynamic printer capability changes?
114. How does `asyncpg` achieve higher throughput than standard `psycopg2`?
115. Explain how client-side end-to-end document encryption could be designed.
116. How does the chaos test in `tests/` verify lease expiry reconciliation?
117. What happens if a payment webhook arrives with an invalid HMAC signature?
118. How does HEDS calculate partial refunds for partially failed orders?
119. What is the difference between pessimistic and optimistic locking in HEDS?
120. How does the system handle database disconnects during queue polling?
121. What happens if an operator accidentally marks an order collected prematurely?
122. How does the edge agent pre-validate PDF files before spooling to CUPS?
123. How does HEDS throttle concurrent LibreOffice conversions to prevent DoS?
124. What role does `order_number` play compared to `order_id`?
125. How would you design zero-downtime database failover for the cloud tier?
126. Explain the dual-write consistency problem when using Redis with PostgreSQL.
127. Why does Kafka introduce head-of-line blocking in print queues?
128. How does the mobile frontend handle optimistic UI updates during checkout?
129. How does HEDS prevent timing attacks on webhook signature validation?
130. What happens if an edge agent is forcefully killed with `SIGKILL` while printing?
131. How does HEDS handle zero-page or corrupted document uploads?
132. What is the database index structure required for fast queue polling?
133. How does HEDS ensure transactional consistency between orders and outbox events?
134. Explain how pre-signed S3 URLs would replace local storage in production.
135. What is the impact of connection pool exhaustion on FastAPI request handlers?
136. How does the edge agent report real-time print progress back to the cloud?
137. How would you design a load-shedding mechanism for peak campus rush hours?
138. What happens if two edge agents attempt to lease the same expired job?
139. How does HEDS isolate test databases during parallel pytest runs?
140. What is the security risk of storing unhashed pickup OTPs?
141. Explain how capability matching evaluates multi-attribute printer constraints.
142. How does HEDS prevent directory traversal attacks during document storage?
143. What is the role of PgBouncer in scaling PostgreSQL queue polling?
144. How does the edge agent detect that a local printer has run out of paper?
145. Why is the modular monolith pattern optimal for the current HEDS stage?
146. How does HEDS handle currency conversions if deployed internationally?
147. What happens if an edge agent's local SQLite queue becomes corrupted?
148. How does HEDS ensure graceful termination during Kubernetes pod eviction?
149. What metric indicates that queue polling is experiencing database contention?
150. Why can software never guarantee physical "exactly-once" delivery?

---

### Section D: Rapid-Fire Technical Drill (Questions 151–200)
151. Name the queue concurrency clause in PostgreSQL.
152. Name the default black-and-white page rate in paise.
153. Name the cloud database technology.
154. Name the edge local database technology.
155. Name the primary backend framework.
156. Name the frontend application framework.
157. Name the PDF inspection library.
158. Name the Office-to-PDF conversion software.
159. Name the image normalization library.
160. Name the vector PDF receipt generator.
161. Name the Linux printing spooler daemon.
162. Name the standard network printing protocol.
163. Name the state an order enters when claimed by an agent.
164. Name the state entered when physical execution is ambiguous.
165. Name the counter pickup token displayed to students.
166. Name the HTTP status code returned for idempotency conflict.
167. Name the cryptographic hash algorithm for Razorpay webhooks.
168. Name the Python async database driver.
169. Name the database migration tool.
170. Name the total number of passing automated tests.
171. Name the command to run the test suite.
172. Name the component that reclaims abandoned job leases.
173. Name the frontend port for the shop dashboard.
174. Name the frontend port for the student QR client.
175. Name the frontend port for the desktop student portal.
176. Name the port for the FastAPI backend.
177. Name the header used to prevent duplicate API requests.
178. Name the maximum single file upload limit.
179. Name the maximum staged order upload limit.
180. Name the model that stores hardware printer details.
181. Name the model that registers counter edge daemons.
182. Name the model that tracks individual print executions.
183. Name the model that stores itemized print parameters.
184. Name the model that tracks financial transactions.
185. Name the model that records state transition history.
186. Name the table that stores asynchronous outbox events.
187. Name the column that tracks lease deadlines on print jobs.
188. Name the column that stores unguessable order access tokens.
189. Name the scheduling strategy that reserves color printers for color jobs.
190. Name the tool used to tunnel localhost to mobile phones during demos.
191. Name the Python concurrency module used by FastAPI.
192. Name the database lock type that skips locked rows.
193. Name the order state immediately preceding COMPLETED.
194. Name the order state immediately following CREATED.
195. Name the order state immediately following PAYMENT_PENDING.
196. Name the order state entered when hardware paper jams occur.
197. Name the order state entered when file conversion fails.
198. Name the design pattern used to structure the backend codebase.
199. Name the physical counter action that marks an order collected.
200. Name the golden rule of HEDS physical execution.

---

### Master Quiz Answer Key & Explanations

<details>
<summary><b>Click to View Answers: Questions 1–50 (Beginner)</b></summary>

1. Hybrid Edge Distributed Print System.
2. HTTP POST (multipart/form-data).
3. ₹1.00 (100 paise).
4. PostgreSQL 16.
5. SQLite 3.
6. `local_queue.db`.
7. Scanning a counter QR code flyer with their smartphone camera.
8. No, orders use unguessable guest access tokens.
9. A numeric counter token (e.g., `#51`).
10. The FastAPI cloud backend pricing engine.
11. FastAPI (Python 3.11+).
12. Next.js 14 (React 18).
13. Tailwind CSS.
14. Port 3002.
15. Port 3001.
16. Port 3000.
17. Port 8000.
18. Alembic.
19. `pypdf`.
20. Headless LibreOffice.
21. Pillow (PIL).
22. 50 Megabytes.
23. 100 Megabytes.
24. `CREATED`.
25. `PAYMENT_PENDING`.
26. `PAID`.
27. `QUEUED`.
28. `DISPATCHED`.
29. `PRINTING`.
30. `PICKUP_READY`.
31. `COMPLETED`.
32. `RECONCILING`.
33. `SKIP LOCKED`.
34. A time-bounded job lease (`lease_id` and `lease_expires_at`).
35. Querying the local CUPS daemon via `pycups` bindings.
36. IPP (Internet Printing Protocol).
37. A 32-byte cryptographically secure URL-safe token.
38. No, it initiates strictly outbound HTTPS requests.
39. ReportLab.
40. `Idempotency-Key`.
41. Integer paise (minor currency units).
42. Exactly 50 passing tests.
43. `make test` (or `pytest tests/ -v`).
44. Docker and Docker Compose.
45. Cloudflare Tunnel (`cloudflared`).
46. `RazorpayPaymentGateway` (with `MockPaymentGateway` for tests).
47. HMAC-SHA256.
48. `audit_logs`.
49. The Transactional Outbox pattern (`outbox_events`).
50. High-volume campus Xerox and print shops.
</details>

<details>
<summary><b>Click to View Answers: Questions 51–100 (Intermediate)</b></summary>

51. Standard `FOR UPDATE` makes workers wait, causing queue head-of-line contention. `SKIP LOCKED` skips locked rows instantly, enabling lock-free concurrent polling.
52. By validating requested transitions against an explicit hash map of permitted target states (`ALLOWED_TRANSITIONS`).
53. `pypdf` detects encryption and raises a `DOCUMENT_ENCRYPTED` validation error, rejecting the upload cleanly.
54. It calculates the required physical sheets (5 sheets for 10 pages) and applies duplex sheet discounts to the base rate.
55. Orders use unguessable 32-byte cryptographic random tokens rather than sequential IDs.
56. To survive local PC reboots, power cuts, or process crashes without losing active job leases.
57. The job persists in local SQLite and prints autonomously; completion status syncs back once connection restores.
58. The lease expires in the cloud; the lease reaper transitions the order to `RECONCILING` to await operator review.
59. By querying `WHERE status = 'DISPATCHED' AND lease_expires_at < NOW()`.
60. `DISPATCH_FAILED` occurs before an agent claims the job; `PRINT_FAILED` occurs on physical hardware failure during execution.
61. `EXPIRED` is an automated timeout when checkout is abandoned; `CANCELLED` is an explicit user or operator cancellation.
62. Through the `PaymentGateway` abstraction interface, swapping implementations via environment configuration.
63. To eliminate timing side-channels where attackers deduce valid HMAC signatures byte-by-byte.
64. The frontend disables the submit button optimistically, and the backend enforces idempotency keys.
65. Via a pre-shared agent authentication key transmitted in the `X-Agent-Key` or `Authorization` header.
66. By checking if `agents.last_heartbeat_at` is older than the configured offline threshold (e.g., 90s).
67. Prioritizing monochrome printers for black-and-white jobs to reserve color toner for color jobs.
68. By fixing the action column width (`w-[160px] min-w-[160px] max-w-[160px]`) and using uniform 36px button containers.
69. `asyncpg` combined with SQLAlchemy's `AsyncSession`.
70. Containers execute `alembic upgrade head` in their startup entrypoint scripts before launching Uvicorn.
71. By configuring Next.js rewrites in `next.config.js` to proxy `/api/*` to the backend container.
72. To prevent path traversal attacks (`../../etc/passwd`) and filesystem exploits.
73. A JSONB object specifying color support, duplex support, supported paper sizes, and resolution.
74. `sheets = (page_count + 1) // 2` for duplex; `sheets = page_count` for single-sided.
75. A process timeout kills the subprocess and marks the order `VALIDATION_FAILED`.
76. It maps users to specific shops with granular roles (OWNER, MANAGER, OPERATOR).
77. To prevent IEEE 754 floating-point rounding errors in currency and tax arithmetic.
78. It finishes the active spooling job, commits local SQLite state, notifies the cloud, and exits cleanly.
79. Each test executes inside an isolated transaction that rolls back upon completion.
80. It offloads non-blocking asynchronous tasks (file conversion, emails) from the main request-response cycle.
81. Browsers cannot access local USB/LAN devices due to sandbox security, NAT routers, and dynamic IPs.
82. The webhook handler idempotently marks the order `PAID` and enqueues the job; the client observes the updated state.
83. Using HTTP range headers (`Range: bytes=X-Y`) to download only missing byte chunks.
84. All queue queries enforce `WHERE shop_id = :agent_shop_id` derived from the agent's verified credentials.
85. By clicking "Mark Collected" in `apps/shop-dashboard`, transitioning the order from `PICKUP_READY` to `COMPLETED`.
86. Shop branding, itemized page counts, duplex/color options, subtotal, taxes, payment transaction ID, and token.
87. To prevent attackers who gain read access to the database from viewing plaintext counter pickup codes.
88. It guarantees reliable event delivery by writing events to PostgreSQL within the same transaction as business data.
89. Background cleanup tasks delete expired temporary files from disk after a configured retention window.
90. The impossibility of two nodes (cloud and printer) guaranteeing synchronized physical state over an unreliable network.
91. Kafka is an event stream, not a task queue; it introduces high operational overhead and head-of-line blocking.
92. Redis lacks relational foreign key constraints and introduces dual-write failure modes with PostgreSQL.
93. It provides centralized, consistent badge styling across all 18 order states in the frontend applications.
94. By checking the `%PDF-` magic byte sequence in the file header and parsing the cross-reference table with `pypdf`.
95. Every 10 to 30 seconds.
96. 300 seconds (5 minutes).
97. High-contrast QR codes with short redirect URLs and no client-side redirects.
98. The job requires manual counter operator inspection to verify physical output before re-printing or completing.
99. Valid files are processed; invalid files trigger descriptive errors allowing the user to replace only the failed file.
100. Software state must remain strictly idempotent, while physical hardware state is safely reconciled by operators.
</details>

<details>
<summary><b>Click to View Answers: Questions 101–150 (Advanced)</b></summary>

101. By sorting all target row IDs in ascending order before acquiring row locks (`with_for_update()`).
102. All lease deadlines are calculated exclusively on the database server using `NOW() + INTERVAL '5 MINUTES'`.
103. PostgreSQL evaluates the RLS policy (`USING (shop_id = current_setting('app.current_shop_id'))`) on every query.
104. $\mathcal{O}(1)$ instant dictionary/hash-set lookup.
105. By streaming file chunks directly to disk (`SpooledTemporaryFile`) without buffering full payloads in RAM.
106. Hardware I/O stalls or sleep states must never block the agent from transmitting timely heartbeats to the cloud.
107. The agent pre-checks disk space via `shutil.disk_usage()` and rejects leases with `ERROR_INSUFFICIENT_STORAGE`.
108. Shard PostgreSQL by `tenant_id`/`shop_id`, use PgBouncer, offload storage to S3, and push notifications via SSE.
109. Using W3C `traceparent` headers forwarded across HTTP requests, database job records, and CUPS logs.
110. Restricting recursion depth, capping stream expansion memory, and verifying total dimensional canvas areas.
111. Client timestamps validated against a freshness window ($\pm 5$ min) paired with unique `Idempotency-Key` tracking.
112. Adding new columns as nullable, dual-writing in code, backfilling historical data, and dropping old columns later.
113. The edge agent reports updated capabilities in its heartbeat; queue queries filter jobs against current attributes.
114. It communicates directly with PostgreSQL's binary protocol, bypassing `libpq` C-extensions and overhead.
115. Client encrypts files with shop's public key; edge agent decrypts locally using private key stored in TPM.
116. Setting `lease_expires_at` in the past, running the reconciler, and asserting transition to `RECONCILING`.
117. Returns HTTP 400 Bad Request, leaves the order in `PAYMENT_PENDING`, and writes a security audit log.
118. Calculating unprinted page costs and issuing a programmatic partial refund call to the gateway API.
119. Pessimistic locks lock rows immediately (`FOR UPDATE`); optimistic locks validate version tokens upon commit.
120. The transaction rolls back automatically, immediately releasing all held locks back to the pool.
121. The operator locates the order in the historical archive and triggers an administrative re-print with an audit note.
122. Running `pdfinfo` or Ghostscript in syntax-check mode to verify xref tables before submitting to CUPS.
123. An asynchronous semaphore (`asyncio.Semaphore(4)`) restricts concurrent conversion subprocesses.
124. `order_id` is an internal unguessable UUID; `order_number` is a friendly daily counter token (`#51`) for humans.
125. Multi-AZ replication with automated failover via AWS RDS or Patroni with health-checked DNS endpoints.
126. A write can succeed in PostgreSQL but fail in Redis, creating an unsynchronized distributed state.
127. If message 1 in a partition blocks on a slow printer, messages 2–10 in that partition cannot be consumed by others.
128. Buttons disable instantly, spinners render inline, and state updates optimistically before network responses arrive.
129. `hmac.compare_digest` compares strings in constant execution time regardless of character match positions.
130. The lease expires in the cloud; the lease reaper flags the order as `RECONCILING` for manual counter review.
131. Document inspection rejects zero-page files with an `EMPTY_DOCUMENT` validation exception.
132. `CREATE INDEX idx_queue_poll ON print_jobs (shop_id, status, created_at) WHERE status = 'QUEUED'`.
133. Inserting outbox events in the exact same database transaction and commit as the business state change.
134. Clients upload directly to S3 using short-lived pre-signed PUT URLs, bypassing backend application servers.
135. Incoming requests block waiting for available database connections, eventually throwing HTTP 500 or timing out.
136. The agent streams progress updates to `/api/v1/jobs/{id}/progress`, updating `pages_printed` in the cloud.
137. Returning HTTP 429 to unprioritized requests while prioritizing existing staged checkout transactions.
138. `SELECT FOR UPDATE SKIP LOCKED` guarantees only one worker acquires the row; the second worker skips it.
139. Running tests inside independent PostgreSQL transactions that rollback cleanly upon test completion.
140. Database leaks would expose plaintext codes, allowing unauthorized parties to claim confidential customer prints.
141. The query checks that `printer.capabilities_json` contains all required attributes (duplex, color, paper size).
142. `sanitize_filename()` strips `../`, null bytes, and path separators, writing files strictly inside sandboxes.
143. Pooling and multiplexing database connections to handle thousands of concurrent polling connections efficiently.
144. `PrinterAdapter.get_status()` detects `PRINTER_MEDIA_EMPTY` and pauses job execution.
145. It provides ACID transaction boundaries, fast development velocity, and low operational overhead at current scale.
146. Storing all prices with an explicit ISO-4217 currency code and executing all arithmetic in minor currency units.
147. The agent deletes the corrupted SQLite file, recreates schema from scratch, and re-leases active jobs from the cloud.
148. Intercepting `SIGTERM`, finishing in-flight jobs, releasing cloud leases, and terminating gracefully within grace periods.
149. Rising `pg_stat_activity` lock wait times or query execution spikes on `SELECT FOR UPDATE`.
150. Physical devices can fail, jam, or lose power mid-operation without the ability to guarantee physical delivery.
</details>

<details>
<summary><b>Click to View Answers: Questions 151–200 (Rapid-Fire)</b></summary>

151. `FOR UPDATE SKIP LOCKED`.
152. 100 paise.
153. PostgreSQL 16.
154. SQLite 3.
155. FastAPI.
156. Next.js 14.
157. `pypdf`.
158. Headless LibreOffice.
159. Pillow (PIL).
160. ReportLab.
161. CUPS (Common Unix Printing System).
162. IPP (Internet Printing Protocol).
163. `DISPATCHED`.
164. `RECONCILING`.
165. `#51` (Token pickup number).
166. HTTP 409 Conflict.
167. HMAC-SHA256.
168. `asyncpg`.
169. Alembic.
170. Exactly 50.
171. `make test` (or `pytest tests/ -v`).
172. The Lease Reconciler / Reaper (`reconcile_expired_leases`).
173. Port 3001.
174. Port 3002.
175. Port 3000.
176. Port 8000.
177. `Idempotency-Key`.
178. 50 MB.
179. 100 MB.
180. `Printer`.
181. `Agent`.
182. `PrintJob`.
183. `PrintSpecification`.
184. `Payment`.
185. `AuditLog`.
186. `outbox_events`.
187. `lease_expires_at`.
188. `guest_access_token`.
189. Monochrome Affinity.
190. Cloudflare Tunnel (`cloudflared`).
191. `asyncio`.
192. `SKIP LOCKED`.
193. `PICKUP_READY`.
194. `PAYMENT_PENDING`.
195. `PAID`.
196. `PRINT_FAILED`.
197. `VALIDATION_FAILED`.
198. Modular Monolith.
199. Clicking "Mark Collected" on the dashboard.
200. Software state is strictly idempotent; physical printing is safely reconciled.
</details>

---

## 61. Final Executive Master Cheat Sheet

### HEDS in 30 Seconds
"HEDS is a cloud-to-edge print orchestration platform built for high-volume campus Xerox shops. Students scan a counter QR flyer, upload documents, receive server-authoritative page counts and pricing, pay digitally, and receive an instant pickup token like `#51`. The cloud manages a concurrency-safe queue using PostgreSQL `SELECT FOR UPDATE SKIP LOCKED`, and an on-premise Python edge agent leases and executes jobs on local printers via CUPS without exposing printer ports to the public internet."

### HEDS in 1 Minute
"HEDS eliminates the manual chaos of university print shops—where students wait in long lines sending files over WhatsApp or unvetted USB drives. The architecture consists of three tiers:
1. **Public Storefront (`apps/student-qr`)**: A mobile Next.js app where students configure prints, get authoritative pricing in minor currency units, and pay.
2. **Cloud Orchestrator (`backend/app`)**: A FastAPI modular monolith enforcing an 18-state transition state machine, PostgreSQL transactional queue, and cryptographic payment webhooks.
3. **Edge Agent (`agent/heds_agent`)**: A resilient local Python daemon running on counter hardware with a local SQLite queue and Linux CUPS printer adapters.
By decoupling submission from physical execution, HEDS eliminates counter congestion, prevents duplicate prints through leased timeouts, and provides operators with real-time operational analytics."

### Architecture in 10 Lines
1. **Client Tier**: Next.js 14 mobile QR client (`apps/student-qr`, port 3002) with zero student logins.
2. **API Gateway**: FastAPI asynchronous REST API running on Python 3.11+ (port 8000).
3. **Document Engine**: Headless LibreOffice, Pillow, and `pypdf` for canonical PDF conversion and page counting.
4. **State Machine**: 18-state validated transition graph (`OrderStateMachine`) with atomic audit logs.
5. **Database**: PostgreSQL 16 managing relational entities, JSONB capabilities, and transactional outbox events.
6. **Print Queue**: PostgreSQL-backed job queue dispatching tasks via `SELECT FOR UPDATE SKIP LOCKED`.
7. **Lease Reaper**: Background reconciler detecting expired leases and transitioning them to `RECONCILING`.
8. **Edge Daemon**: Python daemon polling cloud outbound over HTTPS, with local SQLite crash durability.
9. **Hardware Adapter**: Modular `PrinterAdapter` interfacing with Linux CUPS/IPP and test mock adapters.
10. **POS Console**: Next.js 14 operator dashboard (`apps/shop-dashboard`, port 3001) with 1-click token pickup.

---

### Top 20 Technical Facts
1. Base pricing is authoritatively ₹1.00 (100 paise) per page for black and white.
2. All currency values are stored as 64-bit integers in minor units (paise) to eliminate floating-point errors.
3. Queue polling uses `SELECT ... FOR UPDATE SKIP LOCKED` for zero-contention job dispatching.
4. The order lifecycle enforces an 18-state transition graph with strict $\mathcal{O}(1)$ dictionary validation.
5. Edge agents never accept inbound network connections; they communicate strictly via outbound HTTPS polling.
6. Edge agents persist leases to an embedded SQLite database (`local_queue.db`) using WAL mode.
7. Job leases carry finite deadlines (`lease_expires_at`) calculated authoritatively on the database server.
8. Expired leases transition to `RECONCILING` rather than auto-retrying, preventing duplicate physical paper waste.
9. Student access uses unguessable 32-byte cryptographic random URL-safe tokens, avoiding sequential ID enumeration.
10. Razorpay payment webhooks are verified using constant-time HMAC-SHA256 signature checking.
11. Mutating endpoints enforce idempotency via the `Idempotency-Key` header cached in `idempotency_keys`.
12. PDF receipts are generated authoritatively on the backend using ReportLab vector graphics.
13. Document uploads are restricted to a maximum of 50MB per file and 100MB per staged order.
14. Uploaded files are validated via magic byte inspection (`%PDF-`) and sanitized against path traversal.
15. Office files (DOCX) are converted to canonical PDFs using headless LibreOffice in an isolated subprocess.
16. Image files (PNG, JPG) are normalized onto an A4 PDF canvas using Pillow (PIL).
17. The queue scheduler implements Monochrome Affinity, reserving color printers for color documents.
18. Counter pickup uses a human-friendly token (`#51`) requiring zero OTP friction at crowded counters.
19. The test suite contains exactly 50 passing automated unit, e2e, chaos, and reliability tests.
20. The entire system is structured as a modular monolith within a single clean Python domain package layout.

---

### Top 20 Verified Numbers & Metrics
1. **50**: Total passing automated tests in the repository test suite (`make test`).
2. **18**: Explicit order states in the `OrderState` enum.
3. **100**: Base price in paise for a standard black-and-white page (₹1.00).
4. **1000**: Color price in paise for a color page (₹10.00).
5. **300**: Default lease timeout in seconds (5 minutes) assigned to dispatched jobs.
6. **32**: Number of bytes in unguessable guest access tokens.
7. **50 MB**: Maximum allowable single file upload size.
8. **100 MB**: Maximum allowable combined file upload size per order.
9. **30 seconds**: Timeout limit on LibreOffice document conversion subprocesses.
10. **10–30 seconds**: Configured heartbeat transmission interval for edge agents.
11. **90 seconds**: Inactivity threshold after which an edge agent is marked `OFFLINE`.
12. **3000**: Port number for `apps/student-web` (desktop student portal).
13. **3001**: Port number for `apps/shop-dashboard` (operator POS console).
14. **3002**: Port number for `apps/student-qr` (mobile student storefront).
15. **8000**: Port number for the FastAPI backend API.
16. **5432**: Standard PostgreSQL port number.
17. **160px**: Fixed width of the operator dashboard queue action column to prevent layout jumping.
18. **36px**: Uniform height of operator action buttons.
19. **0**: Number of inbound ports opened by the edge agent.
20. **1**: Authoritative pricing engine (the backend; frontend has 0 pricing authority).

---

### Top 20 Critical Interview Questions
1. *Why use PostgreSQL as a queue instead of Celery or Redis?* (Transactional consistency with order/payment state; elimination of dual-write bugs).
2. *How does `FOR UPDATE SKIP LOCKED` prevent worker contention?* (Workers skip rows currently locked by other transactions instantly without waiting).
3. *Can physical printing guarantee exactly-once delivery?* (No; hardware failures can occur mid-print. Software is idempotent; hardware is reconciled).
4. *What happens if an edge agent crashes while printing?* (The lease expires; the lease reaper transitions the order to `RECONCILING`).
5. *Why not connect mobile browsers directly to local printers?* (Printers sit behind NAT/firewalls, lack public IPs, and cannot safely accept public traffic).
6. *How are prices verified?* (Exclusively on the backend; client prices are completely ignored).
7. *How does the system prevent duplicate webhook execution?* (Unique database constraints on transaction references and idempotency keys).
8. *Why is SQLite used on the edge device?* (Zero-configuration embedded ACID durability across local power cuts).
9. *What prevents ID enumeration attacks?* (32-byte cryptographic random URL-safe tokens instead of sequential integer IDs).
10. *How does the system handle encrypted PDFs?* (`pypdf` detects encryption and raises a `DOCUMENT_ENCRYPTED` validation error).
11. *What is Monochrome Affinity?* (Scheduling monochrome jobs to black-and-white printers to preserve expensive color hardware).
12. *How are timing attacks prevented on payment webhooks?* (Constant-time string comparison via `hmac.compare_digest`).
13. *What is the role of the Transactional Outbox pattern?* (Atomic decoupling of domain events from external message dispatching).
14. *Why was token pickup `#51` chosen over OTP verification?* (To eliminate counter friction and maximize throughput during campus peak hours).
15. *How does the system prevent PDF decompression bombs?* (Restricting recursion depth and checking dimensional canvas limits).
16. *What does the operator do when an order reaches `PICKUP_READY`?* (Hands over the paper and clicks "Mark Collected", transitioning to `COMPLETED`).
17. *How does HEDS handle LibreOffice hangs?* (Strict subprocess timeouts kill the process and flag `VALIDATION_FAILED`).
18. *Why are monetary values stored in paise?* (To eliminate IEEE 754 floating-point rounding errors).
19. *How does the edge agent authenticate?* (Pre-shared cryptographic secret sent in the authorization header).
20. *How does HEDS scale to 10,000 shops?* (Tenant partitioning, PgBouncer, direct S3 uploads, and SSE job wakeups).

---

### Top 20 Traps & Anti-Patterns to Avoid
1. Do NOT claim physical printing is "exactly-once".
2. Do NOT claim Razorpay live payments are running in production.
3. Do NOT claim HEDS is built with microservices.
4. Do NOT claim the frontend calculates or overrides prices.
5. Do NOT claim Cloudflare Tunnel is a production hosting solution.
6. Do NOT claim the edge agent has open inbound ports.
7. Do NOT claim CUPS works natively on Windows without emulation.
8. Do NOT claim unverified scale metrics (e.g., 100,000 concurrent users).
9. Do NOT claim page counting happens in client JavaScript.
10. Do NOT claim students are required to enter an OTP for counter pickup.
11. Do NOT use floating-point numbers for currency calculations.
12. Do NOT use sequential integer IDs in public student URLs.
13. Do NOT use standard `==` string comparison for cryptographic HMACs.
14. Do NOT re-queue expired print jobs automatically without operator inspection.
15. Do NOT execute blocking file conversions in the main HTTP request loop.
16. Do NOT poll the database without `SKIP LOCKED` when using `FOR UPDATE`.
17. Do NOT store sensitive uploaded files in public web directories.
18. Do NOT trust client-supplied MIME types without inspecting magic bytes.
19. Do NOT store raw unhashed OTPs in the database if OTP mode is enabled.
20. Do NOT assume the local shop PC has a stable, continuous internet connection.

---

### Top 20 Architectural Tradeoffs
1. **PostgreSQL Queue vs. Redis**: Traded high-throughput in-memory speed for ACID transactional consistency and relational foreign keys.
2. **Modular Monolith vs. Microservices**: Traded independent service deployments for simplified development, single-transaction commits, and zero network hops.
3. **HTTP Polling vs. WebSockets**: Traded instant push latency for NAT traversal simplicity, state-free reconnection, and firewall compatibility.
4. **Local SQLite vs. In-Memory Queue**: Traded microsecond queue latency for durable crash recovery across counter power cuts.
5. **Token Pickup vs. OTP Verification**: Traded biometric/cryptographic identity proof for frictionless counter pickup speed.
6. **Backend PDF Generation vs. Browser Print**: Traded client-side rendering speed for standardized, immutable, multi-device vector receipts.
7. **Pessimistic Locking vs. Optimistic Locking**: Traded queue write throughput for strict zero-contention job dispatching.
8. **Server-Side Conversion vs. Client-Side WASM**: Traded server CPU overhead for universal format compatibility and authoritative page counting.
9. **Ephemeral File Storage vs. Permanent Archival**: Traded historical document retrieval for strict customer privacy and minimal storage costs.
10. **Monochrome Affinity vs. Simple FIFO**: Traded pure queue simplicity for hardware toner and drum cost optimization.
11. **Subprocess Sandboxing vs. Native C Bindings**: Traded execution startup speed for process isolation and crash containment.
12. **Next.js Monorepo vs. Independent Repos**: Traded independent repository versioning for shared TypeScript types and unified UI design tokens.
13. **Finite Leases vs. Indefinite Locks**: Traded lock simplicity for automated recovery from worker and agent crashes.
14. **Manual Reconciliation vs. Auto-Retry**: Traded automated retry speed for physical paper waste prevention and privacy protection.
15. **Paise Minor Units vs. Decimal Floats**: Traded floating-point convenience for absolute mathematical and financial precision.
16. **Pre-Shared Keys vs. Mutual TLS**: Traded enterprise certificate management complexity for rapid edge daemon installation.
17. **Fixed 160px Action Column vs. Dynamic Sizing**: Traded flexible table layout for zero visual jumping during queue state updates.
18. **Synchronous Payment Verification vs. Async Polling**: Traded webhook-only latency for instant student checkout feedback.
19. **Strict Magic Byte Checking vs. Extension Checking**: Traded upload processing speed for robust protection against malicious file uploads.
20. **Outbound-Only Polling vs. Inbound Webhooks**: Traded cloud-initiated push control for zero-configuration counter firewall traversal.

---

### Top 10 Failure Scenarios & System Responses
1. **Payment Card Declined**: Order remains in `PAYMENT_PENDING`, transitions to `PAYMENT_FAILED`; student notified; no print job created.
2. **Duplicate Webhook Received**: Idempotency key or unique transaction constraint catches event; cached HTTP 200 returned; no duplicate job queued.
3. **Edge Agent Crashes Mid-Print**: Lease timer expires in cloud; lease reaper transitions order to `RECONCILING`; operator inspects tray.
4. **Physical Printer Paper Jam**: Edge adapter catches hardware error; agent flags job `PRINT_FAILED`; operator resolves jam and clicks retry.
5. **Student Uploads Corrupted File**: Subprocess conversion timeout or parser catches corrupt data; order marked `VALIDATION_FAILED`.
6. **Local Counter Power Cut**: Agent terminates abruptly; leased job remains in local SQLite; on reboot, agent checks state and resumes or reconciles.
7. **Cloud Database Connection Drops**: In-flight polling transactions roll back automatically; PostgreSQL releases held row locks instantly.
8. **Student Closes Phone Browser**: Order and payment remain durable in PostgreSQL; printing continues; student reopens tracking link later.
9. **Operator Double-Clicks "Mark Collected"**: Optimistic loading state on button disables element; second request is rejected or handled idempotently.
10. **Printer Runs Out of Paper**: Agent detects `PRINTER_MEDIA_EMPTY`; agent pauses spooling and notifies cloud; order remains in `PRINTING` or flags warning.

---

### Top 10 Things You Must NEVER Claim
1. Never claim you guarantee physical "exactly-once" printing.
2. Never claim you have live Razorpay production payments running.
3. Never claim you run microservices.
4. Never claim the frontend calculates prices.
5. Never claim Cloudflare Tunnel is a permanent production architecture.
6. Never claim the edge agent has open inbound ports.
7. Never claim CUPS works natively on Windows without modification.
8. Never claim you benchmarked 100,000 concurrent users without automated evidence.
9. Never claim page counts are detected in client JavaScript.
10. Never claim students must enter an OTP for counter pickup.

