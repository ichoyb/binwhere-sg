import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic Expo config — dynamic so it can read the environment.
 *
 * Store-facing settings (bundle id, permissions, privacy manifest, export
 * compliance) are all here; docs/ios-release-runbook.md explains how each one
 * maps to an App Store Connect answer. Keep the two in agreement.
 */

const APP_ENVIRONMENTS = ['development', 'preview', 'production'] as const;
type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

/** Unset means a local development build; a typo is an error, not a default. */
function resolveEnvironment(raw: string | undefined): AppEnvironment {
  if (raw === undefined || raw === '') return 'development';
  if ((APP_ENVIRONMENTS as readonly string[]).includes(raw)) return raw as AppEnvironment;
  throw new Error(`EXPO_PUBLIC_APP_ENV must be one of ${APP_ENVIRONMENTS.join(', ')}, got "${raw}"`);
}

/**
 * EAS project @ichoyb/binwhere. A public identifier, not a secret, so it lives
 * here rather than in env: every `eas` command and build links to the same
 * project no matter which machine runs it.
 */
const EAS_PROJECT_ID = 'f26eb035-da32-4693-bdc1-637a8156db42';

const BUNDLE_ID = 'sg.binwhere.app';

/** English permission strings; zh-Hans / ms / ta versions live in ./locales. */
const CAMERA_PERMISSION = 'BinWhere uses the camera to identify items for recycling guidance.';
const LOCATION_PERMISSION = 'BinWhere uses your location to find nearby recycling points in Singapore.';

type CollectedDataType = NonNullable<
  NonNullable<NonNullable<ExpoConfig['ios']>['privacyManifests']>['NSPrivacyCollectedDataTypes']
>[number];

/** Data the app itself collects: never linked to identity, never used for tracking. */
function collected(type: string, purpose: string): CollectedDataType {
  return {
    NSPrivacyCollectedDataType: type,
    NSPrivacyCollectedDataTypeLinked: false,
    NSPrivacyCollectedDataTypeTracking: false,
    NSPrivacyCollectedDataTypePurposes: [purpose],
  };
}

const APP_FUNCTIONALITY = 'NSPrivacyCollectedDataTypePurposeAppFunctionality';
const ANALYTICS = 'NSPrivacyCollectedDataTypePurposeAnalytics';

export default ({ config }: ConfigContext): ExpoConfig => {
  const environment = resolveEnvironment(process.env.EXPO_PUBLIC_APP_ENV);
  const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';
  const sentryOrg = process.env.SENTRY_ORG ?? '';
  const sentryProject = process.env.SENTRY_PROJECT ?? '';
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

  // A production binary lives on users' phones long after the build machine is
  // gone. Refuse to produce one that cannot report its own crashes or
  // symbolicate them. Only the EAS builder (EAS_BUILD=true) produces one, and
  // only it is sure to hold the EAS variables: eas-cli first reads this config
  // locally with just the profile's `env`, to find the project whose EAS
  // variables it then loads.
  if (environment === 'production' && process.env.EAS_BUILD === 'true') {
    const missing = [
      ['EXPO_PUBLIC_SENTRY_DSN', sentryDsn],
      ['SENTRY_ORG', sentryOrg],
      ['SENTRY_PROJECT', sentryProject],
    ]
      .filter(([, value]) => value === '')
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(`EXPO_PUBLIC_APP_ENV=production requires ${missing.join(', ')}`);
    }
  }
  if ((sentryOrg === '') !== (sentryProject === '')) {
    throw new Error('SENTRY_ORG and SENTRY_PROJECT must be set together');
  }
  // The Sentry plugin adds symbol / source-map upload phases to the native
  // build, which need SENTRY_AUTH_TOKEN. Local simulator builds do not carry
  // it, so the plugin is added only when an upload target is configured.
  const uploadSymbols = sentryOrg !== '';

  const plugins: NonNullable<ExpoConfig['plugins']> = [
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
        cameraPermission: CAMERA_PERMISSION,
        // Photos only: no microphone string, so iOS never asks for it and
        // App Review never asks why.
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: LOCATION_PERMISSION,
        // Foreground only. Background location needs a justification the
        // app does not have.
        locationAlwaysAndWhenInUsePermission: false,
        locationAlwaysPermission: false,
        // By default the plugin also declares motion activity, compiling
        // CoreMotion in, and a temporary precise-location purpose. The app
        // uses neither, and neither string is localized.
        motionUsagePermission: false,
        locationFullAccuracyPermission: false,
      },
    ],
  ];
  if (uploadSymbols) {
    plugins.push(['@sentry/react-native/expo', { organization: sentryOrg, project: sentryProject }]);
  }

  return {
    ...config,
    name: 'BinWhere',
    slug: 'binwhere',
    version: '1.0.0',
    orientation: 'portrait',
    // 1024×1024, no alpha — App Store rejects transparent icons.
    icon: './assets/icon-1024.png',
    userInterfaceStyle: 'light',
    scheme: 'binwhere',
    // Native permission prompts in every language the app itself speaks.
    locales: {
      'zh-Hans': './locales/zh-Hans.json',
      ms: './locales/ms.json',
      ta: './locales/ta.json',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: BUNDLE_ID,
      // Build numbers are managed remotely by EAS (see eas.json), not here.
      config: {
        // Only standard HTTPS — exempt, so the export-compliance question is
        // answered in the binary and never blocks a TestFlight upload.
        usesNonExemptEncryption: false,
      },
      infoPlist: {
        NSCameraUsageDescription: CAMERA_PERMISSION,
        NSLocationWhenInUseUsageDescription: LOCATION_PERMISSION,
        // Let system UI follow the device language even where the JS bundle
        // falls back to English.
        CFBundleAllowMixedLocalizations: true,
      },
      // App-level privacy manifest. Must say the same thing as the App Privacy
      // answers in App Store Connect; the matrix is in the release runbook.
      privacyManifests: {
        NSPrivacyTracking: false,
        NSPrivacyTrackingDomains: [],
        NSPrivacyCollectedDataTypes: [
          // Nearby: the server keeps only a ~1 km grid cell of the position.
          collected('NSPrivacyCollectedDataTypeCoarseLocation', APP_FUNCTIONALITY),
          // Classify: the photo / description is sent to the AI provider.
          collected('NSPrivacyCollectedDataTypePhotosorVideos', APP_FUNCTIONALITY),
          collected('NSPrivacyCollectedDataTypeOtherUserContent', APP_FUNCTIONALITY),
          // Server-side outcome events (which channel, how confident, how slow).
          collected('NSPrivacyCollectedDataTypeProductInteraction', ANALYTICS),
          // Crash reporting.
          collected('NSPrivacyCollectedDataTypeCrashData', APP_FUNCTIONALITY),
          collected('NSPrivacyCollectedDataTypeOtherDiagnosticData', APP_FUNCTIONALITY),
          // Sentry stores a random installation id on the device and attaches it to every
          // event (user.id) and session (distinct id) so crash-free rates can be computed.
          // Never linked to a person and gone with the install, but a device-level identifier.
          collected('NSPrivacyCollectedDataTypeDeviceID', APP_FUNCTIONALITY),
        ],
      },
    },
    android: {
      package: BUNDLE_ID,
      adaptiveIcon: {
        backgroundColor: '#E8F8EF',
        foregroundImage: '../app/public/icons/icon-512.png',
      },
      ...(googleMapsApiKey
        ? { config: { googleMaps: { apiKey: googleMapsApiKey } } }
        : {}),
    },
    plugins,
    extra: { eas: { projectId: EAS_PROJECT_ID } },
  };
};
