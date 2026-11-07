import * as Sentry from '@sentry/react-native';
import * as Localization from 'expo-localization';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Modal, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  buildBcrsGuideResult,
  normalizeLocale,
  type ClassifyResult,
  type ScanHistoryItem,
} from '@binwhere/core';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { initReporting } from './src/lib/reporting';
import { AppStateProvider, useAppState } from './src/state/AppState';
import { HomeScreen } from './src/screens/HomeScreen';
import { AnswerScreen } from './src/screens/AnswerScreen';
import { CameraScreen } from './src/screens/CameraScreen';
import { MapHomeScreen } from './src/screens/MapHomeScreen';
import { dark } from './src/theme/dark';
import { colors } from './src/theme/colors';

// Before the first render, so a crash during startup is reported too.
initReporting();

/**
 * The crash screen sits above the state provider (so a provider failure is
 * caught as well) and therefore cannot read the user's chosen language; the
 * device language is the best available stand-in.
 */
const deviceLocale = normalizeLocale(Localization.getLocales()[0]?.languageTag);

function Root() {
  const {
    locale,
    setLocale,
    localeReady,
    history,
    addToHistory,
    clearHistory,
    historyReady,
    classifyResult,
    setClassifyResult,
    setCapturedImage,
    capturedImage,
  } = useAppState();

  const [view, setView] = useState<'home' | 'legacy' | 'camera' | 'answer'>('home');

  const goHome = useCallback(() => {
    setClassifyResult(null);
    setCapturedImage(null);
    setView('home');
  }, [setClassifyResult, setCapturedImage]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (view !== 'home') {
        goHome();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [goHome, view]);

  const handleClassified = useCallback(
    (result: ClassifyResult, imageUri: string | null) => {
      setClassifyResult(result);
      setCapturedImage(imageUri);
      addToHistory(result, locale);
      setView('answer');
    },
    [addToHistory, locale, setCapturedImage, setClassifyResult],
  );

  const handleCategorySelect = useCallback(
    (result: ClassifyResult) => {
      setClassifyResult(result);
      setCapturedImage(null);
      addToHistory(result, locale);
      setView('answer');
    },
    [addToHistory, locale, setCapturedImage, setClassifyResult],
  );

  const handleHistorySelect = useCallback(
    (item: ScanHistoryItem) => {
      if (!item.result) return;
      setClassifyResult(item.result);
      setCapturedImage(null);
      setView('answer');
    },
    [setCapturedImage, setClassifyResult],
  );

  const handleBcrsEntry = useCallback(() => {
    const result = buildBcrsGuideResult(locale);
    setClassifyResult(result);
    setCapturedImage(null);
    setView('answer');
  }, [locale, setCapturedImage, setClassifyResult]);

  if (!localeReady || !historyReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.neaGreen} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.mapRoot}>
      <StatusBar style={view === 'legacy' ? 'dark' : 'light'} />
      <MapHomeScreen
        locale={locale}
        onBcrsEntry={handleBcrsEntry}
        homeVisible={view === 'home'}
        onSearch={() => setView('legacy')}
        onCamera={() => setView('camera')}
      >
        <Modal
          visible={view === 'legacy'}
          presentationStyle="fullScreen"
          animationType={view === 'answer' ? 'none' : 'slide'}
          onRequestClose={goHome}
        >
          <SafeAreaView style={styles.safe}>
            <StatusBar style="dark" />
            <HomeScreen
              locale={locale}
              onLocaleChange={setLocale}
              history={history}
              onHistorySelect={handleHistorySelect}
              onHistoryClear={clearHistory}
              onClassified={handleClassified}
              onCategorySelect={handleCategorySelect}
              onBcrsEntry={handleBcrsEntry}
              onClose={goHome}
            />
          </SafeAreaView>
        </Modal>
        {view === 'camera' ? <CameraScreen locale={locale} onClose={goHome}
          onClassified={handleClassified} /> : null}
        {view === 'answer' && classifyResult ? (
          <AnswerScreen result={classifyResult} locale={locale} photo={capturedImage}
            onClose={goHome} onScanAgain={() => {
              setClassifyResult(null);
              setCapturedImage(null);
              setView('camera');
            }} />
        ) : null}
      </MapHomeScreen>
    </View>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary locale={deviceLocale}>
        <AppStateProvider>
          <Root />
        </AppStateProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

// Adds touch breadcrumbs to crash reports; a no-op when reporting is off.
export default Sentry.wrap(App);

const styles = StyleSheet.create({
  mapRoot: { flex: 1, backgroundColor: dark.background },
  safe: { flex: 1, backgroundColor: colors.bg },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.background,
  },
});
