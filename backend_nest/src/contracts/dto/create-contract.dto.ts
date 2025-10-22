export class CreateContractDto {
  title: string;
  category?: string;
  description?: string;
  schema?: Record<string, any>;
  example?: Record<string, any>;
  price?: number;
  visibility?: boolean;
}
