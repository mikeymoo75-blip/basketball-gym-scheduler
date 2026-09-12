export type SlotKind = "PRACTICE" | "GAME";

export const PRACTICE_MINUTES = 60;
export const GAME_MINUTES = 120;

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

export function slotMinutes(kind?: string | null) {
  return kind === "GAME" ? GAME_MINUTES : PRACTICE_MINUTES;
}
