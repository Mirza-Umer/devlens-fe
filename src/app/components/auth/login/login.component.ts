import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  error: string | null = null;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.authService.getGoogleClientId().subscribe({
      next: (config) => {
        if (config.googleClientId) {
          this.initGoogleSignIn(config.googleClientId);
        } else {
          console.warn('Google Client ID is missing. Google Sign-In button will not render. Please set GOOGLE_CLIENT_ID in the backend .env file.');
        }
      },
      error: (err) => {
        console.error('Failed to load Google client configuration', err);
      }
    });
  }

  private initGoogleSignIn(clientId: string) {
    const interval = setInterval(() => {
      const g = (window as any).google;
      const btn = document.getElementById('googleBtn');
      if (g && g.accounts && g.accounts.id && btn) {
        clearInterval(interval);
        g.accounts.id.initialize({
          client_id: clientId,
          callback: this.handleGoogleCredentialResponse.bind(this)
        });
        g.accounts.id.renderButton(
          btn,
          { theme: 'filled_blue', size: 'large', width: 320 }
        );
      }
    }, 100);
  }

  private handleGoogleCredentialResponse(response: any) {
    this.loading = true;
    this.error = null;
    this.authService.googleLogin(response.credential).subscribe({
      next: () => {
        this.toastService.success('Successfully logged in with Google');
        this.router.navigate(['/']);
      },
      error: (err) => {
        const msg = err.error?.message || 'Google authentication failed';
        this.error = msg;
        this.toastService.error(msg);
        this.loading = false;
      }
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.error = null;

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.toastService.success('Successfully logged in');
        this.router.navigate(['/']);
      },
      error: (err) => {
        const msg = err.error?.message || 'Invalid credentials';
        this.error = msg;
        this.toastService.error(msg);
        this.loading = false;
      }
    });
  }
}
