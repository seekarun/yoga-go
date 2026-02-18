"use client";

import DragHandle from "./DragHandle";

interface WidthResizeHandlesProps {
  onDragStart: () => void;
  onDragLeft: (dx: number, dy: number) => void;
  onDragRight: (dx: number, dy: number) => void;
  onDragEnd: () => void;
}

/**
 * 8 visible node handles (edges + corners) for horizontal width resizing.
 * Left-side handles widen when dragged left; right-side widen when dragged right.
 */
export default function WidthResizeHandles({
  onDragStart,
  onDragLeft,
  onDragRight,
  onDragEnd,
}: WidthResizeHandlesProps) {
  return (
    <>
      {/* Edge midpoints */}
      <DragHandle
        position="left"
        mode="node"
        onDragStart={onDragStart}
        onDrag={onDragLeft}
        onDragEnd={onDragEnd}
      />
      <DragHandle
        position="right"
        mode="node"
        onDragStart={onDragStart}
        onDrag={onDragRight}
        onDragEnd={onDragEnd}
      />
      <DragHandle
        position="top"
        mode="node"
        onDragStart={onDragStart}
        onDrag={onDragRight}
        onDragEnd={onDragEnd}
      />
      <DragHandle
        position="bottom"
        mode="node"
        onDragStart={onDragStart}
        onDrag={onDragRight}
        onDragEnd={onDragEnd}
      />
      {/* Corners */}
      <DragHandle
        position="top-left"
        mode="node"
        onDragStart={onDragStart}
        onDrag={onDragLeft}
        onDragEnd={onDragEnd}
      />
      <DragHandle
        position="top-right"
        mode="node"
        onDragStart={onDragStart}
        onDrag={onDragRight}
        onDragEnd={onDragEnd}
      />
      <DragHandle
        position="bottom-left"
        mode="node"
        onDragStart={onDragStart}
        onDrag={onDragLeft}
        onDragEnd={onDragEnd}
      />
      <DragHandle
        position="bottom-right"
        mode="node"
        onDragStart={onDragStart}
        onDrag={onDragRight}
        onDragEnd={onDragEnd}
      />
    </>
  );
}
