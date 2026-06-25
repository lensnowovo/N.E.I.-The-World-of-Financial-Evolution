'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/cn';
import { RichEditor } from '@/components/RichEditor';
import { AiAssistPanel } from '@/components/publish/AiAssistPanel';
import {
  AttachmentUploader,
  type UploadedFile,
} from '@/components/AttachmentUploader';
import { Button } from '@/components/ui/Button';
import { RoleBadge } from '@/components/icons/RoleBadge';
import { SkillIcon } from '@/components/icons/SkillIcon';
import {
  SCENE_TAGS,
  INDUSTRY_TAGS,
  CONTENT_TAGS,
  ASSET_TYPE_HELPERS,
  FILE_TYPE_OPTIONS,
  METHOD_TYPE_OPTIONS,
} from '@/lib/tags';

type CurrentUser = { id: number; role: string; nickname: string };

/** 三种发布分支，对应首屏三张卡片 */
type Branch = 'prompt' | 'file' | 'method';

export function PublishForm({ currentUser }: { currentUser: CurrentUser }) {
  const router = useRouter();

  // —— 分支选择（首屏）——
  const [branch, setBranch] = useState<Branch | null>(null);

  // —— 共享字段 ——
  const [title, setTitle] = useState('');
  const [scene, setScene] = useState('');
  const [industry, setIndustry] = useState('');
  const [contents, setContents] = useState<string[]>([]);

  // —— 分支 A · 提示词 ——
  const [promptText, setPromptText] = useState('');

  // —— 分支 B · Skill 文件 ——
  const [fileTypeIdx, setFileTypeIdx] = useState<number | null>(null); // FILE_TYPE_OPTIONS 的下标
  const [fileIntro, setFileIntro] = useState(''); // 正文

  // —— 分支 C · 方法论 ——
  const [methodType, setMethodType] = useState<string>(''); // assetType
  const [methodBody, setMethodBody] = useState(''); // 正文（富文本）

  // —— 共享 · 附件 + 资产补充信息 ——
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [sourceUrl, setSourceUrl] = useState('');
  const [originalAuthor, setOriginalAuthor] = useState('');
  const [installHint, setInstallHint] = useState('');
  const [usageNotes, setUsageNotes] = useState('');

  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleContent = (v: string) => {
    if (contents.includes(v)) setContents(contents.filter((x) => x !== v));
    else if (contents.length < 3) setContents([...contents, v]);
  };

  /** AI 转写结果灌进表单（用户 review 后再发布） */
  const prefillFromAi = (result: {
    skill: {
      title: string;
      intro: string;
      branch: 'prompt' | 'file' | 'method';
      tagSkill: string;
      tagScene: string;
      tagIndustry?: string | null;
      tagContent: string[];
      installHint?: string | null;
      originalAuthor?: string | null;
    };
    attachment: { id: number; fileName: string } | null;
  }) => {
    const { skill, attachment } = result;
    setBranch(skill.branch);
    setTitle(skill.title);
    setScene(skill.tagScene);
    setOriginalAuthor(skill.originalAuthor || '');
    setIndustry(skill.tagIndustry || '');
    setContents(skill.tagContent);
    setInstallHint(skill.installHint || '');

    // 分支专属字段
    if (skill.branch === 'prompt') {
      setPromptText(skill.intro); // 提示词内容塞正文
    } else if (skill.branch === 'file') {
      // tagSkill 反查 FILE_TYPE_OPTIONS 下标
      const idx = FILE_TYPE_OPTIONS.findIndex((t) => t.assetType === skill.tagSkill);
      setFileTypeIdx(idx >= 0 ? idx : null);
      setFileIntro(skill.intro);
    } else {
      setMethodType(skill.tagSkill);
      setMethodBody(skill.intro);
    }

    // 附件（AI 抓来的原文）
    if (attachment) {
      setFiles([
        ...files,
        { id: attachment.id, fileName: attachment.fileName, fileSize: 0, mimeType: 'text/markdown' },
      ]);
    }
  };

  /** 根据分支推导出 assetType */
  const resolveAssetType = (): string => {
    if (branch === 'prompt') return 'prompt';
    if (branch === 'file')
      return fileTypeIdx !== null ? FILE_TYPE_OPTIONS[fileTypeIdx].assetType : 'template';
    if (branch === 'method') return methodType || 'workflow';
    return 'prompt';
  };

  /** 根据分支推导出正文 body */
  const resolveBody = (): string => {
    if (branch === 'prompt') {
      // 提示词直接作为正文（包一层 <pre> 保留格式）
      return `<pre>${escapeHtml(promptText)}</pre>`;
    }
    if (branch === 'file') return fileIntro;
    return methodBody;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');

    // —— 基础校验 ——
    if (!branch) return setErr('请先选择要分享什么');
    if (title.trim().length < 5) return setErr('标题至少 5 个字');
    if (title.length > 100) return setErr('标题最多 100 个字');
    if (!scene) return setErr('请选一个「用在哪个环节」');

    // —— 分支专属校验 ——
    if (branch === 'prompt' && promptText.trim().length === 0)
      return setErr('把提示词粘贴进来');
    if (branch === 'file' && fileTypeIdx === null)
      return setErr('选一下这是什么类型的文件');
    if (branch === 'method' && !methodType) return setErr('选一下这属于哪类');

    const body = resolveBody();
    if (!body || body.replace(/<[^>]*>/g, '').trim().length === 0)
      return setErr('内容还没写');

    if (sourceUrl.trim() && !/^https?:\/\/.+/.test(sourceUrl.trim()))
      return setErr('链接须以 http:// 或 https:// 开头');

    setSubmitting(true);
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        body,
        tagScene: scene,
        tagIndustry: industry || null,
        tagContent: contents,
        tagSkill: resolveAssetType(),
        attachmentIds: files.map((f) => f.id),
        sourceUrl: sourceUrl.trim() || null,
        originalAuthor: originalAuthor.trim() || null,
        installHint: installHint.trim() || null,
        usageNotes: usageNotes.trim() || null,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setErr(data.error || '发布失败');
      return;
    }
    router.push(`/posts/${data.id}`);
    router.refresh();
  };

  const assetType = resolveAssetType();
  const assetHelper = branch ? ASSET_TYPE_HELPERS[assetType] : null;

  // 智能发布辅助用的纯文本正文（prompt 分支本来就是纯文本；file/method 是富文本去标签）
  const bodyText =
    branch === 'prompt' ? promptText
      : branch === 'file' ? stripHtml(fileIntro)
        : branch === 'method' ? stripHtml(methodBody)
          : '';
  // file/method 的正文是介绍/方法，摘要可写入；prompt 的正文即提示词本身，不写摘要
  const canApplySummary = branch === 'file' || branch === 'method';

  // ============ 首屏：分支选择 ============
  if (!branch) {
    return (
      <BranchPicker onPick={setBranch} onTranscribe={prefillFromAi} />
    );
  }

  // ============ 分支表单 ============
  return (
    <form onSubmit={submit} className="space-y-section">
      {/* —— 作者条 —— */}
      <div className="flex items-center gap-3 pb-5 border-b border-paper-edge">
        <RoleBadge role={currentUser.role} size={22} />
        <div>
          <p className="font-display tracking-display text-[10px] text-sepia uppercase">
            作者
          </p>
          <p className="font-serif text-base text-ink-brown">{currentUser.nickname}</p>
        </div>
        <button
          type="button"
          onClick={() => setBranch(null)}
          className="ml-auto font-serif italic text-xs text-sepia hover:text-ink-brown transition-colors"
        >
          ← 换一种
        </button>
      </div>

      {/* —— 当前分支标识 —— */}
      <div className="flex items-center gap-2 text-sm text-sepia font-serif italic">
        <BranchTag branch={branch} />
        <span>·</span>
        <span>分享一个{branchLabel(branch)}</span>
      </div>

      {/* ===== 标题 ===== */}
      <Section title="标题" hint="一句话概括，让别人一眼知道这是啥">
        <input
          className={cn(
            'w-full bg-transparent border-0 border-b border-paper-edge',
            'font-serif text-2xl sm:text-3xl text-ink-brown placeholder:text-sepia/60 italic',
            'focus:border-ink-brown focus:outline-none transition-colors',
            'py-3',
          )}
          placeholder={
            branch === 'prompt'
              ? '例：快速摸清一个赛道的提问框架'
              : branch === 'file'
                ? '例：尽调资料清单模板'
                : '例：用 AI 做赛道扫描的完整流程'
          }
          maxLength={100}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <p className="mt-1 font-sans text-[11px] text-sepia text-right num-osf">
          {title.length}/100
        </p>
      </Section>

      {/* ===== 分支专属内容区 ===== */}
      {branch === 'prompt' && (
        <Section title="提示词" hint="把你的提示词粘贴在这里，方括号 [像这样] 标出要替换的部分">
          <textarea
            className={cn(
              'w-full bg-vellum/50 border border-paper-edge rounded px-4 py-3',
              'font-mono text-sm text-ink-brown placeholder:text-sepia/60',
              'focus:border-ink-brown focus:outline-none transition-colors',
              'resize-y min-h-[240px]',
            )}
            placeholder={'你是一个资深投资人，请帮我分析 [公司名] 所在的 [行业] 赛道…\n\n用方括号标出需要替换的部分，别人复制后改一下就能用。'}
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
          />
          <p className="mt-1 font-sans text-[11px] text-sepia">
            提示词会作为正文保存，别人可以直接复制使用。
          </p>
        </Section>
      )}

      {branch === 'file' && (
        <>
          <Section title="上传文件" hint="别人下载后就能直接用的文件">
            <AttachmentUploader files={files} onChange={setFiles} />
          </Section>

          <Section title="这是什么类型的文件？" hint="帮别人一眼看懂怎么打开">
            <ChipSet>
              {FILE_TYPE_OPTIONS.map((t, i) => (
                <SealChip
                  key={`${t.assetType}-${i}`}
                  active={fileTypeIdx === i}
                  onClick={() => setFileTypeIdx(i)}
                >
                  {t.label}
                </SealChip>
              ))}
            </ChipSet>
            <p className="mt-2 font-sans text-[11px] text-sepia">
              没有完全对应的？选最接近的就行。
            </p>
          </Section>

          <Section title="介绍两句（选填）" hint="这个文件怎么来的、适合谁用">
            <RichEditor value={fileIntro} onChange={setFileIntro} placeholder="简单写几句，让别人知道这文件怎么用…" />
          </Section>
        </>
      )}

      {branch === 'method' && (
        <>
          <Section title="这属于哪类？" hint="帮别人找到它">
            <ChipSet>
              {METHOD_TYPE_OPTIONS.map((t, i) => (
                <SealChip
                  key={`${t.assetType}-${i}`}
                  active={methodType === t.assetType}
                  onClick={() => setMethodType(t.assetType)}
                >
                  {t.label}
                </SealChip>
              ))}
            </ChipSet>
          </Section>

          <Section title="正文" hint="把完整的工作流程 / 工具组合 / 案例写清楚">
            {assetHelper && (
              <div className="bg-vellum/50 border border-paper-edge rounded px-3 py-2 text-xs text-leather mb-3">
                {assetHelper.body}
              </div>
            )}
            <RichEditor value={methodBody} onChange={setMethodBody} placeholder="按步骤写，每一步写清楚输入和产出…" />
          </Section>

          <Section title="配套文件（选填）" hint="有现成文件可以一起传">
            <AttachmentUploader files={files} onChange={setFiles} />
          </Section>
        </>
      )}

      {/* ===== 智能发布辅助（写完正文后，AI 建议标题/分类/摘要/占位符）===== */}
      {branch && (
        <AiAssistPanel
          branch={branch}
          title={title}
          bodyText={bodyText}
          canApplySummary={canApplySummary}
          currentScene={scene}
          currentIndustry={industry}
          currentContents={contents}
          onApplyTitle={(s) => setTitle(s)}
          onApplyScene={(s) => setScene(s)}
          onApplyIndustry={(s) => setIndustry(s || '')}
          onApplyContents={(vals) => setContents(vals)}
          onApplySummary={(html) => {
            if (branch === 'file') setFileIntro((prev) => `${html}${prev ? `\n${prev}` : ''}`);
            else if (branch === 'method') setMethodBody((prev) => `${html}${prev ? `\n${prev}` : ''}`);
          }}
        />
      )}

      {/* ===== 用在哪个环节（场景，必填，带示例）===== */}
      <Section title="用在哪个环节？" hint="必填 · 选一个最贴的，帮别人找到它">
        <div className="space-y-1.5">
          {SCENE_TAGS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setScene(t.value)}
              className={cn(
                'w-full text-left flex items-baseline gap-3 px-3 py-2 rounded border transition-colors',
                scene === t.value
                  ? 'border-ink-brown bg-parchment'
                  : 'border-paper-edge bg-vellum/40 hover:border-sepia',
              )}
            >
              <span
                className={cn(
                  'font-serif text-sm shrink-0',
                  scene === t.value ? 'text-ink-brown' : 'text-leather',
                )}
              >
                {t.label}
              </span>
              <span className="font-sans text-[11px] text-sepia truncate">
                {t.example}
              </span>
            </button>
          ))}
        </div>
      </Section>

      {/* ===== 补充标签（选填，默认折叠）===== */}
      <CollapsibleSection title="补充标签（选填）" hint="行业、工作内容，让分类更准">
        <Dimension label="行业赛道" hint="选填 · 单选">
          <ChipSet>
            <PillChip active={industry === ''} onClick={() => setIndustry('')}>
              不指定
            </PillChip>
            {INDUSTRY_TAGS.map((t) => (
              <PillChip
                key={t.value}
                active={industry === t.value}
                onClick={() => setIndustry(t.value)}
              >
                {t.label}
              </PillChip>
            ))}
          </ChipSet>
        </Dimension>

        <Dimension label="工作内容" hint={`多选 · 最多 3 个 · 已选 ${contents.length}`}>
          <ChipSet>
            {CONTENT_TAGS.map((t) => (
              <FoldChip
                key={t.value}
                active={contents.includes(t.value)}
                disabled={!contents.includes(t.value) && contents.length >= 3}
                onClick={() => toggleContent(t.value)}
              >
                {t.label}
              </FoldChip>
            ))}
          </ChipSet>
        </Dimension>
      </CollapsibleSection>

      {/* ===== 补充说明（选填，默认折叠）===== */}
      <CollapsibleSection title="补充说明（选填）" hint="来源链接、使用说明、适合谁用">
        {assetHelper && (
          <p className="mb-3 text-[11px] text-sepia font-sans">
            {assetHelper.installHint}
          </p>
        )}
        <Dimension label="来源链接" hint="原始出处或下载地址">
          <input
            type="url"
            className={cn(
              'w-full bg-transparent border border-paper-edge rounded px-3 py-2',
              'font-sans text-sm text-ink-brown placeholder:text-sepia/60',
              'focus:border-ink-brown focus:outline-none transition-colors',
            )}
            placeholder="https://example.com/..."
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
          />
        </Dimension>

        <Dimension label="安装 / 使用说明" hint="选填 · 最多 2000 字">
          <textarea
            className={cn(
              'w-full bg-transparent border border-paper-edge rounded px-3 py-2',
              'font-sans text-sm text-ink-brown placeholder:text-sepia/60',
              'focus:border-ink-brown focus:outline-none transition-colors',
              'resize-y min-h-[80px]',
            )}
            placeholder="写不写都行，写了别人上手更快…"
            maxLength={2000}
            value={installHint}
            onChange={(e) => setInstallHint(e.target.value)}
          />
        </Dimension>

        <Dimension label="适合谁用 / 使用心得" hint="选填 · 最多 2000 字">
          <textarea
            className={cn(
              'w-full bg-transparent border border-paper-edge rounded px-3 py-2',
              'font-sans text-sm text-ink-brown placeholder:text-sepia/60',
              'focus:border-ink-brown focus:outline-none transition-colors',
              'resize-y min-h-[80px]',
            )}
            placeholder="适合什么人、什么场景用…"
            maxLength={2000}
            value={usageNotes}
            onChange={(e) => setUsageNotes(e.target.value)}
          />
        </Dimension>
      </CollapsibleSection>

      {/* —— 错误 + 提交 —— */}
      {err && (
        <p className="font-sans text-sm text-wax-red border-l border-wax-red pl-3">
          {err}
        </p>
      )}

      <div className="border-t border-paper-edge pt-6 flex items-center justify-between gap-3">
        <p className="font-serif italic text-xs text-sepia hidden sm:block">
          发布后大家就能看到
        </p>
        <div className="flex gap-3 ml-auto">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            取消
          </Button>
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? '正在发布…' : '发布'}
          </Button>
        </div>
      </div>
    </form>
  );
}

/* ============================================================
   工具函数
   ============================================================ */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** 富文本转纯文本（给 AI 辅助喂正文用） */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Promise 包装的 FileReader.readAsText，UTF-8 解码本地 .md/.txt 文件 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('文件读取失败'));
    };
    reader.onerror = () => reject(reader.error || new Error('文件读取失败'));
    reader.readAsText(file, 'utf-8');
  });
}

function branchLabel(b: Branch): string {
  return b === 'prompt' ? '提示词' : b === 'file' ? 'Skill 文件' : '方法论';
}

/* ============================================================
   首屏 · 分支选择卡片
   ============================================================ */
function BranchPicker({
  onPick,
  onTranscribe,
}: {
  onPick: (b: Branch) => void;
  onTranscribe: (result: {
    skill: {
      title: string;
      intro: string;
      branch: 'prompt' | 'file' | 'method';
      tagSkill: string;
      tagScene: string;
      tagIndustry?: string | null;
      tagContent: string[];
      installHint?: string | null;
    };
    attachment: { id: number; fileName: string } | null;
  }) => void;
}) {
  const [ghUrl, setGhUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importErr, setImportErr] = useState('');

  // —— 上传 SKILL.md 自动填 ——
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');

  const onImport = async () => {
    setImportErr('');
    const url = ghUrl.trim();
    if (!url) return;
    setImporting(true);
    try {
      const res = await fetch('/api/ai/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImportErr(data.error || '导入失败');
        return;
      }
      onTranscribe(data);
    } catch {
      setImportErr('网络错误，请重试');
    } finally {
      setImporting(false);
    }
  };

  /** 选本地 .md/.markdown/.txt 文件 → FileReader 读文本 → POST /api/ai/transcribe-file → 预填表单 */
  const onFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadErr('');
    const file = e.target.files?.[0];
    if (!file) return;

    // 大小校验，防上传超大文件卡住 AI 转写
    if (file.size > 1024 * 1024) {
      setUploadErr('文件过大，请控制在 1MB 以内');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const content = await readFileAsText(file);
      const res = await fetch('/api/ai/transcribe-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, fileName: file.name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadErr(data.error || '读取失败');
        return;
      }
      onTranscribe(data);
    } catch {
      setUploadErr('网络错误，请重试');
    } finally {
      setUploading(false);
      e.target.value = ''; // 清空 input 让用户能重选同一文件
    }
  };

  const busy = importing || uploading;

  const cards: {
    branch: Branch;
    title: string;
    subtitle: string;
    desc: string;
    icon: React.ReactNode;
  }[] = [
    {
      branch: 'prompt',
      title: '提示词',
      subtitle: '一段复制就能用的 AI 指令',
      desc: '写好提示词，别人粘贴到 ChatGPT / Claude 就能用',
      icon: <SkillIcon skill="prompt" className="h-5 w-5" />,
    },
    {
      branch: 'file',
      title: 'Skill 文件',
      subtitle: '模板 / 表格 / 脚本 / SKILL.md',
      desc: '现成文件，下载就能用',
      icon: <SkillIcon skill="template" className="h-5 w-5" />,
    },
    {
      branch: 'method',
      title: '方法论',
      subtitle: '完整的工作流程或工具组合方案',
      desc: '把一套方法写清楚，别人照着做',
      icon: <SkillIcon skill="workflow" className="h-5 w-5" />,
    },
  ];

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="font-serif text-2xl text-ink-brown mb-2">你想分享什么？</h2>
        <p className="font-serif italic text-sm text-sepia">
          选一个，后面只显示需要填的
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <button
            key={c.branch}
            type="button"
            onClick={() => onPick(c.branch)}
            className={cn(
              'group text-left rounded-lg border-2 p-5 transition-all',
              'border-paper-edge bg-vellum/40 hover:border-ink-brown hover:bg-parchment',
              'hover:-translate-y-0.5',
            )}
          >
            <div className="flex items-center gap-2 mb-3 text-gilded">
              <span className="grid place-content-center w-9 h-9 rounded-full bg-parchment border border-gilded/40">
                {c.icon}
              </span>
            </div>
            <p className="font-serif text-xl text-ink-brown mb-1">{c.title}</p>
            <p className="font-sans text-xs text-leather mb-2">{c.subtitle}</p>
            <p className="font-serif italic text-[11px] text-sepia">{c.desc}</p>
          </button>
        ))}
      </div>

      {/* —— 或者：从 GitHub 导入（AI 转写）—— */}
      <div className="mt-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex-1 h-px bg-paper-edge" />
          <span className="font-serif italic text-xs text-sepia">或者，AI 帮你从 GitHub 导入</span>
          <span className="flex-1 h-px bg-paper-edge" />
        </div>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <input
            type="url"
            value={ghUrl}
            onChange={(e) => setGhUrl(e.target.value)}
            placeholder="粘贴 GitHub 文件链接（SKILL.md / Prompt…）"
            className={cn(
              'flex-1 min-w-0 bg-vellum border border-paper-edge rounded px-3 h-10',
              'font-sans text-sm text-ink-brown placeholder:text-sepia/60',
              'focus:border-ink-brown focus:outline-none transition-colors',
            )}
          />
          <button
            type="button"
            onClick={onImport}
            disabled={busy || !ghUrl.trim()}
            className="inline-flex items-center gap-1.5 h-10 px-5 bg-gilded text-vellum hover:bg-ink-brown disabled:opacity-50 disabled:cursor-not-allowed font-serif text-sm rounded-sm transition-colors shrink-0"
          >
            {importing ? 'AI 转写中…' : 'AI 导入'}
          </button>
        </div>
        {importErr && (
          <p className="mt-2 font-sans text-xs text-wax-red">{importErr}</p>
        )}
        <p className="mt-2 font-serif italic text-[11px] text-sepia">
          贴一个公开的 GitHub 文件链接，AI 会抓取内容并自动填好标题、分类和介绍，你 review 后再发布
        </p>
      </div>

      {/* —— 或者：上传本地 SKILL.md / .md / .txt 文件 —— */}
      <div className="mt-4">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex-1 h-px bg-paper-edge" />
          <span className="font-serif italic text-xs text-sepia">或者，上传本地文件自动填</span>
          <span className="flex-1 h-px bg-paper-edge" />
        </div>
        <label
          className={cn(
            'flex items-center justify-center gap-1.5 h-10 px-5 rounded-sm cursor-pointer transition-colors',
            'border border-paper-edge bg-vellum text-leather hover:border-ink-brown hover:text-ink-brown',
            busy && 'opacity-50 cursor-not-allowed',
          )}
        >
          <span className="font-serif text-sm">
            {uploading ? 'AI 读取中…' : '选择 .md / .markdown / .txt 文件'}
          </span>
          <input
            type="file"
            accept=".md,.markdown,.txt"
            className="hidden"
            onChange={onFilePick}
            disabled={busy}
          />
        </label>
        {uploadErr && (
          <p className="mt-2 font-sans text-xs text-wax-red">{uploadErr}</p>
        )}
        <p className="mt-2 font-serif italic text-[11px] text-sepia">
          选一个本地 SKILL.md / .md / .txt，AI 会读内容自动填好标题、分类和介绍，你 review 后再发布
        </p>
      </div>
    </div>
  );
}

function BranchTag({ branch }: { branch: Branch }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded bg-gilded/15 border border-gilded/40 px-2 py-0.5 text-xs font-sans text-ink-brown">
      <SkillIcon
        skill={branch === 'prompt' ? 'prompt' : branch === 'file' ? 'template' : 'workflow'}
        className="h-3 w-3"
      />
      {branchLabel(branch)}
    </span>
  );
}

/* ============================================================
   Section · 章节式分组（精简版，去掉罗马数字）
   ============================================================ */
function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="font-serif text-xl text-ink-brown">{title}</h2>
        {hint && (
          <span className="font-serif italic text-xs text-sepia">· {hint}</span>
        )}
      </div>
      {children}
    </section>
  );
}

/** 可折叠区块（补充标签 / 补充说明 默认折叠） */
function CollapsibleSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="border-t border-paper-edge pt-5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-baseline gap-3 w-full text-left mb-3"
      >
        <h2 className="font-serif text-base text-leather">{title}</h2>
        {hint && (
          <span className="font-serif italic text-xs text-sepia">· {hint}</span>
        )}
        <span className="ml-auto font-serif italic text-xs text-sepia">
          {open ? '收起' : '展开'}
        </span>
      </button>
      {open && <div className="pb-2">{children}</div>}
    </section>
  );
}

function Dimension({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="flex items-baseline gap-2 mb-2">
        <span className="font-serif text-sm text-ink-brown">{label}</span>
        {hint && (
          <span className="font-sans text-[10px] text-sepia tracking-wide">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function ChipSet({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>;
}

/* —— Chip 形态 —— */
function SealChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-3 h-8 text-sm font-serif transition-colors rounded-sm',
        active
          ? 'border border-ink-brown bg-ink-brown text-vellum'
          : 'border border-paper-edge text-leather hover:border-ink-brown hover:text-ink-brown',
      )}
    >
      {children}
    </button>
  );
}
function PillChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-3 h-7 text-xs font-sans rounded-full transition-colors',
        active ? 'bg-leather text-vellum' : 'bg-linen text-leather hover:bg-paper-edge',
      )}
    >
      {children}
    </button>
  );
}
function FoldChip({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center px-2.5 h-7 text-xs font-sans transition-colors',
        active
          ? 'border border-ink-brown bg-parchment text-ink-brown'
          : 'border border-paper-edge bg-parchment text-leather hover:border-sepia',
        disabled && 'opacity-40 cursor-not-allowed',
      )}
    >
      {children}
    </button>
  );
}
