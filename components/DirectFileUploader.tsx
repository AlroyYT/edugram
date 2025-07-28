import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useFileContext } from '../context/FileContext';

interface FileUploaderProps {
  onUploadSuccess?: (fileName: string) => void;
  onError?: (error: string) => void;
  onStatusUpdate?: (message: string) => void;
}

interface UploaderResult {
  uploadSpecificFile: (fileName: string, location: string) => Promise<string>;
  isProcessing: boolean;
  statusMessage: string;
}

// This is a custom hook rather than a React component
const useDirectFileUploader = ({ 
  onUploadSuccess, 
  onError,
  onStatusUpdate 
}: FileUploaderProps): UploaderResult => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const { uploadedFile, setUploadedFile } = useFileContext();
  const router = useRouter();
  
  const updateStatus = useCallback((message: string) => {
    setStatusMessage(message);
    console.log(`DirectFileUploader: ${message}`);
    if (onStatusUpdate) onStatusUpdate(message);
  }, [onStatusUpdate]);
  
  // Function to normalize text (remove accents)
  const normalizeText = useCallback((text: string): string => {
    return text.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase();
  }, []);
  
  // Store a directory handle in IndexedDB for future use
  const storeDirectoryHandle = useCallback(async (locationKey: string, handle: FileSystemDirectoryHandle) => {
    try {
      const request = indexedDB.open('FileDirectoryHandles', 1);
      
      request.onupgradeneeded = (event) => {
        // @ts-ignore
        const db = event.target.result;
        if (!db.objectStoreNames.contains('handles')) {
          db.createObjectStore('handles', { keyPath: 'locationKey' });
        }
      };
      
      const dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = (event) => {
          // @ts-ignore
          resolve(event.target.result);
        };
        request.onerror = (event) => {
          // @ts-ignore
          reject(event.target.error);
        };
      });
      
      const db = await dbPromise;
      const tx = db.transaction('handles', 'readwrite');
      const store = tx.objectStore('handles');
      
      // @ts-ignore - FileSystemHandle methods not fully defined in TS
      const serializedHandle = await handle.toJSON?.();
      
      store.put({
        locationKey,
        serializedHandle,
        timestamp: Date.now()
      });
      
      return new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.error('Error storing directory handle:', err);
    }
  }, []);
  
  // Get a stored directory handle from IndexedDB
  const getStoredDirectoryHandle = useCallback(async (locationKey: string): Promise<FileSystemDirectoryHandle | null> => {
    try {
      const request = indexedDB.open('FileDirectoryHandles', 1);
      
      const dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = (event) => {
          // @ts-ignore
          resolve(event.target.result);
        };
        request.onerror = () => {
          reject(new Error('Could not open IndexedDB'));
        };
        request.onupgradeneeded = (event) => {
          // @ts-ignore
          const db = event.target.result;
          if (!db.objectStoreNames.contains('handles')) {
            db.createObjectStore('handles', { keyPath: 'locationKey' });
          }
        };
      });
      
      const db = await dbPromise;
      
      if (!db.objectStoreNames.contains('handles')) {
        return null;
      }
      
      const tx = db.transaction('handles', 'readonly');
      const store = tx.objectStore('handles');
      const getRequest = store.get(locationKey);
      
      return new Promise((resolve, reject) => {
        getRequest.onsuccess = async () => {
          if (getRequest.result) {
            try {
              // @ts-ignore - FileSystemHandle methods not fully defined in TS
              const handle = await FileSystemHandle.fromJSON?.(getRequest.result.serializedHandle);
              resolve(handle);
            } catch (err) {
              console.error(`Error deserializing handle for ${locationKey}:`, err);
              resolve(null);
            }
          } else {
            resolve(null);
          }
        };
        getRequest.onerror = () => {
          reject(getRequest.error);
        };
      });
    } catch (err) {
      console.error('Error getting stored directory handle:', err);
      return null;
    }
  }, []);
  
  // Function to perform actual file upload directly
  const uploadSpecificFile = useCallback(async (fileName: string, location: string): Promise<string> => {
    if (!fileName || !location) {
      return "Please specify both a file name and location.";
    }
    
    setIsProcessing(true);
    updateStatus(`Looking for ${fileName} in ${location}...`);
    
    try {
      console.log(`DirectFileUploader: Searching for ${fileName} in ${location}`);
      
      // Check if File System Access API is supported
      if (!('showDirectoryPicker' in window)) {
        setIsProcessing(false);
        return "Your browser doesn't support direct file access. Please select the file manually.";
      }
      
      // Map location to system directory
      const locationMapping: {[key: string]: {dirName: string, startIn: string}} = {
        'download': {dirName: 'Downloads', startIn: 'downloads'},
        'downloads': {dirName: 'Downloads', startIn: 'downloads'},
        'document': {dirName: 'Documents', startIn: 'documents'},
        'documents': {dirName: 'Documents', startIn: 'documents'},
        'desktop': {dirName: 'Desktop', startIn: 'desktop'},
        'picture': {dirName: 'Pictures', startIn: 'pictures'},
        'pictures': {dirName: 'Pictures', startIn: 'pictures'},
        'music': {dirName: 'Music', startIn: 'music'}
      };
      
      // Find the best match for the location
      const locationKey = location.toLowerCase();
      const matchedLocation = Object.keys(locationMapping).find(key => locationKey.includes(key));
      
      if (!matchedLocation) {
        setIsProcessing(false);
        return `I don't recognize "${location}" as a known folder location.`;
      }
      
      const { dirName, startIn } = locationMapping[matchedLocation];
      const storageKey = matchedLocation;
      
      // Try to get stored directory handle from IndexedDB
      let dirHandle = null;
      try {
        const storedHandle = await getStoredDirectoryHandle(storageKey);
        
        if (storedHandle) {
          // Verify permission is still valid
          // @ts-ignore - queryPermission() not in TypeScript yet
          const permission = await storedHandle.queryPermission({ mode: 'read' });
          
          if (permission === 'granted') {
            console.log(`Reusing stored ${dirName} directory access permission`);
            dirHandle = storedHandle;
          } else {
            console.log('Stored permission expired, requesting again');
          }
        }
      } catch (err) {
        console.error(`Error accessing stored ${dirName} directory handle:`, err);
      }
      
      // If no stored handle or permission denied, request fresh access
      if (!dirHandle) {
        updateStatus(`Please select your ${dirName} folder in the dialog that appears`);
        
        try {
          // @ts-ignore - TypeScript doesn't recognize showDirectoryPicker yet
          dirHandle = await window.showDirectoryPicker({
            id: storageKey,
            startIn: startIn,
            mode: 'read'
          });
          
          // Store the handle for future use if permission is granted
          // @ts-ignore - requestPermission() not in TypeScript yet
          const permission = await dirHandle.requestPermission({ mode: 'read' });
          if (permission === 'granted') {
            await storeDirectoryHandle(storageKey, dirHandle);
          }
        } catch (error) {
          console.error("Directory picker error:", error);
          setIsProcessing(false);
          
          if ((error as Error).name === 'AbortError') {
            return `You cancelled the ${dirName} folder selection. Please try again.`;
          }
          
          return `Error accessing your ${dirName} folder. Please try again or upload manually.`;
        }
      }
      
      // List all files in the directory
      updateStatus(`Searching for ${fileName}...`);
      const files: FileSystemFileHandle[] = [];
      
      try {
        console.log("Scanning directory for files...");
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file') {
            files.push(entry);
            console.log(`Found file: ${entry.name}`);
          }
        }
        
        console.log(`Total files found: ${files.length}`);
      } catch (error) {
        console.error("Error scanning directory:", error);
        setIsProcessing(false);
        return `Error scanning your ${dirName} folder. Please try again or upload manually.`;
      }
      
      // Create possible name variations for the search
      const baseFileName = fileName.includes('.') 
        ? fileName.substring(0, fileName.lastIndexOf('.'))
        : fileName;
        
      const fileExtension = fileName.includes('.') 
        ? fileName.substring(fileName.lastIndexOf('.'))
        : '.pdf';  // Default to PDF if no extension provided
      
      // Special case for resumé.pdf - because it's a commonly problematic file
      if (baseFileName.toLowerCase() === 'resume' || 
          baseFileName.toLowerCase() === 'resumé' || 
          normalizeText(baseFileName.toLowerCase()) === 'resume') {
        console.log("Special handling for resumé.pdf");
        
        const resumeVariations = [
          'resume.pdf', 'Resume.pdf', 'RESUME.PDF',
          'resumé.pdf', 'Resumé.pdf', 'RESUMÉ.PDF',
          'resume.docx', 'Resume.docx',
          'resumé.docx', 'Resumé.docx',
        ];
        
        // Find the file
        let fileFound = false;
        let foundFile: File | null = null;
        
        // Try exact matches first
        for (const resumeVariant of resumeVariations) {
          console.log(`Looking for resume variant: ${resumeVariant}`);
          
          for (const entry of files) {
            if (entry.name.toLowerCase() === resumeVariant.toLowerCase() ||
                normalizeText(entry.name.toLowerCase()) === normalizeText(resumeVariant.toLowerCase())) {
              try {
                const file = await entry.getFile();
                foundFile = file;
                fileFound = true;
                console.log(`Found resume file: ${entry.name}`);
                break;
              } catch (err) {
                console.error(`Error accessing resume file ${entry.name}:`, err);
              }
            }
          }
          
          if (fileFound) break;
        }
        
        // If still not found, try partial matching
        if (!fileFound) {
          console.log("Looking for any file containing 'resume'");
          
          for (const entry of files) {
            const entryNameLower = entry.name.toLowerCase();
            const normalizedEntryName = normalizeText(entryNameLower);
            
            if (entryNameLower.includes('resume') || normalizedEntryName.includes('resume')) {
              try {
                const file = await entry.getFile();
                foundFile = file;
                fileFound = true;
                console.log(`Found resume file via partial match: ${entry.name}`);
                break;
              } catch (err) {
                console.error(`Error accessing partial match resume file ${entry.name}:`, err);
              }
            }
          }
        }
        
        if (fileFound && foundFile) {
          return await processFoundFile(foundFile, dirName);
        }
      }
      
      // For regular files
      const possibleNames = [
        fileName,
        // Case variations
        fileName.toLowerCase(),
        fileName.toUpperCase(),
        baseFileName + fileExtension.toLowerCase(),
        // Accented character variations
        normalizeText(fileName),
        // Extension variations if none provided
        !fileName.includes('.') ? baseFileName + '.pdf' : null,
        !fileName.includes('.') ? baseFileName + '.docx' : null,
        !fileName.includes('.') ? baseFileName + '.txt' : null,
      ].filter(Boolean) as string[];
      
      // Find the file
      let fileFound = false;
      let foundFile: File | null = null;
      
      // First try exact matches
      for (const name of possibleNames) {
        // Try exact or case-insensitive match
        for (const entry of files) {
          if (entry.name.toLowerCase() === name.toLowerCase() ||
              normalizeText(entry.name.toLowerCase()) === normalizeText(name.toLowerCase())) {
            try {
              const file = await entry.getFile();
              foundFile = file;
              fileFound = true;
              console.log(`Found exact match: ${entry.name}`);
              break;
            } catch (err) {
              console.error(`Error accessing file ${entry.name}:`, err);
            }
          }
        }
        
        if (fileFound) break;
      }
      
      // If still not found, try partial matches
      if (!fileFound) {
        const searchTerms = possibleNames.map(n => normalizeText(n.toLowerCase()));
        
        for (const entry of files) {
          const entryNameLower = entry.name.toLowerCase();
          const normalizedEntryName = normalizeText(entryNameLower);
          
          // Check if file name contains our search term
          for (const term of searchTerms) {
            if (normalizedEntryName.includes(term)) {
              try {
                const file = await entry.getFile();
                foundFile = file;
                fileFound = true;
                console.log(`Found partial match: ${entry.name} contains ${term}`);
                break;
              } catch (err) {
                console.error(`Error accessing partial match file ${entry.name}:`, err);
              }
            }
          }
          
          if (fileFound) break;
        }
      }
      
      // Handle file found
      if (fileFound && foundFile) {
        return await processFoundFile(foundFile, dirName);
      } else {
        // File not found
        setIsProcessing(false);
        if (onError) onError(`File "${fileName}" not found in ${dirName}`);
        return `Couldn't find "${fileName}" in your ${dirName} folder. Please check if the file exists or try uploading it manually.`;
      }
      
    } catch (error) {
      console.error('Error in direct file upload:', error);
      setIsProcessing(false);
      if (onError) onError(`Upload error: ${error instanceof Error ? error.message : String(error)}`);
      return `Upload error: ${error instanceof Error ? error.message : String(error)}. Please try again or upload manually.`;
    }
  }, [updateStatus, normalizeText, getStoredDirectoryHandle, storeDirectoryHandle, setUploadedFile, router, onError]);
  
  // Function to process a found file - extracted for reuse
  const processFoundFile = async (foundFile: File, locationName: string): Promise<string> => {
    updateStatus(`Found "${foundFile.name}"! Uploading...`);
    
    // Store file in context
    setUploadedFile(foundFile);
    console.log(`Setting file in context: ${foundFile.name}`);
    
    try {
      // Navigate to deaf assistance page
      await router.push('/deaf');
      
      // After navigation completes and DOM is updated,
      // perform multiple actions to ensure the file is processed
      const completeUploadProcess = async () => {
        try {
          console.log("Attempting to trigger file upload process");
          
          // First, dispatch an event to notify that a file is uploaded and should be processed
          const uploadCompleteEvent = new CustomEvent('jarvis-file-uploaded', {
            detail: { 
              fileName: foundFile.name,
              file: foundFile
            }
          });
          window.dispatchEvent(uploadCompleteEvent);
          console.log("jarvis-file-uploaded event dispatched");
          
          // Try to find the file input on the page and set its value
          const fileInput = document.getElementById('file-upload') as HTMLInputElement;
          
          if (fileInput) {
            console.log("Found file input, setting file");
            
            try {
              // Use DataTransfer to set file on input
              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(foundFile);
              fileInput.files = dataTransfer.files;
              
              // Dispatch change event to trigger handleAssetSelection
              const changeEvent = new Event('change', { bubbles: true });
              fileInput.dispatchEvent(changeEvent);
              
              console.log('Successfully set file in input and dispatched change event');
              
              // Wait briefly to ensure the change event is processed
              await new Promise(resolve => setTimeout(resolve, 200));
              
              // Find and click the Upload Now button if it exists
              const uploadNowButton = document.querySelector('.upload-now-button') as HTMLButtonElement;
              
              if (uploadNowButton) {
                console.log("Found Upload Now button, clicking it");
                uploadNowButton.click();
              } else {
                console.log("Upload Now button not found");
                // If no upload button, the file might already be processed
              }
            } catch (error) {
              console.error("Error setting file on input:", error);
            }
          } else {
            console.error("File input element not found");
          }
        } catch (error) {
          console.error("Error in completeUploadProcess:", error);
        }
      };
      
      // Execute with a delay to ensure the page has loaded
      setTimeout(completeUploadProcess, 1000);
      
      if (onUploadSuccess) {
        onUploadSuccess(foundFile.name);
      }
      
      setIsProcessing(false);
      return `I've uploaded "${foundFile.name}" from your ${locationName} folder. You can now generate quizzes, summaries, or flashcards.`;
    } catch (error) {
      console.error("Error during file processing:", error);
      setIsProcessing(false);
      if (onError) onError(`Error processing "${foundFile.name}": ${error instanceof Error ? error.message : String(error)}`);
      return `I found "${foundFile.name}" but encountered an error while processing it. Please try uploading manually.`;
    }
  };
  
  return {
    uploadSpecificFile,
    isProcessing,
    statusMessage
  };
};

export default useDirectFileUploader;
