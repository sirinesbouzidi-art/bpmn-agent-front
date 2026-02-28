export interface BpmnModel {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  status: 'Generated' | 'Validated' | 'Draft';
  xml: string;
}
