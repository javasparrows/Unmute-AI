"use client";

import type { LanguageCode } from "@/types";
import { languages } from "@/lib/languages";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LanguageSelectorProps {
  value: LanguageCode;
  onChange: (value: LanguageCode) => void;
}

export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  const selected = languages.find((l) => l.code === value);
  return (
    <Select value={value} onValueChange={(v) => onChange(v as LanguageCode)}>
      <SelectTrigger className="w-[80px] sm:w-[140px] h-8 text-sm">
        {/* Show short code on mobile, full native name on desktop */}
        <span className="sm:hidden truncate">{selected?.code.toUpperCase() ?? value}</span>
        <span className="hidden sm:inline"><SelectValue /></span>
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            {lang.nativeName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
