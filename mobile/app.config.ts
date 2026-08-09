import type { ExpoConfig } from 'expo/config';

const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

const config: ExpoConfig = {
  name: 'BinWhere',
  slug: 'binwhere',
  version: '1.0.0',
  orientation: 'portrait',
  icon: '../app/public/icons/icon-512.png',
  userInterfaceStyle: 'light',
  scheme: 'binwhere',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'sg.binwhere.app',
    buildNumber: '1',
    infoPlist: {
      NSCameraUsageDescription:
        'BinWhere uses the camera to identify items for recycling guidance.',
      NSLocationWhenInUseUsageDescription:
        'BinWhere uses your location to find nearby recycling points in Singapore.',
    },
  },
  android: {
    package: 'sg.binwhere.app',
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: '#E8F8EF',
      foregroundImage: '../app/public/icons/icon-512.png',
    },
    ...(googleMapsApiKey
      ? { config: { googleMaps: { apiKey: googleMapsApiKey } } }
      : {}),
  },
  plugins: [
    [
      'expo-splash-screen',
      {
        image: '../app/public/icons/binwhere-logo.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#F5F7FA',
      },
    ],
    'expo-localization',
    [
      'expo-camera',
      {
        cameraPermission:
          'BinWhere uses the camera to identify items for recycling guidance.',
        recordAudioAndroid: false,
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'BinWhere uses your location to find nearby recycling points in Singapore.',
      },
    ],
  ],
};

export default config;
