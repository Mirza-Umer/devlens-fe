import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ProjectService, Project } from '../../services/project.service';
import { AuthService } from '../../services/auth.service';
import { DialogService } from '../../services/dialog.service';
import { ToastService } from '../../services/toast.service';
import { GitHubService, GitHubRepository } from '../../services/github.service';

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
  public toastService = inject(ToastService);
  private githubService = inject(GitHubService);
  private router = inject(Router);
  
  projects = signal<Project[]>([]);
  showNewProject = signal(false);
  isScanning = signal(false);
  newProjectName = '';
  newProjectPath = '';
  
  // GitHub Integration States
  activeTab = signal<'manual' | 'github'>('manual');
  githubConnected = signal(false);
  gitHubRepos = signal<GitHubRepository[]>([]);
  loadingRepos = signal(false);
  githubTokenInput = '';
  searchQuery = signal('');
  selectedGitHubRepo = signal<GitHubRepository | null>(null);
  savingToken = signal(false);
  disconnecting = signal(false);
  
  selectedProject = this.projectService.selectedProject;

  ngOnInit() {
    this.loadProjects();
    this.checkGitHubStatus();
  }

  loadProjects() {
    this.projectService.getProjects().subscribe({
      next: (data) => this.projects.set(data),
      error: (err) => console.error('Failed to load projects', err)
    });
  }

  checkGitHubStatus() {
    this.githubService.getGitHubStatus().subscribe({
      next: (res) => {
        this.githubConnected.set(res.connected);
        if (res.connected && this.activeTab() === 'github') {
          this.loadGitHubRepositories();
        }
      },
      error: (err) => console.error('Failed to check GitHub status', err)
    });
  }

  switchTab(tab: 'manual' | 'github') {
    if (this.isScanning()) return;
    this.activeTab.set(tab);
    if (tab === 'github') {
      if (this.githubConnected()) {
        this.loadGitHubRepositories();
      }
    }
  }

  loadGitHubRepositories() {
    this.loadingRepos.set(true);
    this.githubService.getGitHubRepositories().subscribe({
      next: (repos) => {
        this.gitHubRepos.set(repos);
        this.loadingRepos.set(false);
      },
      error: (err) => {
        console.error('Failed to load GitHub repositories', err);
        this.loadingRepos.set(false);
      }
    });
  }

  saveGitHubToken() {
    if (!this.githubTokenInput.trim()) return;
    this.savingToken.set(true);
    this.githubService.saveGitHubToken(this.githubTokenInput.trim()).subscribe({
      next: () => {
        this.githubConnected.set(true);
        this.githubTokenInput = '';
        this.savingToken.set(false);
        this.loadGitHubRepositories();
      },
      error: (err) => {
        console.error('Failed to save GitHub token', err);
        alert('Failed to connect: ' + (err.error?.message || err.message));
        this.savingToken.set(false);
      }
    });
  }

  disconnectGitHub() {
    if (confirm('Are you sure you want to disconnect your GitHub account?')) {
      this.disconnecting.set(true);
      this.githubService.disconnectGitHub().subscribe({
        next: () => {
          this.githubConnected.set(false);
          this.gitHubRepos.set([]);
          this.selectedGitHubRepo.set(null);
          this.disconnecting.set(false);
        },
        error: (err) => {
          console.error('Failed to disconnect GitHub', err);
          this.disconnecting.set(false);
        }
      });
    }
  }

  selectGitHubRepo(repo: GitHubRepository) {
    if (this.isScanning()) return;
    this.selectedGitHubRepo.set(repo);
    this.newProjectName = repo.name;
    this.newProjectPath = repo.cloneUrl;
  }

  filteredRepos() {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.gitHubRepos();
    return this.gitHubRepos().filter(repo =>
      repo.fullName.toLowerCase().includes(query) ||
      (repo.description && repo.description.toLowerCase().includes(query))
    );
  }

  toggleNewProject() {
    if (this.isScanning()) return;
    this.showNewProject.update(v => !v);
    if (!this.showNewProject()) {
      this.newProjectName = '';
      this.newProjectPath = '';
      this.selectedGitHubRepo.set(null);
      this.searchQuery.set('');
    } else {
      this.checkGitHubStatus();
    }
  }

  addProject() {
    const name = this.newProjectName.trim();
    const repoPath = this.newProjectPath.trim();

    if (!name || !repoPath || this.isScanning()) return;

    this.isScanning.set(true);

    this.projectService.createProject(name, repoPath).subscribe({
      next: (p) => {
        this.projects.update(list => [...list, p]);
        this.selectProject(p);
        this.isScanning.set(false);
        this.toggleNewProject();
        this.toastService.success(`Repository "${p.name}" scanned and added successfully!`);
      },
      error: (err) => {
        console.error('Failed to add project', err);
        this.isScanning.set(false);
        const errMsg = err.error?.message || err.message || 'Failed to scan repository';
        this.toastService.error(`Failed to add project: ${errMsg}`);
      }
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
