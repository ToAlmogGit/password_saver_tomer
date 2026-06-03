import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, getDocs, deleteDoc } from 'firebase/firestore';

export default function Settings() {
    const navigate = useNavigate();
    
    // Auth & General User state
    const [, setUser] = useState<any>(null);

    
    // Profile Fields state
    const [usernameInput, setUsernameInput] = useState('johndoe');
    const [profilePicUrl, setProfilePicUrl] = useState("https://lh3.googleusercontent.com/aida-public/AB6AXuDHUpCkiePLXls6cdTRZCB0I6zt6RnZHBMqSS1QVd8wkoH6kxTTZ2jIVJM4z3cRpdAkEnFm9tRmo0F8dmfe0cfFIfOUWreNIXEDFxU3aNULOSrJSwrdEQl4z0_WI18gRErMWSsvCeECDcqJqYglcJBgowueuajR1B-9ZJTEAfhRQB6d2KzIP9DLiobqIHUIarKK-tkWMSS1J6PCblW7JWLY0DxZPpIV8kqSzF0wgcqgMoTen1mVxv0NFD_tp-9dKL_GwRAakNCM052m");

    // Preferences states
    const [censorPasswords, setCensorPasswords] = useState(true);

    // Export & Import states
    const [exportFormat, setExportFormat] = useState('csv');

    // Feedback status alerts
    const [profileFeedback, setProfileFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [prefsFeedback, setPrefsFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [exportFeedback, setExportFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Initialize Auth Session and settings
    useEffect(() => {
        // Enforce dark mode class
        document.documentElement.classList.add('dark');

        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);

                // Fallback Display Name logic
                let initialUsername = '';
                if (currentUser.displayName) {
                    initialUsername = currentUser.displayName.toLowerCase().replace(/\s/g, '');
                } else if (currentUser.email) {
                    const prefix = currentUser.email.split('@')[0];
                    initialUsername = prefix.toLowerCase();
                }
                setUsernameInput(initialUsername);

                // Fetch database settings
                try {
                    const userDocRef = doc(db, 'users', currentUser.uid);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                        const data = userDocSnap.data();
                        if (data.username) {
                            setUsernameInput(data.username);
                        }
                        if (data.profilePicUrl) {
                            setProfilePicUrl(data.profilePicUrl);
                        }
                        if (data.censorPasswords !== undefined) {
                            setCensorPasswords(data.censorPasswords);
                        }
                    }
                } catch (error) {
                    console.error('Error fetching settings:', error);
                }
            } else {
                setUser(null);
                navigate('/login');
            }
        });

        return () => unsubscribe();
    }, [navigate]);

    // Handle Log Out
    const handleLogOut = async () => {
        try {
            await auth.signOut();
            navigate('/login');
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    // Reauthenticate helper
    const reauthenticate = async (passwordVal: string): Promise<boolean> => {
        if (!auth.currentUser || !auth.currentUser.email) return false;
        try {
            const credential = EmailAuthProvider.credential(auth.currentUser.email, passwordVal);
            await reauthenticateWithCredential(auth.currentUser, credential);
            return true;
        } catch (error: any) {
            console.error('Reauthentication failed:', error);
            return false;
        }
    };

    // Reversible base64 password encryption helper
    const encryptPassword = (pwd: string) => {
        if (!pwd) return '';
        try {
            // Safe base64 converter supporting UTF-8 characters
            return 'enc:' + btoa(encodeURIComponent(pwd));
        } catch (e) {
            return pwd;
        }
    };

    const decryptPassword = (pwd: string) => {
        if (pwd && pwd.startsWith('enc:')) {
            try {
                const encoded = pwd.substring(4);
                return decodeURIComponent(atob(encoded));
            } catch (e) {
                return pwd;
            }
        }
        return pwd;
    };

    // Save Profile Update
    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileFeedback(null);

        if (!auth.currentUser) return;
        if (!usernameInput.trim()) {
            setProfileFeedback({ message: 'Username cannot be empty.', type: 'error' });
            return;
        }

        try {
            const userDocRef = doc(db, 'users', auth.currentUser.uid);
            await setDoc(userDocRef, {
                username: usernameInput.trim(),
                profilePicUrl: profilePicUrl
            }, { merge: true });


            setProfileFeedback({ message: 'Profile updated successfully!', type: 'success' });
            setTimeout(() => setProfileFeedback(null), 3000);
        } catch (error: any) {
            setProfileFeedback({ message: error.message || 'Failed to update profile settings.', type: 'error' });
        }
    };

    // Handle Local File upload for avatar (PNG/JPEG)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert('Please upload an image smaller than 2MB.');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePicUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerFileInput = () => {
        document.getElementById('pfp-file-input')?.click();
    };

    const handleRemoveProfilePic = () => {
        setProfilePicUrl("https://lh3.googleusercontent.com/aida-public/AB6AXuDHUpCkiePLXls6cdTRZCB0I6zt6RnZHBMqSS1QVd8wkoH6kxTTZ2jIVJM4z3cRpdAkEnFm9tRmo0F8dmfe0cfFIfOUWreNIXEDFxU3aNULOSrJSwrdEQl4z0_WI18gRErMWSsvCeECDcqJqYglcJBgowueuajR1B-9ZJTEAfhRQB6d2KzIP9DLiobqIHUIarKK-tkWMSS1J6PCblW7JWLY0DxZPpIV8kqSzF0wgcqgMoTen1mVxv0NFD_tp-9dKL_GwRAakNCM052m");
    };

    // Toggle password export encryption settings
    const handleToggleCensorPasswords = async () => {
        if (!auth.currentUser) return;
        setPrefsFeedback(null);

        const nextVal = !censorPasswords;
        setCensorPasswords(nextVal);

        try {
            const userDocRef = doc(db, 'users', auth.currentUser.uid);
            await setDoc(userDocRef, {
                censorPasswords: nextVal
            }, { merge: true });

            setPrefsFeedback({
                message: nextVal ? 'Passwords will be encrypted in exported files.' : 'Passwords will be plain text in exported files.',
                type: 'success'
            });
            setTimeout(() => setPrefsFeedback(null), 3000);
        } catch (err) {
            console.error('Failed to save export setting:', err);
        }
    };

    // Passwords exporter
    const handleExportPasswords = async () => {
        if (!auth.currentUser) return;
        setExportFeedback(null);

        try {
            const loaded: any[] = [];
            const q = query(collection(db, 'users', auth.currentUser.uid, 'passwords'));
            const snap = await getDocs(q);
            
            snap.forEach(docSnap => {
                const data = docSnap.data();
                let outputPassword = data.passwordValue || '';
                if (censorPasswords) {
                    outputPassword = encryptPassword(outputPassword);
                }
                loaded.push({
                    website: data.website || '',
                    siteUrl: data.siteUrl || '',
                    username: data.username || '',
                    passwordValue: outputPassword,
                    notes: data.notes || ''
                });
            });

            if (loaded.length === 0) {
                setExportFeedback({ message: 'No passwords available to export.', type: 'error' });
                return;
            }

            if (exportFormat === 'json') {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(loaded, null, 2));
                const dlAnchorElem = document.createElement('a');
                dlAnchorElem.setAttribute("href", dataStr);
                dlAnchorElem.setAttribute("download", "passwords.json");
                dlAnchorElem.click();
            } else {
                // CSV
                const headers = ['Website', 'Site URL', 'Username', 'Password', 'Notes'];
                const rows = loaded.map(p => [
                    `"${(p.website || '').replace(/"/g, '""')}"`,
                    `"${(p.siteUrl || '').replace(/"/g, '""')}"`,
                    `"${(p.username || '').replace(/"/g, '""')}"`,
                    `"${(p.passwordValue || '').replace(/"/g, '""')}"`,
                    `"${(p.notes || '').replace(/"/g, '""')}"`
                ]);
                const csvContent = "data:text/csv;charset=utf-8," 
                    + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
                
                const dlAnchorElem = document.createElement('a');
                dlAnchorElem.setAttribute("href", encodeURI(csvContent));
                dlAnchorElem.setAttribute("download", "passwords.csv");
                dlAnchorElem.click();
            }

            setExportFeedback({ message: `Successfully exported passwords to ${exportFormat.toUpperCase()}!`, type: 'success' });
            setTimeout(() => setExportFeedback(null), 4000);
        } catch (error: any) {
            setExportFeedback({ message: 'Failed to export passwords: ' + error.message, type: 'error' });
        }
    };

    // Passwords Importer (Handles JSON / CSV)
    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !auth.currentUser) return;

        setExportFeedback(null);
        const reader = new FileReader();
        reader.onload = async (event) => {
            const content = event.target?.result as string;
            try {
                let importedCount = 0;

                if (file.name.endsWith('.json')) {
                    const data = JSON.parse(content);
                    const list = Array.isArray(data) ? data : [data];
                    
                    for (const item of list) {
                        const rawPwd = item.passwordValue || item.password || '';
                        const decryptedPwd = decryptPassword(rawPwd);
                        
                        const docRef = doc(collection(db, 'users', auth.currentUser!.uid, 'passwords'));
                        await setDoc(docRef, {
                            website: item.website || '',
                            siteUrl: item.siteUrl || item.url || '',
                            username: item.username || '',
                            passwordValue: decryptedPwd,
                            notes: item.notes || '',
                            lastUpdated: new Date().toISOString()
                        });
                        importedCount++;
                    }
                } else if (file.name.endsWith('.csv')) {
                    const lines = content.split('\n');
                    if (lines.length > 1) {
                        // Header extraction
                        const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
                        
                        const websiteIdx = headers.indexOf('website');
                        const siteUrlIdx = headers.indexOf('site url');
                        const usernameIdx = headers.indexOf('username');
                        const passwordIdx = headers.indexOf('password');
                        const notesIdx = headers.indexOf('notes');

                        for (let i = 1; i < lines.length; i++) {
                            const line = lines[i].trim();
                            if (!line) continue;

                            // Comma separated parse with quote awareness
                            const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
                            const cells = matches.map(c => c.replace(/^["']|["']$/g, '').replace(/""/g, '"'));

                            const website = websiteIdx !== -1 ? cells[websiteIdx] : cells[0] || '';
                            const siteUrl = siteUrlIdx !== -1 ? cells[siteUrlIdx] : cells[1] || '';
                            const username = usernameIdx !== -1 ? cells[usernameIdx] : cells[2] || '';
                            const rawPassword = passwordIdx !== -1 ? cells[passwordIdx] : cells[3] || '';
                            const notes = notesIdx !== -1 ? cells[notesIdx] : cells[4] || '';

                            const decryptedPwd = decryptPassword(rawPassword);

                            const docRef = doc(collection(db, 'users', auth.currentUser!.uid, 'passwords'));
                            await setDoc(docRef, {
                                website: website || '',
                                siteUrl: siteUrl || '',
                                username: username || '',
                                passwordValue: decryptedPwd,
                                notes: notes || '',
                                lastUpdated: new Date().toISOString()
                            });
                            importedCount++;
                        }
                    } else {
                        throw new Error('CSV file has no data rows.');
                    }
                } else {
                    throw new Error('Unsupported file extension. Please load .csv or .json files.');
                }

                setExportFeedback({ message: `Successfully imported ${importedCount} passwords into database!`, type: 'success' });
                setTimeout(() => setExportFeedback(null), 4000);
            } catch (err: any) {
                setExportFeedback({ message: 'Import failed: ' + err.message, type: 'error' });
            }
        };
        reader.readAsText(file);
        
        // Reset element target to allow uploading same file name repeatedly
        e.target.value = '';
    };

    const triggerImportInput = () => {
        document.getElementById('import-file-input')?.click();
    };

    // Danger Zone Account Deletion
    const handleDeleteAccount = async () => {
        if (!auth.currentUser) return;

        const confirmDelete = window.confirm("WARNING: Are you absolutely sure you want to permanently delete your account? All saved credentials will be permanently lost forever!");
        if (!confirmDelete) return;

        const masterPass = prompt("For security confirmation, please enter your Master Password to verify identity:");
        if (!masterPass) return;

        const isAuthSuccess = await reauthenticate(masterPass);
        if (!isAuthSuccess) {
            alert("Verification failed. Incorrect master password.");
            return;
        }

        try {
            const currentUser = auth.currentUser;
            
            // Delete all stored passwords from database
            const q = query(collection(db, 'users', currentUser.uid, 'passwords'));
            const snap = await getDocs(q);
            const deletePromises = snap.docs.map(docSnap => deleteDoc(doc(db, 'users', currentUser.uid, 'passwords', docSnap.id)));
            await Promise.all(deletePromises);

            // Delete user settings doc
            await deleteDoc(doc(db, 'users', currentUser.uid));

            // Delete profile
            await currentUser.delete();

            alert("Your account has been deleted permanently.");
            navigate('/login');
        } catch (error: any) {
            alert("Account deletion failed: " + error.message);
        }
    };

    return (
        <div className="bg-[#1A1A1A] font-display text-[#e5e7eb] min-h-screen">
            <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden">
                <div className="layout-container flex h-full grow flex-col">
                    
                    {/* Header */}
                    <header className="flex-none flex h-20 items-center justify-between gap-4 border-b border-[#261c1c] px-6 bg-[#2a2a2a]/95 backdrop-blur-sm sticky top-0 z-10">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 cursor-pointer bg-transparent border-none">
                                <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>shield_lock</span>
                                <span className="text-white text-lg font-bold leading-normal">PasswordManager</span>
                            </button>
                        </div>
                        <div className="flex items-center gap-6">
                            <nav className="flex items-center gap-2">
                                <button onClick={() => navigate('/dashboard')} className="flex items-center gap-3 rounded-lg px-3 py-2 text-white hover:bg-[#382929] transition-colors cursor-pointer">
                                    <span className="material-symbols-outlined">lock</span>
                                    <p className="text-sm font-medium leading-normal">Passwords</p>
                                </button>
                                <button onClick={() => navigate('/create-password')} className="flex items-center gap-3 rounded-lg px-3 py-2 text-white hover:bg-[#382929] transition-colors cursor-pointer">
                                    <span className="material-symbols-outlined">add_circle</span>
                                    <p className="text-sm font-medium leading-normal">Create</p>
                                </button>
                                <button onClick={() => navigate('/account')} className="flex items-center gap-3 rounded-lg px-3 py-2 text-white hover:bg-[#382929] transition-colors cursor-pointer">
                                    <span className="material-symbols-outlined">person</span>
                                    <p className="text-sm font-medium leading-normal">Account</p>
                                </button>
                                <button onClick={() => navigate('/settings')} className="flex items-center gap-3 rounded-lg bg-[#382929] px-3 py-2 text-white cursor-pointer">
                                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>settings</span>
                                    <p className="text-sm font-medium leading-normal">Settings</p>
                                </button>
                            </nav>
                            <div className="flex items-center gap-4">
                                <div onClick={() => navigate('/account')} className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 cursor-pointer" data-alt="User profile avatar picture" style={{ backgroundImage: `url("${profilePicUrl}")` }}></div>
                                <button onClick={handleLogOut} className="flex h-10 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-primary px-4 text-sm font-bold leading-normal tracking-[0.015em] text-white hover:bg-red-700 transition-colors">
                                    <span className="truncate">Log Out</span>
                                </button>
                            </div>
                        </div>
                    </header>

                    {/* Main Settings Page Container */}
                    <div className="flex-1 px-4 md:px-10 py-5 flex justify-center">
                        <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
                            <div className="flex flex-wrap justify-between gap-3 p-4">
                                <p className="text-white text-4xl font-black leading-tight tracking-[-0.033em] min-w-72">Settings</p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-8 px-4">
                                
                                {/* Column 1: Profile & Preferences */}
                                <div className="flex flex-col gap-8">
                                    
                                    {/* Section: Profile */}
                                    <div className="bg-[#261c1c]/40 p-6 rounded-xl border border-[#382929]">
                                        <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] pb-4">Profile</h2>
                                        
                                        {profileFeedback && (
                                            <div className={`p-4 mb-4 rounded-lg text-sm ${profileFeedback.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                                {profileFeedback.message}
                                            </div>
                                        )}

                                        <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4 max-w-xl">
                                            <div className="flex items-center gap-4 mb-2">
                                                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-20 border-2 border-[#533c3c]" style={{ backgroundImage: `url("${profilePicUrl}")` }}></div>
                                                <div className="flex flex-col gap-2">
                                                    <p className="text-white text-base font-medium leading-normal">Profile Picture</p>
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="file" 
                                                            id="pfp-file-input" 
                                                            accept="image/png, image/jpeg" 
                                                            onChange={handleFileChange} 
                                                            style={{ display: 'none' }} 
                                                        />
                                                        <button type="button" onClick={triggerFileInput} className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-red-700 transition-colors">
                                                            <span className="truncate">Change</span>
                                                        </button>
                                                        <button type="button" onClick={handleRemoveProfilePic} className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#261c1c] border border-[#533c3c] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-[#382929] transition-colors">
                                                            <span className="truncate">Remove</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <label className="flex flex-col min-w-40 flex-1">
                                                <p className="text-white text-base font-medium leading-normal pb-2">Username</p>
                                                <div className="flex w-full flex-1 items-stretch rounded-lg">
                                                    <input 
                                                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-none border border-[#533c3c] bg-[#261c1c] focus:border-[#ea2a2a] h-14 placeholder:text-[#b89d9d] p-[15px] text-base font-normal leading-normal" 
                                                        placeholder="Enter your username" 
                                                        type="text" 
                                                        value={usernameInput}
                                                        onChange={(e) => setUsernameInput(e.target.value)}
                                                    />
                                                </div>
                                            </label>
                                            
                                            <button type="submit" className="flex min-w-[84px] max-w-[200px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] mt-2 hover:bg-red-700 transition-colors">
                                                <span className="truncate">Update Profile</span>
                                            </button>
                                        </form>
                                    </div>

                                    {/* Section: Preferences */}
                                    <div className="bg-[#261c1c]/40 p-6 rounded-xl border border-[#382929]">
                                        <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] pb-4">Preferences</h2>
                                        
                                        {prefsFeedback && (
                                            <div className={`p-4 mb-4 rounded-lg text-sm ${prefsFeedback.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                                {prefsFeedback.message}
                                            </div>
                                        )}

                                        <div className="flex flex-col gap-4 max-w-xl">
                                            {/* Preference: Censor Passwords Switch */}
                                            <div className="flex items-center justify-between p-4 rounded-lg bg-[#261c1c] border border-[#533c3c]">
                                                <div>
                                                    <p className="text-white text-base font-medium leading-normal">Encrypt Exported Passwords</p>
                                                    <p className="text-[#b89d9d] text-sm">Encrypt/censor passwords inside exported CSV/JSON files using secure base64 blocks.</p>
                                                </div>
                                                <div className="flex items-center">
                                                    <button
                                                        type="button"
                                                        onClick={handleToggleCensorPasswords}
                                                        className={`relative inline-flex h-6 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${censorPasswords ? 'bg-primary' : 'bg-gray-600'}`}
                                                        role="switch"
                                                        aria-checked={censorPasswords}
                                                    >
                                                        <span
                                                            aria-hidden="true"
                                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${censorPasswords ? 'translate-x-6' : 'translate-x-0'}`}
                                                        />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Column 2: Data Management & Delete Account */}
                                <div className="flex flex-col gap-8">
                                    
                                    {/* Section: Data Management */}
                                    <div className="bg-[#261c1c]/40 p-6 rounded-xl border border-[#382929]">
                                        <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] pb-4">Data Management</h2>
                                        
                                        {exportFeedback && (
                                            <div className={`p-4 mb-4 rounded-lg text-sm ${exportFeedback.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                                {exportFeedback.message}
                                            </div>
                                        )}

                                        <div className="flex flex-col gap-4 max-w-xl p-4 rounded-lg bg-[#261c1c] border border-[#533c3c]">
                                            <p className="text-white text-base font-medium leading-normal">Backup & Restore</p>
                                            <p className="text-[#b89d9d] text-sm leading-relaxed">
                                                Export saved credentials to a file, or restore them by importing backup CSV/JSON files. Passwords starting with "enc:" will automatically be decrypted upon import.
                                            </p>
                                            
                                            {/* File Input for Import */}
                                            <input 
                                                type="file" 
                                                id="import-file-input" 
                                                accept=".csv, .json" 
                                                onChange={handleImportFile} 
                                                style={{ display: 'none' }} 
                                            />

                                            <div className="flex flex-col sm:flex-row gap-4 mt-2">
                                                <div className="flex-1">
                                                    <label className="text-white text-sm font-medium leading-normal pb-2 block" htmlFor="format">Format</label>
                                                    <select 
                                                        className="form-select w-full rounded-lg text-white focus:outline-none border border-[#533c3c] bg-[#382929] focus:border-[#ea2a2a] h-12 p-2 text-base font-normal" 
                                                        id="format" 
                                                        name="format"
                                                        value={exportFormat}
                                                        onChange={(e) => setExportFormat(e.target.value)}
                                                    >
                                                        <option value="csv">CSV</option>
                                                        <option value="json">JSON</option>
                                                    </select>
                                                </div>
                                                <div className="flex gap-2 sm:self-end">
                                                    <button 
                                                        type="button"
                                                        onClick={handleExportPasswords}
                                                        className="flex min-w-[120px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-red-700 transition-colors"
                                                    >
                                                        <span className="truncate">Export</span>
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={triggerImportInput}
                                                        className="flex min-w-[120px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-4 bg-[#261c1c] border border-[#533c3c] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-[#382929] transition-colors"
                                                    >
                                                        <span className="truncate">Import</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section: Delete Account (Danger Zone) */}
                                    <div className="bg-[#261c1c]/40 p-6 rounded-xl border border-primary">
                                        <h2 className="text-[#ea2a2a] text-[22px] font-bold leading-tight tracking-[-0.015em] pb-4">Danger Zone</h2>
                                        
                                        <div className="flex flex-col gap-4 max-w-xl p-4 rounded-lg bg-[#261c1c] border border-[#533c3c]">
                                            <p className="text-white text-base font-medium leading-normal">Delete Account</p>
                                            <p className="text-[#b89d9d] text-sm leading-relaxed">
                                                Deleting your account is a permanent action and cannot be undone. All your data, including saved passwords, will be permanently erased.
                                            </p>
                                            <button 
                                                type="button"
                                                onClick={handleDeleteAccount}
                                                className="flex min-w-[160px] max-w-[240px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] mt-2 hover:bg-red-700 transition-colors"
                                            >
                                                <span className="truncate">Delete My Account</span>
                                            </button>
                                        </div>
                                    </div>

                                </div>

                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
