/**
 * Validates a post-auth `next` redirect target. Returns the input if it is a
 * safe in-origin relative path, otherwise returns '/'.
 *
 * Rejects:
 *  - null / empty
 *  - protocol-relative (`//evil.com`)
 *  - backslash variants (`/\evil.com`) that some browsers normalize as `//`
 *  - path traversal (`/../etc/passwd`) — enforced by disallowing `.` entirely
 *  - scheme injection (`/javascript:alert(1)`) — enforced by disallowing `:`
 *  - anything with characters outside the safe URL-path charset
 *
 * Allows:
 *  - paths starting with a single `/`
 *  - alphanumeric, `_`, `-`, `/`, `?`, `=`, `&`
 *
 * The constraint set is deliberately tight; loosen only with a documented
 * reason and a matching test case.
 */
export function safeRedirectPath(next: string | null): string {
  if (!next) return '/';
  // Defense-in-depth: explicit prefix and substring rejections.
  if (next.startsWith('//')) return '/';
  if (next.startsWith('/\\')) return '/';
  if (next.includes('..')) return '/';
  if (next.includes('\\')) return '/';
  // Whitelist charset: must start with '/' followed by safe URL-path chars.
  if (!/^\/[A-Za-z0-9_\-/?=&]+$/.test(next)) {
    // Bare '/' is also acceptable.
    return next === '/' ? '/' : '/';
  }
  return next;
}
