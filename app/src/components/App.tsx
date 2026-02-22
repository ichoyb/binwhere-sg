'use client';

import { useState } from 'react';
import type { AppView } from '@/types/app';
import type { ClassifyResult } from '@/lib/ai/types';
import HomePage from '@/components/home/HomePage';
import ResultPage from '@/components/result/ResultPage';
import NearbyListPage from '@/components/nearby/NearbyListPage';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useHistory } from '@/hooks/useHistory';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [classifyResult, setClassifyResult] = useState<ClassifyResult | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const { location } = useGeolocation();
  const { history, addToHistory } = useHistory();

  const handleClassified = (result: ClassifyResult, image: string | null) => {
    setClassifyResult(result);
    setCapturedImage(image);
    addToHistory(result);
    setCurrentView('result');
  };

  const handleScanAgain = () => {
    setClassifyResult(null);
    setCapturedImage(null);
    setCurrentView('home');
  };

  const handleViewNearby = () => {
    setCurrentView('nearby');
  };

  const handleBackToResult = () => {
    setCurrentView('result');
  };

  switch (currentView) {
    case 'home':
      return (
        <HomePage
          onClassified={handleClassified}
          history={history}
        />
      );
    case 'result':
      return (
        <ResultPage
          result={classifyResult!}
          capturedImage={capturedImage}
          userLocation={location}
          onScanAgain={handleScanAgain}
          onViewNearby={handleViewNearby}
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
}
