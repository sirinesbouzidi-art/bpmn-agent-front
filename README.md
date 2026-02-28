# BPMN Agent Front (Angular 17+)

Frontend-only Final Year Project application for **automatic BPMN generation from natural language**.

## Features
- Angular 17 standalone architecture with feature-based folders.
- Mock authentication with role-aware session storage in `localStorage`.
- ChatGPT-like home screen with prompt examples and real-time validation.
- BPMN visualization using `bpmn-js` viewer with zoom/export controls.
- History table with mocked BPMN models and export actions.
- Route protection via `AuthGuard`.

## Prerequisites
- Node.js 18+
- npm 9+

## Installation
```bash
npm install
```

## Run in development
```bash
npm start
```
Then open `http://localhost:4200`.

## Build
```bash
npm run build
```

## Test
```bash
npm test
```

## Angular Material installation (already included in this project)
If you need to reproduce setup from scratch:
```bash
ng add @angular/material
```

## bpmn-js installation (already included in this project)
If you need to reproduce setup from scratch:
```bash
npm install bpmn-js
```

## Mock Accounts
- `admin@bouygues.com` / `admin123`
- `user@bouygues.com` / `user123`
