import { Injectable, signal } from '@angular/core';
import { BpmnModel } from '../../shared/models/bpmn.model';

@Injectable({ providedIn: 'root' })
export class BpmnService {
  readonly currentModel = signal<BpmnModel | null>(null);

  setCurrentModel(model: BpmnModel): void {
    this.currentModel.set(model);
  }

  downloadXml(model: BpmnModel): void {
    this.downloadFile(`${model.name}.bpmn`, model.xml, 'application/xml;charset=utf-8;');
  }

  downloadSvg(svgContent: string, modelName: string): void {
    this.downloadFile(`${modelName}.svg`, svgContent, 'image/svg+xml;charset=utf-8;');
  }

  private downloadFile(filename: string, content: string, type: string): void {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
