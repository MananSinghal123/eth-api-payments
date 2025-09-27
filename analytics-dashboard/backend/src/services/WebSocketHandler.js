import { logger } from '../utils/logger.js';

export class WebSocketHandler {
  constructor(wss) {
    this.wss = wss;
    this.clients = new Map();
    this.subscriptions = new Map();
    this.healthy = false;
  }

  initialize() {
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      const clientInfo = {
        id: clientId,
        ws,
        ip: req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        connectedAt: new Date(),
        subscriptions: new Set(),
        lastActivity: new Date()
      };

      this.clients.set(clientId, clientInfo);
      
      logger.info(`WebSocket client connected: ${clientId} from ${clientInfo.ip}`);

      // Send welcome message
      this.sendToClient(clientId, 'connection', {
        clientId,
        message: 'Connected to ETH API Payments Analytics',
        timestamp: new Date().toISOString()
      });

      // Handle incoming messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(clientId, message);
        } catch (error) {
          logger.error(`Invalid message from client ${clientId}:`, error.message);
          this.sendToClient(clientId, 'error', {
            message: 'Invalid JSON message format'
          });
        }
      });

      // Handle client disconnect
      ws.on('close', (code, reason) => {
        logger.info(`WebSocket client disconnected: ${clientId}, code: ${code}, reason: ${reason.toString()}`);
        this.removeClient(clientId);
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error(`WebSocket error for client ${clientId}:`, error);
        this.removeClient(clientId);
      });

      // Update activity tracking
      ws.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.lastActivity = new Date();
        }
      });
    });

    // Start heartbeat to check client connections
    this.startHeartbeat();
    
    this.healthy = true;
    logger.info('WebSocket server initialized successfully');
  }

  handleMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastActivity = new Date();

    const { type, data } = message;

    switch (type) {
      case 'subscribe':
        this.handleSubscription(clientId, data);
        break;
      
      case 'unsubscribe':
        this.handleUnsubscription(clientId, data);
        break;
      
      case 'ping':
        this.sendToClient(clientId, 'pong', { timestamp: new Date().toISOString() });
        break;
      
      case 'query':
        this.handleQuery(clientId, data);
        break;
      
      default:
        this.sendToClient(clientId, 'error', {
          message: `Unknown message type: ${type}`,
          supportedTypes: ['subscribe', 'unsubscribe', 'ping', 'query']
        });
    }
  }

  handleSubscription(clientId, data) {
    const { channels } = data;
    const client = this.clients.get(clientId);
    
    if (!client || !Array.isArray(channels)) {
      this.sendToClient(clientId, 'error', {
        message: 'Invalid subscription request'
      });
      return;
    }

    const validChannels = ['metrics', 'payments', 'users', 'providers', 'insights'];
    const subscribedChannels = [];

    channels.forEach(channel => {
      if (validChannels.includes(channel)) {
        client.subscriptions.add(channel);
        subscribedChannels.push(channel);
        
        // Add to global subscriptions map
        if (!this.subscriptions.has(channel)) {
          this.subscriptions.set(channel, new Set());
        }
        this.subscriptions.get(channel).add(clientId);
      }
    });

    this.sendToClient(clientId, 'subscription_confirmed', {
      subscribedChannels,
      totalSubscriptions: client.subscriptions.size
    });

    logger.info(`Client ${clientId} subscribed to channels: ${subscribedChannels.join(', ')}`);
  }

  handleUnsubscription(clientId, data) {
    const { channels } = data;
    const client = this.clients.get(clientId);
    
    if (!client || !Array.isArray(channels)) {
      this.sendToClient(clientId, 'error', {
        message: 'Invalid unsubscription request'
      });
      return;
    }

    const unsubscribedChannels = [];

    channels.forEach(channel => {
      if (client.subscriptions.has(channel)) {
        client.subscriptions.delete(channel);
        unsubscribedChannels.push(channel);
        
        // Remove from global subscriptions map
        const channelSubs = this.subscriptions.get(channel);
        if (channelSubs) {
          channelSubs.delete(clientId);
          if (channelSubs.size === 0) {
            this.subscriptions.delete(channel);
          }
        }
      }
    });

    this.sendToClient(clientId, 'unsubscription_confirmed', {
      unsubscribedChannels,
      remainingSubscriptions: Array.from(client.subscriptions)
    });

    logger.info(`Client ${clientId} unsubscribed from channels: ${unsubscribedChannels.join(', ')}`);
  }

  async handleQuery(clientId, data) {
    const { query, params } = data;
    
    try {
      // This would integrate with your services to handle real-time queries
      let result;
      
      switch (query) {
        case 'live_metrics':
          result = await this.getLiveMetrics();
          break;
        case 'recent_payments':
          result = await this.getRecentPayments(params?.limit || 10);
          break;
        case 'active_users':
          result = await this.getActiveUsers();
          break;
        default:
          result = { error: 'Unknown query type' };
      }
      
      this.sendToClient(clientId, 'query_result', {
        query,
        params,
        result,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error(`Query error for client ${clientId}:`, error);
      this.sendToClient(clientId, 'query_error', {
        query,
        error: error.message
      });
    }
  }

  sendToClient(clientId, type, data) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== client.ws.OPEN) {
      return false;
    }

    try {
      const message = JSON.stringify({
        type,
        data,
        timestamp: new Date().toISOString()
      });
      
      client.ws.send(message);
      return true;
    } catch (error) {
      logger.error(`Failed to send message to client ${clientId}:`, error);
      this.removeClient(clientId);
      return false;
    }
  }

  broadcast(type, data, channel = null) {
    let targetClients = [];
    
    if (channel) {
      // Broadcast to subscribers of specific channel
      const channelSubs = this.subscriptions.get(channel);
      if (channelSubs) {
        targetClients = Array.from(channelSubs);
      }
    } else {
      // Broadcast to all clients
      targetClients = Array.from(this.clients.keys());
    }

    let successCount = 0;
    targetClients.forEach(clientId => {
      if (this.sendToClient(clientId, type, data)) {
        successCount++;
      }
    });

    logger.info(`Broadcast sent to ${successCount}/${targetClients.length} clients${channel ? ` in channel ${channel}` : ''}`);
    return successCount;
  }

  // Broadcast specific event types
  broadcastMetricsUpdate(metricsData) {
    this.broadcast('metrics_update', metricsData, 'metrics');
  }

  broadcastNewPayment(paymentData) {
    this.broadcast('new_payment', paymentData, 'payments');
  }

  broadcastUserActivity(userData) {
    this.broadcast('user_activity', userData, 'users');
  }

  broadcastProviderUpdate(providerData) {
    this.broadcast('provider_update', providerData, 'providers');
  }

  broadcastInsightsUpdate(insightsData) {
    this.broadcast('insights_update', insightsData, 'insights');
  }

  removeClient(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from all subscriptions
    client.subscriptions.forEach(channel => {
      const channelSubs = this.subscriptions.get(channel);
      if (channelSubs) {
        channelSubs.delete(clientId);
        if (channelSubs.size === 0) {
          this.subscriptions.delete(channel);
        }
      }
    });

    this.clients.delete(clientId);
  }

  startHeartbeat() {
    setInterval(() => {
      const now = new Date();
      const staleThreshold = 30 * 1000; // 30 seconds

      this.clients.forEach((client, clientId) => {
        const timeSinceActivity = now - client.lastActivity;
        
        if (timeSinceActivity > staleThreshold) {
          if (client.ws.readyState === client.ws.OPEN) {
            client.ws.ping();
          } else {
            this.removeClient(clientId);
          }
        }
      });
    }, 15000); // Check every 15 seconds
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Service integration methods
  async getLiveMetrics() {
    // This would call your GraphService to get latest metrics
    return {
      connectedClients: this.clients.size,
      totalSubscriptions: Array.from(this.subscriptions.values()).reduce((sum, subs) => sum + subs.size, 0),
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  async getRecentPayments(limit = 10) {
    // This would call your GraphService to get recent payments
    return {
      payments: [], // Would be populated from GraphService
      limit,
      timestamp: new Date().toISOString()
    };
  }

  async getActiveUsers() {
    // This would call your services to get active user count
    return {
      activeUsers: this.clients.size, // Simplified - would use real data
      timestamp: new Date().toISOString()
    };
  }

  // Status and management methods
  getStatus() {
    return {
      healthy: this.healthy,
      connectedClients: this.clients.size,
      totalSubscriptions: Array.from(this.subscriptions.values()).reduce((sum, subs) => sum + subs.size, 0),
      channels: Array.from(this.subscriptions.keys()),
      uptime: process.uptime()
    };
  }

  getClientInfo() {
    return Array.from(this.clients.values()).map(client => ({
      id: client.id,
      ip: client.ip,
      connectedAt: client.connectedAt,
      subscriptions: Array.from(client.subscriptions),
      lastActivity: client.lastActivity
    }));
  }

  isHealthy() {
    return this.healthy;
  }

  close() {
    this.healthy = false;
    
    // Send disconnect message to all clients
    this.broadcast('server_shutdown', {
      message: 'Server is shutting down',
      timestamp: new Date().toISOString()
    });

    // Close all connections
    this.clients.forEach((client, clientId) => {
      client.ws.close(1001, 'Server shutdown');
    });

    this.clients.clear();
    this.subscriptions.clear();
    
    logger.info('WebSocket server closed');
  }
}