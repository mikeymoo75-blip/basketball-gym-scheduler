import { type BlockKind } from "@prisma/client";

export function blockKindLabel(kind: BlockKind | string) {
  if (kind === "GAME") return "Game";
  if (kind === "EVENT") return "Event";
  if (kind === "MAINTENANCE") return "Maintenance";
  if (kind === "CLOSED") return "Closed";
  return "Hold";
}
