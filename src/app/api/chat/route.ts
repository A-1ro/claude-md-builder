import { ToolLoopAgent, convertToModelMessages, stepCountIs, tool } from 'ai';
import { groq } from '@ai-sdk/groq';
import { z } from 'zod';
import type { AnalyzeResponse } from '@/types/claude-md';

const SYSTEM_PROMPT = `あなたはCLAUDE.mdの生成を支援するAIアシスタントです。
ユーザーのGitHubリポジトリを分析し、対話形式でCLAUDE.mdを構築します。

以下の5フェーズで進めてください:
1. 分析結果提示: リポジトリ分析結果を提示し、初期ドラフトを生成
2. 開発ワークフロー: dev環境、テスト手順を質問（1-2問）
3. コード規約: 命名規則、アーキテクチャパターンを質問（1-2問）
4. ガードレール: 禁止事項、よくある落とし穴を質問（1-2問）
5. 確認・完成: finalizeツールを呼び出して完了

各フェーズでupdateSectionツールを使い、回答に基づいてセクションを更新してください。`;

const updateSection = tool({
  description: 'CLAUDE.mdの特定セクションの内容を更新する',
  inputSchema: z.object({
    sectionId: z.string().describe('セクションID (例: project-overview)'),
    content: z.string().describe('セクションの内容（マークダウン形式）'),
  }),
});

const finalize = tool({
  description: 'CLAUDE.mdの生成が完了したことを宣言する',
  inputSchema: z.object({
    message: z.string().describe('完了メッセージ'),
  }),
});

export async function POST(req: Request) {
  const body = await req.json();
  const { messages, analyzeResult } = body as {
    messages: Parameters<typeof convertToModelMessages>[0];
    analyzeResult?: AnalyzeResponse;
  };

  const systemPrompt = analyzeResult
    ? `${SYSTEM_PROMPT}\n\n## リポジトリ分析結果\n\`\`\`json\n${JSON.stringify(analyzeResult, null, 2)}\n\`\`\``
    : SYSTEM_PROMPT;

  const modelMessages = await convertToModelMessages(messages);

  const agent = new ToolLoopAgent({
    model: groq('llama-3.3-70b-versatile'),
    instructions: systemPrompt,
    tools: { updateSection, finalize },
    stopWhen: stepCountIs(20),
  });

  const result = await agent.stream({ messages: modelMessages });

  return result.toUIMessageStreamResponse();
}
