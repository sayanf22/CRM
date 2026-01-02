import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// OneSignal App ID from environment variable
const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;

// Declare OneSignal types
declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
    OneSignal?: any;
  }
}

export function useOneSignal() {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    // Don't initialize if no App ID configured
    if (!ONESIGNAL_APP_ID || ONESIGNAL_APP_ID === 'your_onesignal_app_id_here') {
      console.log('OneSignal: App ID not configured');
      return;
    }

    // Initialize OneSignal
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal: any) {
      try {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          // Safari Web ID (optional - only if you have Safari support)
          // safari_web_id: "web.onesignal.auto.xxxxx",
          notifyButton: {
            enable: true, // Shows the bell icon for subscription
          },
          allowLocalhostAsSecureOrigin: true, // For development
        });

        setIsInitialized(true);
        console.log('OneSignal: Initialized successfully');

        // Check subscription status
        const permission = await OneSignal.Notifications.permission;
        setIsSubscribed(permission);

        // Listen for subscription changes
        OneSignal.Notifications.addEventListener('permissionChange', (permission: boolean) => {
          setIsSubscribed(permission);
          console.log('OneSignal: Permission changed to', permission);
        });

      } catch (error) {
        console.error('OneSignal: Initialization failed', error);
      }
    });
  }, []);

  // Link Supabase user ID as External User ID when user logs in
  useEffect(() => {
    if (!isInitialized || !user?.id) return;

    window.OneSignalDeferred?.push(async function(OneSignal: any) {
      try {
        // Set the External User ID to the Supabase user ID
        // This allows targeting notifications to specific users
        await OneSignal.login(user.id);
        console.log('OneSignal: Logged in user', user.id);
      } catch (error) {
        console.error('OneSignal: Failed to set external user ID', error);
      }
    });

    // Cleanup: logout when user logs out
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
  }, [isInitialized, user?.id]);

  // Function to prompt user for notification permission
  const requestPermission = async () => {
    if (!isInitialized) return false;

    return new Promise<boolean>((resolve) => {
      window.OneSignalDeferred?.push(async function(OneSignal: any) {
        try {
          await OneSignal.Notifications.requestPermission();
          const permission = await OneSignal.Notifications.permission;
          setIsSubscribed(permission);
          resolve(permission);
        } catch (error) {
          console.error('OneSignal: Permission request failed', error);
          resolve(false);
        }
      });
    });
  };

  return {
    isInitialized,
    isSubscribed,
    requestPermission,
  };
}
