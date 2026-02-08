'use client';

import { TASK_COLORS } from '@/types/task';
import { Check } from 'lucide-react';

interface ColorPickerProps {
    selectedColor: string;
    onColorChange: (color: string) => void;
}

export function ColorPicker({ selectedColor, onColorChange }: ColorPickerProps) {
    return (
        <div className="grid grid-cols-5 gap-2 p-2">
            {TASK_COLORS.map((color) => (
                <button
                    key={color}
                    onClick={() => onColorChange(color)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform hover:scale-110"
                    style={{ backgroundColor: color }}
                >
                    {selectedColor === color && (
                        <Check className="w-4 h-4 text-white drop-shadow-md" />
                    )}
                </button>
            ))}
        </div>
    );
}
