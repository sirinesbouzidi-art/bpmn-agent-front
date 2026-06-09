export interface BpmnModel {
  id: string;
  name: string;
  description: string;
  date: Date;
  status: 'Generated' | 'Validated' | 'Draft';
  xml: string;
}
