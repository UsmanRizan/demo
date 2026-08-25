const SPORT_ICONS: Record<string, string> = {
  badminton: "🏸",
  basketball: "🏀",
  football: "⚽",
  soccer: "⚽",
  tennis: "🎾",
  volleyball: "🏐",
  cricket: "🏏",
  baseball: "⚾",
  golf: "⛳",
  hockey: "🏒",
  "table tennis": "🏓",
  "table-tennis": "🏓",
  pingpong: "🏓",
  swimming: "🏊",
  running: "🏃",
  cycling: "🚴",
  boxing: "🥊",
  rugby: "🏉",
  "american football": "🏈",
  skiing: "🎿",
  snooker: "🎱",
  pool: "🎱",
  billiards: "🏓",
  squash: "🏸",
  pickleball: "🏓",
  padel: "🏓",
  futsal: "⚽",
  "net ball": "🥅",
  netball: "🥅",
  "arm wrestling": "💪",
  "martial arts": "🥋",
  karate: "🥋",
  judo: "🥋",
  taekwondo: "🥋",
  kabbadi: "🤼",
  kabaddi: "🤼",
  archery: "🏹",
  shooting: "🎯",
  darts: "🎯",
  bowling: "🎳",
};

const DEFAULT_ICON = "🏅";

export function getSportIcon(name: string): string {
  const key = name.toLowerCase().trim();
  return SPORT_ICONS[key] ?? DEFAULT_ICON;
}
