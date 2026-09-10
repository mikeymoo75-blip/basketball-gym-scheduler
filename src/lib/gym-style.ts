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

const INITIALS: Record<string, string> = {
  Godwin: "G",
  "Highland 1": "H1",
  "Highland 2": "H2",
  "MP High School 1": "HS1",
  "MP High School 2": "HS2",
  "Eastern Christian": "EC",
  "The Barn": "B",
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
  if (INITIALS[name]) return INITIALS[name];
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2 && /^\d+$/.test(words[words.length - 1] ?? "")) {
    return `${words[0][0] ?? ""}${words[words.length - 1]}`.toUpperCase();
  }
  return words
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}
