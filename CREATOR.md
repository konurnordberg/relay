# Creator space and private environment feed

Relay now has two spaces. **User space** keeps the existing communication tools. **Creator space** builds reusable environments from layouts, controls, and local recognition models. **Environment feed** shares published environments inside the existing private app, with upvotes, downvotes, installation, and remixing.

## First run: build the rotating dial

1. Open **Creator space → New environment**.
2. Name the environment, then add **Character dial**.
3. Choose **Fill with → A–Z**.
4. In Block settings, choose **Control with → Hand rotation**. The compatible MediaPipe Hands model is selected automatically.
5. Start with a 1,000 ms hold and 120 degrees per full dial turn. Adjust the range and direction for comfort.
6. Choose **Start camera preview**. Show a palm facing the camera, with the wrist and knuckles visible. Select **Center hand rotation**, then tilt the hand in the camera plane, as if turning a knob. The highlighted character sits under the top marker.
7. Hold to select once; move to another choice before selecting again. Tracking loss cancels the pending hold. After a page or confirmation change, make a fresh movement.
8. Test the separate preview message. **Use environment** installs a snapshot and opens User space; its text joins the normal message composer. Speaking and clearing still need confirmation.
9. Return to the editor and choose **Publish to feed**, review what will be shared, and confirm. This does not change the app's private audience.

Start with six large choices while rehearsing if 26 dial targets feel too close together. The rotation range, timing, labels, order, and outputs are editable. The dial uses wrist-to-knuckle orientation, not gaze tracking or a brain interface.

## Building blocks

| Layout | Useful controls and behavior |
| --- | --- |
| Character table | Learned Next/Select gestures, automatic scanning, one- or two-hand finger counts, rotation, fingertip hover, pointer |
| Character dial | Rotation and dwell, exact letter-path tracing, hover, scanning, pointer |
| Drawing pad | Local neural A–Z recognition or a personal sketch matcher trained with 2–5 examples per symbol |
| Swipe keyboard | Local whole-word path recognition using the creator's actual key positions; additional vocabulary is editable |
| Free layout | Position choices by dragging or numeric coordinates; combine with selection or path controls |

A choice can insert arbitrary text, add space, delete, undo, change case, request speech, pause, open a page, or focus another block. Page links extend the number of choices. Drag blocks or choices to reorder them; keyboard-accessible move buttons are provided. Drafts have edit undo/redo. A page can display multiple blocks; only the active block receives camera input.

The seven editable starters cover the six existing input patterns plus the rotating dial. They use the same document format and runtime as blank creations. The original specialized environments remain available, including their extra prediction, timing, and benchmark features.

Personal gesture scanning uses the selected person's existing calibration. Camera landmark extraction is always the bundled MediaPipe pipeline; the model selector chooses a compatible downstream function. The current registry contains built-in models, not arbitrary uploaded code or neural models. Personal sketch matching is geometric example matching, not neural-model training.

## Saving and sharing

- Drafts, installed snapshots, personal calibration, and communication messages remain in this browser. Export packages to move environments between devices or keep backups.
- **Publish to feed** shares the environment document, text outputs, and any custom sketch examples with people allowed into this private app. It never includes camera video or face/hand calibration.
- Feed documents and votes are stored in the site's D1 database. One signed-in account has one current vote per environment; clicking it again removes it. Only the publishing account can update or remove a listing. Installed copies survive removal.
- The site remains owner-private for the demo. Other accounts cannot participate until the owner explicitly grants site access. There are no fabricated creators, downloads, or votes.
- Publishing is explicit. Autosaving a draft does not publish it or update an installed copy. **Use environment** installs the latest edited copy.
- Import/export uses a validated data format, with no executable scripts, external model URLs, or embedded profile recordings.

Current practical bounds: 12 pages, 8 blocks per page, 96 choices per block, 48 custom sketches per block, 80 local drafts/installed packages, 900 KB portable packages, 250 KB feed packages, 30 published environments per account. The feed shows the top 100 listings. This release supports many combinations of these primitives; it does not implement every conceivable interaction.

## Development and validation

Node 24 is used for the local SQLite preview. Run `npm install`, then `npm start` (loopback-only preview). On Windows with a WSL checkout, run the server inside WSL so SQLite uses its native filesystem. Preview data is in ignored `.local/feed-preview.sqlite`; its local identity is never included in the deployed Worker.

Run `npm test`, `npm run check`, and `npm run build`. The build preserves the existing buildless client source under `dist/`, copies deployable browser assets to `dist/client`, and bundles the feed Worker to `dist/server/index.js`. `.openai/hosting.json` retains the site ID and declares the logical D1 binding. Schema and immutable generated migrations are under `db/` and `drizzle/`; Sites applies hosted migrations during publication. The server authorizes writes with Sites' injected user identity and rejects cross-origin writes.

Browser checks: `tests/creator-browser.mjs` and `tests/creator-editing-browser.mjs` expect the feed preview on port 4174. They exercise creation from scratch, real local handwriting/word workers, controlled hand geometry, publishing/voting/reloading/remixing, custom sketch teaching, drag/drop, and responsive layouts. Existing teaching, interface, Flow, and point-writing regressions also run. Synthetic hand fixtures validate software behavior; they are not measured live-user recognition accuracy.
