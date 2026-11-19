import { useCallback, useEffect, useRef, useState } from 'react';
import type { RouteRequest, RouteResponse } from '@binwhere/core';
import { ApiV2Error, fetchRoute, type RouteNetworkError } from '../api/client';
import { reportError } from '../lib/reporting';
import { routeFailure } from '../lib/walking-route';
import { sameLocationSelection, type LocationSelection } from '../lib/location-source';
import { useAppState } from '../state/AppState';

type RouteState =
  | { kind: 'idle' | 'loading' }
  | { kind: 'success'; response: RouteResponse }
  | { kind: 'failed'; failure: ReturnType<typeof routeFailure> };

export function useWalkingRoute(target: RouteRequest | null) {
  const { getLocationSelection, locationSelection } = useAppState();
  const [state, setState] = useState<{ target: RouteRequest | null; source: LocationSelection | null; route: RouteState }>({
    target: null, source: null, route: { kind: 'idle' },
  });
  const controller = useRef<AbortController | null>(null);
  const cancel = useCallback(() => controller.current?.abort(), []);
  const request = useCallback(() => {
    if (!target) return;
    controller.current?.abort();
    const active = new AbortController();
    const source = getLocationSelection();
    controller.current = active;
    setState({ target, source, route: { kind: 'loading' } });
    void fetchRoute(target, active.signal).then((response) => {
      if (!active.signal.aborted && sameLocationSelection(source, getLocationSelection())) {
        setState({ target, source, route: { kind: 'success', response } });
      }
    }, (error: ApiV2Error | RouteNetworkError) => {
      if (active.signal.aborted || !sameLocationSelection(source, getLocationSelection())) return;
      const failure = routeFailure(error instanceof ApiV2Error ? error.code : 'NETWORK_ERROR',
        error instanceof ApiV2Error ? error.retryAfterSeconds : null);
      if (failure.report && error instanceof ApiV2Error) reportError(error, { code: error.code, status: error.status });
      setState({ target, source, route: { kind: 'failed', failure } });
    });
  }, [target, getLocationSelection]);
  useEffect(() => {
    request();
    return cancel;
  }, [request, cancel]);
  return { route: state.target === target && state.source && sameLocationSelection(state.source, locationSelection)
    ? state.route : { kind: target ? 'loading' : 'idle' } as RouteState, retry: request, cancel };
}
