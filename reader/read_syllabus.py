import pdfplumber
import re
import json

def extract_syllabus_regex(pdf_path: str):
    full_text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                full_text += text + "\n"

    # Extract Course Objectives
    objectives_match = re.search(
        r"Course Objectives:(.*?)(?=Course Outcomes:|\n\n[A-Z])", 
        full_text, re.DOTALL
    )
    objectives = []
    if objectives_match:
        raw_obj = objectives_match.group(1)
        objectives = [line.strip() for line in raw_obj.strip().split('\n') if line.strip()]

    # Extract Course Outcomes
    outcomes_match = re.search(
        r"Course Outcomes:(.*?)(?=Module|Artificial Intelligence|\n\n[A-Z])", 
        full_text, re.DOTALL
    )
    outcomes = []
    if outcomes_match:
        raw_out = outcomes_match.group(1)
        outcomes = [line.strip() for line in raw_out.strip().split('\n') if line.strip()]

    # Extract Modules
    module_pattern = r"Module\s+(\d+)[:\s]+(.*?)(?=Module\s+\d+|Textbooks:|References:|$)"
    modules_raw = re.findall(module_pattern, full_text, re.DOTALL)

    modules = []
    for mod_num, mod_content in modules_raw:
        lines = [l.strip() for l in mod_content.strip().split('\n') if l.strip()]
        title = lines[0] if lines else "Module " + mod_num
        modules.append({
            "module_number": int(mod_num),
            "module_title": title,
            "raw_content": "\n".join(lines[1:])
        })

    return {
        "course_objectives": objectives,
        "course_outcomes": outcomes,
        "modules": modules
    }

# Run offline extraction
data = extract_syllabus_regex(r"C:\Users\DELL\Desktop\Project\Blooms_AI\BloomForge_AI\reader\AI_Syllabus.pdf")
print(json.dumps(data, indent=2))