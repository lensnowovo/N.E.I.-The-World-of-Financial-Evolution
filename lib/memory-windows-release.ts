export type MemoryWindowsRelease = {
  downloadUrl: string;
  version: string;
  sha256: string;
};

const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const SHA256_PATTERN = /^[0-9A-Fa-f]{64}$/;
const RELEASE_REPOSITORY = '/lensnowovo/nei-memory-node/releases/download/';

/**
 * Fail closed unless every public-release field describes the same signed,
 * immutable GitHub release asset. A partially or incorrectly configured
 * deployment must never expose an installer download.
 */
export function parseMemoryWindowsRelease(
  env: Record<string, string | undefined>,
): MemoryWindowsRelease | null {
  if (env.NEXT_PUBLIC_MEMORY_NODE_WINDOWS_SIGNED !== 'true') return null;

  const downloadUrl = env.NEXT_PUBLIC_MEMORY_NODE_WINDOWS_DOWNLOAD_URL?.trim();
  const version = env.NEXT_PUBLIC_MEMORY_NODE_WINDOWS_VERSION?.trim();
  const sha256 = env.NEXT_PUBLIC_MEMORY_NODE_WINDOWS_SHA256?.trim();

  if (!downloadUrl || !version || !sha256) return null;
  if (!VERSION_PATTERN.test(version) || !SHA256_PATTERN.test(sha256)) return null;

  let url: URL;
  try {
    url = new URL(downloadUrl);
  } catch {
    return null;
  }

  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'github.com' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    return null;
  }

  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }

  const expectedPrefix = `${RELEASE_REPOSITORY}v${version}/`;
  const filename = pathname.slice(expectedPrefix.length);
  if (
    !pathname.startsWith(expectedPrefix) ||
    !filename ||
    filename.includes('/') ||
    !filename.toLowerCase().endsWith('.exe')
  ) {
    return null;
  }

  return {
    downloadUrl: url.toString(),
    version,
    sha256: sha256.toUpperCase(),
  };
}
