'use client';

// 共通ナビゲーションバーコンポーネント（shadcn/ui風）

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface NavbarProps {
  currentPath?: string;
}

export default function Navbar({ currentPath }: NavbarProps) {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user?.email) {
        setUserEmail(session.user.email);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-8">
            {/* ロゴ */}
            <Link 
              href="/home" 
              className="flex items-center space-x-2 transition-opacity hover:opacity-80"
            >
              <span className="text-xl">📚</span>
              <span className="font-semibold text-lg text-foreground">
                LearnCurve
              </span>
            </Link>
            
            {/* デスクトップナビゲーション */}
            <nav className="hidden md:flex md:items-center md:gap-1">
              <Link
                href="/home"
                className={`relative px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  currentPath === '/home'
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {currentPath === '/home' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full"></span>
                )}
                ダッシュボード
              </Link>
              <Link
                href="/cards"
                className={`relative px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  currentPath === '/cards'
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {currentPath === '/cards' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full"></span>
                )}
                カード一覧
              </Link>
              <Link
                href="/review"
                className={`relative px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  currentPath === '/review'
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {currentPath === '/review' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full"></span>
                )}
                レビュー
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-3">
            {userEmail && (
              <>
                {/* デスクトップユーザーメニュー */}
                <div className="hidden sm:block relative">
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-accent focus:outline-none"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                      {userEmail.charAt(0).toUpperCase()}
                    </div>
                    <span className="max-w-[180px] truncate text-muted-foreground">
                      {userEmail}
                    </span>
                    <svg
                      className={`h-4 w-4 text-muted-foreground transition-transform ${
                        showDropdown ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {showDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowDropdown(false)}
                      />
                      <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-popover p-1 shadow-lg z-50">
                        <div className="px-3 py-2 border-b border-border">
                          <p className="text-sm font-medium text-foreground">{userEmail}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">アカウント</p>
                        </div>
                        <button
                          onClick={handleLogout}
                          className="w-full rounded-sm px-2 py-1.5 text-sm text-left transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          ログアウト
                        </button>
                      </div>
                    </>
                  )}
                </div>
                
                {/* モバイルユーザーアイコン */}
                <div className="sm:hidden relative">
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center justify-center rounded-md p-2 transition-colors hover:bg-accent focus:outline-none"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                      {userEmail.charAt(0).toUpperCase()}
                    </div>
                  </button>
                  {showDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowDropdown(false)}
                      />
                      <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-popover p-1 shadow-lg z-50">
                        <div className="px-3 py-2 border-b border-border">
                          <p className="text-sm font-medium text-foreground">{userEmail}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">アカウント</p>
                        </div>
                        <button
                          onClick={handleLogout}
                          className="w-full rounded-sm px-2 py-1.5 text-sm text-left transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          ログアウト
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
            
            {/* モバイルメニューボタン */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none"
              aria-label="メニューを開く"
            >
              {showMobileMenu ? (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
        
        {/* モバイルメニュー */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-border">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                href="/home"
                onClick={() => setShowMobileMenu(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  currentPath === '/home'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                ダッシュボード
              </Link>
              <Link
                href="/cards"
                onClick={() => setShowMobileMenu(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  currentPath === '/cards'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                カード一覧
              </Link>
              <Link
                href="/review"
                onClick={() => setShowMobileMenu(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  currentPath === '/review'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                レビュー
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

