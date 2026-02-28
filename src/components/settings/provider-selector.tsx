"use client";

import type { TranslationProvider } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const providers: { id: TranslationProvider; name: string }[] = [
  { id: "deepl", name: "DeepL" },
  { id: "gemini", name: "Gemini" },
];

interface ProviderSelectorProps {
  value: TranslationProvider;
  onChange: (value: TranslationProvider) => void;
}

export function ProviderSelector({ value, onChange }: ProviderSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as TranslationProvider)}>
      <SelectTrigger className="w-[130px] h-8 text-sm">
        <SelectValue placeholder="翻訳エンジン" />
      </SelectTrigger>
      <SelectContent>
        {providers.map((provider) => (
          <SelectItem key={provider.id} value={provider.id}>
            {provider.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
