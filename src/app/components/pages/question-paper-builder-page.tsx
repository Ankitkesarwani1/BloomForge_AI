import { useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  FileText,
  Plus,
  GripVertical,
  Trash2,
  Eye,
  Download,
  Settings,
  Sparkles,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface Question {
  id: number;
  text: string;
  marks: number;
  bloomLevel: string;
  difficulty: string;
  unit: string;
}

const sampleQuestions: Question[] = [
  {
    id: 1,
    text: "Define data structure and explain its importance in computer science.",
    marks: 5,
    bloomLevel: "Remember",
    difficulty: "Easy",
    unit: "Unit 1",
  },
  {
    id: 2,
    text: "Implement a stack using arrays and demonstrate push and pop operations.",
    marks: 10,
    bloomLevel: "Apply",
    difficulty: "Medium",
    unit: "Unit 2",
  },
  {
    id: 3,
    text: "Analyze the time complexity of QuickSort algorithm in best, average, and worst cases.",
    marks: 15,
    bloomLevel: "Analyze",
    difficulty: "Hard",
    unit: "Unit 3",
  },
];

interface DraggableQuestionProps {
  question: Question;
  index: number;
  sectionId: string;
  moveQuestion: (dragIndex: number, hoverIndex: number, sectionId: string) => void;
  removeQuestion: (id: number, sectionId: string) => void;
}

function DraggableQuestion({
  question,
  index,
  sectionId,
  moveQuestion,
  removeQuestion,
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

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`bg-card border border-border rounded-xl p-4 mb-3 cursor-move hover:shadow-md transition-shadow ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <GripVertical className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <p className="flex-1">{question.text}</p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="px-2 py-1 bg-primary/10 text-primary rounded-lg font-semibold">
                {question.marks} marks
              </span>
              <button
                onClick={() => removeQuestion(question.id, sectionId)}
                className="p-1 hover:bg-destructive/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs px-2 py-1 bg-secondary/10 text-secondary rounded-full">
              {question.bloomLevel}
            </span>
            <span className="text-xs px-2 py-1 bg-accent/10 text-accent rounded-full">
              {question.difficulty}
            </span>
            <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
              {question.unit}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function QuestionPaperBuilderPage() {
  const [sections, setSections] = useState({
    sectionA: [] as Question[],
    sectionB: [] as Question[],
    sectionC: [] as Question[],
  });

  const [paperDetails, setPaperDetails] = useState({
    title: "Mid-Term Examination",
    subject: "Data Structures",
    duration: "3 hours",
    totalMarks: 100,
  });

  const moveQuestion = (dragIndex: number, hoverIndex: number, sectionId: string) => {
    setSections((prev) => {
      const section = [...prev[sectionId as keyof typeof prev]];
      const draggedItem = section[dragIndex];
      section.splice(dragIndex, 1);
      section.splice(hoverIndex, 0, draggedItem);
      return { ...prev, [sectionId]: section };
    });
  };

  const removeQuestion = (id: number, sectionId: string) => {
    setSections((prev) => ({
      ...prev,
      [sectionId]: prev[sectionId as keyof typeof prev].filter((q) => q.id !== id),
    }));
  };

  const addQuestion = (sectionId: string) => {
    const newQuestion: Question = {
      id: Date.now(),
      text: "New question - Click to edit",
      marks: 5,
      bloomLevel: "Remember",
      difficulty: "Easy",
      unit: "Unit 1",
    };
    setSections((prev) => ({
      ...prev,
      [sectionId]: [...prev[sectionId as keyof typeof prev], newQuestion],
    }));
  };

  const calculateTotalMarks = () => {
    return Object.values(sections)
      .flat()
      .reduce((sum, q) => sum + q.marks, 0);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Question Paper Builder</h1>
            <p className="text-muted-foreground mt-1">
              Drag and drop questions to build your exam paper
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

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
                    onChange={(e) =>
                      setPaperDetails({ ...paperDetails, title: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block mb-2">Subject</label>
                  <Input
                    value={paperDetails.subject}
                    onChange={(e) =>
                      setPaperDetails({ ...paperDetails, subject: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block mb-2">Duration</label>
                  <Input
                    value={paperDetails.duration}
                    onChange={(e) =>
                      setPaperDetails({ ...paperDetails, duration: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block mb-2">Instructions</label>
                  <Textarea
                    placeholder="Enter exam instructions..."
                    rows={4}
                  />
                </div>

                {/* Stats */}
                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Questions</span>
                    <span className="font-semibold">
                      {Object.values(sections).flat().length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Marks</span>
                    <span className="font-semibold text-primary">{calculateTotalMarks()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Section A</span>
                    <span className="font-semibold">{sections.sectionA.length} questions</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Section B</span>
                    <span className="font-semibold">{sections.sectionB.length} questions</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Section C</span>
                    <span className="font-semibold">{sections.sectionC.length} questions</span>
                  </div>
                </div>

                {/* AI Suggestions */}
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-warning" />
                    <h3 className="font-semibold">AI Suggestions</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      • Add 2 more questions to Section A
                    </p>
                    <p className="text-muted-foreground">
                      • Balance Bloom's taxonomy levels
                    </p>
                    <p className="text-muted-foreground">
                      • Include one case study question
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Question Sections */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section A */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">Section A: Short Answer</h2>
                  <p className="text-sm text-muted-foreground">
                    {sections.sectionA.reduce((sum, q) => sum + q.marks, 0)} marks
                  </p>
                </div>
                <Button onClick={() => addQuestion("sectionA")} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </div>
              <div className="min-h-[100px]">
                {sections.sectionA.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No questions added. Click "Add Question" to start.</p>
                  </div>
                ) : (
                  sections.sectionA.map((question, index) => (
                    <DraggableQuestion
                      key={question.id}
                      question={question}
                      index={index}
                      sectionId="sectionA"
                      moveQuestion={moveQuestion}
                      removeQuestion={removeQuestion}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Section B */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">Section B: Long Answer</h2>
                  <p className="text-sm text-muted-foreground">
                    {sections.sectionB.reduce((sum, q) => sum + q.marks, 0)} marks
                  </p>
                </div>
                <Button onClick={() => addQuestion("sectionB")} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </div>
              <div className="min-h-[100px]">
                {sections.sectionB.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No questions added. Click "Add Question" to start.</p>
                  </div>
                ) : (
                  sections.sectionB.map((question, index) => (
                    <DraggableQuestion
                      key={question.id}
                      question={question}
                      index={index}
                      sectionId="sectionB"
                      moveQuestion={moveQuestion}
                      removeQuestion={removeQuestion}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Section C */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">Section C: Case Study / Application</h2>
                  <p className="text-sm text-muted-foreground">
                    {sections.sectionC.reduce((sum, q) => sum + q.marks, 0)} marks
                  </p>
                </div>
                <Button onClick={() => addQuestion("sectionC")} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </div>
              <div className="min-h-[100px]">
                {sections.sectionC.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No questions added. Click "Add Question" to start.</p>
                  </div>
                ) : (
                  sections.sectionC.map((question, index) => (
                    <DraggableQuestion
                      key={question.id}
                      question={question}
                      index={index}
                      sectionId="sectionC"
                      moveQuestion={moveQuestion}
                      removeQuestion={removeQuestion}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
