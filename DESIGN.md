# EvalMind AI Design System

## Visual Style
- Minimal, clean interface inspired by Apple
- White + light gray backgrounds
- Soft shadows only (shadow-sm, shadow-md)
- No heavy gradients or flashy effects

## Colors
- **Primary**: #2563eb (blue-600)
- **Background**: #ffffff
- **Surface**: #f9fafb (gray-50)
- **Text Primary**: #111827 (gray-900)
- **Text Secondary**: #6b7280 (gray-500)
- **Success**: #22c55e (green-500)
- **Error**: #ef4444 (red-500)
- **Border**: #e5e7eb (gray-200)

## Typography
- **Font**: Inter or standard system sans-serif
- **Main Heading**: `text-4xl font-semibold tracking-tight`
- **Section Heading**: `text-xl font-semibold`
- **Body Text**: `text-sm text-gray-700`
- **Small Text**: `text-xs text-gray-500`

## Components

### Buttons
- **Primary**: `bg-blue-600 text-white rounded-xl px-6 py-3 font-medium hover:bg-blue-700 active:scale-[0.98] transition-all`
- **Secondary**: `bg-gray-100 text-gray-900 rounded-xl px-6 py-3 font-medium hover:bg-gray-200 active:scale-[0.98] transition-all`
- **Ghost**: `text-gray-600 hover:bg-gray-50 rounded-xl px-4 py-2 transition-all`

### Cards
- **Base**: `bg-white border border-gray-100 shadow-sm rounded-2xl p-6`
- **Interactive**: `hover:shadow-md hover:border-gray-200 transition-all cursor-pointer`

### Inputs
- **Base**: `w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all`
- **Label**: `text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block`

### Upload Box
- **Base**: `border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer`
- **Icon Container**: `w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4`

## Layout
- **Max Width**: `max-w-6xl mx-auto`
- **Spacing**: Generous use of `p-6`, `p-8`, `gap-6`, `space-y-8`
- **Navbar**: `fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100`

## Rules
### DO
- Keep UI minimal and focused
- Maintain consistent spacing (multiples of 4px)
- Use soft shadows for depth
- Ensure high text contrast for readability
- Use rounded corners (xl for small, 2xl for large)

### DON'T
- Use heavy shadows (`shadow-2xl` is usually too much)
- Use more than 2-3 primary/accent colors
- Mix different corner radii (keep it consistent)
- Use aggressive animations
- Clutter the screen with unnecessary elements
