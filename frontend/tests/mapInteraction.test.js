import assert from "node:assert/strict";
import test from "node:test";

import {
  emptyHoverOwnership,
  hoverIsOwned,
  ownCard,
  ownRegion,
  releaseHover,
} from "../src/utils/mapInteraction.js";

test("hover remains owned while moving from a region to its card and back", () => {
  let ownership = ownRegion("16");
  assert.equal(hoverIsOwned(ownership), true);

  ownership = ownCard("16");
  assert.deepEqual(ownership, { id: "16", overRegion: false, overCard: true });
  assert.equal(hoverIsOwned(ownership), true);

  ownership = ownRegion("16");
  assert.equal(hoverIsOwned(ownership), true);
});

test("hover is dismissible only after leaving both region and card", () => {
  const ownership = releaseHover("16");
  assert.deepEqual(ownership, { id: "16", overRegion: false, overCard: false });
  assert.equal(hoverIsOwned(ownership), false);
});

test("rapid movement transfers ownership to the latest region", () => {
  const firstRegion = ownRegion("16");
  const secondRegion = ownRegion("31");
  assert.equal(firstRegion.id, "16");
  assert.deepEqual(secondRegion, { id: "31", overRegion: true, overCard: false });
});

test("an explicit dismissal clears every hover owner", () => {
  assert.deepEqual(emptyHoverOwnership(), { id: null, overRegion: false, overCard: false });
});
