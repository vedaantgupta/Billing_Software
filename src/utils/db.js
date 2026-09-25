import { API_BASE_URL } from '@/config/api';

const DB_KEY = 'gogstbill_db';

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

  // Local queued items that haven't synced yet
  let queueItems = [];
  try {
    const queue = JSON.parse(localStorage.getItem(`${DB_KEY}_queue`) || '[]');
    queueItems = queue
      .filter(q => q.collection === collection && (q.userId === userId || !q.userId))
      .map(q => ({ ...q.item, _offline: true }));
  } catch (e) {}

  try {
    const response = await fetch(`${API_BASE_URL}/work/${userId}?type=${collection}`);
    if (!response.ok) {
      if (response.status === 500) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || `Server Error (500) while fetching ${collection}`);
      }
      throw new Error(`Failed to fetch ${collection}: ${response.statusText}`);
    }
    const items = await response.json();
    const mappedItems = items.map(i => ({ ...i.data, _dbId: i._id }));

    // Merge server items with local queue
    const combined = [...mappedItems];
    queueItems.forEach(qi => {
      if (!combined.some(ci => (ci.id && ci.id === qi.id) || (ci.invoiceNumber && ci.invoiceNumber === qi.invoiceNumber))) {
        combined.unshift(qi);
      }
    });

    // Cache for offline (only if we got data or cache was empty)
    if (combined.length > 0) {
      localStorage.setItem(`${DB_KEY}_cache_${collection}`, JSON.stringify(combined));
    }

    return combined;
  } catch (error) {
    console.warn(`Notice fetching ${collection}, falling back to cache:`, error.message);
    // Return cached data if offline
    let cached = [];
    try {
      const raw = localStorage.getItem(`${DB_KEY}_cache_${collection}`);
      if (raw) cached = JSON.parse(raw);
    } catch (e) {}

    // Merge cached with queue
    const combined = [...cached];
    queueItems.forEach(qi => {
      if (!combined.some(ci => (ci.id && ci.id === qi.id) || (ci.invoiceNumber && ci.invoiceNumber === qi.invoiceNumber))) {
        combined.unshift(qi);
      }
    });

    return combined;
  }
};


export const addItem = async (collection, item, userId, userName = 'You') => {
  if (!userId) {
    console.error(`addItem called without userId for collection: ${collection}`);
    return null;
  }

  const timestampId = Date.now().toString();
  const newItem = { ...item, id: timestampId };

  // Always immediately update local cache so UI and AI snapshot see the item instantly
  try {
    const cached = JSON.parse(localStorage.getItem(`${DB_KEY}_cache_${collection}`) || '[]');
    const updatedCache = [newItem, ...cached.filter(c => (c.id !== newItem.id))];
    localStorage.setItem(`${DB_KEY}_cache_${collection}`, JSON.stringify(updatedCache));
  } catch (e) {}

  try {
    const response = await fetch(`${API_BASE_URL}/work`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, type: collection, data: newItem })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to add ${collection}`);
    }

    const result = await response.json();

    // Log Activity
    let actionLabel = `Added ${collection}`;
    if (collection === 'documents') actionLabel = `Created ${item.docType || 'Document'} #${item.invoiceNumber || timestampId}`;
    if (collection === 'contacts') actionLabel = `Added Contact: ${item.name}`;
    if (collection === 'products') actionLabel = `Added Product: ${item.name}`;
    logActivity(actionLabel, userId, userName);

    return { ...newItem, _dbId: result.id };
  } catch (error) {
    console.warn(`Saved ${collection} to local offline queue:`, error.message);

    // Add to offline queue
    const queue = JSON.parse(localStorage.getItem(`${DB_KEY}_queue`) || '[]');
    queue.push({ collection, item: newItem, userId, userName, timestamp: Date.now() });
    localStorage.setItem(`${DB_KEY}_queue`, JSON.stringify(queue));

    return { ...newItem, offline: true };
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
