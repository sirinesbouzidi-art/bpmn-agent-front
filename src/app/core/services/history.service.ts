import { Injectable } from '@angular/core';
import { BpmnModel } from '../../shared/models/bpmn.model';

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private readonly mockXml = `<?xml version="1.0" encoding="UTF-8"?>
  <bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
    xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
    xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
    xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
    id="Definitions_1"
    targetNamespace="http://bpmn.io/schema/bpmn">
    <bpmn:process id="Process_1" isExecutable="false">
      <bpmn:startEvent id="StartEvent_1" name="Start"/>
    </bpmn:process>
    <bpmndi:BPMNDiagram id="BPMNDiagram_1">
      <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1"/>
    </bpmndi:BPMNDiagram>
  </bpmn:definitions>`;

  getHistory(): BpmnModel[] {
    return [
      {
        id: '1',
        name: 'Portabilité Client',
        description: 'Vérification éligibilité puis activation ligne.',
        createdAt: '2026-01-05',
        status: 'Validated',
        xml: this.mockXml
      },
      {
        id: '2',
        name: 'Gestion Échec Paiement',
        description: 'Notification client et suspension de service.',
        createdAt: '2026-01-12',
        status: 'Generated',
        xml: this.mockXml
      },
      {
        id: '3',
        name: 'Assignation Incident N1',
        description: 'Assignation automatique au support niveau 1.',
        createdAt: '2026-01-18',
        status: 'Draft',
        xml: this.mockXml
      }
    ];
  }
}
