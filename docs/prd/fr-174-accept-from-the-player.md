# FR-174: Accept a Take from the Player (Keep / Discard the Rest)

**Status**: Captured — banked, not dispatched (David, 2026-10-25)
**Added**: 2026-10-25
**Raised by**: David, live on the Incoming page of D12 (`v-appydave/d12-openrig-agent-teams`)

---

## What David is doing

On **Incoming**, he clicks ▶ on a take and watches it in the player. While watching he decides
*"that's the one"*. Today he has to close the player, find that take's row, click **Rename**, and
then answer the **"Discard remaining files?"** dialog (No / Yes, discard).

Screenshots: `docs/prd/assets/fr-174/incoming-page.png`, `docs/prd/assets/fr-174/discard-remaining-dialog.png`.

## What he wants

### 1. Two accept buttons inside the player (Incoming only)

| Button | Does |
|---|---|
| **Rename · Discard** (the normal one) | Rename this take to the "Lands as" name, move the other incoming files to trash |
| **Rename · Keep** | Rename this take, leave the other incoming files where they are |

Both are useful, so both appear. His words: *"Yes, I want to keep it, though maybe I want others to
be left alone or removed."*

### 2. The same two choices in the post-Rename dialog

The current dialog after **Rename** asks "Discard remaining files?" with **No / Yes, discard**. He
wants it worded as the same pair, **Rename Discard** (the normal choice) and **Rename Keep**, so the
row button and the player say the same thing.

### 3. Open question: autoplay / auto-next on Incoming

David is *debating* whether autoplay and auto-next belong in the player when it opens from Incoming.
They make sense on the other pages; Incoming is about deciding, not watching. **Not decided — David
rules.**

## Not yet decided

- Whether Incoming's player hides autoplay / auto-next (§3).
- Exact placement of the two buttons in the player.

## Done when (draft)

From Incoming, play a take, press **Rename · Discard** in the player: the take is renamed to its
"Lands as" name, the other incoming files go to trash, and the player closes. **Rename · Keep** does
the same but leaves the others in Incoming.
