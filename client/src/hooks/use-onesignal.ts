import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// Declare OneSignal types
declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
    OneSignal?: any;
  }
}

// Track if OneSignal has been initialized globally (outside React)
let oneSignalInitialized = false;

export function useOneSignal() {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(oneSignalInitialized);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [appId, setAppId] = useState<string | null>(null);
  const initAttempted = useRef(false);

  // Fetch OneSignal App ID from Supabase Edge Function
  useEffect(() => {
    async function fetchAppId() {
      try {
        console.log('OneSignal: Fetching App ID from server...');
        const { data, error } = await supabase.functions.invoke('get-onesignal-config');
        
        if (error) {
          console.error('OneSignal: Failed to fetch config', error);
          return;
        }
        
        console.log('OneSignal: Response from server:', data);
        
        if (data?.appId) {
          console.log('OneSignal: Got App ID from server:', data.appId.substring(0, 8) + '...');
          setAppId(data.appId);
        } else {
          console.warn('OneSignal: No App ID configured in Supabase secrets. Please add ONESIGNAL_APP_ID secret.');
        }
      } catch (err) {
        console.error('OneSignal: Error fetching config', err);
      }
    }
    fetchAppId();
  }, []);

  // Initialize OneSignal once we have the App ID
  useEffect(() => {
    if (!appId || oneSignalInitialized || initAttempted.current) return;
    initAttempted.current = true;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal: any) {
      try {
        // Check if already initialized
        if (oneSignalInitialized) {
          console.log('OneSignal: Already initialized, skipping...');
          setIsInitialized(true);
          
          // Just check current permission
          const permission = await OneSignal.Notifications.permission;
          setIsSubscribed(permission);
          return;
        }

        console.log('OneSignal: Initializing...');
        
        await OneSignal.init({
          appId: appId,
          notifyButton: {
            enable: false,
          },
          promptOptions: {
            autoPrompt: false,
          },
          allowLocalhostAsSecureOrigin: true,
        });

        oneSignalInitialized = true;
        setIsInitialized(true);
        console.log('OneSignal: Initialized successfully');

        // Check subscription status
        const permission = await OneSignal.Notifications.permission;
        setIsSubscribed(permission);
        console.log('OneSignal: Current permission:', permission);

        // Listen for subscription changes
        OneSignal.Notifications.addEventListener('permissionChange', (permission: boolean) => {
          setIsSubscribed(permission);
          console.log('OneSignal: Permission changed to', permission);
        });

      } catch (error: any) {
        // If already initialized, that's okay
        if (error?.message?.includes('already initialized')) {
          console.log('OneSignal: Was already initialized');
          oneSignalInitialized = true;
          setIsInitialized(true);
          
          // Check current permission
          try {
            const OneSignal = window.OneSignal;
            if (OneSignal) {
              const permission = await OneSignal.Notifications.permission;
              setIsSubscribed(permission);
            }
          } catch (e) {
            console.error('OneSignal: Error checking permission', e);
          }
        } else {
          console.error('OneSignal: Initialization failed', error);
        }
      }
    });
  }, [appId]);

  // Link Supabase user ID as External User ID when user logs in
  useEffect(() => {
    if (!isInitialized || !user?.id) return;

    window.OneSignalDeferred?.push(async function(OneSignal: any) {
      try {
        console.log('OneSignal: Setting external user ID:', user.id);
        await OneSignal.login(user.id);
        console.log('OneSignal: User logged in successfully');
      } catch (error) {
        console.error('OneSignal: Failed to set external user ID', error);
      }
    });
  }, [isInitialized, user?.id]);

  // Logout from OneSignal when user logs out
  useEffect(() => {
    if (!isInitialized) return;
    
    return () => {
      if (!user) {
        window.OneSignalDeferred?.push(async function(OneSignal: any) {
          try {
            await OneSignal.logout();
            console.log('OneSignal: Logged out user');
          } catch (error) {
            console.error('OneSignal: Failed to logout', error);
          }
        });
      }
    };
  }, [isInitialized, user]);

  // Function to request notification permission
  const requestPermission = async (): Promise<boolean> => {
    if (!isInitialized) {
      console.log('OneSignal: Not initialized yet');
      return false;
    }

    return new Promise<boolean>((resolve) => {
      window.OneSignalDeferred?.push(async function(OneSignal: any) {
        try {
          console.log('OneSignal: Requesting permission...');
          
          // Request native browser permission
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
  };

  // Function to check if notifications are blocked
  const isBlocked = (): boolean => {
    if (typeof Notification !== 'undefined') {
      return Notification.permission === 'denied';
    }
    return false;
  };

  return {
    isInitialized,
    isSubscribed,
    isBlocked: isBlocked(),
    requestPermission,
  };
}
