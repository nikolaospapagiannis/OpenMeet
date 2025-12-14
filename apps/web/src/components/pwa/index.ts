export { InstallPrompt } from './InstallPrompt';
export { OfflineIndicator, OfflineStatus } from './OfflineIndicator';
export { PushNotificationSetup, NotificationSettings } from './PushNotificationSetup';
export { UpdateAvailable, UpdateStatus } from './UpdateAvailable';

// Export all components as default for convenience
import { InstallPrompt } from './InstallPrompt';
import { OfflineIndicator } from './OfflineIndicator';
import { PushNotificationSetup } from './PushNotificationSetup';
import { UpdateAvailable } from './UpdateAvailable';

export const PWAComponents = {
  InstallPrompt,
  OfflineIndicator,
  PushNotificationSetup,
  UpdateAvailable
};

export default PWAComponents;