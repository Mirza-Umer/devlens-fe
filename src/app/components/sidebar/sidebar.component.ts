import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ProjectService, Project } from '../../services/project.service';
import { AuthService } from '../../services/auth.service';
import { DialogService } from '../../services/dialog.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit {
  private projectService = inject(ProjectService);
  public authService = inject(AuthService);
  public dialogService = inject(DialogService);
  private router = inject(Router);
  
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

  async deleteProject(id: number, event: Event) {
    event.stopPropagation();
    
    const confirmed = await this.dialogService.confirm({
      title: 'Delete Project',
      message: 'Are you sure you want to delete this project? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (confirmed) {
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

  goHome() {
    this.projectService.selectedProject.set(null);
    this.router.navigate(['/']);
  }

  logout() {
    this.authService.logout();
  }
}
