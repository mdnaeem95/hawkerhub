// apps/mobile/src/hooks/useSocket.ts
import { useEffect } from 'react';
import { socketService } from '@/services/socket.service';

export function useSocket(event: string, callback: (data: any) => void) {
  useEffect(() => {
    socketService.on(event, callback);

    return () => {
      socketService.off(event, callback);
    };
  }, [event, callback]);
}

export function useSocketConnection() {
  useEffect(() => {
    socketService.connect();

    return () => {
      // Don't disconnect on unmount as other components might be using it
      // socketService.disconnect();
    };
  }, []);
}