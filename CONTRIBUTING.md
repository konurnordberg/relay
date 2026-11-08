# Contributing to Relay

Useful feedback includes a reproducible bug, a clearer setup flow, an environment idea, or a measured improvement to recognition. Start with [local setup](docs/DEVELOPMENT.md) and the [architecture](docs/ARCHITECTURE.md).

## Report a problem

Include your browser and operating system, the environment you used, steps to reproduce, and what you expected. For camera issues, describe lighting, camera position, and the gesture without sharing private recordings or calibration files. A screenshot with personal details removed is often enough.

For an environment idea, describe the movement a person can reliably make, how choices should appear, and how they should confirm or correct a selection. Try composing it in Creator first; new perception signals may need code.

## Make a change

1. Keep the change focused and explain the behavior it improves.
2. Preserve saved profiles, installed environments, drafts, and message editing.
3. Add a regression test when fixing a behavior that can be tested meaningfully.
4. Run `npm test`, `npm run check`, and `npm run build`.
5. For interface changes, check keyboard access, narrow layouts, large text, and whether the camera and selection feedback stay visible.
6. Describe what you tested and what still needs real-camera testing in the pull request.

Do not include personal data, credentials, `.local/`, `artifacts/`, generated build directories, or model files without provenance and redistribution terms. Keep existing third-party notices intact.

The project is still a prototype. State the conditions and sample size behind performance claims, and distinguish software regression tests from results with people.

Relay's original application code does not currently have an open-source license. Public visibility is not a blanket license to redistribute it; third-party components have their own terms in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
