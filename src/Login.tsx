import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/dashboard'); // Redirect to home/dashboard after login
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-[#F7FAFC]">
            <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden">
                <div className="layout-container flex h-full grow flex-col">
                    <div className="px-4 md:px-10 lg:px-40 flex flex-1 justify-center py-5">
                        <div className="layout-content-container flex flex-col w-full max-w-[960px] flex-1">
                            <div className="flex flex-col md:flex-row w-full grow bg-background-light dark:bg-background-dark @container">
                                <div className="w-full md:w-1/2 flex flex-col justify-center p-4 md:p-8">
                                    <div className="flex flex-col items-center md:items-start mb-8">
                                        <span className="material-symbols-outlined text-primary text-5xl mb-2">lock</span>
                                        <p className="text-white text-lg font-bold">Password Manager</p>
                                    </div>
                                    <div className="flex flex-wrap justify-between gap-3 p-4">
                                        <div className="flex min-w-72 flex-col gap-3">
                                            <p className="text-white text-4xl font-black leading-tight tracking-[-0.033em]">Welcome Back</p>
                                            <p className="text-[#b89d9d] text-base font-normal leading-normal">Log in to your account</p>
                                        </div>
                                    </div>
                                    {error && <p className="text-red-500 text-center px-4">{error}</p>}
                                    <div className="w-full px-4 py-3">
                                        <label className="flex flex-col min-w-40 flex-1">
                                            <p className="text-white text-base font-medium leading-normal pb-2">Email</p>
                                            <input
                                                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-0 border-none bg-[#382929] focus:border-none h-14 placeholder:text-[#b89d9d] p-4 text-base font-normal leading-normal"
                                                placeholder=""
                                                autoComplete="off"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                            />
                                        </label>
                                    </div>
                                    <div className="w-full px-4 py-3">
                                        <label className="flex flex-col min-w-40 flex-1">
                                            <div className="flex justify-between items-center pb-2">
                                                <p className="text-white text-base font-medium leading-normal">Password</p>
                                            </div>
                                            <div className="flex w-full flex-1 items-stretch rounded-lg">
                                                <input
                                                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-0 border-none bg-[#382929] focus:border-none h-14 placeholder:text-[#b89d9d] p-4 rounded-r-none border-r-0 pr-2 text-base font-normal leading-normal"
                                                    placeholder=""
                                                    type="password"
                                                    autoComplete="off"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                />
                                                <button aria-label="Toggle password visibility" className="text-[#b89d9d] flex border-none bg-[#382929] items-center justify-center pr-4 rounded-r-lg border-l-0">
                                                    <span className="material-symbols-outlined">visibility</span>
                                                </button>
                                            </div>
                                        </label>
                                    </div>
                                    <div className="w-full px-4 pt-3 mt-4">
                                        <button
                                            className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 flex-1 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors"
                                            onClick={handleLogin}
                                        >
                                            <span className="truncate">Login</span>
                                        </button>
                                    </div>
                                    <div className="text-center mt-2 px-4">
                                        <a className="text-primary text-sm font-medium hover:underline" href="#">Forgot Password?</a>
                                    </div>
                                    <div className="text-center mt-6 px-4">
                                        <p className="text-[#b89d9d]">Don't have an account? <Link to="/register" className="text-primary font-medium hover:underline">Create an account</Link></p>
                                    </div>
                                </div>
                                <div className="hidden md:flex w-1/2 items-center justify-center p-4">
                                    <div className="w-full aspect-[3/2] rounded-lg bg-background-dark flex items-center justify-center">
                                        <div className="relative">
                                            <span className="material-symbols-outlined text-primary text-[200px] transform -rotate-45" style={{ fontVariationSettings: "'FILL' 1" }}>key</span>
                                            <span className="material-symbols-outlined text-background-dark text-[120px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform -rotate-45">lock</span>
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
