/* eslint-disable react-hooks/set-state-in-effect */
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
} as const;

// Socket configuration for stable connection
const SOCKET_CONFIG = {
    transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
    autoConnect: false, // Manual connect after auth
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
    // Heartbeat settings
    pingInterval: 25000,
    pingTimeout: 60000,
};

export const useSocket = () => {
    const { user, session } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
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
            });
            return;
        }

        // If socket already exists and connected, just join room
        if (socketRef.current?.connected) {
            joinUserRoom(socketRef.current);
            return;
        }

        // Create new socket instance
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
            joinUserRoom(socketInstance);
        });

        socketInstance.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            setIsConnected(false);
            
            // Handle specific disconnect reasons
            if (reason === DISCONNECT_REASONS.SERVER_INITIATED) {
                // Server initiated disconnect, try to reconnect
                socketInstance.connect();
            }
            // DISCONNECT_REASONS.CLIENT_INITIATED means we called disconnect() intentionally
            // Other reasons will trigger automatic reconnection
        });

        socketInstance.on('connect_error', (error) => {
            console.error('Socket connection error:', error.message);
            setConnectionError(error.message);
            setIsConnected(false);
        });

        socketInstance.on('reconnect', (attemptNumber) => {
            console.log('Socket reconnected after', attemptNumber, 'attempts');
            setIsConnected(true);
            setConnectionError(null);
            joinUserRoom(socketInstance);
        });

        socketInstance.on('reconnect_attempt', (attemptNumber) => {
            console.log('Socket reconnection attempt:', attemptNumber);
        });

        socketInstance.on('reconnect_error', (error) => {
            console.error('Socket reconnection error:', error.message);
        });

        socketInstance.on('reconnect_failed', () => {
            console.error('Socket reconnection failed');
            setConnectionError('Unable to connect to server');
        });

        // Start connection
        socketInstance.connect();
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
    }, [user, session, joinUserRoom]);

    // Manual reconnect function
    const reconnect = useCallback(() => {
        if (socketRef.current && !socketRef.current.connected) {
            socketRef.current.connect();
        }
    }, []);

    return { 
        socket, 
        isConnected, 
        connectionError,
        reconnect 
    };
};
