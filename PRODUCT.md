# Relay: from hackathon prototype to a product people choose

## Position
A personal communication interface that learns a person's observable movements, helps them identify usable signals, and makes those signals useful for original text and everyday phrases.

The initial product hypothesis is an affordable, local-first access and personalization layer for people who can intentionally repeat one or two camera-visible movements, with optional setup assistance. This is a hypothesis to validate with intended users and AAC practitioners, not a proven market segment.

## What this prototype establishes
- A user-defined recognition layer above pretrained computer vision.
- A complete communication loop: capture, train, check, select, correct, speak, recover.
- Transparent abstention and a visible distinction between training separation and new-attempt performance.
- Personal vocabulary and explicit word completion without transmitting private conversations.
- Profiles and drafts that can be retained locally.

## What could earn defensibility
The broad idea of gesture access and personal communication vocabularies has prior art. A stronger advantage would be evidence that our calibration workflow gets more people to dependable use with less assistance, plus accessible design, trustworthy behavior, and sustained relationships with users.

Model architecture alone is not the business. User trust, setup success, maintenance effort, support, and integration into daily communication are testable differentiators.

## First validation cycle
Invite 5–8 consenting people who use or evaluate alternative communication access, with AAC practitioner input where appropriate. Do not substitute non-disabled volunteers for that group. Compensate participants when resources permit and let participants choose communication tasks.

Measure:
- Whether the person can complete setup, and what assistance is needed.
- Comfortable gestures and fatigue across repeated sessions.
- Time to first original message and corrections needed.
- Accidental selections during ordinary rest and conversation.
- Words/characters communicated per minute alongside accuracy and effort.
- Performance the next day, after camera repositioning, and under different lighting.
- Which existing tool or workflow this would supplement, and whether they return voluntarily.

Keep person-level results separate. Report failures and rejected inputs, not only successful sessions. Define acceptance criteria with participants rather than borrowing the hackathon's small-sample practice milestones.

## Commercial hypotheses to test
1. **Individual tool:** a browser/local app for communication access, with setup and support as the main adoption challenge.
2. **Practitioner-assisted setup:** a workflow helping accessibility practitioners compare and configure personal access signals.
3. **Integration layer:** an embeddable input API for existing AAC software after the recognition layer is dependable.

Interview both the user and the prospective buyer before choosing a business model. Investigate willingness to pay and support cost with an actual usable pilot. Do not invent revenue, market size, reimbursement eligibility, or clinical outcomes for the pitch.

## Product gates before paid availability
- Repeat-session evidence with intended users and supported, clearly defined conditions.
- A way to recover from drift, fatigue, and camera changes without silently changing the user's meanings.
- Accessibility testing of setup, correction, pause/resume, and recovery.
- Privacy controls for drafts and movement-derived features, including clear deletion/export behavior.
- Security review, dependency/license inventory, a support plan, and a scoped assessment of applicable product obligations.
- Honest positioning that matches what has been tested.

## Recognition and visibility
After collecting real results:
- Publish a short technical case study with reproducible evaluation methods and limitations.
- Record an authentic end-to-end demonstration, including uncertainty rejection and correction.
- Credit participants only with explicit permission and their preferred wording.
- Present the lesson learned from a real workflow, rather than claiming a first-ever gesture interface.
- Seek accessibility practitioner feedback and relevant research/demo venues.

No outreach, public case study, or user-data sharing has been performed.

## Evidence informing these priorities
[ASHA AAC guidance](https://www.asha.org/practice-portal/professional-issues/augmentative-and-alternative-communication/) emphasizes individualized access and meaningful vocabulary. [AssistiveWare's personalization guidance](https://www.assistiveware.com/learn-aac/personalize-vocabulary-and-system) describes personal words and user-specific phrases. These inform product direction; they do not validate Relay's implementation or effectiveness.

## Next concrete decision
The founder's initial real-camera session established basic writing, correction, and speech. Next, use the working prototype to recruit co-design partners and measure repeat-session performance. Additional visual polish cannot replace that evidence.
