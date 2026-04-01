"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const GITHUB_URL_PATTERN = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\/)?$/;

const FEATURES = [
  "リポジトリ構造を自動解析してプロジェクト概要を把握",
  "コードベースから開発ルール・規約を抽出",
  "AIエージェント向けの最適なCLAUDE.mdを生成",
  "生成結果をその場で編集・コピー可能",
];

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!GITHUB_URL_PATTERN.test(url)) {
      setError("有効なGitHub URLを入力してください（例: https://github.com/owner/repo）");
      return;
    }
    setError("");
    router.push("/workspace?repo=" + encodeURIComponent(url));
  }

  const isEmpty = url.trim() === "";

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-2xl space-y-10">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight font-mono text-foreground">
            CLAUDE.md Builder
          </h1>
          <p className="text-muted-foreground text-lg">
            GitHubリポジトリを解析して、AIエージェント向けの
            <br />
            最適な <span className="font-mono text-foreground">CLAUDE.md</span> を自動生成します。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="https://github.com/owner/repo"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError("");
              }}
              className="flex-1 font-mono"
              aria-label="GitHub リポジトリ URL"
            />
            <Button type="submit" disabled={isEmpty}>
              分析開始
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </form>

        <ul className="space-y-2">
          {FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-muted-foreground text-sm">
              <span className="mt-0.5 text-foreground">✦</span>
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
