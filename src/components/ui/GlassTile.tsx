'use client'

import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { ArrowUpRight } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Accent = 'lime' | 'cyan' | 'teal' | 'amber' | 'coral' | 'violet' | 'slate'

export interface GlassTileProps {
  /** Accent family — drives glyph glow, rim ring, and title tint */
  accent: Accent
  /** Lucide icon component rendered as the embedded glow source (no secondary icon) */
  icon: LucideIcon
  title: string
  subtitle?: string
  /** When set the tile renders as an <a> element with aria-label */
  href?: string
  onClick?: () => void
  /** Show the corner ArrowUpRight pill (default true; ignored by the rail variant) */
  showArrow?: boolean
  /**
   * hero — 208px tall, 40% glyph, larger text (intended as full-width)
   * grid — 152px tall, 54% glyph, compact text (intended in a 2-col grid)
   * rail — 58px tall, horizontal: tinted card body, soft glyph as a light
   *        on the RIGHT under a frosted glass layer, title+subtitle on the LEFT
   *        (R1 compact §VERKTØY tile)
   */
  size?: 'hero' | 'grid' | 'rail'
}

// ── Accent → CSS token mapping ────────────────────────────────────────────────
// All values reference .dash-v3 tokens from globals.css.
// `tint` is the rail-variant card-body gradient (size="rail" only).

const ACCENT: Record<Accent, { c: string; cg: string; lit: string; tint: string }> = {
  lime:   { c: 'var(--v3-lime)',   cg: 'var(--v3-lime-glow)',   lit: 'var(--v3-lime-lit)',   tint: 'var(--v3-tint-lime)'   },
  cyan:   { c: 'var(--v3-cyan)',   cg: 'var(--v3-cyan-glow)',   lit: 'var(--v3-cyan-lit)',   tint: 'var(--v3-tint-cyan)'   },
  teal:   { c: 'var(--v3-teal)',   cg: 'var(--v3-teal-glow)',   lit: 'var(--v3-teal-lit)',   tint: 'var(--v3-tint-teal)'   },
  amber:  { c: 'var(--v3-amber)',  cg: 'var(--v3-amber-glow)',  lit: 'var(--v3-amber-lit)',  tint: 'var(--v3-tint-amber)'  },
  coral:  { c: 'var(--v3-coral)',  cg: 'var(--v3-coral-glow)',  lit: 'var(--v3-coral-lit)',  tint: 'var(--v3-tint-coral)'  },
  violet: { c: 'var(--v3-violet)', cg: 'var(--v3-violet-glow)', lit: 'var(--v3-violet-lit)', tint: 'var(--v3-tint-violet)' },
  slate:  { c: 'var(--v3-slate)',  cg: 'var(--v3-slate-glow)',  lit: 'var(--v3-slate-lit)',  tint: 'var(--v3-tint-slate)'  },
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GlassTile({
  accent,
  icon: Icon,
  title,
  subtitle,
  href,
  onClick,
  showArrow = true,
  size = 'grid',
}: GlassTileProps) {
  const { c, cg, lit, tint } = ACCENT[accent]
  const isHero = size === 'hero'
  const isRail = size === 'rail'
  const isInteractive = Boolean(href ?? onClick)

  // ── CSS custom properties propagate --c / --cg to every child layer ──────
  // The `as unknown as React.CSSProperties` cast is required because TypeScript's
  // CSSProperties interface does not include user-defined CSS custom property keys.
  const accentVars = { '--c': c, '--cg': cg } as unknown as React.CSSProperties

  // ── Rail variant — R1 compact §VERKTØY tile ──────────────────────────────
  // A short (~58px) horizontal tile: accent-tinted card body, the glyph as a
  // soft LIGHT on the RIGHT diffused under a frosted backdrop-blur layer, and
  // the title + subtitle on the LEFT. Self-contained render path; the
  // hero/grid styles below are untouched.
  if (isRail) {
    const railStyle: React.CSSProperties = {
      ...accentVars,
      position: 'relative',
      height: 58,
      borderRadius: 14,
      overflow: 'hidden',
      isolation: 'isolate',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 3,
      padding: '0 54px 0 13px',
      border: '1px solid rgba(255,255,255,0.10)',
      background: tint,
      boxShadow: [
        '0 14px 26px -16px rgba(0,0,0,0.82)',
        '0 2px 0 rgba(0,0,0,0.38)',
        'inset 0 1px 1px rgba(255,255,255,0.14)',
        'inset 0 -12px 20px -16px rgba(0,0,0,0.5)',
      ].join(', '),
      cursor: isInteractive ? 'pointer' : 'default',
      transition: 'transform .25s cubic-bezier(.2,.8,.25,1), box-shadow .25s',
      textDecoration: 'none',
      WebkitFontSmoothing: 'antialiased',
    }

    const railInner = (
      <>
        {/* Accent wash radiating from the right-side glyph */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            mixBlendMode: 'screen',
            pointerEvents: 'none',
            background: 'radial-gradient(72% 112% at 86% 50%, var(--cg) 0%, transparent 60%)',
          }}
        />
        {/* Embedded glyph — the LIGHT source, large, on the right, low opacity */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: 2,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 54,
            height: 54,
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Icon
            width={52}
            height={52}
            color="var(--c)"
            strokeWidth={1.5}
            aria-hidden="true"
            style={{
              opacity: 0.72,
              filter: 'drop-shadow(0 0 4px var(--c)) drop-shadow(0 0 12px var(--cg))',
            }}
          />
        </span>
        {/* Frosted glass over the whole card — diffuses the glyph beneath */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            pointerEvents: 'none',
            backdropFilter: 'blur(2px) saturate(1.1)',
            WebkitBackdropFilter: 'blur(2px) saturate(1.1)',
            background:
              'linear-gradient(160deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02) 55%, rgba(255,255,255,0))',
          }}
        />
        {/* Rim ring — refractive inner edge */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 5,
            borderRadius: 10,
            zIndex: 3,
            pointerEvents: 'none',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.07) inset',
          }}
        />
        {/* Top sheen — over everything */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 4,
            pointerEvents: 'none',
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.06) 32%, transparent 78%)',
            WebkitMaskImage: 'radial-gradient(120% 100% at 50% -28%, #000 42%, transparent 70%)',
            maskImage: 'radial-gradient(120% 100% at 50% -28%, #000 42%, transparent 70%)',
          }}
        />
        {/* Specular glint */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 5,
            left: 9,
            width: 36,
            height: 5,
            zIndex: 5,
            background: 'rgba(255,255,255,0.55)',
            filter: 'blur(2px)',
            opacity: 0.8,
            transform: 'rotate(-16deg)',
            borderRadius: 4,
            pointerEvents: 'none',
          }}
        />
        {/* Text — title + subtitle on the LEFT */}
        <span
          style={{
            position: 'relative',
            zIndex: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              lineHeight: 1,
              whiteSpace: 'nowrap',
              color: lit,
              textShadow: '0 1px 6px rgba(0,0,0,0.45)',
            }}
          >
            {title}
          </span>
          {subtitle != null && (
            <span
              style={{
                fontFamily: 'var(--v3-sans)',
                fontSize: 8,
                letterSpacing: '0.02em',
                color: '#e3e7df',
                opacity: 0.82,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textShadow: '0 1px 5px rgba(0,0,0,0.5)',
              }}
            >
              {subtitle}
            </span>
          )}
        </span>
      </>
    )

    const railActiveClass = isInteractive
      ? 'active:translate-y-px active:scale-[.992] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c)]'
      : ''

    if (href) {
      return (
        <a href={href} onClick={onClick} aria-label={title} className={railActiveClass} style={railStyle}>
          {railInner}
        </a>
      )
    }
    return (
      <div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label={onClick ? title : undefined}
        onClick={onClick}
        className={railActiveClass}
        style={railStyle}
      >
        {railInner}
      </div>
    )
  }

  // ── Grid variant — clean one-box glowing tile (E-density, 3-col) ─────────
  // A big backlit glyph is sunk into the BACK of the glass (right side) under a
  // thin frosted sheen; the white label sits on top, bottom-left. One accent
  // bloom + a top-edge hairline are the only glow. Whiter/frostier glass than
  // the heavy hero variant; NO inner rim ring, double glints, or arrow pill —
  // the "one nice box" Dave approved in the clean-tiles iteration.
  if (size === 'grid') {
    const gridStyle: React.CSSProperties = {
      ...accentVars,
      position: 'relative',
      overflow: 'hidden',
      isolation: 'isolate',
      minHeight: 80,
      borderRadius: 13,
      padding: '9px 10px',
      border: '1px solid rgba(255,255,255,0.12)',
      background:
        'linear-gradient(168deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.05) 52%, rgba(255,255,255,0.025) 100%)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16), 0 10px 24px -16px rgba(0,0,0,0.78)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      cursor: isInteractive ? 'pointer' : 'default',
      transition: 'transform .25s cubic-bezier(.2,.8,.25,1), box-shadow .25s',
      textDecoration: 'none',
      WebkitFontSmoothing: 'antialiased',
    }

    const gridInner = (
      <>
        {/* Accent bloom — the single glow, anchored behind the back-glass glyph */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            background: 'radial-gradient(150px 120px at 66% 46%, var(--cg) 0%, transparent 70%)',
          }}
        />
        {/* Top-edge accent hairline */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 14,
            right: 14,
            height: 1,
            zIndex: 1,
            pointerEvents: 'none',
            background: 'linear-gradient(90deg, transparent, var(--c), transparent)',
            opacity: 0.6,
          }}
        />
        {/* Big backlit glyph sunk into the back of the glass */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '50%',
            right: 6,
            transform: 'translateY(-50%)',
            zIndex: 0,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon
            width={46}
            height={46}
            color="var(--c)"
            strokeWidth={0.6}
            aria-hidden="true"
            style={{ display: 'block', opacity: 0.34, filter: 'drop-shadow(0 0 7px var(--cg))' }}
          />
        </span>
        {/* Thin frosted sheen over the glyph — reads as embedded-in-glass */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            pointerEvents: 'none',
            background:
              'linear-gradient(160deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02) 55%, transparent)',
            backdropFilter: 'blur(0.5px)',
            WebkitBackdropFilter: 'blur(0.5px)',
          }}
        />
        {/* White label — vividly visible on top of the glass */}
        <span style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span
            style={{
              fontWeight: 700,
              fontSize: 13,
              lineHeight: 1,
              letterSpacing: '-0.2px',
              color: '#FFFFFF',
              textShadow: '0 1px 8px rgba(0,0,0,0.6), 0 0 2px rgba(0,0,0,0.5)',
            }}
          >
            {title}
          </span>
          {subtitle != null && (
            <span
              style={{
                fontFamily: 'var(--v3-sans)',
                fontSize: 8,
                marginTop: 3,
                letterSpacing: '0.02em',
                color: 'rgba(255,255,255,0.72)',
                textShadow: '0 1px 6px rgba(0,0,0,0.55)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {subtitle}
            </span>
          )}
        </span>
      </>
    )

    const gridActiveClass = isInteractive
      ? 'active:translate-y-px active:scale-[.992] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c)]'
      : ''

    if (href) {
      return (
        <a href={href} onClick={onClick} aria-label={title} className={gridActiveClass} style={gridStyle}>
          {gridInner}
        </a>
      )
    }
    return (
      <div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label={onClick ? title : undefined}
        onClick={onClick}
        className={gridActiveClass}
        style={gridStyle}
      >
        {gridInner}
      </div>
    )
  }

  // ── Tile shell (hero variant) ───────────────────────────────────────────────
  // Replicates .tile from variant-3.html using .dash-v3 glass tokens.
  const tileStyle: React.CSSProperties = {
    ...accentVars,
    position: 'relative',
    borderRadius: 26,
    overflow: 'hidden',
    isolation: 'isolate',
    height: isHero ? 208 : 152,
    background:
      'linear-gradient(160deg, var(--glass-fill) 0%, var(--glass-fill-mid) 60%, var(--glass-fill-end) 100%)',
    boxShadow: [
      '0 1px 1px var(--glass-bevel-top) inset',         // top inner sheen
      '0 -14px 24px -16px var(--glass-bevel-inner) inset', // bottom inner shade = thickness
      '14px 16px 22px -18px var(--glass-rim-base) inset',  // side rim depth
      'var(--glass-shadow)',                              // outer cast shadow
      '0 2px 0 rgba(0,0,0,0.376)',                       // ground contact
    ].join(', '),
    border: '1px solid var(--glass-border)',
    cursor: isInteractive ? 'pointer' : 'default',
    // Custom easing for the press/hover lift; Tailwind active: classes supply end state
    transition: 'transform .25s cubic-bezier(.2,.8,.25,1), box-shadow .25s',
    display: 'block',
    WebkitFontSmoothing: 'antialiased',
  }

  // ── Bloom — accent color wash radiating from the glyph ───────────────────
  const bloomStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    zIndex: -1,
    background: 'radial-gradient(58% 52% at 50% 46%, var(--cg) 0%, transparent 66%)',
    opacity: 0.9,
    mixBlendMode: 'screen',
    pointerEvents: 'none',
  }

  // ── Rim glow — accent edge light on the SINGLE tile edge ─────────────────
  // Sits flush with the outer border (inset 0, same radius) so the card reads
  // as ONE box, not a box-inside-a-box. Soft accent inner glow only — no
  // discrete second outline.
  const rimStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: 26,
    zIndex: 2,
    pointerEvents: 'none',
    boxShadow: '0 1px 12px var(--cg) inset',
  }

  // ── Gloss — thick refractive top-sheen layer (masked) ────────────────────
  const glossStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '52%',
    zIndex: 3,
    pointerEvents: 'none',
    background: [
      'linear-gradient(180deg,',
      'var(--glass-gloss-bright) 0%,',
      'var(--glass-gloss-mid) 30%,',
      'transparent 75%)',
    ].join(' '),
    // Radial mask pools the gloss at the top, fading as it curves down
    WebkitMaskImage:
      'radial-gradient(120% 100% at 50% -28%, #000 42%, transparent 70%)',
    maskImage:
      'radial-gradient(120% 100% at 50% -28%, #000 42%, transparent 70%)',
  }

  // ── Specular glint 1 — rolling hard highlight bead ───────────────────────
  const glintStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 4,
    pointerEvents: 'none',
    width: '60%',
    height: 14,
    left: '10%',
    top: '9%',
    background:
      'linear-gradient(90deg, transparent, rgba(255,255,255,0.8) 45%, rgba(255,255,255,0.933) 55%, transparent)',
    borderRadius: '50%',
    filter: 'blur(2px)',
    opacity: 0.85,
    transform: 'rotate(-7deg)',
  }

  // ── Specular glint 2 — secondary bottom-right orb ────────────────────────
  const glint2Style: React.CSSProperties = {
    position: 'absolute',
    zIndex: 4,
    pointerEvents: 'none',
    width: '18%',
    height: '18%',
    right: '11%',
    bottom: '14%',
    background:
      'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.816), rgba(255,255,255,0.125) 45%, transparent 62%)',
    filter: 'blur(0.5px)',
    opacity: 0.7,
    borderRadius: '50%',
  }

  // ── Arrow pill — corner navigation affordance ─────────────────────────────
  const arrowWrapStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 5,
    top: 13,
    right: 13,
    width: 24,
    height: 24,
    borderRadius: '50%',
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(255,255,255,0.063)',
    border: '1px solid rgba(255,255,255,0.110)',
    boxShadow:
      '0 1px 2px rgba(0,0,0,0.376), 0 1px 0 rgba(255,255,255,0.094) inset',
  }

  // ── Meta — text overlay sits atop all glass layers ───────────────────────
  const metaStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 5,
    padding: isHero ? '20px 22px 20px' : '16px 16px 15px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
  }

  const titleStyle: React.CSSProperties = {
    fontWeight: 800,
    letterSpacing: '-0.3px',
    lineHeight: 1,
    fontSize: isHero ? 30 : 19,
    color: lit,
    textShadow: 'var(--glass-text-shadow)',
  }

  const subtitleStyle: React.CSSProperties = {
    fontFamily: 'var(--v3-sans)',
    fontSize: isHero ? 11 : 10,
    letterSpacing: '0.2px',
    color: '#cfd6cd',
    opacity: 0.78,
    marginTop: 6,
    textShadow: '0 1px 6px rgba(0,0,0,0.667)',
  }

  // ── Icon sizing — small, delicate backlit glyph (Dave: thinner, less
  // shiny, ~half the old size). Hero stays a touch larger than grid.
  const glyphContainerSize = isHero ? '34%' : '28%'

  const iconStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    height: '100%',
    opacity: 0.88,
    // Single soft glow — backlit, not shiny
    filter: 'drop-shadow(0 0 5px var(--cg))',
  }

  // ── Shared inner markup ───────────────────────────────────────────────────
  const inner = (
    <>
      {/* Bloom — accent color wash (behind glyph, below all glass) */}
      <div aria-hidden="true" style={bloomStyle} />

      {/* Embed — the only light source; no decorative value beyond glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <div style={{ width: glyphContainerSize, height: glyphContainerSize }}>
          <Icon
            width="100%"
            height="100%"
            color="var(--c)"
            strokeWidth={1.1}
            aria-hidden="true"
            style={iconStyle}
          />
        </div>
      </div>

      {/* Rim ring — inset accent rim */}
      <div aria-hidden="true" style={rimStyle} />

      {/* Gloss — liquid-glass top sheen */}
      <div aria-hidden="true" style={glossStyle} />

      {/* Specular glint 1 — rolling highlight bead */}
      <div aria-hidden="true" style={glintStyle} />

      {/* Specular glint 2 — bottom-right orb */}
      <div aria-hidden="true" style={glint2Style} />

      {/* Corner arrow */}
      {showArrow && (
        <div aria-hidden="true" style={arrowWrapStyle}>
          <ArrowUpRight size={12} color="var(--c)" strokeWidth={2.2} />
        </div>
      )}

      {/* Text overlay */}
      <div style={metaStyle}>
        <div style={titleStyle}>{title}</div>
        {subtitle != null && <div style={subtitleStyle}>{subtitle}</div>}
      </div>
    </>
  )

  // Tailwind active pseudo-class supplies the pressed transform end-state;
  // the inline transition declaration provides easing + duration.
  const activeClass = isInteractive
    ? 'active:translate-y-px active:scale-[.992]'
    : ''

  // ── Render as <a> when href is provided, else <div> ─────────────────────
  if (href) {
    return (
      <a
        href={href}
        onClick={onClick}
        aria-label={title}
        className={activeClass}
        style={tileStyle}
      >
        {inner}
      </a>
    )
  }

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? title : undefined}
      onClick={onClick}
      className={activeClass}
      style={tileStyle}
    >
      {inner}
    </div>
  )
}
