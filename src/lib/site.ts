/** Public base URL of the site, without a trailing slash. */
export function siteUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}
