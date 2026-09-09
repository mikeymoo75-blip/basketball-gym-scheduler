/** One strong hue per gym so All-gyms cards do not melt into the same green. */
const STYLES: Record<string, { bg: string; fg: string }> = {
  Godwin: { bg: "#0D8A4B", fg: "#F3FDF7" },
  "Highland 1": { bg: "#2563EB", fg: "#F8FAFF" },
  "Highland 2": { bg: "#C2410C", fg: "#FFF7ED" },
  "MP High School 1": { bg: "#7C3AED", fg: "#F5F3FF" },
  "MP High School 2": { bg: "#CA8A04", fg: "#1C1403" },
  "Eastern Christian": { bg: "#E11D48", fg: "#FFF1F2" },
  "The Barn": { bg: "#0E7490", fg: "#F0FDFA" },
};

const FALLBACK = [
  STYLES.Godwin,
  STYLES["Highland 1"],
  STYLES["Highland 2"],
  STYLES["MP High School 1"],
  STYLES["MP High School 2"],
  STYLES["Eastern Christian"],
  STYLES["The Barn"],
];

function hashName(name: string) {
  return [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

export function gymStyle(name: string) {
  return STYLES[name] ?? FALLBACK[hashName(name) % FALLBACK.length];
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
