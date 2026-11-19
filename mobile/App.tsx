import * as Sentry from '@sentry/react-native';
import * as Localization from 'expo-localization';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  buildBcrsGuideResult,
  normalizeLocale,
  type ClassifyResult,
  type ScanHistoryItem,
} from '@binwhere/core';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { SearchPanel } from './src/components/SearchPanel';
import { initReporting } from './src/lib/reporting';
import { AppStateProvider, useAppState } from './src/state/AppState';
import { AboutScreen } from './src/screens/AboutScreen';
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
    locationReady,
    classifyResult,
    setClassifyResult,
    setCapturedImage,
    capturedImage,
  } = useAppState();

  const [view, setView] = useState<'home' | 'camera' | 'answer'>('home');
  const [searchOpen, setSearchOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const goHome = useCallback(() => {
    setClassifyResult(null);
    setCapturedImage(null);
    setView('home');
  }, [setClassifyResult, setCapturedImage]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (aboutOpen) {
        setAboutOpen(false);
        return true;
      }
      if (searchOpen) {
        setSearchOpen(false);
        return true;
      }
      if (view !== 'home') {
        goHome();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [aboutOpen, goHome, searchOpen, view]);

  const handleClassified = useCallback(
    (result: ClassifyResult, imageUri: string | null) => {
      setSearchOpen(false);
      setClassifyResult(result);
      setCapturedImage(imageUri);
      addToHistory(result, locale);
      setView('answer');
    },
    [addToHistory, locale, setCapturedImage, setClassifyResult],
  );

  const handleCategorySelect = useCallback(
    (result: ClassifyResult) => {
      setSearchOpen(false);
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
      setSearchOpen(false);
      setClassifyResult(item.result);
      setCapturedImage(null);
      setView('answer');
    },
    [setCapturedImage, setClassifyResult],
  );

  const handleBcrsEntry = useCallback(() => {
    setSearchOpen(false);
    const result = buildBcrsGuideResult(locale);
    setClassifyResult(result);
    setCapturedImage(null);
    setView('answer');
  }, [locale, setCapturedImage, setClassifyResult]);

  if (!localeReady || !historyReady || !locationReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.neaGreen} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.mapRoot}>
      <StatusBar style="light" />
      <MapHomeScreen
        locale={locale}
        onBcrsEntry={handleBcrsEntry}
        homeVisible={view === 'home' && !searchOpen}
        attributionAboveChildren={view === 'home' && searchOpen && !aboutOpen}
        searchOpen={searchOpen}
        onSearch={() => setSearchOpen(true)}
        onCamera={() => setView('camera')}
      >
        {searchOpen ? (
          <View style={StyleSheet.absoluteFill} accessibilityElementsHidden={aboutOpen}
            importantForAccessibility={aboutOpen ? 'no-hide-descendants' : 'auto'}>
            <SearchPanel
              locale={locale}
              onLocaleChange={setLocale}
              history={history}
              onHistorySelect={handleHistorySelect}
              onHistoryClear={clearHistory}
              onClassified={handleClassified}
              onCategorySelect={handleCategorySelect}
              onBcrsEntry={handleBcrsEntry}
              onAbout={() => setAboutOpen(true)}
              aboutOpen={aboutOpen}
              onClose={() => setSearchOpen(false)}
            />
          </View>
        ) : null}
        {aboutOpen ? <AboutScreen locale={locale} onClose={() => setAboutOpen(false)} /> : null}
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.background,
  },
});
