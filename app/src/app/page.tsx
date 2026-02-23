'use client';

import App from '@/components/App';
import DesktopShell from '@/components/desktop/DesktopShell';

export default function Page() {
  return (
    <DesktopShell>
      <App />
    </DesktopShell>
  );
}
