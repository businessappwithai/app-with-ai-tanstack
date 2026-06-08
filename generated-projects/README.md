# simple-crm

Generated application

## Tech Stack

- **Backend**: NestJS + Fastify + Knex.js
- **Frontend**: TanStack Start + Shadcn UI + TanStack Query/Table/Form

## Features

- **Compiere-style Application Dictionary**: Runtime-configurable UI via sys_field metadata
- **sys_ Tables**: System/dictionary tables for configuration
- **bus_ Tables**: Business entity tables generated from ERD
- **Dynamic UI**: Form and table layouts driven by seq_no ordering
- **Admin Interface**: Drag-drop field reordering with immediate effect
- **ETag Concurrency**: Optimistic locking for safe concurrent edits

## Getting Started

### Prerequisites

- **Bun.js 1.1.0+** (REQUIRED runtime)
- PostgreSQL 14+ (or SQLite for development)

### Installation

```bash
# Install dependencies
bun install

# Setup environment
cp backend/.env.example backend/.env
# Edit .env with your database credentials

# Run migrations
bun run db:migrate

# Seed initial data (sys_reference, sys_table, sys_column, sys_field)
bun run db:seed
```

### Development

```bash
# Start both backend and frontend
bun run dev

# Or start individually
bun run dev:backend   # Backend on http://localhost:3000
bun run dev:frontend  # Frontend on http://localhost:3001
```

### Production Build

```bash
bun run build
```

## Project Structure

```
simple-crm/
├── backend/           # NestJS API
│   ├── src/
│   │   ├── modules/
│   │   │   ├── sys/   # Application Dictionary modules
│   │   │   └── bus/   # Business entity modules
│   │   └── ...
│   ├── migrations/    # Database migrations
│   └── seeds/         # Seed data
├── frontend/          # TanStack Start App
│   ├── src/routes/
│   └── ...
└── package.json       # Root workspace config
```

## Runtime UI Configuration

The UI layout can be modified at runtime through the admin interface:

1. Navigate to /admin (tanstackjs-nestjs) or #/admin (openui5-odatav4)
2. Select an entity to configure
3. Drag and drop fields to reorder
4. Changes take effect immediately

Field ordering is controlled by:
- `seq_no`: Order in detail forms
- `seq_no_grid`: Order in list/table views

## License

MIT
