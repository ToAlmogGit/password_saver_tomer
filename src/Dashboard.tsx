import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { collection, query, onSnapshot, deleteDoc, doc, getDoc } from 'firebase/firestore';

type PasswordEntry = {
    id: string;
    website: string;
    username: string;
    lastUpdated: string;
    iconUrl: string;
    passwordValue: string;
    notes?: string;
    siteUrl?: string;
};



export default function Dashboard() {
    const navigate = useNavigate();
    const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
    const [profilePicUrl, setProfilePicUrl] = useState("https://lh3.googleusercontent.com/aida-public/AB6AXuC3jY4BA5fmvrr1LrYiTlkMe-It5K2k_cOzhcIeNQ2JfoMn1f-wyZJmVMXnjnEoLFDRtXz6bgMlicSNT_rzsPcY5QPfdaHDwD9Abdwf6mGoo7gCrNAMCUEhmA-WuJgpd3A-wupRoHuIIZlNtOTcFq2T1ADFObbpfN0hvvZU3OrbFu2lS0byA-60PnMnL9aisNgo95Tt-owO-ckS2PWE6A5Ta-lJmQvFSNExT8cl3ICyDHZIWZj_Zn__OBfMK42Ii2auFFq6SJhRoVvs");

    useEffect(() => {
        let unsubscribeSnap: () => void;

        const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
            if (user) {
                // Fetch profile image
                try {
                    const userDocRef = doc(db, 'users', user.uid);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists() && userDocSnap.data().profilePicUrl) {
                        setProfilePicUrl(userDocSnap.data().profilePicUrl);
                    }
                } catch (e) {
                    console.error('Error loading custom avatar:', e);
                }
                const q = query(collection(db, 'users', user.uid, 'passwords'));
                unsubscribeSnap = onSnapshot(q, (snapshot) => {
                    const loaded: PasswordEntry[] = [];
                    snapshot.forEach((docSnap) => {
                        const data = docSnap.data();
                        const timestamp = data.updatedAt || data.createdAt;
                        loaded.push({
                            id: docSnap.id,
                            website: data.website || 'Unknown',
                            username: data.username || '',
                            lastUpdated: timestamp?.toDate ? timestamp.toDate().toLocaleDateString() : 'Just now',
                            iconUrl: data.iconUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAFhXIMKZ0JbY-3GQ8yP45MVaXCfbZJGVmYtlxR3DaYUpj8LcK4z388lv6oQZ10V2wUvZIwNe0mkMSoHVc-4LdpU8qB8qdi3gE4zFSAQr6OFRBuA0W_zYSLXMuVXkwLeOKw6fv0O5YAKbAy8Lkxsmg46FKAe3dYwbd5_yypgHZInWp9RyD7DOAn1M9ca_l9-TC9cL5F0uQVN0iZS_ohL4HyryUvlpc75xGBguDtOcRpjOEZZ20lVOA6nOUb4k3rOR1PlOsFoT1wIAXv',
                            passwordValue: data.passwordValue || '',
                            notes: data.notes || '',
                            siteUrl: data.siteUrl || data.website || ''
                        });
                    });
                    setPasswords(loaded);
                });
            } else {
                setPasswords([]);
                navigate('/login');
            }
        });

        return () => {
            if (unsubscribeSnap) unsubscribeSnap();
            unsubscribeAuth();
        };
    }, [navigate]);
    const [selectedPassword, setSelectedPassword] = useState<PasswordEntry | null>(null);
    const [passwordToDelete, setPasswordToDelete] = useState<PasswordEntry | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = () => {
        if (!selectedPassword) return;
        navigator.clipboard.writeText(selectedPassword.passwordValue);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 800);
    };

    const sortedPasswords = useMemo(() => {
        if (!searchQuery) return passwords;

        const query = searchQuery.toLowerCase();

        return [...passwords].sort((a, b) => {
            const aNameMatch = a.website.toLowerCase().includes(query);
            const bNameMatch = b.website.toLowerCase().includes(query);
            const aUserMatch = a.username.toLowerCase().includes(query);
            const bUserMatch = b.username.toLowerCase().includes(query);

            const aMatch = aNameMatch || aUserMatch;
            const bMatch = bNameMatch || bUserMatch;

            // Prioritize matching items
            if (aMatch && !bMatch) return -1;
            if (!aMatch && bMatch) return 1;

            // Within matching items, prioritize name starts-with
            const aStartsWith = a.website.toLowerCase().startsWith(query);
            const bStartsWith = b.website.toLowerCase().startsWith(query);

            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;

            return 0; // maintain original relative order
        });
    }, [searchQuery, passwords]);

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-[#e5e7eb] min-h-screen">
            <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden">
                <div className="layout-container flex h-full grow flex-col">
                    <div className="px-4 md:px-10 lg:px-40 flex flex-1 justify-center py-5">
                        <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
                            <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-primary/30 px-4 sm:px-10 py-3">
                                <div className="flex items-center gap-4 text-white">
                                    <div className="size-6 text-primary">
                                        <span className="material-symbols-outlined text-4xl">
                                            shield_lock
                                        </span>
                                    </div>
                                    <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">Password Manager</h2>
                                </div>
                                <div className="hidden md:flex flex-1 justify-end gap-8">
                                    <div className="flex items-center gap-9">
                                        <button onClick={() => navigate('/dashboard')} className="text-primary text-sm font-medium leading-normal cursor-pointer">Passwords</button>
                                        <button onClick={() => navigate('/create-password')} className="text-white hover:text-primary/80 text-sm font-medium leading-normal cursor-pointer">Create</button>
                                        <button onClick={() => navigate('/account')} className="text-white hover:text-primary/80 text-sm font-medium leading-normal cursor-pointer">Account</button>
                                        <button onClick={() => navigate('/settings')} className="text-white hover:text-primary/80 text-sm font-medium leading-normal cursor-pointer">Settings</button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => navigate('/create-password')} className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors">
                                            <span className="truncate">Create New</span>
                                        </button>
                                        <div onClick={() => navigate('/account')} className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 cursor-pointer" data-alt="User avatar" style={{ backgroundImage: `url("${profilePicUrl}")` }}></div>
                                    </div>
                                </div>
                                <div className="md:hidden">
                                    <button className="text-white">
                                        <span className="material-symbols-outlined">menu</span>
                                    </button>
                                </div>
                            </header>
                            <main className="flex-1 px-4 py-3">
                                <div className="py-6">
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                                        <input
                                            className="form-input w-full rounded-lg border border-[#333] bg-[#1f1f1f] pl-10 pr-10 py-3 text-white placeholder-gray-500 focus:border-primary focus:ring-primary [&::-webkit-search-cancel-button]:hidden"
                                            placeholder="Search passwords..."
                                            type="search"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80 transition-colors p-1 flex items-center justify-center rounded-full"
                                                aria-label="Clear search"
                                            >
                                                <span className="material-symbols-outlined text-xl">close</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="py-3 @container">
                                    <div className="flex overflow-hidden rounded-lg border border-[#333] bg-[#1f1f1f]">
                                        <table className="flex-1 w-full">
                                            <thead>
                                                <tr className="bg-[#2a2a2a] border-b border-[#333]">
                                                    <th className="px-4 py-3 text-left text-white text-sm font-medium leading-normal w-1/4">Website</th>
                                                    <th className="px-4 py-3 text-left text-white text-sm font-medium leading-normal w-1/4">Username</th>
                                                    <th className="px-4 py-3 text-left text-white text-sm font-medium leading-normal w-1/4">Last Updated</th>
                                                    <th className="px-4 py-3 text-left text-white text-sm font-medium leading-normal w-1/4">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#333]">
                                                {sortedPasswords.map((pwd) => (
                                                    <tr key={pwd.id} className="hover:bg-[#2a2a2a]/50 transition-colors">
                                                        <td className="h-[72px] px-4 py-2">
                                                            <div className="flex items-center gap-3">
                                                                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-lg w-10" data-alt={`${pwd.website} favicon`} style={{ backgroundImage: `url("${pwd.iconUrl}")` }}></div>
                                                                <span className="text-white font-medium">{pwd.website}</span>
                                                            </div>
                                                        </td>
                                                        <td className="h-[72px] px-4 py-2 text-[#b89d9d] text-sm font-normal leading-normal">
                                                            {pwd.username}
                                                        </td>
                                                        <td className="h-[72px] px-4 py-2 text-[#b89d9d] text-sm font-normal leading-normal">
                                                            {pwd.lastUpdated}
                                                        </td>
                                                        <td className="h-[72px] px-4 py-2 text-[#b89d9d]">
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => setSelectedPassword(pwd)}
                                                                    className="p-2 rounded-full hover:bg-primary/20 text-white hover:text-primary transition-colors"
                                                                >
                                                                    <span className="material-symbols-outlined">visibility</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => navigate('/create-password', { state: { editData: pwd } })}
                                                                    className="p-2 rounded-full hover:bg-primary/20 text-white hover:text-primary transition-colors"
                                                                >
                                                                    <span className="material-symbols-outlined">edit</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => setPasswordToDelete(pwd)}
                                                                    className="p-2 rounded-full hover:bg-primary/20 text-white hover:text-primary transition-colors"
                                                                >
                                                                    <span className="material-symbols-outlined">delete</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </main>
                        </div>
                    </div>
                </div>
                <div className="fixed bottom-5 right-5">
                    <button onClick={() => navigate('/create-password')} className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 w-14 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] shadow-lg hover:bg-primary/90 transition-colors">
                        <span className="material-symbols-outlined text-3xl">add</span>
                    </button>
                </div>
            </div>

            {selectedPassword && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="relative w-full max-w-md rounded-xl bg-[#2a2a2a] p-8 shadow-2xl">
                        <button
                            onClick={() => setSelectedPassword(null)}
                            className="absolute top-4 right-4 rounded-full p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                        <div className="flex flex-col items-center gap-4">
                            <div className="flex items-center gap-3 self-start">
                                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-lg w-12" data-alt={`${selectedPassword.website} favicon`} style={{ backgroundImage: `url("${selectedPassword.iconUrl}")` }}></div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">{selectedPassword.website}</h3>
                                    <p className="text-sm text-gray-400">{selectedPassword.username}</p>
                                </div>
                            </div>
                            <div className="w-full space-y-4 pt-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-300" htmlFor="password">Password</label>
                                    <div className="relative">
                                        <input
                                            className={`form-input w-full rounded-lg bg-[#1f1f1f] px-4 py-3 text-white placeholder-gray-500 focus:outline-none transition-all duration-300 ${isCopied ? 'border border-primary shadow-[0_0_15px_rgba(234,42,42,0.4)]' : 'border border-[#333]'}`}
                                            id="password"
                                            readOnly
                                            type="text"
                                            value={selectedPassword.passwordValue}
                                        />
                                        <button
                                            onClick={handleCopy}
                                            className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 hover:text-primary transition-colors"
                                            title="Copy password"
                                        >
                                            <span className="material-symbols-outlined">{isCopied ? 'check' : 'content_copy'}</span>
                                        </button>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500">Last updated: {selectedPassword.lastUpdated}</p>
                            </div>
                            <div className="flex w-full items-center justify-end gap-2 pt-6 border-t border-[#333]">
                                <button
                                    onClick={() => setSelectedPassword(null)}
                                    className="flex-1 cursor-pointer items-center justify-center rounded-lg h-10 px-4 text-white text-sm font-bold bg-[#444] hover:bg-[#555] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => navigate('/create-password', { state: { editData: selectedPassword } })}
                                    className="flex-1 cursor-pointer items-center justify-center rounded-lg h-10 px-4 text-white text-sm font-bold bg-white/10 hover:bg-white/20 transition-colors"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => setSelectedPassword(null)}
                                    className="flex-1 cursor-pointer items-center justify-center rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {passwordToDelete && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                    <div className="relative w-full max-w-sm rounded-xl bg-[#2a2a2a] p-6 shadow-2xl text-center">
                        <span className="material-symbols-outlined text-5xl text-primary mb-4 block">warning</span>
                        <h3 className="text-xl font-bold text-white mb-2">Delete Password</h3>
                        <p className="text-gray-400 mb-6 text-sm">
                            Are you sure you want to delete the password for <span className="font-semibold text-white">{passwordToDelete.website}</span>?
                        </p>
                        <div className="flex w-full items-center justify-center gap-3">
                            <button
                                onClick={() => setPasswordToDelete(null)}
                                className="flex-1 cursor-pointer items-center justify-center rounded-lg h-10 px-4 text-white text-sm font-bold bg-[#444] hover:bg-[#555] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    const user = auth.currentUser;
                                    if (user && passwordToDelete) {
                                        await deleteDoc(doc(db, 'users', user.uid, 'passwords', passwordToDelete.id));
                                    }
                                    setPasswordToDelete(null);
                                }}
                                className="flex-1 cursor-pointer items-center justify-center rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
