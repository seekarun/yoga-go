// Carousel system
export {
  CalendarCarousel,
  CarouselColumn,
  useCarousel,
  type ViewType,
} from "./CalendarCarousel";

// View components
export { YearView } from "./YearView";
export { MonthView } from "./MonthView";
export { DateView } from "./DateView";
export { DayView } from "./DayView";
export type { TimeSlot, SlotStatus } from "./DayView";
export { EventView } from "./EventView";

// Legacy components (for backward compatibility)
export { DateScroller } from "./DateScroller";
export { DateList } from "./DateList";
export { TimeGrid } from "./TimeGrid";

// Shared components
export { ChatInput } from "./ChatInput";
export { EventModal } from "./EventModal";
export type { CalendarEvent } from "./EventModal";
