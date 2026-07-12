# Design System & Style Guide

## Core Principles
1. **Clean & Minimalist**: Generous whitespace, high readability.
2. **Smooth Transitions**: Use Framer Motion for elegant page and component transitions.
3. **Color Palette**: Clean white base with soft blue accents to ensure eye comfort. Not too dark, not too bright.
4. **Typography**: Inter (sans-serif) for body and headings to maintain a technical yet approachable vibe.
5. **Shapes**: Containers and cards use slightly rounded corners (e.g. `rounded-lg`) instead of fully rounded or sharp edges.
6. **Icons**: Use raw Lucide React icons, without boxing them unless explicitly part of a button or card design.

## Typography
- Primary Font: 'Inter', sans-serif
- Headings: `text-gray-900`, `font-semibold`, tight tracking.
- Body text: `text-gray-600` or `text-slate-600`, leading-relaxed.

## Colors
- **Background**: `bg-slate-50` or `bg-white`
- **Primary Accent**: `text-blue-600`, `bg-blue-600`
- **Secondary/Hover Accent**: `bg-blue-50`, `text-blue-800`
- **Borders**: `border-slate-200`
- **Text (Dark)**: `text-slate-900`
- **Text (Muted)**: `text-slate-500`

## Components
- **Cards**: `bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow`
- **Buttons**: `px-4 py-2 rounded-md font-medium transition-colors`. Primary uses `bg-blue-600 text-white hover:bg-blue-700`.
- **Icons**: Raw SVG icons. Size `w-5 h-5` to `w-6 h-6`.

## Animations
- **Page Transitions**: Fade in and slight slide up (`opacity-0 translate-y-2` to `opacity-100 translate-y-0`).
- **Hover States**: Subtle scaling (`hover:-translate-y-1`) or shadow changes.
