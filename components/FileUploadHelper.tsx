import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useFileContext } from '../context/FileContext';

// Type definition for directory handle storage
interface DirectoryHandleEntry {
  locationKey: string;
  serializedHandle: any;
  timestamp: number;
}

// Function to open IndexedDB for directory handles
const openDirectoryHandlesDB = async (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('JarvisDirectoryHandles', 1);
    
    request.onerror = (event) => {
      console.error("IndexedDB error:", event);
      reject("Couldn't open directory handles database");
    };
    
    request.onsuccess = (event) => {
      // @ts-ignore - event.target.result is the database
      resolve(event.target.result);
    };
    
    request.onupgradeneeded = (event) => {
      // @ts-ignore - event.target.result is the database
      const db = event.target.result;
      if (!db.objectStoreNames.contains('directoryHandles')) {
        db.createObjectStore('directoryHandles', { keyPath: 'locationKey' });
        console.log("Created directoryHandles object store");
      }
    };
  });
};

// Function to store a directory handle in IndexedDB
const storeDirectoryHandle = async (locationKey: string, handle: any) => {
  try {
    const db = await openDirectoryHandlesDB();
    const transaction = db.transaction('directoryHandles', 'readwrite');
    const store = transaction.objectStore('directoryHandles');
    
    // Serialize the handle
    // @ts-ignore - toJSON() not in TypeScript yet
    const serializedHandle = await handle.toJSON();
    
    store.put({
      locationKey,
      serializedHandle,
      timestamp: Date.now()
    });
    
    return new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log(`Directory handle stored for ${locationKey}`);
        resolve();
      };
      transaction.onerror = () => {
        console.error(`Failed to store directory handle for ${locationKey}`);
        reject();
      };
    });
  } catch (err) {
    console.error('Error storing directory handle:', err);
    throw err;
  }
};

// Function to get a stored directory handle from IndexedDB
const getStoredDirectoryHandle = async (locationKey: string): Promise<any> => {
  try {
    const db = await openDirectoryHandlesDB();
    const transaction = db.transaction('directoryHandles', 'readonly');
    const store = transaction.objectStore('directoryHandles');
    const request = store.get(locationKey);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = async () => {
        if (request.result) {
          try {
            // @ts-ignore - fromJSON() not in TypeScript yet
            const handle = await FileSystemHandle.fromJSON(request.result.serializedHandle);
            resolve(handle);
          } catch (err) {
            console.error(`Error deserializing handle for ${locationKey}:`, err);
            resolve(null);
          }
        } else {
          console.log(`No stored handle found for ${locationKey}`);
          resolve(null);
        }
      };
      request.onerror = () => {
        console.error(`Error retrieving handle for ${locationKey}`);
        reject(request.error);
      };
    });
  } catch (err) {
    console.error('Error getting stored directory handle:', err);
    return null;
  }
};

// Function to normalize text (remove accents)
const normalizeText = (text: string): string => {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

// Main export - a hook that provides file upload functionality
export const useFileUpload = () => {
  const { uploadedFile, setUploadedFile } = useFileContext();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastNavigatedTo, setLastNavigatedTo] = useState("");
  
  // Helper function to upload files from specific locations
  const handleNamedFileUpload = async (
    specificFile: string, 
    location: string,
    onStatusChange: (message: string) => void
  ): Promise<string> => {
    if (!specificFile || !location) {
      return "Please specify both the file name and location.";
    }
    
    setIsProcessing(true);
    onStatusChange(`Looking for "${specificFile}" in your ${location} folder...`);
    
    try {
      console.log(`Attempting to find ${specificFile} in ${location}`);
      
      // Handle special characters in the file name
      // Make sure we handle accented characters properly
      const normalizedFileName = normalizeText(specificFile);
      console.log(`Normalized file name: ${normalizedFileName}`);
      
      // Map common location phrases to storage keys and picker start points
      const locationMapping: {[key: string]: {storageKey: string, startIn: string}} = {
        'download': {storageKey: 'downloads', startIn: 'downloads'},
        'downloads': {storageKey: 'downloads', startIn: 'downloads'},
        'document': {storageKey: 'documents', startIn: 'documents'},
        'documents': {storageKey: 'documents', startIn: 'documents'},
        'desktop': {storageKey: 'desktop', startIn: 'desktop'},
        'picture': {storageKey: 'pictures', startIn: 'pictures'},
        'pictures': {storageKey: 'pictures', startIn: 'pictures'},
        'music': {storageKey: 'music', startIn: 'music'}
      };
      
      // Find the matching location key
      const locationKey = location.toLowerCase();
      const matchedLocation = Object.keys(locationMapping).find(key => locationKey.includes(key));
      
      if (!matchedLocation) {
        setIsProcessing(false);
        return `I don't recognize "${location}" as a known folder location. I can access downloads, documents, desktop, pictures, or music folders.`;
      }
      
      const { storageKey, startIn } = locationMapping[matchedLocation];
      
      // Request access to directory if File System Access API is supported
      if (!('showDirectoryPicker' in window)) {
        setIsProcessing(false);
        return "Your browser doesn't support accessing files by location. Please upload the file manually.";
      }
      
      // Try to get stored directory handle from IndexedDB
      let directoryHandle = null;
      try {
        const storedHandle = await getStoredDirectoryHandle(storageKey);
        
        if (storedHandle) {
          // Verify permission is still valid
          // @ts-ignore - queryPermission() not in TypeScript yet
          const permission = await storedHandle.queryPermission({ mode: 'read' });
          
          if (permission === 'granted') {
            console.log(`Reusing stored ${matchedLocation} directory access permission`);
            directoryHandle = storedHandle;
          } else {
            console.log('Stored permission expired, requesting again');
          }
        }
      } catch (err) {
        console.error(`Error accessing stored ${matchedLocation} directory handle:`, err);
      }
      
      // If no stored handle or permission denied, request fresh access
      if (!directoryHandle) {
        // Show a message about requesting access
        const folderName = matchedLocation.charAt(0).toUpperCase() + matchedLocation.slice(1);
        onStatusChange(`I need permission to access your ${folderName} folder. Please select it in the dialog that appears.`);
        
        try {
          // @ts-ignore - TypeScript doesn't recognize showDirectoryPicker yet
          directoryHandle = await window.showDirectoryPicker({
            id: storageKey,
            startIn: startIn
          });
          
          // Request persistent access permission
          // @ts-ignore - requestPermission() not in TypeScript yet
          const permission = await directoryHandle.requestPermission({ mode: 'read' });
          
          if (permission === 'granted') {
            // Store the directory handle in IndexedDB for future use
            await storeDirectoryHandle(storageKey, directoryHandle);
            console.log(`Directory handle for ${matchedLocation} saved for future use`);
          }
        } catch (err) {
          console.error('Failed to request directory access:', err);
          setIsProcessing(false);
          return `Failed to access your ${location} folder. This might be because you denied permission or canceled the dialog.`;
        }
      }
      
      // Try to find the file in the directory
      onStatusChange(`Searching for "${specificFile}" in your ${location} folder...`);
      
      // Check if the filename has the extension, if not add it
      const fileName = specificFile.toLowerCase().endsWith('.pdf') ? specificFile : 
                      specificFile.toLowerCase().endsWith('.docx') ? specificFile : 
                      specificFile.toLowerCase().endsWith('.txt') ? specificFile : 
                      specificFile.toLowerCase().endsWith('.pptx') ? specificFile : 
                      `${specificFile}.pdf`; // Default to PDF if no extension
      
      // Try different variations of the filename
      const possibleNames = [
        fileName,
        `${specificFile}.pdf`,
        `${specificFile}.docx`, 
        `${specificFile}.txt`,
        specificFile.toLowerCase(),
        `${specificFile.toLowerCase()}.pdf`,
        `${specificFile.toLowerCase()}.docx`,
        // Add normalized versions (without accents)
        normalizedFileName,
        `${normalizedFileName}.pdf`,
        `${normalizedFileName}.docx`,
      ];
      
      let fileFound = false;
      let file;
      
      // Get all files in the directory
      try {
        const allFiles = [];
        for await (const entry of directoryHandle.values()) {
          if (entry.kind === 'file') {
            console.log(`Found file in directory: ${entry.name}`);
            allFiles.push(entry);
          }
        }
        
        console.log(`Files in directory: ${allFiles.map(f => f.name).join(', ')}`);
        
        // Define a function to check if a file matches our search
        const fileMatches = (entryName: string, searchName: string) => {
          // Try exact match (case insensitive)
          if (entryName.toLowerCase() === searchName.toLowerCase()) {
            return true;
          }
          
          // Try normalized match (without accents)
          if (normalizeText(entryName.toLowerCase()) === normalizeText(searchName.toLowerCase())) {
            return true;
          }
          
          return false;
        };
        
        // Special case for resumé.pdf - because it's a commonly problematic file
        if (specificFile.toLowerCase() === 'resumé.pdf' || specificFile.toLowerCase() === 'resume.pdf') {
          console.log("Special handling for resumé.pdf");
          // Try both spellings with and without accent
          const resumeVariations = ['resumé.pdf', 'resume.pdf', 'Resumé.pdf', 'Resume.pdf'];
          
          for (const resumeVariant of resumeVariations) {
            console.log(`Looking for resume variant: ${resumeVariant}`);
            const matchingEntry = allFiles.find(entry => fileMatches(entry.name, resumeVariant));
            
            if (matchingEntry) {
              try {
                const fileHandle = await directoryHandle.getFileHandle(matchingEntry.name);
                file = await fileHandle.getFile();
                fileFound = true;
                console.log(`Found resume file: ${matchingEntry.name}`);
                break;
              } catch (err) {
                console.error(`Error accessing resume file ${matchingEntry.name}:`, err);
              }
            }
          }
          
          // If still not found, look for any file with "resume" in the name
          if (!fileFound) {
            console.log("Looking for any file containing 'resume'");
            const resumePartialMatch = allFiles.find(entry => 
              entry.name.toLowerCase().includes('resume') || 
              normalizeText(entry.name.toLowerCase()).includes('resume')
            );
            
            if (resumePartialMatch) {
              try {
                const fileHandle = await directoryHandle.getFileHandle(resumePartialMatch.name);
                file = await fileHandle.getFile();
                fileFound = true;
                console.log(`Found resume file via partial match: ${resumePartialMatch.name}`);
              } catch (err) {
                console.error(`Error accessing partial match resume file ${resumePartialMatch.name}:`, err);
              }
            }
          }
        }
        
        // If not a special case or special case didn't find the file, try normal matching
        if (!fileFound) {
          // Look for exact matches
          for (const name of possibleNames) {
            const matchingEntry = allFiles.find(entry => fileMatches(entry.name, name));
            
            if (matchingEntry) {
              try {
                const fileHandle = await directoryHandle.getFileHandle(matchingEntry.name);
                file = await fileHandle.getFile();
                fileFound = true;
                console.log(`Found exact match: ${matchingEntry.name}`);
                break;
              } catch (err) {
                console.error(`Error accessing file ${matchingEntry.name}:`, err);
              }
            }
          }
          
          // If no exact match, look for partial matches
          if (!fileFound) {
            for (const entry of allFiles) {
              // Check for partial match with both original and normalized text
              const entryNameLower = entry.name.toLowerCase();
              const normalizedEntryName = normalizeText(entryNameLower);
              const normalizedSearchName = normalizeText(specificFile.toLowerCase());
              
              if (entryNameLower.includes(specificFile.toLowerCase()) || 
                  normalizedEntryName.includes(normalizedSearchName)) {
                try {
                  const fileHandle = await directoryHandle.getFileHandle(entry.name);
                  file = await fileHandle.getFile();
                  fileFound = true;
                  console.log(`Found partial match: ${entry.name}`);
                  break;
                } catch (err) {
                  console.error(`Error accessing partial match file ${entry.name}:`, err);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Error scanning directory:", err);
      }
      
      if (fileFound && file) {
        // Found the file, upload it
        onStatusChange(`Found "${file.name}"! Uploading...`);
        
        // Set the file in context
        setUploadedFile(file);
        console.log(`File set in context: ${file.name}`);
        
        // Navigate to the document portal
        await router.push('/deaf');
        setLastNavigatedTo('Deaf Assistance');
        
        // After navigation, trigger the file processing with a longer delay to ensure
        // the component is fully mounted and ready to receive the event
        setTimeout(() => {
          try {
            console.log("Dispatching jarvis-file-uploaded event for:", file.name);
            // First attempt - use our custom event
            const fileUploadEvent = new CustomEvent('jarvis-file-uploaded', { 
              detail: { fileName: file.name } 
            });
            window.dispatchEvent(fileUploadEvent);
            
            // For redundancy, also try to find and trigger the file input directly
            setTimeout(() => {
              const deafPageFileInput = document.getElementById('file-upload') as HTMLInputElement;
              if (deafPageFileInput) {
                // Use DataTransfer to set the file on the input
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                deafPageFileInput.files = dataTransfer.files;
                
                // Dispatch a change event to trigger the onChange handler
                const event = new Event('change', { bubbles: true });
                deafPageFileInput.dispatchEvent(event);
                
                console.log("Successfully set file on deaf page input");
              }
            }, 300);
          } catch (err) {
            console.error("Error dispatching file upload event:", err);
          }
        }, 1000);
        
        setIsProcessing(false);
        return `I've uploaded "${file.name}" from your ${location} folder. You can now generate quizzes, summaries, or flashcards.`;
      } else {
        setIsProcessing(false);
        return `I couldn't find "${specificFile}" in your ${location} folder. Please check if the file exists or try uploading it manually.`;
      }
    } catch (err: any) {
      console.error("Error in handleNamedFileUpload:", err);
      setIsProcessing(false);
      return `I encountered an error trying to access "${specificFile}" from your ${location} folder. ${err.message || 'Please try again or upload manually.'}`;
    }
  };
  
  return {
    handleNamedFileUpload,
    isProcessing,
    lastNavigatedTo
  };
};

// Utility function to detect file upload commands
export const detectFileUploadCommand = (inputText: string): { isFileUpload: boolean, fileName: string | null, location: string | null } => {
  // Convert to lowercase for easier matching
  const lowerInput = inputText.toLowerCase();
  
  // Check if this is a file upload command
  const isFileUpload = lowerInput.includes('upload') && 
    (lowerInput.includes('file') || 
     lowerInput.includes('pdf') || 
     lowerInput.includes('docx') ||
     lowerInput.includes('document'));
  
  if (!isFileUpload) {
    return { isFileUpload: false, fileName: null, location: null };
  }
  
  // Special case for resumé.pdf - handle it explicitly
  if (lowerInput.includes('resumé.pdf') || lowerInput.includes('resume.pdf')) {
    console.log("Detected specific request for resume.pdf");
    const fileName = lowerInput.includes('resumé.pdf') ? 'resumé.pdf' : 'resume.pdf';
    // Get location if specified, or default to downloads
    let location = 'downloads'; // Default 
    if (lowerInput.includes('download')) location = 'downloads';
    if (lowerInput.includes('document')) location = 'documents';
    if (lowerInput.includes('desktop')) location = 'desktop';
    return { isFileUpload: true, fileName, location };
  }
  
  // Regular pattern matching for "upload X from Y"
  const uploadFromRegex = /upload\s+(?:the\s+)?(?:file\s+)?(?:called\s+)?([\w\s\.\-'"\u00C0-\u017F]+?)(?:\.pdf|\.docx|\.txt)?\s+from\s+(?:my\s+)?([\w\s]+?)(?:\s+folder)?(?:\s|$)/i;
  const uploadFromMatch = lowerInput.match(uploadFromRegex);
  
  if (uploadFromMatch && uploadFromMatch.length >= 3) {
    console.log(`Detected upload command with location: "${uploadFromMatch[1]}" from "${uploadFromMatch[2]}"`);
    return { 
      isFileUpload: true, 
      fileName: uploadFromMatch[1].trim(), 
      location: uploadFromMatch[2].trim() 
    };
  }
  
  // More permissive pattern for "upload X" with optional prepositions
  const fileWithPrepositionPattern = /upload\s+(?:the\s+)?(?:file\s+)?(?:called\s+)?([\w\s\.\-'"\u00C0-\u017F]+?)(?:\.pdf|\.docx|\.txt)?(?:\s+(?:in|from|at)\s+(?:my\s+)?([\w\s]+?)(?:\s+folder)?)?(?:\s|$)/i;
  const prepositionMatch = lowerInput.match(fileWithPrepositionPattern);
  
  if (prepositionMatch && prepositionMatch.length >= 3) {
    const fileName = prepositionMatch[1].trim();
    const location = prepositionMatch[2]?.trim() || 'downloads'; // Default to downloads if no location
    console.log(`Detected upload with preposition: "${fileName}" from "${location}"`);
    return { isFileUpload: true, fileName, location };
  }
  
  // Simple pattern for just "upload X"
  const filePattern = /upload\s+(?:the\s+)?(?:file\s+)?(?:called\s+)?([\w\s\.\-'"\u00C0-\u017F]+?)(?:\.pdf|\.docx|\.txt)?(?:\s|$)/i;
  const fileMatch = lowerInput.match(filePattern);
  
  if (fileMatch && fileMatch.length >= 2) {
    console.log(`Detected simple upload: "${fileMatch[1].trim()}" (default location: downloads)`);
    return { 
      isFileUpload: true, 
      fileName: fileMatch[1].trim(), 
      location: 'downloads' // Default to downloads folder
    };
  }
  
  // Check for even more general case with any file type
  const generalFilePattern = /upload\s+([\w\s\.\-'"\u00C0-\u017F]+)$/i;
  const generalMatch = lowerInput.match(generalFilePattern);
  
  if (generalMatch && generalMatch.length >= 2 && 
      !['file', 'document', 'pdf'].includes(generalMatch[1].trim().toLowerCase())) {
    console.log(`Detected general upload: "${generalMatch[1].trim()}"`);
    return { 
      isFileUpload: true, 
      fileName: generalMatch[1].trim(), 
      location: 'downloads'  // Default to downloads folder
    };
  }
  
  // No specific file detected but it is a file upload command
  console.log("File upload command detected but no specific file name found");
  return { isFileUpload: true, fileName: null, location: null };
};
