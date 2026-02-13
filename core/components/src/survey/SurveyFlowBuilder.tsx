"use client";

import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
} from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnectStart,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import type { SurveyQuestion, QuestionBranch } from "@core/types";
import { getStartQuestion } from "@core/lib/survey-flow";
import { QuestionNode, type QuestionNodeData } from "./QuestionNode";
import { QuestionEditorPanel } from "./QuestionEditorPanel";
import { StartNode } from "./StartNode";
import {
  AddButtonEdge,
  type AddButtonEdgeData,
  type EdgeAction,
} from "./AddButtonEdge";

export interface SurveyFlowBuilderProps {
  questions: SurveyQuestion[];
  onChange: (questions: SurveyQuestion[]) => void;
  readOnly?: boolean;
}

type QNode = Node<QuestionNodeData>;

const START_ID = "__start__";

const containerStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  minHeight: 500,
};

const toolbarStyle: CSSProperties = {
  position: "absolute",
  top: 12,
  left: 12,
  zIndex: 5,
  display: "flex",
  gap: "8px",
};

const toolbarBtnStyle: CSSProperties = {
  padding: "8px 14px",
  fontSize: "13px",
  fontWeight: 600,
  background: "var(--color-primary, #6366f1)",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
};

const edgeStyle: CSSProperties = {
  stroke: "var(--color-primary, #6366f1)",
  strokeWidth: 2,
};

const nodeTypes: NodeTypes = {
  question: QuestionNode,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- StartNode ignores data, cast is safe
  start: StartNode as any,
};

const edgeTypes: EdgeTypes = {
  addButton: AddButtonEdge,
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

const DEFAULT_NODE_WIDTH = 250;
const DEFAULT_NODE_HEIGHT = 120;
/** Minimum gap between nodes when dragging (collision padding) */
const NODE_GAP = 10;

/**
 * Prevent a dragged node from overlapping any other node.
 * Returns the closest valid position to the proposed (px, py).
 */
function preventOverlap(
  px: number,
  py: number,
  w: number,
  h: number,
  dragId: string,
  allNodes: QNode[],
): { x: number; y: number } {
  let x = px;
  let y = py;

  for (const other of allNodes) {
    if (other.id === dragId) continue;
    const ow = other.measured?.width ?? DEFAULT_NODE_WIDTH;
    const oh = other.measured?.height ?? DEFAULT_NODE_HEIGHT;
    const ox = other.position.x;
    const oy = other.position.y;

    // Check bounding-box overlap (with gap)
    const overlapX = x < ox + ow + NODE_GAP && x + w + NODE_GAP > ox;
    const overlapY = y < oy + oh + NODE_GAP && y + h + NODE_GAP > oy;

    if (overlapX && overlapY) {
      // Compute the four possible pushes to resolve overlap
      const pushLeft = ox - NODE_GAP - w - x;
      const pushRight = ox + ow + NODE_GAP - x;
      const pushUp = oy - NODE_GAP - h - y;
      const pushDown = oy + oh + NODE_GAP - y;

      // Pick the axis with the smallest absolute displacement
      const options = [
        { dx: pushLeft, dy: 0, dist: Math.abs(pushLeft) },
        { dx: pushRight, dy: 0, dist: Math.abs(pushRight) },
        { dx: 0, dy: pushUp, dist: Math.abs(pushUp) },
        { dx: 0, dy: pushDown, dist: Math.abs(pushDown) },
      ];
      options.sort((a, b) => a.dist - b.dist);
      x += options[0].dx;
      y += options[0].dy;
    }
  }

  return { x, y };
}

function getNodeSizes(
  nodes: QNode[],
): Map<string, { width: number; height: number }> {
  const sizes = new Map<string, { width: number; height: number }>();
  for (const n of nodes) {
    sizes.set(n.id, {
      width: n.measured?.width ?? DEFAULT_NODE_WIDTH,
      height: n.measured?.height ?? 120,
    });
  }
  return sizes;
}

type InsertHandler = (
  edgeId: string,
  source: string,
  target: string,
  sourceHandle: string | null,
  action: EdgeAction,
) => void;

/**
 * Convert SurveyQuestion[] → React Flow nodes (prepends virtual Start node)
 */
function questionsToNodes(questions: SurveyQuestion[]): QNode[] {
  const first = getStartQuestion(questions);
  const firstPos = first?.position ?? { x: 200, y: 200 };

  const startNode: QNode = {
    id: START_ID,
    type: "start",
    position: { x: firstPos.x + 90, y: firstPos.y - 120 },
    deletable: false,
    selectable: false,
    data: { question: {} as SurveyQuestion },
  };

  const questionNodes: QNode[] = questions.map((q, i) => ({
    id: q.id,
    type: "question" as const,
    position: q.position ?? {
      x: 100 + (i % 3) * 320,
      y: 80 + Math.floor(i / 3) * 260,
    },
    data: { question: q },
  }));

  return [startNode, ...questionNodes];
}

/**
 * Build edge data for the addButton edge type
 */
function makeEdgeData(
  insertRef: React.MutableRefObject<InsertHandler | null>,
  readOnly: boolean,
): AddButtonEdgeData {
  return {
    onInsert: (edgeId, source, target, sourceHandle, action) =>
      insertRef.current?.(edgeId, source, target, sourceHandle, action),
    readOnly,
  };
}

/**
 * Convert SurveyQuestion branches → React Flow edges
 * (includes Start → first question edge)
 */
function questionsToEdges(
  questions: SurveyQuestion[],
  insertRef: React.MutableRefObject<InsertHandler | null>,
  readOnly: boolean,
  nodeSizes?: Map<string, { width: number; height: number }>,
): Edge[] {
  const edges: Edge[] = [];
  const data = makeEdgeData(insertRef, readOnly);

  // Collect all edges with source position info for global routing
  const pending: {
    edge: Omit<Edge, "data">;
    targetId: string;
    sourceRank: number;
  }[] = [];

  // Start → first question edge (included in routing group)
  const first = getStartQuestion(questions);
  if (first) {
    const firstPos = first.position ?? { x: 200, y: 200 };
    const startY = firstPos.y - 120; // matches questionsToNodes offset
    pending.push({
      edge: {
        id: `${START_ID}-default-${first.id}`,
        source: START_ID,
        sourceHandle: "default",
        target: first.id,
        targetHandle: "target",
        animated: true,
        deletable: false,
        style: edgeStyle,
        type: "addButton",
      },
      targetId: first.id,
      sourceRank: startY,
    });
  }

  for (const q of questions) {
    for (const b of q.branches ?? []) {
      if (!b.nextQuestionId) continue;
      const hasOpts =
        q.type === "multiple-choice" ||
        (q.type === "text" && q.inference === "process");
      const sourceHandle =
        hasOpts && b.optionId ? `option-${b.optionId}` : "default";

      // Rank = question Y + option index offset (higher Y = lower on screen)
      const optIdx =
        b.optionId && q.options
          ? q.options.findIndex((o) => o.id === b.optionId)
          : -1;
      const sourceRank = (q.position?.y ?? 0) + (optIdx >= 0 ? optIdx * 30 : 0);

      pending.push({
        edge: {
          id: `${q.id}-${sourceHandle}-${b.nextQuestionId}`,
          source: q.id,
          sourceHandle,
          target: b.nextQuestionId,
          targetHandle: "target",
          animated: true,
          style: edgeStyle,
          type: "addButton",
        },
        targetId: b.nextQuestionId,
        sourceRank,
      });
    }
  }

  // Group by target, sort by sourceRank descending (bottom-most source first → smallest offset)
  const byTarget = new Map<string, typeof pending>();
  for (const p of pending) {
    if (!byTarget.has(p.targetId)) byTarget.set(p.targetId, []);
    byTarget.get(p.targetId)!.push(p);
  }

  // Compute sourceSpreadOffset per source group so top options fan out further
  // right than bottom ones — keeps vertical lines from overlapping.
  const SPREAD_SPACING = 20;
  const bySource = new Map<string, typeof pending>();
  for (const p of pending) {
    const src = p.edge.source;
    if (!bySource.has(src)) bySource.set(src, []);
    bySource.get(src)!.push(p);
  }
  const sourceSpreadMap = new Map<string, number>();
  for (const [, group] of bySource.entries()) {
    if (group.length <= 1) {
      for (const p of group) sourceSpreadMap.set(p.edge.id, 0);
      continue;
    }
    // Sort ascending by sourceRank (top option first)
    group.sort((a, b) => a.sourceRank - b.sourceRank);
    const last = group.length - 1;
    group.forEach((p, i) => {
      // Top option (i=0) gets largest spread, bottom (i=last) gets 0
      sourceSpreadMap.set(p.edge.id, (last - i) * SPREAD_SPACING);
    });
  }

  // Look up target question positions for node-top reference
  const qMap = new Map(questions.map((q) => [q.id, q]));

  const SPACING = 15;
  for (const [targetId, group] of byTarget.entries()) {
    group.sort((a, b) => b.sourceRank - a.sourceRank);
    const last = group.length - 1;
    const targetQ = qMap.get(targetId);
    const targetNodeTop = targetQ?.position?.y ?? undefined;
    const targetNodeWidth =
      nodeSizes?.get(targetId)?.width ?? DEFAULT_NODE_WIDTH;
    const targetNodeRight =
      targetQ?.position?.x != null
        ? targetQ.position.x + targetNodeWidth
        : undefined;
    const maxPO = last * SPACING;
    group.forEach((p, i) => {
      edges.push({
        ...p.edge,
        data: {
          ...data,
          pathOffset: i * SPACING,
          approachOffset: (last - i) * SPACING,
          targetNodeTop,
          targetNodeRight,
          maxPathOffset: maxPO,
          sourceSpreadOffset: sourceSpreadMap.get(p.edge.id) ?? 0,
        },
      });
    });
  }

  return edges;
}

/**
 * Re-derive branches from edges (filters out Start node edges)
 */
function edgesToBranches(edges: Edge[], questionId: string): QuestionBranch[] {
  return edges
    .filter((e) => e.source === questionId && e.source !== START_ID)
    .map((e) => {
      const optionId = e.sourceHandle?.startsWith("option-")
        ? e.sourceHandle.replace("option-", "")
        : undefined;
      return {
        optionId,
        nextQuestionId: e.target,
      };
    });
}

function SurveyFlowBuilderInner({
  questions,
  onChange,
  readOnly = false,
}: SurveyFlowBuilderProps) {
  // Stable ref for the insert handler (avoids stale closures in edge data)
  const insertRef = useRef<InsertHandler | null>(null);

  const initialNodes = useMemo(() => questionsToNodes(questions), [questions]);
  const initialEdges = useMemo(
    () => questionsToEdges(questions, insertRef, readOnly),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- insertRef is stable, readOnly rarely changes
    [questions, readOnly],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();

  // Track the source of a pending connection drag
  const connectStartRef = useRef<{
    nodeId: string;
    handleId: string | null;
  } | null>(null);

  // Undo history
  const historyRef = useRef<SurveyQuestion[][]>([]);
  const isUndoingRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);

  const selectedQuestion = useMemo(
    () => questions.find((q) => q.id === selectedId) ?? null,
    [questions, selectedId],
  );

  /** Wrap onChange to record history before each mutation */
  const changeWithHistory = useCallback(
    (newQuestions: SurveyQuestion[]) => {
      if (!isUndoingRef.current) {
        historyRef.current = [...historyRef.current, questions];
        if (historyRef.current.length > 50) {
          historyRef.current = historyRef.current.slice(-50);
        }
        setCanUndo(true);
      }
      isUndoingRef.current = false;
      onChange(newQuestions);
    },
    [questions, onChange],
  );

  /** Insert a new question on an edge (pencil context menu) */
  const handleInsertOnEdge = useCallback(
    (
      _edgeId: string,
      source: string,
      target: string,
      sourceHandle: string | null,
      action: EdgeAction,
    ) => {
      // --- Delete edge action ---
      if (action === "delete") {
        const updatedQuestions = questions.map((q) => {
          if (q.id !== source || source === START_ID) return q;
          const srcHasOpts =
            q.type === "multiple-choice" ||
            (q.type === "text" && q.inference === "process");
          return {
            ...q,
            branches: (q.branches ?? []).filter((b) => {
              const branchHandle =
                srcHasOpts && b.optionId ? `option-${b.optionId}` : "default";
              return !(
                b.nextQuestionId === target &&
                branchHandle === (sourceHandle ?? "default")
              );
            }),
          };
        });
        setNodes(questionsToNodes(updatedQuestions));
        setEdges(questionsToEdges(updatedQuestions, insertRef, readOnly));
        changeWithHistory(updatedQuestions);
        return;
      }

      // --- Insert question actions ---
      const newId = generateId();

      let newQ: SurveyQuestion;
      if (action === "text") {
        newQ = {
          id: newId,
          questionText: "",
          type: "text",
          required: false,
          order: questions.length + 1,
          options: [],
          branches: [{ nextQuestionId: target }],
          position: { x: 0, y: 0 },
        };
      } else if (action === "finish") {
        newQ = {
          id: newId,
          questionText: "Thank you for your time",
          type: "finish",
          required: false,
          order: questions.length + 1,
          options: [],
          branches: [],
          position: { x: 0, y: 0 },
        };
      } else {
        // multiple-choice (default)
        const opt1Id = generateId();
        const opt2Id = generateId();
        newQ = {
          id: newId,
          questionText: "",
          type: "multiple-choice",
          required: false,
          order: questions.length + 1,
          options: [
            { id: opt1Id, label: "Option 1" },
            { id: opt2Id, label: "Option 2" },
          ],
          branches: [
            { optionId: opt1Id, nextQuestionId: target },
            { optionId: opt2Id, nextQuestionId: target },
          ],
          position: { x: 0, y: 0 },
        };
      }

      // Position new node below source, aligned with source X
      const sourceNode = nodes.find(
        (n) => n.id === (source === START_ID ? START_ID : source),
      );
      const targetNode = nodes.find((n) => n.id === target);
      const CASCADE_GAP = 60;
      const NODE_H = 160;
      const ROUTE_GAP = 20;
      const ROUTE_SPACING = 15;
      if (sourceNode && targetNode) {
        const sourceBottom =
          sourceNode.position.y + (sourceNode.measured?.height ?? NODE_H);
        newQ.position = {
          x: sourceNode.position.x,
          y: sourceBottom + CASCADE_GAP,
        };
      }

      let updatedQuestions: SurveyQuestion[];

      if (source === START_ID) {
        updatedQuestions = [...questions, newQ];
      } else {
        // Source branch now points to the new node instead of the old target
        updatedQuestions = questions.map((q) => {
          if (q.id !== source) return q;
          const srcHasOpts =
            q.type === "multiple-choice" ||
            (q.type === "text" && q.inference === "process");
          return {
            ...q,
            branches: (q.branches ?? []).map((b) => {
              const branchHandle =
                srcHasOpts && b.optionId ? `option-${b.optionId}` : "default";
              if (
                b.nextQuestionId === target &&
                branchHandle === (sourceHandle ?? "default")
              ) {
                return { ...b, nextQuestionId: newId };
              }
              return b;
            }),
          };
        });
        updatedQuestions = [...updatedQuestions, newQ];
      }

      // Cascade: push downstream nodes down and right to make room
      if (targetNode && newQ.position) {
        const newBottom = newQ.position.y + NODE_H;
        const minTargetY = newBottom + CASCADE_GAP;
        const pushDown = minTargetY - targetNode.position.y;

        const newNodeRight =
          newQ.position.x + (sourceNode?.measured?.width ?? DEFAULT_NODE_WIDTH);
        const routingNeed = newNodeRight + ROUTE_GAP + ROUTE_SPACING;
        const targetRight =
          targetNode.position.x +
          (targetNode.measured?.width ?? DEFAULT_NODE_WIDTH);
        const pushRight = Math.max(0, routingNeed - targetRight);

        if (pushDown > 0 || pushRight > 0) {
          updatedQuestions = updatedQuestions.map((q) => {
            if (q.id === newId) return q;
            if (q.position && q.position.y >= targetNode.position.y) {
              return {
                ...q,
                position: {
                  x: q.position.x + pushRight,
                  y: q.position.y + Math.max(0, pushDown),
                },
              };
            }
            return q;
          });
        }
      }

      // Rebuild nodes and edges from the updated questions
      setNodes(questionsToNodes(updatedQuestions));
      setEdges(questionsToEdges(updatedQuestions, insertRef, readOnly));
      changeWithHistory(updatedQuestions);
      setSelectedId(newId);
    },
    [questions, nodes, readOnly, setNodes, setEdges, changeWithHistory],
  );

  // Keep insertRef up to date every render
  insertRef.current = handleInsertOnEdge;

  /** Undo the last change */
  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    setCanUndo(historyRef.current.length > 0);
    isUndoingRef.current = true;
    setNodes(questionsToNodes(prev));
    setEdges(questionsToEdges(prev, insertRef, readOnly));
    onChange(prev);
  }, [onChange, readOnly, setNodes, setEdges]);

  /** Keyboard shortcut: Ctrl/Cmd+Z for undo */
  useEffect(() => {
    if (readOnly) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept undo inside text inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [undo, readOnly]);

  /** Remove orphan edges whose source or target node no longer exists */
  useEffect(() => {
    const nodeIds = new Set(nodes.map((n) => n.id));
    setEdges((prev) => {
      const cleaned = prev.filter(
        (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
      );
      return cleaned.length === prev.length ? prev : cleaned;
    });
  }, [nodes, setEdges]);

  /** Sync local flow state back to parent as SurveyQuestion[] */
  const syncToParent = useCallback(
    (
      currentNodes: QNode[],
      currentEdges: Edge[],
      updatedQuestions?: SurveyQuestion[],
    ): SurveyQuestion[] => {
      const base = updatedQuestions ?? questions;
      const qMap = new Map(base.map((q) => [q.id, q]));

      // Filter out the virtual Start node before syncing
      const synced: SurveyQuestion[] = currentNodes
        .filter((n) => n.id !== START_ID)
        .map((n) => {
          const existing = qMap.get(n.id) ?? n.data.question;
          return {
            ...existing,
            position: { x: n.position.x, y: n.position.y },
            branches: edgesToBranches(currentEdges, n.id),
          };
        });

      changeWithHistory(synced);
      return synced;
    },
    [questions, changeWithHistory],
  );

  /** Collect node measured sizes into a Map */
  const collectNodeSizes = useCallback((currentNodes: QNode[]) => {
    const sizes = new Map<string, { width: number; height: number }>();
    for (const n of currentNodes) {
      if (n.measured?.width && n.measured?.height) {
        sizes.set(n.id, {
          width: n.measured.width,
          height: n.measured.height,
        });
      }
    }
    return sizes;
  }, []);

  /** Check whether a question can be deleted (last finish node cannot) */
  const canDeleteQuestion = useCallback(
    (questionId: string) => {
      const q = questions.find((q) => q.id === questionId);
      if (!q || q.type !== "finish") return true;
      const finishCount = questions.filter((q) => q.type === "finish").length;
      return finishCount > 1;
    },
    [questions],
  );

  /**
   * After drag end, cascade node positions in topological order.
   * Ensures vertical spacing for routing lines, horizontal cascade indent,
   * and repositions the start node to follow the first question.
   * The anchorId (dragged node) keeps its position; everything else adjusts.
   */
  const autoSpaceNodes = useCallback(
    (currentNodes: QNode[], anchorId?: string): QNode[] => {
      const ROUTE_GAP = 20;
      const ROUTE_SPACING = 15;
      const START_H = 60;

      // Mutable position map — updated as we process in topological order
      const posMap = new Map(
        currentNodes.map((n) => [n.id, { x: n.position.x, y: n.position.y }]),
      );
      const sizeMap = new Map(
        currentNodes.map((n) => [
          n.id,
          {
            w: n.measured?.width ?? DEFAULT_NODE_WIDTH,
            h: n.measured?.height ?? (n.id === START_ID ? START_H : 160),
          },
        ]),
      );

      // Build graph from question branches
      const parentSet = new Map<string, Set<string>>();
      const edgeCount = new Map<string, number>();
      const childSet = new Map<string, Set<string>>();

      for (const q of questions) {
        for (const b of q.branches ?? []) {
          if (!b.nextQuestionId) continue;
          if (!parentSet.has(b.nextQuestionId))
            parentSet.set(b.nextQuestionId, new Set());
          parentSet.get(b.nextQuestionId)!.add(q.id);
          edgeCount.set(
            b.nextQuestionId,
            (edgeCount.get(b.nextQuestionId) ?? 0) + 1,
          );
          if (!childSet.has(q.id)) childSet.set(q.id, new Set());
          childSet.get(q.id)!.add(b.nextQuestionId);
        }
      }

      // Include start → first question
      const startQ = getStartQuestion(questions);
      if (startQ) {
        if (!parentSet.has(startQ.id)) parentSet.set(startQ.id, new Set());
        parentSet.get(startQ.id)!.add(START_ID);
        edgeCount.set(startQ.id, (edgeCount.get(startQ.id) ?? 0) + 1);
        if (!childSet.has(START_ID)) childSet.set(START_ID, new Set());
        childSet.get(START_ID)!.add(startQ.id);
      }

      // BFS topological order
      const order: string[] = [];
      const visited = new Set<string>();
      if (startQ) {
        const queue = [START_ID];
        visited.add(START_ID);
        while (queue.length > 0) {
          const id = queue.shift()!;
          order.push(id);
          for (const cid of childSet.get(id) ?? []) {
            if (!visited.has(cid)) {
              visited.add(cid);
              queue.push(cid);
            }
          }
        }
      }
      for (const n of currentNodes) {
        if (!visited.has(n.id)) order.push(n.id);
      }

      let changed = false;

      for (const nodeId of order) {
        if (nodeId === START_ID || nodeId === anchorId) continue;

        const pos = posMap.get(nodeId);
        const size = sizeMap.get(nodeId);
        if (!pos || !size) continue;

        const parents = [...(parentSet.get(nodeId) ?? [])];
        if (parents.length === 0) continue;

        const edges = edgeCount.get(nodeId) ?? 0;
        let maxPBottom = 0;
        let maxPRight = 0;

        for (const pid of parents) {
          const pPos = posMap.get(pid);
          const pSize = sizeMap.get(pid);
          if (!pPos || !pSize) continue;
          maxPBottom = Math.max(maxPBottom, pPos.y + pSize.h);
          maxPRight = Math.max(maxPRight, pPos.x + pSize.w);
        }

        let { x, y } = pos;

        // Vertical: enough gap for routing lines
        const minY = maxPBottom + ROUTE_GAP * 2 + edges * ROUTE_SPACING;
        if (y < minY) {
          changed = true;
          y = minY;
        }

        // Right edge must fit vertical routing lines
        const maxPO = Math.max(0, (edges - 1) * ROUTE_SPACING);
        const reqRight = maxPRight + ROUTE_GAP + maxPO;
        if (x + size.w < reqRight) {
          changed = true;
          x = reqRight - size.w;
        }

        posMap.set(nodeId, { x, y });
      }

      // Reposition start node relative to first question
      if (startQ) {
        const fPos = posMap.get(startQ.id);
        const sPos = posMap.get(START_ID);
        if (fPos && sPos) {
          const sx = fPos.x + 90;
          const sy = fPos.y - 120;
          if (sPos.x !== sx || sPos.y !== sy) {
            changed = true;
            posMap.set(START_ID, { x: sx, y: sy });
          }
        }
      }

      if (!changed) return currentNodes;
      return currentNodes.map((n) => {
        const np = posMap.get(n.id);
        if (!np || (np.x === n.position.x && np.y === n.position.y)) return n;
        return { ...n, position: np };
      });
    },
    [questions],
  );

  /** Handle node drag / drag-end — prevent overlap + persist positions */
  const handleNodesChange: OnNodesChange<QNode> = useCallback(
    (changes) => {
      // Block removal of the last finish node (keyboard Backspace)
      const filtered = changes.filter((c) => {
        if (c.type !== "remove") return true;
        return canDeleteQuestion(c.id);
      });

      // During drag, prevent the node from overlapping others
      const adjusted = filtered.map((c) => {
        if (c.type !== "position" || !c.dragging || !c.position) return c;
        const draggedNode = nodes.find((n) => n.id === c.id);
        if (!draggedNode) return c;
        const w = draggedNode.measured?.width ?? DEFAULT_NODE_WIDTH;
        const h = draggedNode.measured?.height ?? DEFAULT_NODE_HEIGHT;
        const corrected = preventOverlap(
          c.position.x,
          c.position.y,
          w,
          h,
          c.id,
          nodes,
        );
        if (corrected.x === c.position.x && corrected.y === c.position.y) {
          return c;
        }
        return { ...c, position: corrected };
      });
      onNodesChange(adjusted);
      // After position updates, rebuild edges with fresh routing data
      let dragEndId: string | undefined;
      for (const c of changes) {
        if (c.type === "position" && !c.dragging) {
          dragEndId = c.id;
          break;
        }
      }
      if (dragEndId) {
        const anchorId = dragEndId;
        requestAnimationFrame(() => {
          setNodes((latest) => {
            // Cascade node positions (dragged node stays, others adjust)
            const spaced = autoSpaceNodes(latest as QNode[], anchorId);

            // Build updated questions with current positions
            const qMap = new Map(questions.map((q) => [q.id, q]));
            const updatedQs: SurveyQuestion[] = (spaced as QNode[])
              .filter((n) => n.id !== START_ID)
              .map((n) => {
                const existing = qMap.get(n.id) ?? n.data.question;
                return {
                  ...existing,
                  position: { x: n.position.x, y: n.position.y },
                };
              });

            // Rebuild edges with fresh routing data
            const sizes = getNodeSizes(spaced as QNode[]);
            setEdges(questionsToEdges(updatedQs, insertRef, readOnly, sizes));
            changeWithHistory(updatedQs);

            return spaced;
          });
        });
      }
    },
    [
      onNodesChange,
      canDeleteQuestion,
      autoSpaceNodes,
      questions,
      readOnly,
      setNodes,
      setEdges,
      changeWithHistory,
      nodes,
    ],
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      const hasRemove = changes.some((c) => c.type === "remove");
      if (hasRemove) {
        requestAnimationFrame(() => {
          setNodes((latest) => {
            setEdges((latestEdges) => {
              const updatedQs = syncToParent(latest as QNode[], latestEdges);
              // Re-derive edges with proper routing offsets
              const sizes = collectNodeSizes(latest as QNode[]);
              return questionsToEdges(updatedQs, insertRef, readOnly, sizes);
            });
            return latest;
          });
        });
      }
    },
    [
      onEdgesChange,
      setNodes,
      setEdges,
      syncToParent,
      readOnly,
      collectNodeSizes,
    ],
  );

  /** Handle new edge connection — removes existing edge from same source handle first */
  const onConnect = useCallback(
    (conn: Connection) => {
      setEdges((prev) => {
        // Remove any existing edge from the same source handle (one edge per handle)
        const filtered = prev.filter(
          (e) =>
            !(e.source === conn.source && e.sourceHandle === conn.sourceHandle),
        );
        const next = addEdge(
          {
            ...conn,
            animated: true,
            style: edgeStyle,
            type: "addButton",
            data: makeEdgeData(insertRef, readOnly),
          },
          filtered,
        );
        requestAnimationFrame(() => {
          setNodes((latestNodes) => {
            const updatedQs = syncToParent(latestNodes as QNode[], next);
            // Re-derive edges with proper routing offsets
            const sizes = collectNodeSizes(latestNodes as QNode[]);
            setEdges(questionsToEdges(updatedQs, insertRef, readOnly, sizes));
            return latestNodes;
          });
        });
        return next;
      });
    },
    [readOnly, setEdges, setNodes, syncToParent, collectNodeSizes],
  );

  /** Track connection drag start so we know the source on drop */
  const onConnectStart: OnConnectStart = useCallback((_event, params) => {
    connectStartRef.current = {
      nodeId: params.nodeId ?? "",
      handleId: params.handleId ?? null,
    };
  }, []);

  /**
   * When a connection drag ends on empty canvas (no target node),
   * create a new MC question at the drop position and connect it.
   */
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const origin = connectStartRef.current;
      connectStartRef.current = null;
      if (!origin?.nodeId) return;

      // Check if the drop target is the canvas (not an existing node handle)
      const target = (event as MouseEvent).target as HTMLElement;
      const isPane = target.classList.contains("react-flow__pane");
      if (!isPane) return;

      // Get canvas position from mouse/touch coordinates
      const clientX =
        "changedTouches" in event
          ? event.changedTouches[0].clientX
          : (event as MouseEvent).clientX;
      const clientY =
        "changedTouches" in event
          ? event.changedTouches[0].clientY
          : (event as MouseEvent).clientY;

      const position = screenToFlowPosition({ x: clientX, y: clientY });

      // Create a new MC question node at the drop position
      const id = generateId();
      const order = questions.length + 1;
      const newQ: SurveyQuestion = {
        id,
        questionText: "",
        type: "multiple-choice",
        required: false,
        order,
        options: [
          { id: generateId(), label: "Option 1" },
          { id: generateId(), label: "Option 2" },
        ],
        position: { x: position.x, y: position.y },
        branches: [],
      };

      const newNode: QNode = {
        id,
        type: "question",
        position: newQ.position!,
        data: { question: newQ },
      };

      // Create the edge from source handle → new node
      const newEdge: Edge = {
        id: `${origin.nodeId}-${origin.handleId ?? "default"}-${id}`,
        source: origin.nodeId,
        sourceHandle: origin.handleId,
        target: id,
        targetHandle: "target",
        animated: true,
        style: edgeStyle,
        type: "addButton",
        data: makeEdgeData(insertRef, readOnly),
      };

      setNodes((prev) => [...prev, newNode]);
      // Remove any existing edge from the same source handle before adding new one
      setEdges((prev) => [
        ...prev.filter(
          (e) =>
            !(e.source === origin.nodeId && e.sourceHandle === origin.handleId),
        ),
        newEdge,
      ]);

      const updatedQuestions = [...questions, newQ];
      requestAnimationFrame(() => {
        setNodes((latestNodes) => {
          setEdges((latestEdges) => {
            const syncedQs = syncToParent(
              latestNodes as QNode[],
              latestEdges,
              updatedQuestions,
            );
            // Re-derive edges with proper routing offsets
            const sizes = collectNodeSizes(latestNodes as QNode[]);
            return questionsToEdges(syncedQs, insertRef, readOnly, sizes);
          });
          return latestNodes;
        });
      });

      setSelectedId(id);
    },
    [
      questions,
      readOnly,
      screenToFlowPosition,
      setNodes,
      setEdges,
      syncToParent,
      collectNodeSizes,
    ],
  );

  /** Handle node click to open editor */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- React Flow onNodeClick types are loosely generic
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: QNode) => {
      if (!readOnly && node.id !== START_ID) setSelectedId(node.id);
    },
    [readOnly],
  );

  /** Add a new question */
  const addQuestion = useCallback(
    (type: "text" | "multiple-choice") => {
      const id = generateId();
      const order = questions.length + 1;
      const newQ: SurveyQuestion = {
        id,
        questionText: "",
        type,
        required: false,
        order,
        options:
          type === "multiple-choice"
            ? [
                { id: generateId(), label: "Option 1" },
                { id: generateId(), label: "Option 2" },
              ]
            : undefined,
        position: {
          x: 100 + (questions.length % 3) * 320,
          y: 80 + Math.floor(questions.length / 3) * 260,
        },
        branches: [],
      };

      const newNode: QNode = {
        id,
        type: "question",
        position: newQ.position!,
        data: { question: newQ },
      };

      setNodes((prev) => [...prev, newNode]);
      const updated = [...questions, newQ];
      changeWithHistory(updated);
      setSelectedId(id);
    },
    [questions, changeWithHistory, setNodes],
  );

  /** Auto-arrange all nodes in a layered left-to-right layout */
  const arrangeNodes = useCallback(() => {
    // --- Build directed graph ---
    const childMap = new Map<string, string[]>();
    const parentMap = new Map<string, string[]>();

    const startQ = getStartQuestion(questions);
    if (startQ) {
      childMap.set(START_ID, [startQ.id]);
      if (!parentMap.has(startQ.id)) parentMap.set(startQ.id, []);
      parentMap.get(startQ.id)!.push(START_ID);
    }

    for (const q of questions) {
      const ch: string[] = [];
      for (const b of q.branches ?? []) {
        if (!b.nextQuestionId) continue;
        ch.push(b.nextQuestionId);
        if (!parentMap.has(b.nextQuestionId))
          parentMap.set(b.nextQuestionId, []);
        parentMap.get(b.nextQuestionId)!.push(q.id);
      }
      childMap.set(q.id, ch);
    }

    // --- BFS layering ---
    const layerOf = new Map<string, number>();
    const bfsQueue: string[] = [];

    if (startQ) {
      layerOf.set(START_ID, 0);
      bfsQueue.push(START_ID);
    }

    while (bfsQueue.length > 0) {
      const id = bfsQueue.shift()!;
      const depth = layerOf.get(id)!;
      for (const child of childMap.get(id) ?? []) {
        if (!layerOf.has(child)) {
          layerOf.set(child, depth + 1);
          bfsQueue.push(child);
        }
      }
    }

    // Unreachable nodes get their own layer at the end
    let maxLayer = 0;
    for (const l of layerOf.values()) maxLayer = Math.max(maxLayer, l);
    for (const q of questions) {
      if (!layerOf.has(q.id)) {
        maxLayer++;
        layerOf.set(q.id, maxLayer);
      }
    }

    // --- Group by layer (exclude start node — repositioned later) ---
    const layerGroups = new Map<number, string[]>();
    for (const [id, layer] of layerOf.entries()) {
      if (id === START_ID) continue;
      if (!layerGroups.has(layer)) layerGroups.set(layer, []);
      layerGroups.get(layer)!.push(id);
    }

    // --- Position layer by layer (left → right) ---
    const H_SPACING = 350;
    const V_GAP = 40;
    const BASE_X = 200;
    const BASE_Y = 200;

    // Measured heights for accurate vertical stacking
    const heightOf = new Map<string, number>();
    for (const n of nodes) {
      heightOf.set(n.id, n.measured?.height ?? DEFAULT_NODE_HEIGHT);
    }

    const positions = new Map<string, { x: number; y: number }>();
    const sortedLayers = [...layerGroups.keys()].sort((a, b) => a - b);

    for (const layer of sortedLayers) {
      const ids = layerGroups.get(layer)!;
      const x = BASE_X + (layer - 1) * H_SPACING;

      // Barycenter heuristic: sort by average parent Y to reduce crossings
      ids.sort((a, b) => {
        const avgY = (id: string) => {
          const pars = (parentMap.get(id) ?? []).filter((p) =>
            positions.has(p),
          );
          if (pars.length === 0) return 0;
          return (
            pars.reduce((s, p) => s + positions.get(p)!.y, 0) / pars.length
          );
        };
        return avgY(a) - avgY(b);
      });

      // Place each node at its ideal Y (barycenter), then resolve overlaps
      const idealYs: number[] = ids.map((id) => {
        const pars = (parentMap.get(id) ?? []).filter((p) => positions.has(p));
        if (pars.length === 0) return BASE_Y;
        return pars.reduce((s, p) => s + positions.get(p)!.y, 0) / pars.length;
      });

      // Resolve overlaps — ensure each node sits below the previous one
      for (let i = 0; i < ids.length; i++) {
        let y = idealYs[i];
        if (i > 0) {
          const prevId = ids[i - 1];
          const prevBottom =
            positions.get(prevId)!.y +
            (heightOf.get(prevId) ?? DEFAULT_NODE_HEIGHT);
          y = Math.max(y, prevBottom + V_GAP);
        }
        positions.set(ids[i], { x, y });
      }
    }

    // Position start node relative to first question
    if (startQ && positions.has(startQ.id)) {
      const fPos = positions.get(startQ.id)!;
      positions.set(START_ID, { x: fPos.x + 90, y: fPos.y - 120 });
    }

    // --- Apply ---
    const updatedQuestions = questions.map((q) => ({
      ...q,
      position: positions.get(q.id) ?? q.position,
    }));

    const newNodes = questionsToNodes(updatedQuestions);
    setNodes(newNodes);
    const sizes = getNodeSizes(nodes as QNode[]);
    setEdges(questionsToEdges(updatedQuestions, insertRef, readOnly, sizes));
    changeWithHistory(updatedQuestions);

    // Re-center the viewport after layout
    requestAnimationFrame(() => {
      fitView({ padding: 0.2 });
    });
  }, [
    questions,
    nodes,
    readOnly,
    setNodes,
    setEdges,
    changeWithHistory,
    fitView,
  ]);

  /** Update a question from the editor panel */
  const handleQuestionChange = useCallback(
    (updated: SurveyQuestion) => {
      const updatedQuestions = questions.map((q) =>
        q.id === updated.id ? updated : q,
      );

      setNodes((prev) => {
        const updatedNodes = prev.map((n) =>
          n.id === updated.id ? { ...n, data: { question: updated } } : n,
        );
        // Rebuild edges from branches so handle changes (e.g. MC→text) are reflected
        const sizes = getNodeSizes(updatedNodes as QNode[]);
        setEdges(
          questionsToEdges(updatedQuestions, insertRef, readOnly, sizes),
        );
        return updatedNodes;
      });
      changeWithHistory(updatedQuestions);
    },
    [questions, setNodes, setEdges, readOnly, changeWithHistory],
  );

  /** Delete a question */
  const handleDeleteQuestion = useCallback(
    (questionId: string) => {
      if (!canDeleteQuestion(questionId)) return;

      setNodes((prev) => prev.filter((n) => n.id !== questionId));
      setEdges((prev) =>
        prev.filter((e) => e.source !== questionId && e.target !== questionId),
      );

      const updated = questions.filter((q) => q.id !== questionId);
      if (selectedId === questionId) setSelectedId(null);

      requestAnimationFrame(() => {
        changeWithHistory(updated);
      });
    },
    [
      questions,
      selectedId,
      canDeleteQuestion,
      changeWithHistory,
      setNodes,
      setEdges,
    ],
  );

  return (
    <div style={containerStyle}>
      {/* Toolbar */}
      {!readOnly && (
        <div style={toolbarStyle}>
          <button onClick={() => addQuestion("text")} style={toolbarBtnStyle}>
            + Text Question
          </button>
          <button
            onClick={() => addQuestion("multiple-choice")}
            style={toolbarBtnStyle}
          >
            + Multiple Choice
          </button>
          <button
            onClick={arrangeNodes}
            style={toolbarBtnStyle}
            title="Arrange"
          >
            &#x2B26; Arrange
          </button>
          <button
            onClick={undo}
            disabled={!canUndo}
            style={{
              ...toolbarBtnStyle,
              background: canUndo ? "var(--color-primary, #6366f1)" : "#9ca3af",
              cursor: canUndo ? "pointer" : "not-allowed",
              opacity: canUndo ? 1 : 0.6,
            }}
            title="Undo (Ctrl+Z)"
          >
            &#x21a9; Undo
          </button>
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={readOnly ? undefined : handleNodesChange}
        onEdgesChange={readOnly ? undefined : handleEdgesChange}
        onConnect={readOnly ? undefined : onConnect}
        onConnectStart={readOnly ? undefined : onConnectStart}
        onConnectEnd={readOnly ? undefined : onConnectEnd}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        deleteKeyCode={readOnly ? null : "Backspace"}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} color="#f0f0f0" />
        <Controls showInteractive={false} />
      </ReactFlow>

      {/* Editor panel */}
      {!readOnly && selectedQuestion && (
        <QuestionEditorPanel
          key={selectedQuestion.id}
          question={selectedQuestion}
          onChange={handleQuestionChange}
          onDelete={handleDeleteQuestion}
          onClose={() => setSelectedId(null)}
          canDelete={canDeleteQuestion(selectedQuestion.id)}
        />
      )}
    </div>
  );
}

/**
 * Public export — wraps in ReactFlowProvider so useReactFlow() works.
 */
export function SurveyFlowBuilder(props: SurveyFlowBuilderProps) {
  return (
    <ReactFlowProvider>
      <SurveyFlowBuilderInner {...props} />
    </ReactFlowProvider>
  );
}
