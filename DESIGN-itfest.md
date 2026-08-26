---
version: alpha
name: IFEST 2026
description: >-
  IFEST 2026 is Indonesia's premier Informatics Festival, uniting future IT talents through competitive challenges in
  cybersecurity, game development, data analysis, and innovation. The design system embodies a tech-forward, energetic
  aesthetic with bold primary blues, warm accent oranges, and a clean, grid-based layout.
colors:
  surface: '#ffffff'
  surface-dim: '#f5f5f5'
  surface-bright: '#ffffff'
  surface-container-lowest: '#fafafa'
  surface-container-low: '#f5f5f5'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e0e0e0'
  on-surface: '#0c0c0c'
  on-surface-variant: '#5a5a5a'
  inverse-surface: '#1a1a1a'
  inverse-on-surface: '#f5f5f5'
  outline: '#9ca3af'
  outline-variant: '#d1d5db'
  surface-tint: '#214afe'
  primary: '#214afe'
  on-primary: '#ffffff'
  primary-container: '#c8dcff'
  on-primary-container: '#0a2e7f'
  inverse-primary: '#00f0ff'
  secondary: '#ffc878'
  on-secondary: '#1f2937'
  secondary-container: '#ffe8b3'
  on-secondary-container: '#664d00'
  tertiary: '#ff0055'
  on-tertiary: '#ffffff'
  tertiary-container: '#ffb3cc'
  on-tertiary-container: '#660033'
  error: '#ff0055'
  on-error: '#ffffff'
  error-container: '#ffb3cc'
  on-error-container: '#660033'
  primary-fixed: '#c8dcff'
  primary-fixed-dim: '#0088ff'
  on-primary-fixed: '#001a4d'
  on-primary-fixed-variant: '#0a2e7f'
  secondary-fixed: '#ffe8b3'
  secondary-fixed-dim: '#ffc878'
  on-secondary-fixed: '#331a00'
  on-secondary-fixed-variant: '#664d00'
  tertiary-fixed: '#ffb3cc'
  tertiary-fixed-dim: '#ff0055'
  on-tertiary-fixed: '#330011'
  on-tertiary-fixed-variant: '#660033'
  background: '#ffffff'
  on-background: '#0c0c0c'
  surface-variant: '#e5e7eb'
typography:
  display:
    fontFamily: IBM Plex Sans
    fontSize: 60px
    fontWeight: '800'
    lineHeight: 68px
    letterSpacing: '-0.04em'
  headline-lg:
    fontFamily: IBM Plex Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: '-0.02em'
  headline-md:
    fontFamily: IBM Plex Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: '-0.01em'
  title-lg:
    fontFamily: IBM Plex Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: 0em
  body-lg:
    fontFamily: IBM Plex Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: 0.01em
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0.01em
  label-md:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 24px
  container-max: 1280px
elevation:
  sm: 0 1px 2px rgba(0, 0, 0, 0.06)
  md: 0 4px 12px rgba(0, 0, 0, 0.1)
  lg: 0 16px 40px rgba(0, 0, 0, 0.12)
layout:
  containerMaxWidth: 1280px
  gridColumns: 12
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    typography: '{typography.label-md}'
    rounded: '{rounded.DEFAULT}'
    padding: 10px 24px
    height: 48px
    border: none
    fontWeight: '700'
  button-primary-hover:
    backgroundColor: '#0088ff'
    textColor: '{colors.on-primary}'
    transition: background-color 200ms ease
  button-secondary:
    backgroundColor: '{colors.secondary}'
    textColor: '{colors.on-secondary}'
    typography: '{typography.label-md}'
    rounded: '{rounded.DEFAULT}'
    padding: 10px 24px
    height: 48px
    border: none
    fontWeight: '700'
  button-secondary-hover:
    backgroundColor: '#ffc896'
    textColor: '{colors.on-secondary}'
    transition: background-color 200ms ease
  button-tertiary:
    backgroundColor: '{colors.tertiary}'
    textColor: '{colors.on-tertiary}'
    typography: '{typography.label-md}'
    rounded: '{rounded.DEFAULT}'
    padding: 10px 24px
    height: 48px
    border: none
    fontWeight: '700'
  button-tertiary-hover:
    backgroundColor: '#e60047'
    textColor: '{colors.on-tertiary}'
    transition: background-color 200ms ease
  card:
    backgroundColor: '{colors.surface}'
    rounded: '{rounded.md}'
    padding: '{spacing.md}'
    border: 1px solid {colors.outline-variant}
    boxShadow: '{elevation.md}'
  card-hover:
    backgroundColor: '{colors.surface-container-high}'
    boxShadow: '{elevation.lg}'
    transition: all 200ms ease
  input-field:
    backgroundColor: '{colors.surface-container-low}'
    textColor: '{colors.on-surface}'
    typography: '{typography.body-md}'
    rounded: '{rounded.DEFAULT}'
    padding: '{spacing.sm}'
    border: 1px solid {colors.outline-variant}
    height: 40px
  input-field-focus:
    borderColor: '{colors.primary}'
    boxShadow: 0 0 0 3px rgba(33, 74, 254, 0.1)
    transition: border-color 200ms ease, box-shadow 200ms ease
  badge:
    backgroundColor: '{colors.primary-container}'
    textColor: '{colors.on-primary-container}'
    typography: '{typography.label-sm}'
    rounded: '{rounded.full}'
    padding: 4px 12px
    display: inline-block
  badge-secondary:
    backgroundColor: '{colors.secondary-container}'
    textColor: '{colors.on-secondary-container}'
    typography: '{typography.label-sm}'
    rounded: '{rounded.full}'
    padding: 4px 12px
  badge-tertiary:
    backgroundColor: '{colors.tertiary-container}'
    textColor: '{colors.on-tertiary-container}'
    typography: '{typography.label-sm}'
    rounded: '{rounded.full}'
    padding: 4px 12px
  list-item:
    backgroundColor: transparent
    rounded: '{rounded.md}'
    padding: '{spacing.sm}'
    textColor: '{colors.on-surface}'
  list-item-hover:
    backgroundColor: '{colors.surface-container-high}'
    textColor: '{colors.primary}'
    transition: all 200ms ease
---

## Overview

IFEST 2026 is Indonesia's flagship Informatics Festival, serving as the ultimate hub for emerging IT talents to showcase skills, compete, and innovate across cybersecurity, game development, data analysis, and business challenges. The design system embodies a "Tech-Forward Minimalism" aesthetic: a clean, grid-based white canvas punctuated by bold primary blues (#214afe, #0088ff) and warm accent oranges (#ffc878), with pixelated brand elements and dynamic geometric backgrounds that evoke both precision and creative energy. The visual language conveys confidence, accessibility, and forward momentum—inviting participants to see themselves as the next generation of tech leaders.

The brand voice is energetic yet professional, speaking directly to ambitious students and young professionals. Tone: encouraging without being patronizing, technical without jargon overload, celebratory of achievement. Example sentence: "Compete in real-world challenges, build your portfolio, and connect with Indonesia's top tech minds—all in one festival."

## Colors

The color palette is anchored by a vibrant primary blue (#214afe, lab(44.0605 29.0279 -86.0352)) used exclusively for primary CTAs, navigation highlights, and focus states—this is the brand's signature accent and appears on all "Home" buttons and key interactive elements. Secondary warm orange (#ffc878, frequency: 128 occurrences) provides supporting emphasis for secondary CTAs, badges, and decorative accents, creating visual warmth and approachability. Tertiary hot pink (#ff0055, frequency: 75 occurrences) is reserved for error states, alerts, and high-priority notifications. The surface stack uses a clean white (#ffffff) as the primary background with carefully calibrated grays (surface-container-low: #f5f5f5, surface-container: #eeeeee, surface-container-high: #e8e8e8) for layering and

## Typography

The type system uses IBM Plex Sans as the primary typeface, chosen for its technical clarity and modern warmth—it balances the precision required for a tech festival with approachability for a student audience. Display (60px, 800 weight, -0.04em letter-spacing) is reserved for hero headlines like "Empowering your tech journey with IFEST 2026," where the bold weight and tight tracking create visual impact. Headline-lg (40px, 700 weight) and headline-md (28px, 700 weight) are used for section titles and card headings, maintaining hierarchy through size and weight rather than color. Body text (16px–18px, 400 weight, 24–28px line-height) is set with 0.01em letter-spacing to improve readability at smaller sizes. Labels (12–14px, 500–600 weight) are used for buttons, badges, and form fields with

## Layout

The layout follows a 12-column grid system with a maximum container width of 1280px, enabling responsive scaling from mobile (single column) to desktop (full grid). The page rhythm is driven by consistent spacing: lg spacing (40px) separates major sections (hero, competitions, testimonials), md spacing (24px) divides cards and content blocks, and sm spacing (12px) provides breathing room within components. The hero section uses full-width background imagery with a parallax effect (animated SVG rectangles at varying depths), establishing visual depth and energy. Content is center-aligned with generous left/right gutters (24px on tablet, 40px on desktop) to prevent text from feeling cramped. Cards are arranged in a 3-column grid on desktop, 2-column on tablet, and single-column on mobile, wi

## Elevation & Depth

Depth is conveyed through a restrained shadow system and layering, avoiding heavy drop-shadows in favor of subtle, purposeful elevation. Level 1 (Base): The white surface (#ffffff) with no shadow, establishing the default plane. Level 2 (Cards & Containers): box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) with a 1px solid border at #e5e7eb (outline-variant), creating a soft separation from the background. Level 3 (Modals, Elevated Cards, Hover States): box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12) with the same border, signaling higher prominence. On hover, cards transition from Level 2 to Level 3 ove

## Shapes

The shape philosophy is "Geometric Precision with Approachability"—sharp enough to feel technical and modern, rounded enough to feel welcoming. Buttons and primary interactive elements use rounded: DEFAULT (0.5rem / 8px) for a balanced, contemporary look that's neither too sharp nor too soft. Cards and containers use rounded: md (0.75rem / 12px) to create subtle visual distinction from buttons while maintaining consistency. Input fields and form elements use rounded: DEFAULT (8px) to align with button styling and create a cohesive interaction zone. Badges and pills use rounded: full (9999px) t

## Components

### Action Elements
Buttons are the primary interaction mechanism and come in three variants: primary (blue #214afe), secondary (orange #ffc878), and tertiary (pink #ff0055). All buttons use 48px height, 10px vertical padding, 24px horizontal padding, and label-md typography (14px, 600 weight). Primary buttons appear on CTAs like "View Competitions" and navigation items; on hover, the background shifts to #0088ff over 200ms with no shadow change. Secondary buttons support primary actions (e.g., "Learn More") and use the warm orange to create visual variety. Tertiary buttons are reserved for destructive or high-alert actions. All buttons have a 1px transparent border that becomes visible on focus (border-color: {colors.primary}) to support keyboard navigation. Links are unstyled by default
