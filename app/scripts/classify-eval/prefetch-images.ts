import { BCRS_IMAGE_SOURCES } from './bcrs-test-cases';
import { loadSource } from './image-fixtures';

async function main() {
  for (const source of BCRS_IMAGE_SOURCES) {
    await loadSource(source);
    console.log(`Verified fixture: ${source.id}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
