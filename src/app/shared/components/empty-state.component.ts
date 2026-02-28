import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="empty-state">
      <mat-icon>inbox</mat-icon>
      <h3>{{ title }}</h3>
      <p>{{ description }}</p>
    </div>
  `,
  styles: [
    `
      .empty-state {
        text-align: center;
        padding: 48px 16px;
        color: #5d6a7c;
      }

      mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        margin-bottom: 12px;
      }

      h3 {
        margin: 0 0 8px;
      }

      p {
        margin: 0;
      }
    `
  ]
})
export class EmptyStateComponent {
  @Input() title = 'No data available';
  @Input() description = 'Start by creating your first BPMN model.';
}
