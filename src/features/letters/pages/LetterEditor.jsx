import React, { useImperativeHandle, forwardRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Image } from '@tiptap/extension-image';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { Highlight } from '@tiptap/extension-highlight';
import { Placeholder } from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Link } from '@tiptap/extension-link';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { CharacterCount } from '@tiptap/extension-character-count';

// Custom extensions
import { FontSize, LineHeight, PageBreak, SearchAndReplace } from '@/features/letters/components/LetterExtensions';
import LetterToolbar from '@/features/letters/components/LetterToolbar';
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import '@/features/letters/styles/LetterEditor.css';

const LetterEditor = forwardRef(({ 
  content, 
  onUpdate, 
  margins = 'normal', 
  setMargins, 
  orientation = 'portrait', 
  setOrientation, 
  pageSize = 'letter',
  setPageSize,
  onOpenSignatureModal 
}, ref) => {
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        hardBreak: {
          keepMarks: true,
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph', 'tableCell', 'tableHeader'],
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({
        placeholder: 'Start typing your document...',
      }),
      TextStyle,
      Color,
      FontFamily,
      Subscript,
      Superscript,
      Link.configure({
        openOnClick: false,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      CharacterCount,
      FontSize,
      LineHeight,
      PageBreak,
      SearchAndReplace,
    ],
    content: content || '<p></p>',
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML(), editor.getJSON());
    },
  });

  useImperativeHandle(ref, () => ({
    getEditor: () => editor,
    insertContent: (content) => {
      if (editor) {
        editor.chain().focus().insertContent(content).run();
      }
    },
    toggleFindReplace: () => {
      setShowFindReplace(prev => !prev);
    }
  }));

  const countMatches = (text) => {
    if (!text || !editor) return 0;
    let count = 0;
    editor.state.doc.descendants((node) => {
      if (node.isText) {
        let index = node.text.toLowerCase().indexOf(text.toLowerCase());
        while (index !== -1) {
          count++;
          index = node.text.toLowerCase().indexOf(text.toLowerCase(), index + text.length);
        }
      }
    });
    return count;
  };

  const handleFind = (text) => {
    setFindText(text);
    if (!editor) return;
    editor.commands.setSearchTerm(text);
    const matches = countMatches(text);
    setMatchCount(matches);
    const initialIndex = matches > 0 ? 0 : -1;
    setCurrentMatchIndex(initialIndex);
    if (matches > 0) {
      editor.commands.setSearchActiveIndex(0);
      setTimeout(() => {
        const activeEl = document.querySelector('.search-result-active');
        if (activeEl) {
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 50);
    }
  };

  const navigateMatch = (direction) => {
    if (matchCount === 0 || !editor) return;
    let newIndex = currentMatchIndex;
    if (direction === 'next') {
      newIndex = (currentMatchIndex + 1) % matchCount;
    } else {
      newIndex = (currentMatchIndex - 1 + matchCount) % matchCount;
    }
    setCurrentMatchIndex(newIndex);
    editor.commands.setSearchActiveIndex(newIndex);
    setTimeout(() => {
      const activeEl = document.querySelector('.search-result-active');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 50);
  };

  const getMatchRange = (text, index) => {
    if (!text || !editor) return null;
    let matchIdx = 0;
    let range = null;
    editor.state.doc.descendants((node, pos) => {
      if (node.isText) {
        const nodeText = node.text;
        let idx = nodeText.toLowerCase().indexOf(text.toLowerCase());
        while (idx !== -1) {
          if (matchIdx === index) {
            range = {
              start: pos + idx,
              end: pos + idx + text.length,
            };
            break;
          }
          matchIdx++;
          idx = nodeText.toLowerCase().indexOf(text.toLowerCase(), idx + text.length);
        }
      }
      return !range;
    });
    return range;
  };

  const handleReplace = () => {
    if (!findText || !editor || currentMatchIndex < 0) return;
    const range = getMatchRange(findText, currentMatchIndex);
    if (range) {
      editor.chain().focus().insertContentAt({ from: range.start, to: range.end }, replaceText).run();
      setTimeout(() => {
        if (editor) {
          editor.commands.setSearchTerm(findText);
          const matches = countMatches(findText);
          setMatchCount(matches);
          if (matches > 0) {
            const nextIndex = Math.min(currentMatchIndex, matches - 1);
            setCurrentMatchIndex(nextIndex);
            editor.commands.setSearchActiveIndex(nextIndex);
            const activeEl = document.querySelector('.search-result-active');
            if (activeEl) {
              activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          } else {
            setCurrentMatchIndex(-1);
          }
        }
      }, 20);
    }
  };

  const handleReplaceAll = () => {
    if (!findText || !editor) return;
    const html = editor.getHTML();
    const regex = new RegExp(findText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
    const newHtml = html.replace(regex, replaceText);
    editor.commands.setContent(newHtml);
    editor.commands.setSearchTerm('');
    setFindText('');
    setMatchCount(0);
    setCurrentMatchIndex(-1);
  };

  if (!editor) return null;

  return (
    <div className={`letter-editor-wrapper margin-${margins} orientation-${orientation} size-${pageSize}`}>
      <LetterToolbar 
        editor={editor} 
        margins={margins}
        setMargins={setMargins}
        orientation={orientation}
        setOrientation={setOrientation}
        pageSize={pageSize}
        setPageSize={setPageSize}
        onOpenSignatureModal={onOpenSignatureModal}
        onOpenFindReplace={() => setShowFindReplace(!showFindReplace)}
      />

      {showFindReplace && (
        <div className="find-replace-panel">
          <div className="find-replace-fields">
            <div className="field-group find-input-group">
              <Search size={14} className="field-icon" />
              <input 
                type="text" 
                placeholder="Find text..." 
                value={findText}
                onChange={(e) => handleFind(e.target.value)}
              />
              {findText && (
                <div className="match-controls">
                  <span className="match-indicator">
                    {matchCount > 0 ? `${currentMatchIndex + 1}/${matchCount}` : '0/0'}
                  </span>
                  <button 
                    className="match-nav-btn" 
                    onClick={() => navigateMatch('prev')}
                    disabled={matchCount === 0}
                    title="Previous match"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button 
                    className="match-nav-btn" 
                    onClick={() => navigateMatch('next')}
                    disabled={matchCount === 0}
                    title="Next match"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="field-group">
              <input 
                type="text" 
                placeholder="Replace with..." 
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
              />
            </div>
          </div>
          <div className="find-replace-actions">
            <button className="btn-action" onClick={handleReplace} disabled={matchCount === 0}>Replace</button>
            <button className="btn-action primary" onClick={handleReplaceAll} disabled={matchCount === 0}>Replace All</button>
            <button className="btn-close" onClick={() => {
              if (editor) editor.commands.setSearchTerm('');
              setFindText('');
              setMatchCount(0);
              setCurrentMatchIndex(-1);
              setShowFindReplace(false);
            }}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="letter-editor-content">
        <EditorContent editor={editor} />
      </div>
      
      <div className="letter-editor-footer">
        <div className="editor-status">
          <span className="status-item">Ready</span>
          <span className="status-item">English (US)</span>
          <span className="status-item">Margins: {margins.toUpperCase()}</span>
          <span className="status-item">Orientation: {orientation.toUpperCase()}</span>
        </div>
        <div className="char-count">
          {editor.storage.characterCount.words()} words • {editor.storage.characterCount.characters()} characters
        </div>
      </div>
    </div>
  );
});

export default LetterEditor;
