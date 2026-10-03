import { API_BASE_URL } from '@/config/api';
import { geminiStore } from '@/utils/geminiStore';
import { buildGeminiSystemPrompt } from '@/utils/aiBusinessContext';

/**
 * Parses client-side AI response to extract structured action proposals and questions
 */
export const parseAIResponse = (raw) => {
  if (!raw || typeof raw !== 'string') return { cleanContent: raw || '', action: null, question: null };

  let cleanContent = raw;
  let action = null;
  let question = null;

  // Extract Action Proposal
  const actionMatch = raw.match(/<<<ACTION_PROPOSAL>>>([\s\S]*?)<<<END_ACTION_PROPOSAL>>>/);
  if (actionMatch) {
    try {
      action = JSON.parse(actionMatch[1].trim());
      cleanContent = cleanContent.replace(/<<<ACTION_PROPOSAL>>>[\s\S]*?<<<END_ACTION_PROPOSAL>>>/g, '').trim();
    } catch (e) {
      console.warn('Failed to parse AI action proposal JSON:', e);
    }
  }

  // Extract Question
  const questionMatch = raw.match(/<<<ASK_QUESTION>>>([\s\S]*?)<<<END_ASK_QUESTION>>>/);
  if (questionMatch) {
    try {
      question = JSON.parse(questionMatch[1].trim());
      cleanContent = cleanContent.replace(/<<<ASK_QUESTION>>>[\s\S]*?<<<END_ASK_QUESTION>>>/g, '').trim();
    } catch (e) {
      console.warn('Failed to parse AI question JSON:', e);
    }
  }

  return { cleanContent, action, question };
};

/**
 * Checks if a string represents an error or unreachable model message
 */
const isErrorMessage = (text) => {
  if (!text || typeof text !== 'string') return true;
  const lower = text.toLowerCase().trim();
  return (
    lower.includes('model is currently unreachable') ||
    lower.includes('error communicating with ai') ||
    lower.includes('internal server error') ||
    lower.includes('bad gateway') ||
    lower.includes('service unavailable') ||
    lower.startsWith('error:') ||
    lower.startsWith('{"error":')
  );
};

/**
 * Intelligent deterministic answer generator when external APIs are offline or unreachable.
 * Uses exact pre-calculated business metrics so the user always gets 100% accurate figures.
 */
const generateDeterministicFallback = (textToSend, snapshot) => {
  const q = (textToSend || '').toLowerCase().trim();
  const m = snapshot?.metrics || {};

  const isHindiScript = /[\u0900-\u097F]/.test(textToSend);
  const isGreetingOnly = /^(hi|hello|hey|namaste|namaskar|pranam|halo)[\s!.]*$/i.test(q);

  // 1. Creation Intents (Auto-propose Actions)
  if (q.includes('invoice') || q.includes('bill') || q.includes('challan') || q.includes('quotation')) {
    if (q.includes('create') || q.includes('bana') || q.includes('generate') || q.includes('add') || q.includes('new')) {
      const partyMatch = textToSend.match(/(?:for|party|customer|client|naam|se)\s+([A-Za-z0-9\s]+?)(?:\s+with|\s+amount|\s+of|\s+ke|\s+ka|$)/i);
      const partyName = partyMatch ? partyMatch[1].trim() : 'Walk-in Customer';
      const amountMatch = textToSend.match(/(?:₹|rs\.?|amount|rupees|total)\s*([0-9,]+)/i);
      const grandTotal = amountMatch ? Number(amountMatch[1].replace(/,/g, '')) : 1500;

      return `Maine aapke liye invoice prepare kar diya hai. Kripya details check karke Authorize & Save par click karein.

<<<ACTION_PROPOSAL>>>
{
  "actionId": "act_${Date.now()}",
  "type": "create_document",
  "label": "Create Invoice for ${partyName}",
  "collection": "documents",
  "status": "pending",
  "route": "/documents",
  "data": {
    "invoiceNumber": "INV-${Math.floor(100 + Math.random() * 900)}",
    "partyName": "${partyName}",
    "grandTotal": ${grandTotal},
    "date": "${new Date().toISOString().split('T')[0]}",
    "status": "Unpaid"
  },
  "preview": {
    "Party": "${partyName}",
    "Amount": "₹${grandTotal.toLocaleString('en-IN')}",
    "Type": "Tax Invoice"
  }
}
<<<END_ACTION_PROPOSAL>>>`;
    }
  }

  if ((q.includes('customer') || q.includes('party') || q.includes('contact')) && (q.includes('add') || q.includes('create') || q.includes('naya'))) {
    const nameMatch = textToSend.match(/(?:name|naam|customer|party)\s+([A-Za-z0-9\s]+?)(?:\s+with|\s+phone|\s+ka|$)/i);
    const contactName = nameMatch ? nameMatch[1].trim() : 'New Customer';

    return `Maine naya customer contact add karne ka proposal taiyar kar diya hai:

<<<ACTION_PROPOSAL>>>
{
  "actionId": "act_${Date.now()}",
  "type": "create_contact",
  "label": "Add Customer: ${contactName}",
  "collection": "contacts",
  "status": "pending",
  "route": "/contacts",
  "data": {
    "name": "${contactName}",
    "type": "customer",
    "createdAt": "${new Date().toISOString()}"
  },
  "preview": {
    "Name": "${contactName}",
    "Type": "Customer"
  }
}
<<<END_ACTION_PROPOSAL>>>`;
  }

  // 2. Specific Data Inquiries
  // Today's Sales
  if (q.includes('aaj') || q.includes('today') || (q.includes('sale') && !q.includes('month') && !q.includes('total') && !q.includes('lifetime'))) {
    if (isHindiScript) {
      return `नमस्ते! आज आपके व्यापार में कुल ₹${(m.todaySalesAmount || 0).toLocaleString('en-IN')} की बिक्री हुई है (${m.todaySalesCount || 0} बिल)।`;
    }
    return `Aaj aapka total sales ₹${(m.todaySalesAmount || 0).toLocaleString('en-IN')} hua hai across ${m.todaySalesCount || 0} bill(s).`;
  }

  // Monthly Sales
  if (q.includes('mahine') || q.includes('month')) {
    if (isHindiScript) {
      return `इस महीने की कुल बिक्री ₹${(m.monthSalesAmount || 0).toLocaleString('en-IN')} हुई है (${m.monthSalesCount || 0} बिल)।`;
    }
    return `Is mahine ka total sales ₹${(m.monthSalesAmount || 0).toLocaleString('en-IN')} hua hai (${m.monthSalesCount || 0} bills).`;
  }

  // Pending Udhaar / Receivables
  if (q.includes('udhaar') || q.includes('pending') || q.includes('baki') || q.includes('receivable') || q.includes('khata') || q.includes('balance') || q.includes('due')) {
    if (isHindiScript) {
      return `व्यापार में कुल बकाया राशि (उधार) ₹${(m.totalUnpaidReceivables || 0).toLocaleString('en-IN')} है। आप लेजर या कॉन्टैक्ट्स में जाकर पार्टीवार विवरण देख सकते हैं।`;
    }
    return `Aapka total pending udhaar ₹${(m.totalUnpaidReceivables || 0).toLocaleString('en-IN')} baki hai.`;
  }

  // Low Stock / Inventory
  if (q.includes('stock') || q.includes('item') || q.includes('inventory') || q.includes('product')) {
    if (isHindiScript) {
      return `वर्तमान में ${m.lowStockCount || 0} उत्पाद कम स्टॉक पर हैं। कुल इन्वेंट्री का मूल्य लगभग ₹${(m.stockValuationTotal || 0).toLocaleString('en-IN')} है।`;
    }
    return `Aapke paas ${m.lowStockCount || 0} items low stock par hain. Total inventory value ₹${(m.stockValuationTotal || 0).toLocaleString('en-IN')} hai aur total catalog me ${m.productsCount || 0} products hain.`;
  }

  // Expenses
  if (q.includes('kharcha') || q.includes('expense') || q.includes('kharch')) {
    if (isHindiScript) {
      return `आज का कुल खर्च ₹${(m.todayExpensesAmount || 0).toLocaleString('en-IN')} है और कुल रिकॉर्डेड खर्च ₹${(m.totalExpensesAmount || 0).toLocaleString('en-IN')} है।`;
    }
    return `Aaj ka total kharcha ₹${(m.todayExpensesAmount || 0).toLocaleString('en-IN')} hai aur all-time recorded expenses ₹${(m.totalExpensesAmount || 0).toLocaleString('en-IN')} hain.`;
  }

  // Pure Greeting
  if (isGreetingOnly) {
    if (isHindiScript) {
      return `नमस्ते! मैं आपका AI बिजनेस असिस्टेंट हूँ। आज की बिक्री ₹${(m.todaySalesAmount || 0).toLocaleString('en-IN')} है और कुल बकाया ₹${(m.totalUnpaidReceivables || 0).toLocaleString('en-IN')} है। मैं आपकी क्या सहायता कर सकता हूँ?`;
    }
    return `Namaste! Main aapka AI business copilot hoon. Aaj aapka total sale ₹${(m.todaySalesAmount || 0).toLocaleString('en-IN')} hua hai aur pending udhaar ₹${(m.totalUnpaidReceivables || 0).toLocaleString('en-IN')} hai. Aap mujhse kisi bhi bill, party, stock ya naye invoice ke bare me pooch sakte hain!`;
  }

  // General Contextual Response
  return `Aapke vyapaar me kul ${m.totalInvoicesCount || 0} invoices recorded hain, jinki kul sales ₹${(m.totalSalesAmount || 0).toLocaleString('en-IN')} hai. Aaj ki sales ₹${(m.todaySalesAmount || 0).toLocaleString('en-IN')} hai aur pending udhaar ₹${(m.totalUnpaidReceivables || 0).toLocaleString('en-IN')} hai. Aap kisi bhi naye bill ya report ke liye instruction de sakte hain!`;
};

/**
 * Master multi-engine AI caller:
 * 1. Backend API (with live database & timeout safeguard)
 * 2. Direct Google Generative Language API (if key available)
 * 3. Resilient Pollinations models with multi-tier fallback (openai -> mistral -> deepseek)
 * 4. Resilient direct prompt endpoint
 * 5. Deterministic fallback using live database snapshot
 */
export const queryAIEngine = async ({
  prompt,
  history = [],
  user,
  userName = 'Vedaant Gupta',
  snapshot,
  selectedModel = 'gemini-3.6-flash',
  files = [],
  attachedFiles = [],
  pendingAction = null,
  hasActiveQuestion = false,
  signal = null
}) => {
  const effectiveUserId = snapshot?.userId || user?.id || 'guest_user';
  const effectiveApiModel = geminiStore.getApiModel(selectedModel);
  const userGeminiKey = geminiStore.getApiKey();
  const systemPromptText = buildGeminiSystemPrompt(snapshot?.contextString, userName);
  const activeFiles = (files && files.length > 0) ? files : (attachedFiles || []);

  // 1. Try Backend First (45s timeout to allow full LLM reasoning)
  try {
    const backendFetchPromise = fetch(`${API_BASE_URL}/ai/chat`, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        history,
        userId: effectiveUserId,
        userName,
        userGeminiKey,
        pendingAction,
        hasActiveQuestion,
        geminiModel: effectiveApiModel,
        clientBusinessContext: snapshot?.contextString || '',
        files: activeFiles.map(f => ({ name: f.name, size: f.size, type: f.type, data: f.data }))
      })
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Backend timeout, switching to direct AI engine')), 45000)
    );

    const res = await Promise.race([backendFetchPromise, timeoutPromise]);
    if (res.ok) {
      const data = await res.json();
      if (data && (data.response !== undefined || data.action || data.question) && !isErrorMessage(data.response || '')) {
        const rawContent = data.response || (data.question?.question || data.question?.text || '');
        const parsed = parseAIResponse(rawContent);
        return {
          content: parsed.cleanContent || rawContent,
          action: data.action || parsed.action || null,
          question: data.question || parsed.question || null,
          source: 'backend'
        };
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    console.warn('Backend /ai/chat did not complete, trying direct fallback...', err.message);
  }

  // 2. Direct Google Generative Language API (if user provided Gemini API key)
  if (userGeminiKey) {
    try {
      const googleRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(userGeminiKey)}`,
        {
          method: 'POST',
          signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPromptText }]
            },
            contents: [
              ...history.slice(-6).map(m => ({
                role: (m.role === 'ai' || m.role === 'assistant') ? 'model' : 'user',
                parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }]
              })),
              { role: 'user', parts: [{ text: prompt }] }
            ]
          })
        }
      );
      if (googleRes.ok) {
        const gData = await googleRes.json();
        const text = gData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && !isErrorMessage(text)) {
          const parsed = parseAIResponse(text);
          return {
            content: parsed.cleanContent,
            action: parsed.action,
            question: parsed.question,
            source: 'google-direct'
          };
        }
      }
    } catch (gErr) {
      if (gErr.name === 'AbortError') throw gErr;
      console.warn('Direct Google API attempt failed:', gErr);
    }
  }

  // 3. Multi-tier Pollinations Fallback (openai -> mistral -> deepseek)
  const modelsToTry = ['openai', 'mistral', 'deepseek'];
  for (const mod of modelsToTry) {
    try {
      const pollRes = await fetch('https://text.pollinations.ai/openai/chat/completions', {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: mod,
          messages: [
            { role: 'system', content: systemPromptText },
            ...history.slice(-5).map(m => ({
              role: (m.role === 'ai' || m.role === 'assistant') ? 'assistant' : 'user',
              content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
            })),
            { role: 'user', content: prompt }
          ],
          temperature: 0.3
        })
      });

      if (pollRes.ok) {
        const pData = await pollRes.json();
        const text = pData?.choices?.[0]?.message?.content;
        if (text && !isErrorMessage(text)) {
          const parsed = parseAIResponse(text);
          return {
            content: parsed.cleanContent,
            action: parsed.action,
            question: parsed.question,
            source: `pollinations-${mod}`
          };
        }
      }
    } catch (pErr) {
      if (pErr.name === 'AbortError') throw pErr;
      console.warn(`Pollinations ${mod} attempt failed, trying next...`);
    }
  }

  // 4. Pollinations Direct Simple Prompt Endpoint
  try {
    const rawDirectRes = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai&system=${encodeURIComponent(systemPromptText)}`, {
      method: 'GET',
      signal
    });
    if (rawDirectRes.ok) {
      const text = await rawDirectRes.text();
      if (text && !isErrorMessage(text)) {
        const parsed = parseAIResponse(text);
        return {
          content: parsed.cleanContent,
          action: parsed.action,
          question: parsed.question,
          source: 'pollinations-simple'
        };
      }
    }
  } catch (rawErr) {
    if (rawErr.name === 'AbortError') throw rawErr;
  }

  // 5. Intelligent Instant Fallback Using Live Pre-Calculated Snapshot
  const deterministicText = generateDeterministicFallback(prompt, snapshot);
  const parsed = parseAIResponse(deterministicText);
  return {
    content: parsed.cleanContent,
    action: parsed.action,
    question: parsed.question,
    source: 'live-local-intelligence'
  };
};
