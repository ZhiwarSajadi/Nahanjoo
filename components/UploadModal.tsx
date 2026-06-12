/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback } from 'react';
import UploadCloudIcon from './icons/UploadCloudIcon';
import CarIcon from './icons/CarIcon';
import WashingMachineIcon from './icons/WashingMachineIcon';
import Spinner from './Spinner';

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (files: File[]) => void;
}

const sampleDocuments = [
    {
        name: 'Hyundai i10 Manual',
        url: 'https://www.hyundai.com/content/dam/hyundai/in/en/data/connect-to-service/owners-manual/2025/i20&i20nlineFromOct2023-Present.pdf',
        icon: <CarIcon />,
        fileName: 'hyundai-i10-manual.pdf'
    },
    {
        name: 'LG Washer Manual',
        url: 'https://www.lg.com/us/support/products/documents/WM2077CW.pdf',
        icon: <WashingMachineIcon />,
        fileName: 'lg-washer-manual.pdf'
    }
];

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUpload }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [loadingSample, setLoadingSample] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFiles(prev => [...prev, ...Array.from(event.target.files!)]);
        }
    };
    
    const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        if (event.dataTransfer.files) {
            setFiles(prev => [...prev, ...Array.from(event.dataTransfer.files)]);
        }
    }, []);

    const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(true);
    }, []);
    
    const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleSelectSample = async (name: string, url: string, fileName: string) => {
        if (loadingSample) return;
        setLoadingSample(name);
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${name}: ${response.statusText}`);
            }
            const blob = await response.blob();
            const file = new File([blob], fileName, { type: blob.type });
            setFiles(prev => [...prev, file]);
        } catch (error) {
            console.error("Error fetching sample file:", error);
            alert(`Could not fetch the sample document. This might be due to CORS policy. Please try uploading a local file.`);
        } finally {
            setLoadingSample(null);
        }
    };

    const handleConfirmUpload = () => {
        onUpload(files);
        handleClose();
    };

    const handleClose = () => {
        setFiles([]);
        onClose();
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="upload-title">
            <div className="bg-gem-slate p-8 rounded-xl shadow-2xl w-[600px] max-w-[90vw] max-h-[90vh] overflow-y-auto border border-gem-border">
                <div className="flex justify-between items-center mb-6">
                    <h2 id="upload-title" className="text-xl font-medium text-gem-deep">Upload Documents</h2>
                    <button onClick={handleClose} className="text-gem-muted hover:text-gem-deep transition-colors focus:outline-none" aria-label="Close modal">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div 
                    className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors mb-6
                        ${isDragging ? 'border-gem-brand bg-gem-brand-light/10' : 'border-gem-border hover:border-gem-muted/50'}
                    `}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                >
                    <UploadCloudIcon />
                    <p className="mt-4 mb-2 text-gem-deep font-medium">Drag and drop your files here</p>
                    <p className="text-sm text-gem-muted mb-6">OR</p>
                    <label htmlFor="file-upload" className="cursor-pointer bg-white border border-gem-border hover:border-gem-muted text-gem-deep px-6 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm">
                        Browse Files
                        <input id="file-upload" type="file" multiple className="hidden" onChange={handleFileChange} accept=".pdf,.txt,.md,.csv" />
                    </label>
                </div>

                {files.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-gem-deep mb-3">Selected Files:</h3>
                        <ul className="space-y-2 max-h-32 overflow-y-auto pr-2">
                            {files.map((file, idx) => (
                                <li key={idx} className="text-sm text-gem-deep flex items-center justify-between bg-gem-canvas p-2.5 rounded-md border border-gem-border">
                                    <span className="truncate flex-1" title={file.name}>{file.name}</span>
                                    <button 
                                        onClick={() => setFiles(prev => prev.filter((_, i) => i !== idx))} 
                                        className="ml-3 text-gem-muted hover:text-red-500 focus:outline-none"
                                        aria-label={`Remove ${file.name}`}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="mb-8">
                    <h3 className="text-sm font-medium text-gem-deep mb-3">Or try a sample document:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {sampleDocuments.map((doc, idx) => (
                            <button 
                                key={idx}
                                onClick={() => handleSelectSample(doc.name, doc.url, doc.fileName)}
                                disabled={loadingSample !== null}
                                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors
                                  ${loadingSample === doc.name ? 'border-gem-brand bg-gem-brand-light/10 opacity-70' : 'border-gem-border hover:border-gem-muted/50 bg-white hover:bg-gem-canvas'}
                                `}
                            >
                                <span className={loadingSample === doc.name ? 'text-gem-brand' : 'text-gem-muted'}>
                                    {loadingSample === doc.name ? <Spinner size="sm" /> : doc.icon}
                                </span>
                                <span className="text-sm font-medium text-gem-deep truncate">{doc.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gem-border">
                    <button onClick={handleClose} className="px-5 py-2.5 text-sm font-medium text-gem-deep hover:bg-gem-canvas rounded-lg transition-colors focus:outline-none border border-transparent">
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirmUpload} 
                        disabled={files.length === 0}
                        className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-gem-brand focus:ring-offset-1
                            ${files.length > 0 ? 'bg-gem-deep text-white hover:bg-black' : 'bg-gem-border text-gem-muted cursor-not-allowed'}
                        `}
                    >
                        Upload {files.length > 0 ? `(${files.length})` : ''}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UploadModal;