import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
} from 'node:fs';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';


const appRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const standaloneRoot = join(appRoot, '.next', 'standalone');
const deployRoot = join(appRoot, '.next', 'deploy');

if (!existsSync(standaloneRoot)) {
  throw new Error('Missing .next/standalone; run npm run build first');
}

rmSync(deployRoot, { recursive: true, force: true });
cpSync(standaloneRoot, deployRoot, { recursive: true, dereference: true });

const serverRoot = existsSync(join(deployRoot, 'app', 'server.js'))
  ? join(deployRoot, 'app')
  : deployRoot;

if (!existsSync(join(serverRoot, 'server.js'))) {
  throw new Error('Standalone server.js was not generated');
}

if (!existsSync(join(serverRoot, 'node_modules/sharp/package.json'))) {
  throw new Error('Standalone classify runtime is missing node_modules/sharp/package.json');
}

cpSync(join(appRoot, 'public'), join(serverRoot, 'public'), { recursive: true });
mkdirSync(join(serverRoot, '.next'), { recursive: true });
cpSync(join(appRoot, '.next', 'static'), join(serverRoot, '.next', 'static'), {
  recursive: true,
});

const forbiddenDirectories = new Set(['.git', 'mobile']);
const forbiddenExtensions = new Set(['.key', '.p12', '.p8', '.pem']);

function sanitizeAndValidate(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);
    const relativePath = relative(deployRoot, absolutePath);

    if (entry.isSymbolicLink()) {
      const sourcePath = realpathSync(absolutePath);
      const sourceRelativePath = relative(standaloneRoot, sourcePath);
      if (
        sourceRelativePath === '..' ||
        sourceRelativePath.startsWith(`..${sep}`) ||
        isAbsolute(sourceRelativePath)
      ) {
        throw new Error(`Symlink points outside standalone output: ${relativePath}`);
      }

      const sourceStat = statSync(sourcePath);
      rmSync(absolutePath);
      cpSync(sourcePath, absolutePath, {
        recursive: sourceStat.isDirectory(),
        dereference: true,
      });

      if (sourceStat.isDirectory()) {
        sanitizeAndValidate(absolutePath);
        continue;
      }
      if (!sourceStat.isFile()) {
        throw new Error(`Unsupported symlink target in Web artifact: ${relativePath}`);
      }
    } else if (entry.isDirectory()) {
      if (forbiddenDirectories.has(entry.name)) {
        throw new Error(`Forbidden directory in Web artifact: ${relativePath}`);
      }
      sanitizeAndValidate(absolutePath);
      continue;
    } else if (!entry.isFile()) {
      throw new Error(`Unsupported special file in Web artifact: ${relativePath}`);
    }

    if (entry.name === '.env' || entry.name.startsWith('.env.')) {
      rmSync(absolutePath);
      continue;
    }

    const extension = extname(entry.name);
    if (forbiddenExtensions.has(extension)) {
      throw new Error(`Potential key material in Web artifact: ${relativePath}`);
    }
  }
}

sanitizeAndValidate(deployRoot);

const deployParts = relative(deployRoot, serverRoot).split(sep).filter(Boolean);
console.log(
  `[package-web] Ready: .next/deploy/${deployParts.length ? `${deployParts.join('/')}/` : ''}server.js`,
);
console.log('[package-web] Verified: no mobile source, Git metadata, env files, or key files');
