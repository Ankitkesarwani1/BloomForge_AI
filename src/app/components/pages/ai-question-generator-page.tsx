import { useState } from "react";
import { Sparkles, RefreshCw, Save, Copy, Download } from "lucide-react";
import { motion } from "motion/react";

const bloomLevels = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"];
const questionTypes = ["MCQ", "Short Answer", "Long Answer", "Numerical", "Case Study", "Application Based", "Analytical"];
const difficultyLevels = ["Easy", "Medium", "Hard"];

const sampleQuestions = [
  {
    id: 1,
    question: "Explain the difference between stack and queue data structures with suitable examples.",
    type: "Short Answer",
    bloom: "Understand",
    marks: 5,
    difficulty: "Medium",
  },
  {
    id: 2,
    question: "Implement a function to reverse a linked list using iterative approach.",
    type: "Long Answer",
    bloom: "Apply",
    marks: 10,
    difficulty: "Hard",
  },
  {
    id: 3,
    question: "What is the time complexity of binary search algorithm?",
    type: "MCQ",
    bloom: "Remember",
    marks: 2,
    difficulty: "Easy",
  },
];
export function AIQuestionGeneratorPage() {
  // TODO: invoke supabase function inside handlers/effects (never at module top-level)

  // Example (wire when form values exist):
  // const handleGenerate = async () => {
  //   const { data, error } = await supabase.functions.invoke("generate-questions", {
  //     body: { subject, unit, topics, bloomLevel, difficulty, questionType, count, marks },
  //   });
  //   if (error) throw error;
  //   setQuestions(data?.questions ?? sampleQuestions);
  // };


  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState(sampleQuestions);
  const [selectedSubject, setSelectedSubject] = useState("Data Structures");
  const [selectedUnit, setSelectedUnit] = useState("Unit 1");
  const [selectedBloom, setSelectedBloom] = useState("Apply");
  const [selectedType, setSelectedType] = useState("Short Answer");
  const [selectedDifficulty, setSelectedDifficulty] = useState("Medium");
  const [numQuestions, setNumQuestions] = useState(3);
  const [marks, setMarks] = useState(5);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      // In real app, would call AI API here
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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

            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm">Subject</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option>Data Structures</option>
                  <option>Machine Learning</option>
                  <option>Operating Systems</option>
                  <option>Database Management</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm">Unit</label>
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option>Unit 1</option>
                  <option>Unit 2</option>
                  <option>Unit 3</option>
                  <option>Unit 4</option>
                  <option>Unit 5</option>
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
                  onChange={(e) => setNumQuestions(parseInt(e.target.value))}
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
                  onChange={(e) => setMarks(parseInt(e.target.value))}
                  min="1"
                  max="20"
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating}
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
                <button className="p-2 hover:bg-accent rounded-lg transition-colors" title="Regenerate">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-accent rounded-lg transition-colors" title="Download">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {questions.map((q, index) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-border rounded-xl p-4 hover:border-primary/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-primary">Q{index + 1}</span>
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                          {q.type}
                        </span>
                        <span className="px-2 py-0.5 bg-secondary/10 text-secondary rounded text-xs">
                          {q.bloom}
                        </span>
                        <span className="px-2 py-0.5 bg-accent/10 text-accent rounded text-xs">
                          {q.difficulty}
                        </span>
                        <span className="ml-auto font-semibold">{q.marks} marks</span>
                      </div>
                      <p className="text-foreground mb-3">{q.question}</p>
                      <div className="flex gap-2">
                        <button className="flex items-center gap-1 px-3 py-1 bg-accent hover:bg-accent/80 rounded-lg text-xs transition-colors">
                          <Copy className="w-3 h-3" />
                          Copy
                        </button>
                        <button className="flex items-center gap-1 px-3 py-1 bg-primary hover:opacity-90 text-primary-foreground rounded-lg text-xs transition-opacity">
                          <Save className="w-3 h-3" />
                          Save to Bank
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* AI Suggestion Box */}
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">AI Suggestion</h3>
                <p className="text-sm text-muted-foreground">
                  Consider adding more "Analyze" and "Evaluate" level questions to balance your Bloom's taxonomy distribution. Current coverage for Unit 1 is 85%.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
