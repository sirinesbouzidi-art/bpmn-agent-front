import { Injectable, signal } from '@angular/core';
import type BpmnModeler from 'bpmn-js/lib/Modeler';

export interface LintReport {
  id: string;
  label: string;
  message: string;
  category: 'error' | 'warn';
}

@Injectable({ providedIn: 'root' })
export class BpmnLintingService {
  readonly reports = signal<LintReport[]>([]);

  async lint(modeler: BpmnModeler, xml: string): Promise<LintReport[]> {
    const found = this.validateBpmn(xml);
    this.reports.set(found);
    this.applyCanvasMarkers(modeler, found);
    return found;
  }

  // ── Marqueurs visuels sur le canvas ──────────────────────────────────────
  private applyCanvasMarkers(modeler: BpmnModeler, found: LintReport[]): void {
    try {
      const canvas = modeler.get('canvas') as any;
      const elementRegistry = modeler.get('elementRegistry') as any;

      // Effacer les anciens marqueurs
      elementRegistry.getAll().forEach((el: any) => {
        canvas.removeMarker(el.id, 'lint-error');
        canvas.removeMarker(el.id, 'lint-warn');
      });

      // Poser les nouveaux
      found.forEach(r => {
        if (elementRegistry.get(r.id)) {
          canvas.addMarker(r.id, r.category === 'error' ? 'lint-error' : 'lint-warn');
        }
      });
    } catch (e) {
      console.warn('[BpmnLint] Marqueurs canvas non appliqués :', e);
    }
  }

  // ── Validateur XML ───────────────────────────────────────────────────────
  private validateBpmn(xml: string): LintReport[] {
    const reports: LintReport[] = [];

    try {
      const doc = new DOMParser().parseFromString(xml, 'application/xml');

      if (doc.querySelector('parsererror')) {
        return [{ id: 'root', label: 'parse-error', message: 'XML BPMN invalide.', category: 'error' }];
      }

      // Helper : éléments par localName, namespace-agnostique
      const getEls = (localName: string): Element[] => {
        const ns = doc.getElementsByTagNameNS(
          'http://www.omg.org/spec/BPMN/20100524/MODEL', localName
        );
        return ns.length > 0 ? Array.from(ns) : Array.from(doc.getElementsByTagName(localName));
      };

      // Helper : texte des enfants directs d'un tag
      const childTexts = (parent: Element, localName: string): string[] => {
        const ns = parent.getElementsByTagNameNS(
          'http://www.omg.org/spec/BPMN/20100524/MODEL', localName
        );
        const els = ns.length > 0 ? Array.from(ns) : Array.from(parent.getElementsByTagName(localName));
        return els
          .filter(el => el.parentNode === parent)
          .map(el => el.textContent?.trim() ?? '');
      };

      const allIds = new Set(
        Array.from(doc.querySelectorAll('[id]')).map(el => el.getAttribute('id'))
      );
      const allFlows = getEls('sequenceFlow');

      // ── Règle 1 : ExclusiveGateway → chaque flux non-default doit avoir une condition
      getEls('exclusiveGateway').forEach(gw => {
        const gwId   = gw.getAttribute('id') ?? 'gateway';
        const dflt   = gw.getAttribute('default');
        const outIds = childTexts(gw, 'outgoing');

        if (outIds.length <= 1) return; // 1 seul flux sortant = pas de condition requise

        outIds.forEach(flowId => {
          if (!flowId || flowId === dflt) return;

          const flow = allFlows.find(f => f.getAttribute('id') === flowId);
          if (!flow) return;

          const hasCondElem =
            flow.getElementsByTagNameNS('http://www.omg.org/spec/BPMN/20100524/MODEL', 'conditionExpression').length > 0 ||
            flow.getElementsByTagName('conditionExpression').length > 0;
          const hasCondAttr =
            flow.hasAttribute('condition') || flow.hasAttribute('conditionExpression');

          if (!hasCondElem && !hasCondAttr) {
            reports.push({
              id: flowId,
              label: 'condition-required',
              message: `Flux "${flowId}" sortant du gateway exclusif "${gwId}" : doit avoir une condition ou être le flux par défaut.`,
              category: 'error'
            });
          }
        });
      });

      // ── Règle 2 : Chaque processus doit avoir un startEvent et un endEvent
      getEls('process').forEach(proc => {
        const procId   = proc.getAttribute('id') ?? 'process';
        const procName = proc.getAttribute('name') ?? procId;

        const direct = Array.from(proc.children);
        const hasStart = direct.some(el =>
          ['startEvent', 'bpmn:startEvent'].includes(el.tagName) || el.localName === 'startEvent'
        );
        const hasEnd = direct.some(el =>
          ['endEvent', 'bpmn:endEvent'].includes(el.tagName) || el.localName === 'endEvent'
        );

        if (!hasStart) reports.push({
          id: procId, label: 'start-event-required',
          message: `Processus "${procName}" : aucun événement de début (Start Event).`,
          category: 'error'
        });

        if (!hasEnd) reports.push({
          id: procId, label: 'end-event-required',
          message: `Processus "${procName}" : aucun événement de fin (End Event).`,
          category: 'error'
        });
      });

      // ── Règle 3 : SequenceFlow – source et cible doivent exister
      allFlows.forEach(flow => {
        const flowId = flow.getAttribute('id') ?? 'flow';
        const src    = flow.getAttribute('sourceRef');
        const tgt    = flow.getAttribute('targetRef');

        if (src && !allIds.has(src)) reports.push({
          id: flowId, label: 'dangling-source',
          message: `Flux "${flowId}" : source inexistante "${src}".`,
          category: 'error'
        });

        if (tgt && !allIds.has(tgt)) reports.push({
          id: flowId, label: 'dangling-target',
          message: `Flux "${flowId}" : cible inexistante "${tgt}".`,
          category: 'error'
        });
      });

      // ── Règle 4 : Gateway exclusif doit avoir au moins 2 flux sortants
      getEls('exclusiveGateway').forEach(gw => {
        const gwId   = gw.getAttribute('id') ?? 'gateway';
        const outIds = childTexts(gw, 'outgoing');

        if (outIds.length < 2) reports.push({
          id: gwId, label: 'gateway-missing-branches',
          message: `Gateway exclusif "${gwId}" : doit avoir au moins 2 flux sortants.`,
          category: 'warn'
        });
      });

      // ── Règle 5 : Tâches sans connexion entrante ou sortante
      const taskTypes = [
        'task', 'userTask', 'serviceTask', 'sendTask',
        'receiveTask', 'scriptTask', 'businessRuleTask', 'manualTask'
      ];

      taskTypes.flatMap(t => getEls(t)).forEach(task => {
        const taskId   = task.getAttribute('id') ?? 'task';
        const taskName = task.getAttribute('name') ?? taskId;

        const hasIn  = childTexts(task, 'incoming').length > 0;
        const hasOut = childTexts(task, 'outgoing').length > 0;

        if (!hasIn) reports.push({
          id: taskId, label: 'element-not-connected',
          message: `Tâche "${taskName}" : aucun flux entrant.`,
          category: 'warn'
        });

        if (!hasOut) reports.push({
          id: taskId, label: 'element-not-connected',
          message: `Tâche "${taskName}" : aucun flux sortant.`,
          category: 'warn'
        });
      });

    } catch (e) {
      console.error('[BpmnLint] Erreur :', e);
      reports.push({
        id: 'error', label: 'internal-error',
        message: 'Erreur lors de la validation.',
        category: 'error'
      });
    }

    return reports;
  }

  hasBlockingErrors(): boolean {
    return this.reports().some(r => r.category === 'error');
  }

  selectElement(modeler: BpmnModeler, elementId: string): void {
    try {
      const elementRegistry = modeler.get('elementRegistry') as any;
      const selection       = modeler.get('selection') as any;
      const canvas          = modeler.get('canvas') as any;
      const element         = elementRegistry.get(elementId);
      if (element) {
        selection.select(element);
        canvas.scrollToElement?.(element);
      }
    } catch (e) {
      console.warn('[BpmnLint] Sélection impossible :', elementId, e);
    }
  }

  clear(): void {
    this.reports.set([]);
  }
}