'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { useEffect, useState } from 'react'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Heading2,
  Quote,
  Undo2,
  Redo2,
  Strikethrough,
} from 'lucide-react'
import axios from 'axios'
import { toast } from 'sonner'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  disabled?: boolean
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Tulis isi pengumuman...',
  disabled,
}: RichTextEditorProps) {
  const [uploading, setUploading] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline' },
      }),
      Image.configure({
        HTMLAttributes: { class: 'rounded-lg max-w-full h-auto my-2' },
      }),
    ],
    content: value,
    immediatelyRender: false,
    editable: !disabled,
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class:
          'min-h-[180px] px-4 py-3 prose prose-sm max-w-none focus:outline-none prose-headings:font-semibold prose-a:text-primary prose-a:underline',
      },
    },
  })

  // Sync prop changes (e.g. when reset() called from form)
  useEffect(() => {
    if (!editor) return
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || '<p></p>', false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor])

  if (!editor) {
    return (
      <div className="border border-gray-300 rounded-lg p-4 text-sm text-gray-400">
        Memuat editor...
      </div>
    )
  }

  async function handleUploadImage() {
    if (!editor) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('kind', 'lampiran')
        const res = await axios.post('/api/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        editor.chain().focus().setImage({ src: res.data.url, alt: file.name }).run()
      } catch (err) {
        if (axios.isAxiosError(err)) {
          toast.error(err.response?.data?.error ?? 'Gagal mengunggah gambar')
        }
      } finally {
        setUploading(false)
      }
    }
    input.click()
  }

  function handleSetLink() {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('Masukkan URL (kosongkan untuk hapus link):', previousUrl ?? '')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const buttons: { icon: React.ReactNode; label: string; action: () => void; active?: boolean }[] = [
    {
      icon: <Bold size={14} />,
      label: 'Bold',
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive('bold'),
    },
    {
      icon: <Italic size={14} />,
      label: 'Italic',
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive('italic'),
    },
    {
      icon: <Strikethrough size={14} />,
      label: 'Strikethrough',
      action: () => editor.chain().focus().toggleStrike().run(),
      active: editor.isActive('strike'),
    },
    {
      icon: <Heading2 size={14} />,
      label: 'Heading',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editor.isActive('heading', { level: 2 }),
    },
    {
      icon: <List size={14} />,
      label: 'Bulleted list',
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive('bulletList'),
    },
    {
      icon: <ListOrdered size={14} />,
      label: 'Numbered list',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive('orderedList'),
    },
    {
      icon: <Quote size={14} />,
      label: 'Blockquote',
      action: () => editor.chain().focus().toggleBlockquote().run(),
      active: editor.isActive('blockquote'),
    },
    {
      icon: <LinkIcon size={14} />,
      label: 'Link',
      action: handleSetLink,
      active: editor.isActive('link'),
    },
    {
      icon: <ImageIcon size={14} />,
      label: uploading ? 'Mengunggah...' : 'Image',
      action: handleUploadImage,
    },
  ]

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-shadow">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-gray-200 bg-gray-50">
        {buttons.map((b) => (
          <button
            key={b.label}
            type="button"
            onClick={b.action}
            disabled={disabled || uploading}
            title={b.label}
            className={`p-1.5 rounded text-gray-600 hover:bg-white hover:text-gray-900 transition-colors disabled:opacity-50 ${
              b.active ? 'bg-white text-primary shadow-sm' : ''
            }`}
          >
            {b.icon}
          </button>
        ))}

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={disabled || !editor.can().undo()}
          title="Undo"
          className="p-1.5 rounded text-gray-600 hover:bg-white disabled:opacity-30"
        >
          <Undo2 size={14} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={disabled || !editor.can().redo()}
          title="Redo"
          className="p-1.5 rounded text-gray-600 hover:bg-white disabled:opacity-30"
        >
          <Redo2 size={14} />
        </button>
      </div>

      {/* Content */}
      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  )
}
