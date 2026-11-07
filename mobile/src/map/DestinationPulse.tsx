import { Layer } from '@maplibre/maplibre-react-native';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { neighborhoodMinZoom } from './style';

export function DestinationPulse({ enabled, reduceMotion }: { enabled: boolean; reduceMotion: boolean }) {
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    setExpanded(false);
    if (!enabled || reduceMotion || !active) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      setExpanded(false);
      timer = setTimeout(() => {
        setExpanded(true);
        timer = setTimeout(reset, 1500);
      }, 100);
    };
    reset();
    return () => clearTimeout(timer);
  }, [enabled, reduceMotion, active]);

  const moving = enabled && active && !reduceMotion && expanded;
  const transition = { duration: moving ? 1500 : 0, delay: 0 };
  return (
    <Layer id="destination-pulse" type="circle" source="destination" minzoom={neighborhoodMinZoom}
      layout={{ visibility: enabled ? 'visible' : 'none' }}
      paint={{
        'circle-radius-transition': transition,
        'circle-opacity-transition': transition,
        'circle-stroke-opacity-transition': transition,
        'circle-radius': moving ? 23 : 8,
        'circle-color': '#4affb0', 'circle-opacity': moving ? 0 : 0.36, 'circle-blur': 0.5,
        'circle-stroke-color': '#42ffc2', 'circle-stroke-width': 1,
        'circle-stroke-opacity': moving ? 0 : 1,
      }} />
  );
}
