import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../sidebar/sidebar.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [SidebarComponent, RouterOutlet, CommonModule],
  template: `
    <div class="app-layout">
      <!-- Mobile Header -->
      <div class="mobile-header hidden-desktop" [class.glass]="true">
        <button class="animated-hamburger" 
                [class.open]="isMobileSidebarOpen()"
                (click)="toggleMobileSidebar()">
          <span></span>
          <span></span>
          <span></span>
        </button>
        <div class="mobile-brand">
          <div class="brand-logo-small">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span class="mobile-title">DevLens</span>
        </div>
      </div>

      <!-- Backdrop for mobile sidebar -->
      <div class="mobile-backdrop" 
           [class.show]="isMobileSidebarOpen()" 
           (click)="closeMobileSidebar()"></div>

      <div class="sidebar-wrapper" [class.mobile-open]="isMobileSidebarOpen()">
        <app-sidebar (click)="closeOnMobile()"></app-sidebar>
      </div>
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      background-color: var(--bg-primary, #0f1115);
      color: var(--text-color, #ffffff);
      flex-direction: row;
    }
    
    .sidebar-wrapper {
      z-index: 30;
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
    }

    .sidebar-wrapper.mobile-open {
      box-shadow: 10px 0 30px rgba(0, 0, 0, 0.5);
    }

    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }
    
    .mobile-header {
      display: none;
      align-items: center;
      padding: 1rem 1.5rem;
      background: rgba(15, 17, 21, 0.7);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      z-index: 20;
    }

    .mobile-header.glass {
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }
    
    .animated-hamburger {
      width: 40px;
      height: 40px;
      position: relative;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 5px;
      margin-right: 1.25rem;
      transition: all 0.3s ease;
    }

    .animated-hamburger:hover {
      background: rgba(255, 255, 255, 0.1);
      box-shadow: 0 0 15px rgba(99, 102, 241, 0.3);
    }

    .animated-hamburger span {
      display: block;
      width: 20px;
      height: 2px;
      background: var(--text-primary);
      border-radius: 2px;
      transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }

    .animated-hamburger.open span:nth-child(1) {
      transform: translateY(7px) rotate(45deg);
      background: var(--accent-primary);
    }

    .animated-hamburger.open span:nth-child(2) {
      opacity: 0;
      transform: scale(0);
    }

    .animated-hamburger.open span:nth-child(3) {
      transform: translateY(-7px) rotate(-45deg);
      background: var(--accent-primary);
    }

    .mobile-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .brand-logo-small {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, var(--accent-primary), #818cf8);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 0 15px var(--accent-glow);
    }

    .brand-logo-small svg {
      width: 18px;
      height: 18px;
    }
    
    .mobile-title {
      font-weight: 700;
      font-size: 1.2rem;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, #fff, #a0aab8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .mobile-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 25;
      opacity: 0;
      transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: none;
    }

    @media (max-width: 768px) {
      .app-layout {
        flex-direction: column;
      }
      
      .hidden-desktop {
        display: flex !important;
      }
      
      .sidebar-wrapper {
        position: fixed;
        top: 0;
        left: 0;
        height: 100vh;
        transform: translateX(-100%);
      }
      
      .sidebar-wrapper.mobile-open {
        transform: translateX(0);
      }
      
      .mobile-backdrop.show {
        display: block;
        opacity: 1;
        pointer-events: auto;
      }
    }
  `]
})
export class MainLayoutComponent {
  isMobileSidebarOpen = signal(false);

  toggleMobileSidebar() {
    this.isMobileSidebarOpen.update(v => !v);
  }

  closeMobileSidebar() {
    this.isMobileSidebarOpen.set(false);
  }

  closeOnMobile() {
    if (window.innerWidth <= 768) {
      this.closeMobileSidebar();
    }
  }
}
