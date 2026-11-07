import type { Metadata } from 'next';
import { DATA_LICENSE_URL } from '@binwhere/core';
import data from '@/data/data-license.json';

export const metadata: Metadata = {
  title: 'Data License',
  description: 'Sources, licenses and downloadable build methods for BinWhere’s map and walking-route data.',
  alternates: { canonical: DATA_LICENSE_URL },
  openGraph: {
    title: 'Data License — BinWhere',
    description: 'Sources and build methods for BinWhere’s map and walking-route data.',
    url: DATA_LICENSE_URL,
    siteName: 'BinWhere',
    type: 'article',
  },
};

const { map, routing, protomaps } = data;
const basemap = map.files['basemap.pmtiles'];
const trees = map.files['trees.pmtiles'];
const mask = map.files['country-mask.geojson'];
const osmCopyright = 'https://www.openstreetmap.org/copyright';
const odbl = 'https://opendatacommons.org/licenses/odbl/1-0/';

export default function DataLicensePage() {
  return (
    <article className="max-w-[760px] mx-auto px-6 py-12 text-gray-700">
      <p className="text-sm font-medium text-[#00A651] tracking-wide uppercase mb-2">BinWhere</p>
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Data License</h1>
      <p className="mt-3 text-base text-gray-500">
        Sources and build methods for the map and walking routes in the BinWhere app.
      </p>

      <section className="mt-8 rounded-2xl bg-white border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900">OpenStreetMap data</h2>
        <p className="mt-3 text-base leading-relaxed">
          Our road network, basemap, trees and country mask use data from{' '}
          <a className="text-[#0077B6] underline" href={osmCopyright}>© OpenStreetMap contributors</a>,
          available under the{' '}
          <a className="text-[#0077B6] underline" href={odbl}>Open Database License (ODbL) 1.0</a>.
          The original configuration and scripts below describe how we transform the source data,
          provided under ODbL section 4.6(b).
        </p>
        <nav className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-base" aria-label="Datasets">
          {[
            ['road-network', 'Road network'], ['basemap', 'Basemap'],
            ['trees', 'Trees'], ['country-mask', 'Country mask'],
          ].map(([id, label]) => (
            <a key={id} className="text-[#0077B6] underline" href={`#${id}`}>{label}</a>
          ))}
        </nav>
      </section>

      <Section id="road-network" title="Walking road network">
        <p>The road graph used by the walking-route service to find paths between locations.</p>
        <h3 className="font-semibold text-gray-900">Source and build inputs</h3>
        <Source url={routing.pins.osm.url} version={new URL(routing.pins.osm.url).pathname.split('/').pop()!}
          sha256={routing.pins.osm.sha256} />
        <p>
          Cropping bounds (west, south, east, north): <code className="break-words">{routing.pins.osm.bbox.join(', ')}</code>.
          Complete ways crossing these bounds are retained.
        </p>
        <p>
          Engine: <a className="text-[#0077B6] underline" href={routing.pins.osrm.url}>
            OSRM {routing.pins.osrm.version}
          </a>.
        </p>
        <Digest label="OSRM source archive SHA256" value={routing.pins.osrm.sha256} />
        <Digest label="Walking profile (foot.lua) SHA256" value={routing.profileSha256} />
        <h3 className="font-semibold text-gray-900">Output and version</h3>
        <p>
          The output is an OSRM MLD road graph, built from the inputs above. It has no fixed output
          file hash on this page. Each build records its road-network version and the source PBF’s
          OSM timestamp in its manifest and in successful route responses.
        </p>
        <p>
          The road-network version is the SHA256 of compact UTF-8 JSON, with sorted keys and no
          trailing newline, containing <code>clipped_pbf_sha256</code>, <code>osrm_source_sha256</code>{' '}
          and <code>profile_sha256</code>. The response’s <code>data_version</code> joins that hash
          and the source timestamp as <code className="break-all">road_network_version@osm_data_timestamp</code>.
        </p>
        <License value="ODbL-1.0" />
        <h3 className="font-semibold text-gray-900">Generation method</h3>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Build the pinned OSRM engine and toolchain using the downloaded build configuration.</li>
          <li>Download and verify the PBF, then crop it using the bounds in the pin file and the complete-ways strategy.</li>
          <li>Replace the upstream walking profile with our foot.lua; foot.diff records the changes from upstream.</li>
          <li>Compute the data version, then run OSRM extract, partition and customize as specified in build-release.py.</li>
        </ol>
        <p>
          The original build-release.py also retains its audit and packaging stages; those later
          stages do not change the graph. Exact commands and parameters are in the original files.
        </p>
        <Downloads group="ops/" />
      </Section>

      <Section id="basemap" title="Basemap">
        <p>The bundled vector map that provides land, water, greenery, roads and buildings behind the app’s map markers.</p>
        <h3 className="font-semibold text-gray-900">Sources</h3>
        <p>
          <a className="text-[#0077B6] underline" href={map.basemap.url}>Protomaps public basemap build {map.basemap.version}</a>.
          We use a regional extract, with bounds (west, south, east, north){' '}
          <code className="break-words">{map.basemap.bbox.join(', ')}</code>, through zoom {map.basemap.maxZoom}.
          The hash below identifies that input extract, rather than the entire planet archive.
        </p>
        <Digest label="Protomaps input extract SHA256" value={map.basemap.extractSha256} />
        <p>Singapore’s boundary, used to select intersecting tiles, comes from the following OSM extract:</p>
        <Source url={map.osm.url} version={map.osm.version} sha256={map.osm.sha256} />
        <h3 className="font-semibold text-gray-900">Output</h3>
        <p><code>basemap.pmtiles</code> · map batch {map.generatedAt}</p>
        <Digest label="Output SHA256" value={basemap.sha256} />
        <License value={basemap.license} />
        <p>
          The Protomaps build’s own attribution is{' '}
          <a className="text-[#0077B6] underline" href={osmCopyright}>
            {protomaps.attribution.replace(/<[^>]*>/g, '').replace(/&copy;/g, '©')}
          </a>.
          Its source description is “{protomaps.description}”. This includes{' '}
          <a className="text-[#0077B6] underline" href="https://www.naturalearthdata.com/about/terms-of-use/">Natural Earth</a>,
          whose map data is in the public domain.
        </p>
        <h3 className="font-semibold text-gray-900">Generation method</h3>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Extract the pinned region from the Protomaps public build and verify the input extract’s hash.</li>
          <li>Keep zooms {map.basemap.minZoom}–{map.basemap.maxZoom} and tiles intersecting Singapore’s OSM boundary.</li>
          <li>Keep only the configured layers, geometry types, feature kinds and properties, then write and verify the PMTiles archive.</li>
        </ol>
        <p>Retained layers: {Object.keys(map.layers).join(', ')}. The complete retention rules are in the downloaded configuration.</p>
        <MapMethodLink />
      </Section>

      <Section id="trees" title="Trees">
        <p>Bundled tree points used to draw trees on the app’s map.</p>
        <h3 className="font-semibold text-gray-900">Source</h3>
        <Source url={map.osm.url} version={map.osm.version} sha256={map.osm.sha256} />
        <h3 className="font-semibold text-gray-900">Output</h3>
        <p><code>trees.pmtiles</code> · map batch {map.generatedAt}</p>
        <Digest label="Output SHA256" value={trees.sha256} />
        <License value={trees.license} />
        <h3 className="font-semibold text-gray-900">Generation method</h3>
        <p>
          Read OSM nodes tagged <code>natural=tree</code>, keep those covered by Singapore’s boundary,
          sort their coordinates, and encode the points in vector tiles at zoom {map.trees.zoom}{' '}
          with extent {map.trees.extent}. Write and verify the PMTiles archive.
        </p>
        <MapMethodLink />
      </Section>

      <Section id="country-mask" title="Country mask">
        <p>The polygon overlay that masks the area outside Singapore on the app’s map.</p>
        <h3 className="font-semibold text-gray-900">Source</h3>
        <Source url={map.osm.url} version={map.osm.version} sha256={map.osm.sha256} />
        <p>
          OSM boundary relation{' '}
          <a className="text-[#0077B6] underline" href={`https://www.openstreetmap.org/relation/${map.osm.relation}`}>
            {map.osm.relation}
          </a>, relation version {map.boundaryRelationVersion}.
        </p>
        <h3 className="font-semibold text-gray-900">Output</h3>
        <p><code>country-mask.geojson</code> · map batch {map.generatedAt}</p>
        <Digest label="Output SHA256" value={mask.sha256} />
        <License value={mask.license} />
        <h3 className="font-semibold text-gray-900">Generation method</h3>
        <p>
          Assemble the boundary relation’s outer and inner ways into polygons, subtract the inner
          polygons, normalize the resulting country geometry, and subtract it from the surrounding
          rectangle defined in the generator. Write the remaining area as GeoJSON.
        </p>
        <MapMethodLink />
      </Section>

      <Section id="map-build-files" title="Map build files">
        <p>
          These original files define the inputs and transformations for the basemap, trees and
          country mask. The manifest records the output hashes and exact tool versions. All
          downloads are plain text and preserve the original file bytes.
        </p>
        <p>
          Place the scripts and configuration together, use the pinned Python version and locked
          dependencies, then run the generator with a work directory and an empty output directory:
        </p>
        <pre className="rounded-xl bg-white border border-gray-100 p-4 text-sm whitespace-pre-wrap break-words">
          {'uv run --project mobile/scripts --locked python mobile/scripts/build-map-assets.py --work-dir /path/to/work --output /path/to/empty-output'}
        </pre>
        <p>
          The generator accepts a saved basemap extract and OSM PBF through <code>--basemap-extract</code>{' '}
          and <code>--osm-pbf</code>; both must match the pinned hashes. Protomaps daily builds expire,
          so reproducing this batch requires preserving that verified input extract.
        </p>
        <p>
          Exact byte reproduction also requires the manifest’s tool environment, including
          Python {map.tools.python} and zlib {map.tools.zlib}.
        </p>
        <Downloads group="mobile/" />
      </Section>
    </article>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-10 scroll-mt-20">
      <h2 className="text-xl font-bold text-gray-900 mb-3">{title}</h2>
      <div className="text-base leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

function Digest({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <code className="block mt-1 text-sm break-all">{value}</code>
    </div>
  );
}

function Source({ url, version, sha256 }: { url: string; version: string; sha256: string }) {
  return (
    <div className="space-y-2">
      <p>
        <a className="text-[#0077B6] underline" href={url}>OpenStreetMap via Geofabrik: Malaysia, Singapore and Brunei</a>
        {' '}· snapshot <span className="break-words">{version}</span>
      </p>
      <Digest label="Input PBF SHA256" value={sha256} />
    </div>
  );
}

function License({ value }: { value: string }) {
  return (
    <p>
      License: <a className="text-[#0077B6] underline" href={odbl}>{value} (Open Database License 1.0)</a>.
      {' '}Attribution: <a className="text-[#0077B6] underline" href={osmCopyright}>© OpenStreetMap contributors</a>.
    </p>
  );
}

function MapMethodLink() {
  return <p>Download the original configuration, generator and locked environment under{' '}
    <a className="text-[#0077B6] underline" href="#map-build-files">Map build files</a>.</p>;
}

function Downloads({ group }: { group: string }) {
  return (
    <ul className="divide-y divide-gray-100 rounded-xl bg-white border border-gray-100 px-4">
      {data.downloads.filter(({ source }) => source.startsWith(group)).map((file) => (
        <li key={file.source} className="py-3">
          <a className="text-[#0077B6] underline break-all" href={file.href}>
            {file.source.split('/').pop()}
          </a>
          <p className="text-sm text-gray-500 mt-1 break-all">{file.source} · {file.bytes.toLocaleString('en-SG')} bytes</p>
          <Digest label="SHA256" value={file.sha256} />
        </li>
      ))}
    </ul>
  );
}
