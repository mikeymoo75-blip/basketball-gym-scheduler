const PALETTE = [
  { bg: "#1B5E3B", fg: "#F4FBF6" },
  { bg: "#2F7A4D", fg: "#F4FBF6" },
  { bg: "#0F4C3A", fg: "#F4FBF6" },
  { bg: "#3E6F4E", fg: "#F4FBF6" },
  { bg: "#246348", fg: "#F4FBF6" },
  { bg: "#4A7C59", fg: "#F4FBF6" },
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
