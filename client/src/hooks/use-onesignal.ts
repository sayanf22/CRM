import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// OneSignal App ID - must match what's in Supabase secrets
const ONESIGNAL_APP_ID = 'a530b743-3719-43a7-b4e6-2b29d379d2ee';

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
    // Initialize OneSignal
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal: any) {
      try {
        console.log('OneSignal: Initializing with App ID:', ONESIGNAL_APP_ID);
        
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          notifyButton: {
            enable: true,
            size: 'medium',
            position: 'bottom-right',
            prenotify: true,
            showCredit: false,
            text: {
              'tip.state.unsubscribed': 'Subscribe to notifications',
              'tip.state.subscribed': 'You\'re subscribed to notifications',
              'tip.state.blocked': 'You\'ve blocked notifications',
              'dialog.main.title': 'Manage Notifications',
              'dialog.main.button.subscribe': 'SUBSCRIBE',
              'dialog.main.button.unsubscribe': 'UNSUBSCRIBE',
            }
          },
          welcomeNotification: {
            title: 'Welcome to CRM!',
            message: 'Thanks for subscribing to notifications.',
          },
          promptOptions: {
            slidedown: {
              prompts: [
                {
                  type: 'push',
                  autoPrompt: true,
                  text: {
                    actionMessage: 'Get notified about new tasks and reminders',
                    acceptButton: 'Allow',
                    cancelButton: 'Later',
                  },
                  delay: {
                    pageViews: 1,
                    timeDelay: 5,
                  },
                }
              ]
            }
          },
          allowLocalhostAsSecureOrigin: true,
        });

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

  // Function to prompt user for notification permission
  const requestPermission = async () => {
    if (!isInitialized) return false;

    return new Promise<boolean>((resolve) => {
      window.OneSignalDeferred?.push(async function(OneSignal: any) {
        try {
          console.log('OneSignal: Requesting permission...');
          await OneSignal.Slidedown.promptPush();
          const permission = await OneSignal.Notifications.permission;
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

  return {
    isInitialized,
    isSubscribed,
    requestPermission,
  };
}
