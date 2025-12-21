// Socket.IO hooks require setting state within effects for connection management
// This is a valid pattern for external system synchronization

import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/auth-context';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Socket disconnect reasons from Socket.IO
const DISCONNECT_REASONS = {
    SERVER_INITIATED: 'io server disconnect',
    CLIENT_INITIATED: 'io client disconnect',
    TRANSPORT_CLOSE: 'transport close',
    TRANSPORT_ERROR: 'transport error',
    PING_TIMEOUT: 'ping timeout',
} as const;

// Socket configuration for stable connection
const SOCKET_CONFIG = {
    // Prefer websocket first for lower latency, but allow fallback to polling
    // This ensures connection even in restrictive network environments
    transports: ['websocket', 'polling'],
    upgrade: true,
    autoConnect: false, // Manual connect after auth
    // Reconnection settings (exponential backoff)
    reconnection: true,
    reconnectionAttempts: 30, // Reduced from 50 to fail faster and show error to user
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    randomizationFactor: 0.5,
    // Timeouts - must be reasonable for real-world networks
    timeout: 20000,
    // Force new connection on reconnect to avoid stale state
    forceNew: false,
    // Multiplexing - single connection per host
    multiplex: true,
};

export const useSocket = () => {
    const { user, session } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [reconnectAttempt, setReconnectAttempt] = useState(0);
    const socketRef = useRef<Socket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isOnlineRef = useRef(typeof navigator !== 'undefined' ? navigator.onLine : true);
    
    // Use a ref to track user ID to avoid dependency issues
    const userIdRef = useRef<string | undefined>(undefined);
    
    // Keep ref in sync with user
    useEffect(() => {
        userIdRef.current = user?.id;
    }, [user?.id]);

    // Join user room for private messages
    const joinUserRoom = useCallback((socketInstance: Socket) => {
        if (userIdRef.current && socketInstance.connected) {
            socketInstance.emit('join-room', userIdRef.current);
        }
    }, []);

    // Handle online/offline events for better reconnection
    useEffect(() => {
        const handleOnline = () => {
            console.log('Network: online');
            isOnlineRef.current = true;
            // Try to reconnect if we have a socket but it's disconnected
            if (socketRef.current && !socketRef.current.connected) {
                console.log('Attempting reconnect after coming online...');
                socketRef.current.connect();
            }
        };

        const handleOffline = () => {
            console.log('Network: offline');
            isOnlineRef.current = false;
            setConnectionError('You are offline');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Handle visibility change - reconnect when tab becomes visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && socketRef.current) {
                // Tab became visible, check connection
                if (!socketRef.current.connected && isOnlineRef.current) {
                    console.log('Tab visible, reconnecting...');
                    socketRef.current.connect();
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    useEffect(() => {
        // Only connect when we have a valid user session
        if (!user || !session) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            // This is intentional: we need to reset state when user logs out
            // Using requestAnimationFrame to defer to next frame
            requestAnimationFrame(() => {
                setSocket(null);
                setIsConnected(false);
                setConnectionError(null);
                setReconnectAttempt(0);
            });
            return;
        }

        // If socket already exists, handle differently
        if (socketRef.current) {
            if (socketRef.current.connected) {
                // Already connected, just ensure we're in the right room
                joinUserRoom(socketRef.current);
                return;
            } else {
                // Socket exists but disconnected - try to reconnect instead of creating new
                if (isOnlineRef.current) {
                    socketRef.current.connect();
                }
                return;
            }
        }

        // Create new socket instance only if one doesn't exist
        const socketInstance = io(SOCKET_URL, {
            ...SOCKET_CONFIG,
            auth: {
                token: session.access_token,
            },
        });

        socketRef.current = socketInstance;

        // Connection events
        socketInstance.on('connect', () => {
            console.log('Socket connected:', socketInstance.id);
            setIsConnected(true);
            setConnectionError(null);
            setReconnectAttempt(0);
            joinUserRoom(socketInstance);
        });

        socketInstance.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            setIsConnected(false);
            
            // Handle specific disconnect reasons
            switch (reason) {
                case DISCONNECT_REASONS.SERVER_INITIATED:
                    // Server initiated disconnect, try to reconnect immediately
                    console.log('Server disconnected us, reconnecting...');
                    socketInstance.connect();
                    break;
                case DISCONNECT_REASONS.TRANSPORT_CLOSE:
                case DISCONNECT_REASONS.TRANSPORT_ERROR:
                    // Network issue - will auto-reconnect
                    setConnectionError('Connection lost, reconnecting...');
                    break;
                case DISCONNECT_REASONS.PING_TIMEOUT:
                    // Server didn't respond to ping - will auto-reconnect
                    setConnectionError('Server not responding, reconnecting...');
                    break;
                // CLIENT_INITIATED means we called disconnect() intentionally
            }
        });

        socketInstance.on('connect_error', (error) => {
            console.error('Socket connection error:', error.message);
            // Don't show error if we're offline
            if (isOnlineRef.current) {
                setConnectionError(`Connection failed: ${error.message}`);
            }
            setIsConnected(false);
        });

        socketInstance.on('reconnect', (attemptNumber) => {
            console.log('Socket reconnected after', attemptNumber, 'attempts');
            setIsConnected(true);
            setConnectionError(null);
            setReconnectAttempt(0);
            joinUserRoom(socketInstance);
        });

        socketInstance.on('reconnect_attempt', (attemptNumber) => {
            console.log('Socket reconnection attempt:', attemptNumber);
            setReconnectAttempt(attemptNumber);
        });

        socketInstance.on('reconnect_error', (error) => {
            console.error('Socket reconnection error:', error.message);
        });

        socketInstance.on('reconnect_failed', () => {
            console.error('Socket reconnection failed after max attempts');
            setConnectionError('Unable to connect to server. Please refresh the page.');
        });

        // Handle room joined confirmation
        socketInstance.on('room-joined', (data: { userId: string; success: boolean }) => {
            if (data.success) {
                console.log('Joined user room successfully');
            }
        });

        // Start connection only if online
        if (isOnlineRef.current) {
            socketInstance.connect();
        }
        setSocket(socketInstance);

        return () => {
            // Capture ref value at cleanup time
            const timeoutId = reconnectTimeoutRef.current;
            if (timeoutId) {
                clearTimeout(timeoutId);
                reconnectTimeoutRef.current = null;
            }
            socketInstance.removeAllListeners();
            socketInstance.disconnect();
            socketRef.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, session]);
    // Note: joinUserRoom is stable (no deps) and only uses refs, so excluded from deps intentionally

    // Manual reconnect function
    const reconnect = useCallback(() => {
        if (socketRef.current && !socketRef.current.connected && isOnlineRef.current) {
            setConnectionError(null);
            socketRef.current.connect();
        }
    }, []);

    return { 
        socket, 
        isConnected, 
        connectionError,
        reconnectAttempt,
        reconnect 
    };
};
