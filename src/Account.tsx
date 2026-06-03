import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export default function Account() {
    const navigate = useNavigate();
    
    // User state
    const [, setUser] = useState<any>(null);
    const [userName, setUserName] = useState('John Doe');
    const [userEmail, setUserEmail] = useState('');
    const [profilePicUrl, setProfilePicUrl] = useState("https://lh3.googleusercontent.com/aida-public/AB6AXuDHUpCkiePLXls6cdTRZCB0I6zt6RnZHBMqSS1QVd8wkoH6kxTTZ2jIVJM4z3cRpdAkEnFm9tRmo0F8dmfe0cfFIfOUWreNIXEDFxU3aNULOSrJSwrdEQl4z0_WI18gRErMWSsvCeECDcqJqYglcJBgowueuajR1B-9ZJTEAfhRQB6d2KzIP9DLiobqIHUIarKK-tkWMSS1J6PCblW7JWLY0DxZPpIV8kqSzF0wgcqgMoTen1mVxv0NFD_tp-9dKL_GwRAakNCM052m");
    
    // Form states - Password
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    
    // Visibility toggles
    const [showCurrentPass, setShowCurrentPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);
    
    // Contact Info States
    const [emailInput, setEmailInput] = useState('');

    // Feedback message states
    const [passwordFeedback, setPasswordFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [emailFeedback, setEmailFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Authentication State Watcher
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                setUserEmail(currentUser.email || '');
                setEmailInput(currentUser.email || '');

                // Guess username from email prefix or custom name
                if (currentUser.displayName) {
                    setUserName(currentUser.displayName);
                } else if (currentUser.email) {
                    const prefix = currentUser.email.split('@')[0];
                    setUserName(prefix.charAt(0).toUpperCase() + prefix.slice(1));
                }

                // Fetch Firestore settings
                try {
                    const userDocRef = doc(db, 'users', currentUser.uid);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                        const data = userDocSnap.data();
                        if (data.username) {
                            setUserName(data.username.charAt(0).toUpperCase() + data.username.slice(1));
                        }
                        if (data.profilePicUrl) {
                            setProfilePicUrl(data.profilePicUrl);
                        }

                    }
                } catch (error) {
                    console.error('Error fetching security settings:', error);
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

    // Update Password Handler
    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordFeedback(null);

        if (!currentPassword) {
            setPasswordFeedback({ message: 'Current password is required.', type: 'error' });
            return;
        }
        if (!newPassword || !confirmNewPassword) {
            setPasswordFeedback({ message: 'New passwords cannot be empty.', type: 'error' });
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setPasswordFeedback({ message: 'New passwords do not match.', type: 'error' });
            return;
        }
        if (newPassword.length < 6) {
            setPasswordFeedback({ message: 'Password must be at least 6 characters.', type: 'error' });
            return;
        }

        const isAuthSuccess = await reauthenticate(currentPassword);
        if (!isAuthSuccess) {
            setPasswordFeedback({ message: 'Reauthentication failed. Verify your current master password.', type: 'error' });
            return;
        }

        try {
            if (auth.currentUser) {
                await updatePassword(auth.currentUser, newPassword);
                setPasswordFeedback({ message: 'Master password updated successfully!', type: 'success' });
                setCurrentPassword('');
                setNewPassword('');
                setConfirmNewPassword('');
            }
        } catch (error: any) {
            setPasswordFeedback({ message: error.message || 'Failed to update master password.', type: 'error' });
        }
    };

    // Update Email Handler
    const handleUpdateEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailFeedback(null);

        if (!emailInput || emailInput === userEmail) {
            setEmailFeedback({ message: 'Please specify a new and unique email address.', type: 'error' });
            return;
        }

        // Ask for master password to perform action
        const masterPass = prompt('For security reasons, please enter your current Master Password to confirm this email change:');
        if (!masterPass) {
            setEmailFeedback({ message: 'Master Password verification is required to change email.', type: 'error' });
            return;
        }

        const isAuthSuccess = await reauthenticate(masterPass);
        if (!isAuthSuccess) {
            setEmailFeedback({ message: 'Verification failed. Incorrect master password.', type: 'error' });
            return;
        }

        try {
            if (auth.currentUser) {
                // Update authentication email
                await updateEmail(auth.currentUser, emailInput);
                
                // Keep Firestore users record in sync
                const userDocRef = doc(db, 'users', auth.currentUser.uid);
                await updateDoc(userDocRef, {
                    email: emailInput
                }).catch(() => {
                    // Fallback to setDoc in case document doesn't exist
                    setDoc(userDocRef, { email: emailInput }, { merge: true });
                });

                setUserEmail(emailInput);
                setEmailFeedback({ message: 'Email address updated successfully!', type: 'success' });
            }
        } catch (error: any) {
            setEmailFeedback({ message: error.message || 'Failed to update email address.', type: 'error' });
        }
    };


    return (
        <div className="bg-[#1A1A1A] font-display text-[#e5e7eb] min-h-screen">
            <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden">
                <div className="layout-container flex h-full grow flex-col">
                    {/* Header */}
                    <header className="flex-none flex h-20 items-center justify-between gap-4 border-b border-[#261c1c] px-6 bg-[#2a2a2a]/95 backdrop-blur-sm sticky top-0 z-10">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" data-alt="User profile picture" style={{ backgroundImage: `url("${profilePicUrl}")` }}></div>
                                <div className="flex flex-col">
                                    <h1 className="text-white text-base font-medium leading-normal">{userName}</h1>
                                    <p className="text-[#b89d9d] text-sm font-normal leading-normal">{userEmail}</p>
                                </div>
                            </div>
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
                                <button onClick={() => navigate('/account')} className="flex items-center gap-3 rounded-lg bg-[#382929] px-3 py-2 text-white cursor-pointer">
                                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                                    <p className="text-sm font-medium leading-normal">Account</p>
                                </button>
                                <button onClick={() => navigate('/settings')} className="flex items-center gap-3 rounded-lg px-3 py-2 text-white hover:bg-[#382929] transition-colors cursor-pointer">
                                    <span className="material-symbols-outlined">settings</span>
                                    <p className="text-sm font-medium leading-normal">Settings</p>
                                </button>
                            </nav>
                            <button onClick={handleLogOut} className="flex h-10 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-primary px-4 text-sm font-bold leading-normal tracking-[0.015em] text-white hover:bg-red-700 transition-colors">
                                <span className="truncate">Log Out</span>
                            </button>
                        </div>
                    </header>

                    {/* Main Content Area */}
                    <div className="flex-1 px-4 md:px-10 py-5 flex justify-center">
                        <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
                            <div className="flex flex-wrap justify-between gap-3 p-4">
                                <p className="text-white text-4xl font-black leading-tight tracking-[-0.033em] min-w-72">Account Settings</p>
                            </div>

                            {/* Section: Change Master Password */}
                            <div className="mt-8 px-4">
                                <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] pb-3 pt-5">Change Master Password</h2>
                                
                                {passwordFeedback && (
                                    <div className={`p-4 mb-4 rounded-lg text-sm ${passwordFeedback.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                        {passwordFeedback.message}
                                    </div>
                                )}

                                <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4 max-w-xl">
                                    <label className="flex flex-col min-w-40 flex-1">
                                        <p className="text-white text-base font-medium leading-normal pb-2">Current Master Password</p>
                                        <div className="flex w-full flex-1 items-stretch rounded-lg">
                                            <input 
                                                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-none border border-[#533c3c] bg-[#261c1c] focus:border-[#ea2a2a] h-14 placeholder:text-[#b89d9d] p-[15px] rounded-r-none border-r-0 text-base font-normal leading-normal" 
                                                placeholder="Enter your current master password" 
                                                type={showCurrentPass ? 'text' : 'password'}
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setShowCurrentPass(!showCurrentPass)}
                                                className="text-[#b89d9d] flex border border-[#533c3c] bg-[#261c1c] items-center justify-center pr-[15px] rounded-r-lg border-l-0 cursor-pointer hover:text-white"
                                            >
                                                <span className="material-symbols-outlined">
                                                    {showCurrentPass ? 'visibility' : 'visibility_off'}
                                                </span>
                                            </button>
                                        </div>
                                    </label>

                                    <label className="flex flex-col min-w-40 flex-1">
                                        <p className="text-white text-base font-medium leading-normal pb-2">New Master Password</p>
                                        <div className="flex w-full flex-1 items-stretch rounded-lg">
                                            <input 
                                                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-none border border-[#533c3c] bg-[#261c1c] focus:border-[#ea2a2a] h-14 placeholder:text-[#b89d9d] p-[15px] rounded-r-none border-r-0 text-base font-normal leading-normal" 
                                                placeholder="Enter your new master password" 
                                                type={showNewPass ? 'text' : 'password'}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setShowNewPass(!showNewPass)}
                                                className="text-[#b89d9d] flex border border-[#533c3c] bg-[#261c1c] items-center justify-center pr-[15px] rounded-r-lg border-l-0 cursor-pointer hover:text-white"
                                            >
                                                <span className="material-symbols-outlined">
                                                    {showNewPass ? 'visibility' : 'visibility_off'}
                                                </span>
                                            </button>
                                        </div>
                                    </label>

                                    <label className="flex flex-col min-w-40 flex-1">
                                        <p className="text-white text-base font-medium leading-normal pb-2">Confirm New Master Password</p>
                                        <div className="flex w-full flex-1 items-stretch rounded-lg">
                                            <input 
                                                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-none border border-[#533c3c] bg-[#261c1c] focus:border-[#ea2a2a] h-14 placeholder:text-[#b89d9d] p-[15px] rounded-r-none border-r-0 text-base font-normal leading-normal" 
                                                placeholder="Confirm your new master password" 
                                                type={showConfirmPass ? 'text' : 'password'}
                                                value={confirmNewPassword}
                                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setShowConfirmPass(!showConfirmPass)}
                                                className="text-[#b89d9d] flex border border-[#533c3c] bg-[#261c1c] items-center justify-center pr-[15px] rounded-r-lg border-l-0 cursor-pointer hover:text-white"
                                            >
                                                <span className="material-symbols-outlined">
                                                    {showConfirmPass ? 'visibility' : 'visibility_off'}
                                                </span>
                                            </button>
                                        </div>
                                    </label>

                                    <button type="submit" className="flex min-w-[84px] max-w-[200px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] mt-2 hover:bg-red-700 transition-colors">
                                        <span className="truncate">Update Password</span>
                                    </button>
                                </form>
                            </div>

                            {/* Section: Update Contact Details */}
                            <div className="mt-8 px-4">
                                <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] pb-3 pt-5">Update Contact Details</h2>
                                
                                {emailFeedback && (
                                    <div className={`p-4 mb-4 max-w-xl rounded-lg text-sm ${emailFeedback.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                        {emailFeedback.message}
                                    </div>
                                )}

                                <form onSubmit={handleUpdateEmail} className="flex flex-col gap-4 max-w-xl">
                                    <label className="flex flex-col min-w-40 flex-1">
                                        <p className="text-white text-base font-medium leading-normal pb-2">Email Address</p>
                                        <div className="flex w-full flex-1 items-stretch rounded-lg">
                                            <input 
                                                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-none border border-[#533c3c] bg-[#261c1c] focus:border-[#ea2a2a] h-14 placeholder:text-[#b89d9d] p-[15px] text-base font-normal leading-normal" 
                                                placeholder="your.email@example.com" 
                                                type="email" 
                                                value={emailInput}
                                                onChange={(e) => setEmailInput(e.target.value)}
                                            />
                                        </div>
                                    </label>
                                    <button type="submit" className="flex min-w-[84px] max-w-[200px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] mt-2 hover:bg-red-700 transition-colors">
                                        <span className="truncate">Update Email</span>
                                    </button>
                                </form>
                            </div>



                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
