import { useEffect, useState } from "react";
import { Sparkles, RefreshCw, Save, Copy, Download, Check, AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import { supabase } from "../../lib/supabase";

const bloomLevels = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"];
const questionTypes = ["MCQ", "Short Answer", "Long Answer", "Numerical", "Case Study", "Application Based", "Analytical"];
const difficultyLevels = ["Easy", "Medium", "Hard"];

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

interface Subject { id: string; subject: string; code: string; }
interface UnitOption { id: string; unit_number: number; title: string; }
interface GeneratedQuestion {
  localId: number;
  question: string;
  type: string;
  bloom: string;
  difficulty: string;
  marks: number;
  options?: string[];
  correct_answer?: string;
}

export function AIQuestionGeneratorPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingUnits, setLoadingUnits] = useState(false);

  const [selectedSyllabusId, setSelectedSyllabusId] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedBloom, setSelectedBloom] = useState("Apply");
  const [selectedType, setSelectedType] = useState("Short Answer");
  const [selectedDifficulty, setSelectedDifficulty] = useState("Medium");
  const [numQuestions, setNumQuestions] = useState(3);
  const [marks, setMarks] = useState(5);

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);

  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Load subjects (only fully-parsed syllabi have embeddings available)
  useEffect(() => {
    const loadSubjects = async () => {
      setLoadingSubjects(true);
      const { data, error } = await supabase
        .from("syllabi")
        .select("id, subject, code")
        .eq("status", "parsed")
        .order("subject", { ascending: true });

      if (error) {
        console.error("Error loading subjects:", error);
      } else if (data && data.length > 0) {
        setSubjects(data);
        setSelectedSyllabusId(data[0].id);
      }
      setLoadingSubjects(false);
    };
    loadSubjects();
  }, []);

  // Load units whenever the selected subject changes
  useEffect(() => {
    if (!selectedSyllabusId) {
      setUnits([]);
      setSelectedUnitId("");
      return;
    }
    const loadUnits = async () => {
      setLoadingUnits(true);
      const { data, error } = await supabase
        .from("units")
        .select("id, unit_number, title")
        .eq("syllabus_id", selectedSyllabusId)
        .order("unit_number", { ascending: true });

      if (error) {
        console.error("Error loading units:", error);
        setUnits([]);
      } else {
        setUnits(data ?? []);
        setSelectedUnitId(data && data.length > 0 ? data[0].id : "");
      }
      setLoadingUnits(false);
    };
    loadUnits();
  }, [selectedSyllabusId]);

  const handleGenerate = async () => {
    if (!selectedSyllabusId || !selectedUnitId) {
      setGenError("Select a subject and unit first.");
      return;
    }
    setGenerating(true);
    setGenError(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-questions", {
        body: {
          syllabus_id: selectedSyllabusId,
          unit_id: selectedUnitId,
          bloom_level: selectedBloom,
          question_type: selectedType,
          difficulty: selectedDifficulty,
          count: numQuestions,
          marks: marks,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const generated: GeneratedQuestion[] = (data?.questions ?? []).map((q: any, i: number) => ({
        localId: Date.now() + i,
        question: q.question,
        type: q.type ?? selectedType,
        bloom: q.bloom ?? selectedBloom,
        difficulty: q.difficulty ?? selectedDifficulty,
        marks: q.marks ?? marks,
        options: q.options,
        correct_answer: q.correct_answer,
      }));

      setQuestions(generated);
      setSavedIds(new Set());
    } catch (err: any) {
      console.error("Generation failed:", err);
      setGenError(err.message ?? "Failed to generate questions. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveToBank = async (q: GeneratedQuestion) => {
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) throw new Error("You must be signed in to save questions.");

      const { error } = await supabase.from("questions").insert({
        subject_id: selectedSyllabusId,
        unit_id: selectedUnitId,
        topic_id: null,
        question_text: q.question,
        question_type: questionTypeToEnum[q.type] ?? "short_answer",
        difficulty: difficultyToEnum[q.difficulty] ?? "medium",
        bloom_level: bloomToEnum[q.bloom] ?? "understand",
        marks: q.marks,
        source: "ai_generated",
        approved: false,
        created_by: userData.user.id,
      });

      if (error) throw error;
      setSavedIds((prev) => new Set(prev).add(q.localId));
    } catch (err: any) {
      alert(`Could not save question: ${err.message}`);
    }
  };

  const handleCopy = async (q: GeneratedQuestion) => {
    await navigator.clipboard.writeText(q.question);
    setCopiedId(q.localId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDownload = () => {
    if (questions.length === 0) return;
    const text = questions
      .map(
        (q, i) =>
          `Q${i + 1}. [${q.type} | ${q.bloom} | ${q.difficulty} | ${q.marks} marks]\n${q.question}` +
          (q.options ? `\nOptions: ${q.options.join(", ")}\nAnswer: ${q.correct_answer}` : "")
      )
      .join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "generated-questions.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Derived (real) insight: which Bloom levels are missing from the current batch —
  // not a hardcoded stat, computed from whatever was actually generated.
  const bloomGap = (() => {
    if (questions.length === 0) return null;
    const present = new Set(questions.map((q) => q.bloom));
    const missing = bloomLevels.filter((level) => !present.has(level));
    if (missing.length === 0) return null;
    return missing.join(", ");
  })();

  const noSubjects = !loadingSubjects && subjects.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Question Generator</h1>
        <p className="text-muted-foreground mt-1">Generate questions using AI based on syllabus and Bloom's taxonomy</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Generation Settings
            </h2>

            {noSubjects && (
              <div className="mb-4 p-3 bg-amber-500/10 text-amber-600 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>No parsed syllabi found. Upload and fully parse a syllabus in Syllabus Management first.</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm">Subject</label>
                <select
                  value={selectedSyllabusId}
                  onChange={(e) => setSelectedSyllabusId(e.target.value)}
                  disabled={loadingSubjects || noSubjects}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                >
                  {loadingSubjects && <option>Loading subjects...</option>}
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.subject} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm">Unit</label>
                <select
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(e.target.value)}
                  disabled={loadingUnits || units.length === 0}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                >
                  {loadingUnits && <option>Loading units...</option>}
                  {!loadingUnits && units.length === 0 && <option>No units available</option>}
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      Unit {u.unit_number}: {u.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm">Bloom's Level</label>
                <select
                  value={selectedBloom}
                  onChange={(e) => setSelectedBloom(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {bloomLevels.map((level) => (
                    <option key={level}>{level}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm">Question Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {questionTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm">Difficulty</label>
                <div className="grid grid-cols-3 gap-2">
                  {difficultyLevels.map((level) => (
                    <button
                      key={level}
                      onClick={() => setSelectedDifficulty(level)}
                      className={`py-2 rounded-xl text-sm transition-all ${
                        selectedDifficulty === level
                          ? "bg-primary text-primary-foreground"
                          : "bg-accent hover:bg-accent/80"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm">Number of Questions</label>
                <input
                  type="number"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(parseInt(e.target.value) || 1)}
                  min="1"
                  max="20"
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm">Marks per Question</label>
                <input
                  type="number"
                  value={marks}
                  onChange={(e) => setMarks(parseInt(e.target.value) || 1)}
                  min="1"
                  max="20"
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {genError && (
                <div className="p-3 bg-red-500/10 text-red-600 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{genError}</span>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={generating || !selectedSyllabusId || !selectedUnitId}
                className="w-full py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Questions
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Generated Questions Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Generated Questions</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleGenerate}
                  disabled={generating || !selectedUnitId}
                  className="p-2 hover:bg-accent rounded-lg transition-colors disabled:opacity-50"
                  title="Regenerate"
                >
                  <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={handleDownload}
                  disabled={questions.length === 0}
                  className="p-2 hover:bg-accent rounded-lg transition-colors disabled:opacity-50"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            {questions.length === 0 && !generating && (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Configure your settings and click "Generate Questions" to get started.
              </p>
            )}

            <div className="space-y-4">
              {questions.map((q, index) => (
                <motion.div
                  key={q.localId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-border rounded-xl p-4 hover:border-primary/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-sm font-semibold text-primary">Q{index + 1}</span>
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">{q.type}</span>
                        <span className="px-2 py-0.5 bg-secondary/10 text-secondary rounded text-xs">{q.bloom}</span>
                        <span className="px-2 py-0.5 bg-accent/10 text-accent rounded text-xs">{q.difficulty}</span>
                        <span className="ml-auto font-semibold">{q.marks} marks</span>
                      </div>
                      <p className="text-foreground mb-3">{q.question}</p>

                      {q.options && (
                        <ul className="mb-3 space-y-1 text-sm text-muted-foreground">
                          {q.options.map((opt, i) => (
                            <li key={i}>
                              {String.fromCharCode(65 + i)}. {opt}
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCopy(q)}
                          className="flex items-center gap-1 px-3 py-1 bg-accent hover:bg-accent/80 rounded-lg text-xs transition-colors"
                        >
                          {copiedId === q.localId ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedId === q.localId ? "Copied" : "Copy"}
                        </button>
                        <button
                          onClick={() => handleSaveToBank(q)}
                          disabled={savedIds.has(q.localId)}
                          className="flex items-center gap-1 px-3 py-1 bg-primary hover:opacity-90 text-primary-foreground rounded-lg text-xs transition-opacity disabled:opacity-50"
                        >
                          {savedIds.has(q.localId) ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                          {savedIds.has(q.localId) ? "Saved" : "Save to Bank"}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {bloomGap && (
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-1">AI Suggestion</h3>
                  <p className="text-sm text-muted-foreground">
                    This batch has no "{bloomGap}" level question(s). Consider generating another batch at those levels for a more balanced Bloom's taxonomy distribution.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}