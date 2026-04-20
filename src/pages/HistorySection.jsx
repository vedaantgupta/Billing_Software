import { useState, useEffect, useRef, useContext } from "react";
import {
    Plus,
    Search,
    Grid,
    List as ListIcon,
    Star,
    Archive,
    Trash2,
    Clock,
    MoreVertical,
    X,
    Bold,
    Italic,
    Underline,
    List as BulletList,
    Type,
    Palette,
    Save,
    RotateCcw
} from "lucide-react";
import { AuthContext } from "../contexts/AuthContext";
import { getItems, addItem, updateItem, deleteItem } from "../utils/db";
import "./history.css";

const COLORS = [
    { name: 'white', value: '#ffffff' },
    { name: 'yellow', value: '#fff9c4' },
    { name: 'blue', value: '#e3f2fd' },
    { name: 'green', value: '#e8f5e9' },
    { name: 'pink', value: '#fce4ec' },
    { name: 'purple', value: '#f3e5f5' }
];

export default function HistorySection() {
    const { user } = useContext(AuthContext);
    const [notes, setNotes] = useState([]);
    const [viewMode, setViewMode] = useState("grid"); // grid or list
    const [activeTab, setActiveTab] = useState("all"); // all, pinned, trash
    const [search, setSearch] = useState("");
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingNote, setEditingNote] = useState(null);

    // Editor State
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [selectedColor, setSelectedColor] = useState("white");
    const contentRef = useRef(null);

    useEffect(() => {
        if (user?.id) {
            loadNotes();
        }
    }, [user?.id]);

    const loadNotes = async () => {
        const data = await getItems("historyNotes", user.id);
        setNotes(data || []);
    };

    const handleSave = async () => {
        if (!title && !contentRef.current.innerHTML) {
            setIsEditorOpen(false);
            return;
        }

        const noteData = {
            title,
            content: contentRef.current.innerHTML,
            color: selectedColor,
            pinned: editingNote?.pinned || false,
            trashed: editingNote?.trashed || false,
            updatedAt: new Date().toISOString(),
            createdAt: editingNote?.createdAt || new Date().toISOString()
        };

        if (editingNote && editingNote.id) {
            await updateItem("historyNotes", editingNote.id, noteData, user.id);
        } else {
            await addItem("historyNotes", noteData, user.id);
        }

        setIsEditorOpen(false);
        setEditingNote(null);
        setTitle("");
        loadNotes();
    };

    const openEditor = (note = null) => {
        if (note) {
            setEditingNote(note);
            setTitle(note.title);
            setSelectedColor(note.color || "white");
            // We'll set the content via ref after the modal renders
        } else {
            setEditingNote(null);
            setTitle("");
            setSelectedColor("white");
        }
        setIsEditorOpen(true);
    };

    // Set content when editor opens
    useEffect(() => {
        if (isEditorOpen && contentRef.current) {
            contentRef.current.innerHTML = editingNote ? editingNote.content : "";
        }
    }, [isEditorOpen]);

    const handleFormat = (command, value = null) => {
        document.execCommand(command, false, value);
    };

    const togglePin = async (e, note) => {
        e.stopPropagation();
        await updateItem("historyNotes", note.id, { pinned: !note.pinned }, user.id);
        loadNotes();
    };

    const moveToTrash = async (e, note) => {
        e.stopPropagation();
        await updateItem("historyNotes", note.id, { trashed: true }, user.id);
        loadNotes();
    };

    const restoreNote = async (e, note) => {
        e.stopPropagation();
        await updateItem("historyNotes", note.id, { trashed: false }, user.id);
        loadNotes();
    };

    const deletePermanently = async (e, note) => {
        e.stopPropagation();
        if (window.confirm("Delete this note permanently?")) {
            await deleteItem("historyNotes", note.id, user.id);
            loadNotes();
        }
    };

    const filteredNotes = notes
        .filter(note => {
            const matchesSearch = (note.title || "").toLowerCase().includes(search.toLowerCase()) ||
                (note.content || "").toLowerCase().includes(search.toLowerCase());

            if (activeTab === "trash") return note.trashed && matchesSearch;
            if (activeTab === "pinned") return note.pinned && !note.trashed && matchesSearch;
            return !note.trashed && matchesSearch;
        })
        .sort((a, b) => {
            // Pinned first, then by date
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
        });

    return (
        <div className="history-page">
            {/* Gmail-style Sidebar */}
            <div className="history-sidebar">
                <div className="compose-btn-container">
                    <button className="btn-compose" onClick={() => openEditor()}>
                        <Plus size={24} color="var(--primary-color)" /> Compose
                    </button>
                </div>

                <div className={`nav-link-item ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
                    <Clock size={20} /> All Notes
                </div>
                <div className={`nav-link-item ${activeTab === 'pinned' ? 'active' : ''}`} onClick={() => setActiveTab('pinned')}>
                    <Star size={20} /> Pinned
                </div>
                <div className={`nav-link-item ${activeTab === 'trash' ? 'active' : ''}`} onClick={() => setActiveTab('trash')}>
                    <Trash2 size={20} /> Trash
                </div>

                <div style={{ marginTop: 'auto', padding: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {notes.length} total entries
                </div>
            </div>

            {/* Main Content Area */}
            <div className="history-content">
                <header className="history-header">
                    <div className="search-wrapper">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            className="history-search-input"
                            placeholder="Search in history..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="view-controls">
                        <div className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
                            <ListIcon size={20} />
                        </div>
                        <div className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>
                            <Grid size={20} />
                        </div>
                    </div>
                </header>

                {activeTab === 'trash' && filteredNotes.length > 0 && (
                    <div className="trash-warning">
                        <Trash2 size={16} />
                        <span>Notes in trash are kept here. You can restore them or delete permanently.</span>
                    </div>
                )}

                <main className={`notes-container ${viewMode === 'list' ? 'list-view' : ''}`}>
                    <div className="notes-scroll-container">
                        {filteredNotes.map(note => (
                            <div
                                key={note.id}
                                className={`sticky-note color-${note.color} ${note.pinned ? 'pinned' : ''}`}
                                onClick={() => openEditor(note)}
                            >
                                <div className="note-title">{note.title || "Untitled Entry"}</div>
                                <div
                                    className="note-preview"
                                    dangerouslySetInnerHTML={{ __html: note.content }}
                                />
                                <div className="note-footer">
                                    <span>{new Date(note.updatedAt || note.createdAt).toLocaleDateString()}</span>
                                    <div className="note-actions">
                                        {!note.trashed ? (
                                            <>
                                                <Star
                                                    size={16}
                                                    className="action-icon"
                                                    fill={note.pinned ? "var(--warning-color)" : "none"}
                                                    color={note.pinned ? "var(--warning-color)" : "currentColor"}
                                                    onClick={(e) => togglePin(e, note)}
                                                />
                                                <Trash2 size={16} className="action-icon" onClick={(e) => moveToTrash(e, note)} />
                                            </>
                                        ) : (
                                            <>
                                                <RotateCcw size={16} className="action-icon" onClick={(e) => restoreNote(e, note)} />
                                                <X size={16} className="action-icon" onClick={(e) => deletePermanently(e, note)} />
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filteredNotes.length === 0 && (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
                                <h3>No entries found</h3>
                                <p>Start saving your data by clicking the Compose button.</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Word-style Editor Modal */}
            {isEditorOpen && (
                <div className="editor-overlay">
                    <div className="editor-modal">
                        <div className="editor-header">
                            <div className="flex items-center gap-4">
                                <button className="view-btn" onClick={() => setIsEditorOpen(false)}>
                                    <X size={20} />
                                </button>
                                <span style={{ fontWeight: 600 }}>{editingNote ? "Edit Entry" : "New History Entry"}</span>
                            </div>
                            <button className="btn btn-primary" onClick={handleSave}>
                                <Save size={18} /> Save Entry
                            </button>
                        </div>

                        <div className="editor-toolbar">
                            <button className="toolbar-btn" title="Bold" onClick={() => handleFormat('bold')}>
                                <Bold size={18} />
                            </button>
                            <button className="toolbar-btn" title="Italic" onClick={() => handleFormat('italic')}>
                                <Italic size={18} />
                            </button>
                            <button className="toolbar-btn" title="Underline" onClick={() => handleFormat('underline')}>
                                <Underline size={18} />
                            </button>
                            <div className="toolbar-divider"></div>
                            <button className="toolbar-btn" title="Bullets" onClick={() => handleFormat('insertUnorderedList')}>
                                <BulletList size={18} />
                            </button>
                            <button className="toolbar-btn" title="Numbered List" onClick={() => handleFormat('insertOrderedList')}>
                                <ListIcon size={18} />
                            </button>
                            <div className="toolbar-divider"></div>
                            <button className="toolbar-btn" title="Headers" onClick={() => handleFormat('formatBlock', 'H2')}>
                                <Type size={18} />
                            </button>
                        </div>

                        <div className="editor-body">
                            <input
                                type="text"
                                className="editor-title-input"
                                placeholder="Give it a title..."
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                            <div
                                ref={contentRef}
                                className="rich-editor-content"
                                contentEditable
                                data-placeholder="Start writing your history here..."
                                suppressContentEditableWarning={true}
                            />
                        </div>

                        <div className="editor-footer">
                            <div className="color-dots">
                                <Palette size={18} style={{ marginRight: '0.5rem', color: 'var(--text-secondary)' }} />
                                {COLORS.map(c => (
                                    <div
                                        key={c.name}
                                        className={`color-dot color-${c.name} ${selectedColor === c.name ? 'active' : ''}`}
                                        onClick={() => setSelectedColor(c.name)}
                                    />
                                ))}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                Auto-saving enabled • {new Date().toLocaleTimeString()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}