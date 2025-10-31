const crypto = require('crypto');

class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.locks = new Map();
    this.pendingConnections = new Map();
  }

  generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
  }

  async acquireLock(sessionId) {
    if (!this.locks.has(sessionId)) {
      this.locks.set(sessionId, []);
    }

    const queue = this.locks.get(sessionId);
    let unlock;
    const lock = new Promise(resolve => {
      unlock = () => {
        queue.shift();
        if (queue.length > 0) {
          queue[0]();
        }
        resolve();
      };
    });

    const canAcquire = queue.length === 0;
    queue.push(unlock);

    if (canAcquire) {
      queue[0]();
    }

    return lock;
  }

  createSession() {
    const sessionId = this.generateSessionId();
    this.sessions.set(sessionId, {
      id: sessionId,
      client: null,
      connected: false,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      activeOperations: 0
    });
    return sessionId;
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  async validateSession(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    if (!session.connected) {
      throw new Error(`Session ${sessionId} is not connected`);
    }
    return session;
  }

  async setConnected(sessionId, client) {
    const lock = await this.acquireLock(`${sessionId}:connect`);
    try {
      const session = this.getSession(sessionId);
      if (!session) throw new Error(`Session ${sessionId} not found`);
      if (session.connected) {
        throw new Error(`Session ${sessionId} is already connected`);
      }
      session.client = client;
      session.connected = true;
      session.lastActivity = Date.now();
    } finally {
      await lock;
    }
  }

  async setDisconnected(sessionId) {
    const lock = await this.acquireLock(`${sessionId}:disconnect`);
    try {
      const session = this.getSession(sessionId);
      if (!session) return;
      session.connected = false;
      session.client = null;
      session.lastActivity = Date.now();
    } finally {
      await lock;
    }
  }

  async beginOperation(sessionId) {
    const lock = await this.acquireLock(`${sessionId}:op`);
    try {
      const session = await this.validateSession(sessionId);
      session.activeOperations++;
      session.lastActivity = Date.now();
      return session;
    } finally {
      await lock;
    }
  }

  async endOperation(sessionId) {
    const lock = await this.acquireLock(`${sessionId}:op`);
    try {
      const session = this.getSession(sessionId);
      if (session) {
        session.activeOperations = Math.max(0, session.activeOperations - 1);
        session.lastActivity = Date.now();
      }
    } finally {
      await lock;
    }
  }

  async getSessionStats(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) return null;
    return {
      id: session.id,
      connected: session.connected,
      activeOperations: session.activeOperations,
      uptime: Date.now() - session.createdAt,
      lastActivity: Date.now() - session.lastActivity
    };
  }

  cleanupSession(sessionId) {
    this.sessions.delete(sessionId);
    this.locks.delete(sessionId);
    this.locks.delete(`${sessionId}:connect`);
    this.locks.delete(`${sessionId}:disconnect`);
    this.locks.delete(`${sessionId}:op`);
  }
}

module.exports = { SessionManager };
