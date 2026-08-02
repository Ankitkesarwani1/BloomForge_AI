import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Filter, Edit, Trash2, Copy, Tag, Check, RefreshCw, AlertCircle, X, ShieldCheck } from "lucide-react";
import { supabase } from "../../lib/supabase";

// --- enum <-> display-label mappings (mirrors the AI Question Generator page) ---
const enumToQuestionType: Record<string, string> = {
  mcq: "MCQ",
  short_answer: "Short Answer",
  long_answer: "Long Answer",
  numerical: "Numerical",
  case_study: "Case Study",
  application: "Application Based",
  analytical: "Analytical",
};
const enumToBloom: Record<string, string> = {
  remember: "Remember",
  understand: "Understand",
  apply: "Apply",
  analyze: "Analyze",
  evaluate: "Evaluate",
  create: "Create",
};
const enumToDifficulty: Record<string, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

const questionTypeToEnum: Record<string, string> = {
  "MCQ": "mcq",
  "Short Answer": "short_answer",
  "Long Answer": "long_answer",
  "Numerical": "numerical",
  "Case Study": "case_study",
  "Application Based": "application",
  "Analytical": "analytical",
};
const bloomToEnum: Record<string, string> = {
  Remember: "remember", Understand: "understand", Apply: "apply",
  Analyze: "analyze", Evaluate: "evaluate", Create: "create",
};
const difficultyToEnum: Record<string, string> = { Easy: "easy", Medium: "medium", Hard: "hard" };

const bloomLevels = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"];
const questionTypes = ["MCQ", "Short Answer", "Long Answer", "Numerical", "Case Study", "Application Based", "Analytical"];
const difficultyLevels = ["Easy", "Medium", "Hard"];

interface SubjectOption { id: string; subject: string; code: string; subjectFk: string | null; }
interface UnitOption { id: string; unit_number: number; title: string; }

interface QuestionRow {
  id: string;
  question: string;
  subject: string;
  unit: string;
  type: string;
  bloom: string;
  difficulty: string;
  marks: number;
  source: string;
  approved: boolean;
}

const PAGE_SIZE = 10;

export function QuestionBankPage() {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [selectedBloom, setSelectedBloom] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // --- Add Question modal state ---
  const [subjectOptionsForModal, setSubjectOptionsForModal] = useState<SubjectOption[]>([]);
  const [unitOptionsForModal, setUnitOptionsForModal] = useState<UnitOption[]>([]);
  const [loadingModalSubjects, setLoadingModalSubjects] = useState(false);
  const [loadingModalUnits, setLoadingModalUnits] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newSyllabusId, setNewSyllabusId] = useState("");
  const [newUnitId, setNewUnitId] = useState("");
  const [newType, setNewType] = useState("Short Answer");
  const [newBloom, setNewBloom] = useState("Understand");
  const [newDifficulty, setNewDifficulty] = useState("Medium");
  const [newMarks, setNewMarks] = useState(5);
  const [savingNewQuestion, setSavingNewQuestion] = useState(false);
  const [addModalError, setAddModalError] = useState<string | null>(null);

  const fetchQuestions = async () => {
    setLoading(true);
    setLoadError(null);

    // Pulls in the related syllabus (for subject/code) and unit (for unit
    // number/title) via foreign keys on subject_id / unit_id, so questions
    // saved from the AI Question Generator (or added manually) show up here
    // as soon as they're inserted into the `questions` table.
    const { data, error } = await supabase
      .from("questions")
      .select(
        `
        id,
        question_text,
        question_type,
        difficulty,
        bloom_level,
        marks,
        source,
        approved,
        created_at,
        subjects:subject_id ( name, code ),
        units:unit_id ( unit_number, title )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading questions:", error);
      setLoadError("Couldn't load the question bank. Please try again.");
      setQuestions([]);
    } else {
      const mapped: QuestionRow[] = (data ?? []).map((row: any) => ({
        id: row.id,
        question: row.question_text,
        subject: row.subjects?.name ?? "Unknown Subject",
        unit: row.units ? `Unit ${row.units.unit_number}: ${row.units.title}` : "—",
        type: enumToQuestionType[row.question_type] ?? row.question_type,
        bloom: enumToBloom[row.bloom_level] ?? row.bloom_level,
        difficulty: enumToDifficulty[row.difficulty] ?? row.difficulty,
        marks: row.marks,
        source: row.source,
        approved: row.approved,
      }));
      setQuestions(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  // Load subjects the first time the Add Question modal is opened.
  useEffect(() => {
    if (!showAddModal || subjectOptionsForModal.length > 0) return;
    const loadSubjects = async () => {
      setLoadingModalSubjects(true);
      const { data, error } = await supabase
        .from("syllabi")
        .select("id, subject, code, subject_id")
        .order("subject", { ascending: true });
      if (error) {
        console.error("Error loading subjects for Add Question modal:", error);
      } else if (data && data.length > 0) {
        setSubjectOptionsForModal(
          data.map((row) => ({ id: row.id, subject: row.subject, code: row.code, subjectFk: row.subject_id }))
        );
        setNewSyllabusId(data[0].id);
      }
      setLoadingModalSubjects(false);
    };
    loadSubjects();
  }, [showAddModal, subjectOptionsForModal.length]);

  // Load units whenever the modal's selected subject changes.
  useEffect(() => {
    if (!newSyllabusId) {
      setUnitOptionsForModal([]);
      setNewUnitId("");
      return;
    }
    const loadUnits = async () => {
      setLoadingModalUnits(true);
      const { data, error } = await supabase
        .from("units")
        .select("id, unit_number, title")
        .eq("syllabus_id", newSyllabusId)
        .order("unit_number", { ascending: true });
      if (error) {
        console.error("Error loading units for Add Question modal:", error);
        setUnitOptionsForModal([]);
      } else {
        setUnitOptionsForModal(data ?? []);
        setNewUnitId(data && data.length > 0 ? data[0].id : "");
      }
      setLoadingModalUnits(false);
    };
    loadUnits();
  }, [newSyllabusId]);

  const resetAddModal = () => {
    setNewQuestionText("");
    setNewType("Short Answer");
    setNewBloom("Understand");
    setNewDifficulty("Medium");
    setNewMarks(5);
    setAddModalError(null);
  };

  const handleAddQuestion = async () => {
    if (!newQuestionText.trim()) {
      setAddModalError("Enter the question text.");
      return;
    }
    if (!newSyllabusId || !newUnitId) {
      setAddModalError("Select a subject and unit.");
      return;
    }
    // questions.subject_id is a foreign key into `subjects`, not `syllabi` —
    // resolve the syllabus's linked subject record before inserting.
    const subjectFk = subjectOptionsForModal.find((s) => s.id === newSyllabusId)?.subjectFk;
    if (!subjectFk) {
      setAddModalError("This syllabus isn't linked to a subject record. Ask an admin to link it before adding questions.");
      return;
    }
    setSavingNewQuestion(true);
    setAddModalError(null);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) throw new Error("You must be signed in to add a question.");

      const { error } = await supabase.from("questions").insert({
        subject_id: subjectFk,
        unit_id: newUnitId,
        topic_id: null,
        question_text: newQuestionText.trim(),
        question_type: questionTypeToEnum[newType] ?? "short_answer",
        difficulty: difficultyToEnum[newDifficulty] ?? "medium",
        bloom_level: bloomToEnum[newBloom] ?? "understand",
        marks: newMarks,
        source: "manual",
        // Manually-entered questions are assumed vetted by whoever typed them,
        // so they count toward coverage immediately (unlike AI-generated ones,
        // which default to pending review).
        approved: true,
        created_by: userData.user.id,
      });
      if (error) throw error;

      setShowAddModal(false);
      resetAddModal();
      fetchQuestions();
    } catch (err: any) {
      setAddModalError(err.message ?? "Could not save the question.");
    } finally {
      setSavingNewQuestion(false);
    }
  };

  const handleApprove = async (q: QuestionRow) => {
    setApprovingId(q.id);
    const { error } = await supabase.from("questions").update({ approved: true }).eq("id", q.id);
    if (error) {
      alert(`Could not approve question: ${error.message}`);
    } else {
      setQuestions((prev) => prev.map((item) => (item.id === q.id ? { ...item, approved: true } : item)));
    }
    setApprovingId(null);
  };

  const subjectOptions = useMemo(
    () => Array.from(new Set(questions.map((q) => q.subject))).sort(),
    [questions]
  );

  const filteredQuestions = questions.filter((q) => {
    if (searchQuery && !q.question.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedSubject && q.subject !== selectedSubject) return false;
    if (selectedDifficulty && q.difficulty !== selectedDifficulty) return false;
    if (selectedBloom && q.bloom !== selectedBloom) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE));
  const pageQuestions = filteredQuestions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to page 1 whenever the filters/search narrow or widen the result set.
  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedSubject, selectedDifficulty, selectedBloom]);

  const stats = useMemo(() => {
    const total = questions.length;
    const aiGenerated = questions.filter((q) => q.source === "ai_generated").length;
    const manual = total - aiGenerated;
    const pendingReview = questions.filter((q) => !q.approved).length;
    return { total, aiGenerated, manual, pendingReview };
  }, [questions]);

  const handleCopy = async (q: QuestionRow) => {
    await navigator.clipboard.writeText(q.question);
    setCopiedId(q.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDelete = async (q: QuestionRow) => {
    if (!confirm("Delete this question from the bank? This can't be undone.")) return;
    setDeletingId(q.id);
    const { error } = await supabase.from("questions").delete().eq("id", q.id);
    if (error) {
      alert(`Could not delete question: ${error.message}`);
    } else {
      setQuestions((prev) => prev.filter((item) => item.id !== q.id));
    }
    setDeletingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Question Bank</h1>
          <p className="text-muted-foreground mt-1">Manage and organize your question repository</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchQuestions}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl hover:bg-accent transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </button>
        </div>
      </div>

      {loadError && (
        <div className="p-3 bg-red-500/10 text-red-600 rounded-xl text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{loadError}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Total Questions</p>
          <p className="text-2xl font-bold mt-1">{stats.total.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">AI Generated</p>
          <p className="text-2xl font-bold mt-1">{stats.aiGenerated.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Manually Added</p>
          <p className="text-2xl font-bold mt-1">{stats.manual.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Pending Review</p>
          <p className="text-2xl font-bold mt-1">{stats.pendingReview.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions..."
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={selectedSubject || ""}
            onChange={(e) => setSelectedSubject(e.target.value || null)}
            className="px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Subjects</option>
            {subjectOptions.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
          <select
            value={selectedBloom || ""}
            onChange={(e) => setSelectedBloom(e.target.value || null)}
            className="px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Bloom Levels</option>
            <option value="Remember">Remember</option>
            <option value="Understand">Understand</option>
            <option value="Apply">Apply</option>
            <option value="Analyze">Analyze</option>
            <option value="Evaluate">Evaluate</option>
            <option value="Create">Create</option>
          </select>
          <select
            value={selectedDifficulty || ""}
            onChange={(e) => setSelectedDifficulty(e.target.value || null)}
            className="px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground text-sm">Loading questions...</div>
      ) : filteredQuestions.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground text-sm">
          {questions.length === 0
            ? "No questions yet. Generate some in the AI Question Generator, or add one manually."
            : "No questions match your filters."}
        </div>
      ) : (
        <div className="space-y-3">
          {pageQuestions.map((q) => (
            <div key={q.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-semibold">
                      {q.subject}
                    </span>
                    <span className="px-2 py-0.5 bg-secondary/10 text-secondary rounded text-xs">{q.unit}</span>
                    <span className="px-2 py-0.5 bg-accent/10 text-accent rounded text-xs">{q.type}</span>
                    <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs">{q.bloom}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        q.difficulty === "Easy"
                          ? "bg-success/10 text-success"
                          : q.difficulty === "Medium"
                          ? "bg-warning/10 text-warning"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {q.difficulty}
                    </span>
                    {!q.approved && (
                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded text-xs">
                        Pending Review
                      </span>
                    )}
                    <span className="ml-auto font-semibold">{q.marks} marks</span>
                  </div>
                  <p className="text-foreground mb-2">{q.question}</p>
                  <div className="flex items-center gap-2">
                    <Tag className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {q.source === "ai_generated" ? "AI Generated" : "Manually Added"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {!q.approved && (
                    <button
                      onClick={() => handleApprove(q)}
                      disabled={approvingId === q.id}
                      className="p-2 hover:bg-accent rounded-lg transition-colors text-green-600 disabled:opacity-50"
                      title="Approve (counts toward syllabus coverage)"
                    >
                      <ShieldCheck className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleCopy(q)}
                    className="p-2 hover:bg-accent rounded-lg transition-colors"
                    title="Copy"
                  >
                    {copiedId === q.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button className="p-2 hover:bg-accent rounded-lg transition-colors" title="Edit">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(q)}
                    disabled={deletingId === q.id}
                    className="p-2 hover:bg-accent rounded-lg transition-colors text-destructive disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {filteredQuestions.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filteredQuestions.length)} of{" "}
            {filteredQuestions.length.toLocaleString()} questions
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-card border border-border rounded-xl hover:bg-accent transition-colors disabled:opacity-50"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(Math.max(0, page - 3), Math.max(0, page - 3) + 5)
              .map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-4 py-2 rounded-xl transition-colors ${
                    p === page
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border hover:bg-accent"
                  }`}
                >
                  {p}
                </button>
              ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-card border border-border rounded-xl hover:bg-accent transition-colors disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowAddModal(false);
                resetAddModal();
              }}
              className="absolute right-4 top-4 p-1 hover:bg-accent rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-1">Add Question</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Manually add a question to the bank. It's marked approved immediately, so it counts toward syllabus coverage right away.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Question</label>
                <textarea
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  rows={3}
                  placeholder="Type the question text..."
                  className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Subject</label>
                  <select
                    value={newSyllabusId}
                    onChange={(e) => setNewSyllabusId(e.target.value)}
                    disabled={loadingModalSubjects}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  >
                    {loadingModalSubjects && <option>Loading...</option>}
                    {subjectOptionsForModal.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.subject} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit</label>
                  <select
                    value={newUnitId}
                    onChange={(e) => setNewUnitId(e.target.value)}
                    disabled={loadingModalUnits || unitOptionsForModal.length === 0}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  >
                    {loadingModalUnits && <option>Loading...</option>}
                    {!loadingModalUnits && unitOptionsForModal.length === 0 && <option>No units available</option>}
                    {unitOptionsForModal.map((u) => (
                      <option key={u.id} value={u.id}>
                        Unit {u.unit_number}: {u.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Question Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {questionTypes.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bloom's Level</label>
                  <select
                    value={newBloom}
                    onChange={(e) => setNewBloom(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {bloomLevels.map((level) => (
                      <option key={level}>{level}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Difficulty</label>
                  <div className="grid grid-cols-3 gap-2">
                    {difficultyLevels.map((level) => (
                      <button
                        key={level}
                        onClick={() => setNewDifficulty(level)}
                        className={`py-2 rounded-xl text-sm transition-all ${
                          newDifficulty === level ? "bg-primary text-primary-foreground" : "bg-accent hover:bg-accent/80"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Marks</label>
                  <input
                    type="number"
                    value={newMarks}
                    onChange={(e) => setNewMarks(parseInt(e.target.value) || 1)}
                    min="1"
                    max="20"
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {addModalError && (
                <div className="p-3 bg-red-500/10 text-red-600 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{addModalError}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetAddModal();
                }}
                className="px-4 py-2 bg-accent text-accent-foreground rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleAddQuestion}
                disabled={savingNewQuestion}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-50"
              >
                {savingNewQuestion ? "Saving..." : "Add Question"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}