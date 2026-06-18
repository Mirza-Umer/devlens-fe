import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  
  features = [
    {
      title: 'Context-Aware AI',
      description: 'Chat directly with your codebase. Get answers strictly rooted in your actual file contents and structure.',
      icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'
    },
    {
      title: 'Instant Indexing',
      description: 'Seamlessly scan local directories. We instantly read, parse, and synchronize your files for lightning-fast queries.',
      icon: 'M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z M13 2 13 9 20 9'
    },
    {
      title: 'Multi-Tenant Security',
      description: 'Isolated projects with built-in role-based access control. Enterprise-grade boundaries between users.',
      icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M12 8v4 M12 16h.01'
    },
    {
      title: 'Smart Citations',
      description: 'Never guess where an answer came from. Every AI response includes direct citations to the files it analyzed.',
      icon: 'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'
    }
  ];
}
