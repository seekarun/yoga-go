"use client";

/**
 * CalendarCarousel Component
 *
 * Manages a horizontal carousel of calendar views:
 * Month → Date → Day → Event
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
  type ReactNode,
} from "react";

// View types in order (left to right)
export type ViewType = "year" | "month" | "date" | "day" | "event";

const VIEW_ORDER: ViewType[] = ["year", "month", "date", "day", "event"];

interface CarouselContextType {
  currentIndex: number;
  navigateTo: (view: ViewType) => void;
  navigateLeft: () => void;
  navigateRight: () => void;
  canGoLeft: boolean;
  canGoRight: boolean;
  isRightColumn: (view: ViewType) => boolean;
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
  // Index represents the LEFT column's position
  // So index 0 = [month, date], index 1 = [date, day], index 2 = [day, event]
  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = VIEW_ORDER.indexOf(initialView);
    // For desktop, we show 2 columns, so max index is VIEW_ORDER.length - 2
    return Math.min(Math.max(0, idx), VIEW_ORDER.length - 2);
  });

  const navigateTo = useCallback((view: ViewType) => {
    const idx = VIEW_ORDER.indexOf(view);
    // Ensure we don't go past the last valid position (showing last 2 columns)
    const maxIndex = VIEW_ORDER.length - 2;
    setCurrentIndex(Math.min(Math.max(0, idx), maxIndex));
  }, []);

  const navigateLeft = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const navigateRight = useCallback(() => {
    const maxIndex = VIEW_ORDER.length - 2;
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  }, []);

  const canGoLeft = currentIndex > 0;
  const canGoRight = currentIndex < VIEW_ORDER.length - 2;

  // Check if a view is currently displayed in the right column
  const isRightColumn = useCallback(
    (view: ViewType) => {
      const viewIndex = VIEW_ORDER.indexOf(view);
      // Right column is at currentIndex + 1
      return viewIndex === currentIndex + 1;
    },
    [currentIndex],
  );

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
      }}
    >
      <div className="relative h-full w-full overflow-hidden">
        {/* Sliding container */}
        <div
          className="flex h-full transition-transform duration-300 ease-in-out"
          style={{
            width: `${VIEW_ORDER.length * 50}%`, // Each column is 50% of viewport on desktop
            transform: `translateX(-${currentIndex * (100 / VIEW_ORDER.length)}%)`,
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
  const { navigateLeft, currentIndex } = useCarousel();
  const viewIndex = VIEW_ORDER.indexOf(view);

  // Show back button if:
  // 1. showBackButton prop is true
  // 2. This column is currently the LEFT visible column (viewIndex === currentIndex)
  // 3. There's something to go back to (currentIndex > 0, meaning we're not at year)
  const isLeftColumn = viewIndex === currentIndex;
  const canGoBack = currentIndex > 0;
  const shouldShowBack = showBackButton && isLeftColumn && canGoBack;

  return (
    <div
      className="h-full flex-shrink-0 flex flex-col border-r border-gray-200 bg-white"
      style={{ width: `${100 / VIEW_ORDER.length}%` }}
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
