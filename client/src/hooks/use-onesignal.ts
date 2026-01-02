import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

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
  const [appId, setAppId] = useState<string | null>(null);

  // Fetch OneSignal App ID from Supabase Edge Function
  useEffect(() => {
    async function fetchAppId() {
      try {
        const { data, error } = await supabase.functions.invoke('get-onesignal-config');
        if (error) {
          console.error('OneSignal: Failed to fetch config', error);
          return;
        }
        if (data?.appId) {
          console.log('OneSignal: Got App ID from server');
          setAppId(data.appId);
        } else {
          console.log('OneSignal: No App ID configured in Supabase secrets');
        }
      } catch (err) {
        console.error('OneSignal: Error fetching config', err);
      }
    }
    fetchAppId();
  }, []);

  // Initialize OneSignal once we have the App ID
  useEffect(() => {
    if (!appId) return;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal: any) {
      try {
        console.log('OneSignal: Initializing...');
        
        await OneSignal.init({
          appId: appId,
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
