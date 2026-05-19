import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import pptxgen from 'pptxgenjs';
import {
  ChevronLeft, Plus, Trash2, Download, Play, Save, Type, Image,
  Square, Circle, AlignLeft, AlignCenter, AlignRight, Bold, Italic,
  Underline, ChevronUp, ChevronDown, Copy, Palette, Layout, Monitor
} from 'lucide-react';
import { addItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import './PresentationEditor.css';

const THEMES = {
  modern: { bg: '#0f172a', text: '#f8fafc', accent: '#6366f1', secondary: '#1e293b' },
  ocean:  { bg: '#0c4a6e', text: '#f0f9ff', accent: '#38bdf8', secondary: '#075985' },
  forest: { bg: '#14532d', text: '#f0fdf4', accent: '#4ade80', secondary: '#166534' },
  sunset: { bg: '#7c2d12', text: '#fff7ed', accent: '#fb923c', secondary: '#9a3412' },
  minimal:{ bg: '#ffffff', text: '#0f172a', accent: '#6366f1', secondary: '#f8fafc' },
  royal:  { bg: '#1e1b4b', text: '#eef2ff', accent: '#a5b4fc', secondary: '#312e81' },
};

const LAYOUTS = {
  title:   { name: 'Title Slide',   icon: '▬' },
  content: { name: 'Title & Content', icon: '▤' },
  blank:   { name: 'Blank',         icon: '□' },
  twoCol:  { name: 'Two Columns',   icon: '▥' },
  image:   { name: 'Image Focus',   icon: '▨' },
};

const makeSlide = (layout = 'title', theme = 'modern') => ({
  id: Date.now() + Math.random(),
  layout,
  theme,
  title: layout === 'title' ? 'Click to add title' : 'Slide Title',
  subtitle: layout === 'title' ? 'Click to add subtitle' : '',
  content: layout !== 'title' ? '• Add your content here\n• Second point\n• Third point' : '',
  contentRight: '',
  notes: '',
  bgColor: '',
  titleSize: 48,
  contentSize: 24,
  titleAlign: 'center',
  contentAlign: 'left',
  titleBold: true,
  contentBold: false,
  titleItalic: false,
  contentItalic: false,

  // Motion defaults
  transition: 'fade',
  transitionDuration: 800,
  scrollLinked: false,
  titleAnimation: 'none',
  subtitleAnimation: 'none',
  contentAnimation: 'none',
  hoverResponse: 'none',
  physicsCurve: 'ease',
});

const MagneticWrapper = ({ children, active }) => {
  const ref = useRef(null);

  const handleMouseMove = (e) => {
    if (!active || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    ref.current.style.transform = `translate(${x * 0.25}px, ${y * 0.25}px) scale(1.02)`;
    ref.current.style.transition = 'transform 0.1s ease-out';
  };

  const handleMouseLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform = '';
    ref.current.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  };

  return (
    <div 
      ref={ref} 
      onMouseMove={handleMouseMove} 
      onMouseLeave={handleMouseLeave}
      style={{ display: 'inline-block', width: '100%' }}
    >
      {children}
    </div>
  );
};

const renderAnimatedText = (text, animationType, physicsCurve, hoverResponse) => {
  if (!text) return '';
  
  const timingClass = physicsCurve ? `physics-${physicsCurve}` : '';
  const magnetic = hoverResponse === 'magnetic';

  let contentElement;
  if (animationType === 'staggered') {
    contentElement = (
      <span className="staggered-container">
        {text.split('').map((char, index) => (
          <span 
            key={index} 
            className={`staggered-char anim-char-reveal ${timingClass}`} 
            style={{ 
              animationDelay: `${index * 0.02}s`,
              display: char === ' ' ? 'inline' : 'inline-block',
              whiteSpace: char === ' ' ? 'pre' : 'normal'
            }}
          >
            {char}
          </span>
        ))}
      </span>
    );
  } else {
    const animationClass = animationType && animationType !== 'none' ? `anim-${animationType} ${timingClass}` : '';
    contentElement = (
      <span className={animationClass}>
        {text}
      </span>
    );
  }

  return (
    <MagneticWrapper active={magnetic}>
      {contentElement}
    </MagneticWrapper>
  );
};

const renderBulletContent = (content, slide) => {
  if (!content) return null;
  const lines = content.split('\n');
  return (
    <ul style={{ margin: 0, paddingLeft: '20px', listStyleType: 'disc', textAlign: slide.contentAlign || 'left' }}>
      {lines.map((line, idx) => (
        <li key={idx} style={{ marginBottom: '8px' }}>
          {renderAnimatedText(line, slide.contentAnimation || 'none', slide.physicsCurve || 'ease', slide.hoverResponse || 'none')}
        </li>
      ))}
    </ul>
  );
};

const SlideCanvas = ({ slide, theme, isEditing, onUpdate, scale = 1 }) => {
  const t = THEMES[theme] || THEMES.modern;
  const bg = slide.bgColor || t.bg;

  const style = {
    background: bg,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: slide.layout === 'title' ? 'center' : 'flex-start',
    alignItems: slide.layout === 'title' ? 'center' : 'stretch',
    padding: slide.layout === 'title' ? '40px' : '32px',
    boxSizing: 'border-box',
    fontFamily: "'Inter', sans-serif",
    position: 'relative',
    gap: '16px',
    borderRadius: '8px',
    overflow: 'hidden',
  };

  const accentBar = {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: '5px', background: t.accent,
  };

  const editStyle = isEditing ? {
    border: '2px solid transparent',
    outline: 'none',
    transition: 'border-color 0.2s',
  } : {};

  const titleStyle = {
    color: t.text,
    fontSize: `${(slide.titleSize || 48) * scale}px`,
    fontWeight: slide.titleBold ? 700 : 400,
    fontStyle: slide.titleItalic ? 'italic' : 'normal',
    textAlign: slide.titleAlign || 'center',
    lineHeight: 1.2,
    background: 'transparent',
    resize: 'none',
    width: '100%',
    border: 'none',
    ...editStyle,
  };

  const contentStyle = {
    color: `${t.text}cc`,
    fontSize: `${(slide.contentSize || 22) * scale}px`,
    fontWeight: slide.contentBold ? 700 : 400,
    fontStyle: slide.contentItalic ? 'italic' : 'normal',
    textAlign: slide.contentAlign || 'left',
    lineHeight: 1.6,
    flex: 1,
    background: 'transparent',
    resize: 'none',
    width: '100%',
    border: 'none',
    ...editStyle,
  };

  const subtitleStyle = {
    color: `${t.accent}`,
    fontSize: `${(slide.contentSize || 22) * scale}px`,
    textAlign: slide.titleAlign || 'center',
    background: 'transparent',
    resize: 'none',
    width: '80%',
    border: 'none',
    ...editStyle,
  };

  if (slide.layout === 'title') return (
    <div style={style}>
      <div style={accentBar} />
      {isEditing ? (
        <textarea style={titleStyle} value={slide.title} onChange={e => onUpdate('title', e.target.value)} rows={2} />
      ) : (
        <h1 style={{ ...titleStyle, margin: 0, padding: 0 }}>
          {renderAnimatedText(slide.title, slide.titleAnimation || 'none', slide.physicsCurve || 'ease', slide.hoverResponse || 'none')}
        </h1>
      )}
      {isEditing ? (
        <textarea style={subtitleStyle} value={slide.subtitle} onChange={e => onUpdate('subtitle', e.target.value)} rows={2} />
      ) : (
        <p style={{ ...subtitleStyle, margin: 0, padding: 0 }}>
          {renderAnimatedText(slide.subtitle, slide.subtitleAnimation || 'none', slide.physicsCurve || 'ease', slide.hoverResponse || 'none')}
        </p>
      )}
    </div>
  );

  if (slide.layout === 'twoCol') return (
    <div style={style}>
      <div style={accentBar} />
      {isEditing ? (
        <textarea style={{ ...titleStyle, fontSize: `${32 * scale}px` }} value={slide.title}
          onChange={e => onUpdate('title', e.target.value)} rows={1} />
      ) : (
        <h2 style={{ ...titleStyle, fontSize: `${32 * scale}px`, margin: 0, padding: 0 }}>
          {renderAnimatedText(slide.title, slide.titleAnimation || 'none', slide.physicsCurve || 'ease', slide.hoverResponse || 'none')}
        </h2>
      )}
      <div style={{ display: 'flex', gap: '24px', flex: 1 }}>
        {isEditing ? (
          <textarea style={{ ...contentStyle, width: '50%' }} value={slide.content}
            onChange={e => onUpdate('content', e.target.value)} />
        ) : (
          <div style={{ ...contentStyle, width: '50%' }}>
            {renderBulletContent(slide.content, slide)}
          </div>
        )}
        <div style={{ width: '1px', background: `${t.accent}44` }} />
        {isEditing ? (
          <textarea style={{ ...contentStyle, width: '50%' }} value={slide.contentRight || '• Right column\n• Second point'}
            onChange={e => onUpdate('contentRight', e.target.value)} />
        ) : (
          <div style={{ ...contentStyle, width: '50%' }}>
            {renderBulletContent(slide.contentRight || '• Right column\n• Second point', slide)}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={style}>
      <div style={accentBar} />
      {slide.layout !== 'blank' && (
        isEditing ? (
          <textarea style={{ ...titleStyle, fontSize: `${36 * scale}px`, textAlign: 'left',
            borderBottom: `2px solid ${t.accent}44`, paddingBottom: '8px' }}
            value={slide.title} onChange={e => onUpdate('title', e.target.value)} rows={1} />
        ) : (
          <h2 style={{ ...titleStyle, fontSize: `${36 * scale}px`, textAlign: 'left',
            borderBottom: `2px solid ${t.accent}44`, paddingBottom: '8px', margin: 0 }}>
            {renderAnimatedText(slide.title, slide.titleAnimation || 'none', slide.physicsCurve || 'ease', slide.hoverResponse || 'none')}
          </h2>
        )
      )}
      {slide.layout !== 'blank' && (
        isEditing ? (
          <textarea style={contentStyle} value={slide.content}
            onChange={e => onUpdate('content', e.target.value)} />
        ) : (
          <div style={contentStyle}>
            {renderBulletContent(slide.content, slide)}
          </div>
        )
      )}
      {slide.layout === 'blank' && (
        isEditing ? (
          <textarea style={{ ...contentStyle, textAlign: 'center', fontSize: `${28 * scale}px` }}
            value={slide.content || 'Free canvas — type anything'}
            onChange={e => onUpdate('content', e.target.value)} />
        ) : (
          <div style={{ ...contentStyle, textAlign: 'center', fontSize: `${28 * scale}px` }}>
            {renderAnimatedText(slide.content || 'Free canvas — type anything', slide.contentAnimation || 'none', slide.physicsCurve || 'ease', slide.hoverResponse || 'none')}
          </div>
        )
      )}
    </div>
  );
};

export default function PresentationEditor() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState('Untitled Presentation');
  const [slides, setSlides] = useState([makeSlide('title', 'modern')]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [theme, setTheme] = useState('modern');
  const [isSaving, setIsSaving] = useState(false);
  const [isPresenting, setIsPresenting] = useState(false);
  const [presentIdx, setPresentIdx] = useState(0);
  const [prevPresentIdx, setPrevPresentIdx] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const [rightTab, setRightTab] = useState('design');
  const containerRef = useRef(null);

  const navigateSlide = useCallback((direction) => {
    if (isTransitioning) return;
    let nextIdx = presentIdx;
    if (direction === 'next') nextIdx = Math.min(presentIdx + 1, slides.length - 1);
    else if (direction === 'prev') nextIdx = Math.max(presentIdx - 1, 0);

    if (nextIdx === presentIdx) return;

    setPrevPresentIdx(presentIdx);
    setPresentIdx(nextIdx);
    setIsTransitioning(true);

    const activeSlide = slides[nextIdx];
    const duration = activeSlide.transitionDuration || 800;

    setTimeout(() => {
      setIsTransitioning(false);
      setPrevPresentIdx(null);
    }, duration);
  }, [presentIdx, slides, isTransitioning]);

  const activeSlide = slides[activeIdx];

  const updateSlide = (key, value) => {
    setSlides(prev => prev.map((s, i) => i === activeIdx ? { ...s, [key]: value } : s));
  };

  const addSlide = (layout = 'content') => {
    const newSlide = makeSlide(layout, theme);
    const updated = [...slides.slice(0, activeIdx + 1), newSlide, ...slides.slice(activeIdx + 1)];
    setSlides(updated);
    setActiveIdx(activeIdx + 1);
  };

  const deleteSlide = () => {
    if (slides.length === 1) return;
    const updated = slides.filter((_, i) => i !== activeIdx);
    setSlides(updated);
    setActiveIdx(Math.max(0, activeIdx - 1));
  };

  const duplicateSlide = () => {
    const copy = { ...activeSlide, id: Date.now() };
    const updated = [...slides.slice(0, activeIdx + 1), copy, ...slides.slice(activeIdx + 1)];
    setSlides(updated);
    setActiveIdx(activeIdx + 1);
  };

  const moveSlide = (dir) => {
    const newIdx = activeIdx + dir;
    if (newIdx < 0 || newIdx >= slides.length) return;
    const updated = [...slides];
    [updated[activeIdx], updated[newIdx]] = [updated[newIdx], updated[activeIdx]];
    setSlides(updated);
    setActiveIdx(newIdx);
  };

  const applyTheme = (newTheme) => {
    setTheme(newTheme);
    setSlides(prev => prev.map(s => ({ ...s, theme: newTheme, bgColor: '' })));
  };

  const exportPptx = async () => {
    const pres = new pptxgen();
    pres.layout = 'LAYOUT_WIDE';
    slides.forEach(slide => {
      const t = THEMES[slide.theme] || THEMES.modern;
      const s = pres.addSlide();
      s.background = { color: (slide.bgColor || t.bg).replace('#', '') };
      if (slide.title) {
        s.addText(slide.title, {
          x: 0.5, y: slide.layout === 'title' ? 2.5 : 0.3,
          w: '90%', h: 1.2,
          fontSize: slide.layout === 'title' ? 40 : 28,
          bold: slide.titleBold,
          color: t.text.replace('#', ''),
          align: slide.titleAlign || 'center',
        });
      }
      if (slide.content || slide.subtitle) {
        s.addText(slide.content || slide.subtitle, {
          x: 0.5, y: slide.layout === 'title' ? 4 : 1.8,
          w: '90%', h: 3.5,
          fontSize: slide.layout === 'title' ? 20 : 18,
          color: t.accent.replace('#', ''),
          align: slide.contentAlign || 'left',
        });
      }
    });
    await pres.writeFile({ fileName: `${title}.pptx` });
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      await addItem('documents', {
        docType: 'Presentation', title,
        slides: JSON.stringify(slides), theme,
        createdAt: new Date().toISOString()
      }, user.id);
      alert('Presentation saved!');
    } catch (e) { alert('Save failed.'); }
    finally { setIsSaving(false); }
  };

  useEffect(() => {
    if (!isPresenting) return;
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        navigateSlide('next');
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        navigateSlide('prev');
      }
      if (e.key === 'Escape') setIsPresenting(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isPresenting, navigateSlide]);

  useEffect(() => {
    if (!isPresenting) return;
    const currentSlide = slides[presentIdx];
    if (!currentSlide?.scrollLinked) return;

    let deltaAccumulator = 0;
    const scrollThreshold = 150;
    let resetTimeout;

    const handleWheel = (e) => {
      e.preventDefault();
      clearTimeout(resetTimeout);
      deltaAccumulator += e.deltaY;
      
      const progress = Math.min(Math.max(deltaAccumulator / scrollThreshold, -1), 1);
      
      if (progress > 0 && presentIdx < slides.length - 1) {
        setPrevPresentIdx(presentIdx);
        setTransitionProgress(progress);
        setIsTransitioning(true);
      } else if (progress < 0 && presentIdx > 0) {
        setPrevPresentIdx(presentIdx);
        setTransitionProgress(Math.abs(progress));
        setIsTransitioning(true);
      }

      if (deltaAccumulator >= scrollThreshold) {
        if (presentIdx < slides.length - 1) {
          setPresentIdx(idx => idx + 1);
        }
        deltaAccumulator = 0;
        setTransitionProgress(0);
        setIsTransitioning(false);
        setPrevPresentIdx(null);
      } else if (deltaAccumulator <= -scrollThreshold) {
        if (presentIdx > 0) {
          setPresentIdx(idx => idx - 1);
        }
        deltaAccumulator = 0;
        setTransitionProgress(0);
        setIsTransitioning(false);
        setPrevPresentIdx(null);
      } else {
        resetTimeout = setTimeout(() => {
          let currentProg = Math.abs(progress);
          const interval = setInterval(() => {
            currentProg -= 0.1;
            if (currentProg <= 0) {
              clearInterval(interval);
              setTransitionProgress(0);
              setIsTransitioning(false);
              setPrevPresentIdx(null);
              deltaAccumulator = 0;
            } else {
              setTransitionProgress(currentProg);
            }
          }, 20);
        }, 150);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [isPresenting, presentIdx, slides, isTransitioning]);

  const t = THEMES[theme] || THEMES.modern;

  if (isPresenting) {
    const incomingSlide = slides[presentIdx];
    const outgoingSlide = prevPresentIdx !== null ? slides[prevPresentIdx] : null;
    const activeTransition = incomingSlide.transition || 'none';
    const transitionDuration = incomingSlide.transitionDuration || 800;

    return (
      <div 
        className="present-fullscreen" 
        style={{ background: '#000000' }}
        onClick={() => navigateSlide('next')}
      >
        <div className="present-slide">
          <div 
            className={`present-viewport transition-${activeTransition} ${isTransitioning ? 'is-transitioning' : ''}`}
            style={{ 
              '--transition-duration': `${transitionDuration}ms`,
              '--transition-progress': `${transitionProgress}`
            }}
          >
            {outgoingSlide && (
              <div className="slide-wrapper outgoing">
                <SlideCanvas slide={outgoingSlide} theme={outgoingSlide.theme || theme} isEditing={false} onUpdate={() => {}} scale={0.85} />
              </div>
            )}
            <div className="slide-wrapper incoming" key={presentIdx}>
              <SlideCanvas slide={incomingSlide} theme={incomingSlide.theme || theme} isEditing={false} onUpdate={() => {}} scale={0.85} />
            </div>
          </div>
        </div>
        <div className="present-controls" onClick={e => e.stopPropagation()}>
          <button onClick={() => navigateSlide('prev')}>◀</button>
          <span>{presentIdx + 1} / {slides.length}</span>
          <button onClick={() => navigateSlide('next')}>▶</button>
          <button onClick={() => setIsPresenting(false)}>✕ Exit</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pres-container" ref={containerRef}>
      {/* Header */}
      <div className="pres-header">
        <div className="pres-header-left">
          <button className="pres-back-btn" onClick={() => navigate('/')}><ChevronLeft size={18} /> Back</button>
          <div className="pres-title-wrap">
            <Monitor size={18} style={{ color: '#a855f7' }} />
            <input className="pres-title-input" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
        </div>
        <div className="pres-header-right">
          <span className="pres-slide-count">{slides.length} slides</span>
          <button className="pres-btn" onClick={exportPptx}><Download size={16} /> Export .pptx</button>
          <button className="pres-btn" onClick={handleSave} disabled={isSaving}><Save size={16} /> {isSaving ? 'Saving…' : 'Save'}</button>
          <button className="pres-btn primary" onClick={() => { setIsPresenting(true); setPresentIdx(0); }}><Play size={16} /> Present</button>
        </div>
      </div>

      <div className="pres-body">
        {/* Slide Panel */}
        <div className="pres-slide-panel">
          <div className="pres-panel-header">
            <span>Slides</span>
            <div className="pres-add-menu">
              {Object.entries(LAYOUTS).map(([key, val]) => (
                <button key={key} className="pres-layout-btn" onClick={() => addSlide(key)} title={val.name}>
                  {val.icon} {val.name}
                </button>
              ))}
            </div>
          </div>
          <div className="pres-thumbnails">
            {slides.map((slide, i) => {
              const st = THEMES[slide.theme] || THEMES.modern;
              return (
                <div key={slide.id} className={`pres-thumb ${i === activeIdx ? 'active' : ''}`}
                  onClick={() => setActiveIdx(i)}>
                  <div className="pres-thumb-num">{i + 1}</div>
                  <div className="pres-thumb-preview" style={{ background: slide.bgColor || st.bg }}>
                    <div style={{ color: st.text, fontSize: '6px', padding: '4px', lineHeight: 1.3 }}>
                      <div style={{ fontWeight: 700, borderBottom: `1px solid ${st.accent}`, marginBottom: '2px' }}>
                        {slide.title?.slice(0, 25)}
                      </div>
                      <div style={{ color: `${st.text}99`, fontSize: '5px' }}>{(slide.content || slide.subtitle)?.slice(0, 40)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Canvas */}
        <div className="pres-canvas-area">
          <div className="pres-toolbar">
            <div className="pres-toolbar-group">
              <button className="tool-btn" onClick={duplicateSlide} title="Duplicate"><Copy size={15} /></button>
              <button className="tool-btn danger" onClick={deleteSlide} title="Delete" disabled={slides.length === 1}><Trash2 size={15} /></button>
              <button className="tool-btn" onClick={() => moveSlide(-1)} title="Move Up"><ChevronUp size={15} /></button>
              <button className="tool-btn" onClick={() => moveSlide(1)} title="Move Down"><ChevronDown size={15} /></button>
            </div>
            <div className="pres-toolbar-sep" />
            <div className="pres-toolbar-group">
              <button className={`tool-btn ${activeSlide?.titleBold ? 'active' : ''}`} onClick={() => updateSlide('titleBold', !activeSlide?.titleBold)}><Bold size={15} /></button>
              <button className={`tool-btn ${activeSlide?.titleItalic ? 'active' : ''}`} onClick={() => updateSlide('titleItalic', !activeSlide?.titleItalic)}><Italic size={15} /></button>
            </div>
            <div className="pres-toolbar-sep" />
            <div className="pres-toolbar-group">
              {['left', 'center', 'right'].map(a => (
                <button key={a} className={`tool-btn ${activeSlide?.titleAlign === a ? 'active' : ''}`}
                  onClick={() => updateSlide('titleAlign', a)}>
                  {a === 'left' ? <AlignLeft size={15} /> : a === 'center' ? <AlignCenter size={15} /> : <AlignRight size={15} />}
                </button>
              ))}
            </div>
            <div className="pres-toolbar-sep" />
            <div className="pres-toolbar-group">
              <label style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Type size={13} />
                <input type="range" min={20} max={80} value={activeSlide?.titleSize || 48}
                  onChange={e => updateSlide('titleSize', +e.target.value)}
                  style={{ width: '70px' }} />
                <span style={{ color: '#e2e8f0', minWidth: '28px' }}>{activeSlide?.titleSize || 48}px</span>
              </label>
            </div>
          </div>

          <div className="pres-canvas-wrap">
            <div className="pres-slide-frame">
              {activeSlide && (
                <SlideCanvas
                  slide={activeSlide}
                  theme={activeSlide.theme || theme}
                  isEditing={true}
                  onUpdate={updateSlide}
                  scale={0.55}
                />
              )}
            </div>
          </div>
          <div className="pres-notes-area">
            <Type size={13} style={{ color: '#64748b' }} />
            <textarea placeholder="Speaker notes..." value={activeSlide?.notes || ''}
              onChange={e => updateSlide('notes', e.target.value)} />
          </div>
        </div>

        {/* Right Panel */}
        <div className="pres-right-panel">
          <div className="pres-right-tabs">
            <button className={rightTab === 'design' ? 'active' : ''} onClick={() => setRightTab('design')}>
              <Palette size={14} /> Design
            </button>
            <button className={rightTab === 'layout' ? 'active' : ''} onClick={() => setRightTab('layout')}>
              <Layout size={14} /> Layout
            </button>
            <button className={rightTab === 'motion' ? 'active' : ''} onClick={() => setRightTab('motion')}>
              <Play size={14} /> Motion
            </button>
          </div>

          {rightTab === 'design' && (
            <div className="pres-right-content">
              <div className="pres-section-label">Themes</div>
              <div className="pres-theme-grid">
                {Object.entries(THEMES).map(([key, val]) => (
                  <button key={key} className={`pres-theme-swatch ${theme === key ? 'active' : ''}`}
                    style={{ background: val.bg, border: `2px solid ${theme === key ? val.accent : 'transparent'}` }}
                    onClick={() => applyTheme(key)} title={key}>
                    <div style={{ background: val.accent, height: '4px', borderRadius: '2px', margin: '6px 6px 2px' }} />
                    <div style={{ color: val.text, fontSize: '9px', padding: '0 6px 4px', textTransform: 'capitalize' }}>{key}</div>
                  </button>
                ))}
              </div>
              <div className="pres-section-label" style={{ marginTop: '16px' }}>Slide Background</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '0 4px' }}>
                <input type="color" value={activeSlide?.bgColor || THEMES[activeSlide?.theme || theme]?.bg}
                  onChange={e => updateSlide('bgColor', e.target.value)}
                  style={{ width: '36px', height: '36px', borderRadius: '6px', border: '1px solid #334155', cursor: 'pointer' }} />
                <button style={{ fontSize: '12px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}
                  onClick={() => updateSlide('bgColor', '')}>Reset to theme</button>
              </div>
              <div className="pres-section-label" style={{ marginTop: '16px' }}>Content Font Size</div>
              <div style={{ padding: '0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="range" min={12} max={48} value={activeSlide?.contentSize || 22}
                  onChange={e => updateSlide('contentSize', +e.target.value)} style={{ flex: 1 }} />
                <span style={{ color: '#e2e8f0', fontSize: '12px', minWidth: '32px' }}>{activeSlide?.contentSize || 22}px</span>
              </div>
            </div>
          )}

          {rightTab === 'layout' && (
            <div className="pres-right-content">
              <div className="pres-section-label">Change Layout</div>
              {Object.entries(LAYOUTS).map(([key, val]) => (
                <button key={key}
                  className={`pres-layout-item ${activeSlide?.layout === key ? 'active' : ''}`}
                  onClick={() => updateSlide('layout', key)}>
                  <span className="pres-layout-icon">{val.icon}</span>
                  <span>{val.name}</span>
                </button>
              ))}
              <div className="pres-section-label" style={{ marginTop: '16px' }}>Quick Add Slide</div>
              {Object.entries(LAYOUTS).map(([key, val]) => (
                <button key={key} className="pres-layout-item" onClick={() => addSlide(key)}>
                  <Plus size={13} style={{ color: '#6366f1' }} />
                  <span>{val.name}</span>
                </button>
              ))}
            </div>
          )}

          {rightTab === 'motion' && (
            <div className="pres-right-content">
              <div className="pres-section-label">Slide Transition</div>
              <div className="pres-form-group">
                <label>Transition Effect</label>
                <select 
                  className="pres-select"
                  value={activeSlide?.transition || 'fade'}
                  onChange={e => updateSlide('transition', e.target.value)}
                >
                  <optgroup label="Google Slides">
                    <option value="dissolve">Dissolve</option>
                    <option value="fade">Fade</option>
                    <option value="slideLeft">Slide from Left</option>
                    <option value="slideRight">Slide from Right</option>
                    <option value="flip">Flip</option>
                    <option value="cube">Cube</option>
                    <option value="gallery">Gallery</option>
                  </optgroup>
                  <optgroup label="PowerPoint Subtle">
                    <option value="morph">Morph</option>
                    <option value="fade">Fade</option>
                    <option value="slideLeft">Push / Wipe</option>
                    <option value="split">Split</option>
                    <option value="reveal">Reveal / Flash</option>
                  </optgroup>
                  <optgroup label="PowerPoint Exciting">
                    <option value="curtains">Curtains / Drape</option>
                    <option value="wind">Wind / Fracture</option>
                    <option value="cube">Cube 3D</option>
                    <option value="gallery">Gallery 3D</option>
                    <option value="cardFlip">Door / Flip</option>
                  </optgroup>
                  <optgroup label="Advanced Original">
                    <option value="parallax">Parallax Multi-Layer</option>
                    <option value="roomRotate">3D Room Rotate</option>
                    <option value="zAxis">Z-Axis Fly-Through</option>
                    <option value="cardFlip">Card Flip with Inertia</option>
                    <option value="liquid">Liquid Displace & Warp</option>
                    <option value="shatter">Particle Shatter</option>
                    <option value="rgbSplit">RGB Color Split</option>
                    <option value="inkBleed">Ink Bleed Masking</option>
                  </optgroup>
                </select>
              </div>

              <div className="pres-form-group">
                <label>Duration ({activeSlide?.transitionDuration || 800}ms)</label>
                <input 
                  type="range" 
                  min={300} 
                  max={3000} 
                  step={100}
                  value={activeSlide?.transitionDuration || 800}
                  onChange={e => updateSlide('transitionDuration', +e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="pres-checkbox-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: '#cbd5e1' }}>
                  <input 
                    type="checkbox"
                    checked={activeSlide?.scrollLinked || false}
                    onChange={e => updateSlide('scrollLinked', e.target.checked)}
                  />
                  Scroll-Linked Progression
                </label>
              </div>

              <div className="pres-section-label" style={{ marginTop: '16px' }}>Object Animations</div>
              
              <div className="pres-form-group">
                <label>Title Animation</label>
                <select 
                  className="pres-select"
                  value={activeSlide?.titleAnimation || 'none'}
                  onChange={e => updateSlide('titleAnimation', e.target.value)}
                >
                  <option value="none">None</option>
                  <optgroup label="Entrance Effects">
                    <option value="fadeIn">Fade In</option>
                    <option value="flyInLeft">Fly In Left</option>
                    <option value="flyInRight">Fly In Right</option>
                    <option value="flyInTop">Fly In Top</option>
                    <option value="flyInBottom">Fly In Bottom</option>
                    <option value="zoomIn">Zoom In</option>
                    <option value="bounceIn">Bounce In</option>
                    <option value="floatIn">Float In</option>
                    <option value="growTurn">Grow & Turn</option>
                    <option value="swivel">Swivel</option>
                    <option value="staggered">Staggered Character Reveal</option>
                  </optgroup>
                  <optgroup label="Continuous & Emphasis">
                    <option value="spin">Spin</option>
                    <option value="pulse">Pulse</option>
                    <option value="colorPulse">Color Pulse</option>
                    <option value="teeter">Teeter</option>
                    <option value="growShrink">Grow / Shrink</option>
                    <option value="wobble">Wobble</option>
                  </optgroup>
                </select>
              </div>

              <div className="pres-form-group">
                <label>Subtitle Animation</label>
                <select 
                  className="pres-select"
                  value={activeSlide?.subtitleAnimation || 'none'}
                  onChange={e => updateSlide('subtitleAnimation', e.target.value)}
                >
                  <option value="none">None</option>
                  <optgroup label="Entrance Effects">
                    <option value="fadeIn">Fade In</option>
                    <option value="flyInLeft">Fly In Left</option>
                    <option value="flyInRight">Fly In Right</option>
                    <option value="flyInTop">Fly In Top</option>
                    <option value="flyInBottom">Fly In Bottom</option>
                    <option value="zoomIn">Zoom In</option>
                    <option value="bounceIn">Bounce In</option>
                    <option value="floatIn">Float In</option>
                    <option value="growTurn">Grow & Turn</option>
                    <option value="swivel">Swivel</option>
                    <option value="staggered">Staggered Character Reveal</option>
                  </optgroup>
                  <optgroup label="Continuous & Emphasis">
                    <option value="spin">Spin</option>
                    <option value="pulse">Pulse</option>
                    <option value="colorPulse">Color Pulse</option>
                    <option value="teeter">Teeter</option>
                    <option value="growShrink">Grow / Shrink</option>
                    <option value="wobble">Wobble</option>
                  </optgroup>
                </select>
              </div>

              <div className="pres-form-group">
                <label>Content Animation</label>
                <select 
                  className="pres-select"
                  value={activeSlide?.contentAnimation || 'none'}
                  onChange={e => updateSlide('contentAnimation', e.target.value)}
                >
                  <option value="none">None</option>
                  <optgroup label="Entrance Effects">
                    <option value="fadeIn">Fade In</option>
                    <option value="flyInLeft">Fly In Left</option>
                    <option value="flyInRight">Fly In Right</option>
                    <option value="flyInTop">Fly In Top</option>
                    <option value="flyInBottom">Fly In Bottom</option>
                    <option value="zoomIn">Zoom In</option>
                    <option value="bounceIn">Bounce In</option>
                    <option value="floatIn">Float In</option>
                    <option value="growTurn">Grow & Turn</option>
                    <option value="swivel">Swivel</option>
                  </optgroup>
                  <optgroup label="Continuous & Emphasis">
                    <option value="spin">Spin</option>
                    <option value="pulse">Pulse</option>
                    <option value="colorPulse">Color Pulse</option>
                    <option value="teeter">Teeter</option>
                    <option value="growShrink">Grow / Shrink</option>
                    <option value="wobble">Wobble</option>
                  </optgroup>
                </select>
              </div>

              <div className="pres-section-label" style={{ marginTop: '16px' }}>Behavior & Physics</div>

              <div className="pres-form-group">
                <label>Timing Physics</label>
                <select 
                  className="pres-select"
                  value={activeSlide?.physicsCurve || 'ease'}
                  onChange={e => updateSlide('physicsCurve', e.target.value)}
                >
                  <option value="linear">Linear</option>
                  <option value="ease">Ease (Smooth)</option>
                  <option value="elastic">Elastic Bounce</option>
                  <option value="bounce">Inertial Snapping</option>
                </select>
              </div>

              <div className="pres-checkbox-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: '#cbd5e1' }}>
                  <input 
                    type="checkbox"
                    checked={activeSlide?.hoverResponse === 'magnetic'}
                    onChange={e => updateSlide('hoverResponse', e.target.checked ? 'magnetic' : 'none')}
                  />
                  Magnetic Hover Response
                </label>
              </div>

              <button 
                className="pres-btn primary" 
                style={{ marginTop: '16px', width: '100%', justifyContent: 'center' }}
                onClick={() => {
                  window.dispatchEvent(new Event('resize')); 
                  alert("Preview triggered! Play presentation to see transitions.");
                }}
              >
                Preview Slide Animations
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
