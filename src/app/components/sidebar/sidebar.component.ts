import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService, Project } from '../../services/project.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="sidebar glass-panel">
      <div class="sidebar-header">
        <h2>DevLens</h2>
        <p class="subtitle">AI Code Explorer</p>
      </div>

      <div class="projects-section">
        <div class="section-title">
          <h3>Projects</h3>
          <button class="btn btn-primary btn-sm" (click)="toggleNewProject()">+</button>
        </div>

        <div class="new-project-form" *ngIf="showNewProject()">
          <input type="text" class="input-field" placeholder="Project Name" [(ngModel)]="newProjectName">
          <input type="text" class="input-field" placeholder="Absolute Path" [(ngModel)]="newProjectPath">
          <div class="form-actions">
            <button class="btn btn-secondary btn-sm" (click)="toggleNewProject()">Cancel</button>
            <button class="btn btn-primary btn-sm" (click)="addProject()" [disabled]="!newProjectName || !newProjectPath">Save</button>
          </div>
        </div>

        <ul class="project-list">
          <li *ngFor="let p of projects()" 
              class="project-item" 
              [class.active]="selectedProject()?.id === p.id"
              (click)="selectProject(p)">
            <div class="project-info">
              <span class="project-name">{{ p.name }}</span>
              <span class="project-path">{{ p.path }}</span>
            </div>
            <div class="project-actions">
              <button class="action-btn delete-btn" (click)="deleteProject(p.id, $event)" title="Delete Project">
                ×
              </button>
            </div>
          </li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .sidebar {
      width: 320px;
      height: 100vh;
      display: flex;
      flex-direction: column;
      border-right: 1px solid var(--border-color);
      border-top: none;
      border-bottom: none;
      border-left: none;
    }
    .sidebar-header {
      padding: 1.5rem;
      border-bottom: 1px solid var(--border-color);
    }
    .sidebar-header h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #fff;
      margin-bottom: 0.25rem;
    }
    .subtitle {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }
    .projects-section {
      padding: 1.5rem;
      flex: 1;
      overflow-y: auto;
    }
    .section-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .section-title h3 {
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }
    .btn-sm {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
    }
    .new-project-form {
      background: var(--bg-secondary);
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      border: 1px solid var(--border-color);
    }
    .new-project-form .input-field {
      margin-bottom: 0.5rem;
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .project-list {
      list-style: none;
      padding: 0;
    }
    .project-item {
      padding: 0.75rem 1rem;
      border-radius: 8px;
      margin-bottom: 0.5rem;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: background-color 0.2s;
    }
    .project-item:hover {
      background-color: rgba(255, 255, 255, 0.05);
    }
    .project-item.active {
      background-color: rgba(99, 102, 241, 0.1);
      border-left: 3px solid var(--accent-primary);
    }
    .project-info {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .project-name {
      font-weight: 500;
      color: var(--text-primary);
    }
    .project-path {
      font-size: 0.75rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .project-actions {
      display: flex;
      gap: 0.25rem;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .project-item:hover .project-actions {
      opacity: 1;
    }
    .action-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 4px;
      transition: all 0.2s;
    }
    .action-btn:hover {
      background-color: var(--bg-tertiary);
    }
    .scan-btn:hover { color: var(--success); }
    .delete-btn:hover { color: var(--danger); }
  `]
})
export class SidebarComponent implements OnInit {
  private projectService = inject(ProjectService);
  
  projects = signal<Project[]>([]);
  showNewProject = signal(false);
  newProjectName = '';
  newProjectPath = '';
  
  selectedProject = this.projectService.selectedProject;

  ngOnInit() {
    this.loadProjects();
  }

  loadProjects() {
    this.projectService.getProjects().subscribe({
      next: (data) => this.projects.set(data),
      error: (err) => console.error('Failed to load projects', err)
    });
  }

  toggleNewProject() {
    this.showNewProject.update(v => !v);
    if (!this.showNewProject()) {
      this.newProjectName = '';
      this.newProjectPath = '';
    }
  }

  addProject() {
    this.projectService.createProject(this.newProjectName, this.newProjectPath).subscribe({
      next: (p) => {
        this.projects.update(list => [...list, p]);
        this.toggleNewProject();
      },
      error: (err) => console.error('Failed to add project', err)
    });
  }

  deleteProject(id: number, event: Event) {
    event.stopPropagation();
    if(confirm('Are you sure you want to delete this project?')) {
      this.projectService.deleteProject(id).subscribe({
        next: () => {
          this.projects.update(list => list.filter(p => p.id !== id));
          if (this.selectedProject()?.id === id) {
            this.projectService.selectedProject.set(null);
          }
        },
        error: (err) => console.error('Failed to delete project', err)
      });
    }
  }

  selectProject(project: Project) {
    this.projectService.selectedProject.set(project);
  }
}
