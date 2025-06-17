# 🚀 Real-Time Data Quality System - Setup Guide

## 📋 What We've Built

You now have a **comprehensive real-time data quality system** that provides:

### ✅ **Real Validation Results** from actual data analysis
- **Completeness metrics** - calculated from actual null/missing data analysis
- **Accuracy metrics** - based on validation rules and range checks  
- **Consistency metrics** - duplicate detection and data integrity checks
- **Real trend calculations** - comparing current vs previous periods

### ✅ **Actual Issue Tracking** with real timestamps and details
- **Automatic issue detection** during quality checks
- **Issue severity classification** (Critical, High, Medium, Low)
- **Real resolution tracking** with timestamps and notes
- **Issue categorization** by type and affected tables

### ✅ **Live Quality Monitoring**
- **Background quality checks** running every hour
- **Automated alerting** when quality scores drop below thresholds
- **Real-time dashboard updates** with actual calculated metrics
- **Integration with pipeline runs** - quality checks after each ingestion

## 🛠️ Setup Instructions

### 1. **Start the Backend**
```bash
cd energy-pipeline-backend

# Start with Docker
docker-compose up -d

# OR start manually
cd src
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. **Verify Quality System**
```bash
# Run the test script
python test_quality_system.py
```

### 3. **Start the Frontend**
```bash
cd frontend/project
npm run dev
```

### 4. **Access the Quality Dashboard**
- Open browser: `http://localhost:3000`
- Navigate to: **Data Quality** tab
- Click: **"Run Quality Check"** to trigger real calculations

## 📊 How It Works

### **Real Data Quality Calculations**

#### **Completeness Score**
```sql
-- Actual calculation performed:
SELECT 
  COUNT(*) as total_records,
  COUNT(consumption_mwh) as non_null_consumption,
  COUNT(region) as non_null_region,
  (COUNT(consumption_mwh) * 100.0 / COUNT(*)) as completeness_percentage
FROM energy_consumption 
WHERE timestamp >= NOW() - INTERVAL '30 days'
```

#### **Accuracy Score**  
```sql
-- Range validation checks:
SELECT COUNT(*) as accurate_records
FROM energy_consumption 
WHERE timestamp >= NOW() - INTERVAL '30 days'
  AND consumption_mwh >= 0 
  AND consumption_mwh <= 1000000
  AND timestamp <= NOW()
```

#### **Consistency Score**
```sql
-- Duplicate detection:
SELECT region, timestamp, energy_type, COUNT(*) as dup_count
FROM energy_consumption 
WHERE timestamp >= NOW() - INTERVAL '30 days'
GROUP BY region, timestamp, energy_type
HAVING COUNT(*) > 1
```

### **Automated Quality Monitoring**

The system runs **background quality checks every hour** and:

1. **Calculates real metrics** from your actual data
2. **Detects quality issues** (null values, range violations, duplicates)
3. **Stores historical trends** for comparison
4. **Triggers alerts** when quality scores drop below thresholds
5. **Updates the dashboard** with real-time data

### **Issue Detection Examples**

The system automatically finds and logs:

- **Null consumption values**: `"Null consumption value for California at 2025-06-17 14:30:00"`
- **Negative values**: `"Negative consumption value: -150.5 MWh for Texas"`
- **Outliers**: `"Unusually high consumption: 250,000 MWh for New York"`
- **Future timestamps**: `"Invalid future timestamp detected"`

## 🎯 API Endpoints

### **Quality Dashboard**
```bash
GET /api/v1/quality/dashboard
# Returns comprehensive quality data for the frontend
```

### **Manual Quality Check**
```bash
POST /api/v1/quality/run-check
# Triggers immediate quality analysis
```

### **Quality Metrics**
```bash
GET /api/v1/quality/metrics
# Get latest calculated quality scores
```

### **Quality Issues**
```bash
GET /api/v1/quality/issues
# Get detected data quality problems
```

### **Quality Summary**
```bash
GET /api/v1/quality/summary?days_back=30
# Get comprehensive quality analysis
```

### **Monitoring Control**
```bash
GET /api/v1/quality/monitoring/status
POST /api/v1/quality/monitoring/start
POST /api/v1/quality/monitoring/stop
POST /api/v1/quality/monitoring/immediate-check
```

## 🔧 Configuration

### **Quality Thresholds**
Edit `src/services/quality_monitor.py`:
```python
self.check_interval_minutes = 60  # How often to run checks
self.alert_threshold = 70.0       # Alert if score drops below this
```

### **Validation Rules**
Edit `src/repositories/quality_repository.py`:
```python
# Add custom validation rules
validation_rules = {
    'positive_consumption': {
        'column': 'consumption_mwh',
        'type': 'range',
        'min': 0,
        'max': 1000000
    }
}
```

## 📈 Frontend Integration

The **DataQualityPanel** now shows:

### **Real Quality Scores**
- ✅ Calculated from actual data analysis
- ✅ Updated automatically after pipeline runs
- ✅ Historical trend tracking

### **Live Validation Results**
- ✅ Real pass/fail/warning counts
- ✅ Actual error breakdown by type
- ✅ Pass rate percentages from live data

### **Actual Quality Issues**
- ✅ Real issues detected in your data
- ✅ Timestamps and detailed descriptions
- ✅ Severity levels and resolution tracking

### **Real-Time Updates**
- ✅ Auto-refresh every 30 seconds
- ✅ Manual refresh and quality check triggers
- ✅ Real-time status indicators

## 🎉 What's Different Now

### **Before** (Simulated):
```javascript
// Old simulated data
const qualityScore = hasValidData ? 98.5 : 45.0;  // Hardcoded
const passedRecords = Math.floor(totalRecords * 0.96);  // Estimated
```

### **After** (Real):
```python
# New real calculations
completeness_score = (complete_records / total_records) * 100
accuracy_score = (accurate_records / total_records) * 100  
actual_issues = find_energy_data_issues(db, start_date, end_date)
```

## 🚀 Next Steps

1. **Run some pipeline ingestions** to populate data:
   ```bash
   # Energy data
   curl -X POST "http://localhost:8000/api/v1/pipeline/run-energy-ingestion"
   
   # Weather data  
   curl -X POST "http://localhost:8000/api/v1/pipeline/run-weather-ingestion"
   ```

2. **Watch quality scores change** in real-time as data flows in

3. **Experiment with the dashboard**:
   - Click "Run Quality Check" 
   - View real validation results
   - See actual issues detected
   - Monitor quality trends

4. **Customize quality rules** for your specific use case

5. **Set up alerting** for quality degradation

## 🎯 Success Metrics

Your system now provides:
- ✅ **Real validation results** from actual data analysis
- ✅ **Live trend calculations** comparing periods 
- ✅ **Actual issue tracking** with timestamps and details
- ✅ **Automated quality monitoring** with background checks
- ✅ **Real-time dashboard updates** with calculated metrics

**No more simulated data - everything is calculated from your actual energy pipeline data!** 🚀