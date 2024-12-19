# deaf_dashboard/api/learning_hub/tasks.py
from celery import shared_task
from .utils.pdf_processor import extract_text_from_pdf
from .utils.summarize import generate_summary_from_text
from .utils.mcq_generator import generate_mcqs_from_text
from .utils.flashcards import generate_flashcards_from_text

@shared_task
def process_pdf_task(file_path, request_type):
    """
    Asynchronously processes the PDF and generates the requested content.

    Args:
    file_path (str): Path to the uploaded PDF.
    request_type (str): The type of content to generate ('summary', 'mcqs', or 'flashcards').

    Returns:
    dict or str: The generated content based on the request.
    """
    # Extract text from the PDF
    text = extract_text_from_pdf(file_path)

    if not text:
        return {"error": "Unable to extract text from the PDF"}

    # Handle the request dynamically
    if request_type == 'summary':
        result = generate_summary_from_text(text)
    elif request_type == 'mcqs':
        result = generate_mcqs_from_text(text)
    elif request_type == 'flashcards':
        result = generate_flashcards_from_text(text)
    else:
        return {"error": "Invalid request type"}

    return {request_type: result}
