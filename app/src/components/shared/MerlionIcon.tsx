'use client';

/**
 * Pixel Merlion mascot — SG Red head + White fish tail.
 * Based on 8x9 pixel grid, scales cleanly with image-rendering: pixelated.
 *
 * Grid reference (R=red, W=white, .=transparent):
 *   Row 1:  . . R R R R . .
 *   Row 2:  R R W R W R R .
 *   Row 3:  R R R R R R R .
 *   Row 4:  . . R R R R . .
 *   Row 5:  . . W W W W . .
 *   Row 6:  . . W W W W . .
 *   Row 7:  . . . W W W . .
 *   Row 8:  . . . . W W . .
 */

const RED = '#EF4444';
const WHITE = '#FFFFFF';
const PX = 1; // each pixel = 1 SVG unit

// Pixel data: [x, y, color]
const PIXELS: [number, number, string][] = [
  // Row 1: head top
  [2,0,RED],[3,0,RED],[4,0,RED],[5,0,RED],
  // Row 2: eyes row
  [0,1,RED],[1,1,RED],[2,1,WHITE],[3,1,RED],[4,1,WHITE],[5,1,RED],[6,1,RED],
  // Row 3: head bottom
  [0,2,RED],[1,2,RED],[2,2,RED],[3,2,RED],[4,2,RED],[5,2,RED],[6,2,RED],
  // Row 4: neck
  [2,3,RED],[3,3,RED],[4,3,RED],[5,3,RED],
  // Row 5: body top
  [2,4,WHITE],[3,4,WHITE],[4,4,WHITE],[5,4,WHITE],
  // Row 6: body bottom
  [2,5,WHITE],[3,5,WHITE],[4,5,WHITE],[5,5,WHITE],
  // Row 7: tail taper
  [3,6,WHITE],[4,6,WHITE],[5,6,WHITE],
  // Row 8: tail tip (right lean)
  [4,7,WHITE],[5,7,WHITE],
];

const GRID_W = 8;
const GRID_H = 8;

interface MerlionIconProps {
  size?: number;
  className?: string;
}

export default function MerlionIcon({ size = 32, className }: MerlionIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${GRID_W} ${GRID_H}`}
      className={className}
      style={{ imageRendering: 'pixelated' }}
      aria-label="BinWhere Merlion mascot"
      role="img"
    >
      {PIXELS.map(([x, y, color], i) => (
        <rect key={i} x={x} y={y} width={PX} height={PX} fill={color} />
      ))}
    </svg>
  );
}

/**
 * Large variant for brand atmosphere / landing pages.
 * Same pixel art, bigger render size with decorative container.
 */
export function MerlionLarge({ size = 120, className }: MerlionIconProps) {
  return (
    <div className={`flex items-center justify-center ${className ?? ''}`}>
      <MerlionIcon size={size} />
    </div>
  );
}
