export interface Contract {
  id: string;
  creator_id: string;
  title: string;
  category: string | null;
  description: string | null;
  schema: Record<string, any> | null;
  example: Record<string, any> | null;
  price: number | null;
  visibility: boolean;
  rating: number | null;
  downloads: number | null;
  created_at: string;
}
