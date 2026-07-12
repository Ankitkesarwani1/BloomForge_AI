import { useState } from "react";
import { Upload, FileText, Search, Filter, Edit, Trash2, Eye, CheckCircle, Clock } from "lucide-react";

const syllabi = [
  {
    id: 1,
    subject: "Data Structures",
    code: "CS301",
    units: 5,
    topics: 32,
    uploadDate: "2026-06-15",
    status: "parsed",
    coverage: 95,
  },
  {
    id: 2,
    subject: "Machine Learning",
    code: "CS402",
    units: 6,
    topics: 45,
    uploadDate: "2026-06-18",
    status: "parsed",
    coverage: 88,
  },
  {
    id: 3,
    subject: "Operating Systems",
    code: "CS302",
    units: 5,
    topics: 38,
    uploadDate: "2026-06-10",
    status: "parsing",
    coverage: 72,
  },
  {
    id: 4,
    subject: "Database Management",
    code: "CS303",
    units: 6,
    topics: 42,
    uploadDate: "2026-06-12",
    status: "parsed",
    coverage: 91,
  },
];

export function SyllabusManagementPage() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    // Handle file upload here
  };

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
            placeholder="Search syllabi..."
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
              {syllabi.map((syllabus) => (
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
                  <td className="px-6 py-4 text-sm">{syllabus.uploadDate}</td>
                  <td className="px-6 py-4">
                    {syllabus.status === "parsed" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-success/10 text-success rounded-lg text-xs">
                        <CheckCircle className="w-3 h-3" />
                        Parsed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-warning/10 text-warning rounded-lg text-xs">
                        <Clock className="w-3 h-3" />
                        Parsing
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
                      <button className="p-2 hover:bg-accent rounded-lg transition-colors" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-accent rounded-lg transition-colors" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-accent rounded-lg transition-colors text-destructive" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Upload Syllabus</h2>

            {/* Drag and Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-semibold mb-2">Drag and drop your syllabus file</p>
              <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90">
                Choose File
              </button>
              <p className="text-xs text-muted-foreground mt-4">Supports PDF, DOCX (Max 10MB)</p>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div>
                <label className="block mb-2">Subject Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Data Structures"
                />
              </div>
              <div>
                <label className="block mb-2">Subject Code</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., CS301"
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
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90">
                Upload & Parse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
