import React, { useState, useEffect } from "react";
import { Upload, FileText, Search, Filter, Edit, Trash2, Eye, CheckCircle, Clock, X, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import * as pdfjsLib from "pdfjs-dist";

// Uses native bundler asset resolution
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();


interface Syllabus {
  id: string;
  subject: string;
  code: string;
  units: number;
  topics: number;
  upload_date: string;
  status: "parsing" | "parsed" | "incomplete" | "error";
  coverage: number;
  file_path: string;
  file_url: string;
}

// hours is null when the PDF's text layer had no extractable value for that module
// (e.g. continuation-page table cells) — never silently defaulted to 0.
interface ParsedTopic { topicNumber: string; content: string; }
interface ParsedUnit { unitNumber: number; title: string; hours: number | null; topics: ParsedTopic[]; }
interface ParsedSyllabus { courseObjectives: string[]; courseOutcomes: string[]; units: ParsedUnit[]; totalHours: number | null; }
interface ParseResult extends ParsedSyllabus { topics: number; hasMissingHours: boolean; parsedSuccessfully: boolean; }

// A module the parser flagged as missing hours, plus the DB unit id once stored.
interface MissingHoursUnit { id: string; unitNumber: number; title: string; hours: number | null; }

const TYPICAL_HOURS_MIN = 20;
const TYPICAL_HOURS_MAX = 80;

export function SyllabusManagementPage() {
  const [syllabiList, setSyllabiList] = useState<Syllabus[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Upload Modal States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [subject, setSubject] = useState("");
  const [code, setCode] = useState("");
  const [uploading, setUploading] = useState(false);

  // Edit Modal States
  const [editingSyllabus, setEditingSyllabus] = useState<Syllabus | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Missing Hours Modal States (Bug 2 fix)
  // allUnits holds every module for this syllabus (context for the running total);
  // missing entries within it (hours == null) are the ones the user must fill in.
  const [missingHoursSyllabusId, setMissingHoursSyllabusId] = useState<string | null>(null);
  const [missingHoursAllUnits, setMissingHoursAllUnits] = useState<MissingHoursUnit[]>([]);
  const [manualHours, setManualHours] = useState<Record<string, string>>({});
  const [savingHours, setSavingHours] = useState(false);
  const [fetchingMissingHours, setFetchingMissingHours] = useState(false);

  useEffect(() => {
    fetchSyllabi();
  }, []);

  const fetchSyllabi = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("syllabi")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching syllabi:", error);
    } else {
      setSyllabiList(data || []);
    }
    setLoading(false);
  };

  const extractPdfLines = async (file: File) => {
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const lines: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const textContent = await (await pdf.getPage(pageNumber)).getTextContent();
      const rows = new Map<number, Array<{ x: number; text: string }>>();
      for (const item of textContent.items as Array<any>) {
        if (!item.str?.trim()) continue;
        const y = Math.round(item.transform[5]);
        const rowY = [...rows.keys()].find((value) => Math.abs(value - y) <= 2) ?? y;
        const row = rows.get(rowY) ?? [];
        row.push({ x: item.transform[4], text: item.str });
        rows.set(rowY, row);
      }
      [...rows.entries()].sort(([a], [b]) => b - a).forEach(([, row]) => {
        lines.push(row.sort((a, b) => a.x - b.x).map((item) => item.text).join(" ").trim());
      });
    }
    return lines.map((line) => line.replace(/m\s*o\s*d\s*u\s*l\s*e/gi, "Module").replace(/u\s*n\s*i\s*t/gi, "Unit")).filter(Boolean);
  };

  // PDF.js's native item order is more reliable than visual rows for numbered
  // objectives/outcomes, whose number can be a separately positioned glyph.
  const extractPdfText = async (file: File) => {
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const textContent = await (await pdf.getPage(pageNumber)).getTextContent();
      pages.push((textContent.items as Array<any>).map((item) => item.str).join(" "));
    }
    return pages.join("\f").replace(/[ \t\r\n]+/g, " ");
  };

  const extractNumberedSection = (text: string, start: RegExp, end: RegExp, maxItems?: number) => {
    const startMatch = start.exec(text);
    if (!startMatch || startMatch.index === undefined) return [];
    const remaining = text.slice(startMatch.index + startMatch[0].length);
    const endMatch = end.exec(remaining);
    const section = endMatch?.index === undefined ? remaining : remaining.slice(0, endMatch.index);
    const items = [...section.matchAll(/(?:^|\s)\d+[.)]?\s+([\s\S]*?)(?=(?:\s\d+[.)]?\s+)|$)/g)]
      .map((match) => match[1].replace(/\s+/g, " ").trim())
      // The LAST item in a section has no "next number" to stop at other than
      // whatever number appears next in the document — which can be deep inside
      // an unrelated table (e.g. a Lab teaching-scheme table with no numbered
      // rows of its own until several table headers in). Objectives/outcomes are
      // always written as a single sentence, so cut at the first sentence end
      // to strip anything that leaked past the real content.
      .map((text) => text.split(/(?<=[.?!])\s+(?=[A-Z(])/)[0].trim())
      .filter(Boolean);
    return maxItems ? items.slice(0, maxItems) : items;
  };

  // Extracts curriculum records, retaining the PDF's visual lines so Hours stay paired to modules.
  const parsePdfClientSide = async (file: File): Promise<ParseResult> => {
    try {
      const lines = await extractPdfLines(file);
      const fullText = await extractPdfText(file);
      const curriculumHeader = lines.findIndex((line) => /Detailed Content/i.test(line));
      const moduleStart = curriculumHeader >= 0 ? curriculumHeader + 1 : lines.findIndex((line) => /^(?:Module\s*)?1\s+/.test(line));
      const objectives = extractNumberedSection(fullText, /Course Objectives?\s*:/i, /Course Outcomes?\s*:/i);
      // Outcomes can continue onto the next page. Stop at the Lab teaching-scheme
      // table (which sits between "Course Outcomes" and "Lab Prerequisite:" and has
      // no numbered rows of its own) or curriculum content, not at a page break, and
      // retain the standard six numbered outcomes at most.
      const outcomes = extractNumberedSection(fullText, /Course Outcomes?\s*:/i, /(?:Teaching Scheme|Credits Assigned|Lab Prerequisite|Detailed Content)/i, 6);
      const units: ParsedUnit[] = [];
      let currentUnit: ParsedUnit | null = null;
      let currentTopic: ParsedTopic | null = null;
      let pendingHours: number | null = null;
      const moduleHeading = /^(?:Module|Unit)?\s*(\d{1,2})\s+(.+?)(?:\s+(\d+(?:\.\d+)?))?\s*$/i;
      for (const line of lines.slice(moduleStart)) {
        if (/^(?:Textbooks|References|Access to software|Industry articles|Internal Assessment|Suggested Experiments)/i.test(line)) break;
        if (/^\d+(?:\.\d+)?$/.test(line)) {
          pendingHours = Number(line);
          continue;
        }
        const topic = line.match(/^(\d{1,2}\.\d{1,2})\s+(.+)$/);
        if (topic && currentUnit) {
          currentTopic = { topicNumber: topic[1], content: topic[2].trim() };
          currentUnit.topics.push(currentTopic);
          continue;
        }
        const heading = line.match(moduleHeading);
        if (heading && Number(heading[1]) === units.length + 1 && heading[2].length > 2) {
          // Genuinely missing from the text layer (e.g. continuation-page table
          // cells in some university templates) → null, never a guessed default.
          // This gets resolved by asking the user, not by fabricating a number.
          currentUnit = { unitNumber: Number(heading[1]), title: heading[2].trim(), hours: heading[3] ? Number(heading[3]) : pendingHours, topics: [] };
          units.push(currentUnit);
          pendingHours = null;
          currentTopic = null;
          continue;
        }
        if (currentTopic) currentTopic.content = `${currentTopic.content} ${line}`.replace(/\s+/g, " ").trim();
      }
      const hasMissingHours = units.some((unit) => unit.hours == null);
      const parsed: ParsedSyllabus = {
        courseObjectives: objectives,
        courseOutcomes: outcomes,
        units,
        // null (not 0) whenever any module's hours are unresolved, so the total
        // is never silently wrong while modules are still pending manual entry.
        totalHours: hasMissingHours ? null : units.reduce((total, unit) => total + (unit.hours ?? 0), 0),
      };
      const topicCount = units.reduce((total, unit) => total + unit.topics.length, 0);
      return {
        ...parsed,
        topics: topicCount,
        hasMissingHours,
        // Objectives/outcomes are optional in some approved university templates;
        // a curriculum is still valid when its module structure is complete.
        // Missing hours is NOT a parse failure — it's resolved via manual entry, not by rejecting the upload.
        parsedSuccessfully: Boolean(units.length && topicCount),
      };
    } catch (err) {
      console.error("PDF Parsing Error:", err);
      return { courseObjectives: [], courseOutcomes: [], units: [], totalHours: null, topics: 0, hasMissingHours: false, parsedSuccessfully: false };
    }
  };

  const storeStructuredContent = async (syllabusId: string, parsed: ParsedSyllabus): Promise<MissingHoursUnit[]> => {
    const { data: existingUnits, error: existingUnitsError } = await supabase.from("units").select("id").eq("syllabus_id", syllabusId);
    if (existingUnitsError) throw existingUnitsError;
    const unitIds = (existingUnits ?? []).map((unit) => unit.id);
    if (unitIds.length) {
      const { error: topicsError } = await supabase.from("topics").delete().in("unit_id", unitIds);
      if (topicsError) throw topicsError;
      const { error: unitsError } = await supabase.from("units").delete().eq("syllabus_id", syllabusId);
      if (unitsError) throw unitsError;
    }
    const insertedUnits: MissingHoursUnit[] = [];
    for (const unit of parsed.units) {
      const { data: insertedUnit, error: unitError } = await supabase.from("units")
        .insert({ syllabus_id: syllabusId, unit_number: unit.unitNumber, title: unit.title, hours: unit.hours }).select("id").single();
      if (unitError) throw unitError;
      insertedUnits.push({ id: insertedUnit.id, unitNumber: unit.unitNumber, title: unit.title, hours: unit.hours });
      if (unit.topics.length) {
        const { error: topicsError } = await supabase.from("topics").insert(unit.topics.map((topic) => ({ unit_id: insertedUnit.id, topic_number: topic.topicNumber, content: topic.content, course_objective: null })));
        if (topicsError) throw topicsError;
      }
    }
    return insertedUnits;
  };

    // Fire-and-forget: triggers embedding generation for RAG retrieval.
  // Non-blocking so the UI doesn't wait on Gemini calls; failures are logged,
  // not surfaced as upload errors, since embeddings can be regenerated later
  // and shouldn't block a successful parse from completing.
  const triggerEmbeddingGeneration = (syllabusId: string) => {
    supabase.functions
      .invoke("generate-embeddings", { body: { syllabus_id: syllabusId } })
      .then(({ data, error }) => {
        if (error) {
          console.error("Embedding generation failed:", error);
        } else {
          console.log("Embedding generation result:", data);
        }
      })
      .catch((err) => console.error("Embedding generation error:", err));
  };

  // Sums hours across all modules; null if any module's hours are still unresolved.
  const computeTotalHours = (units: MissingHoursUnit[]): number | null =>
    units.some((unit) => unit.hours == null) ? null : units.reduce((total, unit) => total + (unit.hours ?? 0), 0);

  // Opens the missing-hours modal for a syllabus, scoped to the given units.
  const openMissingHoursModal = (syllabusId: string, allUnits: MissingHoursUnit[]) => {
    setMissingHoursSyllabusId(syllabusId);
    setMissingHoursAllUnits(allUnits);
    setManualHours({});
  };

  // Fetches a syllabus's stored units from the DB — used by the "Fill Hours" action
  // on rows already marked 'incomplete', so the user can resume without re-uploading.
  const handleFillMissingHours = async (syllabus: Syllabus) => {
    setFetchingMissingHours(true);
    try {
      const { data, error } = await supabase
        .from("units")
        .select("id, unit_number, title, hours")
        .eq("syllabus_id", syllabus.id)
        .order("unit_number", { ascending: true });
      if (error) throw error;
      const units: MissingHoursUnit[] = (data ?? []).map((row) => ({ id: row.id, unitNumber: row.unit_number, title: row.title, hours: row.hours }));
      if (!units.some((unit) => unit.hours == null)) {
        alert("No modules with missing hours were found for this syllabus.");
        return;
      }
      openMissingHoursModal(syllabus.id, units);
    } catch (err: any) {
      alert(`Could not load module hours: ${err.message}`);
    } finally {
      setFetchingMissingHours(false);
    }
  };

  // Dismissing without submitting leaves the syllabus as 'incomplete' — never
  // silently writes a 0 for a module the user didn't confirm.
  const closeMissingHoursModal = () => {
    setMissingHoursSyllabusId(null);
    setMissingHoursAllUnits([]);
    setManualHours({});
  };

  const handleSubmitMissingHours = async () => {
    if (!missingHoursSyllabusId) return;
    const flaggedUnits = missingHoursAllUnits.filter((unit) => unit.hours == null);

    // Validate: every flagged module filled, and with a positive number.
    const missingEntry = flaggedUnits.find((unit) => !manualHours[unit.id]?.trim());
    if (missingEntry) {
      alert(`Please enter hours for Module ${missingEntry.unitNumber}: ${missingEntry.title}.`);
      return;
    }
    const invalidValue = flaggedUnits.find((unit) => {
      const value = Number(manualHours[unit.id]);
      return !Number.isFinite(value) || value <= 0;
    });
    if (invalidValue) {
      alert(`Hours for Module ${invalidValue.unitNumber} must be a positive number.`);
      return;
    }

    const resolvedUnits: MissingHoursUnit[] = missingHoursAllUnits.map((unit) =>
      unit.hours == null ? { ...unit, hours: Number(manualHours[unit.id]) } : unit
    );
    const total = computeTotalHours(resolvedUnits); // guaranteed non-null: all units now have hours

    setSavingHours(true);
    try {
      for (const unit of flaggedUnits) {
        const { error } = await supabase.from("units").update({ hours: Number(manualHours[unit.id]) }).eq("id", unit.id);
        if (error) throw error;
      }
      const { error: syllabusError } = await supabase
        .from("syllabi")
        .update({ total_hours: total, status: "parsed" })
        .eq("id", missingHoursSyllabusId);
      if (syllabusError) throw syllabusError;

      triggerEmbeddingGeneration(missingHoursSyllabusId);

      closeMissingHoursModal();
      fetchSyllabi();
    } catch (err: any) {
      alert(`Could not save module hours: ${err.message}`);
    } finally {
      setSavingHours(false);
    }
  };

  // Handle Upload PDF & Add Record
  const handleUploadAndParse = async () => {
    if (!selectedFile || !subject || !code) {
      alert("Please fill in subject details and upload a PDF.");
      return;
    }

    if (selectedFile.type !== "application/pdf" || !selectedFile.name.toLowerCase().endsWith(".pdf")) {
      alert("Please select a PDF file.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      alert("The PDF must be 10 MB or smaller.");
      return;
    }

    setUploading(true);

    try {
      // Parse before uploading so no record is created with zero counts.
      const parseResults = await parsePdfClientSide(selectedFile);
      if (!parseResults.parsedSuccessfully) {
        throw new Error("Could not detect module headings and numbered topics in this PDF.");
      }

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `syllabi/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('syllabi_pdfs')
        .upload(filePath, selectedFile, { contentType: "application/pdf" });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('syllabi_pdfs')
        .getPublicUrl(filePath);

      const newEntry = {
        subject,
        code,
        // Legacy counters remain populated for existing screens.
        units: parseResults.units.length,
        topics: parseResults.topics,
        upload_date: new Date().toISOString().split('T')[0],
        // 'incomplete' (never 'parsed' with a guessed total) until every module's hours are confirmed.
        status: parseResults.hasMissingHours ? 'incomplete' : 'parsed',
        coverage: 0,
        file_path: filePath,
        file_url: publicUrlData.publicUrl,
        total_hours: parseResults.totalHours,
        course_objectives: parseResults.courseObjectives,
        course_outcomes: parseResults.courseOutcomes,
      };

      const { data: createdSyllabus, error: dbError } = await supabase.from('syllabi').insert(newEntry).select('id').single();
      if (dbError) throw dbError;
      const insertedUnits = await storeStructuredContent(createdSyllabus.id, parseResults);
      if (!parseResults.hasMissingHours) 
        {
            triggerEmbeddingGeneration(createdSyllabus.id);
        }

      setSelectedFile(null);
      setSubject("");
      setCode("");
      setShowUploadModal(false);
      fetchSyllabi();

      // Some modules had no extractable hours — ask the user to fill them in
      // rather than saving a 0 or guessing a value.
      if (parseResults.hasMissingHours) {
        openMissingHoursModal(createdSyllabus.id, insertedUnits);
      }

    } catch (error: any) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Handle Viewing PDF via Temporary Signed URL
  const handleViewPdf = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('syllabi_pdfs')
        .createSignedUrl(filePath, 60);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err: any) {
      alert(`Error loading PDF preview: ${err.message}`);
    }
  };

  // Handle Save Edits (Supports Re-uploading PDF)
  const handleSaveEdit = async () => {
    if (!editingSyllabus) return;
    setSavingEdit(true);

    try {
      let updatedFilePath = editingSyllabus.file_path;
      let updatedFileUrl = editingSyllabus.file_url;
      let updatedUnits = editingSyllabus.units;
      let updatedTopics = editingSyllabus.topics;
      let parsedContent: ParseResult | null = null;

      // If user selected a new PDF to replace the old one
      if (editFile) {
        const parseResults = await parsePdfClientSide(editFile);
        if (!parseResults.parsedSuccessfully) {
          throw new Error("Could not detect module headings and numbered topics in the replacement PDF.");
        }

        // Delete old file from storage
        await supabase.storage.from('syllabi_pdfs').remove([editingSyllabus.file_path]);

        // Upload new file
        const fileExt = editFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        updatedFilePath = `syllabi/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('syllabi_pdfs')
          .upload(updatedFilePath, editFile, { contentType: "application/pdf" });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('syllabi_pdfs')
          .getPublicUrl(updatedFilePath);

        updatedFileUrl = publicUrlData.publicUrl;

        updatedUnits = parseResults.units.length;
        updatedTopics = parseResults.topics;
        parsedContent = parseResults;
      }

      // Update record in database
      const { error } = await supabase
        .from('syllabi')
        .update({
          subject: editingSyllabus.subject,
          code: editingSyllabus.code,
          units: updatedUnits,
          topics: updatedTopics,
          file_path: updatedFilePath,
          file_url: updatedFileUrl,
          // 'incomplete' (not 'parsed') when the replacement PDF still has unresolved hours.
          status: parsedContent ? (parsedContent.hasMissingHours ? 'incomplete' : 'parsed') : editingSyllabus.status,
          ...(parsedContent && {
            total_hours: parsedContent.totalHours,
            course_objectives: parsedContent.courseObjectives,
            course_outcomes: parsedContent.courseOutcomes,
          }),
        })
        .eq('id', editingSyllabus.id);

      if (error) throw error;
      const insertedUnits = parsedContent ? await storeStructuredContent(editingSyllabus.id, parsedContent) : null;

      // NEW: only re-embed if a new PDF was parsed AND it's fully parsed (not incomplete)
      if (parsedContent && !parsedContent.hasMissingHours) 
        {
          triggerEmbeddingGeneration(editingSyllabus.id);
        }

      const syllabusId = editingSyllabus.id;
      setEditingSyllabus(null);
      setEditFile(null);
      fetchSyllabi();

      if (parsedContent?.hasMissingHours && insertedUnits) {
        openMissingHoursModal(syllabusId, insertedUnits);
      }
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete Action
  const handleDelete = async (id: string, filePath: string) => {
    if (!confirm("Are you sure you want to delete this syllabus?")) return;

    await supabase.storage.from('syllabi_pdfs').remove([filePath]);
    const { error } = await supabase.from('syllabi').delete().eq('id', id);

    if (error) {
      alert("Failed to delete syllabus record.");
    } else {
      setSyllabiList(prev => prev.filter(item => item.id !== id));
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const filteredSyllabi = syllabiList.filter(s =>
    (s.subject || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.code || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Syllabus Management</h1>
          <p className="text-muted-foreground mt-1">Upload and manage course syllabi</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity"
        >
          <Upload className="w-4 h-4" />
          Upload Syllabus
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search syllabi by subject or code..."
            className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl hover:bg-accent transition-colors">
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      {/* Syllabi Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Subject</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Code</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Units</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Topics</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Upload Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Coverage</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading syllabi...
                  </td>
                </tr>
              ) : filteredSyllabi.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">
                    No syllabi uploaded yet.
                  </td>
                </tr>
              ) : (
                filteredSyllabi.map((syllabus) => (
                  <tr key={syllabus.id} className="hover:bg-accent/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="font-medium">{syllabus.subject}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{syllabus.code}</td>
                    <td className="px-6 py-4">{syllabus.units}</td>
                    <td className="px-6 py-4">{syllabus.topics}</td>
                    <td className="px-6 py-4 text-sm">{syllabus.upload_date}</td>
                    <td className="px-6 py-4">
                      {syllabus.status === "parsed" && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-500 rounded-lg text-xs font-medium">
                          <CheckCircle className="w-3 h-3" />
                          Parsed
                        </span>
                      )}
                      {syllabus.status === "parsing" && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-500 rounded-lg text-xs font-medium">
                          <Clock className="w-3 h-3" />
                          Parsing
                        </span>
                      )}
                      {syllabus.status === "error" && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-500 rounded-lg text-xs font-medium">
                          <AlertCircle className="w-3 h-3" />
                          Error
                        </span>
                      )}
                      {syllabus.status === "incomplete" && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/10 text-orange-500 rounded-lg text-xs font-medium" title="Some modules are missing hours">
                          <AlertCircle className="w-3 h-3" />
                          Missing Hours
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-2 w-20">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${syllabus.coverage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{syllabus.coverage}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {/* Preview Action */}
                        <button
                          onClick={() => handleViewPdf(syllabus.file_path)}
                          className="p-2 hover:bg-accent rounded-lg transition-colors"
                          title="View PDF"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {/* Fill Missing Hours Action (only for incomplete syllabi) */}
                        {syllabus.status === "incomplete" && (
                          <button
                            onClick={() => handleFillMissingHours(syllabus)}
                            disabled={fetchingMissingHours}
                            className="p-2 hover:bg-accent rounded-lg transition-colors text-orange-500 disabled:opacity-50"
                            title="Fill Missing Module Hours"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                        )}
                        {/* Edit Action */}
                        <button
                          onClick={() => {
                            setEditingSyllabus(syllabus);
                            setEditFile(null);
                          }}
                          className="p-2 hover:bg-accent rounded-lg transition-colors"
                          title="Edit Syllabus"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {/* Delete Action */}
                        <button
                          onClick={() => handleDelete(syllabus.id, syllabus.file_path)}
                          className="p-2 hover:bg-accent rounded-lg transition-colors text-red-500"
                          title="Delete Syllabus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6 relative">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute right-4 top-4 p-1 hover:bg-accent rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold mb-4">Upload Syllabus</h2>

            {/* Drag and Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              {selectedFile ? (
                <p className="text-md font-semibold text-primary">{selectedFile.name}</p>
              ) : (
                <>
                  <p className="text-md font-semibold mb-1">Drag and drop your syllabus file</p>
                  <p className="text-sm text-muted-foreground mb-3">or click to browse</p>
                </>
              )}
              <input
                type="file"
                accept=".pdf"
                id="fileInput"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
              />
              <label
                htmlFor="fileInput"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 cursor-pointer inline-block"
              >
                Choose File
              </label>
              <p className="text-xs text-muted-foreground mt-3">Supports PDF (Max 10MB)</p>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div>
                <label className="block text-sm font-medium mb-1">Subject Name</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Artificial Intelligence"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subject Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., NADPC43"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 bg-accent text-accent-foreground rounded-xl hover:opacity-90"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadAndParse}
                disabled={uploading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-50"
              >
                {uploading ? "Uploading & Parsing..." : "Upload & Parse"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal (Supports PDF Re-uploading) */}
      {editingSyllabus && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 relative">
            <button
              onClick={() => setEditingSyllabus(null)}
              className="absolute right-4 top-4 p-1 hover:bg-accent rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">Edit Syllabus Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <input
                  type="text"
                  value={editingSyllabus.subject}
                  onChange={(e) => setEditingSyllabus({ ...editingSyllabus, subject: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Code</label>
                <input
                  type="text"
                  value={editingSyllabus.code}
                  onChange={(e) => setEditingSyllabus({ ...editingSyllabus, code: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Units (Modules)</label>
                  <input
                    type="number"
                    value={editingSyllabus.units}
                    onChange={(e) => setEditingSyllabus({ ...editingSyllabus, units: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Topics (Sub-points)</label>
                  <input
                    type="number"
                    value={editingSyllabus.topics}
                    onChange={(e) => setEditingSyllabus({ ...editingSyllabus, topics: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Replace PDF Section */}
              <div className="pt-2 border-t border-border">
                <label className="block text-sm font-medium mb-1">Replace PDF File (Optional)</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90"
                />
                {editFile && (
                  <p className="text-xs text-green-500 mt-2 font-medium">
                    New file selected: {editFile.name} (Units & Topics will re-parse on save)
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingSyllabus(null)}
                className="px-4 py-2 bg-accent text-accent-foreground rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-50"
              >
                {savingEdit ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Missing Hours Modal (Bug 2 fix) */}
      {missingHoursSyllabusId && (() => {
        const flaggedUnits = missingHoursAllUnits.filter((unit) => unit.hours == null);
        const knownUnits = missingHoursAllUnits.filter((unit) => unit.hours != null);
        const knownTotal = knownUnits.reduce((total, unit) => total + (unit.hours ?? 0), 0);
        const manualTotal = flaggedUnits.reduce((total, unit) => total + (Number(manualHours[unit.id]) || 0), 0);
        const runningTotal = knownTotal + manualTotal;
        const allFilled = flaggedUnits.every((unit) => manualHours[unit.id]?.trim());
        const showRangeWarning = allFilled && (runningTotal < TYPICAL_HOURS_MIN || runningTotal > TYPICAL_HOURS_MAX);

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 relative">
              <button
                onClick={closeMissingHoursModal}
                className="absolute right-4 top-4 p-1 hover:bg-accent rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-bold mb-1">Missing Module Hours</h2>
              <p className="text-sm text-muted-foreground mb-4">
                These modules didn't have an extractable hours value in the PDF. Enter them manually to finish parsing.
              </p>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {flaggedUnits.map((unit) => (
                  <div key={unit.id} className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">Module {unit.unitNumber}</p>
                      <p className="text-xs text-muted-foreground">{unit.title}</p>
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={manualHours[unit.id] ?? ""}
                      onChange={(e) => setManualHours((prev) => ({ ...prev, [unit.id]: e.target.value }))}
                      placeholder="Hours"
                      className="w-24 px-3 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                ))}
                {knownUnits.length > 0 && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Already parsed (for reference)</p>
                    {knownUnits.map((unit) => (
                      <div key={unit.id} className="flex items-center justify-between text-sm text-muted-foreground py-1">
                        <span>Module {unit.unitNumber}: {unit.title}</span>
                        <span>{unit.hours}h</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <span className="text-sm font-medium">Total Teaching Hours</span>
                <span className="text-lg font-bold">{runningTotal}h</span>
              </div>

              {showRangeWarning && (
                <div className="flex items-start gap-2 mt-3 p-3 bg-amber-500/10 text-amber-600 rounded-xl text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>This total looks unusual for a typical course ({TYPICAL_HOURS_MIN}–{TYPICAL_HOURS_MAX}h). Double-check the values before saving — you can still proceed.</span>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={closeMissingHoursModal}
                  className="px-4 py-2 bg-accent text-accent-foreground rounded-xl hover:opacity-90"
                >
                  Save for Later
                </button>
                <button
                  onClick={handleSubmitMissingHours}
                  disabled={savingHours || !allFilled}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-50"
                >
                  {savingHours ? "Saving..." : "Save Hours"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}