const PALETTE = [
  { bg: "#14532D", fg: "#F4FBF6" },
  { bg: "#3B9B5C", fg: "#083318" },
  { bg: "#0F766E", fg: "#F4FBF6" },
  { bg: "#1F3D2B", fg: "#F4FBF6" },
  { bg: "#84A98C", fg: "#14301C" },
  { bg: "#4D7C0F", fg: "#F7FEE7" },
] as const;

const NAMED: Record<string, number> = {
  Godwin: 0,
  "Highland 1": 1,
  "Highland 2": 2,
  "MP High School 1": 3,
  "MP High School 2": 4,
  "Eastern Christian": 5,
};

function hashName(name: string) {
  return [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

export function gymStyle(name: string) {
  const index = NAMED[name] ?? hashName(name) % PALETTE.length;
  return PALETTE[index];
}

export function gymInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}
