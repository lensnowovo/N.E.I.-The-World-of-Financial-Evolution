'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';
import { cn } from '@/lib/cn';

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
};

/**
 * RichEditor · Tiptap 富文本编辑器
 * 工具栏走衬线小字 + 细线分隔，按钮极简
 * 编辑区使用 prose-manuscript 排版，保持发布预览一致
 */
export function RichEditor({
  value,
  onChange,
  placeholder = '此处书写正文…',
  minHeight = '320px',
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        bulletList: { HTMLAttributes: { class: 'list-disc' } },
        orderedList: { HTMLAttributes: { class: 'list-decimal' } },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          'is-editor-empty before:content-[attr(data-placeholder)] before:text-sepia/70 before:italic before:pointer-events-none before:absolute',
      }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose-manuscript outline-none px-5 py-4',
          'min-h-[var(--editor-min-h)]',
        ),
        style: `--editor-min-h: ${minHeight}`,
      },
    },
  });

  // 外部 value 变更时同步（如重置表单）
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) editor.commands.setContent(value, { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) return null;

  const promptLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = prompt('请输入链接 URL', prev ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  return (
    <div className="border border-paper-edge bg-vellum rounded-md overflow-hidden">
      {/* —— 工具栏 —— */}
      <div className="flex flex-wrap items-center gap-0.5 px-2.5 py-2 border-b border-paper-edge bg-linen/40">
        <ToolBtn
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="加粗"
        >
          <strong className="font-serif">B</strong>
        </ToolBtn>
        <ToolBtn
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="斜体"
        >
          <em className="font-serif">I</em>
        </ToolBtn>
        <ToolBtn
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="删除线"
        >
          <span className="font-serif line-through">S</span>
        </ToolBtn>
        <Divider />
        <ToolBtn
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="二级标题"
        >
          <span className="font-serif text-base">H2</span>
        </ToolBtn>
        <ToolBtn
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="三级标题"
        >
          <span className="font-serif text-sm">H3</span>
        </ToolBtn>
        <ToolBtn
          active={editor.isActive('paragraph')}
          onClick={() => editor.chain().focus().setParagraph().run()}
          title="正文"
        >
          <span className="font-serif">¶</span>
        </ToolBtn>
        <Divider />
        <ToolBtn
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="引文"
        >
          <QuoteIcon />
        </ToolBtn>
        <ToolBtn
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="无序列表"
        >
          <ListBulletIcon />
        </ToolBtn>
        <ToolBtn
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="有序列表"
        >
          <ListNumberIcon />
        </ToolBtn>
        <ToolBtn
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="代码块"
        >
          <CodeIcon />
        </ToolBtn>
        <Divider />
        <ToolBtn
          active={editor.isActive('link')}
          onClick={promptLink}
          title="插入链接"
        >
          <LinkIcon />
        </ToolBtn>
        <ToolBtn
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="分隔线"
        >
          <HrIcon />
        </ToolBtn>
        <div className="ml-auto flex items-center gap-1">
          <ToolBtn
            onClick={() => editor.chain().focus().undo().run()}
            title="撤销"
            disabled={!editor.can().undo()}
          >
            <UndoIcon />
          </ToolBtn>
          <ToolBtn
            onClick={() => editor.chain().focus().redo().run()}
            title="重做"
            disabled={!editor.can().redo()}
          >
            <RedoIcon />
          </ToolBtn>
        </div>
      </div>

      {/* —— 编辑区 —— */}
      <div className="relative">
        <EditorContent editor={editor} />
      </div>

      <style jsx global>{`
        .ProseMirror {
          min-height: 320px;
          outline: none !important;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: rgba(139, 111, 78, 0.6);
          font-style: italic;
          float: left;
          height: 0;
          pointer-events: none;
        }
        .ProseMirror a {
          color: var(--ink-brown);
          border-bottom: 1px solid var(--paper-edge);
        }
      `}</style>
    </div>
  );
}

function ToolBtn({
  active,
  onClick,
  title,
  disabled,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'h-7 min-w-[28px] px-2 inline-flex items-center justify-center text-sm rounded-sm',
        'transition-colors duration-100',
        active
          ? 'bg-ink-brown text-vellum'
          : 'text-leather hover:bg-parchment hover:text-ink-brown',
        disabled && 'opacity-40 cursor-not-allowed',
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-4 w-px bg-paper-edge" />;
}

/* —— 工具栏图标 —— */
function QuoteIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M3 4 H5 V8 C5 9.5, 4 10.5, 3 10.5" />
      <path d="M8 4 H10 V8 C10 9.5, 9 10.5, 8 10.5" />
    </svg>
  );
}
function ListBulletIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
      <circle cx="3" cy="4" r="0.8" fill="currentColor" />
      <circle cx="3" cy="8" r="0.8" fill="currentColor" />
      <circle cx="3" cy="12" r="0.8" fill="currentColor" />
      <path d="M6 4 H14" />
      <path d="M6 8 H14" />
      <path d="M6 12 H14" />
    </svg>
  );
}
function ListNumberIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
      <text x="1" y="6" fontSize="5" fill="currentColor" stroke="none" fontFamily="Cormorant Garamond">1</text>
      <text x="1" y="11" fontSize="5" fill="currentColor" stroke="none" fontFamily="Cormorant Garamond">2</text>
      <path d="M6 4 H14" />
      <path d="M6 8 H14" />
      <path d="M6 12 H14" />
    </svg>
  );
}
function CodeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 5 L2 8 L5 11" />
      <path d="M11 5 L14 8 L11 11" />
    </svg>
  );
}
function LinkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <path d="M7 9 C5.5 7.5, 5.5 5, 7 3.5 L8.5 2 C10 0.5, 12.5 0.5, 14 2 C15.5 3.5, 15.5 6, 14 7.5 L13 8.5" />
      <path d="M9 7 C10.5 8.5, 10.5 11, 9 12.5 L7.5 14 C6 15.5, 3.5 15.5, 2 14 C0.5 12.5, 0.5 10, 2 8.5 L3 7.5" />
    </svg>
  );
}
function HrIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
      <path d="M2 8 H14" />
    </svg>
  );
}
function UndoIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8 H10 C12 8, 13 9, 13 11 C13 13, 12 14, 10 14" />
      <path d="M6 5 L3 8 L6 11" />
    </svg>
  );
}
function RedoIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8 H6 C4 8, 3 9, 3 11 C3 13, 4 14, 6 14" />
      <path d="M10 5 L13 8 L10 11" />
    </svg>
  );
}
