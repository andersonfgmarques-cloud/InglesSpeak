export interface DictionaryWord {
  id: string;
  english: string;
  ipa: string;
  simplifiedPronunciation: string;
  translation: string;
  example: string;
  exampleTranslation: string;
  category: 'Verbo' | 'Substantivo' | 'Adjetivo' | 'Advérbio' | 'Preposição' | 'Conjunção' | 'Pronome' | 'Outro';
  frequency: number;
}

export interface UserWordProgress {
  wordId: string;
  isLearned: boolean;
  isFavorite: boolean;
  lastReviewDate?: string;
  reviewCount: number;
}
