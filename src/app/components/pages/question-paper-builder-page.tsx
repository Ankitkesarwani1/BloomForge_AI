import { useState, useEffect } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  FileText,
  Plus,
  GripVertical,
  Trash2,
  Download,
  Settings,
  Sparkles,
  Loader2,
  Edit2,
  Check,
  X
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { supabase } from "../../lib/supabase";
import html2pdf from 'html2pdf.js';

interface Question {
  id: number;
  text: string;
  marks: number;
  bloomLevel: string;
  difficulty: string;
  unit: string;
  type?: string;
}

interface PaperSection {
  id: string;
  title: string;
  defaultMarks: number;
  defaultBloom: string;
  defaultDifficulty: string;
  defaultType: string;
  questions: Question[];
}

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
            <p className="flex-1 whitespace-pre-wrap font-medium">{question.text}</p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="px-2 py-1 bg-primary/10 text-primary rounded-lg font-semibold whitespace-nowrap">
                {question.marks} marks
              </span>
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
            {question.type && (
               <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                 {question.type}
               </span>
            )}
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
  const [sections, setSections] = useState<PaperSection[]>([
    {
      id: "sectionA",
      title: "Section A: Short Answer",
      defaultMarks: 2,
      defaultBloom: "Remember",
      defaultDifficulty: "Easy",
      defaultType: "Short Answer",
      questions: []
    },
    {
      id: "sectionB",
      title: "Section B: Long Answer",
      defaultMarks: 10,
      defaultBloom: "Apply",
      defaultDifficulty: "Medium",
      defaultType: "Long Answer",
      questions: []
    },
    {
      id: "sectionC",
      title: "Section C: Case Study",
      defaultMarks: 20,
      defaultBloom: "Evaluate",
      defaultDifficulty: "Hard",
      defaultType: "Case Study",
      questions: []
    }
  ]);

  const [paperDetails, setPaperDetails] = useState({
    title: "Mid-Term Examination",
    subject: "Computer Science",
    duration: "3 hours",
    instructions: "Attempt all questions. Each section carries specific marks."
  });

  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  // --- Syllabus & AI State ---
  const [syllabi, setSyllabi] = useState<{ id: string; subject: string; code: string }[]>([]);
  const [selectedSyllabusId, setSelectedSyllabusId] = useState<string>("");
  const [units, setUnits] = useState<{ id: string; unit_number: number; title: string }[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  
  // Generating state
  const [generatingPaper, setGeneratingPaper] = useState(false);
  const [generatingSection, setGeneratingSection] = useState<string | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
  // --- Initialization ---
  useEffect(() => {
    async function init() {
      setLoadingInitial(true);
      const { data } = await supabase
        .from("syllabi")
        .select("id, subject, code")
        .eq("status", "parsed")
        .order("subject", { ascending: true });
        
      if (data && data.length > 0) {
        setSyllabi(data);
        setSelectedSyllabusId(data[0].id);
        setPaperDetails(prev => ({ ...prev, subject: data[0].subject }));
      }
      setLoadingInitial(false);
    }
    init();
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
    
    // Update paper details subject name
    const subjectName = syllabi.find(s => s.id === selectedSyllabusId)?.subject;
    if (subjectName) setPaperDetails(prev => ({ ...prev, subject: subjectName }));
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
        },
      });

      if (error || data?.error || !data?.questions?.length) {
        console.error("AI Error:", error || data?.error);
        return null;
      }

      const q = data.questions[0];
      return {
        id: Date.now() + Math.random(),
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
    setSections((prev) => prev.map(section => {
      if (section.id === sectionId) {
        const newQuestions = [...section.questions];
        const draggedItem = newQuestions[dragIndex];
        newQuestions.splice(dragIndex, 1);
        newQuestions.splice(hoverIndex, 0, draggedItem);
        return { ...section, questions: newQuestions };
      }
      return section;
    }));
  };

  const removeQuestion = (id: number, sectionId: string) => {
    setSections((prev) => prev.map(section => {
      if (section.id === sectionId) {
        return { ...section, questions: section.questions.filter((q) => q.id !== id) };
      }
      return section;
    }));
  };

  const addAIQuestion = async (sectionId: string) => {
    if (!selectedSyllabusId || units.length === 0) {
      alert("Please select a syllabus with uploaded units first.");
      return;
    }
    
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    setGeneratingSection(sectionId);
    let q: Question | null = await generateSingleQuestion(
      section.defaultType,
      section.defaultBloom,
      section.defaultMarks,
      section.defaultDifficulty
    );
    
    if (q) {
      setSections((prev) => prev.map(s => {
        if (s.id === sectionId) {
          return { ...s, questions: [...s.questions, q!] };
        }
        return s;
      }));
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
    
    const confirm = window.confirm(
      "This will replace your current paper with AI-generated questions for all sections. Proceed?"
    );
    if (!confirm) return;
    
    setGeneratingPaper(true);
    setSections((prev) => prev.map(s => ({ ...s, questions: [] }))); // Clear current
    
    try {
      const promises = sections.map(async (section) => {
        const count = section.id === "sectionA" ? 5 : (section.id === "sectionB" ? 3 : (section.id === "sectionC" ? 1 : 3));
        const qPromises = Array.from({ length: count }).map(() => generateSingleQuestion(
          section.defaultType,
          section.defaultBloom,
          section.defaultMarks,
          section.defaultDifficulty
        ));
        
        const results = await Promise.all(qPromises);
        return { id: section.id, questions: results.filter(Boolean) as Question[] };
      });
      
      const results = await Promise.all(promises);
      
      setSections((prev) => prev.map(s => {
        const generated = results.find(r => r.id === s.id);
        if (generated) {
          return { ...s, questions: generated.questions };
        }
        return s;
      }));
    } catch (e) {
      console.error(e);
      alert("An error occurred during full paper generation.");
    }
    
    setGeneratingPaper(false);
  };

  const calculateTotalMarks = () => {
    return sections.reduce((total, section) => 
      total + section.questions.reduce((sum, q) => sum + q.marks, 0)
    , 0);
  };

  // Section Management Methods
  const addNewSection = () => {
    const newId = `section_${Date.now()}`;
    setSections([...sections, {
      id: newId,
      title: "New Section",
      defaultMarks: 5,
      defaultBloom: "Understand",
      defaultDifficulty: "Medium",
      defaultType: "Short Answer",
      questions: []
    }]);
    setEditingSectionId(newId);
  };

  const updateSection = (id: string, updates: Partial<PaperSection>) => {
    setSections(sections.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteSection = (id: string) => {
    if (window.confirm("Are you sure you want to delete this section? All questions in it will be lost.")) {
      setSections(sections.filter(s => s.id !== id));
    }
  };

  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    // Give state time to render the hidden print component
    setTimeout(() => {
      const element = document.getElementById('paper-preview-for-pdf');
      if (!element) {
        setIsExportingPDF(false);
        return;
      }
      
      const opt = {
        margin:       0.5,
        filename:     `${paperDetails.title.replace(/\s+/g, '_')}_Paper.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(element).save().then(() => {
        setIsExportingPDF(false);
      });
    }, 100);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Question Paper Builder</h1>
            <p className="text-muted-foreground mt-1">
              Build your exam paper manually or use AI generation
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={selectedSyllabusId}
              onChange={(e) => setSelectedSyllabusId(e.target.value)}
              className="px-3 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary min-w-[200px]"
              disabled={loadingInitial || generatingPaper}
            >
              {loadingInitial && <option>Loading syllabi...</option>}
              {!loadingInitial && syllabi.length === 0 && <option>No parsed syllabi found</option>}
              {syllabi.map(s => (
                <option key={s.id} value={s.id}>{s.subject} ({s.code})</option>
              ))}
            </select>
            
            <Button 
              onClick={handleGenerateFullPaper}
              disabled={generatingPaper || syllabi.length === 0}
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white"
            >
              {generatingPaper ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {generatingPaper ? "Building Paper..." : "Auto-Generate Full Paper"}
            </Button>
            
            <Button variant="outline" onClick={handleExportPDF} disabled={isExportingPDF}>
              {isExportingPDF ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              {isExportingPDF ? "Exporting..." : "Export PDF"}
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
                    value={paperDetails.instructions}
                    onChange={(e) =>
                      setPaperDetails({ ...paperDetails, instructions: e.target.value })
                    }
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
                </div>

                {/* AI Suggestions */}
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-warning" />
                    <h3 className="font-semibold">AI Builder Tips</h3>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• The <b>Auto-Generate Full Paper</b> button creates questions for all sections.</p>
                    <p>• Customise section settings (marks, bloom level) to guide the AI generation.</p>
                    <p>• Drag and drop questions to rearrange them within a section.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Question Sections */}
          <div className="lg:col-span-2 space-y-6">
            
            {sections.map(section => (
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
                        <Input 
                          value={section.title} 
                          onChange={(e) => updateSection(section.id, { title: e.target.value })} 
                        />
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
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                    <div>
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        {section.title}
                        <button onClick={() => setEditingSectionId(section.id)} className="text-muted-foreground hover:text-primary transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {section.questions.reduce((sum, q) => sum + q.marks, 0)} marks total • Default: {section.defaultMarks} marks/q
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
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
                      <p>No questions. Click Generate Question to add one using AI.</p>
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

        {/* Hidden Component for PDF Export */}
        {isExportingPDF && (
          <div className="fixed left-[9999px] top-0 opacity-0 pointer-events-none">
            <div id="paper-preview-for-pdf" className="w-[800px] bg-white text-black p-10 font-serif">
              <div className="text-center mb-8 border-b-2 border-black pb-4">
                <h1 className="text-2xl font-bold uppercase mb-2">{paperDetails.title}</h1>
                <div className="flex justify-between font-semibold text-sm">
                  <span>Subject: {paperDetails.subject}</span>
                  <span>Duration: {paperDetails.duration}</span>
                  <span>Max Marks: {calculateTotalMarks()}</span>
                </div>
              </div>
              
              {paperDetails.instructions && (
                <div className="mb-6 text-sm">
                  <h3 className="font-bold underline mb-1">Instructions:</h3>
                  <p className="whitespace-pre-wrap">{paperDetails.instructions}</p>
                </div>
              )}

              {sections.map((section, sIndex) => (
                <div key={section.id} className="mb-8">
                  <div className="flex justify-between items-end border-b border-gray-300 pb-1 mb-4">
                    <h2 className="text-lg font-bold">{section.title}</h2>
                    <span className="text-sm font-semibold">({section.questions.reduce((sum, q) => sum + q.marks, 0)} Marks)</span>
                  </div>
                  
                  <div className="space-y-4">
                    {section.questions.map((question, qIndex) => (
                      <div key={question.id} className="flex gap-4">
                        <span className="font-semibold w-6 text-right">Q{qIndex + 1}.</span>
                        <p className="flex-1 whitespace-pre-wrap">{question.text}</p>
                        <span className="font-semibold whitespace-nowrap ml-4">[{question.marks}]</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              <div className="mt-12 text-center text-sm text-gray-500 border-t border-gray-200 pt-4">
                *** End of Paper ***
              </div>
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
}
