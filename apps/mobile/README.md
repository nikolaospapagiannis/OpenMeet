# OpenMeet Mobile App

React Native mobile application for the OpenMeet meeting intelligence platform.

## Features

- **Authentication**: Login with email/password and biometric authentication support
- **Meetings List**: Browse and search all meetings with offline indicators
- **Meeting Details**: View transcripts, summaries, and action items
- **Audio Player**: Play meeting recordings with playback controls
- **Offline Support**: Download meetings for offline access and automatic sync
- **Redux State Management**: Centralized state with persistence
- **Real API Integration**: All endpoints connect to actual backend API

## Prerequisites

- Node.js >= 18
- React Native CLI
- Xcode (for iOS development)
- Android Studio (for Android development)

## Installation

```bash
# Install dependencies
npm install
# or
yarn install

# iOS specific
cd ios && pod install && cd ..
```

## Configuration

Create a `.env` file in the root directory:

```
API_BASE_URL=http://localhost:3001
```

## Running the App

### iOS
```bash
npm run ios
# or
npx react-native run-ios
```

### Android
```bash
npm run android
# or
npx react-native run-android
```

## Development

### Start Metro Bundler
```bash
npm start
```

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

## Architecture

### State Management
- Redux Toolkit for state management
- Redux Persist for offline persistence
- Async Storage for local data storage

### Navigation
- React Navigation 6
- Native Stack Navigator for screen transitions
- Bottom Tabs Navigator for main app navigation

### API Integration
- Axios for HTTP requests
- Automatic token refresh with interceptors
- Offline queue for failed requests

### Key Directories
- `src/store/` - Redux store and slices
- `src/services/` - API client and offline services
- `src/screens/` - Screen components
- `src/navigation/` - Navigation configuration
- `src/hooks/` - Custom React hooks

## API Endpoints

The app connects to the following real endpoints:

- `POST /auth/login` - User authentication
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh access token
- `GET /api/meetings` - Fetch all meetings
- `GET /api/meetings/:id` - Fetch meeting details
- `GET /api/meetings/search` - Search meetings
- `GET /api/meetings/:id/transcript` - Get meeting transcript
- `PATCH /api/meetings/:id/tags` - Update meeting tags
- `PATCH /api/meetings/:id/action-items/:actionItemId` - Toggle action item
- `DELETE /api/meetings/:id` - Delete meeting

## Offline Functionality

The app supports full offline functionality:

1. **Download for Offline**: Download meeting data including transcript and audio
2. **Offline Storage**: Data stored locally using AsyncStorage
3. **Automatic Sync**: Syncs with server when connection is restored
4. **Offline Indicator**: Visual indicators show when app is offline

## Biometric Authentication

Supports Face ID, Touch ID, and Android biometric authentication:

1. Enable during login with "Remember me"
2. Quick access without password
3. Secure credential storage

## License

Proprietary - All rights reserved
