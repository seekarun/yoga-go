"use client";

import useDraggable from "./useDraggable";

interface DraggableItemProps {
  x: number;
  y: number;
  isEditing: boolean;
  selected?: boolean;
  onSelect?: (e: React.MouseEvent) => void;
  onPositionChange: (x: number, y: number) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
  /** CSS unit for left/top positioning (default "px") */
  unit?: "px" | "%";
  /** Extra class name for media-query targeting */
  className?: string;
}

const SELECTED_OUTLINE: React.CSSProperties = {
  outline: "2px solid #3b82f6",
  outlineOffset: "4px",
  borderRadius: "6px",
};

export default function DraggableItem({
  x,
  y,
  isEditing,
  selected,
  onSelect,
  onPositionChange,
  children,
  style,
  unit = "px",
  className,
}: DraggableItemProps) {
  const { handleMouseDown, isDragging, currentX, currentY } = useDraggable({
    x,
    y,
    onPositionChange,
    enabled: isEditing,
  });

  const posX = isEditing ? currentX : x;
  const posY = isEditing ? currentY : y;
  const suffix = isEditing ? "px" : unit;

  return (
    <div
      className={className}
      style={{
        position: "absolute",
        left: `${posX}${suffix}`,
        top: `${posY}${suffix}`,
        transform: "translate(-50%, -50%)",
        cursor: isEditing ? (isDragging ? "grabbing" : "grab") : "default",
        zIndex: isEditing && (selected || isDragging) ? 20 : 1,
        userSelect: isDragging ? "none" : undefined,
        ...(isEditing && selected ? SELECTED_OUTLINE : {}),
        ...style,
      }}
      onMouseDown={isEditing ? handleMouseDown : undefined}
      onClick={isEditing ? onSelect : undefined}
    >
      {children}
    </div>
  );
}
