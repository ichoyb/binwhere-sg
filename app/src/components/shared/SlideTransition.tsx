'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';

type Direction = 'forward' | 'backward';

interface SlideTransitionProps {
  viewKey: string;
  direction: Direction;
  children: ReactNode;
}

const DURATION = 300;

/**
 * Wraps a single child and animates slide transitions when viewKey changes.
 * Forward: new view slides in from right.
 * Backward: old view slides out to right.
 * Respects prefers-reduced-motion.
 */
export default function SlideTransition({ viewKey, direction, children }: SlideTransitionProps) {
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitioning, setTransitioning] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle');
  const prevKeyRef = useRef(viewKey);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (viewKey === prevKeyRef.current) {
      // Same view, just update children content
      setDisplayChildren(children);
      return;
    }

    prevKeyRef.current = viewKey;

    if (reducedMotion) {
      // Skip animation
      setDisplayChildren(children);
      return;
    }

    // Start exit phase (animate old content out)
    setTransitioning(true);
    setPhase('exit');

    const exitTimer = setTimeout(() => {
      // Swap to new content and start enter phase
      setDisplayChildren(children);
      setPhase('enter');

      const enterTimer = setTimeout(() => {
        setPhase('idle');
        setTransitioning(false);
      }, DURATION);

      return () => clearTimeout(enterTimer);
    }, DURATION);

    return () => clearTimeout(exitTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewKey]);

  // Update children if view hasn't changed (e.g. props update within same view)
  useEffect(() => {
    if (!transitioning) {
      setDisplayChildren(children);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children]);

  const getTransform = (): string => {
    if (phase === 'idle') return 'translateX(0)';

    if (phase === 'exit') {
      // Old content slides out
      return direction === 'forward' ? 'translateX(-30%)' : 'translateX(100%)';
    }

    if (phase === 'enter') {
      // New content is entering — start position already rendered, animate to 0
      return 'translateX(0)';
    }

    return 'translateX(0)';
  };

  const getInitialTransform = (): string => {
    if (phase === 'enter') {
      return direction === 'forward' ? 'translateX(100%)' : 'translateX(-30%)';
    }
    return 'translateX(0)';
  };

  return (
    <div
      className="w-full h-full overflow-hidden"
      style={{
        transform: phase === 'enter' && transitioning ? getInitialTransform() : getTransform(),
        transition: phase !== 'idle' ? `transform ${DURATION}ms ease-out` : 'none',
        opacity: phase === 'exit' ? 0.5 : 1,
      }}
    >
      {displayChildren}
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
