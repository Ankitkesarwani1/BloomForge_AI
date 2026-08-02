import { useState, useEffect, useMemo } from "react";
import type { ReactElement } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  FileText,
  Plus,
  GripVertical,
  Trash2,
  Download,
  Sparkles,
  Loader2,
  Edit2,
  Check,
  X,
  BookOpen,
  History,
  Link2,
  AlertTriangle,
  Search,
  RotateCcw,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { supabase } from "../../lib/supabase";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

// ────────────────────────────────────────────────────────────────────────
// Data model
// ────────────────────────────────────────────────────────────────────────

interface Question {
  id: number;
  bankQuestionId?: string;
  text: string;
  marks: number;
  bloomLevel: string;
  difficulty: string;
  unit: string;
  type?: string;
  orGroupId?: string;
  orLabel?: string;
}

interface PaperSection {
  id: string;
  title: string;
  defaultMarks: number;
  defaultBloom: string;
  defaultDifficulty: string;
  defaultType: string;
  attemptCount?: number;
  marksOverride?: number;
  questions: Question[];
}

type ExamFormat = "mid_term" | "end_sem" | "custom";

interface PaperDetails {
  examFormat: ExamFormat;
  instituteName: string;
  department: string;
  academicYear: string;
  examName: string;
  title: string;
  subject: string;
  className: string;
  division: string;
  semester: string;
  date: string;
  duration: string;
  branch: string;
  courseCode: string;
  qpCode: string;
  maxMarksOverride: string;
  attemptInstruction: string;
  instructions: string;
  pdfFileName?: string;
}

interface BankQuestion {
  id: string;
  unit_id: string;
  question_text: string;
  marks: number;
  bloom_level: string;
  difficulty: string;
  question_type?: string;
}

interface PaperHistoryEntry {
  id: string;
  title: string;
  exam_type: string | null;
  total_marks: number | null;
  status: string | null;
  created_at: string;
  content: { paperDetails: PaperDetails; sections: PaperSection[] } | null;
}

// ────────────────────────────────────────────────────────────────────────
// Format presets
// ────────────────────────────────────────────────────────────────────────

const BASE_PAPER_DETAILS: PaperDetails = {
  examFormat: "mid_term",
  instituteName: "",
  department: "",
  academicYear: "",
  examName: "",
  title: "Mid-Term Examination",
  subject: "Computer Science",
  className: "",
  division: "",
  semester: "",
  date: "",
  duration: "1 hr",
  branch: "",
  courseCode: "",
  qpCode: "",
  pdfFileName: "Question_Paper",
  maxMarksOverride: "",
  attemptInstruction: "",
  instructions: "Attempt all questions. Each section carries specific marks.",
};

const MID_TERM_DEFAULTS: Partial<PaperDetails> = {
  examFormat: "mid_term",
  instituteName: "Vivekanand Education Society's Institute of Technology, Chembur, Mumbai",
  department: "Department Of Artificial Intelligence & Data Science",
  academicYear: "2025-26 (Even Sem)",
  examName: "MID TERM TEST",
  title: "Mid-Term Examination",
  division: "A & B",
  semester: "IV",
  duration: "1 hr",
  pdfFileName: "Question_Paper",
  attemptInstruction: "",
  instructions:
    "All questions are compulsory. Draw neat diagrams wherever necessary. Assume data, if missing, with justification.",
};

const END_SEM_DEFAULTS: Partial<PaperDetails> = {
  examFormat: "end_sem",
  instituteName: "Vivekanand Education Society's Institute of Technology",
  department: "An Autonomous Institute Affiliated to University of Mumbai",
  academicYear: "2025 - 2026",
  examName: "End Semester Examination",
  title: "End Semester Examination",
  semester: "IV",
  duration: "2 hours",
  maxMarksOverride: "60",
  attemptInstruction: "Attempt any three out of the five questions.",
  pdfFileName: "Question_Paper",
  instructions: "Figures to the right indicate full marks. Assume suitable data if necessary.",
};

const MID_TERM_SECTIONS: PaperSection[] = [
  {
    id: "sectionA",
    title: "Q.1",
    defaultMarks: 2,
    defaultBloom: "Remember",
    defaultDifficulty: "Easy",
    defaultType: "Short Answer",
    attemptCount: 5,
    questions: [],
  },
  {
    id: "sectionB",
    title: "Q.2",
    defaultMarks: 5,
    defaultBloom: "Apply",
    defaultDifficulty: "Medium",
    defaultType: "Long Answer",
    questions: [],
  },
  {
    id: "sectionC",
    title: "Q.3",
    defaultMarks: 5,
    defaultBloom: "Analyze",
    defaultDifficulty: "Medium",
    defaultType: "Long Answer",
    questions: [],
  },
];

const END_SEM_SECTIONS: PaperSection[] = Array.from({ length: 5 }).map((_, i) => ({
  id: `q${i + 1}`,
  title: `Q.${i + 1}`,
  defaultMarks: 10,
  defaultBloom: "Understand",
  defaultDifficulty: "Medium",
  defaultType: "Long Answer",
  questions: [],
}));

const difficultyColor = (difficulty: string) => {
  if (difficulty === "Easy") return "bg-green-500";
  if (difficulty === "Medium") return "bg-amber-500";
  return "bg-red-500";
};

// ────────────────────────────────────────────────────────────────────────
// Duplicate-question guard
// ────────────────────────────────────────────────────────────────────────

const DUPLICATE_SIMILARITY_THRESHOLD = 0.6;

const normalizeWords = (text: string): Set<string> =>
  new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter(Boolean)
  );

const textSimilarity = (a: string, b: string): number => {
  const wordsA = normalizeWords(a);
  const wordsB = normalizeWords(b);
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let intersection = 0;
  wordsA.forEach((w) => {
    if (wordsB.has(w)) intersection += 1;
  });
  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : intersection / union;
};

// ────────────────────────────────────────────────────────────────────────
// Print-layout helper
// ────────────────────────────────────────────────────────────────────────

interface PrintItem {
  number: number;
  alternatives: Question[];
}

const buildPrintItems = (questions: Question[]): PrintItem[] => {
  const items: PrintItem[] = [];
  const seenGroups = new Set<string>();
  let counter = 0;
  questions.forEach((q) => {
    if (q.orGroupId) {
      if (seenGroups.has(q.orGroupId)) return;
      seenGroups.add(q.orGroupId);
      counter += 1;
      items.push({ number: counter, alternatives: questions.filter((x) => x.orGroupId === q.orGroupId) });
    } else {
      counter += 1;
      items.push({ number: counter, alternatives: [q] });
    }
  });
  return items;
};

const getSectionMarks = (section: PaperSection): number => {
  if (section.marksOverride != null) return section.marksOverride;
  if (section.attemptCount) return section.attemptCount * section.defaultMarks;
  const seenGroups = new Set<string>();
  return section.questions.reduce((sum, q) => {
    if (q.orGroupId) {
      if (seenGroups.has(q.orGroupId)) return sum;
      seenGroups.add(q.orGroupId);
    }
    return sum + q.marks;
  }, 0);
};

// ────────────────────────────────────────────────────────────────────────
// Draggable question card
// ────────────────────────────────────────────────────────────────────────

interface DraggableQuestionProps {
  question: Question;
  index: number;
  sectionId: string;
  moveQuestion: (dragIndex: number, hoverIndex: number, sectionId: string) => void;
  removeQuestion: (id: number, sectionId: string) => void;
  isEditing: boolean;
  editDraft: { text: string; marks: number } | null;
  onStartEdit: (question: Question) => void;
  onChangeEditDraft: (updates: Partial<{ text: string; marks: number }>) => void;
  onSaveEdit: (sectionId: string, id: number) => void;
  onCancelEdit: () => void;
  onToggleOrLink: (sectionId: string, question: Question, index: number) => void;
}

function DraggableQuestion({
  question,
  index,
  sectionId,
  moveQuestion,
  removeQuestion,
  isEditing,
  editDraft,
  onStartEdit,
  onChangeEditDraft,
  onSaveEdit,
  onCancelEdit,
  onToggleOrLink,
}: DraggableQuestionProps) {
  const [{ isDragging }, drag] = useDrag({
    type: "question",
    item: { index, sectionId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: "question",
    hover: (item: { index: number; sectionId: string }) => {
      if (item.sectionId === sectionId && item.index !== index) {
        moveQuestion(item.index, index, sectionId);
        item.index = index;
      }
    },
  });

  const setNodeRef = (node: HTMLDivElement | null) => {
    drag(node);
    drop(node);
  };

  return (
    <div
      ref={setNodeRef}
      className={`bg-card border border-border rounded-xl p-4 mb-3 hover:shadow-md transition-shadow ${
        isDragging ? "opacity-50" : ""
      } ${isEditing ? "" : "cursor-move"}`}
    >
      <div className="flex items-start gap-3">
        <GripVertical className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
        <div className="flex-1">
          {isEditing && editDraft ? (
            <div className="space-y-2">
              <Textarea
                value={editDraft.text}
                onChange={(e) => onChangeEditDraft({ text: e.target.value })}
                rows={3}
              />
              <div className="flex items-center gap-3">
                <label className="text-sm text-muted-foreground">Marks</label>
                <Input
                  type="number"
                  className="w-24"
                  value={editDraft.marks}
                  onChange={(e) => onChangeEditDraft({ marks: parseInt(e.target.value) || 0 })}
                />
                <div className="flex-1" />
                <Button size="sm" variant="outline" onClick={onCancelEdit}>
                  <X className="w-4 h-4 mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={() => onSaveEdit(sectionId, question.id)}>
                  <Check className="w-4 h-4 mr-1" /> Save
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <p className="flex-1 whitespace-pre-wrap font-medium">{question.text}</p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-lg font-semibold whitespace-nowrap">
                    {question.marks} marks
                  </span>
                  {index > 0 && (
                    <button
                      onClick={() => onToggleOrLink(sectionId, question, index)}
                      className={`p-1 rounded-lg transition-colors ${
                        question.orGroupId ? "bg-secondary/20 text-secondary" : "hover:bg-muted text-muted-foreground"
                      }`}
                      title={question.orGroupId ? "Unlink OR alternative" : "Mark as OR alternative with question above"}
                    >
                      <Link2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onStartEdit(question)}
                    className="p-1 hover:bg-muted rounded-lg transition-colors"
                    title="Edit question"
                  >
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => removeQuestion(question.id, sectionId)}
                    className="p-1 hover:bg-destructive/10 rounded-lg transition-colors"
                    title="Remove Question"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                {question.orGroupId && (
                  <span className="text-xs px-2 py-1 bg-secondary/20 text-secondary rounded-full font-semibold">
                    OR alternative{question.orLabel ? ` (${question.orLabel})` : ""}
                  </span>
                )}
                {question.bankQuestionId && (
                  <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> From bank
                  </span>
                )}
                {question.type && (
                  <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">{question.type}</span>
                )}
                <span className="text-xs px-2 py-1 bg-secondary/10 text-secondary rounded-full">
                  {question.bloomLevel}
                </span>
                <span className="text-xs px-2 py-1 bg-accent/10 text-accent rounded-full flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${difficultyColor(question.difficulty)}`} />
                  {question.difficulty}
                </span>
                <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">{question.unit}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Draft cache
// ────────────────────────────────────────────────────────────────────────

interface DraftCache {
  paperDetails: PaperDetails;
  sections: PaperSection[];
  selectedSyllabusId: string;
}
let draftCache: DraftCache | null = null;

// ────────────────────────────────────────────────────────────────────────
// Main page
// ────────────────────────────────────────────────────────────────────────

export function QuestionPaperBuilderPage() {
  const [sections, setSections] = useState<PaperSection[]>(
    () => draftCache?.sections ?? JSON.parse(JSON.stringify(MID_TERM_SECTIONS))
  );
  const [paperDetails, setPaperDetails] = useState<PaperDetails>(
    () => draftCache?.paperDetails ?? { ...BASE_PAPER_DETAILS, ...MID_TERM_DEFAULTS }
  );

  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  // --- Syllabus & AI State ---
  const [syllabi, setSyllabi] = useState<{ id: string; subject: string; code: string; subject_id: string | null }[]>(
    []
  );
  const [selectedSyllabusId, setSelectedSyllabusId] = useState<string>(() => draftCache?.selectedSyllabusId ?? "");
  const [units, setUnits] = useState<{ id: string; unit_number: number; title: string }[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Generating state
  const [generatingPaper, setGeneratingPaper] = useState(false);
  const [generatingSection, setGeneratingSection] = useState<string | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Inline question editing
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<{ text: string; marks: number } | null>(null);

  // Duplicate-question review queue
  const [pendingReview, setPendingReview] = useState<
    { tempId: number; sectionId: string; question: Question; matchedText: string; matchedSection: string }[]
  >([]);

  // Question bank modal
  const [bankModalSectionId, setBankModalSectionId] = useState<string | null>(null);
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSearch, setBankSearch] = useState("");
  const [bankUnitFilter, setBankUnitFilter] = useState<string>("all");
  const [bankSelected, setBankSelected] = useState<Set<string>>(new Set());

  // Export details modal
  const [showExportModal, setShowExportModal] = useState(false);

  // Paper history & usage count
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [papersGeneratedCount, setPapersGeneratedCount] = useState<number | null>(null);
  const [paperHistoryOpen, setPaperHistoryOpen] = useState(false);
  const [paperHistory, setPaperHistory] = useState<PaperHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // --- Initialization ---
  useEffect(() => {
    async function init() {
      setLoadingInitial(true);
      const { data } = await supabase
        .from("syllabi")
        .select("id, subject, code, subject_id")
        .eq("status", "parsed")
        .order("subject", { ascending: true });

      if (data && data.length > 0) {
        setSyllabi(data);
        setSelectedSyllabusId((prev) => prev || data[0].id);
        if (!draftCache) {
          setPaperDetails((prev) => ({ ...prev, subject: data[0].subject }));
        }
      }
      setLoadingInitial(false);
    }
    init();
  }, []);

  useEffect(() => {
    draftCache = { paperDetails, sections, selectedSyllabusId };
  }, [paperDetails, sections, selectedSyllabusId]);

  useEffect(() => {
    async function initUser() {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id ?? null;
      setCurrentUserId(uid);
      if (uid) refreshPapersGeneratedCount(uid);
    }
    initUser();
  }, []);

  useEffect(() => {
    if (!selectedSyllabusId) {
      setUnits([]);
      return;
    }
    async function loadUnits() {
      const { data } = await supabase
        .from("units")
        .select("id, unit_number, title")
        .eq("syllabus_id", selectedSyllabusId);
      if (data) setUnits(data);
    }
    loadUnits();

    const subjectName = syllabi.find((s) => s.id === selectedSyllabusId)?.subject;
    if (subjectName) setPaperDetails((prev) => ({ ...prev, subject: subjectName }));
  }, [selectedSyllabusId, syllabi]);

  // --- AI Generation Helpers ---
  const pickRandomUnit = () => units[Math.floor(Math.random() * units.length)];

  const generateSingleQuestion = async (
    type: string,
    bloom: string,
    marks: number,
    difficulty: string,
    specificUnit?: any
  ): Promise<Question | null> => {
    if (units.length === 0) return null;
    const targetUnit = specificUnit || pickRandomUnit();

    try {
      const { data, error } = await supabase.functions.invoke("generate-questions", {
        body: {
          syllabus_id: selectedSyllabusId,
          unit_id: targetUnit.id,
          bloom_level: bloom,
          question_type: type,
          difficulty: difficulty,
          count: 1,
          marks: marks,
          paper_format: paperDetails.examFormat,
        },
      });

      if (error || data?.error || !data?.questions?.length) {
        console.error("AI Error:", error || data?.error);
        return null;
      }

      const q = data.questions[0];
      return {
        id: Date.now() + Math.floor(Math.random() * 1000),
        text: q.question,
        marks: q.marks,
        bloomLevel: q.bloom,
        difficulty: q.difficulty,
        unit: `Unit ${targetUnit.unit_number}`,
        type: q.type,
      };
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const moveQuestion = (dragIndex: number, hoverIndex: number, sectionId: string) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id === sectionId) {
          const newQuestions = [...section.questions];
          const draggedItem = newQuestions[dragIndex];
          newQuestions.splice(dragIndex, 1);
          newQuestions.splice(hoverIndex, 0, draggedItem);
          return { ...section, questions: newQuestions };
        }
        return section;
      })
    );
  };

  const removeQuestion = (id: number, sectionId: string) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id === sectionId) {
          return { ...section, questions: section.questions.filter((q) => q.id !== id) };
        }
        return section;
      })
    );
  };

  const findDuplicate = (text: string): { section: PaperSection; question: Question } | null => {
    for (const section of sections) {
      for (const q of section.questions) {
        if (textSimilarity(text, q.text) >= DUPLICATE_SIMILARITY_THRESHOLD) {
          return { section, question: q };
        }
      }
    }
    return null;
  };

  const addQuestionsToSection = (sectionId: string, newQuestions: Question[]) => {
    const toAddDirectly: Question[] = [];
    const toReview: typeof pendingReview = [];
    newQuestions.forEach((q) => {
      const dup = findDuplicate(q.text);
      if (dup) {
        toReview.push({ tempId: q.id, sectionId, question: q, matchedText: dup.question.text, matchedSection: dup.section.title });
      } else {
        toAddDirectly.push(q);
      }
    });
    if (toAddDirectly.length > 0) {
      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, questions: [...s.questions, ...toAddDirectly] } : s))
      );
    }
    if (toReview.length > 0) {
      setPendingReview((prev) => [...prev, ...toReview]);
    }
  };

  const keepPendingQuestion = (tempId: number) => {
    const item = pendingReview.find((p) => p.tempId === tempId);
    if (!item) return;
    setSections((prev) =>
      prev.map((s) => (s.id === item.sectionId ? { ...s, questions: [...s.questions, item.question] } : s))
    );
    setPendingReview((prev) => prev.filter((p) => p.tempId !== tempId));
  };

  const discardPendingQuestion = (tempId: number) => {
    setPendingReview((prev) => prev.filter((p) => p.tempId !== tempId));
  };

  const addAIQuestion = async (sectionId: string) => {
    if (!selectedSyllabusId || units.length === 0) {
      alert("Please select a syllabus with uploaded units first.");
      return;
    }

    const section = sections.find((s) => s.id === sectionId);
    if (!section) return;

    setGeneratingSection(sectionId);
    const q: Question | null = await generateSingleQuestion(
      section.defaultType,
      section.defaultBloom,
      section.defaultMarks,
      section.defaultDifficulty
    );

    if (q) {
      addQuestionsToSection(sectionId, [q]);
    } else {
      alert("AI failed to generate a question. Please try again.");
    }
    setGeneratingSection(null);
  };

  const handleGenerateFullPaper = async () => {
    if (!selectedSyllabusId || units.length === 0) {
      alert("Please select a syllabus with units first.");
      return;
    }

    const confirmed = window.confirm(
      "This will replace your current paper with AI-generated questions for all sections. Proceed?"
    );
    if (!confirmed) return;

    setGeneratingPaper(true);
    setSections((prev) => prev.map((s) => ({ ...s, questions: [] })));

    const currentSectionsSnapshot = [...sections];

    try {
      const promises = currentSectionsSnapshot.map(async (section) => {
        const count = section.attemptCount
          ? section.attemptCount + 1
          : section.id === "sectionB" || section.id === "sectionC"
          ? 2
          : 3;
        const qPromises = Array.from({ length: count }).map(() =>
          generateSingleQuestion(section.defaultType, section.defaultBloom, section.defaultMarks, section.defaultDifficulty)
        );

        const results = (await Promise.all(qPromises)).filter(Boolean) as Question[];

        if (!section.attemptCount && results.length >= 2) {
          const groupId = `or_${section.id}`;
          results[0] = { ...results[0], orGroupId: groupId, orLabel: "a" };
          results[1] = { ...results[1], orGroupId: groupId, orLabel: "b" };
        }

        return { id: section.id, questions: results };
      });

      const results = await Promise.all(promises);

      setSections((prev) =>
        prev.map((s) => {
          const generated = results.find((r) => r.id === s.id);
          if (generated) {
            return { ...s, questions: generated.questions };
          }
          return s;
        })
      );
    } catch (e) {
      console.error(e);
      alert("An error occurred during full paper generation.");
    }

    setGeneratingPaper(false);
  };

  const calculateTotalMarks = () => sections.reduce((total, section) => total + getSectionMarks(section), 0);

  // --- Section management ---
  const addNewSection = () => {
    const newId = `section_${Date.now()}`;
    setSections([
      ...sections,
      {
        id: newId,
        title: "New Section",
        defaultMarks: 5,
        defaultBloom: "Understand",
        defaultDifficulty: "Medium",
        defaultType: "Short Answer",
        questions: [],
      },
    ]);
    setEditingSectionId(newId);
  };

  const updateSection = (id: string, updates: Partial<PaperSection>) => {
    setSections(sections.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const deleteSection = (id: string) => {
    if (window.confirm("Are you sure you want to delete this section? All questions in it will be lost.")) {
      setSections(sections.filter((s) => s.id !== id));
    }
  };

  const applyExamFormat = (format: ExamFormat) => {
    const hasQuestions = sections.some((s) => s.questions.length > 0);
    if (hasQuestions) {
      const ok = window.confirm(
        "Switching the paper format replaces your current sections with a fresh template for that format. Existing questions in the builder will be lost. Continue?"
      );
      if (!ok) return;
    }
    if (format === "mid_term") {
      setSections(JSON.parse(JSON.stringify(MID_TERM_SECTIONS)));
      setPaperDetails((prev) => ({ ...prev, ...MID_TERM_DEFAULTS, subject: prev.subject }));
    } else if (format === "end_sem") {
      setSections(JSON.parse(JSON.stringify(END_SEM_SECTIONS)));
      setPaperDetails((prev) => ({ ...prev, ...END_SEM_DEFAULTS, subject: prev.subject }));
    } else {
      setSections([
        {
          id: `section_${Date.now()}`,
          title: "Section A",
          defaultMarks: 5,
          defaultBloom: "Understand",
          defaultDifficulty: "Medium",
          defaultType: "Short Answer",
          questions: [],
        },
      ]);
      setPaperDetails((prev) => ({ ...prev, examFormat: "custom", title: "Custom Paper" }));
    }
  };

  const clearDraft = () => {
    const hasQuestions = sections.some((s) => s.questions.length > 0);
    if (hasQuestions && !window.confirm("Discard the current paper and start a fresh one? This can't be undone.")) {
      return;
    }
    draftCache = null;
    setSections(JSON.parse(JSON.stringify(MID_TERM_SECTIONS)));
    setPaperDetails({ ...BASE_PAPER_DETAILS, ...MID_TERM_DEFAULTS });
  };

  // --- Inline question editing ---
  const startEditQuestion = (q: Question) => {
    setEditingQuestionId(q.id);
    setEditDraft({ text: q.text, marks: q.marks });
  };

  const changeEditDraft = (updates: Partial<{ text: string; marks: number }>) => {
    setEditDraft((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const saveEditQuestion = (sectionId: string, id: number) => {
    if (!editDraft) return;
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, questions: s.questions.map((q) => (q.id === id ? { ...q, text: editDraft.text, marks: editDraft.marks } : q)) }
          : s
      )
    );
    setEditingQuestionId(null);
    setEditDraft(null);
  };

  const cancelEditQuestion = () => {
    setEditingQuestionId(null);
    setEditDraft(null);
  };

  const toggleOrLink = (sectionId: string, question: Question, index: number) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        const qs = [...s.questions];
        if (question.orGroupId) {
          qs[index] = { ...question, orGroupId: undefined, orLabel: undefined };
          return { ...s, questions: qs };
        }
        const prevQ = qs[index - 1];
        if (!prevQ) return s;
        const groupId = prevQ.orGroupId || `or_${prevQ.id}`;
        qs[index - 1] = { ...prevQ, orGroupId: groupId, orLabel: prevQ.orLabel || "a" };
        qs[index] = { ...question, orGroupId: groupId, orLabel: "b" };
        return { ...s, questions: qs };
      })
    );
  };

  // --- Question bank modal ---
  const openBankModal = async (sectionId: string) => {
    setBankModalSectionId(sectionId);
    setBankSelected(new Set());
    setBankSearch("");
    setBankUnitFilter("all");
    if (units.length === 0) {
      setBankQuestions([]);
      return;
    }
    setBankLoading(true);
    const { data, error } = await supabase
      .from("questions")
      .select("id, unit_id, question_text, marks, bloom_level, difficulty, question_type")
      .in("unit_id", units.map((u) => u.id))
      .eq("approved", true);

    if (error) {
      console.error("Error loading question bank:", error);
      alert("Could not load the question bank.");
      setBankQuestions([]);
    } else {
      setBankQuestions((data || []) as BankQuestion[]);
    }
    setBankLoading(false);
  };

  const filteredBankQuestions = useMemo(() => {
    return bankQuestions.filter((q) => {
      if (bankUnitFilter !== "all" && q.unit_id !== bankUnitFilter) return false;
      if (bankSearch.trim() && !q.question_text.toLowerCase().includes(bankSearch.trim().toLowerCase())) return false;
      return true;
    });
  }, [bankQuestions, bankUnitFilter, bankSearch]);

  const toggleBankSelection = (id: string) => {
    setBankSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmAddFromBank = () => {
    if (!bankModalSectionId) return;
    const selectedQs = bankQuestions.filter((q) => bankSelected.has(q.id));
    const newQuestions: Question[] = selectedQs.map((q, i) => {
      const unit = units.find((u) => u.id === q.unit_id);
      return {
        id: Date.now() + i * 7 + Math.floor(Math.random() * 1000),
        bankQuestionId: q.id,
        text: q.question_text,
        marks: q.marks,
        bloomLevel: q.bloom_level,
        difficulty: q.difficulty,
        unit: unit ? `Unit ${unit.unit_number}` : "Unit —",
        type: q.question_type,
      };
    });
    addQuestionsToSection(bankModalSectionId, newQuestions);
    setBankModalSectionId(null);
  };

  // --- Bloom / difficulty distribution ---
  const distribution = useMemo(() => {
    const bloom: Record<string, number> = {};
    const difficulty: Record<string, number> = {};
    sections.forEach((s) =>
      s.questions.forEach((q) => {
        bloom[q.bloomLevel] = (bloom[q.bloomLevel] || 0) + 1;
        difficulty[q.difficulty] = (difficulty[q.difficulty] || 0) + 1;
      })
    );
    return { bloom, difficulty };
  }, [sections]);

  // --- Paper history & usage count ---
  const refreshPapersGeneratedCount = async (userId: string) => {
    const { count, error } = await supabase
      .from("question_papers")
      .select("id", { count: "exact", head: true })
      .eq("created_by", userId)
      .eq("status", "exported");
    if (error) {
      console.error("Error counting generated papers:", error);
      return;
    }
    setPapersGeneratedCount(count ?? 0);
  };

  const openPaperHistory = async () => {
    setPaperHistoryOpen(true);
    if (!currentUserId) return;
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from("question_papers")
      .select("id, title, exam_type, total_marks, status, created_at, content")
      .eq("created_by", currentUserId)
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) {
      console.error("Error loading paper history:", error);
      alert(`Could not load paper history: ${error.message}`);
    } else {
      setPaperHistory((data || []) as PaperHistoryEntry[]);
    }
    setLoadingHistory(false);
  };

  const restoreHistoryEntry = (entry: PaperHistoryEntry) => {
    if (!entry.content) {
      alert("This paper was saved before version history was enabled and can't be restored.");
      return;
    }
    setSections(entry.content.sections);
    setPaperDetails(entry.content.paperDetails);
    setPaperHistoryOpen(false);
  };

  // --- Save a snapshot of the finalized paper ---
  const savePaperRecord = async (): Promise<boolean> => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (userError || !userId) {
        console.error("No authenticated user — cannot save paper history:", userError);
        alert(
          "The PDF downloaded, but couldn't be saved to your paper history because no logged-in user was found. Please make sure you're signed in."
        );
        return false;
      }
      const subjectId = syllabi.find((s) => s.id === selectedSyllabusId)?.subject_id ?? null;
      const totalMarks = paperDetails.maxMarksOverride
        ? parseInt(paperDetails.maxMarksOverride, 10) || calculateTotalMarks()
        : calculateTotalMarks();

      // Use pdfFileName if set, otherwise fall back to title
      const paperTitle = paperDetails.pdfFileName?.trim() || paperDetails.title?.trim() || "Question Paper";

      const { data: paperRow, error: paperError } = await supabase
        .from("question_papers")
        .insert({
          subject_id: subjectId,
          title: paperTitle,
          exam_type: paperDetails.examFormat,
          total_marks: totalMarks,
          status: "exported",
          created_by: userId,
          content: { paperDetails, sections },
        })
        .select("id")
        .single();

      if (paperError || !paperRow) {
        console.error("Error saving paper record:", paperError);
        alert(
          `The PDF downloaded, but saving it to your paper history failed:\n\n${
            paperError?.message || "Unknown error"
          }${paperError?.hint ? `\n\nHint: ${paperError.hint}` : ""}`
        );
        return false;
      }

      let orderIndex = 0;
      const items = sections.flatMap((section) =>
        section.questions
          .filter((q) => q.bankQuestionId)
          .map((q) => ({
            paper_id: paperRow.id,
            question_id: q.bankQuestionId,
            marks: q.marks,
            order_index: orderIndex++,
          }))
      );

      if (items.length > 0) {
        const { error: itemsError } = await supabase.from("question_paper_items").insert(items);
        if (itemsError) {
          console.error("Error saving paper items:", itemsError);
        }
      }

      await refreshPapersGeneratedCount(userId);
      return true;
    } catch (e: any) {
      console.error("Unexpected error saving paper record:", e);
      alert(`The PDF downloaded, but an unexpected error prevented saving it to history: ${e?.message || e}`);
      return false;
    }
  };

  // --- PDF export ---
  const runExportPdf = async (recordUsage: boolean) => {
    const element = document.getElementById("paper-preview-for-pdf");
    if (!element) {
      console.error("PDF export failed: #paper-preview-for-pdf was not found in the DOM.");
      alert("Could not find the paper preview to export. Please reload the page and try again.");
      return;
    }

    setIsExportingPDF(true);

    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });

      const pdf = new jsPDF({ unit: "in", format: "a4", orientation: "portrait" });
      const margin = 0.5;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;

      const pxPerInch = canvas.width / usableWidth;
      const pageHeightPx = Math.floor(usableHeight * pxPerInch);

      let renderedPx = 0;
      let pageIndex = 0;
      while (renderedPx < canvas.height) {
        const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedPx);

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeightPx;
        const ctx = pageCanvas.getContext("2d");
        if (!ctx) throw new Error("Could not create a canvas context for pagination.");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

        const sliceImgData = pageCanvas.toDataURL("image/jpeg", 0.98);
        const sliceHeightInches = sliceHeightPx / pxPerInch;

        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(sliceImgData, "JPEG", margin, margin, usableWidth, sliceHeightInches);

        renderedPx += sliceHeightPx;
        pageIndex += 1;
      }

      const rawFileName = paperDetails.pdfFileName?.trim() || paperDetails.title?.trim() || "Question_Paper";
      const sanitizedFileName = rawFileName.replace(/[/\\?%*:|"<>]/g, "_").replace(/\s+/g, "_");
      pdf.save(`${sanitizedFileName}.pdf`);

      if (recordUsage) await savePaperRecord();
      setShowExportModal(false);
    } catch (e: any) {
      console.error("PDF export failed:", e);
      alert(`PDF export failed: ${e?.message || "an unknown error occurred"}.`);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const redownloadHistoryEntry = (entry: PaperHistoryEntry) => {
    if (!entry.content) {
      alert("This paper was saved before version history was enabled and can't be re-downloaded.");
      return;
    }
    setSections(entry.content.sections);
    setPaperDetails(entry.content.paperDetails);
    setPaperHistoryOpen(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        runExportPdf(false);
      });
    });
  };

  const isEndSem = paperDetails.examFormat === "end_sem";

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Question Paper Builder</h1>
            <p className="text-muted-foreground mt-1">Build your exam paper manually or use AI generation</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={paperDetails.examFormat}
              onChange={(e) => applyExamFormat(e.target.value as ExamFormat)}
              className="px-3 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              title="Paper format"
            >
              <option value="mid_term">Mid-Term (VESIT format)</option>
              <option value="end_sem">End-Semester (VESIT format)</option>
              <option value="custom">Custom</option>
            </select>

            <select
              value={selectedSyllabusId}
              onChange={(e) => setSelectedSyllabusId(e.target.value)}
              className="px-3 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary min-w-[200px]"
              disabled={loadingInitial || generatingPaper}
            >
              {loadingInitial && <option>Loading syllabi...</option>}
              {!loadingInitial && syllabi.length === 0 && <option>No parsed syllabi found</option>}
              {syllabi.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subject} ({s.code})
                </option>
              ))}
            </select>

            <Button
              onClick={handleGenerateFullPaper}
              disabled={generatingPaper || syllabi.length === 0}
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white"
            >
              {generatingPaper ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {generatingPaper ? "Building Paper..." : "Auto-Generate Full Paper"}
            </Button>

            <Button variant="outline" onClick={openPaperHistory}>
              <History className="w-4 h-4 mr-2" />
              History{papersGeneratedCount != null ? ` (${papersGeneratedCount})` : ""}
            </Button>

            <Button variant="outline" onClick={() => setShowExportModal(true)}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>

            <Button variant="ghost" onClick={clearDraft} title="Discard the current paper and start fresh">
              <RotateCcw className="w-4 h-4 mr-2" />
              New Paper
            </Button>
          </div>
        </div>

        {/* Duplicate-question review queue */}
        {pendingReview.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-amber-700">
              <AlertTriangle className="w-4 h-4" />
              {pendingReview.length} question{pendingReview.length === 1 ? "" : "s"} look similar to ones already in the paper
            </div>
            {pendingReview.map((item) => (
              <div key={item.tempId} className="bg-card border border-border rounded-lg p-3 text-sm space-y-2">
                <p className="font-medium">{item.question.text}</p>
                <p className="text-muted-foreground">
                  Looks similar to a question already in <b>{item.matchedSection}</b>: "{item.matchedText.slice(0, 100)}
                  {item.matchedText.length > 100 ? "…" : ""}"
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => discardPendingQuestion(item.tempId)}>
                    Discard
                  </Button>
                  <Button size="sm" onClick={() => keepPendingQuestion(item.tempId)}>
                    Keep anyway
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Paper Configuration */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-xl p-6 sticky top-6">
              <h2 className="text-xl font-semibold mb-4">Paper Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="block mb-2">Exam Title</label>
                  <Input
                    value={paperDetails.title}
                    onChange={(e) => setPaperDetails({ ...paperDetails, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block mb-2">Subject</label>
                  <Input
                    value={paperDetails.subject}
                    onChange={(e) => setPaperDetails({ ...paperDetails, subject: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block mb-2">Duration</label>
                  <Input
                    value={paperDetails.duration}
                    onChange={(e) => setPaperDetails({ ...paperDetails, duration: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block mb-2">Instructions</label>
                  <Textarea
                    placeholder="Enter exam instructions..."
                    rows={4}
                    value={paperDetails.instructions}
                    onChange={(e) => setPaperDetails({ ...paperDetails, instructions: e.target.value })}
                  />
                </div>

                {/* Stats */}
                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Questions</span>
                    <span className="font-semibold">
                      {sections.reduce((total, section) => total + section.questions.length, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Marks</span>
                    <span className="font-semibold text-primary">{calculateTotalMarks()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Papers Generated</span>
                    <span className="font-semibold">{papersGeneratedCount ?? "—"}</span>
                  </div>
                </div>

                {/* Bloom / Difficulty distribution */}
                {(Object.keys(distribution.bloom).length > 0 || Object.keys(distribution.difficulty).length > 0) && (
                  <div className="pt-4 border-t border-border space-y-2">
                    <h3 className="font-semibold text-sm">Distribution check</h3>
                    {Object.keys(distribution.bloom).length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Bloom:{" "}
                        {Object.entries(distribution.bloom)
                          .map(([k, v]) => `${v} ${k}`)
                          .join(" · ")}
                      </p>
                    )}
                    {Object.keys(distribution.difficulty).length > 0 && (
                      <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                        {Object.entries(distribution.difficulty).map(([k, v]) => (
                          <span key={k} className="flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${difficultyColor(k)}`} />
                            {v} {k}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                )}

                {/* AI Suggestions */}
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-warning" />
                    <h3 className="font-semibold">AI Builder Tips</h3>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• The <b>Auto-Generate Full Paper</b> button creates questions for all sections.</p>
                    <p>• Use <b>Add from Bank</b> to pull in approved questions — all questions stay editable.</p>
                    <p>• Click the link icon on a question to pair it as an OR-alternative with the one above it.</p>
                    <p>• Drag and drop questions to rearrange them within a section.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Question Sections */}
          <div className="lg:col-span-2 space-y-6">
            {sections.map((section) => (
              <div key={section.id} className="bg-card border border-border rounded-xl p-6 relative">
                {generatingPaper && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-xl">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                )}

                {editingSectionId === section.id ? (
                  <div className="mb-4 space-y-4 bg-muted/50 p-4 rounded-lg border border-border">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Edit Section Settings</h3>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingSectionId(null)}>
                          <Check className="w-4 h-4 mr-2" /> Done
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm mb-1 block text-muted-foreground">Section Title</label>
                        <Input value={section.title} onChange={(e) => updateSection(section.id, { title: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-sm mb-1 block text-muted-foreground">Default Marks (per question)</label>
                        <Input
                          type="number"
                          value={section.defaultMarks}
                          onChange={(e) => updateSection(section.id, { defaultMarks: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <label className="text-sm mb-1 block text-muted-foreground">
                          Attempt any N of the following (leave blank if all compulsory)
                        </label>
                        <Input
                          type="number"
                          value={section.attemptCount ?? ""}
                          onChange={(e) =>
                            updateSection(section.id, {
                              attemptCount: e.target.value ? parseInt(e.target.value) || undefined : undefined,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-sm mb-1 block text-muted-foreground">Default Bloom Level</label>
                        <select
                          className="w-full px-3 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          value={section.defaultBloom}
                          onChange={(e) => updateSection(section.id, { defaultBloom: e.target.value })}
                        >
                          <option value="Remember">Remember</option>
                          <option value="Understand">Understand</option>
                          <option value="Apply">Apply</option>
                          <option value="Analyze">Analyze</option>
                          <option value="Evaluate">Evaluate</option>
                          <option value="Create">Create</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm mb-1 block text-muted-foreground">Default Difficulty</label>
                        <select
                          className="w-full px-3 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          value={section.defaultDifficulty}
                          onChange={(e) => updateSection(section.id, { defaultDifficulty: e.target.value })}
                        >
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <label className="text-sm mb-1 block text-muted-foreground">Default Type</label>
                        <select
                          className="w-full px-3 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          value={section.defaultType}
                          onChange={(e) => updateSection(section.id, { defaultType: e.target.value })}
                        >
                          <option value="Short Answer">Short Answer</option>
                          <option value="Long Answer">Long Answer</option>
                          <option value="MCQ">MCQ</option>
                          <option value="Analytical">Analytical</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                    <div>
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        {section.title}
                        {section.attemptCount && (
                          <span className="text-sm font-normal text-muted-foreground">
                            (Attempt any {section.attemptCount} of the following)
                          </span>
                        )}
                        <button
                          onClick={() => setEditingSectionId(section.id)}
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {getSectionMarks(section)} marks total • Default: {section.defaultMarks} marks/q
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button onClick={() => openBankModal(section.id)} size="sm" variant="outline">
                        <BookOpen className="w-4 h-4 mr-2" />
                        Add from Bank
                      </Button>
                      <Button
                        onClick={() => addAIQuestion(section.id)}
                        size="sm"
                        variant="secondary"
                        disabled={generatingSection === section.id || syllabi.length === 0}
                      >
                        {generatingSection === section.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2 text-primary" />
                        )}
                        Generate Question
                      </Button>
                      <Button
                        onClick={() => deleteSection(section.id)}
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="min-h-[100px]">
                  {section.questions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p>No questions yet. Generate with AI or add from the question bank.</p>
                    </div>
                  ) : (
                    section.questions.map((question, index) => (
                      <DraggableQuestion
                        key={question.id}
                        question={question}
                        index={index}
                        sectionId={section.id}
                        moveQuestion={moveQuestion}
                        removeQuestion={removeQuestion}
                        isEditing={editingQuestionId === question.id}
                        editDraft={editingQuestionId === question.id ? editDraft : null}
                        onStartEdit={startEditQuestion}
                        onChangeEditDraft={changeEditDraft}
                        onSaveEdit={saveEditQuestion}
                        onCancelEdit={cancelEditQuestion}
                        onToggleOrLink={toggleOrLink}
                      />
                    ))
                  )}
                </div>
              </div>
            ))}

            <Button onClick={addNewSection} variant="outline" className="w-full border-dashed py-8 hover:bg-secondary/10">
              <Plus className="w-5 h-5 mr-2" /> Add New Section
            </Button>
          </div>
        </div>

        {/* Question Bank Modal */}
        {bankModalSectionId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-lg">Add from Question Bank</h3>
                <button onClick={() => setBankModalSectionId(null)} className="p-1 hover:bg-muted rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 border-b border-border flex gap-3 flex-wrap">
                <div className="flex-1 min-w-[180px] relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search question text..."
                    className="pl-9"
                    value={bankSearch}
                    onChange={(e) => setBankSearch(e.target.value)}
                  />
                </div>
                <select
                  value={bankUnitFilter}
                  onChange={(e) => setBankUnitFilter(e.target.value)}
                  className="px-3 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Units</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      Unit {u.unit_number}: {u.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {bankLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : filteredBankQuestions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No approved questions match this filter.</p>
                ) : (
                  filteredBankQuestions.map((q) => {
                    const unit = units.find((u) => u.id === q.unit_id);
                    return (
                      <label
                        key={q.id}
                        className="flex items-start gap-3 p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={bankSelected.has(q.id)}
                          onChange={() => toggleBankSelection(q.id)}
                        />
                        <div className="flex-1">
                          <p className="text-sm">{q.question_text}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">{q.marks} marks</span>
                            <span className="text-xs px-2 py-0.5 bg-secondary/10 text-secondary rounded-full">{q.bloom_level}</span>
                            <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                              {unit ? `Unit ${unit.unit_number}` : "Unit —"}
                            </span>
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
              <div className="p-4 border-t border-border flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{bankSelected.size} selected</span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setBankModalSectionId(null)}>
                    Cancel
                  </Button>
                  <Button onClick={confirmAddFromBank} disabled={bankSelected.size === 0}>
                    Add {bankSelected.size > 0 ? bankSelected.size : ""} Question{bankSelected.size === 1 ? "" : "s"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Export Details Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-lg">Paper Details</h3>
                <button onClick={() => setShowExportModal(false)} className="p-1 hover:bg-muted rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* PDF File Name Field */}
                  <div className="col-span-2 bg-primary/5 p-3 rounded-lg border border-primary/20 space-y-1">
                    <label className="text-sm font-semibold text-primary block">PDF File Name</label>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="e.g. Mid_Term_DS_2026"
                        value={paperDetails.pdfFileName ?? paperDetails.title}
                        onChange={(e) => setPaperDetails({ ...paperDetails, pdfFileName: e.target.value })}
                        className="bg-card"
                      />
                      <span className="text-sm font-medium text-muted-foreground select-none">.pdf</span>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="text-sm mb-1 block text-muted-foreground">Institute Name</label>
                    <Input
                      value={paperDetails.instituteName}
                      onChange={(e) => setPaperDetails({ ...paperDetails, instituteName: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm mb-1 block text-muted-foreground">Department</label>
                    <Input
                      value={paperDetails.department}
                      onChange={(e) => setPaperDetails({ ...paperDetails, department: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm mb-1 block text-muted-foreground">Academic Year</label>
                    <Input
                      value={paperDetails.academicYear}
                      onChange={(e) => setPaperDetails({ ...paperDetails, academicYear: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm mb-1 block text-muted-foreground">Exam Name</label>
                    <Input
                      value={paperDetails.examName}
                      onChange={(e) => setPaperDetails({ ...paperDetails, examName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm mb-1 block text-muted-foreground">Semester</label>
                    <Input
                      value={paperDetails.semester}
                      onChange={(e) => setPaperDetails({ ...paperDetails, semester: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm mb-1 block text-muted-foreground">Duration</label>
                    <Input
                      value={paperDetails.duration}
                      onChange={(e) => setPaperDetails({ ...paperDetails, duration: e.target.value })}
                    />
                  </div>

                  {!isEndSem && (
                    <>
                      <div>
                        <label className="text-sm mb-1 block text-muted-foreground">Class</label>
                        <Input
                          value={paperDetails.className}
                          onChange={(e) => setPaperDetails({ ...paperDetails, className: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm mb-1 block text-muted-foreground">Division</label>
                        <Input
                          value={paperDetails.division}
                          onChange={(e) => setPaperDetails({ ...paperDetails, division: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm mb-1 block text-muted-foreground">Date</label>
                        <Input
                          type="date"
                          value={paperDetails.date}
                          onChange={(e) => setPaperDetails({ ...paperDetails, date: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                  {isEndSem && (
                    <>
                      <div>
                        <label className="text-sm mb-1 block text-muted-foreground">Branch</label>
                        <Input
                          value={paperDetails.branch}
                          onChange={(e) => setPaperDetails({ ...paperDetails, branch: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm mb-1 block text-muted-foreground">Course Code</label>
                        <Input
                          value={paperDetails.courseCode}
                          onChange={(e) => setPaperDetails({ ...paperDetails, courseCode: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm mb-1 block text-muted-foreground">QP Code</label>
                        <Input
                          value={paperDetails.qpCode}
                          onChange={(e) => setPaperDetails({ ...paperDetails, qpCode: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm mb-1 block text-muted-foreground">Max Marks</label>
                        <Input
                          type="number"
                          value={paperDetails.maxMarksOverride}
                          onChange={(e) => setPaperDetails({ ...paperDetails, maxMarksOverride: e.target.value })}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-sm mb-1 block text-muted-foreground">Attempt Instruction</label>
                        <Input
                          value={paperDetails.attemptInstruction}
                          onChange={(e) => setPaperDetails({ ...paperDetails, attemptInstruction: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                  <div className="col-span-2">
                    <label className="text-sm mb-1 block text-muted-foreground">Instructions</label>
                    <Textarea
                      rows={3}
                      value={paperDetails.instructions}
                      onChange={(e) => setPaperDetails({ ...paperDetails, instructions: e.target.value })}
                    />
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-sm flex justify-between">
                  <span className="text-muted-foreground">Total marks (from paper)</span>
                  <span className="font-semibold">{calculateTotalMarks()}</span>
                </div>
              </div>
              <div className="p-4 border-t border-border flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowExportModal(false)} disabled={isExportingPDF}>
                  Cancel
                </Button>
                <Button onClick={() => runExportPdf(true)} disabled={isExportingPDF}>
                  {isExportingPDF ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  {isExportingPDF ? "Generating..." : "Generate & Download PDF"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Paper History Modal */}
        {paperHistoryOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-lg">
                  Paper History{papersGeneratedCount != null ? ` — ${papersGeneratedCount} generated` : ""}
                </h3>
                <button onClick={() => setPaperHistoryOpen(false)} className="p-1 hover:bg-muted rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loadingHistory ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : paperHistory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No papers generated yet.</p>
                ) : (
                  paperHistory.map((entry) => {
                    const displayName =
                      entry.content?.paperDetails?.pdfFileName || entry.title || "Question Paper";
                    return (
                      <div key={entry.id} className="border border-border rounded-lg p-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{displayName}</p>
                          <p className="text-xs text-muted-foreground">
                            {entry.exam_type ?? "custom"} • {entry.total_marks ?? "—"} marks •{" "}
                            {new Date(entry.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button size="sm" variant="outline" onClick={() => restoreHistoryEntry(entry)}>
                            Restore to Builder
                          </Button>
                          <Button size="sm" onClick={() => redownloadHistoryEntry(entry)} disabled={isExportingPDF}>
                            <Download className="w-4 h-4 mr-1" /> Download
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Hidden Component for PDF Export */}
        <div className="fixed left-[9999px] top-0 opacity-0 pointer-events-none" aria-hidden="true">
          <div id="paper-preview-for-pdf" className="w-[800px] p-10 font-serif text-sm" style={{ backgroundColor: '#ffffff', color: '#000000' }}>
            {isEndSem ? (
                <>
                  <div className="text-center mb-4">
                    <p className="font-bold text-base">{paperDetails.instituteName}</p>
                    <p className="text-xs">{paperDetails.department}</p>
                  </div>
                  <div className="border-t border-b py-2 mb-4 text-xs" style={{ borderColor: '#000000' }}>
                    <p className="font-bold text-center mb-1">{paperDetails.examName}</p>
                    <div className="flex justify-between">
                      <span>Max marks: {paperDetails.maxMarksOverride || calculateTotalMarks()}</span>
                      <span>Duration: {paperDetails.duration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Branch: {paperDetails.branch}</span>
                      <span>Semester: {paperDetails.semester}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Course: {paperDetails.subject}</span>
                      <span>QP Code: {paperDetails.qpCode}</span>
                    </div>
                  </div>
                  {(paperDetails.attemptInstruction || paperDetails.instructions) && (
                    <div className="mb-4 text-xs">
                      <p className="font-bold">N.B.</p>
                      {paperDetails.attemptInstruction && <p>(1) {paperDetails.attemptInstruction}</p>}
                      {paperDetails.instructions && <p>(2) {paperDetails.instructions}</p>}
                    </div>
                  )}
                  <div className="space-y-3">
                    {sections.map((section, sIndex) => (
                      <div key={section.id}>
                        {section.questions.map((q, qIdx) => (
                          <div key={q.id} className="flex justify-between gap-4 mb-1">
                            <p className="flex-1 whitespace-pre-wrap">
                              <span className="font-semibold">
                                Q.{sIndex + 1} ({String.fromCharCode(97 + qIdx)})
                              </span>{" "}
                              {q.text}
                            </p>
                            <span className="font-semibold whitespace-nowrap">{q.marks}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="mt-10 text-center text-sm">X------X------X-----X</div>
                  {paperDetails.qpCode && (
                    <div className="mt-4 text-xs">QP Code: {paperDetails.qpCode}</div>
                  )}
                </>
              ) : (
                <>
                  <div className="text-center mb-4 border-2 p-3" style={{ borderColor: '#000000' }}>
                    <p className="font-bold">{paperDetails.instituteName}</p>
                    <p>{paperDetails.department}</p>
                    <p>Year: {paperDetails.academicYear}</p>
                    <p className="font-bold mt-1">{paperDetails.examName}</p>
                  </div>
                  <table className="w-full border-2 mb-4 text-xs" style={{ borderColor: '#000000', borderCollapse: "collapse" }}>
                    <tbody>
                      <tr>
                        <td className="border p-1 w-1/2" style={{ borderColor: '#000000' }}>Class: {paperDetails.className}</td>
                        <td className="border p-1" style={{ borderColor: '#000000' }}>Division: {paperDetails.division}</td>
                      </tr>
                      <tr>
                        <td className="border p-1" style={{ borderColor: '#000000' }}>Semester: {paperDetails.semester}</td>
                        <td className="border p-1" style={{ borderColor: '#000000' }}>Subject: {paperDetails.subject}</td>
                      </tr>
                      <tr>
                        <td className="border p-1" style={{ borderColor: '#000000' }}>Date: {paperDetails.date}</td>
                        <td className="border p-1" style={{ borderColor: '#000000' }}>Time: {paperDetails.duration}</td>
                      </tr>
                    </tbody>
                  </table>

                  {paperDetails.instructions && (
                    <div className="mb-4 text-xs">
                      <p className="font-bold underline mb-1">Instructions:</p>
                      <p className="whitespace-pre-wrap">{paperDetails.instructions}</p>
                    </div>
                  )}

                  {sections.map((section, sIndex) => {
                    const printItems = buildPrintItems(section.questions);
                    return (
                      <table
                        key={section.id}
                        className="w-full border-2 mb-4 text-xs"
                        style={{ borderColor: '#000000', borderCollapse: "collapse" }}
                      >
                        <thead>
                          <tr>
                            <td colSpan={2} className="border p-2 font-bold" style={{ borderColor: '#000000' }}>
                              Q.{sIndex + 1}) {section.attemptCount ? `(Attempt any ${section.attemptCount} of the following)` : ""}
                            </td>
                            <td className="border p-2 font-bold text-center w-20" style={{ borderColor: '#000000' }}>
                              Marks{section.attemptCount ? ` (Total ${getSectionMarks(section)})` : ""}
                            </td>
                          </tr>
                        </thead>
                        <tbody>
                          {printItems.flatMap((item, iIdx) => {
                            if (item.alternatives.length === 1) {
                              const q = item.alternatives[0];
                              return [
                                <tr key={q.id}>
                                  <td className="border p-2 w-8 align-top" style={{ borderColor: '#000000' }}>{String.fromCharCode(97 + iIdx)}</td>
                                  <td className="border p-2 whitespace-pre-wrap" style={{ borderColor: '#000000' }}>{q.text}</td>
                                  <td className="border p-2 text-center align-top" style={{ borderColor: '#000000' }}>{q.marks}M</td>
                                </tr>,
                              ];
                            }
                            const rows: ReactElement[] = [];
                            item.alternatives.forEach((alt, aIdx) => {
                              rows.push(
                                <tr key={alt.id}>
                                  <td className="border p-2 w-8 align-top" style={{ borderColor: '#000000' }}>{String.fromCharCode(97 + aIdx)}</td>
                                  <td className="border p-2 whitespace-pre-wrap" style={{ borderColor: '#000000' }}>{alt.text}</td>
                                  <td className="border p-2 text-center align-top" style={{ borderColor: '#000000' }}>{alt.marks}M</td>
                                </tr>
                              );
                              if (aIdx < item.alternatives.length - 1) {
                                rows.push(
                                  <tr key={`${alt.id}-or`}>
                                    <td colSpan={3} className="border text-center font-bold py-1" style={{ borderColor: '#000000' }}>
                                      OR
                                    </td>
                                  </tr>
                                );
                              }
                            });
                            return rows;
                          })}
                        </tbody>
                      </table>
                    );
                  })}

                  <div className="mt-8 text-center text-xs border-t pt-3" style={{ color: '#6b7280', borderColor: '#d1d5db' }}>
                    *** End of Paper ***
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
    </DndProvider>
  );
}