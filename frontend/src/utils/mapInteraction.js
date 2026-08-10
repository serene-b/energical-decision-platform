export function emptyHoverOwnership() {
  return { id: null, overRegion: false, overCard: false };
}

export function ownRegion(id) {
  return { id, overRegion: true, overCard: false };
}

export function ownCard(id) {
  return { id, overRegion: false, overCard: true };
}

export function releaseHover(id) {
  return { id, overRegion: false, overCard: false };
}

export function hoverIsOwned(ownership) {
  return Boolean(ownership?.overRegion || ownership?.overCard);
}
