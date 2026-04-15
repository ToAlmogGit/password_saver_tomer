import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from './firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

// ── Character sets ──────────────────────────────────────────────────────────
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SPECIAL = '!@#$%^&*()_+-=[]{}|;:,.<>?';

// ── Common dictionary words that weaken passwords ───────────────────────────
const COMMON_WORDS = [
  'password', 'passwd', 'letmein', 'welcome', 'hello', 'qwerty', 'monkey',
  'dragon', 'master', 'sunshine', 'shadow', 'superman', 'batman', 'football',
  'baseball', 'soccer', 'hockey', 'admin', 'login', 'user', 'guest', 'test',
  'server', 'root', 'pass', 'abc', 'love', 'god', 'sex', 'money', 'time', 'help',
  'home', 'name', 'work', 'mail', 'web', 'net', 'site', 'info', 'data', 'app',
  'iloveyou', 'princess', 'starwars', 'charlie', 'donald', 'michael', 'jessica',
  'letme', 'access', 'flower', 'summer', 'winter', 'spring', 'autumn', 'season',
  'cookie', 'cheese', 'butter', 'coffee', 'morning', 'evening', 'night', 'baby',
  'angel', 'hockey', 'soccer', 'tennis', 'golf', 'chess', 'poker', 'casino',
  'hunter', 'killer', 'matrix', 'secret', 'freedom', 'whatever', 'nothing',
  'everything', 'forever', 'always', 'never', 'today', 'monday', 'tuesday',
  'january', 'february', 'december', 'birthday', 'holiday', 'computer', 'laptop',
  'phone', 'tablet', 'internet', 'network', 'system', 'windows', 'android', 'apple', 'fuck'
];

function containsCommonWord(pwd: string): string | null {
  const lower = pwd.toLowerCase();
  for (const word of COMMON_WORDS) {
    if (word.length >= 4 && lower.includes(word)) return word;
  }
  return null;
}

// ── Password generator ──────────────────────────────────────────────────────
function generatePassword(
  length: number,
  opts: { upper: boolean; lower: boolean; numbers: boolean; special: boolean }
): string {
  let charset = '';
  if (opts.upper) charset += UPPERCASE;
  if (opts.lower) charset += LOWERCASE;
  if (opts.numbers) charset += NUMBERS;
  if (opts.special) charset += SPECIAL;
  if (!charset) charset = LOWERCASE;

  let pwd = '';
  for (let i = 0; i < length; i++) {
    pwd += charset[Math.floor(Math.random() * charset.length)];
  }
  return pwd;
}

// ── Strength criteria ───────────────────────────────────────────────────────
interface Criterion {
  label: string;
  pass: boolean;
  detail?: string;
}

function evaluateCriteria(pwd: string): Criterion[] {
  const foundWord = containsCommonWord(pwd);
  return [
    { label: '13+ characters', pass: pwd.length >= 13 },
    { label: 'Uppercase letter (A-Z)', pass: /[A-Z]/.test(pwd) },
    { label: 'Lowercase letter (a-z)', pass: /[a-z]/.test(pwd) },
    { label: 'Number (0-9)', pass: /[0-9]/.test(pwd) },
    { label: 'Symbol (!@#$…)', pass: /[^A-Za-z0-9]/.test(pwd) },
    {
      label: foundWord ? `No common words (found "${foundWord}")` : 'No common dictionary words',
      pass: !foundWord,
    },
  ];
}

interface StrengthResult {
  label: string;
  colorBar: string;
  colorText: string;
  pct: number;
}

function getStrength(pwd: string, criteria: Criterion[]): StrengthResult {
  if (!pwd) {
    return { label: '', colorBar: 'opacity-0', colorText: 'opacity-0', pct: 0 };
  }

  const upperCount = (pwd.match(/[A-Z]/g) || []).length;
  const lowerCount = (pwd.match(/[a-z]/g) || []).length;
  const numCount = (pwd.match(/[0-9]/g) || []).length;
  const symCount = (pwd.match(/[^A-Za-z0-9]/g) || []).length;
  const hasCommon = containsCommonWord(pwd) !== null;

  const isPerfect =
    pwd.length >= 16 &&
    upperCount >= 3 &&
    lowerCount >= 3 &&
    numCount >= 3 &&
    symCount >= 3 &&
    !hasCommon;

  if (isPerfect) {
    return {
      label: 'Perfect',
      colorBar: 'bg-blue-500 shadow-[0_0_20px_#3b82f6]',
      colorText: 'text-blue-400',
      pct: 100
    };
  }

  const score = criteria.filter(c => c.pass).length;
  
  if (hasCommon || pwd.length < 8) {
    return { label: 'Weak', colorBar: 'bg-red-600', colorText: 'text-red-500', pct: Math.max(5, pwd.length * 2) };
  }

  if (score <= 3) return { label: 'Weak',   colorBar: 'bg-red-500',    colorText: 'text-red-400',    pct: 25 };
  if (score <= 4) return { label: 'Fair',   colorBar: 'bg-orange-500', colorText: 'text-orange-400', pct: 50 };
  if (score <= 5) return { label: 'Good',   colorBar: 'bg-yellow-500', colorText: 'text-yellow-400', pct: 75 };
  return               { label: 'Strong', colorBar: 'bg-green-500',  colorText: 'text-green-400',  pct: 90 };
}

// ── Custom circular checkbox ────────────────────────────────────────────────
function CustomCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 cursor-pointer select-none" onClick={onChange}>
      <div
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${checked
          ? 'bg-primary border-primary shadow-[0_0_8px_rgba(234,42,42,0.5)]'
          : 'bg-[#1a1a1a] border-[#555] hover:border-[#888]'
          }`}
      >
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className="text-sm text-gray-300">{label}</span>
    </div>
  );
}

// ── Criterion row ───────────────────────────────────────────────────────────
function CriterionRow({ criterion }: { criterion: Criterion }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${criterion.pass
          ? 'bg-green-500/20 text-green-400 border border-green-500/40'
          : 'bg-[#333] text-gray-600 border border-[#444]'
          }`}
      >
        {criterion.pass ? (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>
      <span className={`text-xs transition-colors duration-300 ${criterion.pass ? 'text-gray-300' : 'text-gray-500'}`}>
        {criterion.label}
      </span>
    </div>
  );
}

function tryParseUrl(input: string): URL | null {
  if (!input.trim()) return null;
  try {
    const withProtocol = input.includes('://') ? input : `https://${input}`;
    const url = new URL(withProtocol);
    if (url.hostname.includes('.')) {
      return url;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Main component ──────────────────────────────────────────────────────────
export default function CreatePassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.editData;
  const editingId = editData?.id;

  const [length, setLength] = useState(16);
  const [showPassword, setShowPassword] = useState(false);
  const [opts, setOpts] = useState({
    upper: true, lower: true, numbers: true, special: false,
  });
  const [password, setPassword] = useState(editData?.passwordValue || '');
  const [copied, setCopied] = useState(false);
  const [isManual, setIsManual] = useState(!!editData);

  // Link Website Form State
  const [urlInput, setUrlInput] = useState(editData?.siteUrl || editData?.website || '');
  const [usernameInput, setUsernameInput] = useState(editData?.username || '');
  const [notesInput, setNotesInput] = useState(editData?.notes || '');
  const [websiteName, setWebsiteName] = useState('');
  const [iconUrl, setIconUrl] = useState('');

  // Validate and parse URL
  useEffect(() => {
    const parsed = tryParseUrl(urlInput);
    if (parsed) {
      let domain = parsed.hostname;
      if (domain.startsWith('www.')) domain = domain.slice(4);
      const mainName = domain.split('.')[0];
      const formattedName = mainName.charAt(0).toUpperCase() + mainName.slice(1);
      
      setWebsiteName(formattedName);
      setIconUrl(`https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(parsed.origin)}&size=128`);
    } else {
      setWebsiteName(urlInput);
      setIconUrl('');
    }
  }, [urlInput]);

  const regen = useCallback(() => {
    setPassword(generatePassword(length, opts));
    setIsManual(false);
  }, [length, opts]);

  // Only auto-regenerate when NOT manually editing and not in edit mode
  useEffect(() => {
    if (!isManual && !editingId) {
      setPassword(generatePassword(length, opts));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [length, opts]);

  // Generate once on mount if not editing
  useEffect(() => {
    if (!editingId) {
      setPassword(generatePassword(16, { upper: true, lower: true, numbers: true, special: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  const handleSave = async () => {
    if (!password) {
      alert('Please enter or generate a password first!');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      alert('You must be logged in to save passwords.');
      return;
    }

    try {
      if (editingId) {
        const docRef = doc(db, 'users', user.uid, 'passwords', editingId);
        await updateDoc(docRef, {
          website: websiteName || urlInput || 'Untitled',
          siteUrl: urlInput,
          username: usernameInput,
          notes: notesInput,
          passwordValue: password,
          iconUrl: iconUrl || '',
          updatedAt: serverTimestamp()
        });
      } else {
        const passwordsRef = collection(db, 'users', user.uid, 'passwords');
        await addDoc(passwordsRef, {
          website: websiteName || urlInput || 'Untitled',
          siteUrl: urlInput,
          username: usernameInput,
          notes: notesInput,
          passwordValue: password,
          iconUrl: iconUrl || '',
          createdAt: serverTimestamp()
        });
      }
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving password:', error);
      alert('Failed to save password.');
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsManual(true);
    setPassword(e.target.value);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 800);
  };

  const toggleOpt = (key: keyof typeof opts) =>
    setOpts(prev => ({ ...prev, [key]: !prev[key] }));

  const criteria = evaluateCriteria(password);
  const strength = getStrength(password, criteria);

  return (
    <div className="flex flex-col min-h-screen bg-[#1a1a1a] font-display text-white">
      {/* ── Header ── */}
      <header className="bg-[#2a2a2a]/90 backdrop-blur-sm sticky top-0 z-10 border-b border-[#333]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-3xl">lock</span>
              <span className="text-white text-lg font-bold">Password Manager</span>
            </div>
            <nav className="hidden md:flex items-center space-x-1">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-300 hover:bg-[#3a3a3a] hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Passwords
              </button>
              <span className="bg-[#3a3a3a] text-white px-3 py-2 rounded-md text-sm font-medium">Create</span>
              <a className="text-gray-300 hover:bg-[#3a3a3a] hover:text-white px-3 py-2 rounded-md text-sm font-medium" href="#">Account</a>
              <a className="text-gray-300 hover:bg-[#3a3a3a] hover:text-white px-3 py-2 rounded-md text-sm font-medium" href="#">Settings</a>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-grow p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-black leading-tight tracking-tighter text-white">Create New Password</h1>
            <p className="text-gray-400 mt-1 text-sm">Generate a password or type your own — strength is checked in real time.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* ══ Password Panel ══ */}
            <div className="bg-[#2a2a2a] p-6 rounded-xl shadow-lg border border-[#3a3a3a] flex flex-col gap-6">
              <h2 className="text-2xl font-bold text-white">Password</h2>

              {/* Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-300" htmlFor="generated-password">
                    {isManual ? 'Your Password' : 'Generated Password'}
                  </label>
                  {isManual && (
                    <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/30">
                      Manual
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    className="form-input w-full rounded-lg border border-[#444] bg-[#1a1a1a] text-white h-14 placeholder:text-gray-500 p-4 pr-24 text-base focus:border-primary focus:outline-none font-mono tracking-wide transition-colors"
                    id="generated-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={handlePasswordChange}
                    placeholder="Type or generate a password…"
                    spellCheck={false}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 space-x-1">
                    <button
                      onClick={() => setShowPassword(v => !v)}
                      className="p-1 text-gray-400 hover:text-primary transition-colors"
                      title={showPassword ? 'Hide' : 'Show'}
                    >
                      <span className="material-symbols-outlined text-xl">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                    <button
                      onClick={handleCopy}
                      className="p-1 text-gray-400 hover:text-primary transition-colors"
                      title="Copy"
                    >
                      <span className="material-symbols-outlined text-xl">
                        {copied ? 'check' : 'content_copy'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Strength bar */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium text-gray-300">Strength</p>
                  <p className={`text-sm font-bold ${strength.colorText}`}>{strength.label}</p>
                </div>
                <div className="w-full bg-[#1a1a1a] rounded-full h-2.5 border border-[#444]">
                  <div
                    className={`${strength.colorBar} h-2.5 rounded-full transition-all duration-500`}
                    style={{ width: `${strength.pct}%` }}
                  />
                </div>
              </div>

              {/* Criteria breakdown */}
              <div className="bg-[#1e1e1e] rounded-lg border border-[#3a3a3a] p-4 grid grid-cols-1 gap-2.5">
                {criteria.map(c => (
                  <CriterionRow key={c.label} criterion={c} />
                ))}
              </div>

              {/* Regenerate — red */}
              <button
                onClick={regen}
                className="w-full flex items-center justify-center h-12 px-6 bg-primary text-white font-bold rounded-lg hover:bg-red-700 transition-colors"
              >
                <span className="material-symbols-outlined mr-2">refresh</span>
                Regenerate
              </button>

              {/* Generator options */}
              <div className="space-y-4 border-t border-[#3a3a3a] pt-4">
                <p className="text-xs text-gray-500 uppercase tracking-widest">Generator options</p>

                {/* Length slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-300" htmlFor="password-length">
                      Password Length
                    </label>
                    <span className="text-sm font-bold text-primary">{length}</span>
                  </div>
                  <input
                    className="w-full h-2 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer accent-primary border border-[#444]"
                    id="password-length"
                    max={64}
                    min={8}
                    type="range"
                    value={length}
                    onChange={e => { setIsManual(false); setLength(Number(e.target.value)); }}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>8</span><span>64</span>
                  </div>
                </div>

                {/* Custom circular checkboxes */}
                <CustomCheckbox checked={opts.upper} onChange={() => { setIsManual(false); toggleOpt('upper'); }} label="Include Uppercase (A-Z)" />
                <CustomCheckbox checked={opts.lower} onChange={() => { setIsManual(false); toggleOpt('lower'); }} label="Include Lowercase (a-z)" />
                <CustomCheckbox checked={opts.numbers} onChange={() => { setIsManual(false); toggleOpt('numbers'); }} label="Include Numbers (0-9)" />
                <CustomCheckbox checked={opts.special} onChange={() => { setIsManual(false); toggleOpt('special'); }} label="Include Symbols (!@#$…)" />
              </div>
            </div>

            {/* ══ Link Website Panel ══ */}
            <div className="bg-[#2a2a2a] p-6 rounded-xl shadow-lg border border-[#3a3a3a]">
              <h2 className="text-2xl font-bold mb-6 text-white">
                {editingId ? 'Edit Linked Website' : 'Link Website'}
              </h2>
              <form className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="website-url">Website URL / Name</label>
                  <div className="relative">
                    {iconUrl && (
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded bg-[#1a1a1a] flex items-center justify-center border border-[#444] pointer-events-none">
                        <img src={iconUrl} alt="favicon" className="w-5 h-5 rounded-sm" />
                      </div>
                    )}
                    <input
                      className={`form-input w-full rounded-lg border border-[#444] bg-[#1a1a1a] text-white h-14 placeholder:text-gray-500 p-4 ${iconUrl ? 'pl-14' : ''} text-base focus:border-primary focus:outline-none transition-all`}
                      id="website-url"
                      placeholder="e.g. github.com or My Server"
                      type="text"
                      value={urlInput}
                      onChange={e => setUrlInput(e.target.value)}
                    />
                  </div>
                  {urlInput.trim() !== '' && (
                    <p className="mt-2 text-xs text-gray-400">
                      Will be saved as: <span className="font-semibold text-white">{websiteName || urlInput}</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="username">Username / Email</label>
                  <input
                    className="form-input w-full rounded-lg border border-[#444] bg-[#1a1a1a] text-white h-14 placeholder:text-gray-500 p-4 text-base focus:border-primary focus:outline-none"
                    id="username"
                    placeholder="your.email@example.com"
                    type="text"
                    value={usernameInput}
                    onChange={e => setUsernameInput(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="notes">Notes (Optional)</label>
                  <textarea
                    className="form-textarea w-full rounded-lg border border-[#444] bg-[#1a1a1a] text-white placeholder:text-gray-500 p-4 text-base focus:border-primary focus:outline-none"
                    id="notes"
                    placeholder="Add any additional notes here..."
                    rows={4}
                    value={notesInput}
                    onChange={e => setNotesInput(e.target.value)}
                  />
                </div>
              </form>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-8 flex justify-end space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="h-12 px-6 bg-[#3a3a3a] text-white font-bold rounded-lg hover:bg-[#444] transition-colors"
            >
              Cancel
            </button>
            <button onClick={handleSave} className="h-12 px-6 bg-primary text-white font-bold rounded-lg hover:bg-red-700 transition-colors">
              {editingId ? 'Update Password' : 'Save'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
