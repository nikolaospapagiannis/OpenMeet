/**
 * File Upload Tests
 * Tests for file upload drag-drop functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileDropZone } from '@/components/meetings/FileDropZone';

describe('FileDropZone', () => {
  const mockOnFileSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders file drop zone with correct elements', () => {
    render(<FileDropZone onFileSelect={mockOnFileSelect} />);

    expect(screen.getByText('Upload Recording')).toBeInTheDocument();
    expect(screen.getByText('Drag and drop your audio or video file, or click to browse')).toBeInTheDocument();
    expect(screen.getByText('MP3, WAV, M4A, OGG')).toBeInTheDocument();
    expect(screen.getByText('MP4, WebM, MOV')).toBeInTheDocument();
    expect(screen.getByText('Maximum file size: 2 GB')).toBeInTheDocument();
  });

  test('handles click to browse files', () => {
    render(<FileDropZone onFileSelect={mockOnFileSelect} />);

    const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    expect(fileInput.type).toBe('file');
    expect(fileInput.accept).toBe('audio/*,video/*,.mp3,.mp4,.wav,.m4a,.webm,.ogg,.mov');
  });

  test('handles valid file selection through input', () => {
    render(<FileDropZone onFileSelect={mockOnFileSelect} />);

    const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
    const file = new File(['audio content'], 'test.mp3', { type: 'audio/mp3' });

    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(fileInput);

    expect(mockOnFileSelect).toHaveBeenCalledWith(file);
  });

  test('rejects files exceeding size limit', () => {
    const maxSize = 100; // 100 bytes
    render(<FileDropZone onFileSelect={mockOnFileSelect} maxSize={maxSize} />);

    const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
    const largeFile = new File(['x'.repeat(200)], 'large.mp3', { type: 'audio/mp3' });

    Object.defineProperty(fileInput, 'files', {
      value: [largeFile],
      writable: false,
    });

    fireEvent.change(fileInput);

    expect(mockOnFileSelect).not.toHaveBeenCalled();
    expect(screen.getByText('File size exceeds 100 Bytes limit')).toBeInTheDocument();
  });

  test('rejects empty files', () => {
    render(<FileDropZone onFileSelect={mockOnFileSelect} />);

    const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
    const emptyFile = new File([], 'empty.mp3', { type: 'audio/mp3' });

    Object.defineProperty(fileInput, 'files', {
      value: [emptyFile],
      writable: false,
    });

    fireEvent.change(fileInput);

    expect(mockOnFileSelect).not.toHaveBeenCalled();
    expect(screen.getByText('File is empty')).toBeInTheDocument();
  });

  test('rejects unsupported file types', () => {
    render(<FileDropZone onFileSelect={mockOnFileSelect} />);

    const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
    const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });

    Object.defineProperty(fileInput, 'files', {
      value: [invalidFile],
      writable: false,
    });

    fireEvent.change(fileInput);

    expect(mockOnFileSelect).not.toHaveBeenCalled();
    expect(screen.getByText(/File type not supported/)).toBeInTheDocument();
  });

  test('handles drag enter event', () => {
    render(<FileDropZone onFileSelect={mockOnFileSelect} />);

    const dropZone = screen.getByText('Upload Recording').closest('div')?.parentElement;

    if (dropZone) {
      fireEvent.dragEnter(dropZone);
      expect(screen.getByText('Drop your file here')).toBeInTheDocument();
    }
  });

  test('handles drag leave event', () => {
    render(<FileDropZone onFileSelect={mockOnFileSelect} />);

    const dropZone = screen.getByText('Upload Recording').closest('div')?.parentElement;

    if (dropZone) {
      fireEvent.dragEnter(dropZone);
      expect(screen.getByText('Drop your file here')).toBeInTheDocument();

      fireEvent.dragLeave(dropZone);
      expect(screen.getByText('Upload Recording')).toBeInTheDocument();
    }
  });

  test('handles drag over event', () => {
    render(<FileDropZone onFileSelect={mockOnFileSelect} />);

    const dropZone = screen.getByText('Upload Recording').closest('div')?.parentElement;

    if (dropZone) {
      const dragOverEvent = new Event('dragover', { bubbles: true });
      Object.defineProperty(dragOverEvent, 'preventDefault', {
        value: jest.fn(),
      });

      fireEvent(dropZone, dragOverEvent);
      expect(dragOverEvent.preventDefault).toHaveBeenCalled();
    }
  });

  test('handles file drop with valid file', () => {
    render(<FileDropZone onFileSelect={mockOnFileSelect} />);

    const dropZone = screen.getByText('Upload Recording').closest('div')?.parentElement;

    if (dropZone) {
      const file = new File(['video content'], 'test.mp4', { type: 'video/mp4' });
      const dropEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          files: [file],
        },
      });
      Object.defineProperty(dropEvent, 'preventDefault', {
        value: jest.fn(),
      });

      fireEvent(dropZone, dropEvent);

      expect(dropEvent.preventDefault).toHaveBeenCalled();
      expect(mockOnFileSelect).toHaveBeenCalledWith(file);
    }
  });

  test('handles file drop with invalid file', () => {
    render(<FileDropZone onFileSelect={mockOnFileSelect} />);

    const dropZone = screen.getByText('Upload Recording').closest('div')?.parentElement;

    if (dropZone) {
      const file = new File(['text content'], 'test.pdf', { type: 'application/pdf' });
      const dropEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          files: [file],
        },
      });
      Object.defineProperty(dropEvent, 'preventDefault', {
        value: jest.fn(),
      });

      fireEvent(dropZone, dropEvent);

      expect(dropEvent.preventDefault).toHaveBeenCalled();
      expect(mockOnFileSelect).not.toHaveBeenCalled();
      expect(screen.getByText(/File type not supported/)).toBeInTheDocument();
    }
  });

  test('disabled state prevents interaction', () => {
    render(<FileDropZone onFileSelect={mockOnFileSelect} disabled={true} />);

    const dropZone = screen.getByText('Upload Recording').closest('div')?.parentElement;

    if (dropZone) {
      expect(dropZone).toHaveClass('opacity-50', 'cursor-not-allowed');

      // Test click doesn't work
      const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
      expect(fileInput).toBeDisabled();

      // Test drop doesn't work
      const file = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
      const dropEvent = new Event('drop', { bubbles: true });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          files: [file],
        },
      });

      fireEvent(dropZone, dropEvent);
      expect(mockOnFileSelect).not.toHaveBeenCalled();
    }
  });

  test('accepts various audio formats', () => {
    render(<FileDropZone onFileSelect={mockOnFileSelect} />);

    const audioFormats = [
      { name: 'test.mp3', type: 'audio/mp3' },
      { name: 'test.wav', type: 'audio/wav' },
      { name: 'test.m4a', type: 'audio/m4a' },
      { name: 'test.ogg', type: 'audio/ogg' },
    ];

    audioFormats.forEach(({ name, type }) => {
      const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
      const file = new File(['content'], name, { type });

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);
      expect(mockOnFileSelect).toHaveBeenCalledWith(file);
      mockOnFileSelect.mockClear();
    });
  });

  test('accepts various video formats', () => {
    render(<FileDropZone onFileSelect={mockOnFileSelect} />);

    const videoFormats = [
      { name: 'test.mp4', type: 'video/mp4' },
      { name: 'test.webm', type: 'video/webm' },
      { name: 'test.mov', type: 'video/quicktime' },
    ];

    videoFormats.forEach(({ name, type }) => {
      const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
      const file = new File(['content'], name, { type });

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);
      expect(mockOnFileSelect).toHaveBeenCalledWith(file);
      mockOnFileSelect.mockClear();
    });
  });

  test('displays custom accept pattern', () => {
    const customAccept = '.mp3,.wav';
    render(<FileDropZone onFileSelect={mockOnFileSelect} accept={customAccept} />);

    const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
    expect(fileInput.accept).toBe(customAccept);
  });

  test('formats file size correctly', () => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    render(<FileDropZone onFileSelect={mockOnFileSelect} maxSize={maxSize} />);

    expect(screen.getByText('Maximum file size: 5 MB')).toBeInTheDocument();
  });

  test('clears error when selecting new file', () => {
    render(<FileDropZone onFileSelect={mockOnFileSelect} />);

    const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;

    // First, cause an error
    const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
    Object.defineProperty(fileInput, 'files', {
      value: [invalidFile],
      writable: false,
    });
    fireEvent.change(fileInput);

    expect(screen.getByText(/File type not supported/)).toBeInTheDocument();

    // Then select a valid file
    const validFile = new File(['content'], 'test.mp3', { type: 'audio/mp3' });
    Object.defineProperty(fileInput, 'files', {
      value: [validFile],
      writable: false,
    });
    fireEvent.change(fileInput);

    expect(screen.queryByText(/File type not supported/)).not.toBeInTheDocument();
    expect(mockOnFileSelect).toHaveBeenCalledWith(validFile);
  });
});