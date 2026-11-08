# Creator space: components, mappings, and rules

Creator now starts with a blank canvas. There is no dial, table, or swipe-keyboard component. Those interfaces are compositions of lower-level parts. Existing environments remain usable in User space; opening an old environment in Creator converts its layout to editable components without changing its installed copy.

## Build the hand-turned wheel from scratch

1. Open **Creator space → New environment**. Set **Environment name** to `Palm Writer` and **Creator name** to `konurnordberg`.
2. In **Add choices**, choose **A–Z**. Each letter becomes a separate text choice in the **Choices** group.
3. Choose **Circle** in **Arrange**, leave **Arrange which choices** set to **All in active group**, then click **Arrange**. You do not need to select all the letters first. This places the letters once; they remain freely draggable. For the recording, optionally drag one letter elsewhere and click **Undo edit** to demonstrate this.
4. Under **Components**, click **Selection target**. Drag its **Target** handle, or in its fields below the canvas enter **Target X** `0.5`, **Target Y** `0.14`, and **Target reach** `0.08`.
5. Under **Inputs → properties**, click **+ Connect an input**. Set **Input signal** to **Hand rotation**, **Property** to **Group rotation**, and **Target group** to **Choices**.
6. Enter **Input from** `-60`, **Input to** `60`, **Output from** `-180`, and **Output to** `180`. Leave **Limit to this range** enabled. These values map a 120-degree hand range to a complete turn of the letters.
7. Set **Choose a choice using** to **Choice nearest a fixed target**. Set **Hold before selecting (ms)** to `900`.
8. Under **Try your environment**, click **Start camera preview**. Show one palm with your wrist visible and fingers generally upward. Click **Center inputs** while your hand is comfortably centered.
9. Tilt your hand left or right in the camera plane, like turning a steering wheel. Bring a letter under the fixed target and hold for about 0.9 seconds to insert it. Move to a different letter before the next selection. If the direction feels backward, swap the two output values.
10. Click **Use environment** to install it and open User space. Click **Start camera input** to use it there. The preview text is separate from the main message. Clear is immediate and Undo restores the previous message; speaking asks for confirmation.
11. Optionally select **Publish to feed** from its Creator editor to share the finished environment inside this private app.

Camera preview is available even while an environment is unfinished. Any missing setup for the active surface appears directly beside the preview controls. Other unfinished surfaces only block Use environment and Publish to feed. Allow camera access if prompted; no personal gesture profile is needed for hand rotation. Editing pauses preview input, so click Start camera preview again after changing settings.

The prebuilt Rotate & hold dial is no longer in the catalog or installed choices. User-created copies remain. This walkthrough builds its behavior from a blank canvas without a dial-specific component or template. `tests/thumbnail-demo-browser.mjs` verifies this exact construction and rotation/dwell selection with controlled camera landmarks; rehearse once with your laptop camera before recording.

The same components can create a sliding strip: arrange choices in a horizontal line, put the target in the center, and map **Hand horizontal position → Group horizontal offset**. Or map finger count to **Highlighted choice index** while leaving the visual arrangement entirely free.

## The visual language

| Part | What the creator controls |
| --- | --- |
| Text choice | Label, text or action, position, size, group, ordering |
| Text label | Non-selectable display text |
| Group | Pivot, position, rotation, scale, parent group; groups can be nested |
| Selection target | Position and reach; it can be dragged independently of choices |
| Drawing surface | Neural A–Z recognition or personal symbols taught with 2–5 examples |
| Input mapping | Signal → property, input range → output range, optional range limiting |
| Selection rule | Click/tap, nearest target, pointer hit, mapped index, Next/Select, exact path, or word path |
| Optional condition | Allow camera selection only while another measured signal is in a specified range |

Mappings can drive group rotation, horizontal/vertical offsets, scale, pointer coordinates, or a choice index. Signals include hand rotation, horizontal/vertical position, one-hand finger count, each side's count, and a combined two-hand index. Multiple mappings may control different properties; contradictory mappings to the same property are rejected. A primary-hand setting keeps position and rotation on a consistent hand.

Grid, line, column, and circle are **one-time arrangement operations**, not fixed layouts. Every position remains editable. Group operations preserve free positions; nested group transforms are resolved at runtime. Snap-to-grid, numeric fields, move-order buttons, keyboard arrows, and undo/redo complement dragging.

Selection and appearance are separate. A circular arrangement may scan, a free arrangement may use finger counts, or a group may translate and rotate at the same time. Equal-distance target choices abstain. Missing required tracking cancels the hold; it never substitutes zero for an absent signal. Camera conditions can require, for example, a particular finger count while another input moves the choices.

Page actions and surface-focus actions combine multiple canvases or drawing surfaces. Only the active surface receives camera input. Text actions include arbitrary Unicode, space, delete, undo, case, pause, speech requests, and page links. Pointer and keyboard interaction remain available while testing.

## Recognition

All camera processing remains local through the bundled MediaPipe pipeline. The drawing surface selects either the bundled neural handwriting model or the local geometric personal-symbol matcher. Word-path rules decode against the existing 20,000-word vocabulary using the actual component coordinates. Exact-path rules concatenate the choices visited; they do not assume a circle or keyboard.

Personal Next/Select gestures use the selected person's existing calibration. This is a typed visual configuration system. It has no executable expressions, arbitrary uploaded models, or user-defined scripts. New perception signals or property types still need implementation; the current building blocks do not cover every imaginable interaction.

## Saving and private sharing

Drafts, installed snapshots, personal calibration, and communication messages remain on the device. Export packages for backups or moving an environment to another device. Autosaving a draft does not publish or update an installed snapshot.

**Publish to feed** explicitly shares the environment document, outputs, and any personal sketch examples with people allowed into this private app. Camera video and face/hand calibration are excluded. Feed documents and one reversible vote per signed-in account live in the site's database. Only the publisher can update or remove a listing; installed copies survive removal. Relay remains owner-private for this demo, with no fabricated users or votes.

Canvas packages use format version 2; version 1 packages still import and run. Validation checks group references and cycles, typed signal/property names, unique identifiers, bounded values, and compatible rules. Bounds include 12 pages, 8 surfaces per page, 96 choices and 16 groups per canvas, 24 mappings per canvas, 900 KB portable packages, and 250 KB feed packages.

## Development and validation

Run `npm test`, `npm run check`, and `npm run build`. Node 24 is used for the SQLite loopback preview. In a Windows/WSL checkout, run the server inside WSL so its ignored `.local/feed-preview.sqlite` uses the native filesystem. The hosted feed uses Sites identity and D1; local preview identity is not deployed.

Browser checks use the updated preview on port 4175: `tests/creator-canvas-browser.mjs`, `tests/creator-browser.mjs`, and `tests/creator-editing-browser.mjs`. They cover component construction, arbitrary letter relocation, grouped rotation, translation, conditions, keyboard editing, real local recognition workers, private sharing, and layouts at 320–1440px. Controlled camera fixtures verify software behavior, not live-user recognition accuracy. Rehearse with the actual laptop camera before presenting.

Creator interaction regression checks: set RELAY_PREVIEW_URL to the running local preview and run node tests/creator-interactions-browser.mjs. This covers arrangement persistence and scope, target position/reach and dragging, clicks beneath the target, unfinished surfaces, camera error/retry/navigation, and actual bundled vision startup using Chrome’s simulated camera.
