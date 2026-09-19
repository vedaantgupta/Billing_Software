import { useState, useEffect, useRef } from "react";
import {
    Calculator,
    Percent,
    Copy,
    Save,
    Trash2,
    TrendingUp,
    Landmark,
    DollarSign,
    Sparkles
} from "lucide-react";
import "./calculator.css";

export default function HistoryCalculator({ onSaveAsNote }) {
    // Calculator Mode: standard, scientific, gst, discount, margin, interest
    const [mode, setMode] = useState("standard");

    // General Calculator State
    const [formula, setFormula] = useState("");
    const [display, setDisplay] = useState("0");
    const [isFinished, setIsFinished] = useState(false);
    const [activeKey, setActiveKey] = useState(null); // for keydown visual feedback

    // Session History State (persisted in localStorage for convenience)
    const [historyLog, setHistoryLog] = useState(() => {
        const stored = localStorage.getItem("billing_calc_history");
        return stored ? JSON.parse(stored) : [];
    });

    // GST Calculator State
    const [gstAmount, setGstAmount] = useState("");
    const [gstRate, setGstRate] = useState(18); // Default 18%
    const [gstResult, setGstResult] = useState(null);

    // Discount Calculator State
    const [discOriginal, setDiscOriginal] = useState("");
    const [discPercent, setDiscPercent] = useState("");
    const [discResult, setDiscResult] = useState(null);

    // Profit Margin Calculator State
    const [marginCost, setMarginCost] = useState("");
    const [marginSelling, setMarginSelling] = useState("");
    const [marginResult, setMarginResult] = useState(null);

    // Interest Calculator State
    const [interestPrincipal, setInterestPrincipal] = useState("");
    const [interestRate, setInterestRate] = useState("");
    const [interestTime, setInterestTime] = useState("");
    const [interestType, setInterestType] = useState("simple"); // simple or compound
    const [interestResult, setInterestResult] = useState(null);

    // Save history log to localStorage
    useEffect(() => {
        localStorage.setItem("billing_calc_history", JSON.stringify(historyLog));
    }, [historyLog]);

    // Safe mathematical expression evaluator
    const evaluateExpression = (expr) => {
        try {
            if (!expr || expr.trim() === "") return "0";

            // Replace display symbols with javascript executable math
            let sanitized = expr
                .replace(/×/g, "*")
                .replace(/÷/g, "/")
                .replace(/π/g, "Math.PI")
                .replace(/e/g, "Math.E")
                .replace(/\^/g, "**")
                .replace(/sin\(/g, "Math.sin(")
                .replace(/cos\(/g, "Math.cos(")
                .replace(/tan\(/g, "Math.tan(")
                .replace(/log\(/g, "Math.log10(")
                .replace(/ln\(/g, "Math.log(")
                .replace(/sqrt\(/g, "Math.sqrt(");

            // Strict sanitization regex to prevent arbitrary code execution
            // Allowed characters: digits, operators (+ - * / . **), math constants/functions, spaces and parentheses
            const safetyRegex = /^[0-9+\-*/().\s*]|Math\.PI|Math\.E|Math\.sin|Math\.cos|Math\.tan|Math\.log10|Math\.log|Math\.sqrt$/;
            
            // Check matching safety
            const cleanExpr = sanitized.replace(/(Math\.PI|Math\.E|Math\.sin|Math\.cos|Math\.tan|Math\.log10|Math\.log|Math\.sqrt|\*\*)/g, "");
            if (!/^[0-9+\-*/().\s]*$/.test(cleanExpr)) {
                return "Syntax Error";
            }

            // Evaluate expression
            const evalResult = new Function(`return (${sanitized})`)();
            
            if (evalResult === undefined || isNaN(evalResult) || !isFinite(evalResult)) {
                return "Error";
            }
            
            // Format result to prevent floating point issues like 0.1 + 0.2 = 0.30000000000000004
            return Number(evalResult.toFixed(10)).toString();
        } catch (err) {
            return "Syntax Error";
        }
    };

    // Calculator Key Click Handler
    const handleKeyClick = (value) => {
        if (isFinished && !isNaN(value)) {
            // If result was just calculated, typing a number starts fresh
            setDisplay(value);
            setFormula("");
            setIsFinished(false);
            return;
        }
        
        setIsFinished(false);

        switch (value) {
            case "AC":
                setDisplay("0");
                setFormula("");
                break;
            case "C":
                setDisplay("0");
                break;
            case "⌫":
            case "Backspace":
                if (display.length > 1) {
                    setDisplay(display.slice(0, -1));
                } else {
                    setDisplay("0");
                }
                break;
            case "=":
            case "Enter":
                const fullExpr = formula + display;
                const result = evaluateExpression(fullExpr);
                if (result !== "Error" && result !== "Syntax Error") {
                    // Save to history log
                    const logItem = {
                        id: Date.now().toString(),
                        expr: fullExpr,
                        res: result,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    };
                    setHistoryLog(prev => [logItem, ...prev].slice(0, 50)); // limit to 50 items
                }
                setDisplay(result);
                setFormula("");
                setIsFinished(true);
                break;
            case "+":
            case "-":
            case "×":
            case "÷":
            case "^":
                // Chain operations
                setFormula(prev => prev + display + " " + value + " ");
                setDisplay("0");
                break;
            case ".":
                if (!display.includes(".")) {
                    setDisplay(prev => prev + ".");
                }
                break;
            case "π":
                setDisplay(Math.PI.toString());
                break;
            case "e":
                setDisplay(Math.E.toString());
                break;
            case "sin":
            case "cos":
            case "tan":
            case "log":
            case "ln":
            case "sqrt":
                setDisplay(value + "(");
                break;
            case "(":
            case ")":
                if (display === "0") {
                    setDisplay(value);
                } else {
                    setDisplay(prev => prev + value);
                }
                break;
            default:
                // Digits
                if (display === "0" || display === "Error" || display === "Syntax Error") {
                    setDisplay(value);
                } else {
                    setDisplay(prev => prev + value);
                }
                break;
        }
    };

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore keypresses if user is typing in form inputs
            if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "SELECT") {
                return;
            }

            const keyMap = {
                "0": "0", "1": "1", "2": "2", "3": "3", "4": "4",
                "5": "5", "6": "6", "7": "7", "8": "8", "9": "9",
                ".": ".", "+": "+", "-": "-", "*": "×", "/": "÷",
                "Enter": "=", "=": "=", "Backspace": "⌫", "Escape": "AC",
                "(": "(", ")": ")", "^": "^"
            };

            const mappedVal = keyMap[e.key];
            if (mappedVal) {
                e.preventDefault();
                setActiveKey(mappedVal);
                handleKeyClick(mappedVal);
                setTimeout(() => setActiveKey(null), 120);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [display, formula, isFinished, mode]);

    // Financial Calculators Logic
    const calculateGST = (rate = gstRate, amount = gstAmount, isAdding = true) => {
        const amt = parseFloat(amount);
        if (isNaN(amt) || amt <= 0) return;

        const taxRate = parseFloat(rate) / 100;
        let net = 0;
        let tax = 0;
        let gross = 0;

        if (isAdding) {
            net = amt;
            tax = amt * taxRate;
            gross = amt + tax;
        } else {
            gross = amt;
            net = amt / (1 + taxRate);
            tax = amt - net;
        }

        const res = {
            mode: isAdding ? "Add GST" : "Remove GST",
            net: net.toFixed(2),
            tax: tax.toFixed(2),
            gross: gross.toFixed(2),
            rate: rate,
            original: amt.toFixed(2)
        };
        setGstResult(res);
    };

    const calculateDiscount = () => {
        const orig = parseFloat(discOriginal);
        const disc = parseFloat(discPercent);

        if (isNaN(orig) || orig <= 0 || isNaN(disc) || disc < 0) return;

        const discountAmt = orig * (disc / 100);
        const finalPrice = orig - discountAmt;

        setDiscResult({
            original: orig.toFixed(2),
            percent: disc,
            saved: discountAmt.toFixed(2),
            final: finalPrice.toFixed(2)
        });
    };

    const calculateMargin = () => {
        const cost = parseFloat(marginCost);
        const selling = parseFloat(marginSelling);

        if (isNaN(cost) || cost <= 0 || isNaN(selling) || selling <= 0) return;

        const profit = selling - cost;
        const markup = (profit / cost) * 100;
        const margin = (profit / selling) * 100;

        setMarginResult({
            cost: cost.toFixed(2),
            selling: selling.toFixed(2),
            profit: profit.toFixed(2),
            markup: markup.toFixed(2),
            margin: margin.toFixed(2)
        });
    };

    const calculateInterest = () => {
        const p = parseFloat(interestPrincipal);
        const r = parseFloat(interestRate);
        const t = parseFloat(interestTime);

        if (isNaN(p) || p <= 0 || isNaN(r) || r < 0 || isNaN(t) || t <= 0) return;

        let interest = 0;
        let total = 0;

        if (interestType === "simple") {
            interest = p * (r / 100) * t;
            total = p + interest;
        } else {
            total = p * Math.pow(1 + (r / 100), t);
            interest = total - p;
        }

        setInterestResult({
            principal: p.toFixed(2),
            rate: r,
            time: t,
            type: interestType,
            interest: interest.toFixed(2),
            total: total.toFixed(2)
        });
    };

    // Save calculations as notes in database
    const handleSaveAsNote = (title, summaryContent) => {
        if (!onSaveAsNote) return;
        onSaveAsNote(title, summaryContent);
        alert("Calculation summary saved to your notes list!");
    };

    // Copy to clipboard helper
    const handleCopyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert("Copied to clipboard: " + text);
    };

    // Clear History Log
    const handleClearHistory = () => {
        if (window.confirm("Clear session calculation history?")) {
            setHistoryLog([]);
        }
    };

    return (
        <div className="calculator-container">
            {/* Left Panel: The General Calculator */}
            <div className="calc-card">
                <div className="calc-mode-selector">
                    <button
                        className={`calc-mode-btn ${mode === "standard" ? "active" : ""}`}
                        onClick={() => setMode("standard")}
                    >
                        <Calculator size={14} /> Standard
                    </button>
                    <button
                        className={`calc-mode-btn ${mode === "scientific" ? "active" : ""}`}
                        onClick={() => setMode("scientific")}
                    >
                        <Sparkles size={14} /> Scientific
                    </button>
                </div>

                <div className="calc-screen">
                    <div className="calc-formula">{formula}</div>
                    <div className="calc-display">{display}</div>
                </div>

                {/* Standard Keypad */}
                {mode === "standard" && (
                    <div className="calc-keypad keypad-standard">
                        <button className="calc-key calc-key-clear" onClick={() => handleKeyClick("AC")}>AC</button>
                        <button className="calc-key calc-key-fn" onClick={() => handleKeyClick("C")}>C</button>
                        <button className="calc-key calc-key-fn" onClick={() => handleKeyClick("⌫")}>⌫</button>
                        <button className={`calc-key calc-key-op ${activeKey === "÷" ? "keydown-active" : ""}`} onClick={() => handleKeyClick("÷")}>÷</button>

                        <button className={`calc-key calc-key-num ${activeKey === "7" ? "keydown-active" : ""}`} onClick={() => handleKeyClick("7")}>7</button>
                        <button className={`calc-key calc-key-num ${activeKey === "8" ? "keydown-active" : ""}`} onClick={() => handleKeyClick("8")}>8</button>
                        <button className={`calc-key calc-key-num ${activeKey === "9" ? "keydown-active" : ""}`} onClick={() => handleKeyClick("9")}>9</button>
                        <button className={`calc-key calc-key-op ${activeKey === "x" || activeKey === "×" ? "keydown-active" : ""}`} onClick={() => handleKeyClick("×")}>×</button>

                        <button className={`calc-key calc-key-num ${activeKey === "4" ? "keydown-active" : ""}`} onClick={() => handleKeyClick("4")}>4</button>
                        <button className={`calc-key calc-key-num ${activeKey === "5" ? "keydown-active" : ""}`} onClick={() => handleKeyClick("5")}>5</button>
                        <button className={`calc-key calc-key-num ${activeKey === "6" ? "keydown-active" : ""}`} onClick={() => handleKeyClick("6")}>6</button>
                        <button className={`calc-key calc-key-op ${activeKey === "-" ? "keydown-active" : ""}`} onClick={() => handleKeyClick("-")}>-</button>

                        <button className={`calc-key calc-key-num ${activeKey === "1" ? "keydown-active" : ""}`} onClick={() => handleKeyClick("1")}>1</button>
                        <button className={`calc-key calc-key-num ${activeKey === "2" ? "keydown-active" : ""}`} onClick={() => handleKeyClick("2")}>2</button>
                        <button className={`calc-key calc-key-num ${activeKey === "3" ? "keydown-active" : ""}`} onClick={() => handleKeyClick("3")}>3</button>
                        <button className={`calc-key calc-key-op ${activeKey === "+" ? "keydown-active" : ""}`} onClick={() => handleKeyClick("+")}>+</button>

                        <button className="calc-key calc-key-fn" onClick={() => handleKeyClick("(")}>(</button>
                        <button className={`calc-key calc-key-num ${activeKey === "0" ? "keydown-active" : ""}`} onClick={() => handleKeyClick("0")}>0</button>
                        <button className="calc-key calc-key-fn" onClick={() => handleKeyClick(")")}>)</button>
                        <button className={`calc-key calc-key-eq ${activeKey === "=" || activeKey === "Enter" ? "keydown-active" : ""}`} onClick={() => handleKeyClick("=")}>=</button>
                    </div>
                )}

                {/* Scientific Keypad */}
                {mode === "scientific" && (
                    <div className="calc-keypad keypad-scientific">
                        <button className="calc-key calc-key-fn" onClick={() => handleKeyClick("sin")}>sin</button>
                        <button className="calc-key calc-key-fn" onClick={() => handleKeyClick("cos")}>cos</button>
                        <button className="calc-key calc-key-fn" onClick={() => handleKeyClick("tan")}>tan</button>
                        <button className="calc-key calc-key-fn" onClick={() => handleKeyClick("π")}>π</button>
                        <button className="calc-key calc-key-clear" onClick={() => handleKeyClick("AC")}>AC</button>

                        <button className="calc-key calc-key-fn" onClick={() => handleKeyClick("log")}>log</button>
                        <button className="calc-key calc-key-fn" onClick={() => handleKeyClick("ln")}>ln</button>
                        <button className="calc-key calc-key-fn" onClick={() => handleKeyClick("sqrt")}>√</button>
                        <button className="calc-key calc-key-fn" onClick={() => handleKeyClick("e")}>e</button>
                        <button className="calc-key calc-key-fn" onClick={() => handleKeyClick("⌫")}>⌫</button>

                        <button className="calc-key calc-key-fn" onClick={() => handleKeyClick("^")}>x^y</button>
                        <button className="calc-key calc-key-num" onClick={() => handleKeyClick("7")}>7</button>
                        <button className="calc-key calc-key-num" onClick={() => handleKeyClick("8")}>8</button>
                        <button className="calc-key calc-key-num" onClick={() => handleKeyClick("9")}>9</button>
                        <button className="calc-key calc-key-op" onClick={() => handleKeyClick("÷")}>÷</button>

                        <button className="calc-key calc-key-fn" onClick={() => handleKeyClick("(")}>(</button>
                        <button className="calc-key calc-key-num" onClick={() => handleKeyClick("4")}>4</button>
                        <button className="calc-key calc-key-num" onClick={() => handleKeyClick("5")}>5</button>
                        <button className="calc-key calc-key-num" onClick={() => handleKeyClick("6")}>6</button>
                        <button className="calc-key calc-key-op" onClick={() => handleKeyClick("×")}>×</button>

                        <button className="calc-key calc-key-fn" onClick={() => handleKeyClick(")")}>)</button>
                        <button className="calc-key calc-key-num" onClick={() => handleKeyClick("1")}>1</button>
                        <button className="calc-key calc-key-num" onClick={() => handleKeyClick("2")}>2</button>
                        <button className="calc-key calc-key-num" onClick={() => handleKeyClick("3")}>3</button>
                        <button className="calc-key calc-key-op" onClick={() => handleKeyClick("-")}>-</button>

                        <button className="calc-key calc-key-fn" onClick={() => handleKeyClick("C")}>C</button>
                        <button className="calc-key calc-key-num" onClick={() => handleKeyClick("0")}>0</button>
                        <button className="calc-key calc-key-fn" onClick={() => handleKeyClick(".")}>.</button>
                        <button className="calc-key calc-key-eq" onClick={() => handleKeyClick("=")}>=</button>
                        <button className="calc-key calc-key-op" onClick={() => handleKeyClick("+")}>+</button>
                    </div>
                )}
            </div>

            {/* Right Panel: Financial Tabs & History Log */}
            <div className="calc-sidebar">
                {/* Billing / Financial Calculators Selector */}
                <div className="calc-tool-card">
                    <div className="calc-mode-selector" style={{ marginBottom: '1.25rem' }}>
                        <button
                            className={`calc-mode-btn ${mode === "gst" ? "active" : ""}`}
                            onClick={() => setMode("gst")}
                        >
                            <Percent size={14} /> GST / Tax
                        </button>
                        <button
                            className={`calc-mode-btn ${mode === "discount" ? "active" : ""}`}
                            onClick={() => setMode("discount")}
                        >
                            <DollarSign size={14} /> Discount
                        </button>
                        <button
                            className={`calc-mode-btn ${mode === "margin" ? "active" : ""}`}
                            onClick={() => setMode("margin")}
                        >
                            <TrendingUp size={14} /> Margin
                        </button>
                        <button
                            className={`calc-mode-btn ${mode === "interest" ? "active" : ""}`}
                            onClick={() => setMode("interest")}
                        >
                            <Landmark size={14} /> Interest
                        </button>
                    </div>

                    {/* GST Calculator Panel */}
                    {mode === "gst" && (
                        <div>
                            <div className="calc-tool-title">
                                <Percent size={18} color="var(--primary-color)" /> GST Tax Calculator
                            </div>
                            <div className="calc-form-group">
                                <label>Original Amount</label>
                                <div className="calc-input-wrapper">
                                    <span className="calc-input-prefix">₹</span>
                                    <input
                                        type="number"
                                        className="calc-input-field"
                                        placeholder="Enter amount..."
                                        value={gstAmount}
                                        onChange={(e) => {
                                            setGstAmount(e.target.value);
                                            calculateGST(gstRate, e.target.value, true);
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="calc-form-group">
                                <label>Tax Slab Rate (%)</label>
                                <div className="gst-slabs">
                                    {[5, 12, 18, 28].map(rate => (
                                        <button
                                            key={rate}
                                            className={`gst-slab-btn ${gstRate === rate ? "active" : ""}`}
                                            onClick={() => {
                                                setGstRate(rate);
                                                calculateGST(rate, gstAmount, true);
                                            }}
                                        >
                                            {rate}%
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="number"
                                    className="calc-input-field"
                                    style={{ paddingLeft: '1rem' }}
                                    placeholder="Or custom rate %..."
                                    value={gstRate}
                                    onChange={(e) => {
                                        setGstRate(e.target.value);
                                        calculateGST(e.target.value, gstAmount, true);
                                    }}
                                />
                            </div>

                            <div className="tax-actions">
                                <button className="tax-btn tax-btn-add" onClick={() => calculateGST(gstRate, gstAmount, true)}>
                                    Add GST (+{gstRate}%)
                                </button>
                                <button className="tax-btn tax-btn-remove" onClick={() => calculateGST(gstRate, gstAmount, false)}>
                                    Remove GST (-{gstRate}%)
                                </button>
                            </div>

                            {gstResult && (
                                <div className="calc-results-grid">
                                    <div className="calc-result-row">
                                        <span>Calculation Type</span>
                                        <span className="calc-result-val">{gstResult.mode}</span>
                                    </div>
                                    <div className="calc-result-row">
                                        <span>Net Value</span>
                                        <span className="calc-result-val">₹ {gstResult.net}</span>
                                    </div>
                                    <div className="calc-result-row">
                                        <span>GST Amount ({gstResult.rate}%)</span>
                                        <span className="calc-result-val">₹ {gstResult.tax}</span>
                                    </div>
                                    <div className="calc-result-row total">
                                        <span>Gross Total</span>
                                        <span className="calc-result-val">₹ {gstResult.gross}</span>
                                    </div>

                                    <div className="calc-action-row">
                                        <button className="calc-action-btn" onClick={() => handleCopyToClipboard(gstResult.gross)}>
                                            <Copy size={14} /> Copy Gross
                                        </button>
                                        <button
                                            className="calc-action-btn primary"
                                            onClick={() => handleSaveAsNote(
                                                `GST Calc: ₹${gstResult.original} @ ${gstResult.rate}%`,
                                                `<p><strong>GST Computation Summary:</strong></p><ul><li>Original Amount: ₹${gstResult.original}</li><li>GST Slab Rate: ${gstResult.rate}%</li><li>Action: ${gstResult.mode}</li><li>Net Amount: ₹${gstResult.net}</li><li>GST Tax Charge: ₹${gstResult.tax}</li><li><strong>Gross Total: ₹${gstResult.gross}</strong></li></ul>`
                                            )}
                                        >
                                            <Save size={14} /> Save Note
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Discount Calculator Panel */}
                    {mode === "discount" && (
                        <div>
                            <div className="calc-tool-title">
                                <DollarSign size={18} color="var(--primary-color)" /> Discount Calculator
                            </div>
                            <div className="calc-form-group">
                                <label>Original Price</label>
                                <div className="calc-input-wrapper">
                                    <span className="calc-input-prefix">₹</span>
                                    <input
                                        type="number"
                                        className="calc-input-field"
                                        placeholder="Original price..."
                                        value={discOriginal}
                                        onChange={(e) => setDiscOriginal(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="calc-form-group">
                                <label>Discount Rate (%)</label>
                                <div className="calc-input-wrapper">
                                    <span className="calc-input-prefix">%</span>
                                    <input
                                        type="number"
                                        className="calc-input-field"
                                        placeholder="Discount percentage..."
                                        value={discPercent}
                                        onChange={(e) => setDiscPercent(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button className="tax-btn tax-btn-add" style={{ width: '100%' }} onClick={calculateDiscount}>
                                Calculate Discount
                            </button>

                            {discResult && (
                                <div className="calc-results-grid">
                                    <div className="calc-result-row">
                                        <span>Original Price</span>
                                        <span className="calc-result-val">₹ {discResult.original}</span>
                                    </div>
                                    <div className="calc-result-row">
                                        <span>Discount ({discResult.percent}%)</span>
                                        <span className="calc-result-val">- ₹ {discResult.saved}</span>
                                    </div>
                                    <div className="calc-result-row total">
                                        <span>Discounted Price</span>
                                        <span className="calc-result-val">₹ {discResult.final}</span>
                                    </div>

                                    <div className="calc-action-row">
                                        <button className="calc-action-btn" onClick={() => handleCopyToClipboard(discResult.final)}>
                                            <Copy size={14} /> Copy Price
                                        </button>
                                        <button
                                            className="calc-action-btn primary"
                                            onClick={() => handleSaveAsNote(
                                                `Discount Calc: ₹${discResult.original} (-${discResult.percent}%)`,
                                                `<p><strong>Discount Summary:</strong></p><ul><li>Original Price: ₹${discResult.original}</li><li>Discount: ${discResult.percent}%</li><li>Saved Amount: ₹${discResult.saved}</li><li><strong>Final Discounted Price: ₹${discResult.final}</strong></li></ul>`
                                            )}
                                        >
                                            <Save size={14} /> Save Note
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Margin Calculator Panel */}
                    {mode === "margin" && (
                        <div>
                            <div className="calc-tool-title">
                                <TrendingUp size={18} color="var(--primary-color)" /> Profit Margin Calculator
                            </div>
                            <div className="calc-form-row">
                                <div className="calc-form-group">
                                    <label>Cost Price</label>
                                    <div className="calc-input-wrapper">
                                        <span className="calc-input-prefix">₹</span>
                                        <input
                                            type="number"
                                            className="calc-input-field"
                                            placeholder="Cost..."
                                            value={marginCost}
                                            onChange={(e) => setMarginCost(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="calc-form-group">
                                    <label>Selling Price</label>
                                    <div className="calc-input-wrapper">
                                        <span className="calc-input-prefix">₹</span>
                                        <input
                                            type="number"
                                            className="calc-input-field"
                                            placeholder="Selling..."
                                            value={marginSelling}
                                            onChange={(e) => setMarginSelling(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <button className="tax-btn tax-btn-add" style={{ width: '100%', marginTop: '0.5rem' }} onClick={calculateMargin}>
                                Calculate Profit Margins
                            </button>

                            {marginResult && (
                                <div className="calc-results-grid">
                                    <div className="calc-result-row">
                                        <span>Cost Basis</span>
                                        <span className="calc-result-val">₹ {marginResult.cost}</span>
                                    </div>
                                    <div className="calc-result-row">
                                        <span>Revenue / Selling</span>
                                        <span className="calc-result-val">₹ {marginResult.selling}</span>
                                    </div>
                                    <div className="calc-result-row">
                                        <span>Net Profit Margin</span>
                                        <span className="calc-result-val">₹ {marginResult.profit}</span>
                                    </div>
                                    <div className="calc-result-row">
                                        <span>Markup Percent</span>
                                        <span className="calc-result-val">{marginResult.markup}%</span>
                                    </div>
                                    <div className="calc-result-row total">
                                        <span>Profit Margin</span>
                                        <span className="calc-result-val">{marginResult.margin}%</span>
                                    </div>

                                    <div className="calc-action-row">
                                        <button className="calc-action-btn" onClick={() => handleCopyToClipboard(marginResult.margin)}>
                                            <Copy size={14} /> Copy Margin
                                        </button>
                                        <button
                                            className="calc-action-btn primary"
                                            onClick={() => handleSaveAsNote(
                                                `Margin Calc: Cost ₹${marginResult.cost} / Sell ₹${marginResult.selling}`,
                                                `<p><strong>Profit Margin Details:</strong></p><ul><li>Cost Basis: ₹${marginResult.cost}</li><li>Selling Price: ₹${marginResult.selling}</li><li>Net Profit Earned: ₹${marginResult.profit}</li><li>Markup Charge Rate: ${marginResult.markup}%</li><li><strong>Final Profit Margin: ${marginResult.margin}%</strong></li></ul>`
                                            )}
                                        >
                                            <Save size={14} /> Save Note
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Interest Calculator Panel */}
                    {mode === "interest" && (
                        <div>
                            <div className="calc-tool-title">
                                <Landmark size={18} color="var(--primary-color)" /> Interest Calculator
                            </div>
                            <div className="calc-form-group">
                                <label>Principal Amount</label>
                                <div className="calc-input-wrapper">
                                    <span className="calc-input-prefix">₹</span>
                                    <input
                                        type="number"
                                        className="calc-input-field"
                                        placeholder="Principal..."
                                        value={interestPrincipal}
                                        onChange={(e) => setInterestPrincipal(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="calc-form-row">
                                <div className="calc-form-group">
                                    <label>Annual Rate (%)</label>
                                    <div className="calc-input-wrapper">
                                        <span className="calc-input-prefix">%</span>
                                        <input
                                            type="number"
                                            className="calc-input-field"
                                            placeholder="Rate..."
                                            value={interestRate}
                                            onChange={(e) => setInterestRate(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="calc-form-group">
                                    <label>Duration (years)</label>
                                    <div className="calc-input-wrapper">
                                        <span className="calc-input-prefix">Yr</span>
                                        <input
                                            type="number"
                                            className="calc-input-field"
                                            placeholder="Years..."
                                            value={interestTime}
                                            onChange={(e) => setInterestTime(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="calc-form-group">
                                <label>Interest Computation Method</label>
                                <select
                                    className="calc-select"
                                    value={interestType}
                                    onChange={(e) => setInterestType(e.target.value)}
                                >
                                    <option value="simple">Simple Interest</option>
                                    <option value="compound">Compound Interest (Annually)</option>
                                </select>
                            </div>

                            <button className="tax-btn tax-btn-add" style={{ width: '100%' }} onClick={calculateInterest}>
                                Calculate Interest Return
                            </button>

                            {interestResult && (
                                <div className="calc-results-grid">
                                    <div className="calc-result-row">
                                        <span>Principal Investment</span>
                                        <span className="calc-result-val">₹ {interestResult.principal}</span>
                                    </div>
                                    <div className="calc-result-row">
                                        <span>Duration / Interest Rate</span>
                                        <span className="calc-result-val">{interestResult.time} Yrs @ {interestResult.rate}%</span>
                                    </div>
                                    <div className="calc-result-row">
                                        <span>Accumulated Interest</span>
                                        <span className="calc-result-val">₹ {interestResult.interest}</span>
                                    </div>
                                    <div className="calc-result-row total">
                                        <span>Future Maturity Value</span>
                                        <span className="calc-result-val">₹ {interestResult.total}</span>
                                    </div>

                                    <div className="calc-action-row">
                                        <button className="calc-action-btn" onClick={() => handleCopyToClipboard(interestResult.total)}>
                                            <Copy size={14} /> Copy Total
                                        </button>
                                        <button
                                            className="calc-action-btn primary"
                                            onClick={() => handleSaveAsNote(
                                                `Interest Calc: ${interestResult.type === 'simple' ? 'Simple' : 'Compound'} - ₹${interestResult.principal}`,
                                                `<p><strong>Interest Accumulation Summary:</strong></p><ul><li>Computation Type: ${interestResult.type === 'simple' ? 'Simple Interest' : 'Compound Interest (compounded annually)'}</li><li>Principal Sum: ₹${interestResult.principal}</li><li>Annual Return Rate: ${interestResult.rate}%</li><li>Maturity Term: ${interestResult.time} Year(s)</li><li>Earned Interest: ₹${interestResult.interest}</li><li><strong>Future Maturity Value: ₹${interestResult.total}</strong></li></ul>`
                                            )}
                                        >
                                            <Save size={14} /> Save Note
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Session Calculation History Log */}
                <div className="calc-tool-card history-log-card">
                    <div className="history-log-header">
                        <h4>
                            <Calculator size={16} color="var(--primary-color)" /> Calculation Log
                        </h4>
                        {historyLog.length > 0 && (
                            <button className="clear-log-btn" onClick={handleClearHistory}>
                                <Trash2 size={12} style={{ marginRight: '0.2rem' }} /> Clear
                            </button>
                        )}
                    </div>

                    <div className="history-log-list">
                        {historyLog.length > 0 ? (
                            historyLog.map(item => (
                                <div
                                    key={item.id}
                                    className="history-log-item"
                                    onClick={() => {
                                        setDisplay(item.res);
                                        setFormula(item.expr + " = ");
                                        setIsFinished(true);
                                    }}
                                    title="Click to load into calculator display"
                                >
                                    <div className="history-log-info">
                                        <div className="history-log-expr">{item.expr} =</div>
                                        <div className="history-log-res">{item.res}</div>
                                    </div>
                                    <div className="history-log-actions">
                                        <button
                                            className="log-action-btn"
                                            title="Copy result"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCopyToClipboard(item.res);
                                            }}
                                        >
                                            <Copy size={12} />
                                        </button>
                                        <button
                                            className="log-action-btn"
                                            title="Save calculation to Notes"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSaveAsNote(
                                                    `Calculation: ${item.expr}`,
                                                    `<p><strong>Calculation Session Log:</strong></p><ul><li>Formula: <code>${item.expr}</code></li><li><strong>Calculated Outcome: <code>${item.res}</code></strong></li><li>Time Recorded: ${item.timestamp}</li></ul>`
                                                );
                                            }}
                                        >
                                            <Save size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-log-state">
                                <span>🧾</span>
                                No computations recorded.
                                <p style={{ fontSize: '0.75rem', margin: 0 }}>Formulas solved on the keypad appear here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
