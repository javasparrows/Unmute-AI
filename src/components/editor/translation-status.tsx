"use client";


interface TranslationStatusProps {
  isTranslating: boolean;
  error: string | null;
}

export function TranslationStatus({ isTranslating, error }: TranslationStatusProps) {
  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive px-3 py-1.5 bg-destructive/10 rounded-md">
        <span className="inline-block h-2 w-2 rounded-full bg-destructive" />
        {error}
      </div>
    );
  }

  if (!isTranslating) return null;

  return (
    <div className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md text-primary bg-primary/10 transition-all duration-300">
      <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
      翻訳中...
    </div>
  );
}
