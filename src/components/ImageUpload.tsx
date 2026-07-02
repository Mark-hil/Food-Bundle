import { useState, useRef } from 'react';
import { UploadCloud, X, Loader2 } from 'lucide-react';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export default function ImageUpload({ value, onChange, label = 'Package Image' }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, etc.)');
      return;
    }

    // Validate file size (e.g., max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      setError('Cloudinary is not configured. Please check your .env file.');
      return;
    }

    setIsUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Upload failed');
      }

      const data = await response.json();
      onChange(data.secure_url);
    } catch (err: any) {
      console.error('Cloudinary upload error:', err);
      setError(err.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      // Reset input so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    onChange('');
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 group w-full max-w-sm h-48 bg-slate-100 flex items-center justify-center">
          <img 
            src={value} 
            alt="Uploaded preview" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              type="button"
              onClick={handleRemove}
              className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition shadow-lg"
              title="Remove image"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      ) : (
        <div 
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
            isUploading ? 'border-slate-300 bg-slate-50' : 'border-slate-300 hover:border-green-500 hover:bg-slate-50'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center text-green-600">
              <Loader2 className="w-10 h-10 animate-spin mb-3" />
              <p className="text-sm font-medium">Uploading to Cloudinary...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500">
              <UploadCloud className="w-10 h-10 mb-3 text-slate-400" />
              <p className="text-sm font-medium text-slate-700 mb-1">Click to upload an image</p>
              <p className="text-xs">JPG, PNG, GIF up to 5MB</p>
            </div>
          )}
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
}
