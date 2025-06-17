# Energy Pipeline Dashboard - Frontend Setup Guide

## 🚀 Quick Start

Your Energy Pipeline Dashboard is now ready! This React TypeScript frontend connects to your FastAPI backend to display real-time energy consumption and weather data.

## 📁 Project Structure

```
project-bolt-sb1-94gutf3p/project/
├── src/
│   ├── components/           # React components
│   │   ├── StatusOverview.tsx        # System status & quick actions
│   │   ├── EnergyVisualization.tsx   # Charts & energy analytics
│   │   ├── PipelineMonitor.tsx       # Pipeline management
│   │   ├── Header.tsx               # Navigation
│   │   └── [other components]
│   ├── services/
│   │   └── api.ts           # Backend API integration
│   ├── App.tsx              # Main application
│   └── main.tsx             # Entry point
├── package.json             # Dependencies
└── vite.config.ts          # Build configuration
```

## 🛠️ Setup Instructions

### Step 1: Install Dependencies

```bash
cd project-bolt-sb1-94gutf3p/project
npm install
```

### Step 2: Start the Development Server

```bash
npm run dev
```

The frontend will start on **http://localhost:3000**

### Step 3: Ensure Backend is Running

Make sure your FastAPI backend is running on **http://localhost:8000**:

```bash
# In your backend directory
docker-compose up -d
```

## 🎯 Dashboard Features

### **Overview Tab**
- **Real-time system health** monitoring
- **Quick action buttons** to run data pipelines
- **System statistics** and recent activity
- **Connection status** to backend API

### **Analytics Tab** 
- **Interactive charts** showing energy consumption patterns
- **Regional comparison** with color-coded visualizations
- **Hourly consumption** trends and patterns
- **Data filtering** by region and time range
- **Export functionality** for data analysis

### **Pipeline Tab**
- **Pipeline management** with configuration options
- **Real-time monitoring** of pipeline execution
- **Historical run logs** and success rates
- **Manual trigger controls** for data ingestion

### **Other Tabs**
- **Data Quality**: Validation metrics and quality scores
- **API Status**: External API health monitoring
- **Configuration**: System settings and preferences

## 🔌 API Integration

The dashboard automatically connects to your FastAPI backend through the `api.ts` service layer:

```typescript
// Endpoints used:
- GET  /health                           # System health
- GET  /api/v1/status                   # Pipeline status
- GET  /api/v1/energy/consumption       # Energy data
- GET  /api/v1/energy/summary          # Energy analytics
- GET  /api/v1/weather/current         # Weather data
- POST /api/v1/pipeline/run-energy-ingestion   # Trigger energy pipeline
- POST /api/v1/pipeline/run-weather-ingestion  # Trigger weather pipeline
```

## 🎨 Technology Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **Lucide React** for icons
- **Axios** for API calls

## 🔧 Configuration

### Backend URL Configuration
The frontend is configured to connect to `http://localhost:8000`. To change this:

1. Edit `src/services/api.ts`
2. Update the `API_BASE_URL` constant
3. Update the proxy configuration in `vite.config.ts`

### Development vs Production
- **Development**: Uses proxy to backend (automatic)
- **Production**: Update `API_BASE_URL` to your production backend URL

## 📊 Data Flow

```
User Action → Frontend Component → API Service → FastAPI Backend → Database
     ↓
Backend Response → API Service → React State → UI Update
```

## 🚨 Troubleshooting

### Connection Issues
If you see "Backend disconnected" warnings:

1. **Check backend status**: Visit http://localhost:8000/health
2. **Restart backend**: `docker-compose down && docker-compose up -d`
3. **Check API keys**: Ensure `.env` file has valid EIA and OpenWeather keys

### No Data Displayed
If charts show "No data available":

1. **Run data pipelines** using the buttons in the Overview tab
2. **Check backend logs**: `docker-compose logs api`
3. **Verify API keys** are configured in your `.env` file

### Development Server Issues
If the frontend won't start:

1. **Clear node_modules**: `rm -rf node_modules && npm install`
2. **Update dependencies**: `npm update`
3. **Check port 3000**: Make sure nothing else is using port 3000

## 🎯 Next Steps

### Customization Options
1. **Add new charts** in `EnergyVisualization.tsx`
2. **Modify color schemes** in `tailwind.config.js`
3. **Add new API endpoints** in `api.ts`
4. **Create custom components** in the `components/` folder

### Production Deployment
1. **Build for production**: `npm run build`
2. **Serve static files**: Deploy `dist/` folder to your web server
3. **Update API URL**: Point to your production backend
4. **Enable HTTPS**: Configure SSL certificates

## 📱 Mobile Responsive

The dashboard is fully responsive and works on:
- **Desktop** (1920px+)
- **Tablet** (768px - 1920px)  
- **Mobile** (320px - 768px)

## 🔄 Auto-Refresh

The dashboard automatically:
- **Refreshes data** every 30 seconds
- **Checks connection** status continuously
- **Updates charts** with new data
- **Maintains real-time** system monitoring

## 📝 Development Tips

### Hot Reload
Changes to source files automatically reload the browser during development.

### Component Development
Each component is self-contained with:
- **TypeScript interfaces** for type safety
- **Error handling** for API failures
- **Loading states** for better UX
- **Responsive design** for all screen sizes

### API Testing
Use the browser developer tools to:
- **Monitor API calls** in the Network tab
- **Check error messages** in the Console
- **Debug React state** with React DevTools

---

## 🎉 Success!

Once setup is complete, you should see:

1. **Green "Connected to backend API"** banner
2. **Live system metrics** in the Overview tab
3. **Interactive charts** in the Analytics tab
4. **Functional pipeline controls** in the Pipeline tab

**Your Energy Pipeline Dashboard is now ready for use!**

## 🆘 Need Help?

- **Frontend issues**: Check browser console for errors
- **Backend issues**: Check `docker-compose logs api`
- **Data issues**: Verify API keys in `.env` file
- **Performance**: Use browser DevTools Performance tab

---

**Happy analyzing!** 📊⚡🌤️
