'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ImagePreviewProps {
  imageUrl: string;
  altText?: string;
  onRemove?: () => void;
  onAltTextChange?: (altText: string) => void;
  showAltTextInput?: boolean;
  className?: string;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  imageUrl,
  altText = '',
  onRemove,
  onAltTextChange,
  showAltTextInput = true,
  className = ''
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Image Preview */}
      <div className="relative inline-block">
        <img
          src={imageUrl}
          alt={altText || 'Preview'}
          className="rounded-lg border border-gray-200 shadow-sm"
          style={{ width: '300px', height: '225px', objectFit: 'cover' }}
        />
        
        {/* Remove Button */}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-lg"
            title="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Alt Text Input */}
      {showAltTextInput && onAltTextChange && (
        <div className="space-y-2">
          <Label htmlFor="image-alt-text" className="text-sm font-medium">
            Alt Text (for accessibility)
          </Label>
          <Input
            id="image-alt-text"
            type="text"
            value={altText}
            onChange={(e) => onAltTextChange(e.target.value)}
            placeholder="Describe the image for screen readers"
            className="w-full"
          />
          <p className="text-xs text-gray-500">
            Provide a brief description of the image for users with visual impairments
          </p>
        </div>
      )}
    </div>
  );
};
