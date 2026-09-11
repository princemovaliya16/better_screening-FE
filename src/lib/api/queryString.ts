/** Builds a `?a=b&c=d` query string from a params object, dropping undefined/empty
 * values. Typed as `object` (rather than `Record<string, ...>`) so any params
 * interface with named optional properties can be passed without TS's "index
 * signature is missing" friction. */
export function toQueryString(params: object): string {
  const entries = Object.entries(params as Record<string, unknown>).filter(
    ([, v]) => v !== undefined && v !== '',
  ) as [string, string][];
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries).toString();
}
