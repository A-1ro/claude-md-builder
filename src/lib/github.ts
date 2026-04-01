const GITHUB_API_BASE = 'https://api.github.com';
const HEADERS = { 'User-Agent': 'claude-md-builder/1.0' };
const TIMEOUT_MS = 10000;

export interface GitHubTreeItem {
  path: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
}

export interface GitHubFileContent {
  path: string;
  content: string;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error('Invalid GitHub URL');
  const owner = match[1];
  const repo = match[2].replace(/\/$/, '').replace(/\.git$/, '');
  return { owner, repo };
}

export async function getRepoTree(owner: string, repo: string): Promise<GitHubTreeItem[]> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`;
  const res = await fetchWithTimeout(url, { headers: HEADERS });

  if (res.status === 404) throw Object.assign(new Error('Repository not found'), { status: 404 });
  if (res.status === 403) throw Object.assign(new Error('Private repository or access denied'), { status: 403 });
  if (res.status === 429) throw Object.assign(new Error('GitHub API rate limit exceeded'), { status: 429 });
  if (!res.ok) throw Object.assign(new Error(`GitHub API error: ${res.status}`), { status: res.status });

  const data = await res.json();
  return (data.tree ?? []) as GitHubTreeItem[];
}

export async function getFileContent(owner: string, repo: string, path: string): Promise<string> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`;
  const res = await fetchWithTimeout(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  const data = await res.json();
  if (data.encoding !== 'base64') throw new Error(`Unexpected encoding: ${data.encoding}`);
  return Buffer.from(data.content, 'base64').toString('utf-8');
}

// Priority file patterns to fetch (in order)
const PRIORITY_PATTERNS: { pattern: RegExp; max: number }[] = [
  { pattern: /^package\.json$/, max: 1 },
  { pattern: /^(Cargo\.toml|pyproject\.toml|go\.mod)$/, max: 1 },
  { pattern: /^tsconfig\.json$/, max: 1 },
  { pattern: /^CLAUDE\.md$/i, max: 1 },
  { pattern: /^README\.md$/i, max: 1 },
  { pattern: /^\.(eslintrc.*|prettierrc.*)$/, max: 1 },
  { pattern: /^(Makefile|Taskfile\.yml)$/, max: 1 },
  { pattern: /^(Dockerfile|docker-compose\.yml)$/, max: 1 },
  { pattern: /^\.github\/workflows\/.+\.yml$/, max: 1 },
  { pattern: /^\.env\.example$/, max: 1 },
  { pattern: /^(next\.config\.|vite\.config\.)/, max: 1 },
];

const MAX_FILES = 15;

export function selectFilesToFetch(tree: GitHubTreeItem[]): string[] {
  const blobs = tree.filter((item) => item.type === 'blob').map((item) => item.path);
  const selected: string[] = [];
  const used = new Set<string>();

  for (const { pattern, max } of PRIORITY_PATTERNS) {
    if (selected.length >= MAX_FILES) break;
    let count = 0;
    for (const path of blobs) {
      if (count >= max) break;
      const filename = path.split('/').pop() ?? path;
      if ((pattern.test(path) || pattern.test(filename)) && !used.has(path)) {
        selected.push(path);
        used.add(path);
        count++;
      }
    }
  }

  return selected.slice(0, MAX_FILES);
}

export async function fetchRepoFiles(
  owner: string,
  repo: string,
  paths: string[]
): Promise<GitHubFileContent[]> {
  const results: GitHubFileContent[] = [];
  for (const path of paths) {
    try {
      const content = await getFileContent(owner, repo, path);
      results.push({ path, content });
    } catch {
      // Skip files that fail to fetch
    }
  }
  return results;
}
