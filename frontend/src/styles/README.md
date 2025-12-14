# Color System Documentation

## Overview
This application uses a centralized, industry-level color system built with CSS custom properties (variables) for consistent theming across all components.

## File Structure
- `colors.css` - Main color definitions and variables

## Color Categories

### 1. **Primary Colors** (Neutral Grays)
Used for primary UI elements, backgrounds, and text.
```css
--color-primary-50 to --color-primary-950
```
Range from lightest (#fafafa) to darkest (#0a0a0a)

### 2. **Secondary Colors** (Slate)
Used for secondary UI elements with a slight blue tint.
```css
--color-secondary-50 to --color-secondary-900
```

### 3. **Accent Colors**
#### Blue
```css
--color-accent-blue-50 to --color-accent-blue-900
```
Used for: Primary buttons, links, upload features

#### Indigo
```css
--color-accent-indigo-50 to --color-accent-indigo-900
```
Used for: Gradients, highlights

#### Purple
```css
--color-accent-purple-50 to --color-accent-purple-900
```
Used for: Chat features, secondary actions

### 4. **Semantic Colors**
#### Success (Green)
```css
--color-success-50 to --color-success-900
```
Used for: Success messages, confirmations, positive actions

#### Warning (Yellow/Amber)
```css
--color-warning-50 to --color-warning-900
```
Used for: Warnings, caution states

#### Error (Red)
```css
--color-error-50 to --color-error-900
```
Used for: Error messages, delete actions, dangerous operations

#### Info (Cyan)
```css
--color-info-50 to --color-info-900
```
Used for: Informational messages, help text

### 5. **Grayscale (Black & White Shades)**
```css
--color-white: #ffffff
--color-gray-50 to --color-gray-900
--color-black: #000000
```

## Semantic Variables

### Background Colors
```css
--color-background-primary      /* Main background (white in light mode) */
--color-background-secondary    /* Secondary background (gray-50) */
--color-background-tertiary     /* Tertiary background (gray-100) */
--color-background-hover        /* Hover state background */
--color-background-active       /* Active state background */
--color-background-disabled     /* Disabled element background */
```

### Text Colors
```css
--color-text-primary           /* Primary text (gray-900) */
--color-text-secondary         /* Secondary text (gray-600) */
--color-text-tertiary          /* Tertiary text (gray-500) */
--color-text-disabled          /* Disabled text (gray-400) */
--color-text-inverse           /* Inverse text (white) */
--color-text-link              /* Link text (blue-600) */
--color-text-link-hover        /* Link hover (blue-700) */
```

### Border Colors
```css
--color-border-light           /* Light borders (gray-200) */
--color-border-medium          /* Medium borders (gray-300) */
--color-border-dark            /* Dark borders (gray-400) */
--color-border-focus           /* Focus state (blue-500) */
--color-border-error           /* Error state (red-500) */
--color-border-success         /* Success state (green-500) */
```

### Shadow Variables
```css
--shadow-sm       /* Small shadow */
--shadow-base     /* Base shadow */
--shadow-md       /* Medium shadow */
--shadow-lg       /* Large shadow */
--shadow-xl       /* Extra large shadow */
--shadow-2xl      /* 2X large shadow */
```

### Component-Specific Variables

#### Buttons
```css
--color-button-primary-bg
--color-button-primary-hover
--color-button-primary-text
--color-button-secondary-bg
--color-button-secondary-hover
--color-button-secondary-text
--color-button-secondary-border
```

#### Cards
```css
--color-card-bg
--color-card-border
--color-card-hover-border
--color-card-shadow
--color-card-hover-shadow
```

#### Inputs
```css
--color-input-bg
--color-input-border
--color-input-border-focus
--color-input-text
--color-input-placeholder
```

### Gradients
```css
--gradient-primary     /* Main page gradient */
--gradient-blue        /* Blue gradient for upload features */
--gradient-purple      /* Purple gradient for chat features */
--gradient-success     /* Green gradient for success states */
```

## Usage Examples

### In CSS Files
```css
.my-component {
    background-color: var(--color-background-primary);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-light);
    box-shadow: var(--shadow-base);
}

.my-component:hover {
    background-color: var(--color-background-hover);
    box-shadow: var(--shadow-lg);
}
```

### For Buttons
```css
.primary-button {
    background: var(--gradient-blue);
    color: var(--color-white);
    box-shadow: var(--shadow-lg);
}
```

### For Cards
```css
.card {
    background: var(--color-card-bg);
    border: 1px solid var(--color-card-border);
    box-shadow: var(--color-card-shadow);
}

.card:hover {
    border-color: var(--color-card-hover-border);
    box-shadow: var(--color-card-hover-shadow);
}
```

## Dark Mode Support

All colors automatically adjust for dark mode through the `.dark` class. The color system inverts appropriately:

- Light backgrounds become dark
- Dark text becomes light
- Borders adjust for visibility
- Accent colors remain consistent

Example:
```css
/* Light mode */
--color-background-primary: #ffffff;
--color-text-primary: #171717;

/* Dark mode */
.dark {
    --color-background-primary: #171717;
    --color-text-primary: #fafafa;
}
```

## Best Practices

### DO ✅
- Use semantic variables (`--color-background-primary`) instead of direct colors
- Use appropriate shade levels (50 for very light, 900 for very dark)
- Use shadows for depth (`var(--shadow-lg)`)
- Use gradients for buttons and highlights
- Keep contrast ratios accessible (WCAG AA minimum)

### DON'T ❌
- Don't use hardcoded hex values in components
- Don't use Tailwind color utilities (text-gray-500) when CSS variables exist
- Don't mix color systems
- Don't create custom colors outside this system

## Adding New Colors

If you need a new color:

1. Add it to `colors.css` following the existing pattern
2. Create both light and dark mode versions
3. Use the 50-900 scale for consistency
4. Document it in this README
5. Create semantic variables if it's for a specific use case

## Migration Checklist

When updating existing components:

- [ ] Replace hardcoded colors with CSS variables
- [ ] Replace Tailwind color utilities with CSS classes
- [ ] Test in both light and dark modes
- [ ] Verify hover/focus/active states
- [ ] Check accessibility contrast ratios
- [ ] Update component-specific CSS files

## Color Accessibility

All color combinations meet WCAG 2.1 Level AA standards:
- Normal text: 4.5:1 contrast ratio
- Large text: 3:1 contrast ratio
- UI components: 3:1 contrast ratio

## Browser Support

CSS custom properties are supported in:
- Chrome 49+
- Firefox 31+
- Safari 9.1+
- Edge 15+

## Maintenance

The color system is maintained in:
- `/src/styles/colors.css` - Variable definitions
- Component CSS files use these variables
- Import order: colors.css should be imported first in index.css
