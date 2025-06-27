// frontend/project/src/debug/testWebSocket.js
// Debug script to test WebSocket connection manually
// Copy and paste this into browser console at http://localhost:3000

console.log('🧪 Testing WebSocket Connection...');

// Test 1: Test through Vite proxy (NEW WAY - should work)
const testProxiedWebSocket = () => {
  console.log('📍 Test 1: WebSocket through Vite Proxy (CORRECT WAY)');
  
  const ws = new WebSocket('ws://localhost:3000/ws');
  
  ws.onopen = () => {
    console.log('✅ Proxied WebSocket opened successfully!');
    console.log('✅ This is the correct way - through Vite proxy');
    ws.close();
  };
  
  ws.onclose = (event) => {
    console.log(`🔌 Proxied WebSocket closed: ${event.code} - ${event.reason}`);
  };
  
  ws.onerror = (error) => {
    console.error('❌ Proxied WebSocket error:', error);
    console.log('Make sure Vite proxy is configured in vite.config.ts');
  };
  
  // Close after 5 seconds if still open
  setTimeout(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  }, 5000);
};

// Test 2: Direct connection (OLD WAY - will fail from browser)
const testDirectWebSocket = () => {
  console.log('📍 Test 2: Direct WebSocket Connection (OLD WAY - will fail)');
  
  const ws = new WebSocket('ws://localhost:8000/ws');
  
  ws.onopen = () => {
    console.log('✅ Direct WebSocket opened (unexpected!)');
    ws.close();
  };
  
  ws.onclose = (event) => {
    console.log(`🔌 Direct WebSocket closed: ${event.code} - ${event.reason}`);
  };
  
  ws.onerror = (error) => {
    console.error('❌ Direct WebSocket error (expected):', error);
    console.log('This is expected - browsers block cross-origin WebSocket connections');
  };
  
  // Close after 5 seconds if still open
  setTimeout(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  }, 5000);
};

// Test 3: Test different WebSocket endpoints through proxy
const testWebSocketEndpoints = () => {
  console.log('📍 Test 3: Testing Different Endpoints (through proxy)');
  
  const endpoints = ['/ws', '/ws/energy', '/ws/weather', '/ws/quality', '/ws/pipeline'];
  
  endpoints.forEach((endpoint, index) => {
    setTimeout(() => {
      console.log(`Testing endpoint: ${endpoint}`);
      const ws = new WebSocket(`ws://localhost:3000${endpoint}`);
      
      ws.onopen = () => {
        console.log(`✅ ${endpoint} - Connected through proxy`);
        ws.close();
      };
      
      ws.onerror = () => {
        console.error(`❌ ${endpoint} - Failed`);
      };
      
      ws.onclose = (event) => {
        if (event.code === 1000) {
          console.log(`✅ ${endpoint} - Closed normally`);
        } else {
          console.error(`❌ ${endpoint} - Closed with error: ${event.code}`);
        }
      };
      
      // Close after 3 seconds
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      }, 3000);
      
    }, index * 1000); // Stagger tests by 1 second
  });
};

// Test 4: Check if backend is responding
const testBackendHealth = async () => {
  console.log('📍 Test 4: Backend Health Check');
  
  try {
    const response = await fetch('/health');
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Backend is healthy:', data);
      
      if (data.websocket) {
        console.log('✅ Backend has WebSocket support');
        console.log(`   Active connections: ${data.websocket.active_connections}`);
        console.log(`   Heartbeat active: ${data.websocket.heartbeat_active}`);
      } else {
        console.warn('⚠️ Backend may not have WebSocket support');
      }
    } else {
      console.error('❌ Backend health check failed:', response.status);
    }
  } catch (error) {
    console.error('❌ Backend not reachable:', error.message);
  }
};

// Test 5: Test WebSocket stats endpoint
const testWebSocketStats = async () => {
  console.log('📍 Test 5: WebSocket Stats Check');
  
  try {
    const response = await fetch('/api/v1/websocket/stats');
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ WebSocket stats endpoint working:', data);
      console.log(`   Total connections: ${data.websocket_stats.total_connections}`);
      console.log(`   Recent messages: ${data.websocket_stats.recent_message_count}`);
    } else {
      console.error('❌ WebSocket stats endpoint failed:', response.status);
    }
  } catch (error) {
    console.error('❌ WebSocket stats endpoint not reachable:', error.message);
  }
};

// Run all tests
const runAllTests = async () => {
  console.log('🚀 Starting WebSocket Debug Tests...');
  console.log('=====================================');
  
  await testBackendHealth();
  console.log('');
  
  await testWebSocketStats();
  console.log('');
  
  console.log('Testing WebSocket connections...');
  testProxiedWebSocket();
  
  setTimeout(() => {
    console.log('');
    testDirectWebSocket();
  }, 6000);
  
  setTimeout(() => {
    console.log('');
    testWebSocketEndpoints();
  }, 12000);
  
  console.log('');
  console.log('📊 Tests initiated. Watch for results above.');
  console.log('📋 If you see ✅ messages for proxied connections, WebSocket is working!');
  console.log('📋 Direct connections (port 8000) are expected to fail.');
};

// Auto-run tests
runAllTests();

// Also expose functions for manual testing
window.testWebSocket = {
  runAllTests,
  testProxiedWebSocket,
  testDirectWebSocket,
  testWebSocketEndpoints,
  testBackendHealth,
  testWebSocketStats
};

console.log('💡 Manual test functions available:');
console.log('   testWebSocket.runAllTests()');
console.log('   testWebSocket.testProxiedWebSocket()');
console.log('   testWebSocket.testDirectWebSocket()');
console.log('   testWebSocket.testBackendHealth()');
