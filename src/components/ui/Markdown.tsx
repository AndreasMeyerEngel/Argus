import React, { useMemo } from 'react'
import { marked } from 'marked'

// Configure: no wrapping <p> for single-line, open links in new tab
marked.setOptions({ breaks: true })

const renderer = new marked.Renderer()
renderer.link = ({ href, text }) =>
  `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-accent underline hover:text-accent/80">${text}</a>`

interface MarkdownProps {
  content: string
  className?: string
}

export function Markdown({ content, className = '' }: MarkdownProps) {
  const html = useMemo(() => {
    if (!content) return ''
    return marked(content, { renderer }) as string
  }, [content])

  return (
    <div
      className={`prose-pxqa ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
