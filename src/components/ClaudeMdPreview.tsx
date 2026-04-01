'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import type { ClaudeMdSection } from '@/types/claude-md';
import { CheckIcon, CopyIcon, DownloadIcon } from 'lucide-react';

interface ClaudeMdPreviewProps {
  sections: ClaudeMdSection[];
  repoName?: string;
  isLoading?: boolean;
}

function buildClaudeMdText(sections: ClaudeMdSection[]): string {
  return sections
    .filter((s) => s.content)
    .map((s) => `## ${s.title}\n\n${s.content}`)
    .join('\n\n---\n\n');
}

export function ClaudeMdPreview({
  sections,
  repoName,
  isLoading,
}: ClaudeMdPreviewProps) {
  const [copied, setCopied] = useState(false);

  const claudeMdText = buildClaudeMdText(sections);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(claudeMdText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([claudeMdText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'CLAUDE.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <p className="font-mono text-sm text-muted-foreground">CLAUDE.md</p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            disabled={!claudeMdText}
            aria-label="クリップボードにコピー"
          >
            {copied ? (
              <CheckIcon className="mr-1.5 size-3.5" />
            ) : (
              <CopyIcon className="mr-1.5 size-3.5" />
            )}
            {copied ? 'コピー済み' : 'コピー'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDownload}
            disabled={!claudeMdText}
            aria-label="CLAUDE.mdをダウンロード"
          >
            <DownloadIcon className="mr-1.5 size-3.5" />
            ダウンロード
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Spinner className="size-4" />
              <span className="text-sm">解析中...</span>
            </div>
          ) : claudeMdText ? (
            <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground">
              {claudeMdText}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">
              チャットでAIと対話するとここにCLAUDE.mdが生成されます。
            </p>
          )}
        </div>
      </ScrollArea>

      {repoName && (
        <div className="border-t px-4 py-2">
          <p className="font-mono text-xs text-muted-foreground">
            {repoName}
            {sections.filter((s) => s.content).length > 0 && (
              <span className="ml-2">
                ({sections.filter((s) => s.content).length}/{sections.length} セクション)
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
