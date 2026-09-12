export type SlotKind = "PRACTICE" | "GAME";

export function parseSlotKind(value: unknown): SlotKind {
  return value === "GAME" ? "GAME" : "PRACTICE";
}

export function slotNoun(kind?: string | null) {
  return kind === "GAME" ? "game" : "practice";
}

export function slotNouns(kind?: string | null) {
  return kind === "GAME" ? "games" : "practices";
}

export function slotTitle(kind: string | null | undefined, teamName: string) {
  return kind === "GAME" ? `${teamName} game` : `${teamName} practice`;
}
