import { useState } from "react";
import {
  Key,
  Download,
  Sparkles,
  FileText,
  CheckCircle,
  Clock,
  BookOpen,
  Edit,
} from "lucide-react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Progress } from "../ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

const sampleQuestions = [
  {
    id: 1,
    question: "Define data structure and explain its importance in computer science.",
    marks: 5,
    modelAnswer:
      "A data structure is a specialized format for organizing, processing, storing, and retrieving data. It's fundamental in computer science because: 1) Enables efficient data management, 2) Improves algorithm performance, 3) Facilitates code reusability, 4) Provides abstract data types.",
    markingScheme: [
      { point: "Correct definition", marks: 2 },
      { point: "Mention of at least 3 importance points", marks: 2 },
      { point: "Clear explanation", marks: 1 },
    ],
    rubric: "Full marks for complete definition with 3+ valid points. Deduct 1 mark for each missing component.",
  },
  {
    id: 2,
    question: "Implement a stack using arrays and demonstrate push and pop operations.",
    marks: 10,
    modelAnswer:
      "Stack implementation using array:\n\nclass Stack {\n  constructor() {\n    this.items = [];\n    this.top = -1;\n  }\n  \n  push(element) {\n    this.top++;\n    this.items[this.top] = element;\n  }\n  \n  pop() {\n    if (this.top === -1) return null;\n    const item = this.items[this.top];\n    this.top--;\n    return item;\n  }\n}\n\nDemonstration:\nconst stack = new Stack();\nstack.push(10); // [10]\nstack.push(20); // [10, 20]\nstack.pop(); // returns 20, stack: [10]",
    markingScheme: [
      { point: "Correct class structure", marks: 2 },
      { point: "Push operation implementation", marks: 3 },
      { point: "Pop operation implementation", marks: 3 },
      { point: "Demonstration with examples", marks: 2 },
    ],
    rubric: "Award marks for correct logic even if syntax varies. Deduct 1 mark for missing edge case handling.",
  },
  {
    id: 3,
    question:
      "Analyze the time complexity of QuickSort algorithm in best, average, and worst cases.",
    marks: 15,
    modelAnswer:
      "QuickSort Time Complexity Analysis:\n\nBest Case - O(n log n):\nOccurs when pivot divides array into two equal halves consistently. Recursion depth is log n with n comparisons at each level.\n\nAverage Case - O(n log n):\nExpected performance with random pivot selection. Balanced partitioning leads to logarithmic recursion depth.\n\nWorst Case - O(n²):\nOccurs when pivot is always smallest/largest element, creating highly unbalanced partitions. Recursion depth becomes n with n comparisons.\n\nSpace Complexity: O(log n) for recursion stack in average case, O(n) in worst case.",
    markingScheme: [
      { point: "Best case analysis with explanation", marks: 4 },
      { point: "Average case analysis with explanation", marks: 4 },
      { point: "Worst case analysis with explanation", marks: 4 },
      { point: "Space complexity mention", marks: 2 },
      { point: "Mathematical notation and clarity", marks: 1 },
    ],
    rubric: "Full marks require complete analysis of all three cases with proper Big-O notation. Award partial marks for incomplete explanations.",
  },
];

export function AnswerKeyGeneratorPage() {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedQuestion, setSelectedQuestion] = useState(sampleQuestions[0]);

  const generateAnswerKey = () => {
    setGenerating(true);
    setProgress(0);
    
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setGenerating(false);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Answer Key Generator</h1>
          <p className="text-muted-foreground mt-1">
            Generate model answers, marking schemes, and rubrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={generateAnswerKey} disabled={generating}>
            <Sparkles className="w-4 h-4 mr-2" />
            {generating ? "Generating..." : "Generate All"}
          </Button>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Download Answer Key
          </Button>
        </div>
      </div>

      {/* Generation Progress */}
      {generating && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <h3 className="font-semibold">Generating Answer Key with AI...</h3>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            Processing question {Math.floor(progress / 33) + 1} of 3
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Questions</p>
              <p className="text-3xl font-bold mt-2">{sampleQuestions.length}</p>
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
              <p className="text-3xl font-bold mt-2">
                {sampleQuestions.reduce((sum, q) => sum + q.marks, 0)}
              </p>
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
              <p className="text-3xl font-bold mt-2">{sampleQuestions.length}</p>
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
              <p className="text-3xl font-bold mt-2">15m</p>
            </div>
            <div className="p-3 rounded-xl bg-accent/10">
              <Clock className="w-6 h-6 text-accent" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Questions List */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Questions</h2>
            <div className="space-y-3">
              {sampleQuestions.map((question) => (
                <button
                  key={question.id}
                  onClick={() => setSelectedQuestion(question)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedQuestion.id === question.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold mb-1">Question {question.id}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {question.question}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded-lg font-semibold text-sm">
                        {question.marks}m
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span className="text-xs text-success">Answer generated</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Answer Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Question Display */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Question {selectedQuestion.id}</h3>
                <p className="text-foreground">{selectedQuestion.question}</p>
              </div>
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg font-semibold">
                {selectedQuestion.marks} marks
              </span>
            </div>
          </div>

          {/* Tabbed Content */}
          <div className="bg-card border border-border rounded-xl p-6">
            <Tabs defaultValue="answer">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="answer">Model Answer</TabsTrigger>
                <TabsTrigger value="scheme">Marking Scheme</TabsTrigger>
                <TabsTrigger value="rubric">Rubric</TabsTrigger>
              </TabsList>

              <TabsContent value="answer" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Model Answer</h3>
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
                <div className="bg-muted rounded-xl p-4">
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {selectedQuestion.modelAnswer}
                  </pre>
                </div>
                <div className="flex items-start gap-2 p-4 bg-success/5 border border-success/20 rounded-xl">
                  <Sparkles className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-success">AI Generated</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      This answer was automatically generated based on the question and syllabus
                      context. Review and edit as needed.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="scheme" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Marking Scheme</h3>
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
                <div className="space-y-3">
                  {selectedQuestion.markingScheme.map((item, index) => (
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
              </TabsContent>

              <TabsContent value="rubric" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Evaluation Rubric</h3>
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
                <div className="bg-muted rounded-xl p-6">
                  <p className="mb-4">{selectedQuestion.rubric}</p>
                  <div className="space-y-3 mt-4 pt-4 border-t border-border">
                    <h4 className="font-semibold">Grading Guidelines:</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                        <p className="font-semibold text-success">Excellent (90-100%)</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          All points covered comprehensively
                        </p>
                      </div>
                      <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                        <p className="font-semibold text-primary">Good (70-89%)</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Most points with minor gaps
                        </p>
                      </div>
                      <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                        <p className="font-semibold text-warning">Satisfactory (50-69%)</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Basic understanding shown
                        </p>
                      </div>
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <p className="font-semibold text-destructive">Needs Improvement (&lt;50%)</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Significant gaps present
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
