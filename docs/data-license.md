# Map and routing data license page

`/data-license` publishes the sources, licenses, hashes and transformation methods for the mobile basemap, trees, country mask and walking road graph. The page uses the shared `DATA_LICENSE_URL` constant and the site layout.

## Updating the published information

The source files remain in `mobile/scripts`, `mobile/assets/map-assets` and `ops/routing`. `app/scripts/data-license.ts` produces `app/src/data/data-license.json` and exact copies of the method files under `app/public/data-license/methods`. Downloads use a `.txt` suffix so the production server serves them as `text/plain`.

After updating and rebuilding a map batch or updating routing inputs, run from `app`:

```bash
npm run data-license:update
npm run test:unit
```

Commit the generated page data and download copies with the source changes. Web unit tests compare both against their current sources without rewriting them. They also check that the map manifest matches the configuration, generator, dependency lock and three map artifacts. Source changes under `mobile/` or `ops/` alone do not trigger Web deployment; the generated changes under `app/` ensure the published page is updated through the Web release path.

## Protomaps attribution

`app/data/data-license/protomaps.json` records metadata read from the pinned public PMTiles build, including the original attribution and source description. The page retains the OSM attribution and identifies Natural Earth, the other source named in that description. Header and compressed metadata SHA256 values record the captured source bytes.

When changing the Protomaps source URL, refresh its metadata explicitly while the build is available:

```bash
npm run data-license:refresh-protomaps
```

This reads only the PMTiles header and metadata through HTTP byte ranges, saves the snapshot and updates the generated files. Ordinary updates and tests work offline. Preserve the verified input extract because daily public builds expire.

## Transformation files

Map downloads include the unmodified configuration and generator, Python version, project dependencies, dependency lock and output manifest. Together they specify source pins, retention rules, boundary and tree processing, encoding, and the tool environment used for byte reproduction.

Routing downloads include pins, the walking profile and upstream diff, the engine build script and triplet, graph build script, shell entry point and toolchain Dockerfile. The pinned OSRM source archive supplies the upstream profile libraries. The graph build script is preserved in full, including its later audit and packaging stages, which do not change the graph. The downloads describe the data transformations; ancillary release quality reports and runtime packaging inputs remain in the routing source tree.

The routing source snapshot contains neither the cropped PBF nor a release manifest. It therefore cannot determine a literal road-network version: that SHA256 includes the cropped PBF hash, and `data_version` also needs the original PBF header timestamp. The page publishes the pinned inputs, profile hash and version algorithm instead. The graph builder records the exact values when it runs.
