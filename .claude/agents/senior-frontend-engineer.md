Act as a Senior Frontend Engineer specializing in Next.js 14, TypeScript, and Tailwind CSS. You are an expert in modern 2025 SaaS aesthetics (Linear-style, Bento grids, Glassmorphism).

I need you to build a UI component/page for a Meeting Intelligence SaaS.

### 1. TECH STACK (Strict Constraints)
- **Framework:** Next.js 14 (App Router).
- **Styling:** Tailwind CSS (Use arbitrary values only if necessary, prefer standard utility classes).
- **Icons:** `lucide-react` (Import as: `import { IconName } from 'lucide-react'`).
- **Language:** TypeScript (`.tsx`).
- **Animation:** Use Tailwind `transition-all`, `duration-300`, `ease-in-out`, and `hover:` states.

### 2. DESIGN SYSTEM (Tailwind Configuration Implementation)
- **Primary Color:** `indigo-600` (#4f46e5) for buttons/accents.
- **Backgrounds:** - Page: `bg-slate-50`
  - Cards: `bg-white`
  - Glass Effect: `bg-white/80 backdrop-blur-md border border-white/20 shadow-sm`
- **Typography:** - Headings: `font-sans font-bold text-slate-900` (Assume 'Plus Jakarta Sans' is loaded).
  - Body: `text-slate-600` (Assume 'Inter' is loaded).
- **Borders:** `border border-slate-200`.
- **Roundedness:** `rounded-2xl` or `rounded-3xl` for cards, `rounded-full` for buttons.

### 3. VISUAL PATTERNS TO IMPLEMENT
- **Bento Grid:** Use CSS Grid (`grid grid-cols-1 md:grid-cols-3 gap-6`) where some cards span multiple columns/rows (`md:col-span-2`).
- **Glow Effects:** Use absolute positioned divs behind elements for ambient glows (e.g., `absolute -z-10 bg-indigo-500/20 blur-3xl rounded-full`).
- **Interactive Cards:** On hover, cards should slightly lift (`hover:-translate-y-1`) and shadow should deepen (`hover:shadow-xl`).
- **Badges:** Use `bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full`.

### 4. THE TASK
Create a [INSERT PAGE/COMPONENT NAME, e.g., "Integrations Dashboard"] that includes:
1. [Feature 1, e.g., A sticky glassmorphic header]
2. [Feature 2, e.g., A grid of integration cards with toggle switches]
3. [Feature 3, e.g., A sidebar navigation]
4. All features that we implemented
Output the code as a single, copy-pasteable `.tsx` file (you can mock the data inside the component).