import fitz  # PyMuPDF for PDF processing
from transformers import pipeline

def extract_text_from_pdf(pdf_path):
    """Extracts text from a PDF file."""
    text = ""
    pdf_document = fitz.open(pdf_path)
    for page in pdf_document:
        text += page.get_text()
    pdf_document.close()
    return text

def generate_mcqs(text, num_questions=5):
    """
    Generates MCQs using Hugging Face's question-generation pipeline.
    """
    question_pipeline = pipeline("text2text-generation", model="t5-small")

    mcqs = []
    for i in range(num_questions):
        question_response = question_pipeline(f"Generate MCQ question: {text}", max_length=50)
        question = question_response[0]['generated_text']

        # Dummy Options (For demonstration purposes)
        options = [f"Option {chr(65+i)}" for i in range(4)]
        correct_option = options[0]

        mcqs.append({
            "question": question,
            "options": options,
            "answer": correct_option
        })

    return mcqs
