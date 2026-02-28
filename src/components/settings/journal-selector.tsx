"use client";

import { journals } from "@/lib/journals";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface JournalSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function JournalSelector({ value, onChange }: JournalSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px] h-8 text-sm">
        <SelectValue placeholder="ジャーナル選択" />
      </SelectTrigger>
      <SelectContent>
        {journals.map((journal) => (
          <SelectItem key={journal.id} value={journal.id}>
            <div className="flex flex-col">
              <span>{journal.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
