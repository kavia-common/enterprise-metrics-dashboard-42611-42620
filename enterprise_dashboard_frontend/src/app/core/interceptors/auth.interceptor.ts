import { HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

/**
 * PUBLIC_INTERFACE
 * authInterceptor
 * Attaches Authorization header if a mock token exists and redirects to /login on 401 responses.
 */
export function authInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken();

  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err) => {
      if (err && typeof err.status === 'number' && err.status === 401) {
        // Invalidate mock session and redirect
        auth.logout();
        router.navigateByUrl('/login');
      }
      throw err;
    })
  );
}
