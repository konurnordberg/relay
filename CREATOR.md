# Creator space: components, mappings, and rules

Creator now starts with a blank canvas. There is no dial, table, or swipe-keyboard component. Those interfaces are compositions of lower-level parts. Existing environments remain usable in User space; opening an old environment in Creator converts its layout to editable components without changing its installed copy.

## Build the hand-turned wheel from scratch

1. Open **Creator space → New environment** and name it.
2. In **Add choices**, choose **A–Z**. Each letter is a separate text choice in a group.
3. Select **Arrange → Circle**, then **Arrange**. This places the letters once. You can still drag any letter anywhere afterward. Click a single letter before dragging it; Shift-select moves several choices together.
4. Add a **Selection target** from Components. Drag the + marker near the top of the circle, or use Target X `0.5`, Target Y `0.14`, and reach `0.08`.
5. In **Inputs → properties**, choose **Connect an input**. Set **Input signal → Hand rotation**, **Property → Group rotation**, and **Target group → Choices**.
6. The default mapping uses a comfortable hand range of −60° to +60° to rotate the group from −180° to +180°. Reverse the output endpoints if the direction feels backward. These are ordinary editable signal ranges, not a dial-specific setting.
7. Set **Selection rule → Choice nearest a fixed target** and begin with a 900–1,000 ms hold.
8. Start camera preview. Show your palm and wrist, select **Center inputs**, then tilt your hand in the camera plane. The group rotates; the closest choice within the target's reach highlights. Hold to select once. Move away before another selection.
9. **Use environment** installs a snapshot in User space. Text joins the existing message composer. Speaking and clearing still ask for confirmation.

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
