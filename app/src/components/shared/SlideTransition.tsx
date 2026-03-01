'use client';

import { useState, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';

type Direction = 'forward' | 'backward';

interface SlideTransitionProps {
  viewKey: string;
  direction: Direction;
  children: ReactNode;
}

const ENTER_MS = 250;
const EXIT_MS = 200;
const TRANSITION_MS = Math.max(ENTER_MS, EXIT_MS);

interface Layer {
  key: string;
  content: ReactNode;
}

/**
 * Two-layer slide transition using CSS grid stacking.
 *
 * Both old and new content occupy the same grid cell (gridArea: 1/1).
 * Unlike absolute positioning, grid children contribute to parent height,
 * so this works without a complete height chain from html/body.
 */
export default function SlideTransition({ viewKey, direction, children }: SlideTransitionProps) {
  const [committed, setCommitted] = useState<Layer>({ key: viewKey, content: children });
  const [outgoing, setOutgoing] = useState<Layer | null>(null);
  const [animDir, setAnimDir] = useState<Direction>(direction);
  const [animating, setAnimating] = useState(false);

  const committedRef = useRef<Layer>({ key: viewKey, content: children });
  const prevKeyRef = useRef(viewKey);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useReducedMotion();

  const updateCommitted = (layer: Layer) => {
    committedRef.current = layer;
    setCommitted(layer);
  };

  useLayoutEffect(() => {
    if (viewKey === prevKeyRef.current) {
      updateCommitted({ key: viewKey, content: children });
      return;
    }

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    prevKeyRef.current = viewKey;

    if (reducedMotion) {
      updateCommitted({ key: viewKey, content: children });
      setOutgoing(null);
      setAnimating(false);
      return;
    }

    const oldLayer = committedRef.current;
    setOutgoing({ key: oldLayer.key, content: oldLayer.content });
    updateCommitted({ key: viewKey, content: children });
    setAnimDir(direction);
    setAnimating(true);

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setOutgoing(null);
      setAnimating(false);
    }, TRANSITION_MS + 30);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewKey]);

  useEffect(() => {
    if (!animating && viewKey === prevKeyRef.current) {
      updateCommitted({ key: viewKey, content: children });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children]);

  const exitAnim = animating
    ? `${animDir === 'forward' ? 'slide-exit-left' : 'slide-exit-right'} ${EXIT_MS}ms ease-in both`
    : 'none';

  const enterAnim = animating
    ? `${animDir === 'forward' ? 'slide-enter-right' : 'slide-enter-left'} ${ENTER_MS}ms ease-out both`
    : 'none';

  // Idle: simple wrapper
  if (!animating && !outgoing) {
    return (
      <div className="w-full overflow-hidden">
        {committed.content}
      </div>
    );
  }

  // Animating: CSS grid stacking — both layers in same grid cell (no absolute positioning needed)
  return (
    <div className="w-full overflow-hidden" style={{ display: 'grid' }}>
      {outgoing && (
        <div
          key={`out-${outgoing.key}`}
          className="overflow-y-auto"
          style={{ gridArea: '1 / 1', animation: exitAnim }}
          aria-hidden="true"
        >
          {outgoing.content}
        </div>
      )}
      <div
        key={`in-${committed.key}`}
        className="overflow-y-auto"
        style={{ gridArea: '1 / 1', animation: enterAnim }}
      >
        {committed.content}
      </div>
    </div>
  );
}

/** Hook to detect prefers-reduced-motion */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}
