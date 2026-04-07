// Database utility connecting to MongoDB Express Backend

const DB_KEY = 'gogstbill_db';
const API_BASE_URL = 'http://localhost:5000/api';

const defaultData = {
  company: {
    name: 'My Custom Company',
    gstin: '27AABCU9603R1ZM',
    address: '123 Business Road, Mumbai, Maharashtra',
    state: 'Maharashtra',
    stateCode: '27'
  },
  contacts: [],
  products: [],
  invoices: [],
  activityLogs: []
};

// Log Activity (Non-blocking)
export const logActivity = async (action, userId, userName = 'You') => {
  if (!userId) return;
  const time = new Date().toLocaleString();
  try {
    await fetch(`${API_BASE_URL}/work`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId, 
        type: 'activityLogs', 
        data: { 
          id: Date.now().toString(), 
          time, 
          action, 
          user: userName 
        } 
      })
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
};

// Initialize DB (kept for backward compat or initial defaults if needed)
export const initDB = () => {
  if (!localStorage.getItem(DB_KEY)) {
    localStorage.setItem(DB_KEY, JSON.stringify(defaultData));
  }
};

// Local storage helpers (legacy)
export const getDB = () => {
  initDB();
  return JSON.parse(localStorage.getItem(DB_KEY));
};

export const saveDB = (data) => {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
};

// NEW ASYNC CRUD
export const getItems = async (collection, userId) => {
  if (!userId) {
    console.warn(`getItems called without userId for collection: ${collection}`);
    return [];
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/work/${userId}?type=${collection}`);
    if (!response.ok) {
      if (response.status === 500) {
        const errJson = await response.json();
        throw new Error(errJson.message || `Server Error (500) while fetching ${collection}`);
      }
      throw new Error(`Failed to fetch ${collection}: ${response.statusText}`);
    }
    const items = await response.json();
    const mappedItems = items.map(i => ({ ...i.data, _dbId: i._id }));
    
    // Cache for offline
    localStorage.setItem(`${DB_KEY}_cache_${collection}`, JSON.stringify(mappedItems));
    
    return mappedItems;
  } catch (error) {
    console.error(`Error fetching ${collection}:`, error);
    // Return cached data if offline
    const cached = localStorage.getItem(`${DB_KEY}_cache_${collection}`);
    return cached ? JSON.parse(cached) : [];
  }
};


export const addItem = async (collection, item, userId, userName = 'You') => {
  if (!userId) {
    console.error(`addItem called without userId for collection: ${collection}`);
    return null;
  }

  try {
    const timestampId = Date.now().toString();
    const response = await fetch(`${API_BASE_URL}/work`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, type: collection, data: { ...item, id: timestampId } })
    });
    
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || `Failed to add ${collection}`);
    }
    
    const result = await response.json();
    
    // Log Activity
    let actionLabel = `Added ${collection}`;
    if (collection === 'documents') actionLabel = `Created ${item.docType || 'Document'} #${item.invoiceNumber || timestampId}`;
    if (collection === 'contacts') actionLabel = `Added Contact: ${item.name}`;
    if (collection === 'products') actionLabel = `Added Product: ${item.name}`;
    logActivity(actionLabel, userId, userName);
    
    return { ...item, id: timestampId, _dbId: result.id };
  } catch (error) {
    console.error(`Error adding to ${collection}:`, error);
    
    // Add to offline queue
    const queue = JSON.parse(localStorage.getItem(`${DB_KEY}_queue`) || '[]');
    queue.push({ collection, item, userId, userName, timestamp: Date.now() });
    localStorage.setItem(`${DB_KEY}_queue`, JSON.stringify(queue));
    
    alert('You are offline. Your changes have been saved locally and will sync when you are back online.');
    
    return { ...item, id: Date.now().toString(), offline: true };
  }
};

// Sync Offline Queue
export const syncOfflineData = async () => {
  const queue = JSON.parse(localStorage.getItem(`${DB_KEY}_queue`) || '[]');
  if (queue.length === 0) return;

  console.log(`Syncing ${queue.length} offline items...`);
  const remaining = [];

  for (const task of queue) {
    try {
      await addItem(task.collection, task.item, task.userId, task.userName);
    } catch (err) {
      remaining.push(task);
    }
  }

  localStorage.setItem(`${DB_KEY}_queue`, JSON.stringify(remaining));
};

// Auto-sync when online
if (typeof window !== 'undefined') {
  window.addEventListener('online', syncOfflineData);
}


export const updateItem = async (collection, id, updates, userId, userName = 'You') => {
  if (!userId) return null;
  
  try {
    const response = await fetch(`${API_BASE_URL}/work/${userId}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) throw new Error(`Failed to update ${collection}`);
    
    logActivity(`Updated ${collection} #${id}`, userId, userName);
    return updates;
  } catch (err) {
    console.error(`Error updating ${collection}:`, err);
    return null;
  }
};

export const deleteItem = async (collection, id, userId, userName = 'You') => {
  if (!userId) return false;
  
  try {
    const response = await fetch(`${API_BASE_URL}/work/${userId}/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error(`Failed to delete ${collection}`);
    
    logActivity(`Deleted ${collection} #${id}`, userId, userName);
    return true;
  } catch (err) {
    console.error(`Error deleting ${collection}:`, err);
    return false;
  }
};
