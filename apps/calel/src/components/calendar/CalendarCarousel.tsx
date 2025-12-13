"use client";

/**
 * CalendarCarousel Component
 *
 * Manages a horizontal carousel of calendar views:
 * Year → Month → Date → Day → Event
 *
 * Desktop: Shows 2 columns (50% each)
 * Mobile: Shows 1 column (100%)
 *
 * Animated transitions with ease-in-out effect.
 * Always snaps to column boundaries.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

// View types in order (left to right)
export type ViewType = "year" | "month" | "date" | "day" | "event";

const VIEW_ORDER: ViewType[] = ["year", "month", "date", "day", "event"];
const NUM_COLUMNS = VIEW_ORDER.length;

// Breakpoint for mobile (matches Tailwind md: breakpoint)
const MOBILE_BREAKPOINT = 768;

interface CarouselContextType {
  currentIndex: number;
  navigateTo: (view: ViewType) => void;
  navigateLeft: () => void;
  navigateRight: () => void;
  canGoLeft: boolean;
  canGoRight: boolean;
  isRightColumn: (view: ViewType) => boolean;
  isMobile: boolean;
}

const CarouselContext = createContext<CarouselContextType | null>(null);

export function useCarousel() {
  const context = useContext(CarouselContext);
  if (!context) {
    throw new Error("useCarousel must be used within CalendarCarousel");
  }
  return context;
}

interface CalendarCarouselProps {
  children: ReactNode;
  initialView?: ViewType;
}

export function CalendarCarousel({
  children,
  initialView = "date",
}: CalendarCarouselProps) {
  // Track mobile state - start with null to detect SSR
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  // Check viewport on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Initial check
    checkMobile();

    // Listen for resize
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Use mobile=true as default for SSR to avoid layout shift on mobile devices
  const isMobileResolved = isMobile ?? true;

  // Calculate max index based on viewport
  // Mobile: can go to last column (NUM_COLUMNS - 1)
  // Desktop: show 2 columns, so max is NUM_COLUMNS - 2
  const maxIndex = isMobileResolved ? NUM_COLUMNS - 1 : NUM_COLUMNS - 2;

  // Index represents the visible column position
  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = VIEW_ORDER.indexOf(initialView);
    return Math.min(Math.max(0, idx), NUM_COLUMNS - 1);
  });

  // Clamp index when switching between mobile/desktop
  useEffect(() => {
    setCurrentIndex((prev) => Math.min(prev, maxIndex));
  }, [maxIndex]);

  const navigateTo = useCallback(
    (view: ViewType) => {
      const idx = VIEW_ORDER.indexOf(view);
      setCurrentIndex(Math.min(Math.max(0, idx), maxIndex));
    },
    [maxIndex],
  );

  const navigateLeft = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const navigateRight = useCallback(() => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  }, [maxIndex]);

  const canGoLeft = currentIndex > 0;
  const canGoRight = currentIndex < maxIndex;

  // Check if a view is currently displayed in the right column (desktop only)
  const isRightColumn = useCallback(
    (view: ViewType) => {
      if (isMobileResolved) {
        // On mobile, single column - current view can trigger navigation
        const viewIndex = VIEW_ORDER.indexOf(view);
        return viewIndex === currentIndex;
      }
      const viewIndex = VIEW_ORDER.indexOf(view);
      // Right column is at currentIndex + 1
      return viewIndex === currentIndex + 1;
    },
    [currentIndex, isMobileResolved],
  );

  // Calculate widths using vw units for predictable sizing
  // Mobile: each column is 100vw, Desktop: each column is 50vw
  const columnWidthVw = isMobileResolved ? 100 : 50;
  const containerWidthVw = NUM_COLUMNS * columnWidthVw;
  const translateVw = currentIndex * columnWidthVw;

  return (
    <CarouselContext.Provider
      value={{
        currentIndex,
        navigateTo,
        navigateLeft,
        navigateRight,
        canGoLeft,
        canGoRight,
        isRightColumn,
        isMobile: isMobileResolved,
      }}
    >
      <div className="relative h-full w-full overflow-hidden">
        {/* Sliding container - uses vw units for predictable sizing */}
        <div
          className="flex h-full transition-transform duration-300 ease-in-out"
          style={{
            width: `${containerWidthVw}vw`,
            transform: `translateX(-${translateVw}vw)`,
          }}
        >
          {children}
        </div>
      </div>
    </CarouselContext.Provider>
  );
}

// Column wrapper component
interface CarouselColumnProps {
  children: ReactNode;
  view: ViewType;
  title: string;
  showBackButton?: boolean;
}

export function CarouselColumn({
  children,
  view,
  title,
  showBackButton = false,
}: CarouselColumnProps) {
  const { navigateLeft, currentIndex, isMobile } = useCarousel();
  const viewIndex = VIEW_ORDER.indexOf(view);

  // Show back button if:
  // 1. showBackButton prop is true
  // 2. This column is currently the LEFT visible column (viewIndex === currentIndex)
  // 3. There's something to go back to (currentIndex > 0, meaning we're not at year)
  const isLeftColumn = viewIndex === currentIndex;
  const canGoBack = currentIndex > 0;
  const shouldShowBack = showBackButton && isLeftColumn && canGoBack;

  // Column width in vw - matches parent calculation
  const columnWidthVw = isMobile ? 100 : 50;

  return (
    <div
      className="h-full flex-shrink-0 flex flex-col border-r border-gray-200 bg-white"
      style={{ width: `${columnWidthVw}vw` }}
    >
      {/* Column header - fixed height */}
      <div className="flex items-center gap-2 px-3 h-10 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        {shouldShowBack ? (
          <button
            onClick={navigateLeft}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            aria-label="Go back"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        ) : (
          <div className="w-7" />
        )}
        <h2 className="text-sm font-semibold text-gray-900 flex-1">{title}</h2>
      </div>

      {/* Column content */}
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
