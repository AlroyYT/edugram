import fitz  # PyMuPDF

def extract_text_from_pdf(file):
    """Extract text from a PDF file"""
    pdf = fitz.open(file)
    text = ""
    for page_num in range(pdf.page_count):
        page = pdf.load_page(page_num)
        text += page.get_text()
    return text
