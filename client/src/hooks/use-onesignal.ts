import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// Declare OneSignal types
declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
    OneSignal?: any;
  }
}

// Global state to prevent multiple initializations
let oneSignalInitialized = false;
let appIdFetched: string | null = null;
let userLoggedIn: string | null = null;

export function useOneSignal() {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(oneSignalInitialized);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const fetchedRef = useRef(false);
  const loginAttemptedRef = useRef<string | null>(null);

  // Check current subscription status
  const checkSubscription = useCallback(async () => {
    try {
      if (window.OneSignal?.Notifications) {
        const permission = await window.OneSignal.Notifications.permission;
        setIsSubscribed(permission);
        return permission;
      }
    } catch (e) {
      console.error('OneSignal: Error checking subscription', e);
    }
    return false;
  }, []);

  // Initialize OneSignal
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function initOneSignal() {
      // If already initialized, just check subscription
      if (oneSignalInitialized) {
        setIsInitialized(true);
        await checkSubscription();
        return;
      }

      // Fetch App ID if not already fetched
      if (!appIdFetched) {
        try {
          console.log('OneSignal: Fetching App ID...');
          const { data, error } = await supabase.functions.invoke('get-onesignal-config');
          
          if (error || !data?.appId) {
            console.error('OneSignal: Failed to get App ID', error);
            return;
          }
          
          appIdFetched = data.appId;
          console.log('OneSignal: Got App ID');
        } catch (err) {
          console.error('OneSignal: Error fetching config', err);
          return;
        }
      }

      // Initialize SDK
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async function(OneSignal: any) {
        try {
          if (oneSignalInitialized) {
            setIsInitialized(true);
            await checkSubscription();
            return;
          }

          console.log('OneSignal: Initializing SDK...');
          
          await OneSignal.init({
            appId: appIdFetched,
            notifyButton: { enable: false },
            promptOptions: { autoPrompt: false },
            allowLocalhostAsSecureOrigin: true,
          });

          oneSignalInitialized = true;
          setIsInitialized(true);
          console.log('OneSignal: Initialized successfully');

          // Check subscription
          await checkSubscription();

          // Listen for permission changes
          OneSignal.Notifications.addEventListener('permissionChange', (permission: boolean) => {
            setIsSubscribed(permission);
            console.log('OneSignal: Permission changed to', permission);
          });

        } catch (error: any) {
          if (error?.message?.includes('already initialized')) {
            oneSignalInitialized = true;
            setIsInitialized(true);
            await checkSubscription();
          } else {
            console.error('OneSignal: Init failed', error);
          }
        }
      });
    }

    initOneSignal();
  }, [checkSubscription]);

  // Login user to OneSignal (link external user ID)
  useEffect(() => {
    if (!isInitialized || !user?.id) return;
    if (loginAttemptedRef.current === user.id) return;
    if (userLoggedIn === user.id) return;

    loginAttemptedRef.current = user.id;

    // Wait a bit for SDK to be fully ready
    const timer = setTimeout(() => {
      window.OneSignalDeferred?.push(async function(OneSignal: any) {
        try {
          // Check if SDK is ready
          if (!OneSignal?.User) {
            console.log('OneSignal: SDK not ready for login yet');
            return;
          }
          
          console.log('OneSignal: Logging in user:', user.id);
          await OneSignal.login(user.id);
          userLoggedIn = user.id;
          console.log('OneSignal: User logged in');
        } catch (error) {
          console.error('OneSignal: Login failed (non-critical)', error);
        }
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [isInitialized, user?.id]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isInitialized) {
      console.log('OneSignal: Not initialized');
      return false;
    }

    return new Promise<boolean>((resolve) => {
      window.OneSignalDeferred?.push(async function(OneSignal: any) {
        try {
          console.log('OneSignal: Requesting permission...');
          const permission = await OneSignal.Notifications.requestPermission();
          setIsSubscribed(permission);
          console.log('OneSignal: Permission result:', permission);
          resolve(permission);
        } catch (error) {
          console.error('OneSignal: Permission request failed', error);
          resolve(false);
        }
      });
    });
  }, [isInitialized]);

  // Check if notifications are blocked
  const isBlocked = typeof Notification !== 'undefined' && Notification.permission === 'denied';

  return {
    isInitialized,
    isSubscribed,
    isBlocked,
    requestPermission,
  };
}
