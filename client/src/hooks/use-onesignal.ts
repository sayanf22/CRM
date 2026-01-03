import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Declare OneSignal types
declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
    OneSignal?: any;
  }
}

// Global tracking
let sdkReady = false;

export function useOneSignal() {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Check subscription status
  const checkSubscription = useCallback(async () => {
    try {
      const OneSignal = window.OneSignal;
      if (OneSignal?.Notifications) {
        const permission = await OneSignal.Notifications.permission;
        setIsSubscribed(permission === true);
        return permission;
      }
    } catch (e) {
      // Ignore errors
    }
    return false;
  }, []);

  // Wait for SDK to be ready
  useEffect(() => {
    if (sdkReady) {
      setIsInitialized(true);
      checkSubscription();
      return;
    }

    // The SDK initializes itself via the script in index.html
    // We just need to wait for it to be ready
    const checkReady = setInterval(async () => {
      const OneSignal = window.OneSignal;
      if (OneSignal && typeof OneSignal.Notifications !== 'undefined') {
        clearInterval(checkReady);
        sdkReady = true;
        setIsInitialized(true);
        await checkSubscription();
        
        // Listen for permission changes
        try {
          OneSignal.Notifications.addEventListener('permissionChange', (permission: boolean) => {
            setIsSubscribed(permission);
            console.log('OneSignal: Permission changed to', permission);
          });
        } catch (e) {
          // Ignore
        }
      }
    }, 500);

    // Cleanup
    return () => clearInterval(checkReady);
  }, [checkSubscription]);

  // Login user when authenticated
  useEffect(() => {
    if (!isInitialized || !user?.id) return;

    const loginUser = async () => {
      try {
        const OneSignal = window.OneSignal;
        if (OneSignal?.login) {
          await OneSignal.login(user.id);
          console.log('OneSignal: User logged in');
        }
      } catch (e) {
        // Non-critical error
        console.log('OneSignal: Login skipped');
      }
    };

    // Delay to ensure SDK is fully ready
    const timer = setTimeout(loginUser, 2000);
    return () => clearTimeout(timer);
  }, [isInitialized, user?.id]);

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const OneSignal = window.OneSignal;
      if (OneSignal?.Notifications) {
        console.log('OneSignal: Requesting permission...');
        const result = await OneSignal.Notifications.requestPermission();
        setIsSubscribed(result === true);
        console.log('OneSignal: Permission result:', result);
        return result === true;
      }
    } catch (error) {
      console.error('OneSignal: Permission request failed', error);
    }
    return false;
  }, []);

  // Check if blocked
  const isBlocked = typeof Notification !== 'undefined' && Notification.permission === 'denied';

  return {
    isInitialized,
    isSubscribed,
    isBlocked,
    requestPermission,
  };
}
