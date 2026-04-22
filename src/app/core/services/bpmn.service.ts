import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { BpmnModel } from '../../shared/models/bpmn.model';

export interface DeployResponse {
  success: boolean;
  deploymentKey: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class BpmnService {
  private readonly deployUrl = 'http://localhost:8080/api/camunda/deploy';
  readonly currentModel = signal<BpmnModel | null>(null);

  constructor(private readonly http: HttpClient) {}

  setCurrentModel(model: BpmnModel): void {
    this.currentModel.set(model);
  }

  // ✅ CORRECTION : Envoi du bon format { bpmnXml, processName } avec fallback XML brut
  deployXml(xml: string): Observable<DeployResponse> {
    const currentModel = this.currentModel();
    const processName = currentModel?.name || 'unknown-process';
    
    // Premier essai : format JSON avec bpmnXml et processName
    return this.http.post<DeployResponse>(this.deployUrl, { 
      bpmnXml: xml, 
      processName: processName 
    }).pipe(
      catchError((error) => {
        // Si erreur 400 ou 415, essayer avec XML brut
        if (error?.status === 400 || error?.status === 415) {
          console.log('⚠️ JSON format failed, trying raw XML...');
          return this.http.post<DeployResponse>(this.deployUrl, xml, {
            headers: new HttpHeaders({ 'Content-Type': 'application/xml' })
          });
        }
        
        // Pour les autres erreurs, les propager
        return throwError(() => error);
      })
    );
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