#!/bin/bash
# backup.sh - Database backup script

# Configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="energy_pipeline"
DB_USER="postgres"
BACKUP_DIR="database/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

echo "🗄️ Starting database backup..."

# Full database backup
echo "📦 Creating full database backup..."
docker-compose exec -T postgres pg_dump -U postgres energy_pipeline > "$BACKUP_DIR/full_backup_$DATE.sql"

# Data-only backup (no schema)
echo "📊 Creating data-only backup..."
docker-compose exec -T postgres pg_dump -U postgres --data-only energy_pipeline > "$BACKUP_DIR/data_only_$DATE.sql"

# Schema-only backup
echo "🏗️ Creating schema-only backup..."
docker-compose exec -T postgres pg_dump -U postgres --schema-only energy_pipeline > "$BACKUP_DIR/schema_only_$DATE.sql"

# Backup specific tables with high importance
echo "🔥 Creating quality metrics backup..."
docker-compose exec -T postgres pg_dump -U postgres -t data_quality_metrics -t data_quality_issues energy_pipeline > "$BACKUP_DIR/quality_data_$DATE.sql"

# Compress backups
echo "🗜️ Compressing backups..."
gzip "$BACKUP_DIR/full_backup_$DATE.sql"
gzip "$BACKUP_DIR/data_only_$DATE.sql"
gzip "$BACKUP_DIR/schema_only_$DATE.sql"
gzip "$BACKUP_DIR/quality_data_$DATE.sql"

# Keep only last 7 days of backups
echo "🧹 Cleaning old backups..."
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "✅ Backup completed successfully!"
echo "📁 Backup files created in: $BACKUP_DIR"
ls -la $BACKUP_DIR/*$DATE*

# Show backup sizes
echo "📊 Backup sizes:"
du -h $BACKUP_DIR/*$DATE*