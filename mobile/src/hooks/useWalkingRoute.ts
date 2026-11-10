import { useCallback, useEffect, useRef, useState } from 'react';
import type { RouteRequest, RouteResponse } from '@binwhere/core';
import { ApiV2Error, fetchRoute, type RouteNetworkError } from '../api/client';
import { reportError } from '../lib/reporting';
import { routeFailure } from '../lib/walking-route';

type RouteState =
  | { kind: 'idle' | 'loading' }
  | { kind: 'success'; response: RouteResponse }
  | { kind: 'failed'; failure: ReturnType<typeof routeFailure> };

export function useWalkingRoute(target: RouteRequest | null) {
  const [state, setState] = useState<{ target: RouteRequest | null; route: RouteState }>({ target: null, route: { kind: 'idle' } });
  const controller = useRef<AbortController | null>(null);
  const request = useCallback(() => {
    if (!target) return;
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    setState({ target, route: { kind: 'loading' } });
    void fetchRoute(target, active.signal).then((response) => {
      if (!active.signal.aborted) setState({ target, route: { kind: 'success', response } });
    }, (error: ApiV2Error | RouteNetworkError) => {
      if (active.signal.aborted) return;
      const failure = routeFailure(error instanceof ApiV2Error ? error.code : 'NETWORK_ERROR');
      if (failure.report && error instanceof ApiV2Error) reportError(error, { code: error.code, status: error.status });
      setState({ target, route: { kind: 'failed', failure } });
    });
  }, [target]);
  useEffect(() => {
    request();
    return () => controller.current?.abort();
  }, [request]);
  return { route: state.target === target ? state.route : { kind: target ? 'loading' : 'idle' } as RouteState, retry: request };
}
