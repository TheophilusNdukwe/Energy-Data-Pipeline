# src/services/websocket_manager.py
import json
import asyncio
import logging
from typing import Dict, List, Set, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)

class MessageType(str, Enum):
    """WebSocket message types"""
    ENERGY_DATA = "energy_data"
    WEATHER_DATA = "weather_data"
    QUALITY_UPDATE = "quality_update"
    PIPELINE_STATUS = "pipeline_status"
    SYSTEM_HEALTH = "system_health"
    CONNECTION_ACK = "connection_ack"
    ERROR = "error"
    HEARTBEAT = "heartbeat"

class WebSocketMessage:
    """Standard WebSocket message format"""
    
    def __init__(self, message_type: MessageType, data: Any, timestamp: Optional[datetime] = None):
        self.type = message_type
        self.data = data
        self.timestamp = timestamp or datetime.now()
        self.id = f"{message_type}_{int(self.timestamp.timestamp() * 1000)}"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "type": self.type,
            "data": self.data,
            "timestamp": self.timestamp.isoformat(),
            "server_time": datetime.now().isoformat()
        }
    
    def to_json(self) -> str:
        return json.dumps(self.to_dict(), default=str)

class ConnectionManager:
    """Manages WebSocket connections and broadcasting"""
    
    def __init__(self):
        # Store active connections
        self.active_connections: Set[WebSocket] = set()
        
        # Store connections by subscription channels
        self.channel_subscriptions: Dict[str, Set[WebSocket]] = {
            "energy": set(),
            "weather": set(),
            "quality": set(),
            "pipeline": set(),
            "health": set(),
            "all": set()  # Clients subscribed to all updates
        }
        
        # Connection metadata
        self.connection_metadata: Dict[WebSocket, Dict[str, Any]] = {}
        
        # Message history for new connections
        self.recent_messages: List[WebSocketMessage] = []
        self.max_history = 100
        
        # Heartbeat monitoring
        self.heartbeat_interval = 30  # seconds
        self.heartbeat_task: Optional[asyncio.Task] = None
        
        logger.info("WebSocket ConnectionManager initialized")
    
    async def connect(self, websocket: WebSocket, channels: List[str] = None):
        """Accept a new WebSocket connection and subscribe to channels"""
        try:
            await websocket.accept()
            self.active_connections.add(websocket)
            
            # Default to 'all' channel if none specified
            if not channels:
                channels = ["all"]
            
            # Subscribe to requested channels
            for channel in channels:
                if channel in self.channel_subscriptions:
                    self.channel_subscriptions[channel].add(websocket)
            
            # Store connection metadata
            self.connection_metadata[websocket] = {
                "connected_at": datetime.now(),
                "channels": channels,
                "last_heartbeat": datetime.now(),
                "message_count": 0
            }
            
            # Send connection acknowledgment
            ack_message = WebSocketMessage(
                MessageType.CONNECTION_ACK,
                {
                    "status": "connected",
                    "channels": channels,
                    "server_time": datetime.now().isoformat(),
                    "available_channels": list(self.channel_subscriptions.keys())
                }
            )
            await self._send_to_connection(websocket, ack_message)
            
            # Send recent message history
            await self._send_history_to_connection(websocket, channels)
            
            # Start heartbeat if this is the first connection
            if len(self.active_connections) == 1 and not self.heartbeat_task:
                self.heartbeat_task = asyncio.create_task(self._heartbeat_loop())
            
            logger.info(f"WebSocket client connected. Channels: {channels}. Total connections: {len(self.active_connections)}")
            
        except Exception as e:
            logger.error(f"Error connecting WebSocket client: {str(e)}")
            await self.disconnect(websocket)
            raise
    
    async def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        try:
            # Remove from active connections
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
            
            # Remove from all channel subscriptions
            for channel_connections in self.channel_subscriptions.values():
                channel_connections.discard(websocket)
            
            # Clean up metadata
            if websocket in self.connection_metadata:
                metadata = self.connection_metadata.pop(websocket)
                logger.info(f"WebSocket client disconnected. Was connected for {datetime.now() - metadata['connected_at']}. Total connections: {len(self.active_connections)}")
            
            # Stop heartbeat if no connections remain
            if not self.active_connections and self.heartbeat_task:
                self.heartbeat_task.cancel()
                self.heartbeat_task = None
                
        except Exception as e:
            logger.error(f"Error disconnecting WebSocket client: {str(e)}")
    
    async def broadcast_to_channel(self, channel: str, message: WebSocketMessage):
        """Broadcast a message to all clients subscribed to a specific channel"""
        if channel not in self.channel_subscriptions:
            logger.warning(f"Invalid channel: {channel}")
            return
        
        # Add to message history
        self._add_to_history(message)
        
        # Get connections for this channel + 'all' channel
        target_connections = self.channel_subscriptions[channel].union(
            self.channel_subscriptions["all"]
        )
        
        if not target_connections:
            logger.debug(f"No clients subscribed to channel: {channel}")
            return
        
        # Broadcast to all target connections
        disconnected_connections = []
        success_count = 0
        
        for connection in target_connections:
            try:
                await self._send_to_connection(connection, message)
                success_count += 1
            except WebSocketDisconnect:
                disconnected_connections.append(connection)
            except Exception as e:
                logger.error(f"Error sending message to WebSocket client: {str(e)}")
                disconnected_connections.append(connection)
        
        # Clean up disconnected connections
        for connection in disconnected_connections:
            await self.disconnect(connection)
        
        logger.debug(f"Broadcasted {message.type} to {success_count} clients in channel '{channel}'")
    
    async def broadcast_to_all(self, message: WebSocketMessage):
        """Broadcast a message to all connected clients"""
        await self.broadcast_to_channel("all", message)
    
    async def _send_to_connection(self, websocket: WebSocket, message: WebSocketMessage):
        """Send a message to a specific connection"""
        try:
            await websocket.send_text(message.to_json())
            
            # Update connection metadata
            if websocket in self.connection_metadata:
                self.connection_metadata[websocket]["message_count"] += 1
                self.connection_metadata[websocket]["last_heartbeat"] = datetime.now()
                
        except WebSocketDisconnect:
            await self.disconnect(websocket)
            raise
        except Exception as e:
            logger.error(f"Failed to send message to WebSocket: {str(e)}")
            await self.disconnect(websocket)
            raise
    
    async def _send_history_to_connection(self, websocket: WebSocket, channels: List[str]):
        """Send recent message history to a newly connected client"""
        try:
            # Filter history by channels client is subscribed to
            relevant_messages = []
            for message in self.recent_messages[-20:]:  # Last 20 messages
                if "all" in channels:
                    relevant_messages.append(message)
                elif message.type == MessageType.ENERGY_DATA and "energy" in channels:
                    relevant_messages.append(message)
                elif message.type == MessageType.WEATHER_DATA and "weather" in channels:
                    relevant_messages.append(message)
                elif message.type == MessageType.QUALITY_UPDATE and "quality" in channels:
                    relevant_messages.append(message)
                elif message.type == MessageType.PIPELINE_STATUS and "pipeline" in channels:
                    relevant_messages.append(message)
                elif message.type == MessageType.SYSTEM_HEALTH and "health" in channels:
                    relevant_messages.append(message)
            
            # Send history messages
            for message in relevant_messages:
                await self._send_to_connection(websocket, message)
                
            logger.debug(f"Sent {len(relevant_messages)} history messages to new client")
            
        except Exception as e:
            logger.error(f"Error sending history to new connection: {str(e)}")
    
    def _add_to_history(self, message: WebSocketMessage):
        """Add a message to the recent history"""
        self.recent_messages.append(message)
        
        # Trim history if it gets too long
        if len(self.recent_messages) > self.max_history:
            self.recent_messages = self.recent_messages[-self.max_history:]
    
    async def _heartbeat_loop(self):
        """Send periodic heartbeat messages to maintain connections"""
        try:
            while self.active_connections:
                heartbeat_message = WebSocketMessage(
                    MessageType.HEARTBEAT,
                    {
                        "server_time": datetime.now().isoformat(),
                        "active_connections": len(self.active_connections),
                        "total_channels": len([ch for ch, conns in self.channel_subscriptions.items() if conns])
                    }
                )
                
                await self.broadcast_to_all(heartbeat_message)
                await asyncio.sleep(self.heartbeat_interval)
                
        except asyncio.CancelledError:
            logger.info("Heartbeat loop cancelled")
        except Exception as e:
            logger.error(f"Error in heartbeat loop: {str(e)}")
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get current connection statistics"""
        channel_stats = {}
        for channel, connections in self.channel_subscriptions.items():
            channel_stats[channel] = len(connections)
        
        return {
            "total_connections": len(self.active_connections),
            "channel_subscriptions": channel_stats,
            "recent_message_count": len(self.recent_messages),
            "heartbeat_active": self.heartbeat_task is not None and not self.heartbeat_task.done()
        }

# Global connection manager instance
connection_manager = ConnectionManager()

# Convenience functions for broadcasting
async def broadcast_energy_data(data: Dict[str, Any]):
    """Broadcast new energy data to subscribers"""
    message = WebSocketMessage(MessageType.ENERGY_DATA, data)
    await connection_manager.broadcast_to_channel("energy", message)

async def broadcast_weather_data(data: Dict[str, Any]):
    """Broadcast new weather data to subscribers"""
    message = WebSocketMessage(MessageType.WEATHER_DATA, data)
    await connection_manager.broadcast_to_channel("weather", message)

async def broadcast_quality_update(data: Dict[str, Any]):
    """Broadcast quality check results to subscribers"""
    message = WebSocketMessage(MessageType.QUALITY_UPDATE, data)
    await connection_manager.broadcast_to_channel("quality", message)

async def broadcast_pipeline_status(data: Dict[str, Any]):
    """Broadcast pipeline status updates to subscribers"""
    message = WebSocketMessage(MessageType.PIPELINE_STATUS, data)
    await connection_manager.broadcast_to_channel("pipeline", message)

async def broadcast_system_health(data: Dict[str, Any]):
    """Broadcast system health updates to subscribers"""
    message = WebSocketMessage(MessageType.SYSTEM_HEALTH, data)
    await connection_manager.broadcast_to_channel("health", message)
