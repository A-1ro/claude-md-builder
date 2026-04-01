'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';
import { ClaudeMdPreview } from '@/components/ClaudeMdPreview';
import type { AnalyzeResponse, ClaudeMdSection } from '@/types/claude-md';
import { SECTION_DEFINITIONS } from '@/types/claude-md';

export function WorkspaceClient({ repoUrl }: { repoUrl: string }) {
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResponse | null>(null);
  const [sections, setSections] = useState<ClaudeMdSection[]>(
    SECTION_DEFINITIONS.map((s) => ({ ...s, content: '' }))
  );
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const initialMessageSent = useRef(false);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: { analyzeResult },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [analyzeResult?.repoName]
  );

  const { messages, sendMessage, status, stop } = useChat({ transport });

  useEffect(() => {
    async function analyze() {
      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl }),
        });
        if (res.ok) {
          const result: AnalyzeResponse = await res.json();
          setAnalyzeResult(result);
          setSections(
            result.sections?.length
              ? result.sections
              : SECTION_DEFINITIONS.map((s) => ({ ...s, content: '' }))
          );
        }
      } finally {
        setIsAnalyzing(false);
      }
    }
    analyze();
  }, [repoUrl]);

  useEffect(() => {
    if (!analyzeResult || initialMessageSent.current) return;
    initialMessageSent.current = true;
    sendMessage({
      text: `リポジトリ「${analyzeResult.repoName}」の分析が完了しました。CLAUDE.mdの生成を開始してください。`,
    });
  }, [analyzeResult, sendMessage]);

  // Extract updateSection tool calls and keep sections in sync
  useEffect(() => {
    for (const msg of messages) {
      for (const part of msg.parts ?? []) {
        if (
          part.type.startsWith('tool-') &&
          'toolName' in part &&
          (part as { toolName: string }).toolName === 'updateSection' &&
          'args' in part
        ) {
          const { sectionId, content } = (part as { args: { sectionId: string; content: string } }).args;
          setSections((prev) =>
            prev.map((s) => (s.id === sectionId ? { ...s, content } : s))
          );
        }
      }
    }
  }, [messages]);

  const isLoading = status === 'streaming' || status === 'submitted';

  return (
    <ResizablePanelGroup orientation="horizontal" className="h-screen">
      <ResizablePanel defaultSize={45} minSize={30}>
        <div className="flex h-full flex-col">
          <div className="border-b px-4 py-3">
            <p className="truncate font-mono text-sm text-muted-foreground">
              {isAnalyzing ? '解析中...' : (analyzeResult?.repoName ?? repoUrl)}
            </p>
          </div>

          <Conversation className="min-h-0 flex-1">
            <ConversationContent>
              {messages.length === 0 && (
                <ConversationEmptyState
                  title="CLAUDE.md Builder"
                  description="リポジトリを解析してCLAUDE.mdを生成します"
                />
              )}
              {messages.map((msg) => (
                <Message key={msg.id} from={msg.role}>
                  <MessageContent>
                    {(msg.parts ?? []).map((part, i) => {
                      if (part.type === 'text') {
                        return (
                          <MessageResponse key={i}>{part.text}</MessageResponse>
                        );
                      }
                      return null;
                    })}
                  </MessageContent>
                </Message>
              ))}
            </ConversationContent>
          </Conversation>

          <div className="border-t p-3">
            <PromptInput
              onSubmit={({ text }) => {
                if (text.trim()) sendMessage({ text });
              }}
            >
              <PromptInputBody>
                <PromptInputTextarea placeholder="質問や追加情報を入力..." />
              </PromptInputBody>
              <PromptInputFooter>
                <PromptInputSubmit status={status} onStop={stop} />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={55} minSize={30}>
        <ClaudeMdPreview
          sections={sections}
          repoName={analyzeResult?.repoName}
          isLoading={isAnalyzing}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
