import QRCode from 'qrcode';
import type { ClassifyResult } from '@/lib/ai/types';
import type { Locale } from '@/lib/i18n/types';
import { t, type TranslationKey } from '@/lib/i18n';
import { STATUS_CONFIG, CHANNEL_DISPLAY_CONFIG } from '@/lib/constants';
import type { ClassifyStatus } from '@/types/recycling';

// Canvas dimensions (2x for retina)
const W = 720;
const PADDING = 48;
const CONTENT_W = W - PADDING * 2;
const FONT = 'system-ui, -apple-system, sans-serif';

// Status icon SVG paths (same as StatusIcon.tsx)
const STATUS_ICON_PATHS: Record<ClassifyStatus, string> = {
  recyclable: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  special_handling: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  consider_donating: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  not_recyclable: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
  not_sure: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01',
};

/** Check if a character is CJK (Chinese/Japanese/Korean) */
function isCJK(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return (
    (code >= 0x4E00 && code <= 0x9FFF) ||   // CJK Unified
    (code >= 0x3400 && code <= 0x4DBF) ||   // CJK Extension A
    (code >= 0x3000 && code <= 0x303F) ||   // CJK Symbols
    (code >= 0xFF00 && code <= 0xFFEF) ||   // Fullwidth
    (code >= 0x0B80 && code <= 0x0BFF)      // Tamil
  );
}

/** Wrap text to fit within maxWidth, returns lines */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '\n') {
      lines.push(currentLine);
      currentLine = '';
      continue;
    }

    const testLine = currentLine + ch;
    const { width } = ctx.measureText(testLine);

    if (width > maxWidth && currentLine.length > 0) {
      // For CJK, break at character; for Latin, break at last space
      if (isCJK(ch)) {
        lines.push(currentLine);
        currentLine = ch;
      } else {
        const lastSpace = currentLine.lastIndexOf(' ');
        if (lastSpace > 0) {
          lines.push(currentLine.substring(0, lastSpace));
          currentLine = currentLine.substring(lastSpace + 1) + ch;
        } else {
          lines.push(currentLine);
          currentLine = ch;
        }
      }
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

/** Draw an SVG path string onto canvas (supports M, m, L, l, A, a, C, c, S, s, Q, q, Z, z, H, h, V, v commands) */
function drawSvgPath(ctx: CanvasRenderingContext2D, pathData: string, offsetX: number, offsetY: number, scale: number) {
  ctx.beginPath();
  // Parse SVG path and draw manually
  const commands = pathData.match(/[MmLlHhVvCcSsQqAaZz][^MmLlHhVvCcSsQqAaZz]*/g) || [];
  let cx = 0, cy = 0;
  let startX = 0, startY = 0;

  for (const cmd of commands) {
    const type = cmd[0];
    const nums = cmd.slice(1).trim().match(/-?\d+\.?\d*/g)?.map(Number) || [];

    switch (type) {
      case 'M':
        for (let i = 0; i < nums.length; i += 2) {
          cx = nums[i]; cy = nums[i + 1];
          if (i === 0) {
            ctx.moveTo(offsetX + cx * scale, offsetY + cy * scale);
            startX = cx; startY = cy;
          } else {
            ctx.lineTo(offsetX + cx * scale, offsetY + cy * scale);
          }
        }
        break;
      case 'm':
        for (let i = 0; i < nums.length; i += 2) {
          cx += nums[i]; cy += nums[i + 1];
          if (i === 0) {
            ctx.moveTo(offsetX + cx * scale, offsetY + cy * scale);
            startX = cx; startY = cy;
          } else {
            ctx.lineTo(offsetX + cx * scale, offsetY + cy * scale);
          }
        }
        break;
      case 'L':
        for (let i = 0; i < nums.length; i += 2) {
          cx = nums[i]; cy = nums[i + 1];
          ctx.lineTo(offsetX + cx * scale, offsetY + cy * scale);
        }
        break;
      case 'l':
        for (let i = 0; i < nums.length; i += 2) {
          cx += nums[i]; cy += nums[i + 1];
          ctx.lineTo(offsetX + cx * scale, offsetY + cy * scale);
        }
        break;
      case 'H':
        cx = nums[0];
        ctx.lineTo(offsetX + cx * scale, offsetY + cy * scale);
        break;
      case 'h':
        cx += nums[0];
        ctx.lineTo(offsetX + cx * scale, offsetY + cy * scale);
        break;
      case 'V':
        cy = nums[0];
        ctx.lineTo(offsetX + cx * scale, offsetY + cy * scale);
        break;
      case 'v':
        cy += nums[0];
        ctx.lineTo(offsetX + cx * scale, offsetY + cy * scale);
        break;
      case 'C':
        for (let i = 0; i < nums.length; i += 6) {
          ctx.bezierCurveTo(
            offsetX + nums[i] * scale, offsetY + nums[i + 1] * scale,
            offsetX + nums[i + 2] * scale, offsetY + nums[i + 3] * scale,
            offsetX + nums[i + 4] * scale, offsetY + nums[i + 5] * scale,
          );
          cx = nums[i + 4]; cy = nums[i + 5];
        }
        break;
      case 'c':
        for (let i = 0; i < nums.length; i += 6) {
          ctx.bezierCurveTo(
            offsetX + (cx + nums[i]) * scale, offsetY + (cy + nums[i + 1]) * scale,
            offsetX + (cx + nums[i + 2]) * scale, offsetY + (cy + nums[i + 3]) * scale,
            offsetX + (cx + nums[i + 4]) * scale, offsetY + (cy + nums[i + 5]) * scale,
          );
          cx += nums[i + 4]; cy += nums[i + 5];
        }
        break;
      case 'Z':
      case 'z':
        ctx.closePath();
        cx = startX; cy = startY;
        break;
    }
  }
}

/** Draw status icon circle + SVG icon */
function drawStatusIcon(
  ctx: CanvasRenderingContext2D,
  status: ClassifyStatus,
  centerX: number,
  centerY: number,
  radius: number,
) {
  const config = STATUS_CONFIG[status];

  // Draw circle background
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF30';
  ctx.fill();

  // Draw SVG icon
  const iconSize = radius * 1.1;
  const iconScale = iconSize / 12; // SVG viewBox is 24x24, center at 12
  ctx.strokeStyle = config.textColor;
  ctx.lineWidth = 2 * (iconScale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  drawSvgPath(ctx, STATUS_ICON_PATHS[status], centerX - 12 * iconScale, centerY - 12 * iconScale, iconScale);
  ctx.stroke();
}

/** Draw rounded rectangle */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export async function generateShareCard(
  result: ClassifyResult,
  locale: Locale,
): Promise<Blob> {
  const action = result.next_action;
  const reason = action ? `${action.title}\n\n${action.instruction}\n\n${action.qualification}` : result.reason;
  const preparation = action ? [] : result.preparation;
  const statusCfg = STATUS_CONFIG[result.status];
  const channelCfg = result.channel ? CHANNEL_DISPLAY_CONFIG[result.channel] : null;
  const config = channelCfg
    ? { ...statusCfg, color: channelCfg.color, bgColor: channelCfg.bgColor, textColor: channelCfg.textColor }
    : statusCfg;

  // --- Measure content height ---
  const measureCanvas = document.createElement('canvas');
  measureCanvas.width = W;
  measureCanvas.height = 100;
  const mCtx = measureCanvas.getContext('2d')!;

  // Measure reason text
  mCtx.font = `28px ${FONT}`;
  const reasonLines = wrapText(mCtx, reason, CONTENT_W);

  // Measure preparation steps
  const prepLines: string[][] = [];
  if (preparation?.length) {
    mCtx.font = `26px ${FONT}`;
    for (const step of preparation) {
      prepLines.push(wrapText(mCtx, step, CONTENT_W - 60));
    }
  }

  // Calculate heights
  const HEADER_H = 240;
  const reasonH = reasonLines.length * 38;
  const channelTagH = result.channel ? 56 : 0;
  const prepTitleH = prepLines.length > 0 ? 50 : 0;
  const prepContentH = prepLines.reduce((acc, lines) => acc + lines.length * 34 + 12, 0);
  const contentPadding = 80; // top + bottom padding for content area
  const contentH = reasonH + channelTagH + prepTitleH + prepContentH + contentPadding;
  const FOOTER_H = 140;

  const totalH = HEADER_H + contentH + FOOTER_H;

  // --- Create final canvas ---
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d')!;

  // ============ HEADER ============
  ctx.fillStyle = config.bgColor;
  ctx.fillRect(0, 0, W, HEADER_H);

  // Status icon
  if (!action) drawStatusIcon(ctx, result.status, W / 2, 70, 32);

  // Status label pill
  const statusLabel = action ? t(locale, 'result.nextAction') : t(locale, `status.${result.status}` as TranslationKey);
  ctx.font = `600 24px ${FONT}`;
  const statusMetrics = ctx.measureText(statusLabel);
  const pillW = statusMetrics.width + 32;
  const pillH = 36;
  const pillX = (W - pillW) / 2;
  const pillY = 115;

  ctx.fillStyle = `${config.color}30`;
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();

  ctx.fillStyle = config.textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(statusLabel, W / 2, pillY + pillH / 2);

  // Item name
  ctx.font = `bold 40px ${FONT}`;
  ctx.fillStyle = config.textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  // Truncate if too wide
  let itemName = result.item;
  while (ctx.measureText(itemName).width > CONTENT_W && itemName.length > 3) {
    itemName = itemName.slice(0, -2) + '…';
  }
  ctx.fillText(itemName, W / 2, 162);

  // Channel label
  if (result.channel) {
    ctx.font = `24px ${FONT}`;
    ctx.fillStyle = config.textColor;
    ctx.globalAlpha = 0.7;
    ctx.fillText(t(locale, `channel.${result.channel}` as TranslationKey), W / 2, 210);
    ctx.globalAlpha = 1;
  }

  // ============ CONTENT ============
  let y = HEADER_H;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, y, W, contentH);
  y += 36;

  // Reason text
  ctx.font = `28px ${FONT}`;
  ctx.fillStyle = '#4B5563';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  for (const line of reasonLines) {
    ctx.fillText(line, PADDING, y);
    y += 38;
  }

  // Channel disposal tag
  if (result.channel) {
    y += 16;
    const ch = CHANNEL_DISPLAY_CONFIG[result.channel];
    const instruction = t(locale, `instruction.${result.channel}` as TranslationKey);

    // Tag background
    ctx.fillStyle = `${ch.color}18`;
    roundRect(ctx, PADDING, y, CONTENT_W, 44, 12);
    ctx.fill();

    // Channel icon (small SVG)
    const iconScale = 0.7;
    ctx.strokeStyle = ch.color;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawSvgPath(ctx, ch.iconPath, PADDING + 12, y + 6, iconScale);
    ctx.stroke();

    // Instruction text
    ctx.font = `600 24px ${FONT}`;
    ctx.fillStyle = ch.textColor;
    ctx.textBaseline = 'middle';
    ctx.fillText(instruction, PADDING + 36, y + 22);

    y += 44;
  }

  // Preparation steps
  if (preparation && preparation.length > 0) {
    y += 20;

    // Divider
    ctx.strokeStyle = '#F3F4F6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING, y);
    ctx.lineTo(W - PADDING, y);
    ctx.stroke();
    y += 16;

    // Title
    ctx.font = `600 24px ${FONT}`;
    ctx.fillStyle = '#374151';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText(t(locale, 'result.beforeYouGo'), PADDING, y);
    y += 38;

    // Steps
    ctx.font = `26px ${FONT}`;
    preparation.forEach((step, i) => {
      // Number circle
      ctx.fillStyle = '#E8F8EF';
      ctx.beginPath();
      ctx.arc(PADDING + 16, y + 14, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = `bold 20px ${FONT}`;
      ctx.fillStyle = '#00A651';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), PADDING + 16, y + 14);

      // Step text
      ctx.font = `26px ${FONT}`;
      ctx.fillStyle = '#4B5563';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const stepLines = prepLines[i];
      for (const line of stepLines) {
        ctx.fillText(line, PADDING + 42, y);
        y += 34;
      }
      y += 12;
    });
  }

  // ============ FOOTER ============
  const footerY = HEADER_H + contentH;
  ctx.fillStyle = '#F9FAFB';
  ctx.fillRect(0, footerY, W, FOOTER_H);

  // Top border
  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, footerY);
  ctx.lineTo(W, footerY);
  ctx.stroke();

  // Brand text (left side)
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const footerMidY = footerY + FOOTER_H / 2;

  ctx.font = `bold 32px ${FONT}`;
  ctx.fillStyle = '#0F172A';
  ctx.fillText('BinWhere', PADDING, footerMidY - 18);

  ctx.font = `22px ${FONT}`;
  ctx.fillStyle = '#6B7280';
  ctx.fillText('binwhere.sg', PADDING, footerMidY + 18);

  // QR Code (right side)
  const qrSize = 96;
  try {
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, 'https://binwhere.sg', {
      width: qrSize,
      margin: 0,
      color: { dark: '#0F172A', light: '#F9FAFB' },
    });
    ctx.drawImage(
      qrCanvas,
      W - PADDING - qrSize,
      footerMidY - qrSize / 2,
      qrSize,
      qrSize,
    );
  } catch {
    // QR generation failed — skip silently
  }

  // ============ OUTPUT ============
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      },
      'image/png',
    );
  });
}
