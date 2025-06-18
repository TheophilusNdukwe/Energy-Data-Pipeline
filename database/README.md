# Database SQL Scripts

This folder contains useful SQL scripts for database management.

## Files:
- `init.sql` - Initial database setup
- `migrations/` - Database migration scripts  
- `backups/` - Database backup scripts
- `manual_queries/` - Useful manual queries for debugging

## Usage:
```bash
# Run SQL script
psql -h localhost -U postgres -d energy_pipeline -f database/sql/init.sql
```

## Database Schema:
The actual database models are defined in `/src/database/models.py`