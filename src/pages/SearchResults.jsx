import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Search,
    FileText,
    Package,
    Users,
    UserCog,
    Banknote,
    Landmark,
    Clock,
    ChevronRight,
    SearchX,
    Filter,
    ArrowUpRight,
    Zap,
    TrendingUp,
    Layers
} from 'lucide-react';
import { getItems } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import './SearchResults.css';

const SearchResults = () => {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const navigate = useNavigate();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');
    const [results, setResults] = useState({
        documents: [],
        products: [],
        contacts: [],
        staff: [],
        loans: [],
        banks: [],
        history: []
    });

    // Elite Scoring Engine
    const calculateSearchScore = (title, desc, query) => {
        if (!title || !query) return 0;
        const t = title.toLowerCase();
        const d = (desc || '').toLowerCase();
        const q = query.toLowerCase();

        if (t === q) return 100; // Perfect Match
        if (t.startsWith(q)) return 80; // Starts with query

        // Starts with query at word boundary
        const words = t.split(/\s+/);
        if (words.some(word => word.startsWith(q))) return 60;

        if (t.includes(q)) return 30; // Just contains it
        if (d.includes(q)) return 10; // In description

        return 0;
    };

    const highlightText = (text, highlight) => {
        if (!text) return '';
        if (!highlight || !highlight.trim()) return text;
        const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) =>
                    part.toLowerCase() === highlight.toLowerCase() ? (
                        <mark key={i} className="search-highlight">{part}</mark>
                    ) : (
                        part
                    )
                )}
            </span>
        );
    };

    useEffect(() => {
        const fetchAllData = async () => {
            if (!user?.id) return;
            setLoading(true);

            try {
                const [docs, prods, cons, stf, lns, bnks, hist] = await Promise.all([
                    getItems('documents', user.id),
                    getItems('products', user.id),
                    getItems('contacts', user.id),
                    getItems('staff', user.id),
                    getItems('loans', user.id),
                    getItems('banks', user.id),
                    getItems('historyNotes', user.id)
                ]);

                const mapAndScore = (items, type, pathFn, titleFn, descFn) => {
                    return items.map(item => {
                        const title = titleFn(item);
                        const desc = descFn(item);
                        const score = calculateSearchScore(title, desc, query);
                        return {
                            ...item,
                            _type: type,
                            _path: pathFn(item),
                            _title: title,
                            _desc: desc,
                            _score: score
                        };
                    })
                        .filter(item => item._score > 0)
                        .sort((a, b) => b._score - a._score);
                };

                const processed = {
                    documents: mapAndScore(docs, 'Document',
                        i => `/documents/${i.docType?.toLowerCase().replace(' ', '-')}/edit/${i.id}`,
                        i => `${i.docType} #${i.invoiceNumber}`,
                        i => `Customer: ${i.customerName} | Amount: ₹${i.totalAmount || 0}`
                    ),
                    products: mapAndScore(prods, 'Inventory',
                        i => `/products/${i.id}`,
                        i => i.name,
                        i => `Code: ${i.code} | Category: ${i.category}`
                    ),
                    contacts: mapAndScore(cons, 'Contact',
                        i => `/contacts/${i.id}`,
                        i => i.name,
                        i => `Phone: ${i.phone} | ${i.type}`
                    ),
                    staff: mapAndScore(stf, 'Staff',
                        i => `/staff/profile/${i.id}`,
                        i => i.name,
                        i => `Designation: ${i.designation}`
                    ),
                    loans: mapAndScore(lns, 'Loan',
                        i => `/loans/${i.id}`,
                        i => `Loan: ${i.bankName}`,
                        i => `A/C No: ${i.loanNumber} | Amount: ₹${i.loanAmount}`
                    ),
                    banks: mapAndScore(bnks, 'Bank Account',
                        i => `/banks/edit/${i.id}`,
                        i => i.bankName,
                        i => `Account Number: ${i.accountNumber}`
                    ),
                    history: mapAndScore(hist, 'History/Note',
                        i => `/history`,
                        i => i.title || 'Untitled Note',
                        i => i.content?.replace(/<[^>]*>/g, '').substring(0, 160) + '...'
                    )
                };

                setResults(processed);
            } catch (error) {
                console.error("Search Error:", error);
            } finally {
                setLoading(false);
            }
        };

        if (query) {
            fetchAllData();
        } else {
            setLoading(false);
        }
    }, [query, user?.id]);

    const categories = [
        { id: 'all', label: 'All Results', icon: <Layers size={16} /> },
        { id: 'documents', label: 'Documents', icon: <FileText size={16} /> },
        { id: 'products', label: 'Inventory', icon: <Package size={16} /> },
        { id: 'contacts', label: 'Contacts', icon: <Users size={16} /> },
        { id: 'loans', label: 'Loans', icon: <Banknote size={16} /> },
        { id: 'banks', label: 'Banks', icon: <Landmark size={16} /> }
    ];

    const getTotalCount = () => Object.values(results).reduce((acc, curr) => acc + curr.length, 0);

    const renderResults = () => {
        let sections = [];

        if (activeFilter === 'all') {
            sections = Object.entries(results);
        } else if (activeFilter === 'contacts') {
            // Merging Staff into Contacts as requested
            sections = [
                ['contacts', results.contacts || []],
                ['staff', results.staff || []]
            ];
        } else {
            sections = [[activeFilter, results[activeFilter] || []]];
        }

        return sections.map(([category, items], sectionIndex) => (
            items.length > 0 && (
                <section key={category} className="result-section staggered-item" style={{ animationDelay: `${sectionIndex * 0.1}s` }}>
                    <h2>
                        <div className="section-icon-box">{getCategoryIcon(category)}</div>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                        <span className="result-count-badge">{items.length} Match{items.length !== 1 ? 'es' : ''}</span>
                    </h2>
                    <div className="elite-grid">
                        {items.map((item, idx) => (
                            <div
                                key={idx}
                                className="elite-card staggered-item"
                                style={{ animationDelay: `${(sectionIndex * 0.1) + (idx * 0.05)}s` }}
                                onClick={() => navigate(item._path)}
                            >
                                <div className="card-top">
                                    <span className="relevance-tag">{item._type}</span>
                                    {item._score >= 80 && <span className="score-badge"><Zap size={10} /> Top Match</span>}
                                </div>
                                <h3 className="elite-title">
                                    {highlightText(item._title, query)}
                                </h3>
                                <p className="elite-desc">
                                    {highlightText(item._desc, query)}
                                </p>
                                <div className="elite-footer">
                                    <div className="meta-group">
                                        <Clock size={12} />
                                        {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'Recent'}
                                    </div>
                                    <div className="action-arrow">
                                        <ArrowUpRight size={18} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )
        ));
    };

    if (loading) {
        return (
            <div className="search-loading">
                <div className="loader-spinner"></div>
                <p>Prioritizing results for you...</p>
            </div>
        );
    }

    return (
        <div className="search-results-page">
            <header className="search-header-hero">
                <div className="mesh-gradient-bg"></div>
                <div className="header-content">
                    <div className="header-top-row">
                        <h1>Results for <span className="query-highlight">"{query}"</span></h1>
                        <div className="stat-pill"><TrendingUp size={16} /> {getTotalCount()} Matches</div>
                    </div>
                </div>
            </header>

            <nav className="category-filter-bar">
                {categories.map(cat => (
                    <div
                        key={cat.id}
                        className={`filter-pill ${activeFilter === cat.id ? 'active' : ''}`}
                        onClick={() => setActiveFilter(cat.id)}
                    >
                        {cat.icon} {cat.label}
                    </div>
                ))}
            </nav>

            {getTotalCount() === 0 ? (
                <div className="no-results">
                    <SearchX size={64} style={{ color: '#94a3b8' }} />
                    <h3>No spotlight matches</h3>
                    <p>Try searching for a different keyword or checking your filters.</p>
                </div>
            ) : (
                <div className="results-container">
                    {renderResults()}
                </div>
            )}
        </div>
    );
};

const getCategoryIcon = (category) => {
    const icons = {
        documents: <FileText size={20} />,
        products: <Package size={20} />,
        contacts: <Users size={20} />,
        staff: <UserCog size={20} />,
        loans: <Banknote size={20} />,
        banks: <Landmark size={20} />,
        history: <Clock size={20} />
    };
    return icons[category] || <Search size={20} />;
};

export default SearchResults;
