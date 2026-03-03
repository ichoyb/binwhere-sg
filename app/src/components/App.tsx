'use client';

import { useState, useRef } from 'react';
import type { AppView, ScanHistoryItem } from '@/types/app';
import type { ClassifyResult } from '@/lib/ai/types';
import HomePage from '@/components/home/HomePage';
import ResultPage from '@/components/result/ResultPage';
import NearbyListPage from '@/components/nearby/NearbyListPage';
import SlideTransition from '@/components/shared/SlideTransition';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useHistory } from '@/hooks/useHistory';

const VIEW_ORDER: Record<AppView, number> = { home: 0, result: 1, nearby: 2 };

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [classifyResult, setClassifyResult] = useState<ClassifyResult | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const { location, loading: geoLoading, requestLocation } = useGeolocation();
  const { history, addToHistory, clearHistory } = useHistory();
  const prevViewRef = useRef<AppView>('home');

  const direction = VIEW_ORDER[currentView] >= VIEW_ORDER[prevViewRef.current] ? 'forward' : 'backward';

  const navigate = (view: AppView) => {
    prevViewRef.current = currentView;
    setCurrentView(view);
  };

  const handleClassified = (result: ClassifyResult, image: string | null) => {
    setClassifyResult(result);
    setCapturedImage(image);
    addToHistory(result);
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
    addToHistory(result);
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
            onClassified={handleClassified}
            onCategorySelect={handleCategorySelect}
            onHistorySelect={handleHistorySelect}
            onHistoryClear={clearHistory}
            history={history}
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
          />
        );
      case 'nearby':
        return (
          <NearbyListPage
            result={classifyResult!}
            userLocation={location}
            onBack={handleBackToResult}
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
