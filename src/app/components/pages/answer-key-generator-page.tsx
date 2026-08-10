import { useState, useEffect, useMemo } from "react";
import {
  Key,
  Download,
  Sparkles,
  FileText,
  CheckCircle,
  Clock,
  BookOpen,
  Edit,
  Check,
  X,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Progress } from "../ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

// ────────────────────────────────────────────────────────────────────────
// Data model — mirrors the shape saved by the Paper Builder into
// question_papers.content. Kept self-contained here rather than imported,
// since only a small, stable slice of that shape is needed.
// ────────────────────────────────────────────────────────────────────────

interface PaperQuestion {
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
  attemptCount?: number;
  marksOverride?: number;
  questions: PaperQuestion[];
}

interface PaperDetails {
  title: string;
  subject: string;
  examFormat: string;
  instituteName?: string;
  department?: string;
  academicYear?: string;
  examName?: string;
  [key: string]: any;
}

interface PaperContent {
  paperDetails: PaperDetails;
  sections: PaperSection[];
}

interface PaperSummary {
  id: string;
  title: string;
  exam_type: string | null;
  total_marks: number | null;
  created_at: string;
  content: PaperContent | null;
}

interface MarkingSchemeItem {
  point: string;
  marks: number;
}

interface AnswerKeyEntry {
  answerText: string;
  markingScheme: MarkingSchemeItem[];
  rubric: string;
}

interface FlatQuestion {
  localId: number; // matches PaperQuestion.id — used as answer_keys.paper_question_id
  bankQuestionId?: string;
  sectionIndex: number;
  displayLabel: string; // e.g. "Q.1.3", "Q.2 (a)"
  isOrAlternative: boolean;
  text: string;
  marks: number;
  bloomLevel: string;
  difficulty: string;
  unit: string;
}

// Groups a section's questions into numbered print items, collapsing
// OR-alternatives — identical grouping logic to the Paper Builder, so
// question numbering here matches what's printed on the paper itself.
function buildPrintItems(questions: PaperQuestion[]) {
  const items: { number: number; alternatives: PaperQuestion[] }[] = [];
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
}

function flattenPaperQuestions(sections: PaperSection[]): FlatQuestion[] {
  const flat: FlatQuestion[] = [];
  sections.forEach((section, sIdx) => {
    const printItems = buildPrintItems(section.questions);
    printItems.forEach((item) => {
      item.alternatives.forEach((q, aIdx) => {
        const label =
          item.alternatives.length > 1
            ? `Q.${sIdx + 1}.${item.number} (${String.fromCharCode(97 + aIdx)})`
            : `Q.${sIdx + 1}.${item.number}`;
        flat.push({
          localId: q.id,
          bankQuestionId: q.bankQuestionId,
          sectionIndex: sIdx,
          displayLabel: label,
          isOrAlternative: item.alternatives.length > 1,
          text: q.text,
          marks: q.marks,
          bloomLevel: q.bloomLevel,
          difficulty: q.difficulty,
          unit: q.unit,
        });
      });
    });
  });
  return flat;
}

// Review-time estimate scales with marks rather than being a flat guess.
function estimateReviewMinutes(marks: number): number {
  if (marks <= 2) return 1;
  if (marks <= 5) return 2;
  if (marks <= 10) return 4;
  return 6;
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function AnswerKeyGeneratorPage() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [papers, setPapers] = useState<PaperSummary[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(true);
  const [selectedPaperId, setSelectedPaperId] = useState<string>("");

  const [answerMap, setAnswerMap] = useState<Record<number, AnswerKeyEntry>>({});
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [selectedLocalId, setSelectedLocalId] = useState<number | null>(null);

  const [aiProvider, setAiProvider] = useState<"chatgpt" | "gemini">("chatgpt");
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [genProgress, setGenProgress] = useState(0);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Inline editing
  const [editingField, setEditingField] = useState<"answer" | "scheme" | "rubric" | null>(null);
  const [draftAnswer, setDraftAnswer] = useState("");
  const [draftScheme, setDraftScheme] = useState<MarkingSchemeItem[]>([]);
  const [draftRubric, setDraftRubric] = useState("");

  // --- Init: current user + their exported papers ---
  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id ?? null;
      setCurrentUserId(uid);

      if (!uid) {
        setLoadingPapers(false);
        return;
      }

      setLoadingPapers(true);
      const { data, error } = await supabase
        .from("question_papers")
        .select("id, title, exam_type, total_marks, created_at, content")
        .eq("created_by", uid)
        .eq("status", "exported")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading papers:", error);
        toast.error(`Could not load your papers: ${error.message}`);
      } else {
        const list = (data || []) as PaperSummary[];
        setPapers(list);
        if (list.length > 0) setSelectedPaperId(list[0].id);
      }
      setLoadingPapers(false);
    }
    init();
  }, []);

  const selectedPaper = useMemo(() => papers.find((p) => p.id === selectedPaperId) ?? null, [papers, selectedPaperId]);

  const flatQuestions = useMemo(
    () => (selectedPaper?.content ? flattenPaperQuestions(selectedPaper.content.sections) : []),
    [selectedPaper]
  );

  // Default the selected question whenever the paper (and therefore its
  // question list) changes.
  useEffect(() => {
    setSelectedLocalId(flatQuestions.length > 0 ? flatQuestions[0].localId : null);
    setEditingField(null);
  }, [selectedPaperId, flatQuestions.length]);

  // --- Load existing saved answers for the selected paper ---
  useEffect(() => {
    async function loadAnswers() {
      if (!selectedPaperId) {
        setAnswerMap({});
        return;
      }
      setLoadingAnswers(true);
      const { data, error } = await supabase
        .from("answer_keys")
        .select("paper_question_id, answer_text, marking_scheme, rubric")
        .eq("paper_id", selectedPaperId);

      if (error) {
        console.error("Error loading answer key:", error);
        toast.error(`Could not load saved answers: ${error.message}`);
        setAnswerMap({});
      } else {
        const map: Record<number, AnswerKeyEntry> = {};
        (data || []).forEach((row: any) => {
          if (row.paper_question_id == null) return;
          map[row.paper_question_id] = {
            answerText: row.answer_text || "",
            markingScheme: row.marking_scheme || [],
            rubric: row.rubric || "",
          };
        });
        setAnswerMap(map);
      }
      setLoadingAnswers(false);
    }
    loadAnswers();
  }, [selectedPaperId]);

  const selectedQuestion = flatQuestions.find((q) => q.localId === selectedLocalId) ?? flatQuestions[0] ?? null;
  const selectedEntry = selectedQuestion ? answerMap[selectedQuestion.localId] : undefined;

  // --- Stats (all derived from real data) ---
  const totalQuestions = flatQuestions.length;
  const totalMarks = selectedPaper?.total_marks ?? flatQuestions.reduce((s, q) => s + q.marks, 0);
  const answersGenerated = flatQuestions.filter((q) => answerMap[q.localId]?.answerText).length;
  const estReviewTime = formatMinutes(flatQuestions.reduce((s, q) => s + estimateReviewMinutes(q.marks), 0));

  // --- AI generation ---
  const generateAnswerForQuestion = async (fq: FlatQuestion): Promise<AnswerKeyEntry | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-answer-key", {
        body: {
          question: fq.text,
          marks: fq.marks,
          bloom_level: fq.bloomLevel,
          difficulty: fq.difficulty,
          unit: fq.unit,
          exam_format: selectedPaper?.content?.paperDetails.examFormat,
          provider: aiProvider,
        },
      });

      if (error) {
        // supabase-js's FunctionsHttpError hides the actual status/body
        // behind `error.context` (a Response) — surface it explicitly so a
        // 401 (JWT verification) reads differently from a 500 (bad Gemini
        // key, bad prompt response, etc.) without needing the Network tab.
        let detail = error.message;
        const status = (error as any)?.context?.status;
        try {
          const body = await (error as any)?.context?.json();
          if (body?.error) detail = body.error;
        } catch {
          // response wasn't JSON — fall back to error.message
        }
        if (status === 401) {
          toast.error(
            "generate-answer-key returned 401 Unauthorized. This function's JWT verification setting likely doesn't match generate-questions' — check Edge Functions settings in the Supabase dashboard."
          );
        } else {
          toast.error(`Answer generation failed${status ? ` (${status})` : ""}: ${detail}`);
        }
        console.error("Answer generation failed:", status, detail, error);
        return null;
      }

      if (data?.error) {
        console.error("Answer generation failed:", data.error);
        toast.error(`Answer generation failed: ${data.error}`);
        return null;
      }

      return {
        answerText: data.modelAnswer,
        markingScheme: Array.isArray(data.markingScheme) ? data.markingScheme : [],
        rubric: data.rubric || "",
      };
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const saveAnswerEntry = async (fq: FlatQuestion, entry: AnswerKeyEntry) => {
    if (!selectedPaperId || !currentUserId) return false;
    const { error } = await supabase.from("answer_keys").upsert(
      {
        paper_id: selectedPaperId,
        paper_question_id: fq.localId,
        question_id: fq.bankQuestionId ?? null,
        answer_text: entry.answerText,
        marking_scheme: entry.markingScheme,
        rubric: entry.rubric,
        created_by: currentUserId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "paper_id,paper_question_id" }
    );
    if (error) {
      console.error("Error saving answer key entry:", error);
      toast.error(`Could not save this answer: ${error.message}`);
      return false;
    }
    return true;
  };

  const handleGenerateSingle = async (fq: FlatQuestion) => {
    setGeneratingId(fq.localId);
    const entry = await generateAnswerForQuestion(fq);
    if (entry) {
      setAnswerMap((prev) => ({ ...prev, [fq.localId]: entry }));
      await saveAnswerEntry(fq, entry);
      toast.success(`Answer generated for ${fq.displayLabel}`);
    }
    setGeneratingId(null);
  };

  const handleGenerateAll = async () => {
    if (flatQuestions.length === 0) return;
    setGeneratingAll(true);
    setGenProgress(0);

    let successCount = 0;
    for (let i = 0; i < flatQuestions.length; i++) {
      const fq = flatQuestions[i];
      setGeneratingId(fq.localId);
      const entry = await generateAnswerForQuestion(fq);
      if (entry) {
        setAnswerMap((prev) => ({ ...prev, [fq.localId]: entry }));
        await saveAnswerEntry(fq, entry);
        successCount += 1;
      }
      setGenProgress(Math.round(((i + 1) / flatQuestions.length) * 100));
    }

    setGeneratingId(null);
    setGeneratingAll(false);
    if (successCount === flatQuestions.length) {
      toast.success("Answer key generated for all questions.");
    } else {
      toast.error(`Generated ${successCount} of ${flatQuestions.length} answers. Retry the rest individually.`);
    }
  };

  // --- Inline editing ---
  const startEditAnswer = () => {
    setDraftAnswer(selectedEntry?.answerText ?? "");
    setEditingField("answer");
  };
  const startEditScheme = () => {
    setDraftScheme(selectedEntry?.markingScheme ?? []);
    setEditingField("scheme");
  };
  const startEditRubric = () => {
    setDraftRubric(selectedEntry?.rubric ?? "");
    setEditingField("rubric");
  };
  const cancelEdit = () => setEditingField(null);

  const saveEdit = async () => {
    if (!selectedQuestion) return;
    const base: AnswerKeyEntry = {
      answerText: selectedEntry?.answerText ?? "",
      markingScheme: selectedEntry?.markingScheme ?? [],
      rubric: selectedEntry?.rubric ?? "",
    };
    let updated: AnswerKeyEntry = base;
    if (editingField === "answer") updated = { ...base, answerText: draftAnswer };
    if (editingField === "scheme") updated = { ...base, markingScheme: draftScheme };
    if (editingField === "rubric") updated = { ...base, rubric: draftRubric };

    setAnswerMap((prev) => ({ ...prev, [selectedQuestion.localId]: updated }));
    const ok = await saveAnswerEntry(selectedQuestion, updated);
    if (ok) toast.success("Saved.");
    setEditingField(null);
  };

  const updateDraftSchemeRow = (index: number, updates: Partial<MarkingSchemeItem>) => {
    setDraftScheme((prev) => prev.map((row, i) => (i === index ? { ...row, ...updates } : row)));
  };
  const addDraftSchemeRow = () => setDraftScheme((prev) => [...prev, { point: "", marks: 0 }]);
  const removeDraftSchemeRow = (index: number) => setDraftScheme((prev) => prev.filter((_, i) => i !== index));

  const schemeSum = (selectedEntry?.markingScheme ?? []).reduce((s, item) => s + (item.marks || 0), 0);
  const schemeMismatch = selectedQuestion && (selectedEntry?.markingScheme?.length ?? 0) > 0 && schemeSum !== selectedQuestion.marks;

  // --- PDF export ---
  const runExportPdf = async () => {
    const element = document.getElementById("answer-key-preview-for-pdf");
    if (!element || !selectedPaper) {
      toast.error("Could not find the answer key preview to export.");
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

      const baseName = (selectedPaper.title || "Question_Paper").replace(/\s+/g, "_");
      pdf.save(`${baseName}-answer_key.pdf`);
      toast.success("Answer key PDF downloaded.");
    } catch (e: any) {
      console.error("Answer key PDF export failed:", e);
      toast.error(`PDF export failed: ${e?.message || "unknown error"}`);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const paperDetails = selectedPaper?.content?.paperDetails;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">AI Answer Key Generator</h1>
          <p className="text-muted-foreground mt-1">
            Generate model answers, marking schemes, and rubrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-1.5 text-sm">
            <span className="text-muted-foreground font-medium text-xs uppercase tracking-wider">Model:</span>
            <select
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value as "chatgpt" | "gemini")}
              className="bg-transparent focus:outline-none text-foreground font-medium text-sm cursor-pointer"
            >
              <option value="chatgpt">ChatGPT (OpenAI)</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </div>
          <Button
            variant="outline"
            onClick={handleGenerateAll}
            disabled={generatingAll || !selectedPaper || flatQuestions.length === 0}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {generatingAll ? "Generating..." : "Generate All"}
          </Button>
          <Button onClick={runExportPdf} disabled={isExportingPDF || !selectedPaper || answersGenerated === 0}>
            {isExportingPDF ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Download Answer Key
          </Button>
        </div>
      </div>

      {/* Paper selector */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 flex-wrap">
        <span className="text-sm text-muted-foreground flex-shrink-0">Paper:</span>
        {loadingPapers ? (
          <span className="text-sm text-muted-foreground">Loading your papers...</span>
        ) : papers.length === 0 ? (
          <span className="text-sm text-muted-foreground">
            No exported papers found yet — generate one in Paper Builder first.
          </span>
        ) : (
          <select
            value={selectedPaperId}
            onChange={(e) => setSelectedPaperId(e.target.value)}
            className="flex-1 min-w-[240px] px-3 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {papers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} — {p.exam_type ?? "custom"} — {new Date(p.created_at).toLocaleDateString()}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Generation Progress */}
      {generatingAll && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <h3 className="font-semibold">Generating Answer Key with AI...</h3>
          </div>
          <Progress value={genProgress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            {genProgress}% complete
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Questions</p>
              <p className="text-3xl font-bold mt-2">{totalQuestions}</p>
            </div>
            <div className="p-3 rounded-xl bg-primary/10">
              <FileText className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Marks</p>
              <p className="text-3xl font-bold mt-2">{totalMarks}</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/10">
              <BookOpen className="w-6 h-6 text-secondary" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Answers Generated</p>
              <p className="text-3xl font-bold mt-2">
                {answersGenerated}/{totalQuestions}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-success/10">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Est. Review Time</p>
              <p className="text-3xl font-bold mt-2">{totalQuestions > 0 ? estReviewTime : "—"}</p>
            </div>
            <div className="p-3 rounded-xl bg-accent/10">
              <Clock className="w-6 h-6 text-accent" />
            </div>
          </div>
        </div>
      </div>

      {!selectedPaper || flatQuestions.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          <Key className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>{loadingPapers ? "Loading..." : "Select a paper above to build its answer key."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Question List */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-xl p-6 sticky top-6">
              <h2 className="text-xl font-semibold mb-4">Questions</h2>
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                {flatQuestions.map((question) => {
                  const entry = answerMap[question.localId];
                  const hasAnswer = !!entry?.answerText;
                  return (
                    <button
                      key={question.localId}
                      onClick={() => {
                        setSelectedLocalId(question.localId);
                        setEditingField(null);
                      }}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        selectedLocalId === question.localId
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-accent/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold mb-1">{question.displayLabel}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">{question.text}</p>
                        </div>
                        <div className="flex-shrink-0">
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded-lg font-semibold text-sm">
                            {question.marks}m
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {generatingId === question.localId ? (
                          <>
                            <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            <span className="text-xs text-primary">Generating...</span>
                          </>
                        ) : hasAnswer ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-success" />
                            <span className="text-xs text-success">Answer generated</span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not generated yet</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Answer Details */}
          <div className="lg:col-span-2 space-y-6">
            {selectedQuestion && (
              <>
                {/* Question Display */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{selectedQuestion.displayLabel}</h3>
                      <p className="text-foreground whitespace-pre-wrap">{selectedQuestion.text}</p>
                    </div>
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg font-semibold flex-shrink-0">
                      {selectedQuestion.marks} marks
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-3">
                    <span className="text-xs px-2 py-1 bg-secondary/10 text-secondary rounded-full">
                      {selectedQuestion.bloomLevel}
                    </span>
                    <span className="text-xs px-2 py-1 bg-accent/10 text-accent rounded-full">
                      {selectedQuestion.difficulty}
                    </span>
                    <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
                      {selectedQuestion.unit}
                    </span>
                    {selectedQuestion.isOrAlternative && (
                      <span className="text-xs px-2 py-1 bg-secondary/20 text-secondary rounded-full font-semibold">
                        OR alternative
                      </span>
                    )}
                  </div>
                </div>

                {!selectedEntry?.answerText && editingField === null && (
                  <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-between">
                    <p className="text-muted-foreground">No answer generated for this question yet.</p>
                    <Button
                      onClick={() => handleGenerateSingle(selectedQuestion)}
                      disabled={generatingId === selectedQuestion.localId}
                    >
                      {generatingId === selectedQuestion.localId ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2" />
                      )}
                      Generate Answer
                    </Button>
                  </div>
                )}

                {/* Tabbed Content */}
                {selectedEntry?.answerText && (
                  <div className="bg-card border border-border rounded-xl p-6">
                    <Tabs defaultValue="answer">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="answer">Model Answer</TabsTrigger>
                        <TabsTrigger value="scheme">Marking Scheme</TabsTrigger>
                        <TabsTrigger value="rubric">Rubric</TabsTrigger>
                      </TabsList>

                      {/* Model Answer */}
                      <TabsContent value="answer" className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">Model Answer</h3>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleGenerateSingle(selectedQuestion)}
                              disabled={generatingId === selectedQuestion.localId}
                              title="Regenerate with AI"
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Regenerate
                            </Button>
                            {editingField !== "answer" && (
                              <Button variant="outline" size="sm" onClick={startEditAnswer}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Answer
                              </Button>
                            )}
                          </div>
                        </div>

                        {editingField === "answer" ? (
                          <div className="space-y-3">
                            <Textarea rows={10} value={draftAnswer} onChange={(e) => setDraftAnswer(e.target.value)} />
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={cancelEdit}>
                                <X className="w-4 h-4 mr-2" /> Cancel
                              </Button>
                              <Button size="sm" onClick={saveEdit}>
                                <Check className="w-4 h-4 mr-2" /> Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="bg-muted rounded-xl p-4">
                              <pre className="whitespace-pre-wrap font-sans text-sm">{selectedEntry.answerText}</pre>
                            </div>
                            <div className="flex items-start gap-2 p-4 bg-success/5 border border-success/20 rounded-xl">
                              <Sparkles className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="font-semibold text-success">AI Generated</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  This answer was generated based on the question, its marks, and syllabus context.
                                  Review and edit as needed.
                                </p>
                              </div>
                            </div>
                          </>
                        )}
                      </TabsContent>

                      {/* Marking Scheme */}
                      <TabsContent value="scheme" className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">Marking Scheme</h3>
                          {editingField !== "scheme" && (
                            <Button variant="ghost" size="sm" onClick={startEditScheme}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                          )}
                        </div>

                        {editingField === "scheme" ? (
                          <div className="space-y-3">
                            {draftScheme.map((item, index) => (
                              <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                                <Input
                                  className="flex-1"
                                  value={item.point}
                                  onChange={(e) => updateDraftSchemeRow(index, { point: e.target.value })}
                                  placeholder="Marking point"
                                />
                                <Input
                                  type="number"
                                  className="w-20"
                                  value={item.marks}
                                  onChange={(e) => updateDraftSchemeRow(index, { marks: parseInt(e.target.value) || 0 })}
                                />
                                <button
                                  onClick={() => removeDraftSchemeRow(index)}
                                  className="p-1 hover:bg-destructive/10 rounded-lg"
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </button>
                              </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={addDraftSchemeRow}>
                              <Plus className="w-4 h-4 mr-2" /> Add Point
                            </Button>
                            <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-xl text-sm">
                              <span>Sum of points</span>
                              <span className="font-semibold">
                                {draftScheme.reduce((s, i) => s + (i.marks || 0), 0)}m / {selectedQuestion.marks}m
                              </span>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={cancelEdit}>
                                <X className="w-4 h-4 mr-2" /> Cancel
                              </Button>
                              <Button size="sm" onClick={saveEdit}>
                                <Check className="w-4 h-4 mr-2" /> Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {schemeMismatch && (
                              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/40 rounded-xl text-sm text-amber-700">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                Marking scheme totals {schemeSum}m but the question is worth {selectedQuestion.marks}m.
                              </div>
                            )}
                            <div className="space-y-3">
                              {(selectedEntry.markingScheme ?? []).map((item, index) => (
                                <div
                                  key={index}
                                  className="flex items-start justify-between p-4 bg-muted rounded-xl"
                                >
                                  <div className="flex items-start gap-3 flex-1">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold flex-shrink-0">
                                      {index + 1}
                                    </div>
                                    <p>{item.point}</p>
                                  </div>
                                  <span className="px-3 py-1 bg-primary text-primary-foreground rounded-lg font-semibold ml-4">
                                    {item.marks}m
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-xl">
                              <span className="font-semibold">Total</span>
                              <span className="px-3 py-1 bg-primary text-primary-foreground rounded-lg font-semibold">
                                {selectedQuestion.marks}m
                              </span>
                            </div>
                          </>
                        )}
                      </TabsContent>

                      {/* Rubric */}
                      <TabsContent value="rubric" className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">Evaluation Rubric</h3>
                          {editingField !== "rubric" && (
                            <Button variant="ghost" size="sm" onClick={startEditRubric}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                          )}
                        </div>

                        {editingField === "rubric" ? (
                          <div className="space-y-3">
                            <Textarea rows={4} value={draftRubric} onChange={(e) => setDraftRubric(e.target.value)} />
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={cancelEdit}>
                                <X className="w-4 h-4 mr-2" /> Cancel
                              </Button>
                              <Button size="sm" onClick={saveEdit}>
                                <Check className="w-4 h-4 mr-2" /> Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-muted rounded-xl p-6">
                            <p className="mb-4">{selectedEntry.rubric}</p>
                            <div className="space-y-3 mt-4 pt-4 border-t border-border">
                              <h4 className="font-semibold">Grading Guidelines:</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                                  <p className="font-semibold text-success">Excellent (90-100%)</p>
                                  <p className="text-sm text-muted-foreground mt-1">All points covered comprehensively</p>
                                </div>
                                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                                  <p className="font-semibold text-primary">Good (70-89%)</p>
                                  <p className="text-sm text-muted-foreground mt-1">Most points with minor gaps</p>
                                </div>
                                <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                                  <p className="font-semibold text-warning">Satisfactory (50-69%)</p>
                                  <p className="text-sm text-muted-foreground mt-1">Basic understanding shown</p>
                                </div>
                                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                                  <p className="font-semibold text-destructive">Needs Improvement (&lt;50%)</p>
                                  <p className="text-sm text-muted-foreground mt-1">Significant gaps present</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Hidden preview for PDF export — always mounted (visually hidden),
          colors are explicit inline hex values throughout (no Tailwind
          theme-color classes) to avoid the html2canvas "oklch" parse error. */}
      <div className="fixed left-[9999px] top-0 opacity-0 pointer-events-none" aria-hidden="true">
        <div
          id="answer-key-preview-for-pdf"
          className="w-[800px] p-10 font-serif text-sm"
          style={{ backgroundColor: "#ffffff", color: "#000000" }}
        >
          <div className="text-center mb-6" style={{ borderBottom: "2px solid #000000", paddingBottom: "12px" }}>
            {paperDetails?.instituteName && (
              <p className="font-bold text-base">{paperDetails.instituteName}</p>
            )}
            {paperDetails?.department && <p className="text-xs">{paperDetails.department}</p>}
            <p className="font-bold text-lg mt-2">{selectedPaper?.title} — Answer Key</p>
            {paperDetails?.subject && <p className="text-xs mt-1">Subject: {paperDetails.subject}</p>}
            <p className="text-xs mt-1">Total: {totalMarks} marks • {totalQuestions} questions</p>
          </div>

          <div className="space-y-6">
            {flatQuestions.map((q) => {
              const entry = answerMap[q.localId];
              if (!entry?.answerText) return null;
              return (
                <div key={q.localId} style={{ borderBottom: "1px solid #d1d5db", paddingBottom: "16px" }}>
                  <div className="flex justify-between gap-4 mb-1">
                    <p className="font-bold flex-1">
                      {q.displayLabel} {q.text}
                    </p>
                    <span className="font-bold whitespace-nowrap">{q.marks}M</span>
                  </div>

                  <p className="font-semibold mt-3 mb-1">Model Answer:</p>
                  <p className="whitespace-pre-wrap mb-3">{entry.answerText}</p>

                  {entry.markingScheme?.length > 0 && (
                    <>
                      <p className="font-semibold mb-1">Marking Scheme:</p>
                      <table className="w-full text-xs mb-3" style={{ borderCollapse: "collapse" }}>
                        <tbody>
                          {entry.markingScheme.map((item, i) => (
                            <tr key={i}>
                              <td className="py-1" style={{ borderBottom: "1px solid #e5e7eb" }}>
                                {item.point}
                              </td>
                              <td
                                className="py-1 text-right w-16"
                                style={{ borderBottom: "1px solid #e5e7eb" }}
                              >
                                {item.marks}m
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}

                  {entry.rubric && (
                    <>
                      <p className="font-semibold mb-1">Rubric:</p>
                      <p className="text-xs" style={{ color: "#374151" }}>
                        {entry.rubric}
                      </p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}