'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface ExpertSidebarProps {
  expertId: string;
}

interface MenuItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  color?: string;
}

const SIDEBAR_COLLAPSED_KEY = 'expert-sidebar-collapsed';

export default function ExpertSidebar({ expertId }: ExpertSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  // Save collapsed state to localStorage and dispatch event
  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newState));
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new Event('sidebar-toggle'));
  };

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: `/srv/${expertId}`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      id: 'profile',
      label: 'Edit Profile',
      href: `/srv/${expertId}/edit`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
    {
      id: 'landing-page',
      label: 'Landing Page',
      href: `/srv/${expertId}/landing-page`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
          />
        </svg>
      ),
    },
    {
      id: 'blog',
      label: 'Blog',
      href: `/srv/${expertId}/blog`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
          />
        </svg>
      ),
    },
    {
      id: 'analytics',
      label: 'Analytics',
      href: `/srv/${expertId}/analytics`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      id: 'survey',
      label: 'Survey',
      href: `/srv/${expertId}/survey`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      ),
    },
    {
      id: 'settings',
      label: 'Settings',
      href: `/srv/${expertId}/settings`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },
  ];

  const isActive = (href: string) => {
    if (href === `/srv/${expertId}`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 transition-all duration-300 z-40 ${
        isCollapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={toggleCollapse}
        className="absolute -right-3 top-6 w-6 h-6 bg-white border border-gray-200 rounded-full shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${
            isCollapsed ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Navigation */}
      <nav className="p-3 space-y-1 mt-4">
        {menuItems.map(item => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <span
                className={`flex-shrink-0 ${active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`}
              >
                {item.icon}
              </span>
              {!isCollapsed && <span className="font-medium text-sm truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* View Public Page Link */}
      <div className="absolute bottom-4 left-0 right-0 px-3">
        <Link
          href={`/experts/${expertId}`}
          target="_blank"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title="View public page"
        >
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          {!isCollapsed && <span className="font-medium text-sm">View Public Page</span>}
        </Link>
      </div>
    </aside>
  );
}
