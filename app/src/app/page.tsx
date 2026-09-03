import App from '@/components/App';
import DesktopShell from '@/components/desktop/DesktopShell';
import dataManifest from '@/data/generated/data-manifest.json';
import type { GeoDataCounts } from '@/lib/data-gov';

const dataCounts: GeoDataCounts = {
  recyclingBins: dataManifest.datasets.recyclingBins.featureCount,
  ewaste: dataManifest.datasets.ewaste.featureCount,
  textile: dataManifest.datasets.textile.featureCount,
  reuseChannels: dataManifest.datasets.reuseChannels.featureCount,
  returnPoints: dataManifest.datasets.returnPoints.featureCount,
};

export default function Page() {
  return (
    <DesktopShell dataCounts={dataCounts}>
      <App dataCounts={dataCounts} />
    </DesktopShell>
  );
}
