'use client';

import { useState, useEffect } from 'react';
import type { AppView, ScanHistoryItem } from '@/types/app';
import type { ClassifyResult } from '@/lib/ai/types';
import type { Locale } from '@/lib/i18n/types';
import { detectLocale } from '@/lib/i18n';
import HomePage from '@/components/home/HomePage';
import ResultPage from '@/components/result/ResultPage';
import NearbyListPage from '@/components/nearby/NearbyListPage';
import SlideTransition from '@/components/shared/SlideTransition';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useHistory } from '@/hooks/useHistory';
import { buildBcrsGuideResult } from '@/lib/bcrs';
import type { GeoDataCounts } from '@/lib/data-gov';

const VIEW_ORDER: Record<AppView, number> = { home: 0, result: 1, nearby: 2 };

export default function App({ dataCounts }: { dataCounts: GeoDataCounts }) {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [classifyResult, setClassifyResult] = useState<ClassifyResult | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window !== 'undefined') return detectLocale();
    return 'en';
  });
  const { location, loading: geoLoading, requestLocation } = useGeolocation();
  const { history, addToHistory, clearHistory } = useHistory();
  // Update <html lang> when locale changes
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const navigate = (view: AppView) => {
    setDirection(VIEW_ORDER[view] >= VIEW_ORDER[currentView] ? 'forward' : 'backward');
    setCurrentView(view);
  };

  const handleClassified = (result: ClassifyResult, image: string | null) => {
    setClassifyResult(result);
    setCapturedImage(image);
    addToHistory(result, locale);
    requestLocation();
    navigate('result');
  };

  const handleHistorySelect = (item: ScanHistoryItem) => {
    if (!item.result) return;
    setClassifyResult(item.result);
    setCapturedImage(null);
    requestLocation();
    navigate('result');
  };

  const handleCategorySelect = (result: ClassifyResult) => {
    setClassifyResult(result);
    setCapturedImage(null);
    addToHistory(result, locale);
    requestLocation();
    navigate('result');
  };

  const handleBcrsEntry = () => {
    setClassifyResult(buildBcrsGuideResult(locale));
    setCapturedImage(null);
    requestLocation();
    navigate('result');
  };

  const handleScanAgain = () => {
    setClassifyResult(null);
    setCapturedImage(null);
    navigate('home');
  };

  const handleViewNearby = () => {
    navigate('nearby');
  };

  const handleBackToResult = () => {
    navigate('result');
  };

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return (
          <HomePage
            dataCounts={dataCounts}
            onClassified={handleClassified}
            onCategorySelect={handleCategorySelect}
            onHistorySelect={handleHistorySelect}
            onHistoryClear={clearHistory}
            history={history}
            locale={locale}
            onLocaleChange={setLocale}
            onBcrsEntry={handleBcrsEntry}
          />
        );
      case 'result':
        return (
          <ResultPage
            result={classifyResult!}
            capturedImage={capturedImage}
            userLocation={location}
            geoLoading={geoLoading}
            onScanAgain={handleScanAgain}
            onViewNearby={handleViewNearby}
            onRequestLocation={requestLocation}
            locale={locale}
          />
        );
      case 'nearby':
        return (
          <NearbyListPage
            result={classifyResult!}
            userLocation={location}
            onBack={handleBackToResult}
            locale={locale}
          />
        );
    }
  };

  return (
    <SlideTransition viewKey={currentView} direction={direction}>
      {renderView()}
    </SlideTransition>
  );
}
