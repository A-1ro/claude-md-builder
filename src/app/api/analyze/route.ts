import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { groq } from '@ai-sdk/groq';
import {
  parseRepoUrl,
  getRepoTree,
  selectFilesToFetch,
  fetchRepoFiles,
} from '@/lib/github';
import type { GitHubFileContent } from '@/lib/github';
import type { AnalyzeRequest, AnalyzeResponse, ClaudeMdSection } from '@/types/claude-md';
import { SECTION_DEFINITIONS } from '@/types/claude-md';

function buildPrompt(
  owner: string,
  repo: string,
  files: GitHubFileContent[]
): string {
  const filesSummary = files
    .map(({ path, content }) => {
      const truncated = content.length > 3000 ? content.slice(0, 3000) + '\n... (truncated)' : content;
      return `--- ${path} ---\n${truncated}`;
    })
    .join('\n\n');

  const sectionList = SECTION_DEFINITIONS.map(
    (s) => `- ${s.id} (${s.title}): priority=${s.priority}`
  ).join('\n');

  return `You are an expert software engineer analyzing a GitHub repository to generate a CLAUDE.md file.

Repository: ${owner}/${repo}

Below are the key files from the repository:

${filesSummary}

Based on these files, provide a JSON response with the following structure:
{
  "description": "One-line description of what this project does",
  "techStack": ["list", "of", "technologies", "frameworks", "tools"],
  "sections": [
    {
      "id": "section-id",
      "title": "Section Title",
      "content": "Markdown content for this section (can be empty string if not enough info)"
    }
  ]
}

Required sections (use these exact IDs):
${sectionList}

Guidelines:
- description: Be concise and specific (1 sentence)
- techStack: Include languages, frameworks, build tools, databases, testing frameworks
- sections.content: Write in markdown. Extract actual commands, patterns, and rules from the files.
  For build-commands and development-commands, use actual scripts from package.json or Makefile.
  For code-style, reference actual config files found.
  Leave content as empty string if there is not enough information.

Respond with ONLY valid JSON, no markdown code blocks.`;
}

function parseJsonSafely(text: string): Record<string, unknown> {
  // Strip markdown code blocks if present
  const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(cleaned);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: AnalyzeRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { repoUrl } = body;
  if (!repoUrl || typeof repoUrl !== 'string') {
    return NextResponse.json({ error: 'repoUrl is required' }, { status: 400 });
  }

  let owner: string;
  let repo: string;
  try {
    ({ owner, repo } = parseRepoUrl(repoUrl));
  } catch {
    return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 });
  }

  // Fetch GitHub repository structure
  let tree;
  try {
    tree = await getRepoTree(owner, repo);
  } catch (err) {
    const e = err as { status?: number; message?: string };
    if (e.status === 404) return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    if (e.status === 403) return NextResponse.json({ error: 'Private repository or access denied' }, { status: 403 });
    if (e.status === 429) return NextResponse.json({ error: 'GitHub API rate limit exceeded' }, { status: 429 });
    return NextResponse.json({ error: 'Failed to fetch repository' }, { status: 500 });
  }

  const paths = selectFilesToFetch(tree);
  const files = await fetchRepoFiles(owner, repo, paths);

  const hasExistingClaudeMd = files.some(
    (f) => f.path.toLowerCase() === 'claude.md'
  );

  // Log GitHub fetch data before LLM call
  console.log(`[analyze] ${owner}/${repo}: fetched ${files.length} files:`, paths);

  // LLM analysis via Groq
  let description = '';
  let techStack: string[] = [];
  let sections: ClaudeMdSection[] = SECTION_DEFINITIONS.map((s) => ({
    ...s,
    content: '',
  }));

  try {
    const prompt = buildPrompt(owner, repo, files);
    const result = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt,
    });

    const parsed = parseJsonSafely(result.text);
    description = String(parsed.description ?? '');
    techStack = Array.isArray(parsed.techStack) ? parsed.techStack.map(String) : [];

    const parsedSections = Array.isArray(parsed.sections) ? parsed.sections : [];
    sections = SECTION_DEFINITIONS.map((def) => {
      const found = parsedSections.find(
        (s: Record<string, unknown>) => s.id === def.id
      );
      return {
        id: def.id,
        title: def.title,
        priority: def.priority,
        content: found ? String(found.content ?? '') : '',
      };
    });
  } catch (err) {
    // LLM failed (e.g. no OIDC token in local dev) — return partial response
    console.error('[analyze] LLM call failed:', err);
    description = `${owner}/${repo}`;
  }

  const response: AnalyzeResponse = {
    repoName: `${owner}/${repo}`,
    description,
    techStack,
    sections,
    hasExistingClaudeMd,
  };

  return NextResponse.json(response);
}
