import { describe, it, expect } from 'vitest'
import { safeRedirectPath } from '@/lib/safeRedirectPath'

describe('safeRedirectPath', () => {
  describe('returns / for unsafe input', () => {
    it.each([
      ['null',                  null],
      ['empty string',          ''],
      ['protocol-relative',     '//evil.com'],
      ['backslash trick',       '/\\evil.com'],
      ['path traversal',        '/../etc/passwd'],
      ['embedded ..',           '/a/../../b'],
      ['absolute http',         'http://evil.com'],
      ['absolute https',        'https://evil.com'],
      ['scheme in path',        '/javascript:alert(1)'],
      ['embedded colon',        '/foo:bar'],
      ['embedded backslash',    '/foo\\bar'],
      ['embedded space',        '/foo bar'],
      ['hash fragment',         '/dashboard#hash'],
      ['no leading slash',      'dashboard'],
      ['triple slash',          '///'],
    ])('rejects %s', (_label, input) => {
      expect(safeRedirectPath(input)).toBe('/')
    })
  })

  describe('returns input for safe paths', () => {
    it.each([
      ['/dashboard'],
      ['/conversation'],
      ['/journal'],
      ['/progress'],
      ['/profile'],
      ['/uke'],
      ['/roleplay'],
      ['/reading/some-text-id'],
      ['/dashboard?level=A2'],
      ['/session?id=abc123'],
      ['/foo/bar/baz'],
      ['/with-dash_underscore'],
    ])('accepts %s', (input) => {
      expect(safeRedirectPath(input)).toBe(input)
    })
  })

  it('returns / for the root path (degenerate but valid)', () => {
    // The regex requires at least one non-/ char after the slash, so bare '/'
    // does not match the regex but is handled explicitly. Either way the
    // function must return '/'.
    expect(safeRedirectPath('/')).toBe('/')
  })
})
