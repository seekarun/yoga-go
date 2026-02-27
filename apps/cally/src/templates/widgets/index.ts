// Types
export type {
  WidgetBrandConfig,
  WidgetSectionType,
  WidgetEntry,
  WidgetCatalogue,
} from "./types";

// Catalogue
export {
  WIDGET_CATALOGUE,
  getWidgetsForSection,
  getWidget,
  getDefaultWidgetId,
} from "./catalogue";

// Widget components
export { default as TestimonialsCardMatrix3x2 } from "./testimonials/CardMatrix3x2";
export { default as TestimonialsSolidCards } from "./testimonials/SolidCards";
export { default as TestimonialsAnimatedSingleCard } from "./testimonials/AnimatedSingleCard";
export { default as TestimonialsAnimatedScrambledCards } from "./testimonials/AnimatedScrambledCards";
export { default as TestimonialsCardUnevenGrid } from "./testimonials/CardUnevenGrid";
export { default as TestimonialsAnimatedCardScroll } from "./testimonials/AnimatedCardScroll";

// Product widget components
export { default as ProductsStaticVertical } from "./products/StaticVertical";
export { default as ProductsStaticEcom } from "./products/StaticEcom";
export { default as ProductsStaticHorizontal } from "./products/StaticHorizontal";

// Hero widget components
export { default as HeroVideoHorizontal } from "./hero/VideoHorizontal";
export { default as HeroStatsBoxes } from "./hero/StatsBoxes";
export { default as HeroPovCards } from "./hero/PovCards";
export { default as HeroDoctorProfile } from "./hero/DoctorProfile";
export { default as HeroVerticalImageScroll } from "./hero/VerticalImageScroll";
