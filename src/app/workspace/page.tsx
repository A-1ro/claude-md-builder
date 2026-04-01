import { redirect } from 'next/navigation';
import { WorkspaceClient } from './WorkspaceClient';

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ repo?: string }>;
}) {
  const { repo } = await searchParams;
  if (!repo) redirect('/');
  return <WorkspaceClient repoUrl={repo} />;
}
