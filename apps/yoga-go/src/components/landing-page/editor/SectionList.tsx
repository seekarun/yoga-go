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
      style={style}
      className={`flex items-center gap-3 p-4 bg-white border rounded-lg ${
        isDragging ? 'shadow-lg ring-2 ring-blue-500' : 'border-gray-200 hover:border-gray-300'
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
      <div className={`flex-shrink-0 ${isDisabled ? 'text-gray-400' : 'text-blue-600'}`}>
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
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          isDisabled ? 'bg-gray-200' : 'bg-blue-600'
        }`}
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sectionOrder.indexOf(active.id as SectionType);
      const newIndex = sectionOrder.indexOf(over.id as SectionType);
      const newOrder = arrayMove(sectionOrder, oldIndex, newIndex);
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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {sectionOrder.map(sectionId => (
              <SortableItem
                key={sectionId}
                id={sectionId}
                isDisabled={disabledSections.includes(sectionId)}
                onToggle={() => onToggleSection(sectionId)}
                onSelect={() => onSelectSection(sectionId)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          <strong>Tip:</strong> Click on a section in the preview to edit it directly, or click on a
          section name above.
        </p>
      </div>
    </div>
  );
}
