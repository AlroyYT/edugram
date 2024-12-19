import fitz  # PyMuPDF
from transformers import pipeline
import os

def extract_text_from_pdf(pdf_path):
    """
    Extract text from a PDF file using PyMuPDF.
    :param pdf_path: Path to the PDF file.
    :return: Text extracted from the PDF.
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"File not found: {pdf_path}")
    
    pdf_document = fitz.open(pdf_path)
    text = ""
    for page_num in range(pdf_document.page_count):
        page = pdf_document.load_page(page_num)
        text += page.get_text("text")  # Extract text from the page
    pdf_document.close()
    return text.strip()

def split_text_into_chunks(text, chunk_size=1024):
    """
    Split text into smaller chunks of specified size.
    :param text: The text to split.
    :param chunk_size: Maximum size of each chunk.
    :return: A list of text chunks.
    """
    return [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]

def summarize_text(text, model_name="facebook/bart-large-cnn", max_length=150, min_length=30):
    """
    Summarize the given text using a Hugging Face summarization model.
    :param text: The text to summarize.
    :param model_name: Hugging Face model to use for summarization.
    :param max_length: Maximum length of the summary.
    :param min_length: Minimum length of the summary.
    :return: The summarized text.
    """
    try:
        summarizer = pipeline("summarization", model=model_name)
        summary = summarizer(
            text,
            max_length=max_length,
            min_length=min_length,
            truncation=True
        )
        return summary[0]['summary_text']
    except Exception as e:
        return f"Error during summarization: {str(e)}"

def summarize_text_chunks(text_chunks, model_name="facebook/bart-large-cnn"):
    """
    Summarize a list of text chunks.
    :param text_chunks: List of text chunks.
    :param model_name: Hugging Face model to use for summarization.
    :return: Combined summary of all chunks.
    """
    summaries = []
    for i, chunk in enumerate(text_chunks):
        print(f"Summarizing chunk {i + 1} of {len(text_chunks)}...")
        summary = summarize_text(chunk, model_name=model_name)
        summaries.append(summary)
    return " ".join(summaries)

def summarize_pdf(pdf_path: str) -> str:
    """
    Extract text from a PDF and summarize it.
    :param pdf_path: Path to the PDF file.
    :return: A summarized version of the text extracted from the PDF.
    """
    try:
        print(f"Extracting text from: {pdf_path}")
        extracted_text = extract_text_from_pdf(pdf_path)
        if not extracted_text:
            return "No text found in the PDF."
        
        print("Splitting text into manageable chunks...")
        text_chunks = split_text_into_chunks(extracted_text)
        
        print("Summarizing the text chunks...")
        summarized_text = summarize_text_chunks(text_chunks)
        return summarized_text
    except FileNotFoundError as e:
        return str(e)
    except Exception as e:
        return f"An error occurred during summarization: {str(e)}"

if __name__ == "__main__":
    # Replace with the path to your PDF file
    pdf_path = "example.pdf"  # Example file name
    
    try:
        summary = summarize_pdf(pdf_path)
        print("\n--- Summary ---\n")
        print(summary)
    except Exception as e:
        print(f"Error: {str(e)}")
