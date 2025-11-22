'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, File, X } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function FileUpload({ onFileSelect, disabled }: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFile = (file: File) => {
    setSelectedFile(file);
    onFileSelect(file);
    
    setTimeout(() => {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, 2000);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
        disabled={disabled}
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-3 transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted hover:border-muted-foreground/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {selectedFile ? (
                <span className="flex items-center space-x-2">
                  <File className="h-4 w-4" />
                  <span className="text-green-600 dark:text-green-400">
                    Uploaded: {selectedFile.name}
                  </span>
                </span>
              ) : (
                'Click to upload or drag and drop documents'
              )}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            disabled={disabled}
          >
            Browse
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1 ml-6">
          PDF, DOC, TXT, or images up to 20MB
        </p>
      </div>
    </div>
  );
}

