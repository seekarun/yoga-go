"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SubMenuItem {
  label: string;
  href: string;
}

interface MenuItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  subItems?: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
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
    label: "Settings",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
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
    subItems: [
      { label: "Preferences", href: "/dashboard/settings/preferences" },
      { label: "Integrations", href: "/dashboard/settings/integrations" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>(["Settings"]);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label],
    );
  };

  const isActive = (href: string) => pathname === href;
  const isSubActive = (subItems?: SubMenuItem[]) =>
    subItems?.some((item) => pathname === item.href);

  return (
    <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <span className="text-xl font-bold text-indigo-600">Calel</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isExpanded = expandedItems.includes(item.label);
          const active = item.href
            ? isActive(item.href)
            : isSubActive(item.subItems);

          return (
            <div key={item.label}>
              {/* Main menu item */}
              {hasSubItems ? (
                <button
                  onClick={() => toggleExpand(item.label)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 rounded-lg
                    transition-colors duration-150
                    ${active ? "bg-indigo-50 text-indigo-600" : "text-gray-700 hover:bg-gray-100"}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={active ? "text-indigo-600" : "text-gray-500"}
                    >
                      {item.icon}
                    </span>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
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
              ) : (
                <Link
                  href={item.href || "#"}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg
                    transition-colors duration-150
                    ${active ? "bg-indigo-50 text-indigo-600" : "text-gray-700 hover:bg-gray-100"}
                  `}
                >
                  <span
                    className={active ? "text-indigo-600" : "text-gray-500"}
                  >
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              )}

              {/* Sub-menu items */}
              {hasSubItems && isExpanded && (
                <div className="mt-1 ml-8 space-y-1">
                  {item.subItems?.map((subItem) => (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      className={`
                        block px-3 py-2 rounded-lg text-sm
                        transition-colors duration-150
                        ${isActive(subItem.href) ? "bg-indigo-50 text-indigo-600 font-medium" : "text-gray-600 hover:bg-gray-100"}
                      `}
                    >
                      {subItem.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
