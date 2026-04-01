export interface ClaudeMdSection {
  id: string;
  title: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AnalyzeResponse {
  repoName: string;
  description: string;
  techStack: string[];
  sections: ClaudeMdSection[];
  hasExistingClaudeMd: boolean;
}

export interface AnalyzeRequest {
  repoUrl: string;
}

export const SECTION_DEFINITIONS: { id: string; title: string; priority: ClaudeMdSection['priority'] }[] = [
  { id: 'project-overview', title: 'Project Overview', priority: 'high' },
  { id: 'build-commands', title: 'Build Commands', priority: 'high' },
  { id: 'development-commands', title: 'Development Commands', priority: 'high' },
  { id: 'testing-strategy', title: 'Testing Strategy', priority: 'medium' },
  { id: 'code-style', title: 'Code Style', priority: 'medium' },
  { id: 'architecture-patterns', title: 'Architecture Patterns', priority: 'medium' },
  { id: 'forbidden-actions', title: 'Forbidden Actions', priority: 'high' },
  { id: 'common-pitfalls', title: 'Common Pitfalls', priority: 'low' },
  { id: 'environment-setup', title: 'Environment Setup', priority: 'medium' },
];
