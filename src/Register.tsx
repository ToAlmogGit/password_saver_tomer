import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                createdAt: new Date().toISOString()
            });

            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-[#F7FAFC]">
            <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden">
                <div className="layout-container flex h-full grow flex-col">
                    <div className="px-4 flex flex-1 justify-center py-5">
                        <div className="layout-content-container flex flex-col w-full max-w-[960px] flex-1">
                            <header className="flex items-center justify-between whitespace-nowrap px-4 sm:px-10 py-3">
                                <div className="flex items-center gap-4 text-white">
                                    <div className="size-6 text-primary">
                                        <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                            <g clipPath="url(#clip0_6_330)">
                                                <path clipRule="evenodd" d="M24 0.757355L47.2426 24L24 47.2426L0.757355 24L24 0.757355ZM21 35.7574V12.2426L9.24264 24L21 35.7574Z" fill="currentColor" fillRule="evenodd"></path>
                                            </g>
                                            <defs>
                                                <clipPath id="clip0_6_330"><rect fill="white" height="48" width="48"></rect></clipPath>
                                            </defs>
                                        </svg>
                                    </div>
                                    <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">Password Manager</h2>
                                </div>
                                <Link className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-red-700 transition-colors" to="/login">
                                    <span className="truncate">Log In</span>
                                </Link>
                            </header>
                            <main className="flex-grow flex items-center justify-center py-12">
                                <div className="w-full max-w-md space-y-8 p-4">
                                    <div className="text-center">
                                        <p className="text-white text-4xl font-black leading-tight tracking-[-0.033em]">Create Your Secure Account</p>
                                        <p className="text-[#b89d9d] text-base font-normal leading-normal mt-3">Secure your digital life with a single master password.</p>
                                    </div>
                                    <form className="space-y-6" onSubmit={handleRegister}>
                                        {error && <p className="text-red-500 text-center">{error}</p>}
                                        <div className="flex flex-col">
                                            <label className="text-white text-base font-medium leading-normal pb-2" htmlFor="email">Email Address</label>
                                            <input
                                                autoComplete="email"
                                                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-[#533c3c] bg-[#2D3748] focus:border-primary h-14 placeholder:text-[#b89d9d] p-[15px] text-base font-normal leading-normal"
                                                id="email"
                                                name="email"
                                                placeholder=""
                                                required
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <label className="text-white text-base font-medium leading-normal pb-2" htmlFor="password">Master Password</label>
                                            <div className="relative flex w-full flex-1 items-stretch rounded-lg">
                                                <input
                                                    autoComplete="new-password"
                                                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-l-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-[#533c3c] bg-[#2D3748] focus:border-primary h-14 placeholder:text-[#b89d9d] p-[15px] pr-12 text-base font-normal leading-normal"
                                                    id="password"
                                                    name="password"
                                                    placeholder=""
                                                    required
                                                    type="password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                />
                                                <button className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#b89d9d] hover:text-white" type="button">
                                                    <span className="material-symbols-outlined">visibility</span>
                                                </button>
                                            </div>
                                            <p className="text-[#b89d9d] text-sm font-normal leading-normal pt-2">Minimum 12 characters, include uppercase, lowercase, number, and symbol.</p>
                                        </div>
                                        <div className="flex flex-col">
                                            <label className="text-white text-base font-medium leading-normal pb-2" htmlFor="confirm-password">Confirm Master Password</label>
                                            <div className="relative flex w-full flex-1 items-stretch rounded-lg">
                                                <input
                                                    autoComplete="new-password"
                                                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-l-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-[#533c3c] bg-[#2D3748] focus:border-primary h-14 placeholder:text-[#b89d9d] p-[15px] pr-12 text-base font-normal leading-normal"
                                                    id="confirm-password"
                                                    name="confirm-password"
                                                    placeholder=""
                                                    required
                                                    type="password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                />
                                                <button className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#b89d9d] hover:text-white" type="button">
                                                    <span className="material-symbols-outlined">visibility_off</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <button className="w-full flex min-w-[84px] max-w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-14 px-4 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-red-700 transition-colors" type="submit">
                                                <span className="truncate">Register</span>
                                            </button>
                                        </div>
                                    </form>
                                    <p className="text-center text-sm text-[#b89d9d]">
                                        Already have an account? <Link className="font-medium text-primary hover:text-red-400" to="/login">Log In</Link>
                                    </p>
                                </div>
                            </main>
                            <footer className="text-center py-6 text-sm text-[#b89d9d]">
                                <p>© 2024 Password Manager. All rights reserved.</p>
                                <div className="mt-2">
                                    <a className="hover:text-white transition-colors" href="#">Terms of Service</a>
                                    <span className="mx-2">|</span>
                                    <a className="hover:text-white transition-colors" href="#">Privacy Policy</a>
                                </div>
                            </footer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
