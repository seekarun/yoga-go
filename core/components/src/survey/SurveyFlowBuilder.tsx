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
import type { SurveyQuestion, QuestionBranch, EditorLayout } from "@core/types";
import { getStartQuestion } from "@core/lib/survey-flow";
import {
  QuestionNode,
  FlowSelectionContext,
  type QuestionNodeData,
} from "./QuestionNode";
import { QuestionEditorPanel } from "./QuestionEditorPanel";
import { StartNode } from "./StartNode";
import {
  AddButtonEdge,
  type AddButtonEdgeData,
  type EdgeAction,
} from "./AddButtonEdge";
import { SurveyPreviewOverlay } from "./SurveyPreviewOverlay";

export interface SurveyFlowBuilderProps {
  questions: SurveyQuestion[];
  editorLayout: EditorLayout;
  onChange: (questions: SurveyQuestion[], layout: EditorLayout) => void;
  readOnly?: boolean;
  onInfer?: (
    question: string,
    answer: string,
    options: { id: string; label: string }[],
  ) => Promise<string | null>;
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
  background: "var(--color-primary, #008080)",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
};

const tryNowBtnStyle: CSSProperties = {
  padding: "8px 14px",
  fontSize: "13px",
  fontWeight: 600,
  background: "#fff",
  color: "var(--color-primary, #008080)",
  border: "2px solid var(--color-primary, #008080)",
  borderRadius: "6px",
  cursor: "pointer",
  boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
};

import { LINE_THICKNESS, LINE_SPACING, LAYER_GAP } from "./constants";

const edgeStyle: CSSProperties = {
  stroke: "var(--color-primary, #008080)",
  strokeWidth: LINE_THICKNESS,
  opacity: 0.35,
};

const highlightedEdgeStyle: CSSProperties = {
  stroke: "var(--color-accent, #ff7f50)",
  strokeWidth: LINE_THICKNESS,
  opacity: 1,
};

const dimmedEdgeStyle: CSSProperties = {
  stroke: "#d1d5db",
  strokeWidth: LINE_THICKNESS,
  opacity: 0.12,
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
function questionsToNodes(
  questions: SurveyQuestion[],
  layout: EditorLayout,
): QNode[] {
  const first = getStartQuestion(questions);
  const firstPos = (first ? layout[first.id] : undefined) ?? {
    x: 200,
    y: 200,
  };

  /** Remove React Flow's default wrapper border — we style borders on the inner div */
  const wrapperStyle: CSSProperties = { border: "none", boxShadow: "none" };

  // Align START handle with first question's target handle (left: LINE_SPACING)
  const startNode: QNode = {
    id: START_ID,
    type: "start",
    position: {
      x: firstPos.x + LINE_SPACING - 24,
      y: firstPos.y - LAYER_GAP,
    },
    deletable: false,
    selectable: false,
    style: wrapperStyle,
    data: { question: {} as SurveyQuestion },
  };

  const questionNodes: QNode[] = questions.map((q, i) => ({
    id: q.id,
    type: "question" as const,
    position: layout[q.id] ?? {
      x: 100 + (i % 3) * 320,
      y: 80 + Math.floor(i / 3) * 260,
    },
    style: wrapperStyle,
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
): Edge[] {
  const edges: Edge[] = [];
  const data = makeEdgeData(insertRef, readOnly);

  // Start → first question edge
  const first = getStartQuestion(questions);
  if (first) {
    edges.push({
      id: `${START_ID}-default-${first.id}`,
      source: START_ID,
      sourceHandle: "default",
      target: first.id,
      targetHandle: "target",
      animated: true,
      deletable: false,
      style: edgeStyle,
      type: "addButton",
      data: { ...data, turnDirection: "straight", startEdge: true },
    });
  }

  for (const q of questions) {
    const hasOpts =
      q.type === "multiple-choice" ||
      q.type === "classifier" ||
      (q.type === "text" && q.inference === "process");

    // Check if all option branches go to the same target → use single "any" edge
    if (hasOpts && q.options && q.options.length >= 2) {
      const optBranches = (q.branches ?? []).filter((b) => b.optionId);
      const optTargets = new Set(
        optBranches
          .filter((b) => b.nextQuestionId)
          .map((b) => b.nextQuestionId),
      );
      if (optTargets.size === 1 && optBranches.length === q.options.length) {
        const anyTarget = [...optTargets][0]!;
        edges.push({
          id: `${q.id}-any-${anyTarget}`,
          source: q.id,
          sourceHandle: "any",
          target: anyTarget,
          targetHandle: "target",
          animated: true,
          style: edgeStyle,
          type: "addButton",
          data: { ...data, turnDirection: "straight" as const },
        });
        // Also emit non-option branches (if any)
        for (const b of q.branches ?? []) {
          if (b.optionId || !b.nextQuestionId) continue;
          edges.push({
            id: `${q.id}-default-${b.nextQuestionId}`,
            source: q.id,
            sourceHandle: "default",
            target: b.nextQuestionId,
            targetHandle: "target",
            animated: true,
            style: edgeStyle,
            type: "addButton",
            data: { ...data, turnDirection: "straight" as const },
          });
        }
        continue; // skip per-option edges for this question
      }
    }

    // Check if all branches go to the same target (no fan-out needed)
    const branchTargets = new Set(
      (q.branches ?? [])
        .filter((b) => b.nextQuestionId)
        .map((b) => b.nextQuestionId),
    );
    const allSameTarget = branchTargets.size === 1;

    for (const b of q.branches ?? []) {
      if (!b.nextQuestionId) continue;
      const sourceHandle =
        hasOpts && b.optionId ? `option-${b.optionId}` : "default";

      // Arrow-shaped first segments: outermost lines (left & right) = 2 spacing,
      // each step inward adds +1 spacing, creating a downward chevron.
      // Left half turns left, right half turns right, center goes straight.
      // Exception: if all branches go to the same target, all go straight
      // to avoid U-turns.
      let firstSegment = LINE_SPACING;
      let turnDirection: "left" | "right" | "straight" = allSameTarget
        ? "straight"
        : "right";
      // Default/fallback branch on options questions → always straight
      if (hasOpts && !b.optionId) {
        turnDirection = "straight";
      } else if (hasOpts && b.optionId && q.options) {
        const optIdx = q.options.findIndex((o) => o.id === b.optionId);
        if (optIdx >= 0) {
          const n = q.options.length;
          const distFromEdge = Math.min(optIdx, n - 1 - optIdx);
          firstSegment = (2 + distFromEdge) * LINE_SPACING;

          if (allSameTarget) {
            turnDirection = "straight";
          } else if (n % 2 === 1 && optIdx === Math.floor(n / 2)) {
            turnDirection = "straight";
          } else if (optIdx >= n / 2) {
            turnDirection = "left";
          } else {
            turnDirection = "right";
          }
        }
      }

      edges.push({
        id: `${q.id}-${sourceHandle}-${b.nextQuestionId}`,
        source: q.id,
        sourceHandle,
        target: b.nextQuestionId,
        targetHandle: "target",
        animated: true,
        style: edgeStyle,
        type: "addButton",
        data: { ...data, firstSegment, turnDirection },
      });
    }
  }

  // For targets with multiple incoming edges, set a shared lastSegment
  // so the final vertical drop and preceding horizontal are uniform.
  const incomingCount = new Map<string, number>();
  for (const e of edges) {
    incomingCount.set(e.target, (incomingCount.get(e.target) ?? 0) + 1);
  }
  const SHARED_LAST_SEGMENT = 2 * LINE_SPACING;
  for (const e of edges) {
    if ((incomingCount.get(e.target) ?? 0) > 1) {
      e.data = { ...e.data, lastSegment: SHARED_LAST_SEGMENT };
    }
  }

  return edges;
}

/**
 * Re-derive branches from edges (filters out Start node edges).
 * Handles "any" edges by expanding them to all option branches.
 * Individual option edges override "any" expansions.
 */
function edgesToBranches(
  edges: Edge[],
  question: SurveyQuestion,
): QuestionBranch[] {
  const hasOpts =
    question.type === "multiple-choice" ||
    question.type === "classifier" ||
    (question.type === "text" && question.inference === "process");

  const filtered = edges.filter(
    (e) => e.source === question.id && e.source !== START_ID,
  );

  // Use a map to deduplicate: optionId → nextQuestionId
  const branchMap = new Map<string | undefined, string>();

  // 1) "any" edges set all options (low priority)
  for (const e of filtered) {
    if (e.sourceHandle === "any" && hasOpts && question.options) {
      for (const opt of question.options) {
        branchMap.set(opt.id, e.target);
      }
    }
  }

  // 2) Individual edges override "any" expansions
  for (const e of filtered) {
    if (e.sourceHandle?.startsWith("option-")) {
      const optionId = e.sourceHandle.replace("option-", "");
      branchMap.set(optionId, e.target);
    } else if (e.sourceHandle !== "any") {
      // default branch (non-MC, non-AI questions)
      branchMap.set(undefined, e.target);
    }
  }

  return [...branchMap.entries()].map(([optionId, nextQuestionId]) => ({
    optionId,
    nextQuestionId,
  }));
}

function SurveyFlowBuilderInner({
  questions,
  editorLayout,
  onChange,
  readOnly = false,
  onInfer,
}: SurveyFlowBuilderProps) {
  // Stable ref for the insert handler (avoids stale closures in edge data)
  const insertRef = useRef<InsertHandler | null>(null);

  const initialNodes = useMemo(
    () => questionsToNodes(questions, editorLayout),
    [questions, editorLayout],
  );
  const initialEdges = useMemo(
    () => questionsToEdges(questions, insertRef, readOnly),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- insertRef is stable, readOnly rarely changes
    [questions, readOnly],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [highlightTick, setHighlightTick] = useState(0);
  const { screenToFlowPosition, fitView } = useReactFlow();

  // Track the source of a pending connection drag
  const connectStartRef = useRef<{
    nodeId: string;
    handleId: string | null;
  } | null>(null);

  // Undo history — stores (questions, layout) tuples
  const historyRef = useRef<
    { questions: SurveyQuestion[]; layout: EditorLayout }[]
  >([]);
  const isUndoingRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);

  // Track the current layout (kept in sync via ref for perf)
  const layoutRef = useRef<EditorLayout>(editorLayout);

  // Suppress path highlighting during node drag
  const isDraggingRef = useRef(false);

  const selectedQuestion = useMemo(
    () => questions.find((q) => q.id === selectedId) ?? null,
    [questions, selectedId],
  );

  // Highlight edges and neighbor nodes connected to the selected node or edge
  // Also dim nodes/edges NOT on any path through the selected node
  useEffect(() => {
    // Skip highlighting while dragging — re-triggered on drag end via highlightTick
    if (isDraggingRef.current) return;

    const connectedEdgeIds = new Set<string>();
    const neighborIds = new Set<string>();
    // Track which handles on each node are on highlighted edges
    const nodeHighlightedHandles = new Map<string, Set<string>>();

    const addHandle = (nodeId: string, handle: string) => {
      let s = nodeHighlightedHandles.get(nodeId);
      if (!s) {
        s = new Set();
        nodeHighlightedHandles.set(nodeId, s);
      }
      s.add(handle);
    };

    // Build on-path set: upstream + selected + downstream via BFS
    const onPath = new Set<string>();
    const upstream = new Set<string>();
    const downstream = new Set<string>();

    if (selectedEdgeId) {
      for (const e of edges) {
        if (e.id === selectedEdgeId) {
          connectedEdgeIds.add(e.id);
          neighborIds.add(e.source);
          neighborIds.add(e.target);
          if (e.sourceHandle) addHandle(e.source, e.sourceHandle);
          addHandle(e.target, "target");
          break;
        }
      }
    } else if (selectedId) {
      // Build forward and reverse adjacency maps
      const fwd = new Map<string, string[]>();
      const rev = new Map<string, string[]>();
      for (const e of edges) {
        fwd.set(e.source, [...(fwd.get(e.source) ?? []), e.target]);
        rev.set(e.target, [...(rev.get(e.target) ?? []), e.source]);
      }

      // BFS downstream from selected node
      const dQueue = [selectedId];
      while (dQueue.length > 0) {
        const cur = dQueue.pop()!;
        for (const next of fwd.get(cur) ?? []) {
          if (!downstream.has(next)) {
            downstream.add(next);
            dQueue.push(next);
          }
        }
      }

      // BFS upstream from selected node
      const uQueue = [selectedId];
      while (uQueue.length > 0) {
        const cur = uQueue.pop()!;
        for (const prev of rev.get(cur) ?? []) {
          if (!upstream.has(prev)) {
            upstream.add(prev);
            uQueue.push(prev);
          }
        }
      }

      // Combine: upstream + selected + downstream
      for (const id of upstream) onPath.add(id);
      onPath.add(selectedId);
      for (const id of downstream) onPath.add(id);

      // Existing neighbor/handle highlight logic (accent borders for direct neighbors)
      for (const e of edges) {
        if (e.source === selectedId || e.target === selectedId) {
          connectedEdgeIds.add(e.id);
          if (e.source === selectedId) {
            neighborIds.add(e.target);
            if (e.sourceHandle) addHandle(e.source, e.sourceHandle);
            addHandle(e.target, "target");
          }
          if (e.target === selectedId) {
            neighborIds.add(e.source);
            if (e.sourceHandle) addHandle(e.source, e.sourceHandle);
            addHandle(e.target, "target");
          }
        }
      }
    }

    // Helper: does an edge truly lie on a path *through* the selected node?
    // Edges from an upstream node directly to a downstream node bypass the
    // selected node and should be treated as off-path even though both
    // endpoints are in `onPath`.
    const isEdgeOnPath = (src: string, tgt: string): boolean => {
      if (!onPath.has(src) || !onPath.has(tgt)) return false;
      // upstream → downstream (bypasses selected) is NOT on-path
      if (upstream.has(src) && downstream.has(tgt)) return false;
      return true;
    };

    // Compute on-path handles: source handles whose edge truly lies on the
    // path through the selected node (excludes accent-highlighted handles)
    const nodeOnPathHandles = new Map<string, Set<string>>();
    if (selectedId && !selectedEdgeId) {
      for (const e of edges) {
        if (!e.sourceHandle || !isEdgeOnPath(e.source, e.target)) continue;
        // Skip handles that are already accent-highlighted (direct neighbors)
        const hlHandles = nodeHighlightedHandles.get(e.source);
        if (hlHandles?.has(e.sourceHandle)) continue;
        let s = nodeOnPathHandles.get(e.source);
        if (!s) {
          s = new Set();
          nodeOnPathHandles.set(e.source, s);
        }
        s.add(e.sourceHandle);
      }
    }

    const hasSelection = !!(selectedId || selectedEdgeId);

    setEdges((prev) =>
      prev.map((e) => {
        const isHighlighted = connectedEdgeIds.has(e.id);
        // Dim edges not truly on the path through the selected node
        const isDimmed =
          selectedId && !selectedEdgeId
            ? !isEdgeOnPath(e.source, e.target)
            : false;
        const target = isHighlighted
          ? highlightedEdgeStyle
          : isDimmed
            ? dimmedEdgeStyle
            : edgeStyle;
        const newData = { ...e.data, highlighted: isHighlighted };
        return e.style === target && e.data?.highlighted === isHighlighted
          ? e
          : { ...e, style: target, data: newData };
      }),
    );
    setNodes((prev) =>
      prev.map((n) => {
        const shouldHighlight = neighborIds.has(n.id);
        const shouldDim =
          hasSelection && selectedId && !selectedEdgeId
            ? !onPath.has(n.id)
            : false;
        const handles = nodeHighlightedHandles.get(n.id);
        const handleArr = handles ? Array.from(handles) : [];
        const pathHandles = nodeOnPathHandles.get(n.id);
        const pathArr = pathHandles ? Array.from(pathHandles) : [];
        const prevHandles: string[] =
          (n.data.highlightedHandles as string[]) ?? [];
        const prevPathHandles: string[] =
          (n.data.onPathHandles as string[]) ?? [];
        if (
          (n.data.highlighted ?? false) === shouldHighlight &&
          (n.data.dimmed ?? false) === shouldDim &&
          prevHandles.length === handleArr.length &&
          prevHandles.every((h, i) => h === handleArr[i]) &&
          prevPathHandles.length === pathArr.length &&
          prevPathHandles.every((h, i) => h === pathArr[i])
        )
          return n;
        return {
          ...n,
          data: {
            ...n.data,
            highlighted: shouldHighlight,
            highlightedHandles: handleArr,
            onPathHandles: pathArr,
            dimmed: shouldDim,
          },
        };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- edges read for neighbor lookup, highlightTick forces re-run after edge rebuilds
  }, [selectedId, selectedEdgeId, setEdges, setNodes, highlightTick]);

  /** Wrap onChange to record history before each mutation */
  const changeWithHistory = useCallback(
    (newQuestions: SurveyQuestion[], newLayout: EditorLayout) => {
      if (!isUndoingRef.current) {
        historyRef.current = [
          ...historyRef.current,
          { questions, layout: layoutRef.current },
        ];
        if (historyRef.current.length > 50) {
          historyRef.current = historyRef.current.slice(-50);
        }
        setCanUndo(true);
      }
      isUndoingRef.current = false;
      layoutRef.current = newLayout;
      onChange(newQuestions, newLayout);
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
        const isAnyEdge = sourceHandle === "any";
        const updatedQuestions = questions.map((q) => {
          if (q.id !== source || source === START_ID) return q;
          const srcHasOpts =
            q.type === "multiple-choice" ||
            q.type === "classifier" ||
            (q.type === "text" && q.inference === "process");
          return {
            ...q,
            branches: (q.branches ?? []).filter((b) => {
              // "any" edge → remove all option branches pointing to target
              if (isAnyEdge) {
                return b.nextQuestionId !== target;
              }
              const branchHandle =
                srcHasOpts && b.optionId ? `option-${b.optionId}` : "default";
              return !(
                b.nextQuestionId === target &&
                branchHandle === (sourceHandle ?? "default")
              );
            }),
          };
        });
        const curLayout = layoutRef.current;
        setNodes(questionsToNodes(updatedQuestions, curLayout));
        setEdges(questionsToEdges(updatedQuestions, insertRef, readOnly));
        setHighlightTick((t) => t + 1);
        changeWithHistory(updatedQuestions, curLayout);
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
        };
      } else if (action === "classifier") {
        const opt1Id = generateId();
        const opt2Id = generateId();
        newQ = {
          id: newId,
          questionText: "Classifier",
          type: "classifier",
          required: false,
          order: questions.length + 1,
          options: [
            { id: opt1Id, label: "Condition 1" },
            { id: opt2Id, label: "Default" },
          ],
          branches: [
            { optionId: opt1Id, nextQuestionId: target },
            { optionId: opt2Id, nextQuestionId: target },
          ],
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
        };
      }

      // Position new node midway between source and target → layout map
      let newPos = { x: 0, y: 0 };
      const sourceNode = nodes.find(
        (n) => n.id === (source === START_ID ? START_ID : source),
      );
      const targetNode = nodes.find((n) => n.id === target);
      if (sourceNode && targetNode) {
        const sourceBottom =
          sourceNode.position.y + (sourceNode.measured?.height ?? 160);
        const midY = (sourceBottom + targetNode.position.y) / 2;
        const sourceCenterX =
          sourceNode.position.x +
          (sourceNode.measured?.width ?? DEFAULT_NODE_WIDTH) / 2;
        newPos = {
          x: sourceCenterX - DEFAULT_NODE_WIDTH / 2,
          y: midY,
        };
      }
      const newLayout = { ...layoutRef.current, [newId]: newPos };

      let updatedQuestions: SurveyQuestion[];

      const isAnyInsert = sourceHandle === "any";

      if (source === START_ID) {
        updatedQuestions = [...questions, newQ];
      } else {
        // Source branch now points to the new node instead of the old target
        updatedQuestions = questions.map((q) => {
          if (q.id !== source) return q;
          const srcHasOpts =
            q.type === "multiple-choice" ||
            q.type === "classifier" ||
            (q.type === "text" && q.inference === "process");
          return {
            ...q,
            branches: (q.branches ?? []).map((b) => {
              // "any" edge → redirect all option branches pointing to target
              if (isAnyInsert && b.nextQuestionId === target) {
                return { ...b, nextQuestionId: newId };
              }
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

      setNodes(questionsToNodes(updatedQuestions, newLayout));
      setEdges(questionsToEdges(updatedQuestions, insertRef, readOnly));
      setHighlightTick((t) => t + 1);
      changeWithHistory(updatedQuestions, newLayout);
      setSelectedId(newId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    layoutRef.current = prev.layout;
    setNodes(questionsToNodes(prev.questions, prev.layout));
    setEdges(questionsToEdges(prev.questions, insertRef, readOnly));
    setHighlightTick((t) => t + 1);
    onChange(prev.questions, prev.layout);
  }, [onChange, readOnly, setNodes, setEdges]);

  /** Arrange nodes in a top-down tree layout */
  const arrangeNodes = useCallback(() => {
    const H_GAP = 2 * LINE_SPACING;

    const V_GAP = 8 * LINE_SPACING;

    // Build adjacency: source → target[], target → parents[]
    const children = new Map<string, string[]>();
    const parents = new Map<string, string[]>();
    const allIds = new Set<string>();

    for (const n of nodes) {
      allIds.add(n.id);
    }

    // Build question option index lookup: questionId → { optionId → index }
    const qOptIdx = new Map<string, Map<string, number>>();
    for (const q of questions) {
      if (q.options) {
        const m = new Map<string, number>();
        q.options.forEach((o, i) => m.set(o.id, i));
        qOptIdx.set(q.id, m);
      }
    }

    // Map (source→target) to option index for ordering
    const edgeOptionIdx = new Map<string, number>();

    for (const e of edges) {
      if (!allIds.has(e.source) || !allIds.has(e.target)) continue;
      const c = children.get(e.source) ?? [];
      if (!c.includes(e.target)) c.push(e.target);
      children.set(e.source, c);
      const p = parents.get(e.target) ?? [];
      if (!p.includes(e.source)) p.push(e.source);
      parents.set(e.target, p);

      // Record option index for this edge
      const handle = e.sourceHandle ?? "default";
      const optId = handle.startsWith("option-")
        ? handle.replace("option-", "")
        : null;
      const idx = optId != null ? (qOptIdx.get(e.source)?.get(optId) ?? 0) : 0;
      edgeOptionIdx.set(`${e.source}->${e.target}`, idx);
    }

    // Assign layers via BFS: layer = max(parent layers) + 1
    const layer = new Map<string, number>();
    layer.set(START_ID, 0);
    const queue = [START_ID];
    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      const curLayer = layer.get(cur) ?? 0;
      for (const child of children.get(cur) ?? []) {
        const prev = layer.get(child) ?? -1;
        if (curLayer + 1 > prev) {
          layer.set(child, curLayer + 1);
          queue.push(child);
        }
      }
    }

    // Assign layer 1 to any unconnected nodes
    for (const n of nodes) {
      if (!layer.has(n.id) && n.id !== START_ID) {
        layer.set(n.id, 1);
      }
    }

    // Group nodes by layer
    const layers = new Map<number, string[]>();
    for (const [id, l] of layer) {
      const arr = layers.get(l) ?? [];
      arr.push(id);
      layers.set(l, arr);
    }

    // Measure node dimensions from DOM
    const heights = new Map<string, number>();
    const widths = new Map<string, number>();
    for (const n of nodes) {
      heights.set(n.id, n.measured?.height ?? 80);
      widths.set(n.id, n.measured?.width ?? DEFAULT_NODE_WIDTH);
    }

    // Compute Y per node: V_GAP below the bottom of its lowest parent
    const posY = new Map<string, number>();
    const maxLayer = Math.max(...layer.values());
    posY.set(START_ID, 0);
    for (let l = 1; l <= maxLayer; l++) {
      for (const id of layers.get(l) ?? []) {
        const nodeParents = parents.get(id) ?? [];
        let lowestParentBottom = 0;
        for (const pid of nodeParents) {
          const py = posY.get(pid) ?? 0;
          const ph = heights.get(pid) ?? 80;
          lowestParentBottom = Math.max(lowestParentBottom, py + ph);
        }
        posY.set(id, lowestParentBottom + V_GAP);
      }

      // Align siblings from the same source to the same Y (max among them)
      for (const parentId of layers.get(l - 1) ?? []) {
        const kids = (children.get(parentId) ?? []).filter(
          (c) => layer.get(c) === l,
        );
        if (kids.length < 2) continue;
        const maxY = Math.max(...kids.map((k) => posY.get(k) ?? 0));
        for (const k of kids) {
          posY.set(k, maxY);
        }
      }
    }

    // Compute X: siblings from the same source placed side-by-side,
    // sorted by handle order (descending option index = left-to-right)
    const posX = new Map<string, number>();
    for (let l = 0; l <= maxLayer; l++) {
      const layerNodes = layers.get(l) ?? [];
      // Group nodes by their primary parent (first parent)
      const siblingGroups = new Map<string, string[]>();
      const orphans: string[] = [];
      for (const id of layerNodes) {
        const nodeParents = parents.get(id) ?? [];
        if (nodeParents.length > 0) {
          const primaryParent = nodeParents[0];
          const group = siblingGroups.get(primaryParent) ?? [];
          group.push(id);
          siblingGroups.set(primaryParent, group);
        } else {
          orphans.push(id);
        }
      }

      // Sort each sibling group by descending option index (bottommost option leftmost, topmost rightmost)
      for (const [parentId, group] of siblingGroups) {
        group.sort((a, b) => {
          const aIdx = edgeOptionIdx.get(`${parentId}->${a}`) ?? 0;
          const bIdx = edgeOptionIdx.get(`${parentId}->${b}`) ?? 0;
          return bIdx - aIdx;
        });
      }

      // Order groups by parent X, then lay out sequentially
      const sortedParents = [...siblingGroups.keys()].sort(
        (a, b) => (posX.get(a) ?? 0) - (posX.get(b) ?? 0),
      );

      let x = 0;
      // Place orphans first
      for (const id of orphans) {
        posX.set(id, x);
        x += (widths.get(id) ?? DEFAULT_NODE_WIDTH) + H_GAP;
      }
      // Place sibling groups
      for (const parentId of sortedParents) {
        const group = siblingGroups.get(parentId) ?? [];
        for (const id of group) {
          posX.set(id, x);
          x += (widths.get(id) ?? DEFAULT_NODE_WIDTH) + H_GAP;
        }
      }
    }

    // Multi-parent nodes: left edge flush with leftmost source node's left edge
    for (const [id, nodeParents] of parents) {
      if (nodeParents.length < 2) continue;
      const leftmostParentX = Math.min(
        ...nodeParents.map((pid) => posX.get(pid) ?? 0),
      );
      posX.set(id, leftmostParentX);
    }

    // Single-parent nodes attached to the leftmost output handle:
    // flush left edge with source node's left edge
    for (const [id, nodeParents] of parents) {
      if (nodeParents.length !== 1) continue;
      const parentId = nodeParents[0];
      const optIdx = edgeOptionIdx.get(`${parentId}->${id}`) ?? 0;
      // Find the parent's max option index (leftmost handle)
      const parentQ = questions.find((q) => q.id === parentId);
      const pHasOpts =
        parentQ &&
        (parentQ.type === "multiple-choice" ||
          parentQ.type === "classifier" ||
          (parentQ.type === "text" && parentQ.inference === "process"));
      const pOptCount = pHasOpts ? (parentQ?.options?.length ?? 0) : 0;
      if (pOptCount > 1 && optIdx === pOptCount - 1) {
        posX.set(id, posX.get(parentId) ?? 0);
      }
    }

    // Ensure siblings from the same parent have at least H_GAP horizontal
    // spacing even when placed on different layers, ordered by descending
    // option index (bottommost option leftmost, topmost rightmost)
    for (const [parentId, kids] of children) {
      if (kids.length < 2) continue;
      const sorted = [...kids].sort((a, b) => {
        const aIdx = edgeOptionIdx.get(`${parentId}->${a}`) ?? 0;
        const bIdx = edgeOptionIdx.get(`${parentId}->${b}`) ?? 0;
        return bIdx - aIdx;
      });
      for (let i = 1; i < sorted.length; i++) {
        const prevId = sorted[i - 1];
        const currId = sorted[i];
        const prevRight =
          (posX.get(prevId) ?? 0) + (widths.get(prevId) ?? DEFAULT_NODE_WIDTH);
        const currLeft = posX.get(currId) ?? 0;
        const minLeft = prevRight + H_GAP;
        if (currLeft < minLeft) {
          posX.set(currId, minLeft);
        }
      }
    }

    // Ensure children are on the correct side of their source handle.
    // Right-bending handles: child left edge >= handleX + 2 spacings
    // Left-bending handles: child right edge <= handleX - 2 spacings
    for (const [parentId, kids] of children) {
      if (parentId === START_ID) continue;
      const parentQ = questions.find((q) => q.id === parentId);
      if (!parentQ?.options || parentQ.options.length < 2) continue;
      const pHasOpts =
        parentQ.type === "multiple-choice" ||
        parentQ.type === "classifier" ||
        (parentQ.type === "text" && parentQ.inference === "process");
      if (!pHasOpts) continue;

      // Skip if all option branches go to the same target (uses "any" edge)
      const optBranches = (parentQ.branches ?? []).filter((b) => b.optionId);
      const optTargets = new Set(
        optBranches
          .filter((b) => b.nextQuestionId)
          .map((b) => b.nextQuestionId),
      );
      if (optTargets.size <= 1) continue;

      const n = parentQ.options.length;
      const parentX = posX.get(parentId) ?? 0;
      const parentW = widths.get(parentId) ?? DEFAULT_NODE_WIDTH;

      for (const kidId of kids) {
        const optIdx = edgeOptionIdx.get(`${parentId}->${kidId}`) ?? -1;
        if (optIdx < 0) continue;

        // Determine turn direction (mirrors edge routing logic)
        let turnDir: "left" | "right" | "straight";
        if (n % 2 === 1 && optIdx === Math.floor(n / 2)) {
          turnDir = "straight";
        } else if (optIdx >= n / 2) {
          turnDir = "left";
        } else {
          turnDir = "right";
        }
        if (turnDir === "straight") continue;

        // Handle absolute X = card left + card width - (optIdx + 1) * spacing
        const handleX = parentX + parentW - (optIdx + 1) * LINE_SPACING;
        const childX = posX.get(kidId) ?? 0;
        const childW = widths.get(kidId) ?? DEFAULT_NODE_WIDTH;

        if (turnDir === "right") {
          const minLeft = handleX + 2 * LINE_SPACING;
          if (childX < minLeft) {
            posX.set(kidId, minLeft);
          }
        } else {
          // left: child right edge <= handleX - 2 spacings
          const maxLeft = handleX - 2 * LINE_SPACING - childW;
          if (childX > maxLeft) {
            posX.set(kidId, maxLeft);
          }
        }
      }
    }

    // Re-run sibling spacing after handle-based positioning to fix overlaps
    // caused by left-bending children being pushed into each other
    for (const [parentId, kids] of children) {
      if (kids.length < 2) continue;
      const sorted = [...kids].sort((a, b) => {
        const aIdx = edgeOptionIdx.get(`${parentId}->${a}`) ?? 0;
        const bIdx = edgeOptionIdx.get(`${parentId}->${b}`) ?? 0;
        return bIdx - aIdx;
      });
      for (let i = 1; i < sorted.length; i++) {
        const prevId = sorted[i - 1];
        const currId = sorted[i];
        const prevRight =
          (posX.get(prevId) ?? 0) + (widths.get(prevId) ?? DEFAULT_NODE_WIDTH);
        const currLeft = posX.get(currId) ?? 0;
        const minLeft = prevRight + H_GAP;
        if (currLeft < minLeft) {
          posX.set(currId, minLeft);
        }
      }
    }

    // Apply positions and persist to parent via layout map
    setNodes((prev) => {
      const updated = prev.map((n) => {
        const x = posX.get(n.id) ?? n.position.x;
        const y = posY.get(n.id) ?? n.position.y;
        return { ...n, position: { x, y } };
      });

      // Build layout map from arranged node positions
      const newLayout: EditorLayout = {};
      for (const n of updated) {
        if (n.id !== START_ID) {
          newLayout[n.id] = { x: n.position.x, y: n.position.y };
        }
      }

      setEdges(questionsToEdges(questions, insertRef, readOnly));
      setHighlightTick((t) => t + 1);
      changeWithHistory(questions, newLayout);

      return updated;
    });

    // Fit view after layout
    setTimeout(() => fitView({ padding: 0.2 }), 50);
  }, [
    nodes,
    edges,
    questions,
    readOnly,
    setNodes,
    setEdges,
    changeWithHistory,
    fitView,
  ]);

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

      // Extract layout from node positions
      const newLayout: EditorLayout = { ...layoutRef.current };
      for (const n of currentNodes) {
        if (n.id !== START_ID) {
          newLayout[n.id] = { x: n.position.x, y: n.position.y };
        }
      }

      // Filter out the virtual Start node before syncing
      const synced: SurveyQuestion[] = currentNodes
        .filter((n) => n.id !== START_ID)
        .map((n) => {
          const existing = qMap.get(n.id) ?? n.data.question;
          return {
            ...existing,
            branches: edgesToBranches(currentEdges, existing),
          };
        });

      changeWithHistory(synced, newLayout);
      return synced;
    },
    [questions, changeWithHistory],
  );

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

  /** Synchronously clear highlight/dimmed data from all nodes so the next
   *  render never shows stale accent borders (useEffect would be one frame late). */
  const clearNodeHighlights = useCallback(() => {
    setNodes((prev) =>
      prev.map((n) => {
        const hl = n.data.highlighted ?? false;
        const dm = n.data.dimmed ?? false;
        const handles = (n.data.highlightedHandles as string[]) ?? [];
        const pathHandles = (n.data.onPathHandles as string[]) ?? [];
        if (!hl && !dm && handles.length === 0 && pathHandles.length === 0)
          return n;
        return {
          ...n,
          data: {
            ...n.data,
            highlighted: false,
            highlightedHandles: [],
            onPathHandles: [],
            dimmed: false,
          },
        };
      }),
    );
  }, [setNodes]);

  /** Handle node drag / drag-end — persist positions */
  const handleNodesChange: OnNodesChange<QNode> = useCallback(
    (changes) => {
      // Block removal of the last finish node (keyboard Backspace)
      const filtered = changes.filter((c) => {
        if (c.type !== "remove") return true;
        return canDeleteQuestion(c.id);
      });

      onNodesChange(filtered);

      // Suppress path highlighting on drag start
      const hasDragStart = filtered.some(
        (c) => c.type === "position" && c.dragging,
      );
      if (hasDragStart && !isDraggingRef.current) {
        isDraggingRef.current = true;
        clearNodeHighlights();
        setEdges((prev) =>
          prev.map((e) =>
            e.style === edgeStyle && !e.data?.highlighted
              ? e
              : {
                  ...e,
                  style: edgeStyle,
                  data: { ...e.data, highlighted: false },
                },
          ),
        );
      }

      // Select the node being dragged so the editor panel opens
      for (const c of filtered) {
        if (c.type === "position" && c.dragging && c.id !== START_ID) {
          setSelectedEdgeId(null);
          setSelectedId(c.id);
          break;
        }
      }

      // On drag end, sync positions back to layout and rebuild edges
      const hasDragEnd = filtered.some(
        (c) => c.type === "position" && !c.dragging,
      );
      if (hasDragEnd) {
        isDraggingRef.current = false;
        setSelectedId(null);
        setSelectedEdgeId(null);
        requestAnimationFrame(() => {
          setNodes((latest) => {
            // Build updated layout from current node positions
            const newLayout: EditorLayout = { ...layoutRef.current };
            for (const n of latest) {
              if (n.id !== START_ID) {
                newLayout[n.id] = { x: n.position.x, y: n.position.y };
              }
            }

            setEdges(questionsToEdges(questions, insertRef, readOnly));
            setHighlightTick((t) => t + 1);
            changeWithHistory(questions, newLayout);
            // Deselect all nodes in React Flow's internal state
            return latest.map((n) =>
              n.selected ? { ...n, selected: false } : n,
            );
          });
        });
      }
    },
    [
      onNodesChange,
      canDeleteQuestion,
      questions,
      readOnly,
      setNodes,
      setEdges,
      changeWithHistory,
      clearNodeHighlights,
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
              return questionsToEdges(updatedQs, insertRef, readOnly);
            });
            return latest;
          });
          setHighlightTick((t) => t + 1);
        });
      }
    },
    [onEdgesChange, setNodes, setEdges, syncToParent, readOnly],
  );

  /** Handle new edge connection — removes existing edge from same source handle first */
  const onConnect = useCallback(
    (conn: Connection) => {
      setEdges((prev) => {
        const isAnyHandle = conn.sourceHandle === "any";
        const isOptionHandle = conn.sourceHandle?.startsWith("option-");
        // Remove conflicting edges from the same source
        const filtered = prev.filter((e) => {
          if (e.source !== conn.source) return true;
          // "any" replaces all option-* and previous "any" from this source
          if (isAnyHandle) {
            return (
              e.sourceHandle !== "any" && !e.sourceHandle?.startsWith("option-")
            );
          }
          // Connecting individual option removes existing "any" edge
          if (isOptionHandle && e.sourceHandle === "any") return false;
          // Normal: remove edge from same handle
          return e.sourceHandle !== conn.sourceHandle;
        });
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
            setEdges(questionsToEdges(updatedQs, insertRef, readOnly));
            setHighlightTick((t) => t + 1);
            return latestNodes;
          });
        });
        return next;
      });
    },
    [readOnly, setEdges, setNodes, syncToParent],
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
        branches: [],
      };

      // Store the position in the layout map, not on the question
      const newPos = { x: position.x, y: position.y };

      const newNode: QNode = {
        id,
        type: "question",
        position: newPos,
        data: { question: newQ },
      };

      layoutRef.current = { ...layoutRef.current, [id]: newPos };

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
      // Remove conflicting edges from same source before adding new one
      const isAnyDrag = origin.handleId === "any";
      const isOptionDrag = origin.handleId?.startsWith("option-");
      setEdges((prev) => [
        ...prev.filter((e) => {
          if (e.source !== origin.nodeId) return true;
          if (isAnyDrag) {
            return (
              e.sourceHandle !== "any" && !e.sourceHandle?.startsWith("option-")
            );
          }
          if (isOptionDrag && e.sourceHandle === "any") return false;
          return e.sourceHandle !== origin.handleId;
        }),
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
            return questionsToEdges(syncedQs, insertRef, readOnly);
          });
          return latestNodes;
        });
        setHighlightTick((t) => t + 1);
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
    ],
  );

  /** Handle node click to open editor */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- React Flow onNodeClick types are loosely generic
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: QNode) => {
      setSelectedEdgeId(null);
      if (!readOnly && node.id !== START_ID) setSelectedId(node.id);
    },
    [readOnly],
  );

  /** Handle edge click to highlight single line */
  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      setSelectedId(null);
      setSelectedEdgeId(edge.id);
      clearNodeHighlights();
    },
    [clearNodeHighlights],
  );

  /** Clear selection on pane click */
  const onPaneClick = useCallback(() => {
    setSelectedId(null);
    setSelectedEdgeId(null);
    clearNodeHighlights();
  }, [clearNodeHighlights]);

  /** Add a new question */
  const addQuestion = useCallback(
    (type: "text" | "multiple-choice" | "classifier") => {
      const id = generateId();
      const order = questions.length + 1;
      const newQ: SurveyQuestion = {
        id,
        questionText: type === "classifier" ? "Classifier" : "",
        type,
        required: false,
        order,
        options:
          type === "multiple-choice"
            ? [
                { id: generateId(), label: "Option 1" },
                { id: generateId(), label: "Option 2" },
              ]
            : type === "classifier"
              ? [
                  { id: generateId(), label: "Condition 1" },
                  { id: generateId(), label: "Default" },
                ]
              : undefined,
        branches: [],
      };

      const newPos = {
        x: 100 + (questions.length % 3) * 320,
        y: 80 + Math.floor(questions.length / 3) * 260,
      };
      const newLayout = { ...layoutRef.current, [id]: newPos };

      const newNode: QNode = {
        id,
        type: "question",
        position: newPos,
        data: { question: newQ },
      };

      setNodes((prev) => [...prev, newNode]);
      const updated = [...questions, newQ];
      changeWithHistory(updated, newLayout);
      setSelectedId(id);
    },
    [questions, changeWithHistory, setNodes],
  );

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
        setEdges(questionsToEdges(updatedQuestions, insertRef, readOnly));
        setHighlightTick((t) => t + 1);
        return updatedNodes;
      });
      changeWithHistory(updatedQuestions, layoutRef.current);
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

      // Remove deleted question from layout
      const { [questionId]: _removed, ...remainingLayout } = layoutRef.current;

      requestAnimationFrame(() => {
        changeWithHistory(updated, remainingLayout);
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
      <div style={toolbarStyle}>
        {!readOnly && (
          <>
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
              onClick={() => addQuestion("classifier")}
              style={toolbarBtnStyle}
            >
              + Classifier
            </button>
            <button
              onClick={undo}
              disabled={!canUndo}
              style={{
                ...toolbarBtnStyle,
                background: canUndo
                  ? "var(--color-primary, #008080)"
                  : "#9ca3af",
                cursor: canUndo ? "pointer" : "not-allowed",
                opacity: canUndo ? 1 : 0.6,
              }}
              title="Undo (Ctrl+Z)"
            >
              &#x21a9; Undo
            </button>
            <button onClick={arrangeNodes} style={toolbarBtnStyle}>
              Arrange
            </button>
          </>
        )}
        <button onClick={() => setShowPreview(true)} style={tryNowBtnStyle}>
          &#9654; Try Now
        </button>
      </div>

      <FlowSelectionContext.Provider value={!!selectedId}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={readOnly ? undefined : handleNodesChange}
          onEdgesChange={readOnly ? undefined : handleEdgesChange}
          onConnect={readOnly ? undefined : onConnect}
          onConnectStart={readOnly ? undefined : onConnectStart}
          onConnectEnd={readOnly ? undefined : onConnectEnd}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
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
      </FlowSelectionContext.Provider>

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

      {/* Preview overlay */}
      {showPreview && (
        <SurveyPreviewOverlay
          questions={questions}
          onClose={() => setShowPreview(false)}
          onInfer={onInfer}
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
