/**
 * ChatGPT Projects Store (Enterprise AI Workspace)
 * Manages project workspaces that group related chats, connect custom instructions,
 * and attach shared project files.
 */

const STORAGE_KEY = 'billing_ai_projects_v2';

const DEFAULT_PROJECTS = [
  {
    id: 'proj-bussiness-software',
    title: 'Bussiness software',
    category: 'General',
    description: 'Workspaces for managing business software operations, billing flows, and connected tools.',
    instructions: 'You are an intelligent business assistant specializing in billing software, operations, accounting workflows, and client management. Provide accurate, concise, and structured guidance.',
    updatedAt: 'Just now',
    sources: [],
    chats: []
  },
  {
    id: 'proj-financial-audit',
    title: 'Q3 Financial Audit & Profit Analysis',
    category: 'Finance & Ledger',
    description: 'Grouped financial chats auditing revenues, operating costs, gross margins, and cash flow liquidity.',
    instructions: 'You are an elite Chief Financial Officer (CFO). When answering in this project, focus on gross profit margins, cash flow liquidity, and operating expense reduction. Format figures clearly in tables with Indian Rupee (₹) formatting.',
    updatedAt: 'Just now',
    sources: [
      {
        id: 'src-1',
        name: 'Q3_Sales_Ledger_Summary.xlsx',
        type: 'spreadsheet',
        size: '42.5 KB',
        grounded: true,
        summary: 'Contains 348 sale invoices, revenue breakdown by product line, and client payment collection logs for Q3.'
      },
      {
        id: 'src-2',
        name: 'Office_Operating_Expenses.csv',
        type: 'csv',
        size: '18.2 KB',
        grounded: true,
        summary: 'Monthly recurring expenses including office rent, logistics, utility bills, and tea/refreshments.'
      },
      {
        id: 'src-3',
        name: 'Bank_Reconciliation_Notes.txt',
        type: 'text',
        size: '6.4 KB',
        grounded: true,
        summary: 'Pending cheque clearances, UPI payment receipts, and debtor credit terms.'
      }
    ],
    chats: [
      {
        id: 'pchat-1',
        title: 'Gross Margin & Cash Flow Audit',
        updatedAt: '2 hours ago',
        messages: [
          {
            role: 'user',
            content: 'Summarize our gross margin across product lines based on Q3_Sales_Ledger_Summary.xlsx.'
          },
          {
            role: 'ai',
            content: `### Q3 Gross Margin Synthesis (Connected to Project: \`Q3 Financial Audit\`)

Based on the 348 sales transactions recorded in your Q3 ledger:

| Product Category | Revenue | Cost of Goods (COGS) | Gross Profit | Gross Margin % |
| :--- | :--- | :--- | :--- | :--- |
| **Electronics & Hardware** | ₹14,20,000 | ₹10,65,000 | ₹3,55,000 | **25.0%** |
| **Software & Services** | ₹8,40,000 | ₹1,68,000 | ₹6,72,000 | **80.0%** |
| **Accessories & Consumables** | ₹4,50,000 | ₹2,70,000 | ₹1,80,000 | **40.0%** |
| **Total / Weighted** | **₹27,10,000** | **₹15,03,000** | **₹12,07,000** | **44.5%** |

#### Key Takeaways:
1. **High Margin Winner**: Software & Services generates an extraordinary **80% gross margin**. Prioritizing service contracts will accelerate cash flow.
2. **Working Capital Drag**: Hardware margins (25%) are constrained by shipping costs. Renegotiating bulk vendor pricing can lift margin by 3-4%.`
          }
        ]
      },
      {
        id: 'pchat-1-sub2',
        title: 'Operating Cost Reduction Strategy',
        updatedAt: 'Yesterday',
        messages: []
      }
    ]
  },
  {
    id: 'proj-gst-compliance',
    title: 'GST Compliance & Tax Reconciliation',
    category: 'Tax & Compliance',
    description: 'Grouped tax compliance chats verifying GSTR-1, HSN codes, and input tax credit (ITC) reconciliations.',
    instructions: 'You are a certified GST Tax Auditor. Verify all HSN/SAC codes, check CGST/SGST 9% + 9% or IGST 18% consistency, and highlight any mismatch penalties.',
    updatedAt: 'Yesterday',
    sources: [
      {
        id: 'src-gst-1',
        name: 'GSTR_1_Filing_Checklist_2026.pdf',
        type: 'pdf',
        size: '128 KB',
        grounded: true,
        summary: 'Official invoice matching checklist, reverse charge guidelines, and HSN 6-digit rules.'
      },
      {
        id: 'src-gst-2',
        name: 'Vendor_GSTIN_Active_List.csv',
        type: 'csv',
        size: '34 KB',
        grounded: true,
        summary: 'List of 94 active vendor GSTINs, registration state codes, and filing frequency.'
      }
    ],
    chats: [
      {
        id: 'pchat-2',
        title: 'HSN Code & Input Tax Verification',
        updatedAt: 'Yesterday',
        messages: []
      },
      {
        id: 'pchat-2-sub',
        title: 'GSTR-1 Monthly Filing Checklist',
        updatedAt: '3 days ago',
        messages: []
      }
    ]
  },
  {
    id: 'proj-client-retention',
    title: 'VIP Client Retention & Growth Strategy',
    category: 'Client Analytics',
    description: 'Grouped conversations on customer purchase history, repeat buyer retention offers, and dormant account reactivation.',
    instructions: 'You are an Enterprise Account Growth Director. Emphasize client relationship longevity, personalized discount incentives, and contract re-engagement tactics.',
    updatedAt: 'Sep 22',
    sources: [
      {
        id: 'src-client-1',
        name: 'Top_50_Accounts_Order_History.xlsx',
        type: 'spreadsheet',
        size: '76 KB',
        grounded: true,
        summary: 'Customer lifetime order value, repeat purchasing intervals, and overdue credit balances.'
      }
    ],
    chats: [
      {
        id: 'pchat-3',
        title: 'Dormant Client Reactivation Campaign',
        updatedAt: 'Sep 22',
        messages: []
      }
    ]
  }
];

export const geminiProjectStore = {
  getProjects() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!parsed.some(p => p.id === 'proj-bussiness-software')) {
            const merged = [DEFAULT_PROJECTS[0], ...parsed];
            this.saveAll(merged);
            return merged;
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse AI projects:', e);
    }
    this.saveAll(DEFAULT_PROJECTS);
    return DEFAULT_PROJECTS;
  },

  saveAll(projects) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
      window.dispatchEvent(new CustomEvent('gemini-projects-changed', { detail: projects }));
    } catch (e) {
      console.warn('Failed to save AI projects:', e);
    }
  },

  getProject(id) {
    const list = this.getProjects();
    return list.find(p => p.id === id) || null;
  },

  createProject(title, category = 'General', description = '', initialInstructions = '') {
    const list = this.getProjects();
    const newId = 'proj-' + Date.now();
    const newProject = {
      id: newId,
      title: title.trim(),
      category: category || 'General',
      description: description || 'Grouped chat workspace with custom instructions and shared files.',
      instructions: initialInstructions || 'You are an AI assistant specialized for this project. Keep answers actionable, clear, and grounded in project context.',
      updatedAt: 'Just now',
      sources: [],
      chats: [
        {
          id: 'pchat_' + Date.now(),
          title: 'Initial Project Conversation',
          updatedAt: 'Just now',
          messages: []
        }
      ]
    };
    const updated = [newProject, ...list];
    this.saveAll(updated);
    return newProject;
  },

  updateProject(id, updates) {
    const list = this.getProjects();
    const updated = list.map(p => {
      if (p.id === id) {
        return {
          ...p,
          ...updates,
          updatedAt: 'Just now'
        };
      }
      return p;
    });
    this.saveAll(updated);
    return updated.find(p => p.id === id);
  },

  deleteProject(id) {
    const list = this.getProjects();
    const filtered = list.filter(p => p.id !== id);
    this.saveAll(filtered);
    return filtered;
  },

  addSource(projectId, source) {
    const list = this.getProjects();
    const updated = list.map(p => {
      if (p.id === projectId) {
        const newSrc = {
          id: 'src_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          name: source.name || 'Untitled Document',
          type: source.type || 'text',
          size: source.size || '10 KB',
          grounded: true,
          summary: source.summary || 'Uploaded project file.',
          content: source.content || ''
        };
        return {
          ...p,
          sources: [...(p.sources || []), newSrc],
          updatedAt: 'Just now'
        };
      }
      return p;
    });
    this.saveAll(updated);
    return updated.find(p => p.id === projectId);
  },

  toggleSourceGrounded(projectId, sourceId) {
    const list = this.getProjects();
    const updated = list.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          sources: (p.sources || []).map(s => s.id === sourceId ? { ...s, grounded: !s.grounded } : s),
          updatedAt: 'Just now'
        };
      }
      return p;
    });
    this.saveAll(updated);
    return updated.find(p => p.id === projectId);
  },

  removeSource(projectId, sourceId) {
    const list = this.getProjects();
    const updated = list.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          sources: (p.sources || []).filter(s => s.id !== sourceId),
          updatedAt: 'Just now'
        };
      }
      return p;
    });
    this.saveAll(updated);
    return updated.find(p => p.id === projectId);
  },

  // Project Grouped Chats Management
  addProjectChat(projectId, title = 'New Connected Chat') {
    const list = this.getProjects();
    const newChatId = 'pchat_' + Date.now();
    const updated = list.map(p => {
      if (p.id === projectId) {
        const newChat = {
          id: newChatId,
          title,
          updatedAt: 'Just now',
          messages: []
        };
        return {
          ...p,
          chats: [newChat, ...(p.chats || [])],
          updatedAt: 'Just now'
        };
      }
      return p;
    });
    this.saveAll(updated);
    return newChatId;
  },

  deleteProjectChat(projectId, chatId) {
    const list = this.getProjects();
    const updated = list.map(p => {
      if (p.id === projectId) {
        const remainingChats = (p.chats || []).filter(c => c.id !== chatId);
        return {
          ...p,
          chats: remainingChats.length > 0 ? remainingChats : [
            {
              id: 'pchat_' + Date.now(),
              title: 'General Project Chat',
              updatedAt: 'Just now',
              messages: []
            }
          ],
          updatedAt: 'Just now'
        };
      }
      return p;
    });
    this.saveAll(updated);
    return updated.find(p => p.id === projectId);
  },

  saveProjectChatMessages(projectId, chatId, messages) {
    const list = this.getProjects();
    const updated = list.map(p => {
      if (p.id === projectId) {
        let firstUser = messages.find(m => m.role === 'user');
        let newTitle = null;
        if (firstUser && typeof firstUser.content === 'string') {
          newTitle = firstUser.content.slice(0, 32) + (firstUser.content.length > 32 ? '...' : '');
        }

        const updatedChats = (p.chats || []).map(c => {
          if (c.id === chatId) {
            return {
              ...c,
              title: (c.title === 'New Connected Chat' && newTitle) ? newTitle : c.title,
              messages,
              updatedAt: 'Just now'
            };
          }
          return c;
        });
        return {
          ...p,
          chats: updatedChats,
          updatedAt: 'Just now'
        };
      }
      return p;
    });
    this.saveAll(updated);
  },

  moveChatToProject(projectId, session) {
    const list = this.getProjects();
    const newChat = {
      id: 'pchat_' + Date.now(),
      title: session.title || 'Connected Chat',
      messages: session.messages || [],
      updatedAt: 'Just now'
    };
    const updated = list.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          chats: [newChat, ...(p.chats || [])],
          updatedAt: 'Just now'
        };
      }
      return p;
    });
    this.saveAll(updated);
    return newChat.id;
  }
};

export default geminiProjectStore;
