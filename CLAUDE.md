# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev          # Start development server with Vite
npm run build        # Production build
npm run lint         # TypeScript/React linting (ESLint)
npm run lint:scss    # SCSS linting (Stylelint)
npm run format       # Format code with Prettier
npm run precommit    # Run all linting + format staged files (used by Husky)
npm run preview      # Preview production build locally
```

## Project Architecture

**AIGLE Frontend** is a French government geospatial detection monitoring application built with React + TypeScript + Vite.

### Tech Stack

-   **Frontend**: React 18 + TypeScript + Vite (SWC)
-   **UI**: Mantine v7 + French Design System (DSFR)
-   **Maps**: Mapbox GL JS with React integration
-   **State**: Zustand + TanStack Query v5
-   **HTTP**: Axios with interceptors
-   **Styling**: SCSS with CSS Modules

### Code Organization

#### Component Structure

-   Components use **CSS Modules** (`.module.scss` files)
-   **Feature-based organization** in `/src/components/`
-   **Page components** in `/src/routes/`
-   **TypeScript models** in `/src/models/`

#### State Management

-   **Zustand stores** with persistence for auth and map state
-   **TanStack Query** for server state caching
-   **Context providers** for global state distribution

#### Key Directories

-   `/src/components/DetectionDetail/` - Detection object detail views
-   `/src/components/Map/` - Mapbox integration and controls
-   `/src/components/admin/` - Administrative interface
-   `/src/routes/` - Page-level components
-   `/src/models/` - TypeScript type definitions
-   `/src/utils/context/` - Zustand stores and contexts

### API Architecture

-   **Centralized endpoints** in `api-endpoints.ts`
-   **Axios interceptors** for JWT authentication
-   **Type-safe responses** with TypeScript models

### Authentication

-   **JWT-based** with refresh tokens
-   **Role-based access**: ADMIN, SUPER_ADMIN, COLLECTIVITY, DDTM
-   **Protected routes** with role verification

### Code Quality

-   **TypeScript strict mode** with path aliases (`@/*` → `src/*`)
-   **Prettier** with 4-space tabs, 120 character width
-   **Pre-commit hooks** with Husky running lint + format
-   **ESLint** with React and TypeScript rules

### Map Integration

-   **Mapbox GL JS** with custom controls and overlays
-   **Geospatial processing** using Turf.js
-   **Layer management** with background/overlay distinction
-   **Drawing tools** for geographical selections

### Development Notes

-   Run **both lint commands** before committing: `npm run lint && npm run lint:scss`
-   Use **CSS Modules** for component styling
-   Follow **existing patterns** for new components
-   Import paths use **`@/` alias** for src directory
-   **Mantine components** are the primary UI library
-   **DSFR design system** ensures French government compliance
