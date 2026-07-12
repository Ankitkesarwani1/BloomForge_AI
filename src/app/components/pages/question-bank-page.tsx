import { useState } from "react";
import { Plus, Search, Filter, Edit, Trash2, Copy, Tag } from "lucide-react";

const questions = [
  {
    id: 1,
    question: "Explain the difference between stack and queue data structures.",
    subject: "Data Structures",
    unit: "Unit 1",
    type: "Short Answer",
    bloom: "Understand",
    difficulty: "Medium",
    marks: 5,
    tags: ["fundamentals", "linear-structures"],
  },
  {
    id: 2,
    question: "Write a program to implement binary search tree insertion.",
    subject: "Data Structures",
    unit: "Unit 3",
    type: "Long Answer",
    bloom: "Apply",
    difficulty: "Hard",
    marks: 10,
    tags: ["trees", "programming"],
  },
  {
    id: 3,
    question: "What is the time complexity of merge sort?",
    subject: "Data Structures",
    unit: "Unit 2",
    type: "MCQ",
    bloom: "Remember",
    difficulty: "Easy",
    marks: 2,
    tags: ["sorting", "complexity"],
  },
  {
    id: 4,
    question: "Analyze the performance of different sorting algorithms.",
    subject: "Data Structures",
    unit: "Unit 2",
    type: "Analytical",
    bloom: "Analyze",
    difficulty: "Hard",
    marks: 8,
    tags: ["sorting", "analysis"],
  },
];

export function QuestionBankPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [selectedBloom, setSelectedBloom] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Question Bank</h1>
          <p className="text-muted-foreground mt-1">Manage and organize your question repository</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add Question
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Total Questions</p>
          <p className="text-2xl font-bold mt-1">1,247</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">AI Generated</p>
          <p className="text-2xl font-bold mt-1">892</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Manually Added</p>
          <p className="text-2xl font-bold mt-1">355</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">Pending Review</p>
          <p className="text-2xl font-bold mt-1">42</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search questions..."
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select className="px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">All Subjects</option>
            <option>Data Structures</option>
            <option>Machine Learning</option>
            <option>Operating Systems</option>
          </select>
          <select
            value={selectedBloom || ""}
            onChange={(e) => setSelectedBloom(e.target.value || null)}
            className="px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Bloom Levels</option>
            <option>Remember</option>
            <option>Understand</option>
            <option>Apply</option>
            <option>Analyze</option>
            <option>Evaluate</option>
            <option>Create</option>
          </select>
          <select
            value={selectedDifficulty || ""}
            onChange={(e) => setSelectedDifficulty(e.target.value || null)}
            className="px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Difficulties</option>
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </select>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {questions.map((q) => (
          <div key={q.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-all">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-semibold">
                    {q.subject}
                  </span>
                  <span className="px-2 py-0.5 bg-secondary/10 text-secondary rounded text-xs">
                    {q.unit}
                  </span>
                  <span className="px-2 py-0.5 bg-accent/10 text-accent rounded text-xs">
                    {q.type}
                  </span>
                  <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs">
                    {q.bloom}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    q.difficulty === "Easy" ? "bg-success/10 text-success" :
                    q.difficulty === "Medium" ? "bg-warning/10 text-warning" :
                    "bg-destructive/10 text-destructive"
                  }`}>
                    {q.difficulty}
                  </span>
                  <span className="ml-auto font-semibold">{q.marks} marks</span>
                </div>
                <p className="text-foreground mb-2">{q.question}</p>
                <div className="flex items-center gap-2">
                  <Tag className="w-3 h-3 text-muted-foreground" />
                  <div className="flex gap-1 flex-wrap">
                    {q.tags.map((tag, index) => (
                      <span key={index} className="text-xs text-muted-foreground">
                        {tag}
                        {index < q.tags.length - 1 && ", "}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button className="p-2 hover:bg-accent rounded-lg transition-colors" title="Copy">
                  <Copy className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-accent rounded-lg transition-colors" title="Edit">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-accent rounded-lg transition-colors text-destructive" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Showing 1-4 of 1,247 questions</p>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-card border border-border rounded-xl hover:bg-accent transition-colors">
            Previous
          </button>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-xl">1</button>
          <button className="px-4 py-2 bg-card border border-border rounded-xl hover:bg-accent transition-colors">2</button>
          <button className="px-4 py-2 bg-card border border-border rounded-xl hover:bg-accent transition-colors">3</button>
          <button className="px-4 py-2 bg-card border border-border rounded-xl hover:bg-accent transition-colors">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
