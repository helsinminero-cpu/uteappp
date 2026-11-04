#!/usr/bin/env python3
"""
Internal Python conversion worker:
Converts DOCX to PDF using headless LibreOffice Writer with native PDF export filter,
strictly preserving header images, margins, tables, and original page breaks.
Guarantees automatic cleanup of all temporary .docx files, user profiles, and intermediate artifacts.
"""

import os
import sys
import tempfile
import subprocess
import shutil
import json

def apply_tags_if_needed(docx_path, tags_json_path):
    """
    If tags_json_path is provided and python-docx is installed,
    performs tag replacement preserving paragraph styling and runs.
    """
    if not tags_json_path or not os.path.isfile(tags_json_path):
        return docx_path

    try:
        import docx
        with open(tags_json_path, 'r', encoding='utf-8') as f:
            tags = json.load(f)

        if not tags:
            return docx_path

        doc = docx.Document(docx_path)

        def replace_in_paragraphs(paragraphs):
            for p in paragraphs:
                for k, v in tags.items():
                    target = f"{{{k}}}"
                    target_double = f"{{{{{k}}}}}"
                    val_str = str(v)
                    if target in p.text or target_double in p.text:
                        for run in p.runs:
                            if target in run.text:
                                run.text = run.text.replace(target, val_str)
                            if target_double in run.text:
                                run.text = run.text.replace(target_double, val_str)

        # Replace in document body
        replace_in_paragraphs(doc.paragraphs)

        # Replace in tables
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    replace_in_paragraphs(cell.paragraphs)

        # Replace in headers/footers
        for section in doc.sections:
            replace_in_paragraphs(section.header.paragraphs)
            replace_in_paragraphs(section.footer.paragraphs)

        processed_path = docx_path + ".processed.docx"
        doc.save(processed_path)
        return processed_path
    except Exception as e:
        sys.stderr.write(f"Warning: Tag replacement in python skipped: {e}\n")
        return docx_path

def main():
    if len(sys.argv) < 3:
        sys.stderr.write("Usage: convert_docx_to_pdf.py <input_docx_path> <output_pdf_path> [tags_json_path]\n")
        sys.exit(1)

    input_docx_path = os.path.abspath(sys.argv[1])
    output_pdf_path = os.path.abspath(sys.argv[2])
    tags_json_path = os.path.abspath(sys.argv[3]) if len(sys.argv) > 3 else None

    if not os.path.isfile(input_docx_path):
        sys.stderr.write(f"Error: input file {input_docx_path} does not exist\n")
        sys.exit(2)

    # Use isolated temporary workspace and separate isolated user profile to avoid lock conflicts
    work_dir = tempfile.mkdtemp(prefix="utea_docx_convert_")
    user_profile_dir = tempfile.mkdtemp(prefix="lo_profile_")

    temp_docx_to_cleanup = None

    try:
        # Determine actual docx to convert
        target_docx = input_docx_path
        if tags_json_path:
            processed_docx = apply_tags_if_needed(input_docx_path, tags_json_path)
            if processed_docx != input_docx_path:
                target_docx = processed_docx
                temp_docx_to_cleanup = processed_docx

        # Copy document into isolated work directory
        isolated_input = os.path.join(work_dir, "document.docx")
        shutil.copy2(target_docx, isolated_input)

        # LibreOffice headless execution with isolated UserInstallation
        cmd = [
            "libreoffice",
            f"-env:UserInstallation=file://{user_profile_dir}",
            "--headless",
            "--norestore",
            "--nofirststartwizard",
            "--convert-to",
            "pdf:writer_pdf_Export",
            isolated_input,
            "--outdir",
            work_dir
        ]

        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=60
        )

        expected_pdf = os.path.join(work_dir, "document.pdf")
        if not os.path.isfile(expected_pdf):
            # Check if any .pdf file was generated in work_dir
            pdf_files = [f for f in os.listdir(work_dir) if f.lower().endswith(".pdf")]
            if pdf_files:
                expected_pdf = os.path.join(work_dir, pdf_files[0])
            else:
                err_msg = result.stderr.decode("utf-8", errors="ignore")
                out_msg = result.stdout.decode("utf-8", errors="ignore")
                sys.stderr.write(f"Conversion failed (exit code {result.returncode}): {err_msg} | {out_msg}\n")
                sys.exit(3)

        # Ensure parent directory for destination exists
        os.makedirs(os.path.dirname(output_pdf_path), exist_ok=True)

        # Copy generated PDF to destination
        shutil.copy2(expected_pdf, output_pdf_path)

    finally:
        # AUTOMATIC CLEANUP: Purge all temporary files, isolated workspace, and user profile
        try:
            if temp_docx_to_cleanup and os.path.isfile(temp_docx_to_cleanup):
                os.unlink(temp_docx_to_cleanup)
        except Exception:
            pass

        try:
            shutil.rmtree(work_dir, ignore_errors=True)
        except Exception:
            pass

        try:
            shutil.rmtree(user_profile_dir, ignore_errors=True)
        except Exception:
            pass

if __name__ == "__main__":
    main()
