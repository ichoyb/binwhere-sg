import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  buildBcrsGuideResult,
  type AppView,
  type ClassifyResult,
  type ScanHistoryItem,
} from '@binwhere/core';
import { AppStateProvider, useAppState } from './src/state/AppState';
import { HomeScreen } from './src/screens/HomeScreen';
import { ResultScreen } from './src/screens/ResultScreen';
import { NearbyScreen } from './src/screens/NearbyScreen';
import { colors } from './src/theme/colors';
import { getNearbyTarget } from './src/lib/nearby';

function Root() {
  const {
    locale,
    setLocale,
    localeReady,
    history,
    addToHistory,
    clearHistory,
    historyReady,
    location,
    geoLoading,
    geoError,
    requestLocation,
    classifyResult,
    setClassifyResult,
    setCapturedImage,
    capturedImage,
  } = useAppState();

  const [view, setView] = useState<AppView>('home');

  const goHome = useCallback(() => {
    setClassifyResult(null);
    setCapturedImage(null);
    setView('home');
  }, [setClassifyResult, setCapturedImage]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (view === 'nearby') {
        setView('result');
        return true;
      }
      if (view === 'result') {
        goHome();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [goHome, view]);

  const requestLocationIfNeeded = useCallback(
    (result: ClassifyResult) => {
      if (getNearbyTarget(result)) void requestLocation();
    },
    [requestLocation],
  );

  const handleClassified = useCallback(
    (result: ClassifyResult, imageUri: string | null) => {
      setClassifyResult(result);
      setCapturedImage(imageUri);
      addToHistory(result, locale);
      requestLocationIfNeeded(result);
      setView('result');
    },
    [addToHistory, locale, requestLocationIfNeeded, setCapturedImage, setClassifyResult],
  );

  const handleCategorySelect = useCallback(
    (result: ClassifyResult) => {
      setClassifyResult(result);
      setCapturedImage(null);
      addToHistory(result, locale);
      requestLocationIfNeeded(result);
      setView('result');
    },
    [addToHistory, locale, requestLocationIfNeeded, setCapturedImage, setClassifyResult],
  );

  const handleHistorySelect = useCallback(
    (item: ScanHistoryItem) => {
      if (!item.result) return;
      setClassifyResult(item.result);
      setCapturedImage(null);
      requestLocationIfNeeded(item.result);
      setView('result');
    },
    [requestLocationIfNeeded, setCapturedImage, setClassifyResult],
  );

  const handleBcrsEntry = useCallback(() => {
    const result = buildBcrsGuideResult(locale);
    setClassifyResult(result);
    setCapturedImage(null);
    requestLocationIfNeeded(result);
    setView('result');
  }, [locale, requestLocationIfNeeded, setCapturedImage, setClassifyResult]);

  if (!localeReady || !historyReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.neaGreen} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      {view === 'home' ? (
        <HomeScreen
          locale={locale}
          onLocaleChange={setLocale}
          history={history}
          onHistorySelect={handleHistorySelect}
          onHistoryClear={clearHistory}
          onClassified={handleClassified}
          onCategorySelect={handleCategorySelect}
          onBcrsEntry={handleBcrsEntry}
        />
      ) : null}
      {view === 'result' && classifyResult ? (
        <ResultScreen
          result={classifyResult}
          locale={locale}
          capturedImage={capturedImage}
          userLocation={location}
          geoLoading={geoLoading}
          geoError={geoError}
          onScanAgain={goHome}
          onViewNearby={() => setView('nearby')}
          onRequestLocation={() => {
            void requestLocation();
          }}
        />
      ) : null}
      {view === 'nearby' && classifyResult ? (
        <NearbyScreen
          result={classifyResult}
          locale={locale}
          userLocation={location}
          geoLoading={geoLoading}
          geoError={geoError}
          onBack={() => setView('result')}
          onRequestLocation={() => {
            void requestLocation();
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <Root />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
