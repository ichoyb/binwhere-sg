import type { ChannelType } from '@/types/recycling';
import { CHANNEL_DISPLAY_CONFIG } from '@/lib/constants';

interface DisposalGuideProps {
  channel: ChannelType;
}

export default function DisposalGuide({ channel }: DisposalGuideProps) {
  const config = CHANNEL_DISPLAY_CONFIG[channel];

  return (
    <div
      className="rounded-card p-4 flex items-center gap-4 border"
      style={{
        backgroundColor: config.bgColor,
        borderColor: config.borderColor,
      }}
    >
      {/* Icon */}
      <div
        className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: `${config.color}18` }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke={config.color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={config.iconPath} />
        </svg>
      </div>

      {/* Instruction */}
      <p
        className="text-body font-semibold leading-snug"
        style={{ color: config.textColor }}
      >
        {config.instruction}
      </p>
    </div>
  );
}
