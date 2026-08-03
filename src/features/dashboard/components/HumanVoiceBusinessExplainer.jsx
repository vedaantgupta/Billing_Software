import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Pause, Square, Sparkles, Settings2, MessageSquare } from 'lucide-react';
import dayjs from 'dayjs';

const HumanVoiceBusinessExplainer = ({ user, stats, inventoryStats, staffCount = 0, activeProjectsCount = 0 }) => {
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [rate, setRate] = useState(0.92);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSentence, setCurrentSentence] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  const synthRef = useRef(null);

  // Extract real user name cleanly
  const getCleanUserName = () => {
    if (!user) return '';
    if (user.firstName) {
      return `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`.trim();
    }
    return (user.displayName || user.name || user.username || user.businessName || '').trim();
  };

  // Initialize Speech Synthesis & Auto-Select Native Hindi or Best Indian Voice
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;

      const updateVoices = () => {
        const availableVoices = synthRef.current.getVoices();
        setVoices(availableVoices);

        if (availableVoices.length > 0) {
          const bestVoice = availableVoices.find(v => 
            v.lang.includes('hi') || v.lang.includes('HI') || v.name.includes('Hindi') || v.name.includes('hi-IN')
          ) || availableVoices.find(v => 
            v.lang.includes('IN') || v.name.includes('India') || v.name.includes('Indian')
          ) || availableVoices.find(v => 
            v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')
          ) || availableVoices[0];

          setSelectedVoice(bestVoice);
        }
      };

      updateVoices();

      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = updateVoices;
      }
    } else {
      setIsSupported(false);
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Universal Script Generator using "Is time" (not "Is avdhi") and Name greeting (no "executive")
  const generateScript = () => {
    const rawName = getCleanUserName();
    const salutationHindi = rawName ? `${rawName} जी` : 'जी';
    const salutationHinglish = rawName ? `${rawName} Ji` : 'Ji';

    const formattedSales = Math.round(stats.sales || 0).toLocaleString('en-IN');
    const formattedProfit = Math.round(stats.netProfit || 0).toLocaleString('en-IN');
    const formattedExpenses = Math.round(stats.expenses || 0).toLocaleString('en-IN');
    const formattedPurchases = Math.round(stats.purchases || 0).toLocaleString('en-IN');
    const invoiceCount = stats.invoices || 0;
    const lowStockCount = (inventoryStats?.lowStock || 0) + (inventoryStats?.zeroStock || 0);

    return [
      {
        hindiNative: `नमस्ते ${salutationHindi}। आपके बिजनेस की आज की रिपोर्ट में आपका स्वागत है।`,
        englishTTSPhonetic: `Namaste ${salutationHinglish}. Aapke business ki aaj ki report mein aapka swaagat hai.`,
        display: `Namaste ${salutationHinglish}! Aapke business ki aaj ki report mein aapka swaagat hai.`
      },
      {
        hindiNative: `इस टाइम आपके व्यापार की कुल बिक्री ${formattedSales} रुपये है, जो ${invoiceCount} इनवॉइस से मिली है।`,
        englishTTSPhonetic: `Is time aapke business ne total ${formattedSales} rupees ki sale revenue achieve ki hai, jo ${invoiceCount} sale invoices se aayi hai.`,
        display: `Is time aapke business ne total ₹${formattedSales} ki sale revenue achieve ki hai, jo ${invoiceCount} sale invoices se aayi hai.`
      },
      {
        hindiNative: `आपकी कुल खरीदारी ${formattedPurchases} रुपये है, और दैनिक खर्चे ${formattedExpenses} रुपये हैं।`,
        englishTTSPhonetic: `Aapka total purchase spend ${formattedPurchases} rupees hai, aur daily expenses ${formattedExpenses} rupees record hue hain.`,
        display: `Aapka total purchase spend ₹${formattedPurchases} raha hai, aur daily expenses ₹${formattedExpenses} record hue hain.`
      },
      {
        hindiNative: `सभी खर्चे घटाने के बाद आपका नेट ऑपरेटिंग प्रॉफिट कुल ${formattedProfit} रुपये है।`,
        englishTTSPhonetic: `Sabhi purchases aur expenses ko deduct karne ke baad, aapka net operating profit total ${formattedProfit} rupees hai.`,
        display: `Sabhi purchases aur expenses ko deduct karne ke baad, aapka net operating profit ₹${formattedProfit} raha hai.`
      },
      {
        hindiNative: lowStockCount > 0 
          ? `इन्वेंट्री में कुल ${lowStockCount} आइटम्स का स्टॉक कम है, जिन्हें तुरंत रीस्टॉक करने की जरूरत है।`
          : `आपकी इन्वेंट्री बिल्कुल ठीक है और कोई भी लो स्टॉक अलर्ट नहीं है।`,
        englishTTSPhonetic: lowStockCount > 0 
          ? `Inventory mein total ${lowStockCount} items aise hain jinka stock low hai, aur unhe immediate restock karne ki zaroorat hai.`
          : `Aapki inventory bilkul healthy hai aur koi bhi low stock alert nahi hai.`,
        display: lowStockCount > 0 
          ? `Inventory mein total ${lowStockCount} items aise hain jinka stock low hai, aur unhe immediate restock karne ki zaroorat hai.`
          : `Aapki inventory bilkul healthy hai aur koi bhi low stock alert nahi hai.`
      },
      {
        hindiNative: `आपके पास कुल ${staffCount} एक्टिव स्टाफ मेंबर्स हैं, और ${activeProjectsCount} प्रोजेक्ट्स चल रहे हैं।`,
        englishTTSPhonetic: `Aapke paas total ${staffCount} active staff members hain, aur ${activeProjectsCount} ongoing projects chal rahe hain.`,
        display: `Aapke paas total ${staffCount} active staff members hain, aur ${activeProjectsCount} ongoing projects chal rahe hain.`
      },
      {
        hindiNative: `आपके सभी जीएसटी टैक्स और एकाउंटिंग लेजर रिकॉर्ड्स अप टू डेट हैं। आपका दिन शुभ और लाभदायक रहे।`,
        englishTTSPhonetic: `Aapke sabhi GST tax calculations aur accounting ledgers up to date hain. Have a great day ahead.`,
        display: `Aapke sabhi GST tax calculations aur accounting ledgers up-to-date hain. Have a great day ahead!`
      }
    ];
  };

  // Start Speech Synthesis
  const handlePlay = () => {
    if (!synthRef.current) return;

    if (isPaused) {
      synthRef.current.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    synthRef.current.cancel();

    const sentences = generateScript();
    let currentIdx = 0;

    const isHindiVoice = selectedVoice && (
      selectedVoice.lang.includes('hi') || 
      selectedVoice.name.toLowerCase().includes('hindi')
    );

    const speakNextSentence = () => {
      if (currentIdx >= sentences.length) {
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentSentence('');
        return;
      }

      const item = sentences[currentIdx];
      
      // Update screen caption with clean Hinglish text
      setCurrentSentence(item.display);

      const speechText = isHindiVoice ? item.hindiNative : item.englishTTSPhonetic;

      const utterance = new SpeechSynthesisUtterance(speechText);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      } else {
        utterance.lang = 'hi-IN';
      }
      utterance.rate = rate;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        currentIdx++;
        speakNextSentence();
      };

      utterance.onerror = (e) => {
        console.error('Speech synthesis error:', e);
        setIsPlaying(false);
        setIsPaused(false);
      };

      synthRef.current.speak(utterance);
    };

    setIsPlaying(true);
    setIsPaused(false);
    speakNextSentence();
  };

  const handlePause = () => {
    if (synthRef.current && isPlaying) {
      synthRef.current.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentSentence('');
    }
  };

  if (!isSupported) return null;

  return (
    <div className="glass" style={{ padding: '1.1rem 1.35rem', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '10px', background: 'linear-gradient(135deg, #ffffff 0%, #f0f4fe 100%)', boxShadow: '0 4px 16px rgba(99,102,241,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Left: AI Explainer Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '8px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
            <Sparkles size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
              AI Business Voice Explainer
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
              Listen to a clear spoken briefing of your business performance.
            </p>
          </div>
        </div>

        {/* Right: Audio Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Animated Soundwave Visualizer */}
          {isPlaying && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '24px', paddingRight: '8px' }}>
              <span style={{ width: '4px', height: '14px', background: '#6366f1', borderRadius: '2px', animation: 'dbFadeInUp 0.4s infinite alternate' }} />
              <span style={{ width: '4px', height: '22px', background: '#10b981', borderRadius: '2px', animation: 'dbFadeInUp 0.6s infinite alternate' }} />
              <span style={{ width: '4px', height: '10px', background: '#f59e0b', borderRadius: '2px', animation: 'dbFadeInUp 0.3s infinite alternate' }} />
              <span style={{ width: '4px', height: '18px', background: '#8b5cf6', borderRadius: '2px', animation: 'dbFadeInUp 0.5s infinite alternate' }} />
            </div>
          )}

          {!isPlaying ? (
            <button
              className="btn btn-primary"
              onClick={handlePlay}
              style={{ padding: '0.55rem 1.1rem', borderRadius: '8px', fontSize: '0.825rem', fontWeight: 700, gap: '6px' }}
            >
              <Volume2 size={16} /> Listen to Business Briefing
            </button>
          ) : (
            <button
              className="btn btn-secondary"
              onClick={handlePause}
              style={{ padding: '0.55rem 1rem', borderRadius: '8px', fontSize: '0.825rem', fontWeight: 700, gap: '6px', borderColor: '#cbd5e1' }}
            >
              <Pause size={16} /> Pause Voice
            </button>
          )}

          {(isPlaying || isPaused) && (
            <button
              className="btn btn-secondary"
              onClick={handleStop}
              style={{ padding: '0.55rem 0.85rem', borderRadius: '8px', fontSize: '0.825rem', fontWeight: 700, color: '#dc2626', borderColor: '#fca5a5' }}
              title="Stop Speech"
            >
              <Square size={15} />
            </button>
          )}

          {/* Voice & Speed Settings Toggle */}
          <button
            className="btn btn-secondary"
            onClick={() => setShowSettings(!showSettings)}
            style={{ padding: '0.55rem', borderRadius: '8px' }}
            title="Voice & Speed Settings"
          >
            <Settings2 size={16} color="#64748b" />
          </button>
        </div>
      </div>

      {/* Voice & Speed Settings Options */}
      {showSettings && (
        <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>Voice Engine:</label>
            <select
              value={selectedVoice?.name || ''}
              onChange={(e) => {
                const v = voices.find(voice => voice.name === e.target.value);
                if (v) setSelectedVoice(v);
              }}
              style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#ffffff', outline: 'none' }}
            >
              {voices.map((v, i) => (
                <option key={i} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>Speech Speed:</label>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[0.8, 0.92, 1.1, 1.25].map(r => (
                <button
                  key={r}
                  onClick={() => setRate(r)}
                  style={{
                    padding: '3px 9px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    border: '1px solid #cbd5e1',
                    background: rate === r ? 'var(--primary-color)' : '#ffffff',
                    color: rate === r ? '#ffffff' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  {r}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Live Speech Sentence Captions Display (Clean Hinglish text for user UI) */}
      {currentSentence && (
        <div style={{ marginTop: '0.85rem', padding: '0.65rem 1rem', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '6px', borderLeft: '4px solid var(--primary-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MessageSquare size={16} color="var(--primary-color)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e1b4b' }}>
            "{currentSentence}"
          </span>
        </div>
      )}
    </div>
  );
};

export default HumanVoiceBusinessExplainer;
