import Editor from '@monaco-editor/react'
import { useTheme } from '../contexts/ThemeContext'

export default function CodeEditor({ language, value, onChange }) {
  const { theme } = useTheme()

  return (
    <div className="monaco-wrap">
      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={v => onChange(v || '')}
        theme={theme === 'dark' ? 'vs-dark' : 'vs'}
        options={{
          fontSize:              14,
          fontFamily:            "'JetBrains Mono', 'Fira Code', monospace",
          fontLigatures:         true,
          minimap:               { enabled: false },
          scrollBeyondLastLine:  false,
          automaticLayout:       true,
          tabSize:               4,
          wordWrap:              'on',
          lineNumbers:           'on',
          folding:               true,
          renderLineHighlight:   'gutter',
          cursorStyle:           'line',
          smoothScrolling:       true,
          padding:               { top: 12, bottom: 12 },
        }}
      />
    </div>
  )
}
