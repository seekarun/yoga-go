'use client';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { sectionRegistry, type SectionType } from '../sections';

// Fixed sections that cannot be reordered
const FIXED_TOP_SECTIONS: SectionType[] = ['hero'];
const FIXED_BOTTOM_SECTIONS: SectionType[] = ['footer'];

interface SectionListProps {
  sectionOrder: SectionType[];
  disabledSections: SectionType[];
  onReorder: (newOrder: SectionType[]) => void;
  onToggleSection: (sectionId: SectionType) => void;
  onSelectSection: (sectionId: SectionType) => void;
}

interface SortableItemProps {
  id: SectionType;
  isDisabled: boolean;
  onToggle: () => void;
  onSelect: () => void;
}

interface FixedItemProps {
  id: SectionType;
  isDisabled: boolean;
  position: 'top' | 'bottom';
  onToggle: () => void;
  onSelect: () => void;
}

// Fixed section item (not draggable)
function FixedItem({ id, isDisabled, position, onToggle, onSelect }: FixedItemProps) {
  const section = sectionRegistry[id];
  const isHero = id === 'hero';

  return (
    <div
      className={`flex items-center gap-3 p-4 bg-gray-50 border rounded-lg border-gray-200 ${
        isDisabled ? 'opacity-50' : ''
      }`}
    >
      {/* Lock Icon (instead of drag handle) */}
      <div className="p-1 text-gray-300" title={`${section.label} is fixed at ${position}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1C8.676 1 6 3.676 6 7v2H4v14h16V9h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v2H8V7c0-2.276 1.724-4 4-4zm0 10c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z" />
        </svg>
      </div>

      {/* Section Icon */}
      <div
        className="flex-shrink-0"
        style={{ color: isDisabled ? '#9ca3af' : 'var(--color-primary)' }}
      >
        {section.icon}
      </div>

      {/* Section Info */}
      <div
        className="flex-1 cursor-pointer"
        onClick={onSelect}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            onSelect();
          }
        }}
        tabIndex={0}
        role="button"
      >
        <div className={`font-medium ${isDisabled ? 'text-gray-500' : 'text-gray-900'}`}>
          {section.label}
          <span className="ml-2 text-xs text-gray-400 font-normal">(Fixed at {position})</span>
        </div>
        <div className="text-xs text-gray-500">{section.description}</div>
      </div>

      {/* Toggle Switch - disabled for hero */}
      {isHero ? (
        <div
          className="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent cursor-not-allowed"
          style={{ background: 'var(--color-primary)' }}
          title="Hero section is always visible"
        >
          <span className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 translate-x-5" />
        </div>
      ) : (
        <button
          onClick={e => {
            e.stopPropagation();
            onToggle();
          }}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isDisabled ? 'bg-gray-200' : ''
          }`}
          style={{ background: isDisabled ? undefined : 'var(--color-primary)' }}
          role="switch"
          aria-checked={!isDisabled}
          title={isDisabled ? 'Enable section' : 'Disable section'}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              isDisabled ? 'translate-x-0' : 'translate-x-5'
            }`}
          />
        </button>
      )}
    </div>
  );
}

// Sortable section item (draggable)
function SortableItem({ id, isDisabled, onToggle, onSelect }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const section = sectionRegistry[id];

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        ...(isDragging
          ? ({ '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties)
          : {}),
      }}
      className={`flex items-center gap-3 p-4 bg-white border rounded-lg ${
        isDragging ? 'shadow-lg ring-2' : 'border-gray-200 hover:border-gray-300'
      } ${isDisabled ? 'opacity-50' : ''}`}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600"
        title="Drag to reorder"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 4h2v2H4V4zm0 3h2v2H4V7zm0 3h2v2H4v-2zm3-6h2v2H7V4zm0 3h2v2H7V7zm0 3h2v2H7v-2zm3-6h2v2h-2V4zm0 3h2v2h-2V7zm0 3h2v2h-2v-2z" />
        </svg>
      </button>

      {/* Section Icon */}
      <div
        className="flex-shrink-0"
        style={{ color: isDisabled ? '#9ca3af' : 'var(--color-primary)' }}
      >
        {section.icon}
      </div>

      {/* Section Info */}
      <div
        className="flex-1 cursor-pointer"
        onClick={onSelect}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            onSelect();
          }
        }}
        tabIndex={0}
        role="button"
      >
        <div className={`font-medium ${isDisabled ? 'text-gray-500' : 'text-gray-900'}`}>
          {section.label}
        </div>
        <div className="text-xs text-gray-500">{section.description}</div>
      </div>

      {/* Toggle Switch */}
      <button
        onClick={e => {
          e.stopPropagation();
          onToggle();
        }}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          isDisabled ? 'bg-gray-200' : ''
        }`}
        style={{ background: isDisabled ? undefined : 'var(--color-primary)' }}
        role="switch"
        aria-checked={!isDisabled}
        title={isDisabled ? 'Enable section' : 'Disable section'}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            isDisabled ? 'translate-x-0' : 'translate-x-5'
          }`}
        />
      </button>
    </div>
  );
}

export default function SectionList({
  sectionOrder,
  disabledSections,
  onReorder,
  onToggleSection,
  onSelectSection,
}: SectionListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Separate fixed sections from sortable sections
  const topSections = sectionOrder.filter(id => FIXED_TOP_SECTIONS.includes(id));
  const bottomSections = sectionOrder.filter(id => FIXED_BOTTOM_SECTIONS.includes(id));
  const sortableSections = sectionOrder.filter(
    id => !FIXED_TOP_SECTIONS.includes(id) && !FIXED_BOTTOM_SECTIONS.includes(id)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortableSections.indexOf(active.id as SectionType);
      const newIndex = sortableSections.indexOf(over.id as SectionType);
      const newSortableOrder = arrayMove(sortableSections, oldIndex, newIndex);

      // Reconstruct full order with fixed sections
      const newOrder = [...topSections, ...newSortableOrder, ...bottomSections];
      onReorder(newOrder);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Sections</h3>
        <p className="text-sm text-gray-600">
          Drag to reorder. Toggle to show/hide. Click to edit.
        </p>
      </div>

      <div className="space-y-2">
        {/* Fixed Top Sections (Hero) */}
        {topSections.map(sectionId => (
          <FixedItem
            key={sectionId}
            id={sectionId}
            isDisabled={disabledSections.includes(sectionId)}
            position="top"
            onToggle={() => onToggleSection(sectionId)}
            onSelect={() => onSelectSection(sectionId)}
          />
        ))}

        {/* Sortable Middle Sections */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortableSections} strategy={verticalListSortingStrategy}>
            {sortableSections.map(sectionId => (
              <SortableItem
                key={sectionId}
                id={sectionId}
                isDisabled={disabledSections.includes(sectionId)}
                onToggle={() => onToggleSection(sectionId)}
                onSelect={() => onSelectSection(sectionId)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Fixed Bottom Sections (Footer) */}
        {bottomSections.map(sectionId => (
          <FixedItem
            key={sectionId}
            id={sectionId}
            isDisabled={disabledSections.includes(sectionId)}
            position="bottom"
            onToggle={() => onToggleSection(sectionId)}
            onSelect={() => onSelectSection(sectionId)}
          />
        ))}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          <strong>Tip:</strong> Click on a section in the preview to edit it directly, or click on a
          section name above.
        </p>
      </div>
    </div>
  );
}
